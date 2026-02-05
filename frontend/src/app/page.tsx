"use client";

import { useEffect, useState } from "react";

import { getToken } from "@/lib/auth";

export default function HomePage() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(!!getToken());
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-card hero-main">
          <span className="badge">Nutrition Intelligence 2026</span>
          <h1 className="hero-title">
            Une base alimentaire qui comprend vos contraintes, en temps reel.
          </h1>
          <p className="hero-subtitle">
            Nutribuddy synchronise CIQUAL et Open Food Facts pour livrer une
            recherche instantanee, des filtres fiables et un profil nutritionnel
            coherent sur tous vos appareils.
          </p>
          <div className="hero-actions">
            <a className="button" href="/foods">
              Explorer les aliments
            </a>
            <a className="button secondary" href={isAuthed ? "/profile" : "/register"}>
              {isAuthed ? "Mon profil" : "Creer un profil"}
            </a>
          </div>
          <div className="hero-metrics stagger">
            <div className="card metric-card">
              <div className="metric-label">Filtres rapides</div>
              <div className="metric-value">Macros, FODMAP, allergenes</div>
            </div>
            <div className="card metric-card">
              <div className="metric-label">Sources fiables</div>
              <div className="metric-value">CIQUAL + OFF, nettoye</div>
            </div>
            <div className="card metric-card">
              <div className="metric-label">Profil applique</div>
              <div className="metric-value">Un seul clic pour filtrer</div>
            </div>
          </div>
        </div>

        <div className="hero-card hero-side">
          <div className="eyebrow">Apercu produit</div>
          <div className="preview-card">
            <div className="preview-header">
              <span className="pill">LOW FODMAP</span>
              <span className="pill">VEGAN</span>
            </div>
            <h3>Riz basmati, cuit</h3>
            <p className="notice">Ciqual - 100 g - 120 kcal</p>
            <div className="preview-macros">
              <span>Proteines 2.6 g</span>
              <span>Glucides 26.8 g</span>
              <span>Lipides 0.3 g</span>
            </div>
          </div>
          <div className="preview-card">
            <div className="preview-header">
              <span className="pill">SCAN</span>
              <span className="pill">HISTORIQUE</span>
            </div>
            <h3>Scan instantane</h3>
            <p className="notice">
              Ouvrez la fiche produit des qu'un code-barres est reconnu.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">Pourquoi Nutribuddy</div>
            <h2 className="section-title">Un produit fini, pense pour les usages reels</h2>
          </div>
          <p className="notice">
            Des fiches propres, un profil clair, et des decisions nutritionnelles
            rapides.
          </p>
        </div>
        <div className="bento-grid stagger">
          <div className="card feature-card">
            <h3>Recherche reactive</h3>
            <p className="notice">
              Suggestions de marque, filtres instantanes, tri par macros.
            </p>
          </div>
          <div className="card feature-card">
            <h3>Profils alimentaires</h3>
            <p className="notice">
              Vegan, sans lactose, FODMAP, allergenes : tout est memorise.
            </p>
          </div>
          <div className="card feature-card">
            <h3>Scan mobile</h3>
            <p className="notice">
              Trouvez un produit en 2 secondes et gardez un historique utile.
            </p>
          </div>
          <div className="card feature-card">
            <h3>Qualite des donnees</h3>
            <p className="notice">
              CIQUAL pour la reference, OFF pour le packaging.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
