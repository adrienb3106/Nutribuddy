"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface FoodItem {
  id: number;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  source: string;
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

type ScanStatus = "idle" | "scanning" | "loading" | "found" | "not_found" | "error";

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

const STATUS_LABELS: Record<ScanStatus, string> = {
  idle: "pret",
  scanning: "scan en cours",
  loading: "recherche",
  found: "trouve",
  not_found: "introuvable",
  error: "erreur",
};

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastBarcodeRef = useRef<string>("");

  const [status, setStatus] = useState<ScanStatus>("idle");
  const [barcode, setBarcode] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [product, setProduct] = useState<FoodItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current = null;
    setIsScanning(false);
  }, []);

  const onDetected = useCallback(
    (value: string) => {
      const clean = value.trim();
      if (!clean || clean === lastBarcodeRef.current) {
        return;
      }
      lastBarcodeRef.current = clean;
      setSelectedItem(null);
      setBarcode(clean);
      setStatus("loading");
      stopScanner();
    },
    [stopScanner]
  );

  useEffect(() => {
    if (!isScanning) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera non prise en charge sur cet appareil.");
      setStatus("error");
      setIsScanning(false);
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setError("Element video non pret.");
      setStatus("error");
      setIsScanning(false);
      return;
    }

    const reader = new BrowserMultiFormatReader(undefined, 300);
    readerRef.current = reader;
    setStatus("scanning");
    setError(null);

    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        video,
        (result) => {
          if (cancelled || !result) {
            return;
          }
          onDetected(result.getText());
        }
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de demarrer la camera. Verifiez les permissions et HTTPS."
        );
        setStatus("error");
        stopScanner();
      });

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isScanning, onDetected, stopScanner]);

  useEffect(() => {
    if (!barcode) {
      return;
    }
    setError(null);
    apiFetch<PagedResponse<FoodItem>>(`/api/foods/?barcode=${encodeURIComponent(barcode)}`)
      .then((data) => {
        if (data.results.length > 0) {
          const found = data.results[0];
          setProduct(found);
          setSelectedItem(found);
          setStatus("found");

          const token = getToken();
          if (token) {
            apiFetch(
              "/api/scan-history/",
              {
                method: "POST",
                body: JSON.stringify({
                  food_item: found.id,
                  barcode: found.barcode || barcode,
                }),
              },
              token
            ).catch(() => undefined);
          }
        } else {
          setProduct(null);
          setSelectedItem(null);
          setStatus("not_found");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Recherche echouee");
        setStatus("error");
      });
  }, [barcode]);

  const startScan = () => {
    setProduct(null);
    setSelectedItem(null);
    setBarcode("");
    setError(null);
    lastBarcodeRef.current = "";
    setStatus("scanning");
    setIsScanning(true);
  };

  const onManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = manualBarcode.trim();
    if (!clean) {
      return;
    }
    lastBarcodeRef.current = clean;
    setSelectedItem(null);
    setBarcode(clean);
    setStatus("loading");
    stopScanner();
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
          <div className="eyebrow">Scan instantane</div>
          <h1 className="page-title">Scanner un code-barres</h1>
          <p className="page-subtitle">
            Pointez la camera vers le code-barres. La fiche produit s'ouvre des
            qu'une correspondance est trouvee.
          </p>
        </div>
      </header>

      <div className="scan-layout">
        <div className="panel">
          <div className="scan-video-wrap">
            <video className="scan-video" ref={videoRef} muted playsInline />
            <div className="scan-overlay" />
          </div>
          <div className="scan-actions">
            {!isScanning ? (
              <button className="button" onClick={startScan}>
                Demarrer le scan
              </button>
            ) : (
              <button className="button secondary" onClick={stopScanner}>
                Arreter la camera
              </button>
            )}
            {barcode ? (
              <button className="button secondary" onClick={startScan}>
                Scanner a nouveau
              </button>
            ) : null}
          </div>
          <div className="scan-status">
            <span className={`scan-pill scan-${status.replace("_", "-")}`}>
              {STATUS_LABELS[status]}
            </span>
            <span className="notice">
              La camera necessite HTTPS (ou localhost) et une autorisation.
            </span>
          </div>
          {error ? <p className="scan-error">{error}</p> : null}
        </div>

        <div className="panel">
          <div className="section-title">Recherche manuelle</div>
          <form className="form" onSubmit={onManualSubmit}>
            <label className="label">Code-barres</label>
            <input
              className="input"
              value={manualBarcode}
              onChange={(event) => setManualBarcode(event.target.value)}
              placeholder="ex. 3274080005003"
            />
            <button className="button" type="submit">
              Rechercher
            </button>
          </form>
          <div className="divider" />

          {status === "loading" ? <p className="notice">Recherche...</p> : null}
          {status === "not_found" ? (
            <p className="scan-empty">
              Aucune correspondance pour <strong>{barcode}</strong>.
            </p>
          ) : null}

          {product ? (
            <div className="stack">
              <div className="section-title">Produit</div>
              <div className="detail">
                <span className="detail-label">Nom</span>
                <span className="detail-value">{product.name}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Marque</span>
                <span className="detail-value">{product.brand || "-"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Code-barres</span>
                <span className="detail-value">{product.barcode || "-"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Source</span>
                <span className="detail-value">
                  {SOURCE_LABELS[product.source] ?? product.source}
                </span>
              </div>
              <div className="divider" />
              <div className="detail">
                <span className="detail-label">kcal / 100 g</span>
                <span className="detail-value">{product.kcal_100g ?? "-"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Proteines</span>
                <span className="detail-value">{product.protein_g_100g ?? "-"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Glucides</span>
                <span className="detail-value">{product.carbs_g_100g ?? "-"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Lipides</span>
                <span className="detail-value">{product.fat_g_100g ?? "-"}</span>
              </div>
              <div className="detail-column" style={{ marginTop: 12 }}>
                <span className="detail-label">Restrictions</span>
                <div className="food-tags">
                  {product.vegan && <span className="tag">{RESTRICTION_LABELS.vegan}</span>}
                  {product.vegetarian && (
                    <span className="tag">{RESTRICTION_LABELS.vegetarian}</span>
                  )}
                  {product.pescetarian && (
                    <span className="tag">{RESTRICTION_LABELS.pescetarian}</span>
                  )}
                  {product.gluten_free && (
                    <span className="tag">{RESTRICTION_LABELS.gluten_free}</span>
                  )}
                  {product.lactose_free && (
                    <span className="tag">{RESTRICTION_LABELS.lactose_free}</span>
                  )}
                  {product.irritability_level && (
                    <span className={`tag ${FODMAP_TAG_CLASS[product.irritability_level]}`}>
                      {FODMAP_LABELS[product.irritability_level]}
                    </span>
                  )}
                  {!product.vegan &&
                    !product.vegetarian &&
                    !product.pescetarian &&
                    !product.gluten_free &&
                    !product.lactose_free &&
                    !product.irritability_level && <span className="notice">-</span>}
                </div>
              </div>
            </div>
          ) : null}
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
    </section>
  );
}
