"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
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
  irritability_level: number;
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
  irritability_level: number;
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
  irritability_max: "",
};

const SOURCE_LABELS: Record<string, string> = {
  ciqual: "Ciqual",
  openfoodfacts: "Open Food Facts",
  manual: "Manuel",
};

const RESTRICTION_LABELS = {
  vegan: "Vegan",
  vegetarian: "Végétarien",
  pescetarian: "Pescétarien",
  gluten_free: "Sans gluten",
  lactose_free: "Sans lactose",
} as const;

export default function FoodsPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState("name");
  const [items, setItems] = useState<FoodItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyProfile, setApplyProfile] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);

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
    if (filters.irritability_max) {
      params.set("irritability_max", filters.irritability_max);
    }
    ("vegan vegetarian pescetarian gluten_free lactose_free" as const)
      .split(" ")
      .forEach((key) => {
        if (filters[key]) params.set(key, "true");
      });
    return params.toString();
  }, [filters, page, ordering]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    apiFetch<PagedResponse<FoodItem>>(`/api/foods/?${queryString}`)
      .then((data) => {
        setItems(data.results);
        setCount(data.count);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"))
      .finally(() => setLoading(false));
  }, [queryString]);

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
    if (!applyProfile) {
      return;
    }
    const token = getToken();
    if (!token) {
      setError("Connectez-vous pour appliquer votre profil alimentaire.");
      setApplyProfile(false);
      return;
    }

    apiFetch<Profile>("/api/auth/profile/", {}, token)
      .then((profile) => {
        setFilters((prev) => ({
          ...prev,
          vegan: profile.vegan,
          vegetarian: profile.vegetarian,
          pescetarian: profile.pescetarian,
          gluten_free: profile.gluten_free,
          lactose_free: profile.lactose_free,
          irritability_max: profile.irritability_level
            ? String(profile.irritability_level)
            : "",
        }));
        setPage(1);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger le profil");
        setApplyProfile(false);
      });
  }, [applyProfile]);

  const onToggle = (key: keyof typeof DEFAULT_FILTERS) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    setPage(1);
  };

  const onChange = (key: keyof typeof DEFAULT_FILTERS, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setApplyProfile(false);
    setPage(1);
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
      return "—";
    }
    return value.join(", ");
  };

  return (
    <section>
      <div className="hero-card">
        <h1 className="section-title">Explorateur d'aliments</h1>
        <p className="notice">
          Commencez par un mot-clé, puis affinez les filtres nutritionnels et de
          restrictions.
        </p>
        <div className="divider" />
        <div className="form">
          <label className="label">Recherche</label>
          <input
            className="input"
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Essayez haricot, tomate, riz..."
          />
          <label className="label">
            Marque
            {brandLoading ? <span className="notice">Chargement...</span> : null}
          </label>
          <input
            className="input"
            value={filters.brand}
            onChange={(event) => onChange("brand", event.target.value)}
            placeholder="Commencez à taper une marque..."
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
            <option value="name">Nom A → Z</option>
            <option value="-name">Nom Z → A</option>
            <option value="-kcal_100g">Kcal ↓</option>
            <option value="kcal_100g">Kcal ↑</option>
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
              <label className="label">Protéines min / 100 g</label>
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
              <label className="label">Irritabilité max (0-3)</label>
              <input
                className="input"
                type="number"
                min={0}
                max={3}
                value={filters.irritability_max}
                onChange={(event) => onChange("irritability_max", event.target.value)}
                disabled={applyProfile}
              />
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
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="button" type="button" onClick={resetFilters}>
              Réinitialiser les filtres
            </button>
            <span className="notice">Les résultats se mettent à jour automatiquement.</span>
          </div>
        </div>
      </div>

      <div className="foods-section">
        <div className="foods-toolbar">
          <div>
            <div className="section-title">Résultats</div>
            <p className="notice">{count} éléments</p>
          </div>
          <div className="notice">Page {page}</div>
        </div>
      {loading ? <p className="notice">Chargement...</p> : null}
      {error ? <p className="notice">{error}</p> : null}

        <div className="foods-list">
          {items.map((item) => {
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
                    <span className={`source-pill source-${item.source}`}>
                      {sourceLabel}
                    </span>
                  </div>
                  {item.brand ? (
                    <div className="food-brand">{item.brand}</div>
                  ) : null}
                  <div className="food-tags">
                    {item.vegan && <span className="tag">{RESTRICTION_LABELS.vegan}</span>}
                    {item.vegetarian && (
                      <span className="tag">{RESTRICTION_LABELS.vegetarian}</span>
                    )}
                    {item.pescetarian && (
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
                {macros.length > 0 ? (
                  <div className="macro-stack">
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
              </div>
            );
          })}
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
                  <div className="section-title">Aperçu</div>
                  <div className="detail">
                    <span className="detail-label">Source</span>
                    <span className="detail-value">
                      {SOURCE_LABELS[selectedItem.source] ?? selectedItem.source}
                    </span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Code-barres</span>
                    <span className="detail-value">{selectedItem.barcode ?? "—"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Quantité</span>
                    <span className="detail-value">{selectedItem.quantity ?? "—"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Nutrition pour</span>
                    <span className="detail-value">
                      {selectedItem.nutrition_per ?? "—"}
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
                      {!selectedItem.vegan &&
                        !selectedItem.vegetarian &&
                        !selectedItem.pescetarian &&
                        !selectedItem.gluten_free &&
                        !selectedItem.lactose_free && (
                          <span className="notice">—</span>
                        )}
                    </div>
                  </div>
                </div>

                <div className="modal-section">
                  <div className="section-title">Nutrition</div>
                  <div className="detail">
                    <span className="detail-label">kcal</span>
                    <span className="detail-value">{selectedItem.kcal_100g ?? "—"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Protéines</span>
                    <span className="detail-value">{selectedItem.protein_g_100g ?? "—"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Glucides</span>
                    <span className="detail-value">{selectedItem.carbs_g_100g ?? "—"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Lipides</span>
                    <span className="detail-value">{selectedItem.fat_g_100g ?? "—"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Sucres</span>
                    <span className="detail-value">{selectedItem.sugars_g_100g ?? "—"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Fibres</span>
                    <span className="detail-value">{selectedItem.fiber_g_100g ?? "—"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Graisses saturées</span>
                    <span className="detail-value">
                      {selectedItem.saturated_fat_g_100g ?? "—"}
                    </span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Sel</span>
                    <span className="detail-value">{selectedItem.salt_g_100g ?? "—"}</span>
                  </div>
                </div>

                <div className="modal-section">
                  <div className="section-title">Nutri-score</div>
                  <div className="detail">
                    <span className="detail-label">Grade</span>
                    <span className="detail-value">{selectedItem.nutriscore_grade ?? "—"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Score</span>
                    <span className="detail-value">
                      {selectedItem.nutriscore_score ?? "—"}
                    </span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Version</span>
                    <span className="detail-value">
                      {selectedItem.nutriscore_version ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="modal-section">
                  <div className="section-title">Étiquettes</div>
                  <div className="detail">
                    <span className="detail-label">Catégories</span>
                    <span className="detail-value">{formatList(selectedItem.categories_tags)}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Allergènes</span>
                    <span className="detail-value">{formatList(selectedItem.allergens_tags)}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Labels</span>
                    <span className="detail-value">{formatList(selectedItem.labels_tags)}</span>
                  </div>
                </div>

                <div className="modal-section full-width">
                  <div className="section-title">Ingrédients</div>
                  <div className="detail-column">
                    <span className="detail-label">FR</span>
                    <span className="detail-value">
                      {selectedItem.ingredients_text_fr || "—"}
                    </span>
                  </div>
                  <div className="detail-column">
                    <span className="detail-label">Brut</span>
                    <span className="detail-value">{selectedItem.ingredients_text || "—"}</span>
                  </div>
                </div>

                <div className="modal-section full-width">
                  <div className="section-title">Données brutes</div>
                  <pre className="raw-json">
                    {JSON.stringify(selectedItem, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
        <button
          className="button secondary"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Précédent
        </button>
        <button
          className="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={items.length === 0}
        >
          Suivant
        </button>
        <span className="notice">Page {page}</span>
      </div>
    </section>
  );
}
