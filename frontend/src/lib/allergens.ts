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
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function detectAllergens(
  item: {
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
    const hasTag = rule.tags.some((tag) => tags.has(tag));
    const hasToken = rule.tokens.some((token) => haystack.includes(normalize(token)));
    if (hasTag || hasToken) {
      const label = ALLERGEN_OPTIONS.find((opt) => opt.key === key)?.label ?? key;
      matches.push(label);
    }
  }
  return matches;
}
