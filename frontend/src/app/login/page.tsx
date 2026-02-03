"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { setRefreshToken, setToken } from "@/lib/auth";

interface TokenResponse {
  access: string;
  refresh: string;
}

export default function LoginPage() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setError(null);

    try {
      const data = await apiFetch<TokenResponse>("/api/auth/token/", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setToken(data.access);
      setRefreshToken(data.refresh);
      setStatus("Connecté. Les jetons sont stockés dans votre navigateur.");
      setForm({ username: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la connexion");
    }
  };

  return (
    <section className="grid">
      <div className="card">
        <h1 className="section-title">Bon retour</h1>
        <p className="notice">Utilisez vos identifiants pour accéder à votre profil.</p>
        <div className="divider" />
        <form className="form" onSubmit={onSubmit}>
          <label className="label">Nom d'utilisateur</label>
          <input
            className="input"
            value={form.username}
            onChange={(event) => onChange("username", event.target.value)}
            required
          />
          <label className="label">Mot de passe</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(event) => onChange("password", event.target.value)}
            required
          />
          <button className="button" type="submit">
            Connexion
          </button>
          {status ? <p className="notice">{status}</p> : null}
          {error ? <p className="notice">{error}</p> : null}
        </form>
      </div>
      <div className="card">
        <h2 className="section-title">Pas encore de compte ?</h2>
        <p className="notice">Créez votre profil en moins d'une minute.</p>
        <a className="button secondary" href="/register">
          Inscription
        </a>
      </div>
    </section>
  );
}
