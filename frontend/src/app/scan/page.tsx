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
  manual: "Manual",
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
      setError("Camera not supported on this device.");
      setStatus("error");
      setIsScanning(false);
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setError("Video element not ready.");
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
            : "Unable to start camera. Check permissions and HTTPS."
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
        setError(err instanceof Error ? err.message : "Lookup failed");
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
        <h1 className="section-title">Scan a barcode</h1>
        <p className="notice">
          Point your camera at the product barcode. If a match exists, we will
          show it instantly.
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
                Start scan
              </button>
            ) : (
              <button className="button secondary" onClick={stopScanner}>
                Stop camera
              </button>
            )}
            {barcode ? (
              <button className="button secondary" onClick={startScan}>
                Scan again
              </button>
            ) : null}
          </div>
          <div className="scan-status">
            <span className={`scan-pill scan-${status.replace("_", "-")}`}>
              {status.replace("_", " ")}
            </span>
            <span className="notice">
              Camera requires HTTPS (or localhost) and permission.
            </span>
          </div>
          {error ? <p className="scan-error">{error}</p> : null}
        </div>

        <div className="hero-card">
          <div className="section-title">Lookup</div>
          <form className="form" onSubmit={onManualSubmit}>
            <label className="label">Barcode (manual)</label>
            <input
              className="input"
              value={manualBarcode}
              onChange={(event) => setManualBarcode(event.target.value)}
              placeholder="e.g. 3274080005003"
            />
            <button className="button" type="submit">
              Search
            </button>
          </form>
          <div className="divider" />

          {status === "loading" ? <p className="notice">Searching...</p> : null}
          {status === "not_found" ? (
            <p className="scan-empty">
              No match found for <strong>{barcode}</strong>.
            </p>
          ) : null}

          {product ? (
            <div>
              <div className="section-title">Product</div>
              <div className="detail">
                <span className="detail-label">Name</span>
                <span className="detail-value">{product.name}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Brand</span>
                <span className="detail-value">{product.brand || "—"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Barcode</span>
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
                <span className="detail-label">Protein</span>
                <span className="detail-value">{product.protein_g_100g ?? "—"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Carbs</span>
                <span className="detail-value">{product.carbs_g_100g ?? "—"}</span>
              </div>
              <div className="detail">
                <span className="detail-label">Fat</span>
                <span className="detail-value">{product.fat_g_100g ?? "—"}</span>
              </div>
              <div className="detail-column" style={{ marginTop: 12 }}>
                <span className="detail-label">Restrictions</span>
                <div className="food-tags">
                  {product.vegan && <span className="tag">vegan</span>}
                  {product.vegetarian && <span className="tag">vegetarian</span>}
                  {product.pescetarian && <span className="tag">pescetarian</span>}
                  {product.gluten_free && <span className="tag">gluten-free</span>}
                  {product.lactose_free && <span className="tag">lactose-free</span>}
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
