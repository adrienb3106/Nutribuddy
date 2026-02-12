export const ALLERGEN_OPTIONS = [
  { key: "gluten", label: "Gluten" },
  { key: "milk", label: "Lait" },
  { key: "eggs", label: "Oeufs" },
  { key: "fish", label: "Poisson" },
  { key: "crustaceans", label: "Crustacés" },
  { key: "molluscs", label: "Mollusques" },
  { key: "peanuts", label: "Arachide" },
  { key: "nuts", label: "Fruits à coque" },
  { key: "soy", label: "Soja" },
  { key: "celery", label: "Céleri" },
  { key: "mustard", label: "Moutarde" },
  { key: "sesame", label: "Sésame" },
  { key: "lupin", label: "Lupin" },
  { key: "sulphites", label: "Sulfites" },
] as const;

export type AllergenKey = (typeof ALLERGEN_OPTIONS)[number]["key"];

const RULES: Record<
  AllergenKey,
  { tags: string[]; tokens: string[] }
> = {
  gluten: {
    tags: ["en:gluten", "fr:gluten"],
    tokens: [
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
    ],
  },
  milk: {
    tags: ["en:milk", "en:lactose", "fr:lait", "fr:lactose"],
    tokens: [
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
    ],
  },
  eggs: {
    tags: ["en:eggs", "fr:oeufs", "fr:oeuf"],
    tokens: ["oeuf", "œuf", "egg", "eggs"],
  },
  fish: {
    tags: ["en:fish", "fr:poisson"],
    tokens: [
      "poisson",
      "fish",
      "saumon",
      "salmon",
      "thon",
      "tuna",
      "sardine",
      "anchois",
      "anchovy",
    ],
  },
  crustaceans: {
    tags: ["en:crustaceans", "fr:crustaces", "fr:crustacés"],
    tokens: [
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
    ],
  },
  molluscs: {
    tags: ["en:molluscs", "fr:mollusques"],
    tokens: [
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
    ],
  },
  peanuts: {
    tags: ["en:peanuts", "fr:arachide"],
    tokens: [
      "arachide",
      "peanut",
      "cacahuete",
      "cacahuète",
      "cacahouete",
      "cacahouète",
      "cacahuette",
      "cacahuettes",
    ],
  },
  nuts: {
    tags: ["en:nuts", "fr:fruits-a-coque"],
    tokens: [
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
    ],
  },
  soy: {
    tags: ["en:soybeans", "en:soya", "fr:soja"],
    tokens: ["soja", "soy", "soya", "tofu"],
  },
  celery: {
    tags: ["en:celery", "fr:celeri"],
    tokens: ["celeri", "céleri", "celery"],
  },
  mustard: {
    tags: ["en:mustard", "fr:moutarde"],
    tokens: ["moutarde", "mustard"],
  },
  sesame: {
    tags: ["en:sesame-seeds", "fr:sesame"],
    tokens: ["sesame", "sésame"],
  },
  lupin: {
    tags: ["en:lupin", "fr:lupin"],
    tokens: ["lupin"],
  },
  sulphites: {
    tags: ["en:sulphur-dioxide-and-sulphites", "fr:sulfites", "fr:sulfit"],
    tokens: ["sulfite", "sulfites", "sulphite", "sulphites", "dioxyde de soufre"],
  },
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/\u0153/g, "oe")
    .replace(/\u00e6/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isNegated = (haystack: string, token: string) => {
  if (!token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`(?:^|\\s)sans(?:\\s+\\w+){0,2}\\s+${escaped}(?:\\s|$)`),
    new RegExp(`(?:^|\\s)without(?:\\s+\\w+){0,2}\\s+${escaped}(?:\\s|$)`),
    new RegExp(`(?:^|\\s)${escaped}\\s+free(?:\\s|$)`),
    new RegExp(`(?:^|\\s)free\\s+from(?:\\s+\\w+){0,2}\\s+${escaped}(?:\\s|$)`),
  ];
  return patterns.some((pattern) => pattern.test(haystack));
};

export function detectAllergens(
  item: {
    name?: string | null;
    allergens_tags?: string[] | null;
    ingredients_text?: string | null;
    ingredients_text_fr?: string | null;
  },
  selected: AllergenKey[]
): string[] {
  if (!selected.length) return [];

  const tags = new Set((item.allergens_tags || []).map((tag) => tag.toLowerCase()));
  const haystack = normalize(
    `${item.name || ""} ${item.ingredients_text_fr || ""} ${item.ingredients_text || ""}`
  );

  const matches: string[] = [];
  for (const key of selected) {
    const rule = RULES[key];
    const normalizedTokens = rule.tokens.map((token) => normalize(token));
    const isRuleNegated = normalizedTokens.some((token) => isNegated(haystack, token));
    const hasTag = rule.tags.some((tag) => tags.has(tag));
    const hasToken = normalizedTokens.some((token) => haystack.includes(token));
    if ((hasTag || hasToken) && !isRuleNegated) {
      const label = ALLERGEN_OPTIONS.find((opt) => opt.key === key)?.label ?? key;
      matches.push(label);
    }
  }
  return matches;
}
