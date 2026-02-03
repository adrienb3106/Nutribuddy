"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface FoodItem {
  id: number;
  name: string;
  source: string;
  kcal_100g: string;
  protein_g_100g: string;
  carbs_g_100g: string;
  fat_g_100g: string;
  vegan: boolean;
  vegetarian: boolean;
  pescetarian: boolean;
  gluten_free: boolean;
  lactose_free: boolean;
  irritability_level: number;
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

export default function FoodsPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyProfile, setApplyProfile] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (filters.search) params.set("search", filters.search);
    if (filters.source) params.set("source", filters.source);
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
  }, [filters, page]);

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
    if (!applyProfile) {
      return;
    }
    const token = getToken();
    if (!token) {
      setError("Log in to apply your dietary profile.");
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
        setError(err instanceof Error ? err.message : "Failed to load profile");
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

  return (
    <section>
      <div className="hero-card">
        <h1 className="section-title">Foods explorer</h1>
        <p className="notice">
          Start with a keyword, then tighten the nutrition and restriction
          filters.
        </p>
        <div className="divider" />
        <div className="form">
          <label className="label">Search</label>
          <input
            className="input"
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Try haricot, tomate, riz..."
          />
          <label className="label">Source</label>
          <select
            className="input"
            value={filters.source}
            onChange={(event) => onChange("source", event.target.value)}
          >
            <option value="">All</option>
            <option value="ciqual">Ciqual</option>
            <option value="openfoodfacts">Open Food Facts</option>
            <option value="manual">Manual</option>
          </select>
          <div className="grid">
            <div>
              <label className="label">Max kcal / 100 g</label>
              <input
                className="input"
                type="number"
                value={filters.kcal_max}
                onChange={(event) => onChange("kcal_max", event.target.value)}
              />
            </div>
            <div>
              <label className="label">Min protein / 100 g</label>
              <input
                className="input"
                type="number"
                value={filters.protein_min}
                onChange={(event) => onChange("protein_min", event.target.value)}
              />
            </div>
            <div>
              <label className="label">Max fat / 100 g</label>
              <input
                className="input"
                type="number"
                value={filters.fat_max}
                onChange={(event) => onChange("fat_max", event.target.value)}
              />
            </div>
            <div>
              <label className="label">Max irritability (0-3)</label>
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
                  {" "}{key.replace("_", " ")}
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
            {" "}Correspond au profil
          </label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="button" type="button" onClick={resetFilters}>
              Reset filters
            </button>
            <span className="notice">Results update automatically.</span>
          </div>
        </div>
      </div>

      <div className="section-title">Results ({count})</div>
      {loading ? <p className="notice">Loading...</p> : null}
      {error ? <p className="notice">{error}</p> : null}

      <div className="grid">
        {items.map((item) => (
          <div className="card" key={item.id}>
            <strong>{item.name}</strong>
            <p className="notice">{item.source}</p>
            <div>
              <span className="badge">kcal {item.kcal_100g}</span>
              <span className="badge">P {item.protein_g_100g}</span>
              <span className="badge">C {item.carbs_g_100g}</span>
              <span className="badge">F {item.fat_g_100g}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              {item.vegan && <span className="badge">vegan</span>}
              {item.vegetarian && <span className="badge">vegetarian</span>}
              {item.pescetarian && <span className="badge">pescetarian</span>}
              {item.gluten_free && <span className="badge">gluten-free</span>}
              {item.lactose_free && <span className="badge">lactose-free</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
        <button
          className="button secondary"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <button
          className="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={items.length === 0}
        >
          Next
        </button>
        <span className="notice">Page {page}</span>
      </div>
    </section>
  );
}
