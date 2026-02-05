"use client";

import { useEffect, useState } from "react";

import { getToken } from "@/lib/auth";

export default function HomePage() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(!!getToken());
  }, []);

  return (
    <section className="hero">
      <div className="hero-card">
        <div className="badge">Compatible CIQUAL</div>
        <h1 className="hero-title">Des données nutritionnelles, personnalisées pour vous.</h1>
        <p className="hero-subtitle">
          Nutribuddy relie une base alimentaire puissante à vos préférences
          alimentaires. Filtrez vite, restez cohérent, et gardez votre profil
          synchronisé sur tous vos appareils.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <a className="button" href="/foods">
            Explorer les aliments
          </a>
          <a className="button secondary" href="/profile">
            Définir mes préférences
          </a>
        </div>
      </div>
      <div className="hero-card">
        <h2 className="section-title">Pourquoi c'est utile</h2>
        <div className="grid">
          <div className="card">
            <strong>Filtres intelligents</strong>
            <p className="notice">Calories, macros et restrictions en quelques secondes.</p>
          </div>
          <div className="card">
            <strong>Profil pris en compte</strong>
            <p className="notice">Enregistrez vos règles alimentaires une seule fois.</p>
          </div>
          <div className="card">
            <strong>Recherche rapide</strong>
            <p className="notice">Basé sur les données CIQUAL avec une API claire.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
