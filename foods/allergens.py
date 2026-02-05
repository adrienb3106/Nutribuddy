from dataclasses import dataclass
from typing import Dict, Iterable, List, Set
import re
import unicodedata

from django.db.models import Q


@dataclass(frozen=True)
class AllergenRule:
    key: str
    canonical: str
    tags: Set[str]
    tokens: Set[str]


def _normalize(text: str) -> str:
    text = text.lower().replace("\u0153", "oe").replace("\u00e6", "ae")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = "".join(ch if ch.isalnum() else " " for ch in text)
    return " ".join(text.split())


def _is_negated(haystack: str, token: str) -> bool:
    if not token:
        return False
    escaped = re.escape(token)
    negation_patterns = [
        rf"(?:^|\s)sans(?:\s+\w+){{0,2}}\s+{escaped}(?:\s|$)",
        rf"(?:^|\s)without(?:\s+\w+){{0,2}}\s+{escaped}(?:\s|$)",
        rf"(?:^|\s){escaped}\s+free(?:\s|$)",
        rf"(?:^|\s)free\s+from(?:\s+\w+){{0,2}}\s+{escaped}(?:\s|$)",
    ]
    return any(re.search(pattern, haystack) for pattern in negation_patterns)


def _token_set(values: Iterable[str]) -> Set[str]:
    return {value for value in values if value}


ALLERGEN_RULES: Dict[str, AllergenRule] = {
    "gluten": AllergenRule(
        key="gluten",
        canonical="en:gluten",
        tags={"en:gluten", "fr:gluten"},
        tokens=_token_set(
            [
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
            ]
        ),
    ),
    "milk": AllergenRule(
        key="milk",
        canonical="en:milk",
        tags={"en:milk", "en:lactose", "fr:lait", "fr:lactose"},
        tokens=_token_set(
            [
                "lait",
                "lactose",
                "milk",
                "fromage",
                "cheese",
                "beurre",
                "butter",
                "creme",
                "crème",
                "cream",
                "yaourt",
                "yogurt",
                "yoghurt",
                "caseine",
                "caséine",
                "lactoserum",
                "lactosérum",
                "whey",
            ]
        ),
    ),
    "eggs": AllergenRule(
        key="eggs",
        canonical="en:eggs",
        tags={"en:eggs", "fr:oeufs", "fr:oeuf"},
        tokens=_token_set(["oeuf", "œuf", "egg", "eggs"]),
    ),
    "fish": AllergenRule(
        key="fish",
        canonical="en:fish",
        tags={"en:fish", "fr:poisson"},
        tokens=_token_set(
            [
                "poisson",
                "fish",
                "saumon",
                "salmon",
                "thon",
                "tuna",
                "sardine",
                "anchois",
                "anchovy",
            ]
        ),
    ),
    "crustaceans": AllergenRule(
        key="crustaceans",
        canonical="en:crustaceans",
        tags={"en:crustaceans", "fr:crustaces", "fr:crustacés"},
        tokens=_token_set(
            [
                "crevette",
                "crustace",
                "crustacé",
                "crustacean",
                "crab",
                "shrimp",
                "prawn",
                "lobster",
                "langouste",
                "homard",
            ]
        ),
    ),
    "molluscs": AllergenRule(
        key="molluscs",
        canonical="en:molluscs",
        tags={"en:molluscs", "fr:mollusques"},
        tokens=_token_set(
            [
                "mollusque",
                "mollusc",
                "moule",
                "mussels",
                "huitre",
                "huître",
                "oyster",
                "calamar",
                "squid",
                "poulpe",
                "octopus",
            ]
        ),
    ),
    "peanuts": AllergenRule(
        key="peanuts",
        canonical="en:peanuts",
        tags={"en:peanuts", "fr:arachide"},
        tokens=_token_set(
            [
                "arachide",
                "peanut",
                "cacahuete",
                "cacahuète",
                "cacahouete",
                "cacahouète",
                "cacahuette",
                "cacahuettes",
            ]
        ),
    ),
    "nuts": AllergenRule(
        key="nuts",
        canonical="en:nuts",
        tags={"en:nuts", "fr:fruits-a-coque"},
        tokens=_token_set(
            [
                "noisette",
                "hazelnut",
                "amande",
                "almond",
                "noix",
                "walnut",
                "pistache",
                "pistachio",
                "cajou",
                "cashew",
                "pecan",
                "pécan",
                "macadamia",
                "brazil",
            ]
        ),
    ),
    "soy": AllergenRule(
        key="soy",
        canonical="en:soybeans",
        tags={"en:soybeans", "en:soya", "fr:soja"},
        tokens=_token_set(["soja", "soy", "soya", "tofu"]),
    ),
    "celery": AllergenRule(
        key="celery",
        canonical="en:celery",
        tags={"en:celery", "fr:celeri"},
        tokens=_token_set(["celeri", "céleri", "celery"]),
    ),
    "mustard": AllergenRule(
        key="mustard",
        canonical="en:mustard",
        tags={"en:mustard", "fr:moutarde"},
        tokens=_token_set(["moutarde", "mustard"]),
    ),
    "sesame": AllergenRule(
        key="sesame",
        canonical="en:sesame-seeds",
        tags={"en:sesame-seeds", "fr:sesame"},
        tokens=_token_set(["sesame", "sésame"]),
    ),
    "lupin": AllergenRule(
        key="lupin",
        canonical="en:lupin",
        tags={"en:lupin", "fr:lupin"},
        tokens=_token_set(["lupin"]),
    ),
    "sulphites": AllergenRule(
        key="sulphites",
        canonical="en:sulphur-dioxide-and-sulphites",
        tags={"en:sulphur-dioxide-and-sulphites", "fr:sulfites", "fr:sulfit"},
        tokens=_token_set(
            ["sulfite", "sulfites", "sulphite", "sulphites", "dioxyde de soufre"]
        ),
    ),
}


def allergen_query(rule: AllergenRule) -> Q:
    query = Q()
    if rule.tags:
        query |= Q(allergens_tags__overlap=list(rule.tags))
    for token in rule.tokens:
        query |= (
            Q(name__icontains=token)
            | Q(ingredients_text__icontains=token)
            | Q(ingredients_text_fr__icontains=token)
        )
    return query


def detect_allergen_tags(
    name: str | None, ingredients_text: str | None, ingredients_text_fr: str | None
) -> List[str]:
    haystack = _normalize(
        f"{name or ''} {ingredients_text_fr or ''} {ingredients_text or ''}"
    )
    matches = set()
    for rule in ALLERGEN_RULES.values():
        for token in rule.tokens:
            normalized_token = _normalize(token)
            if normalized_token in haystack and not _is_negated(haystack, normalized_token):
                matches.add(rule.canonical)
                break
    return sorted(matches)
