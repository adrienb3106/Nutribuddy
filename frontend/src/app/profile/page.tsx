"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { ALLERGEN_OPTIONS, type AllergenKey } from "@/lib/allergens";
import { getToken } from "@/lib/auth";

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

interface ScanHistoryItem {
  id: number;
  scanned_at: string;
  barcode?: string | null;
  food: {
    id: number;
    name: string;
    brand?: string | null;
    barcode?: string | null;
  };
}

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

type ToggleableField = Exclude<keyof Profile, "irritability_level" | "allergens">;

const defaultProfile: Profile = {
  vegan: false,
  vegetarian: false,
  pescetarian: false,
  gluten_free: false,
  lactose_free: false,
  irritability_level: null,
  allergens: [],
  filter_allergens: false,
};

const RESTRICTION_LABELS: Record<keyof Omit<Profile, "irritability_level">, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarien",
  pescetarian: "Pescetarien",
  gluten_free: "Sans gluten",
  lactose_free: "Sans lactose",
};

const FODMAP_LABELS: Record<NonNullable<FoodItem["irritability_level"]>, string> = {
  low_fodmap: "Pauvre en FODMAP",
  high_fodmap: "Riche en FODMAP",
};

const FODMAP_TAG_CLASS: Record<NonNullable<FoodItem["irritability_level"]>, string> = {
  low_fodmap: "tag-fodmap-low",
  high_fodmap: "tag-fodmap-high",
};

const HISTORY_PREVIEW_COUNT = 10;

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const token = getToken();
  const formatError = (err: unknown, fallback: string) => {
    const message = err instanceof Error ? err.message : fallback;
    if (message.includes("<!DOCTYPE") || message.includes("<html")) {
      return fallback;
    }
    return message;
  };

  useEffect(() => {
    if (!token) {
      setError("Veuillez vous connecter d'abord.");
      return;
    }

    apiFetch<Profile>("/api/auth/profile/", {}, token)
      .then((data) => {
        setProfile(data);
        setError(null);
      })
      .catch((err) => setError(formatError(err, "Echec du chargement")));
  }, [token]);

  useEffect(() => {
    if (!token) {
      setHistory([]);
      setHistoryError(null);
      return;
    }
    apiFetch<PagedResponse<ScanHistoryItem>>("/api/scan-history/", {}, token)
      .then((data) => {
        setHistory(data.results);
        setHistoryError(null);
      })
      .catch((err) => setHistoryError(formatError(err, "Echec du chargement")));
  }, [token]);

  const onToggle = (field: ToggleableField) => {
    setProfile((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const onToggleAllergen = (key: AllergenKey) => {
    setProfile((prev) => {
      const next = new Set(prev.allergens);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return { ...prev, allergens: Array.from(next) };
    });
  };

  const onSave = async () => {
    if (!token) {
      setError("Veuillez vous connecter d'abord.");
      return;
    }

    try {
      const data = await apiFetch<Profile>(
        "/api/auth/profile/",
        {
          method: "PATCH",
          body: JSON.stringify(profile),
        },
        token
      );
      setProfile(data);
      setStatus("Profil mis a jour.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Echec de la mise a jour");
      setStatus(null);
    }
  };

  const formatDateTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString("fr-FR");
  };

  const formatList = (value?: string[]) => {
    if (!value || value.length === 0) {
      return "-";
    }
    return value.join(", ");
  };

  const openFood = async (foodId?: number) => {
    if (!foodId) {
      return;
    }
    setSelectedLoading(true);
    setSelectedError(null);
    try {
      const data = await apiFetch<FoodItem>(`/api/foods/${foodId}/`);
      setSelectedItem(data);
    } catch (err) {
      setSelectedError(formatError(err, "Impossible de charger la fiche produit."));
    } finally {
      setSelectedLoading(false);
    }
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

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">Profil</div>
          <h1 className="page-title">Votre profil alimentaire</h1>
          <p className="page-subtitle">
            Definissez vos contraintes pour filtrer automatiquement les aliments.
          </p>
        </div>
      </header>

      <div className="layout-two">
        <div className="panel">
          <h2 className="section-title">Preferences</h2>
          <p className="notice">
            Ces filtres seront appliques sur la liste des aliments et le scan.
          </p>
          <div className="divider" />
          <div className="form">
            {(["vegan", "vegetarian", "pescetarian", "gluten_free", "lactose_free"] as const).map(
              (field) => (
                <label key={field} className="label">
                  <input
                    type="checkbox"
                    checked={profile[field]}
                    onChange={() => onToggle(field)}
                  />
                  {" "}{RESTRICTION_LABELS[field]}
                </label>
              )
            )}
            <div className="divider" />
            <div className="section-title">Allergenes</div>
            <p className="notice">
              Selectionnez les allergenes a eviter. Nous pouvons filtrer les produits
              ou afficher un avertissement.
            </p>
            <div className="grid">
              {ALLERGEN_OPTIONS.map((option) => (
                <label key={option.key} className="label">
                  <input
                    type="checkbox"
                    checked={profile.allergens.includes(option.key)}
                    onChange={() => onToggleAllergen(option.key)}
                  />
                  {" "}{option.label}
                </label>
              ))}
            </div>
            <label className="label">
              <input
                type="checkbox"
                checked={profile.filter_allergens}
                onChange={() => onToggle("filter_allergens")}
              />
              {" "}Filtrer les produits contenant ces allergenes
            </label>
            <label className="label">FODMAP (irritabilite du colon)</label>
            <select
              className="input"
              value={profile.irritability_level ?? ""}
              onChange={(event) =>
                setProfile((prev) => ({
                  ...prev,
                  irritability_level: event.target.value
                    ? (event.target.value as Profile["irritability_level"])
                    : null,
                }))
              }
            >
              <option value="">Inconnu</option>
              <option value="low_fodmap">Pauvre en FODMAP</option>
              <option value="high_fodmap">Riche en FODMAP</option>
            </select>
            <button className="button" onClick={onSave}>
              Enregistrer le profil
            </button>
            {status ? <p className="notice">{status}</p> : null}
            {error ? <p className="notice">{error}</p> : null}
          </div>
        </div>

        <div className="panel">
          <h2 className="section-title">Historique des scans</h2>
          <p className="notice">Retrouvez les derniers produits scannes.</p>
          <div className="divider" />
          {historyError ? <p className="notice">{historyError}</p> : null}
          {selectedLoading ? <p className="notice">Chargement de la fiche...</p> : null}
          {selectedError ? <p className="notice">{selectedError}</p> : null}
          {history.length === 0 && !historyError ? (
            <p className="notice">Aucun scan enregistre pour le moment.</p>
          ) : (
            <>
              {showAllHistory ? (
                <div className="stack">
                  {history.map((item) => (
                    <div key={item.id} className="detail">
                      <span className="detail-label">
                        {formatDateTime(item.scanned_at)}
                      </span>
                      <button
                        className="link-button"
                        type="button"
                        onClick={() => openFood(item.food?.id)}
                      >
                        {item.food?.name ?? "Produit"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid">
                  {history.slice(0, HISTORY_PREVIEW_COUNT).map((item) => (
                    <div
                      key={item.id}
                      className="card clickable"
                      role="button"
                      tabIndex={0}
                      onClick={() => openFood(item.food?.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openFood(item.food?.id);
                        }
                      }}
                    >
                      <strong>{item.food?.name ?? "Produit"}</strong>
                      <p className="notice">{item.food?.brand ?? "-"}</p>
                      <p className="notice">
                        {item.food?.barcode ?? item.barcode ?? "-"}
                      </p>
                      <p className="notice">Scanne le {formatDateTime(item.scanned_at)}</p>
                    </div>
                  ))}
                </div>
              )}
              <button
                className="button secondary"
                type="button"
                onClick={() => setShowAllHistory((prev) => !prev)}
              >
                {showAllHistory ? "Afficher moins" : "Voir tous les scans"}
              </button>
            </>
          )}
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
                    <span className="detail-value">{selectedItem.source ?? "-"}</span>
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
                        {FODMAP_LABELS.high_fodmap} car {" "}
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
                    <span className="detail-value">{selectedItem.nutriscore_score ?? "-"}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Version</span>
                    <span className="detail-value">{selectedItem.nutriscore_version ?? "-"}</span>
                  </div>
                </div>

                <div className="modal-section">
                  <div className="section-title">Etiquettes</div>
                  <div className="detail">
                    <span className="detail-label">Categories</span>
                    <span className="detail-value">
                      {formatList(selectedItem.categories_tags)}
                    </span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Allergenes</span>
                    <span className="detail-value">
                      {formatList(selectedItem.allergens_tags)}
                    </span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Labels</span>
                    <span className="detail-value">
                      {formatList(selectedItem.labels_tags)}
                    </span>
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
                    <span className="detail-value">
                      {selectedItem.ingredients_text || "-"}
                    </span>
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
    </section>
  );
}
