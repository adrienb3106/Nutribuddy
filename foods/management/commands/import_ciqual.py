import re
import unicodedata
from decimal import Decimal, InvalidOperation

import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from foods.models import FoodItem


NORMALIZED_MAP = {
    "alim_code": "source_code",
    "alim_nom_fr": "name",
    "alim_grp_code": "group_code",
    "alim_ssgrp_code": "subgroup_code",
    "alim_ssssgrp_code": "subsubgroup_code",
    "alim_grp_nom_fr": "group_name",
    "alim_ssgrp_nom_fr": "subgroup_name",
    "alim_ssssgrp_nom_fr": "subsubgroup_name",
    "energie_reglement_ue_n_1169_2011_kcal_100_g": "kcal_100g",
    "proteines_n_x_facteur_de_jones_g_100_g": "protein_g_100g",
    "glucides_g_100_g": "carbs_g_100g",
    "lipides_g_100_g": "fat_g_100g",
    "sucres_g_100_g": "sugars_g_100g",
    "fibres_alimentaires_g_100_g": "fiber_g_100g",
    "ag_satures_g_100_g": "saturated_fat_g_100g",
    "sel_chlorure_de_sodium_g_100_g": "salt_g_100g",
    "eau_g_100_g": "water_g_100g",
}

NUMERIC_FIELDS = {
    "kcal_100g",
    "protein_g_100g",
    "carbs_g_100g",
    "fat_g_100g",
    "sugars_g_100g",
    "fiber_g_100g",
    "saturated_fat_g_100g",
    "salt_g_100g",
    "water_g_100g",
}

CODE_FIELDS = {
    "group_code",
    "subgroup_code",
    "subsubgroup_code",
}


def _normalize_decimal(value):
    if value is None:
        return None
    if isinstance(value, float) and (value != value):
        return None
    text = str(value).strip()
    if text in {"", "-"}:
        return None
    text = text.replace("\xa0", " ")
    text = text.replace(",", ".")
    text = re.sub(r"[^0-9.\-]", "", text)
    if text in {"", "-"}:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def _normalize_column_name(name: str) -> str:
    text = str(name)
    text = text.replace("\xa0", " ")
    text = text.replace("\n", " ")
    text = text.strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


class Command(BaseCommand):
    help = "Import CIQUAL Excel into FoodItem"

    def add_arguments(self, parser):
        parser.add_argument("--path", required=True, help="Path to the CIQUAL .xls file")
        parser.add_argument("--dry-run", action="store_true", help="Parse only, no DB writes")
        parser.add_argument("--limit", type=int, default=None, help="Limit number of rows")
        parser.add_argument("--update", action="store_true", help="Update existing rows by source_code")

    def handle(self, *args, **options):
        path = options["path"]
        dry_run = options["dry_run"]
        limit = options["limit"]
        update_existing = options["update"]

        try:
            df = pd.read_excel(path)
        except Exception as exc:
            raise CommandError(f"Failed to read file: {exc}") from exc

        normalized_cols = {col: _normalize_column_name(col) for col in df.columns}
        inverse_map = {}
        for original, normalized in normalized_cols.items():
            if normalized in NORMALIZED_MAP:
                inverse_map[original] = NORMALIZED_MAP[normalized]

        missing = [key for key in NORMALIZED_MAP if key not in {normalized_cols[c] for c in inverse_map}]
        if missing:
            raise CommandError(f"Missing columns in file (normalized): {missing}")

        if limit:
            df = df.head(limit)

        created = 0
        updated = 0
        skipped = 0

        rows = df.to_dict(orient="records")

        with transaction.atomic():
            for row in rows:
                data = {}
                for src_col, dst_field in inverse_map.items():
                    val = row.get(src_col)
                    if dst_field in NUMERIC_FIELDS:
                        data[dst_field] = _normalize_decimal(val)
                    elif dst_field in CODE_FIELDS:
                        data[dst_field] = None if val is None else int(val)
                    else:
                        data[dst_field] = None if val is None or str(val).strip() in {"", "nan"} else str(val).strip()

                if not data.get("name"):
                    skipped += 1
                    continue

                if not data.get("kcal_100g"):
                    data["kcal_100g"] = Decimal("0")
                if not data.get("protein_g_100g"):
                    data["protein_g_100g"] = Decimal("0")
                if not data.get("carbs_g_100g"):
                    data["carbs_g_100g"] = Decimal("0")
                if not data.get("fat_g_100g"):
                    data["fat_g_100g"] = Decimal("0")

                data["source"] = FoodItem.Source.CIQUAL

                source_code = data.get("source_code")
                if source_code and update_existing:
                    obj, was_created = FoodItem.objects.update_or_create(
                        source_code=source_code, defaults=data
                    )
                    if was_created:
                        created += 1
                    else:
                        updated += 1
                elif source_code and FoodItem.objects.filter(source_code=source_code).exists():
                    skipped += 1
                else:
                    FoodItem.objects.create(**data)
                    created += 1

            if dry_run:
                raise CommandError(
                    f"Dry run requested. Parsed {len(rows)} rows (created={created}, updated={updated}, skipped={skipped})."
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Import done. created={created}, updated={updated}, skipped={skipped}"
            )
        )
