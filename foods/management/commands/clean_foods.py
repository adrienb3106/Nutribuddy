import unicodedata
from collections import Counter
from dataclasses import dataclass
from typing import Optional

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from foods.models import FoodItem


PLACEHOLDER_NAMES = {
    "unknown",
    "inconnu",
    "inconnue",
    "non renseigne",
    "non renseignee",
    "non disponible",
    "sans nom",
    "aucun",
    "n a",
    "na",
    "nd",
    "none",
    "null",
    "undefined",
    "test",
    "xxx",
}


@dataclass(frozen=True)
class CleanConfig:
    min_alpha_ratio: float
    min_letters: int
    min_length: int


def _normalize(text: str) -> str:
    text = text.lower().replace("\n", " ").replace("\xa0", " ")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = "".join(ch if ch.isalnum() else " " for ch in text)
    return " ".join(text.split())


def _is_placeholder(normalized: str) -> bool:
    if not normalized:
        return True
    return normalized in PLACEHOLDER_NAMES


def _analyze_name(name: Optional[str], config: CleanConfig) -> Optional[str]:
    if name is None:
        return "missing_name"
    stripped = name.strip()
    if not stripped:
        return "empty_name"

    normalized = _normalize(stripped)
    if _is_placeholder(normalized):
        return "placeholder_name"

    total = len([ch for ch in stripped if not ch.isspace()])
    letters = sum(ch.isalpha() for ch in stripped)
    digits = sum(ch.isdigit() for ch in stripped)
    others = total - letters - digits

    if letters == 0:
        return "no_letters"

    if total >= config.min_length and letters / total < config.min_alpha_ratio:
        return "low_alpha_ratio"

    if letters < config.min_letters and total >= config.min_length:
        return "too_few_letters"

    if total >= 6 and len(set(normalized.replace(" ", ""))) <= 1:
        return "repeated_char"

    return None


class Command(BaseCommand):
    help = "Find and optionally delete aberrant FoodItem rows (unknown/garbled names)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Delete matching rows (default is dry-run).",
        )
        parser.add_argument("--limit", type=int, default=None, help="Limit rows scanned.")
        parser.add_argument(
            "--min-alpha-ratio",
            type=float,
            default=0.3,
            help="Minimum letter ratio in the name (default: 0.3).",
        )
        parser.add_argument(
            "--min-letters",
            type=int,
            default=3,
            help="Minimum number of letters for a valid name (default: 3).",
        )
        parser.add_argument(
            "--min-length",
            type=int,
            default=4,
            help="Minimum total length before ratio checks apply (default: 4).",
        )
        parser.add_argument(
            "--show",
            type=int,
            default=30,
            help="Show N sample rows (default: 30).",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        limit = options["limit"]
        config = CleanConfig(
            min_alpha_ratio=options["min_alpha_ratio"],
            min_letters=options["min_letters"],
            min_length=options["min_length"],
        )
        show = options["show"]

        qs = FoodItem.objects.all().only("id", "name", "source")
        if limit:
            qs = qs[:limit]

        reasons = Counter()
        candidates: list[tuple[int, str, str, str]] = []
        ids_to_delete: list[int] = []

        with transaction.atomic():
            for item in qs.iterator():
                reason = _analyze_name(item.name, config)
                if not reason:
                    continue
                reasons[reason] += 1
                if len(candidates) < show:
                    candidates.append((item.id, item.name or "", item.source, reason))
                ids_to_delete.append(item.id)

            if not apply_changes:
                if candidates:
                    for row_id, name, source, reason in candidates:
                        self.stdout.write(
                            f"[candidate] id={row_id} source={source} reason={reason} name={name}"
                        )
                total = sum(reasons.values())
                summary = ", ".join(f"{k}={v}" for k, v in sorted(reasons.items()))
                raise CommandError(
                    f"Dry run. candidates={total}. Reasons: {summary or 'none'}"
                )

            if ids_to_delete:
                deleted, _ = FoodItem.objects.filter(id__in=ids_to_delete).delete()
                summary = ", ".join(f"{k}={v}" for k, v in sorted(reasons.items()))
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Deleted={deleted}. Reasons: {summary or 'none'}"
                    )
                )
            else:
                self.stdout.write(self.style.SUCCESS("No aberrant rows found."))
