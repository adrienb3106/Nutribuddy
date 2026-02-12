"""Compatibility keyword lists shared by tagging commands.

These lists are already normalized (lowercase, accents removed). We keep French
and English variants separate to make it explicit what is applied, then merge
them when tagging.
"""

# Gluten-free hints
NAME_GLUTEN_FREE_TRUE_FR = {
    "riz",
    "mais",
    "sarrasin",
    "quinoa",
    "mil",
    "sorgho",
    "teff",
}

NAME_GLUTEN_FREE_TRUE_EN = {
    "rice",
    "corn",
    "maize",
    "buckwheat",
    "quinoa",
    "millet",
    "sorghum",
    "teff",
}

NAME_GLUTEN_FREE_FALSE_FR = {
    "ble",
    "orge",
    "seigle",
    "avoine",
    "epeautre",
    "triticale",
}

NAME_GLUTEN_FREE_FALSE_EN = {
    "wheat",
    "barley",
    "rye",
    "oats",
    "spelt",
    "triticale",
}

# Vegan/vegetarian positive hints
NAME_VEGAN_TOKENS_FR = {
    "vegetalien",
    "vegetalienne",
    "vegan",
    "végane",
    "vegane",
    "100% végétal",
    "100% végétale",
}

NAME_VEGAN_TOKENS_EN = {
    "vegan",
    "plantbased",
    "plant based",
    "plant-based",
    "plantbase",
}

NAME_VEGAN_PHRASES_FR = set()
NAME_VEGAN_PHRASES_EN = {"plant_base", "plant_based"}

NAME_VEGETARIAN_TOKENS_FR = {
    "vegetarien",
    "vegetarienne",
    "vegetal",
    "vegetale",
}

NAME_VEGETARIAN_TOKENS_EN = {
    "vegetarian",
}

# Negative hints
NAME_NON_VEGETARIAN_FR = {
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
    "viande",
    "boeuf",
    "boeufs",
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
}

NAME_NON_VEGETARIAN_EN = {
    "fish",
    "salmon",
    "tuna",
    "sardine",
    "mackerel",
    "trout",
    "cod",
    "herring",
    "anchovy",
    "shrimp",
    "prawn",
    "crab",
    "lobster",
    "squid",
    "octopus",
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
    "venison",
    "sausage",
}

NAME_NON_VEGAN_FR_EXTRA = {
    "oeuf",
    "oeufs",
    "lait",
    "lactose",
    "fromage",
    "beurre",
    "creme",
    "yaourt",
    "yogourt",
    "miel",
    "caseine",
    "lactoserum",
    "petit_lait",
    "gelatine",
}

NAME_NON_VEGAN_EN_EXTRA = {
    "egg",
    "eggs",
    "milk",
    "lactose",
    "cheese",
    "butter",
    "cream",
    "yogurt",
    "honey",
    "casein",
    "whey",
    "gelatin",
}

NAME_NON_PESCE_FR = {
    "viande",
    "boeuf",
    "boeufs",
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
}

NAME_NON_PESCE_EN = {
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
    "venison",
    "sausage",
}
