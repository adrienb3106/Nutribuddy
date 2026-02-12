import json
import unicodedata
from dataclasses import dataclass
from typing import Dict, Optional

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from foods.models import FoodItem
from foods.compatibility_keywords import (
    NAME_GLUTEN_FREE_FALSE_EN,
    NAME_GLUTEN_FREE_FALSE_FR,
    NAME_GLUTEN_FREE_TRUE_EN,
    NAME_GLUTEN_FREE_TRUE_FR,
    NAME_NON_PESCE_EN,
    NAME_NON_PESCE_FR,
    NAME_NON_VEGAN_EN_EXTRA,
    NAME_NON_VEGAN_FR_EXTRA,
    NAME_NON_VEGETARIAN_EN,
    NAME_NON_VEGETARIAN_FR,
    NAME_VEGAN_PHRASES_EN,
    NAME_VEGAN_PHRASES_FR,
    NAME_VEGAN_TOKENS_EN,
    NAME_VEGAN_TOKENS_FR,
    NAME_VEGETARIAN_TOKENS_EN,
    NAME_VEGETARIAN_TOKENS_FR,
)
from foods.fodmap import classify_fodmap


@dataclass(frozen=True)
class Rule:
    vegan: Optional[bool]
    vegetarian: Optional[bool]
    pescetarian: Optional[bool]
    gluten_free: Optional[bool]
    lactose_free: Optional[bool]


DEFAULT_GROUP_RULES = {
    "fruits_legumes_legumineuses_et_oleagineux": Rule(True, True, True, True, True),
    "produits_cerealiers": Rule(True, True, True, None, True),
    "eaux_et_autres_boissons": Rule(True, True, True, True, True),
    "produits_laitiers": Rule(False, True, True, True, False),
    "viandes_oeufs_poissons": Rule(False, False, False, True, True),
    "glaces_et_sorbets": Rule(False, True, True, True, False),
    "produits_sucres": Rule(True, True, True, True, True),
    "matieres_grasses": Rule(True, True, True, True, True),
    "aliments_infantiles": Rule(True, True, True, True, True),
    "entrees_et_plats_composes": Rule(False, False, False, None, None),
    "aides_culinaires_et_ingredients_divers": Rule(True, True, True, None, None),
}

DEFAULT_SUBGROUP_RULES = {
    "produits_cerealiers": {
        "biscuits_aperitifs": Rule(True, True, True, False, True),
        "farines": Rule(True, True, True, False, True),
        "pains_et_assimiles": Rule(True, True, True, False, True),
        "pates_a_tarte": Rule(True, True, True, False, True),
        "pates_riz_et_cereales": Rule(True, True, True, None, True),
    }
}

# Merge FR/EN keyword lists for tagging.
NAME_GLUTEN_FREE_TRUE = NAME_GLUTEN_FREE_TRUE_FR | NAME_GLUTEN_FREE_TRUE_EN
NAME_GLUTEN_FREE_FALSE = NAME_GLUTEN_FREE_FALSE_FR | NAME_GLUTEN_FREE_FALSE_EN
NAME_VEGAN_TOKENS = NAME_VEGAN_TOKENS_FR | NAME_VEGAN_TOKENS_EN
NAME_VEGAN_PHRASES = NAME_VEGAN_PHRASES_FR | NAME_VEGAN_PHRASES_EN
NAME_VEGETARIAN_TOKENS = NAME_VEGETARIAN_TOKENS_FR | NAME_VEGETARIAN_TOKENS_EN
NAME_NON_VEGETARIAN = NAME_NON_VEGETARIAN_FR | NAME_NON_VEGETARIAN_EN
NAME_NON_VEGAN = NAME_NON_VEGETARIAN | NAME_NON_VEGAN_FR_EXTRA | NAME_NON_VEGAN_EN_EXTRA
NAME_NON_PESCE = NAME_NON_PESCE_FR | NAME_NON_PESCE_EN


def _normalize(text: str) -> str:
    text = text.lower().replace("\n", " ").replace("\xa0", " ")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = "".join(ch for ch in text if ch.isalnum() or ch.isspace())
    return "_".join(text.split())


def _normalize_plain(text: str) -> str:
    text = text.lower().replace("\n", " ").replace("\xa0", " ")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return text


def _load_rules(path: Optional[str]) -> Dict[str, Rule]:
    if not path:
        return DEFAULT_GROUP_RULES

    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except Exception as exc:
        raise CommandError(f"Failed to read rules file: {exc}") from exc

    rules = {}
    for key, value in payload.items():
        if not isinstance(value, dict):
            raise CommandError(f"Invalid rule for {key}: expected object")
        rules[_normalize(key)] = Rule(
            value.get("vegan"),
            value.get("vegetarian"),
            value.get("pescetarian"),
            value.get("gluten_free"),
            value.get("lactose_free"),
        )
    return rules


def _apply_rule(item: FoodItem, rule: Rule) -> None:
    if rule.vegan is not None:
        item.vegan = rule.vegan
    if rule.vegetarian is not None:
        item.vegetarian = rule.vegetarian
    if rule.pescetarian is not None:
        item.pescetarian = rule.pescetarian
    if rule.gluten_free is not None:
        item.gluten_free = rule.gluten_free
    if rule.lactose_free is not None:
        item.lactose_free = rule.lactose_free


def _apply_name_overrides(item: FoodItem) -> None:
    if not item.name:
        return
    name = _normalize_plain(item.name)
    normalized = _normalize(item.name)
    tokens = set(normalized.split("_"))

    if tokens & NAME_VEGAN_TOKENS or any(phrase in normalized for phrase in NAME_VEGAN_PHRASES):
        item.vegan = True
    if tokens & NAME_VEGETARIAN_TOKENS:
        item.vegetarian = True

    if any(token in name for token in NAME_NON_VEGAN):
        item.vegan = False
    if any(token in name for token in NAME_NON_VEGETARIAN):
        item.vegetarian = False
    if any(token in name for token in NAME_NON_PESCE):
        item.pescetarian = False
    if any(token in name for token in NAME_GLUTEN_FREE_FALSE):
        item.gluten_free = False
    elif any(token in name for token in NAME_GLUTEN_FREE_TRUE):
        item.gluten_free = True


class Command(BaseCommand):
    help = "Auto-tag compatibilities from CIQUAL group names"

    def add_arguments(self, parser):
        parser.add_argument("--rules", help="Path to JSON file mapping group to flags")
        parser.add_argument("--dry-run", action="store_true", help="Parse only, no DB writes")
        parser.add_argument("--limit", type=int, default=None, help="Limit number of rows")
        parser.add_argument(
            "--only-if-default",
            action="store_true",
            help="Only update rows where flags are all False",
        )
        parser.add_argument(
            "--show-skipped",
            action="store_true",
            help="Print skipped rows with reason",
        )

    def handle(self, *args, **options):
        group_rules = _load_rules(options.get("rules"))
        dry_run = options["dry_run"]
        limit = options["limit"]
        only_if_default = options["only_if_default"]
        show_skipped = options["show_skipped"]

        qs = FoodItem.objects.all().only(
            "id",
            "name",
            "group_name",
            "subgroup_name",
            "vegan",
            "vegetarian",
            "pescetarian",
            "gluten_free",
            "lactose_free",
            "irritability_level",
        )
        if limit:
            qs = qs[:limit]

        updated = 0
        skipped = 0
        skipped_rows = []

        with transaction.atomic():
            for item in qs:
                if not item.group_name:
                    if show_skipped:
                        skipped_rows.append((item.id, item.name, "missing_group_name"))
                    skipped += 1
                    continue

                if only_if_default and (
                    item.vegan
                    or item.vegetarian
                    or item.pescetarian
                    or item.gluten_free
                    or item.lactose_free
                    or item.irritability_level
                ):
                    if show_skipped:
                        skipped_rows.append((item.id, item.name, "already_tagged"))
                    skipped += 1
                    continue

                group_key = _normalize(item.group_name)
                rule = group_rules.get(group_key)

                subgroup_rule = None
                subgroup_name = item.subgroup_name or ""
                subgroup_key = _normalize(subgroup_name) if subgroup_name else None
                subgroup_map = DEFAULT_SUBGROUP_RULES.get(group_key)
                if subgroup_map and subgroup_key:
                    subgroup_rule = subgroup_map.get(subgroup_key)

                if not rule and not subgroup_rule:
                    if show_skipped:
                        skipped_rows.append((item.id, item.name, "no_rule_match"))
                    skipped += 1
                    continue

                if rule:
                    _apply_rule(item, rule)
                if subgroup_rule:
                    _apply_rule(item, subgroup_rule)

                _apply_name_overrides(item)

                fodmap_value = classify_fodmap(item.name or "")
                if fodmap_value:
                    item.irritability_level = fodmap_value

                item.save(
                    update_fields=[
                        "vegan",
                        "vegetarian",
                        "pescetarian",
                        "gluten_free",
                        "lactose_free",
                        "irritability_level",
                    ]
                )
                updated += 1

            if dry_run:
                if show_skipped and skipped_rows:
                    for row_id, name, reason in skipped_rows:
                        self.stdout.write(f"[skipped] id={row_id} reason={reason} name={name}")
                raise CommandError(
                    f"Dry run requested. updated={updated}, skipped={skipped}"
                )

        if show_skipped and skipped_rows:
            for row_id, name, reason in skipped_rows:
                self.stdout.write(f"[skipped] id={row_id} reason={reason} name={name}")
        self.stdout.write(self.style.SUCCESS(f"Tagging done. updated={updated}, skipped={skipped}"))
