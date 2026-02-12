"""FODMAP keyword lists + lightweight classifier.

This module centralizes the low/high FODMAP ingredient lists and provides a
simple text classifier used by tagging commands. It works on normalized text
and returns:
- "high_fodmap" when a high FODMAP keyword/phrase is detected,
- "low_fodmap" when a low FODMAP keyword/phrase is detected,
- None when no match is found.
"""

import unicodedata
from typing import Iterable, Optional, Sequence

# Canonical ingredient keywords (source: data/fodmap.json, copied here for runtime use).
LOW_FODMAP: Sequence[str] = [
    'anis étoilé',
    'ananas',
    'banane',
    'bleuet',
    'cantaloup',
    'canneberge',
    'citron',
    'citron vert',
    'clémentine',
    'durian',
    'fraise',
    'framboise',
    'fruit de la passion',
    'kiwi',
    'mandarine',
    'melon',
    'myrtille',
    'noix de coco',
    'orange',
    'pamplemousse',
    'papaye',
    'raisin',
    'rhubarbe',
    'tangelo',
    'aubergine',
    'basilic',
    'bok choy',
    'brocoli',
    'carotte',
    'céleri',
    'concombre',
    'courgette',
    'coriandre',
    'endive',
    'épinard',
    'gingembre',
    'laitue',
    'mâche',
    'olive',
    'olives',
    'pak choï',
    'patate douce',
    'persil',
    'poivron',
    'pomme de terre',
    'roquette',
    'salade',
    'thym',
    'tomate',
    'amarante',
    'arrow-root',
    'avoine',
    'farine de maïs',
    'farine de riz',
    'farine de sarrasin',
    'farine sans gluten',
    'fécule de maïs',
    'fécule de pomme de terre',
    'maïzena',
    'millet',
    'polenta',
    'quinoa',
    'riz',
    'sarrasin',
    "son d'avoine",
    'tapioca',
    'amande',
    'arachide',
    'cacahuète',
    'chia',
    'graines de chia',
    'graines de chanvre',
    'graines de courge',
    'graines de lin',
    'graines de tournesol',
    'macadamia',
    'noisette',
    'noix',
    'noix de pécan',
    'noix du brésil',
    'pécan',
    'pecan',
    'sésame',
    'beurre',
    'beurre sans lactose',
    'ghee',
    "huile d'olive",
    "lait d'amande",
    'lait de coco',
    'lait de riz',
    'lait de soja',
    'lait sans lactose',
    'yaourt sans lactose',
    'yaourt végétal',
    'brie',
    'camembert',
    'cheddar',
    'comté',
    'emmental',
    'feta',
    'gorgonzola',
    'gouda',
    'gruyère',
    'mimolette',
    'mozzarella',
    'parmesan',
    'roquefort',
    "bleu d'auvergne",
    'cassonade',
    'mélasse',
    "sirop d'érable",
    'sirop de sucre',
    'stévia',
    'stevia',
    'sucre',
    'sucre blanc',
    'sucre roux',
    'bœuf',
    'boeuf',
    'dinde',
    'œuf',
    'oeuf',
    'poisson',
    'poulet',
    'porc',
    'crevette',
    'tempeh',
    'tofu',
    'bière',
    'café',
    'espresso',
    'gin',
    'jus de fruits frais',
    'thé',
    'vin',
    'vodka',
    'whisky',
]

HIGH_FODMAP: Sequence[str] = [
    'abricot',
    'conserve de fruits',
    'datte',
    'figue',
    'fruits secs',
    'kaki',
    'mangue',
    "melon d'eau",
    'mûre',
    'nectarine',
    'pastèque',
    'pêche',
    'poire',
    'pomme',
    'prune',
    'pruneau',
    'raisin sec',
    'ail',
    'ail en poudre',
    'artichaut',
    'asperge',
    'avocat',
    'betterave',
    'champignon',
    'chou',
    'chou de bruxelles',
    'chou-fleur',
    'échalote',
    'fenouil',
    'maïs doux',
    'oignon',
    'oignon en poudre',
    'petit pois',
    'poireau',
    'tige de brocoli',
    'topinambour',
    'edamame',
    'fève',
    'fève de soja',
    'flageolet',
    'gourgane',
    'haricot blanc',
    'haricot noir',
    'haricot rouge',
    'lentille',
    'pois cassé',
    'pois chiche',
    'pois vert sec',
    'soja',
    'blé',
    'boulgour',
    'couscous',
    'épeautre',
    'freekeh',
    'germe de blé',
    'kamut',
    'orge',
    'seigle',
    'semoule',
    'son de blé',
    'froment',
    'noix de cajou',
    'pistache',
    'crème fraîche',
    'faisselle',
    'fromage blanc',
    'lactose',
    'lactosérum',
    'lait',
    'lait concentré',
    'lait de vache',
    'mascarpone',
    'poudre de lait',
    'ricotta',
    'yaourt',
    'fructanes',
    'fructose',
    'gos',
    'fos',
    'hfcs',
    'inuline',
    'miel',
    'oligofructose',
    "sirop d'agave",
    'sirop de maïs',
    'e420',
    'e421',
    'e953',
    'e965',
    'e967',
    'sorbitol',
    'mannitol',
    'xylitol',
    'maltitol',
    'isomalt',
    'concentré de jus',
    'jus de fruits du commerce',
    'cidre',
    'crème de cassis',
    'porto',
    'rhum',
    'vermouth',
    'vin cuit',
]

# Normalizes accents/punctuation so we can match against simple tokens.
def _normalize(text: str) -> str:
    text = text.lower().replace("\n", " ").replace("\xa0", " ")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = "".join(ch if ch.isalnum() else " " for ch in text)
    return " ".join(text.split())

# Splits single-word tokens from multi-word phrases for matching.
def _split_values(values: Iterable[str]) -> tuple[set[str], list[str]]:
    tokens: set[str] = set()
    phrases: list[str] = []
    for value in values:
        normalized = _normalize(str(value))
        if not normalized:
            continue
        if " " in normalized:
            phrases.append(normalized)
        else:
            tokens.add(normalized)
    return tokens, phrases

LOW_TOKENS, LOW_PHRASES = _split_values(LOW_FODMAP)
HIGH_TOKENS, HIGH_PHRASES = _split_values(HIGH_FODMAP)

# Classifies text as low/high FODMAP using phrase-first matching.
# High phrases/tokens take precedence; low phrases can override token overlaps
# (e.g. "pomme" vs "pomme de terre").
def classify_fodmap(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    normalized = _normalize(text)
    if not normalized:
        return None
    for phrase in HIGH_PHRASES:
        if phrase in normalized:
            return "high_fodmap"
    matched_low_phrases = [phrase for phrase in LOW_PHRASES if phrase in normalized]
    ignore_tokens: set[str] = set()
    for phrase in matched_low_phrases:
        ignore_tokens.update(phrase.split())
    tokens = set(normalized.split())
    if HIGH_TOKENS & (tokens - ignore_tokens):
        return "high_fodmap"
    if matched_low_phrases:
        return "low_fodmap"
    if LOW_TOKENS & tokens:
        return "low_fodmap"
    return None


def find_fodmap_matches(text: Optional[str]) -> tuple[list[str], list[str]]:
    if not text:
        return [], []
    normalized = _normalize(text)
    if not normalized:
        return [], []

    matched_low_phrases = [phrase for phrase in LOW_PHRASES if phrase in normalized]
    matched_high_phrases = [phrase for phrase in HIGH_PHRASES if phrase in normalized]

    tokens = set(normalized.split())
    ignore_tokens: set[str] = set()
    for phrase in matched_low_phrases:
        ignore_tokens.update(phrase.split())

    high_tokens = HIGH_TOKENS & (tokens - ignore_tokens)
    low_tokens = LOW_TOKENS & tokens

    high_norm = set(matched_high_phrases) | set(high_tokens)
    low_norm = set(matched_low_phrases) | set(low_tokens)

    high_matches = [value for value in HIGH_FODMAP if _normalize(str(value)) in high_norm]
    low_matches = [value for value in LOW_FODMAP if _normalize(str(value)) in low_norm]
    return high_matches, low_matches

