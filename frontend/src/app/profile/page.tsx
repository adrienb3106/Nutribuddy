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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = getToken();

  useEffect(() => {
    if (!token) {
      setError("Please log in first.");
      return;
    }

    apiFetch<Profile>("/api/auth/profile/", {}, token)
      .then((data) => {
        setProfile(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [token]);

  const onToggle = (field: keyof Profile) => {
    setProfile((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const onSave = async () => {
    if (!token) {
      setError("Please log in first.");
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
      setStatus("Profile updated.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
      setStatus(null);
    }
  };

  return (
    <section className="grid">
      <div className="card">
        <h1 className="section-title">Dietary profile</h1>
        <p className="notice">
          Tell Nutribuddy what you avoid. We will use this later to personalize
          food searches.
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
                {" "}{field.replace("_", " ")}
              </label>
            )
          )}
          <label className="label">Irritability level (0-3)</label>
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
            Save profile
          </button>
          {status ? <p className="notice">{status}</p> : null}
          {error ? <p className="notice">{error}</p> : null}
        </div>
      </div>
      <div className="card">
        <h2 className="section-title">What happens next?</h2>
        <p className="notice">
          This profile will soon auto-apply to the foods list, so you can browse
          without re-checking filters.
        </p>
        <div className="divider" />
        <p className="notice">Tip: update this profile whenever your needs change.</p>
      </div>
    </section>
  );
}