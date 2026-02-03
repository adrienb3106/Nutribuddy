"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Profile {
  vegan: boolean;
  vegetarian: boolean;
  pescetarian: boolean;
  gluten_free: boolean;
  lactose_free: boolean;
  irritability_level: number;
}

const defaultProfile: Profile = {
  vegan: false,
  vegetarian: false,
  pescetarian: false,
  gluten_free: false,
  lactose_free: false,
  irritability_level: 0,
};

const RESTRICTION_LABELS: Record<keyof Omit<Profile, "irritability_level">, string> = {
  vegan: "Vegan",
  vegetarian: "Végétarien",
  pescetarian: "Pescétarien",
  gluten_free: "Sans gluten",
  lactose_free: "Sans lactose",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = getToken();

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
      .catch((err) => setError(err instanceof Error ? err.message : "Échec du chargement"));
  }, [token]);

  const onToggle = (field: keyof Profile) => {
    setProfile((prev) => ({ ...prev, [field]: !prev[field] }));
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
      setStatus("Profil mis à jour.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la mise à jour");
      setStatus(null);
    }
  };

  return (
    <section className="grid">
      <div className="card">
        <h1 className="section-title">Profil alimentaire</h1>
        <p className="notice">
          Indiquez à Nutribuddy ce que vous évitez. Nous utiliserons ces
          informations pour personnaliser les recherches d'aliments.
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
          <label className="label">Niveau d'irritabilité (0-3)</label>
          <input
            className="input"
            type="number"
            min={0}
            max={3}
            value={profile.irritability_level}
            onChange={(event) =>
              setProfile((prev) => ({
                ...prev,
                irritability_level: Number(event.target.value),
              }))
            }
          />
          <button className="button" onClick={onSave}>
            Enregistrer le profil
          </button>
          {status ? <p className="notice">{status}</p> : null}
          {error ? <p className="notice">{error}</p> : null}
        </div>
      </div>
      <div className="card">
        <h2 className="section-title">Et ensuite ?</h2>
        <p className="notice">
          Ce profil sera bientôt appliqué automatiquement à la liste des
          aliments, pour naviguer sans reconfigurer les filtres.
        </p>
        <div className="divider" />
        <p className="notice">Astuce : mettez ce profil à jour dès que vos besoins changent.</p>
      </div>
    </section>
  );
}
