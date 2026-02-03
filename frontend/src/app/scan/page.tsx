"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

import { apiFetch } from "@/lib/api";

interface FoodItem {
  id: number;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  source: string;
  kcal_100g?: string | null;
  protein_g_100g?: string | null;
  carbs_g_100g?: string | null;
  fat_g_100g?: string | null;
  vegan: boolean;
  vegetarian: boolean;
  pescetarian: boolean;
  gluten_free: boolean;
  lactose_free: boolean;
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
  vegetarian: "Végétarien",
  pescetarian: "Pescétarien",
  gluten_free: "Sans gluten",
  lactose_free: "Sans lactose",
} as const;

const STATUS_LABELS: Record<ScanStatus, string> = {
  idle: "prêt",
  scanning: "scan en cours",
  loading: "recherche",
  found: "trouvé",
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
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    readerRef.current?.reset();
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
      setError("Caméra non prise en charge sur cet appareil.");
      setStatus("error");
      setIsScanning(false);
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setError("Élément vidéo non prêt.");
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
            : "Impossible de démarrer la caméra. Vérifiez les permissions et HTTPS."
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
    apiFetch<PagedResponse<FoodItem>>(
      `/api/foods/?barcode=${encodeURIComponent(barcode)}`
    )
      .then((data) => {
        if (data.results.length > 0) {
          setProduct(data.results[0]);
          setStatus("found");
        } else {
          setProduct(null);
          setStatus("not_found");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Recherche échouée");
        setStatus("error");
      });
  }, [barcode]);

  const startScan = () => {
    setProduct(null);
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
    setBarcode(clean);
    setStatus("loading");
    stopScanner();
  };

  return (
    <section>
      <div className="hero-card">
        <h1 className="section-title">Scanner un code-barres</h1>
        <p className="notice">
          Pointez la caméra vers le code-barres du produit. Si une correspondance
          existe, elle s'affiche immédiatement.
        </p>
      </div>

      <div className="scan-layout">
        <div className="hero-card">
          <div className="scan-video-wrap">
            <video className="scan-video" ref={videoRef} muted playsInline />
            <div className="scan-overlay" />
          </div>
          <div className="scan-actions">
            {!isScanning ? (
              <button className="button" onClick={startScan}>
                Démarrer le scan
              </button>
            ) : (
              <button className="button secondary" onClick={stopScanner}>
                Arrêter la caméra
              </button>
            )}
            {barcode ? (
              <button className="button secondary" onClick={startScan}>
                Scanner à nouveau
              </button>
            ) : null}
          </div>
          <div className="scan-status">
            <span className={`scan-pill scan-${status.replace("_", "-")}`}>
              {STATUS_LABELS[status]}
            </span>
            <span className="notice">
              La caméra nécessite HTTPS (ou localhost) et une autorisation.
            </span>
          </div>
          {error ? <p className="scan-error">{error}</p> : null}
        </div>

        <div className="hero-card">
          <div className="section-title">Recherche</div>
          <form className="form" onSubmit={onManualSubmit}>
            <label className="label">Code-barres (manuel)</label>
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
            <div>
              <div className="section-title">Produit</div>
              <div className="detail">
                <span className="detail-label">Nom</span>
                <span className="detail-value">{product.name}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Marque</span>
                <span className="detail-value">{product.brand || "—"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Code-barres</span>
                <span className="detail-value">{product.barcode || "—"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Source</span>
                <span className="detail-value">
                  {SOURCE_LABELS[product.source] ?? product.source}
                </span>
              </div>
              <div className="divider" />
              <div className="detail">
                <span className="detail-label">kcal / 100g</span>
                <span className="detail-value">{product.kcal_100g ?? "—"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Protéines</span>
                <span className="detail-value">{product.protein_g_100g ?? "—"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Glucides</span>
                <span className="detail-value">{product.carbs_g_100g ?? "—"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Lipides</span>
                <span className="detail-value">{product.fat_g_100g ?? "—"}</span>
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
                  {!product.vegan &&
                    !product.vegetarian &&
                    !product.pescetarian &&
                    !product.gluten_free &&
                    !product.lactose_free && <span className="notice">—</span>}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
