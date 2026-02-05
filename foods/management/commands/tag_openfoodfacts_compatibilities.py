import unicodedata
from typing import Iterable, Optional

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from foods.models import FoodItem
from foods.fodmap import classify_fodmap


LABEL_VEGAN = {"en:vegan", "en:100-vegetable", "en:plant-based-foods-and-beverages", "en:plant-based-foods", "en:legumes-and-their-products" }
LABEL_VEGETARIAN = {"en:vegetarian", "en:meat-alternatives"}
LABEL_PESCETARIAN = {"en:pescetarian"}
LABEL_GLUTEN_FREE = {"en:gluten-free", "en:no-gluten"}
LABEL_LACTOSE_FREE = {"en:lactose-free", "en:milk-free"}

VEGAN_TOKENS = {
    "vegan",
    "vegetalien",
    "vegetalienne",
    "plantbased",
    "plantbase",
}
VEGAN_PHRASES = {"plant based", "plant base"}

VEGETARIAN_TOKENS = {
    "vegetarian",
    "vegetarien",
    "vegetarienne",
    "vegetal",
    "vegetale",
}

ANALYSIS_VEGAN = {"en:vegan"}
ANALYSIS_VEGETARIAN = {"en:vegetarian"}
ANALYSIS_PESCETARIAN = {"en:pescetarian"}
ANALYSIS_NON_VEGAN = {"en:non-vegan"}
ANALYSIS_NON_VEGETARIAN = {"en:non-vegetarian"}
ANALYSIS_NON_PESCETARIAN = {"en:non-pescetarian"}

ALLERGEN_GLUTEN = {"en:gluten"}
ALLERGEN_MILK = {"en:milk", "en:lactose"}
ALLERGEN_EGGS = {"en:eggs"}
ALLERGEN_FISH = {"en:fish"}
ALLERGEN_SEAFOOD = {"en:crustaceans", "en:molluscs"}

MEAT_TOKENS = {
    "viande",
    "boeuf",
    "boeufs",
    "bœuf",
    "porc",
    "cochon",
    "jambon",
    "lard",
    "bacon",
    "poulet",
    "dinde",
    "canard",
    "agneau",
    "mouton",
    "veau",
    "lapin",
    "gibier",
    "steak",
    "saucisse",
    "saucisson",
    "charcuterie",
    "foie",
    "abats",
    "poitrine",
    "meat",
    "beef",
    "pork",
    "ham",
    "bacon",
    "chicken",
    "turkey",
    "duck",
    "lamb",
    "veal",
    "rabbit",
    "sausage",
}

FISH_TOKENS = {
    "poisson",
    "saumon",
    "thon",
    "sardine",
    "maquereau",
    "truite",
    "cabillaud",
    "morue",
    "hareng",
    "anchois",
    "surimi",
    "crevette",
    "crustace",
    "crustaces",
    "moule",
    "moules",
    "huitre",
    "huitres",
    "calamar",
    "calamars",
    "encornet",
    "seiche",
    "poulpe",
    "fish",
    "salmon",
    "tuna",
    "sardine",
    "anchovy",
    "shrimp",
    "prawn",
    "crab",
    "lobster",
    "squid",
    "octopus",
    "mollusc",
    "molluscs",
}

EGG_TOKENS = {"oeuf", "oeufs", "œuf", "œufs", "egg", "eggs"}

DAIRY_TOKENS = {
    "lait",
    "lactose",
    "fromage",
    "beurre",
    "creme",
    "crème",
    "yaourt",
    "yogourt",
    "yogurt",
    "caseine",
    "caséine",
    "lactoserum",
    "lactosérum",
    "whey",
    "milk",
    "cheese",
    "butter",
    "cream",
    "yogurt",
}

HONEY_GELATIN_TOKENS = {"miel", "honey", "gelatine", "gélatine", "gelatin"}

GLUTEN_TOKENS = {
    "gluten",
    "ble",
    "blé",
    "wheat",
    "orge",
    "barley",
    "seigle",
    "rye",
    "avoine",
    "oats",
    "epeautre",
    "épeautre",
    "spelt",
    "kamut",
    "triticale",
    "seitan",
}

NAME_GLUTEN_FREE_TRUE = {"riz", "maïs", "mais", "sarrasin", "quinoa", "mil", "sorgho", "teff"}


def _normalize(text: str) -> str:
    text = text.lower().replace("\n", " ").replace("\xa0", " ")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = "".join(ch for ch in text if ch.isalnum() or ch.isspace())
    return " ".join(text.split())


def _tokens(text: Optional[str]) -> set[str]:
    if not text:
        return set()
    return set(_normalize(text).split())


def _tagset(values: Optional[Iterable[str]]) -> set[str]:
    if not values:
        return set()
    return {str(value).strip().lower() for value in values if str(value).strip()}


def _contains_phrase(text: str, phrases: set[str]) -> bool:
    return any(phrase in text for phrase in phrases)


class Command(BaseCommand):
    help = "Auto-tag compatibilities for OpenFoodFacts items using ingredients/tags."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Parse only, no DB writes")
        parser.add_argument("--limit", type=int, default=None, help="Limit number of rows")
        parser.add_argument(
            "--only-if-default",
            action="store_true",
            help="Only update rows where flags are all False",
        )
        parser.add_argument(
            "--log-every",
            type=int,
            default=0,
            help="Log progress every N rows (0 disables).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        limit = options["limit"]
        only_if_default = options["only_if_default"]
        log_every = options["log_every"]

        qs = FoodItem.objects.filter(source=FoodItem.Source.OPENFOODFACTS).only(
            "id",
            "name",
            "ingredients_text_fr",
            "ingredients_text",
            "ingredients_analysis_tags",
            "allergens_tags",
            "labels_tags",
            "categories_tags",
            "vegan",
            "vegetarian",
            "pescetarian",
            "gluten_free",
            "lactose_free",
            "irritability_level",
        )
        if limit:
            qs = qs[:limit]

        processed = 0
        updated = 0
        skipped = 0

        with transaction.atomic():
            for item in qs:
                processed += 1
                if only_if_default and (
                    item.vegan
                    or item.vegetarian
                    or item.pescetarian
                    or item.gluten_free
                    or item.lactose_free
                    or item.irritability_level
                ):
                    skipped += 1
                    continue

                labels = _tagset(item.labels_tags)
                analysis = _tagset(item.ingredients_analysis_tags)
                allergens = _tagset(item.allergens_tags)
                categories = _tagset(item.categories_tags)

                ingredient_text = item.ingredients_text_fr or item.ingredients_text
                tokens = _tokens(ingredient_text) if ingredient_text else _tokens(item.name or "")

                keyword_text = _normalize(
                    " ".join(value for value in [item.name, ingredient_text] if value)
                )
                keyword_tokens = set(keyword_text.split())
                tag_text = _normalize(" ".join(list(labels) + list(categories)))

                has_vegan_keyword = bool(keyword_tokens & VEGAN_TOKENS) or _contains_phrase(
                    keyword_text, VEGAN_PHRASES
                )
                has_vegan_tag = any(token in tag_text for token in VEGAN_TOKENS)
                has_vegetarian_keyword = bool(keyword_tokens & VEGETARIAN_TOKENS)
                has_vegetarian_tag = any(token in tag_text for token in VEGETARIAN_TOKENS)

                has_meat = bool(tokens & MEAT_TOKENS)
                has_fish = bool(tokens & FISH_TOKENS) or bool(allergens & (ALLERGEN_FISH | ALLERGEN_SEAFOOD))
                has_eggs = bool(tokens & EGG_TOKENS) or bool(allergens & ALLERGEN_EGGS)
                has_dairy = bool(tokens & DAIRY_TOKENS) or bool(allergens & ALLERGEN_MILK)
                has_honey_gelatin = bool(tokens & HONEY_GELATIN_TOKENS)
                has_gluten = bool(tokens & GLUTEN_TOKENS) or bool(allergens & ALLERGEN_GLUTEN)

                vegan = item.vegan
                vegetarian = item.vegetarian
                pescetarian = item.pescetarian
                gluten_free = item.gluten_free
                lactose_free = item.lactose_free

                if labels & LABEL_VEGAN or analysis & ANALYSIS_VEGAN or has_vegan_keyword or has_vegan_tag:
                    vegan = True
                if (
                    labels & LABEL_VEGETARIAN
                    or analysis & ANALYSIS_VEGETARIAN
                    or has_vegetarian_keyword
                    or has_vegetarian_tag
                ):
                    vegetarian = True
                if labels & LABEL_PESCETARIAN or analysis & ANALYSIS_PESCETARIAN:
                    pescetarian = True
                if labels & LABEL_GLUTEN_FREE:
                    gluten_free = True
                if labels & LABEL_LACTOSE_FREE:
                    lactose_free = True

                if analysis & ANALYSIS_NON_VEGAN or has_meat or has_fish or has_eggs or has_dairy or has_honey_gelatin:
                    vegan = False
                if analysis & ANALYSIS_NON_VEGETARIAN or has_meat or has_fish:
                    vegetarian = False
                if analysis & ANALYSIS_NON_PESCETARIAN or has_meat:
                    pescetarian = False
                if has_gluten:
                    gluten_free = False
                if has_dairy:
                    lactose_free = False

                if not ingredient_text:
                    name_tokens = _tokens(item.name or "")
                    if name_tokens & NAME_GLUTEN_FREE_TRUE and not has_gluten:
                        gluten_free = True

                fodmap_source = " ".join(
                    value
                    for value in [item.name, item.ingredients_text_fr, item.ingredients_text]
                    if value
                )
                fodmap_value = classify_fodmap(fodmap_source)
                new_irritability = (
                    fodmap_value if fodmap_value else item.irritability_level
                )

                if (
                    vegan == item.vegan
                    and vegetarian == item.vegetarian
                    and pescetarian == item.pescetarian
                    and gluten_free == item.gluten_free
                    and lactose_free == item.lactose_free
                    and new_irritability == item.irritability_level
                ):
                    skipped += 1
                    continue

                item.vegan = vegan
                item.vegetarian = vegetarian
                item.pescetarian = pescetarian
                item.gluten_free = gluten_free
                item.lactose_free = lactose_free
                if fodmap_value:
                    item.irritability_level = new_irritability
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

                if log_every and processed % log_every == 0:
                    self.stdout.write(
                        f"processed={processed} updated={updated} skipped={skipped}"
                    )

            if dry_run:
                raise CommandError(
                    f"Dry run requested. processed={processed}, updated={updated}, skipped={skipped}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Tagging done. processed={processed}, updated={updated}, skipped={skipped}"
            )
        )
