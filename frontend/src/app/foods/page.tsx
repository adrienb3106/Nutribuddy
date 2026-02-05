"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { detectAllergens, type AllergenKey } from "@/lib/allergens";
import { getToken } from "@/lib/auth";

interface FoodItem {
  id: number;
  name: string;
  brand?: string | null;
  source: string;
  barcode?: string | null;
  quantity?: string | null;
  nutrition_per?: string | null;
  kcal_100g: string | null;
  protein_g_100g: string | null;
  carbs_g_100g: string | null;
  fat_g_100g: string | null;
  sugars_g_100g?: string | null;
  fiber_g_100g?: string | null;
  saturated_fat_g_100g?: string | null;
  salt_g_100g?: string | null;
  nutrient_levels?: Record<string, string>;
  nutriscore_grade?: string | null;
  nutriscore_score?: number | null;
  nutriscore_version?: string | null;
  categories_tags?: string[];
  allergens_tags?: string[];
  labels_tags?: string[];
  ingredients_text_fr?: string | null;
  ingredients_text?: string | null;
  ingredients_analysis_tags?: string[];
  ingredients_from_palm_oil_tags?: string[];
  ingredients_may_be_from_palm_oil_tags?: string[];
  vegan: boolean;
  vegetarian: boolean;
  pescetarian: boolean;
  gluten_free: boolean;
  lactose_free: boolean;
  irritability_level: "high_fodmap" | "low_fodmap" | null;
  fodmap_matches?: string[];
  source_last_updated_t?: number | null;
  source_completeness?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface Profile {
  vegan: boolean;
  vegetarian: boolean;
  pescetarian: boolean;
  gluten_free: boolean;
  lactose_free: boolean;
  irritability_level: "high_fodmap" | "low_fodmap" | null;
  allergens: AllergenKey[];
  filter_allergens: boolean;
}

const DEFAULT_FILTERS = {
  search: "",
  brand: "",
  source: "",
  vegan: false,
  vegetarian: false,
  pescetarian: false,
  gluten_free: false,
  lactose_free: false,
  kcal_max: "",
  protein_min: "",
  fat_max: "",
  irritability_level: "",
};

const SOURCE_LABELS: Record<string, string> = {
  ciqual: "Ciqual",
  openfoodfacts: "Open Food Facts",
  manual: "Manuel",
};

const RESTRICTION_LABELS = {
  vegan: "Vegan",
  vegetarian: "Vegetarien",
  pescetarian: "Pescetarien",
  gluten_free: "Sans gluten",
  lactose_free: "Sans lactose",
} as const;

const FODMAP_LABELS: Record<NonNullable<FoodItem["irritability_level"]>, string> = {
  low_fodmap: "Pauvre en FODMAP",
  high_fodmap: "Riche en FODMAP",
};

const FODMAP_TAG_CLASS: Record<NonNullable<FoodItem["irritability_level"]>, string> = {
  low_fodmap: "tag-fodmap-low",
  high_fodmap: "tag-fodmap-high",
};

export default function FoodsPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState("name");
  const [items, setItems] = useState<FoodItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyProfile, setApplyProfile] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [profileAllergens, setProfileAllergens] = useState<AllergenKey[]>([]);
  const [profileFilterAllergens, setProfileFilterAllergens] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (filters.search) params.set("search", filters.search);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.source) params.set("source", filters.source);
    if (ordering) params.set("ordering", ordering);
    if (filters.kcal_max) params.set("kcal_max", filters.kcal_max);
    if (filters.protein_min) params.set("protein_min", filters.protein_min);
    if (filters.fat_max) params.set("fat_max", filters.fat_max);
    if (filters.irritability_level) {
      params.set("irritability_level", filters.irritability_level);
    }
    if (applyProfile && profileFilterAllergens && profileAllergens.length > 0) {
      params.set("exclude_allergens", "true");
      params.set("allergens", profileAllergens.join(","));
    }
    ("vegan vegetarian pescetarian gluten_free lactose_free" as const)
      .split(" ")
      .forEach((key) => {
        if (filters[key]) params.set(key, "true");
      });
    return params.toString();
  }, [applyProfile, filters, page, ordering, profileAllergens, profileFilterAllergens]);

  useEffect(() => {
    if (!hasSearched) {
      setItems([]);
      setCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    apiFetch<PagedResponse<FoodItem>>(`/api/foods/?${queryString}`)
      .then((data) => {
        setItems(data.results);
        setCount(data.count);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Echec du chargement"))
      .finally(() => setLoading(false));
  }, [hasSearched, queryString]);

  useEffect(() => {
    const query = filters.brand.trim();
    if (!query) {
      setBrandSuggestions([]);
      setBrandLoading(false);
      return;
    }
    const handle = window.setTimeout(() => {
      setBrandLoading(true);
      apiFetch<{ results: string[] }>(`/api/foods/brands/?q=${encodeURIComponent(query)}`)
        .then((data) => setBrandSuggestions(data.results))
        .catch(() => setBrandSuggestions([]))
        .finally(() => setBrandLoading(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [filters.brand]);

  useEffect(() => {
    setAuthToken(getToken());
  }, []);

  useEffect(() => {
    if (!authToken) {
      setProfileAllergens([]);
      setProfileFilterAllergens(false);
      return;
    }
    apiFetch<Profile>("/api/auth/profile/", {}, authToken)
      .then((profile) => {
        setProfileAllergens(profile.allergens || []);
        setProfileFilterAllergens(!!profile.filter_allergens);
      })
      .catch(() => {
        setProfileAllergens([]);
        setProfileFilterAllergens(false);
      });
  }, [authToken]);

  useEffect(() => {
    if (!applyProfile) {
      return;
    }
    if (!authToken) {
      setError("Connectez-vous pour appliquer votre profil alimentaire.");
      setApplyProfile(false);
      return;
    }

    apiFetch<Profile>("/api/auth/profile/", {}, authToken)
      .then((profile) => {
        setFilters((prev) => ({
          ...prev,
          vegan: profile.vegan,
          vegetarian: profile.vegetarian,
          pescetarian: profile.pescetarian,
          gluten_free: profile.gluten_free,
          lactose_free: profile.lactose_free,
          irritability_level: profile.irritability_level ?? "",
        }));
        setProfileAllergens(profile.allergens || []);
        setProfileFilterAllergens(!!profile.filter_allergens);
        setPage(1);
        setHasSearched(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger le profil");
        setApplyProfile(false);
      });
  }, [applyProfile, authToken]);

  const onToggle = (key: keyof typeof DEFAULT_FILTERS) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    setPage(1);
    setHasSearched(true);
  };

  const onChange = (key: keyof typeof DEFAULT_FILTERS, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
    setHasSearched(true);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setApplyProfile(false);
    setPage(1);
    setProfileAllergens([]);
    setProfileFilterAllergens(false);
    setHasSearched(false);
  };

  useEffect(() => {
    if (!selectedItem) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedItem(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedItem]);

  const formatList = (value?: string[]) => {
    if (!value || value.length === 0) {
      return "-";
    }
    return value.join(", ");
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">Explorer</div>
          <h1 className="page-title">Explorateur d'aliments</h1>
          <p className="page-subtitle">
            Trouvez rapidement un aliment, appliquez vos contraintes et comparez
            les macros en un coup d'oeil.
          </p>
        </div>
        <div className="cluster">
          <span className="pill">{count} elements</span>
          <span className="notice">Page {page}</span>
        </div>
      </header>

      <div className="layout-two">
        <aside className="panel filters-panel">
          <div className="section-title">Filtres</div>
          <p className="notice">Combinez texte, marques et restrictions.</p>
          <div className="divider" />
          <div className="form">
            <label className="label">Recherche</label>
            <input
              className="input"
              value={filters.search}
              onChange={(event) => onChange("search", event.target.value)}
              placeholder="Ex: haricot, tomate, riz..."
            />
            <label className="label">
              Marque
              {brandLoading ? <span className="notice">Chargement...</span> : null}
            </label>
            <input
              className="input"
              value={filters.brand}
              onChange={(event) => onChange("brand", event.target.value)}
              placeholder="Commencez a taper une marque..."
              list="brand-suggestions"
            />
            <datalist id="brand-suggestions">
              {brandSuggestions.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
            <label className="label">Source</label>
            <select
              className="input"
              value={filters.source}
              onChange={(event) => onChange("source", event.target.value)}
            >
              <option value="">Toutes</option>
              <option value="ciqual">Ciqual</option>
              <option value="openfoodfacts">Open Food Facts</option>
              <option value="manual">Manuel</option>
            </select>
            <label className="label">Tri</label>
            <select
              className="input"
              value={ordering}
              onChange={(event) => {
                setOrdering(event.target.value);
                setPage(1);
              }}
            >
              <option value="name">Nom A - Z</option>
              <option value="-name">Nom Z - A</option>
              <option value="-kcal_100g">Kcal bas</option>
              <option value="kcal_100g">Kcal haut</option>
            </select>
            <div className="grid">
              <div>
                <label className="label">Kcal max / 100 g</label>
                <input
                  className="input"
                  type="number"
                  value={filters.kcal_max}
                  onChange={(event) => onChange("kcal_max", event.target.value)}
                />
              </div>
              <div>
                <label className="label">Proteines min / 100 g</label>
                <input
                  className="input"
                  type="number"
                  value={filters.protein_min}
                  onChange={(event) => onChange("protein_min", event.target.value)}
                />
              </div>
              <div>
                <label className="label">Lipides max / 100 g</label>
                <input
                  className="input"
                  type="number"
                  value={filters.fat_max}
                  onChange={(event) => onChange("fat_max", event.target.value)}
                />
              </div>
              <div>
                <label className="label">FODMAP</label>
                <select
                  className="input"
                  value={filters.irritability_level}
                  onChange={(event) => onChange("irritability_level", event.target.value)}
                  disabled={applyProfile}
                >
                  <option value="">Tous</option>
                  <option value="low_fodmap">Pauvre en FODMAP</option>
                  <option value="high_fodmap">Riche en FODMAP</option>
                </select>
              </div>
            </div>
            <div className="grid">
              {(["vegan", "vegetarian", "pescetarian", "gluten_free", "lactose_free"] as const).map(
                (key) => (
                  <label key={key} className="label">
                    <input
                      type="checkbox"
                      checked={filters[key]}
                      onChange={() => onToggle(key)}
                      disabled={applyProfile}
                    />
                    {" "}{RESTRICTION_LABELS[key]}
                  </label>
                )
              )}
            </div>
            <label className="label">
              <input
                type="checkbox"
                checked={applyProfile}
                onChange={() => setApplyProfile((prev) => !prev)}
              />
              {" "}Appliquer mon profil
            </label>
            <div className="cluster">
              <button className="button" type="button" onClick={resetFilters}>
                Reinitialiser
              </button>
              <span className="notice">Les resultats se mettent a jour automatiquement.</span>
            </div>
          </div>
        </aside>

        <div className="panel results-panel">
          <div className="results-header">
            <div>
              <div className="section-title">Resultats</div>
              <p className="notice">{count} elements</p>
            </div>
            <span className="notice">Page {page}</span>
          </div>
          {loading ? <p className="notice">Chargement...</p> : null}
          {error ? <p className="notice">{error}</p> : null}
          {!hasSearched && !loading && !error ? (
            <p className="notice">
              Lancez une recherche ou appliquez des filtres pour afficher des aliments.
            </p>
          ) : null}

          <div className="foods-list stagger">
            {hasSearched
              ? items.map((item) => {
                  const macros = [
                    { label: "kcal", value: item.kcal_100g, className: "macro-kcal" },
                    { label: "P", value: item.protein_g_100g, className: "macro-protein" },
                    { label: "C", value: item.carbs_g_100g, className: "macro-carbs" },
                    { label: "F", value: item.fat_g_100g, className: "macro-fat" },
                  ].filter(({ value }) => {
                    const num = Number(value);
                    return Number.isFinite(num) && num > 0;
                  });

                  const sourceLabel = SOURCE_LABELS[item.source] ?? item.source;
                  const allergenMatches =
                    authToken && profileAllergens.length > 0
                      ? detectAllergens(item, profileAllergens)
                      : [];
                  const showVegan = item.vegan;
                  const showVegetarian = !item.vegan && item.vegetarian;
                  const showPescetarian =
                    !item.vegan && !item.vegetarian && item.pescetarian;

                  return (
                    <div
                      className="food-card"
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedItem(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedItem(item);
                        }
                      }}
                    >
                      <div className="food-main">
                        <div className="food-heading">
                          <h3 className="food-name">{item.name}</h3>
                        </div>
                        <div className="food-meta">
                          {item.brand ? (
                            <span className="food-brand">{item.brand}</span>
                          ) : null}
                          <span className="food-source">{sourceLabel}</span>
                        </div>
                        {macros.length > 0 ? (
                          <div className="macro-stack compact">
                            {macros.map((macro) => (
                              <span
                                key={macro.label}
                                className={`macro-chip ${macro.className}`}
                              >
                                {macro.label} {macro.value}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {allergenMatches.length > 0 ? (
                          <div className="allergen-warning">
                            <span className="tag tag-warning">
                              Allergenes : {allergenMatches.join(", ")}
                            </span>
                          </div>
                        ) : null}
                        <div className="food-tags">
                          {item.irritability_level && (
                            <span className={`tag ${FODMAP_TAG_CLASS[item.irritability_level]}`}>
                              {FODMAP_LABELS[item.irritability_level]}
                            </span>
                          )}
                          {showVegan && <span className="tag">{RESTRICTION_LABELS.vegan}</span>}
                          {showVegetarian && (
                            <span className="tag">{RESTRICTION_LABELS.vegetarian}</span>
                          )}
                          {showPescetarian && (
                            <span className="tag">{RESTRICTION_LABELS.pescetarian}</span>
                          )}
                          {item.gluten_free && (
                            <span className="tag">{RESTRICTION_LABELS.gluten_free}</span>
                          )}
                          {item.lactose_free && (
                            <span className="tag">{RESTRICTION_LABELS.lactose_free}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        </div>
      </div>

      {selectedItem ? (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{selectedItem.name}</h2>
                {selectedItem.brand ? (
                  <div className="modal-subtitle">{selectedItem.brand}</div>
                ) : null}
              </div>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>
                Fermer
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-grid">
                <div className="modal-section">
                  <div className="section-title">Apercu</div>
                  <div className="detail">
                    <span className="detail-label">Source</span>
                    <span className="detail-value">
                      {SOURCE_LABELS[selectedItem.source] ?? selectedItem.source}
                    </span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Code-barres</span>
                    <span className="detail-value">{selectedItem.barcode ?? "-"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Quantite</span>
                    <span className="detail-value">{selectedItem.quantity ?? "-"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Nutrition pour</span>
                    <span className="detail-value">
                      {selectedItem.nutrition_per ?? "-"}
                    </span>
                  </div>
                  <div className="detail-column">
                    <span className="detail-label">Restrictions</span>
                    <div className="food-tags">
                      {selectedItem.vegan && (
                        <span className="tag">{RESTRICTION_LABELS.vegan}</span>
                      )}
                      {selectedItem.vegetarian && (
                        <span className="tag">{RESTRICTION_LABELS.vegetarian}</span>
                      )}
                      {selectedItem.pescetarian && (
                        <span className="tag">{RESTRICTION_LABELS.pescetarian}</span>
                      )}
                      {selectedItem.gluten_free && (
                        <span className="tag">{RESTRICTION_LABELS.gluten_free}</span>
                      )}
                      {selectedItem.lactose_free && (
                        <span className="tag">{RESTRICTION_LABELS.lactose_free}</span>
                      )}
                      {selectedItem.irritability_level && (
                        <span
                          className={`tag ${FODMAP_TAG_CLASS[selectedItem.irritability_level]}`}
                        >
                          {FODMAP_LABELS[selectedItem.irritability_level]}
                        </span>
                      )}
                      {!selectedItem.vegan &&
                        !selectedItem.vegetarian &&
                        !selectedItem.pescetarian &&
                        !selectedItem.gluten_free &&
                        !selectedItem.lactose_free &&
                        !selectedItem.irritability_level && (
                          <span className="notice">-</span>
                        )}
                    </div>
                    {selectedItem.irritability_level === "high_fodmap" &&
                    (selectedItem.fodmap_matches?.length ?? 0) > 0 ? (
                      <div className="notice">
                        {FODMAP_LABELS.high_fodmap} : contient {" "}
                        {selectedItem.fodmap_matches?.join(", ")}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="modal-section">
                  <div className="section-title">Nutrition</div>
                  <div className="detail">
                    <span className="detail-label">kcal</span>
                    <span className="detail-value">{selectedItem.kcal_100g ?? "-"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Proteines</span>
                    <span className="detail-value">{selectedItem.protein_g_100g ?? "-"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Glucides</span>
                    <span className="detail-value">{selectedItem.carbs_g_100g ?? "-"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Lipides</span>
                    <span className="detail-value">{selectedItem.fat_g_100g ?? "-"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Sucres</span>
                    <span className="detail-value">{selectedItem.sugars_g_100g ?? "-"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Fibres</span>
                    <span className="detail-value">{selectedItem.fiber_g_100g ?? "-"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Graisses saturees</span>
                    <span className="detail-value">
                      {selectedItem.saturated_fat_g_100g ?? "-"}
                    </span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Sel</span>
                    <span className="detail-value">{selectedItem.salt_g_100g ?? "-"}</span>
                  </div>
                </div>

                <div className="modal-section">
                  <div className="section-title">Nutri-score</div>
                  <div className="detail">
                    <span className="detail-label">Grade</span>
                    <span className="detail-value">{selectedItem.nutriscore_grade ?? "-"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Score</span>
                    <span className="detail-value">
                      {selectedItem.nutriscore_score ?? "-"}
                    </span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Version</span>
                    <span className="detail-value">
                      {selectedItem.nutriscore_version ?? "-"}
                    </span>
                  </div>
                </div>

                <div className="modal-section">
                  <div className="section-title">Etiquettes</div>
                  <div className="detail">
                    <span className="detail-label">Categories</span>
                    <span className="detail-value">{formatList(selectedItem.categories_tags)}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Allergenes</span>
                    <span className="detail-value">{formatList(selectedItem.allergens_tags)}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Labels</span>
                    <span className="detail-value">{formatList(selectedItem.labels_tags)}</span>
                  </div>
                </div>

                <div className="modal-section full-width">
                  <div className="section-title">Ingredients</div>
                  <div className="detail-column">
                    <span className="detail-label">FR</span>
                    <span className="detail-value">
                      {selectedItem.ingredients_text_fr || "-"}
                    </span>
                  </div>
                  <div className="detail-column">
                    <span className="detail-label">Brut</span>
                    <span className="detail-value">{selectedItem.ingredients_text || "-"}</span>
                  </div>
                </div>

                <div className="modal-section full-width">
                  <div className="section-title">Donnees brutes</div>
                  <pre className="raw-json">{JSON.stringify(selectedItem, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="cluster" style={{ marginTop: 24 }}>
        <button
          className="button secondary"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || !hasSearched}
        >
          Precedent
        </button>
        <button
          className="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={items.length === 0 || !hasSearched}
        >
          Suivant
        </button>
        <span className="notice">Page {page}</span>
      </div>
    </section>
  );
}
