import gzip
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Optional

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from foods.models import FoodItem


def _open_text(path: Path, mode: str):
    if path.suffix == ".gz":
        return gzip.open(path, mode + "t", encoding="utf-8")
    return path.open(mode, encoding="utf-8")


def _clean_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        value = _strip_nul(value).strip()
        return value or None
    return _strip_nul(str(value))


def _strip_nul(text: str) -> str:
    return text.replace("\x00", "")


def _sanitize(value: Any) -> Any:
    if isinstance(value, str):
        return _strip_nul(value)
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    if isinstance(value, dict):
        sanitized = {}
        for key, val in value.items():
            new_key = _strip_nul(key) if isinstance(key, str) else key
            sanitized[new_key] = _sanitize(val)
        return sanitized
    return value


def _ensure_list(value: Any) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    return [_sanitize(value)]


def _ensure_dict(value: Any) -> dict:
    if not isinstance(value, dict):
        return {}
    return _sanitize(value)


def _to_decimal(value: Any) -> Optional[Decimal]:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    text = str(value).strip()
    if not text:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def _bounded_decimal(value: Any, *, max_value: Optional[Decimal] = None) -> Optional[Decimal]:
    dec = _to_decimal(value)
    if dec is None:
        return None
    if dec < 0:
        return None
    if max_value is not None and dec > max_value:
        return None
    return dec


def _to_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


class Command(BaseCommand):
    help = "Import minimal Open Food Facts JSONL (.gz) into FoodItem"

    def add_arguments(self, parser):
        parser.add_argument("--path", required=True, help="Path to the minimal .jsonl(.gz) file")
        parser.add_argument("--limit", type=int, default=None, help="Limit number of rows")
        parser.add_argument("--update", action="store_true", help="Update existing rows by barcode")
        parser.add_argument("--dry-run", action="store_true", help="Parse only, no DB writes")
        parser.add_argument(
            "--commit-every",
            type=int,
            default=0,
            help="Commit every N processed rows (0 = single transaction).",
        )
        parser.add_argument(
            "--log-every",
            type=int,
            default=0,
            help="Log progress every N lines (0 disables).",
        )

    def handle(self, *args, **options):
        path = Path(options["path"])
        limit = options["limit"]
        update_existing = options["update"]
        dry_run = options["dry_run"]
        commit_every = options["commit_every"] or 0
        log_every = options["log_every"]

        if not path.exists():
            raise CommandError(f"Input file not found: {path}")

        created = 0
        updated = 0
        skipped = 0
        bad_json = 0
        skipped_reason = {
            "missing_name": 0,
            "missing_barcode": 0,
            "already_exists": 0,
        }

        def _process_line(idx: int, line: str) -> None:
            nonlocal created, updated, skipped, bad_json
            line = line.strip()
            if not line:
                return
            try:
                product = json.loads(line)
            except json.JSONDecodeError:
                bad_json += 1
                return

            name = _clean_str(product.get("name"))
            if not name:
                skipped += 1
                skipped_reason["missing_name"] += 1
                return

            barcode = _clean_str(product.get("barcode"))
            if not barcode:
                skipped += 1
                skipped_reason["missing_barcode"] += 1
                return

            ingredients = _ensure_dict(product.get("ingredients"))
            nutriments = _ensure_dict(product.get("nutriments_100g"))
            nutriscore = _ensure_dict(product.get("nutriscore"))

            data = {
                "name": name,
                "barcode": barcode,
                "brand": _clean_str(product.get("brand")),
                "quantity": _clean_str(product.get("quantity")),
                "categories_tags": _ensure_list(product.get("categories_tags")),
                "allergens_tags": _ensure_list(product.get("allergens_tags")),
                "labels_tags": _ensure_list(product.get("labels_tags")),
                "ingredients_text_fr": _clean_str(ingredients.get("text_fr")),
                "ingredients_text": _clean_str(ingredients.get("text")),
                "ingredients_analysis_tags": _ensure_list(ingredients.get("analysis_tags")),
                "ingredients_from_palm_oil_tags": _ensure_list(
                    ingredients.get("from_palm_oil_tags")
                ),
                "ingredients_may_be_from_palm_oil_tags": _ensure_list(
                    ingredients.get("may_be_from_palm_oil_tags")
                ),
                "nutrition_per": _clean_str(product.get("nutrition_per")),
                "kcal_100g": _bounded_decimal(nutriments.get("energy_kcal"), max_value=Decimal("1000")),
                "fat_g_100g": _bounded_decimal(nutriments.get("fat_g"), max_value=Decimal("100")),
                "saturated_fat_g_100g": _bounded_decimal(
                    nutriments.get("saturated_fat_g"), max_value=Decimal("100")
                ),
                "carbs_g_100g": _bounded_decimal(nutriments.get("carbs_g"), max_value=Decimal("100")),
                "sugars_g_100g": _bounded_decimal(nutriments.get("sugars_g"), max_value=Decimal("100")),
                "protein_g_100g": _bounded_decimal(nutriments.get("protein_g"), max_value=Decimal("100")),
                "salt_g_100g": _bounded_decimal(nutriments.get("salt_g"), max_value=Decimal("100")),
                "nutrient_levels": _ensure_dict(product.get("nutrient_levels")),
                "nutriscore_grade": _clean_str(nutriscore.get("grade")),
                "nutriscore_score": _to_int(nutriscore.get("score")),
                "nutriscore_version": _clean_str(nutriscore.get("version")),
                "source_last_updated_t": _to_int(product.get("source_last_updated_t")),
                "source_completeness": _bounded_decimal(
                    product.get("source_completeness"), max_value=Decimal("100")
                ),
                "source": FoodItem.Source.OPENFOODFACTS,
            }

            if update_existing:
                obj, was_created = FoodItem.objects.update_or_create(
                    barcode=barcode, defaults=data
                )
                if was_created:
                    created += 1
                else:
                    updated += 1
            elif FoodItem.objects.filter(barcode=barcode).exists():
                skipped += 1
                skipped_reason["already_exists"] += 1
            else:
                FoodItem.objects.create(**data)
                created += 1

            if log_every and idx % log_every == 0:
                self.stdout.write(
                    f"processed={idx} created={created} updated={updated} "
                    f"skipped={skipped} bad_json={bad_json}"
                )

        def _limit_reached() -> bool:
            return bool(limit and (created + updated + skipped + bad_json) >= limit)

        if dry_run or commit_every <= 0:
            with _open_text(path, "r") as handle, transaction.atomic():
                for idx, line in enumerate(handle, start=1):
                    if _limit_reached():
                        break
                    _process_line(idx, line)
                if dry_run:
                    raise CommandError(
                        "Dry run requested. "
                        f"created={created}, updated={updated}, skipped={skipped}, "
                        f"bad_json={bad_json}, reasons={skipped_reason}"
                    )
        else:
            with _open_text(path, "r") as handle:
                line_iter = iter(handle)
                idx = 0
                done = False
                while not done:
                    with transaction.atomic():
                        for _ in range(commit_every):
                            if _limit_reached():
                                done = True
                                break
                            line = next(line_iter, None)
                            if line is None:
                                done = True
                                break
                            idx += 1
                            _process_line(idx, line)

        self.stdout.write(
            self.style.SUCCESS(
                f"Import done. created={created}, updated={updated}, skipped={skipped}, "
                f"bad_json={bad_json}, reasons={skipped_reason}"
            )
        )
