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
      setStatus("Logged in. Tokens stored in your browser.");
      setForm({ username: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <section className="grid">
      <div className="card">
        <h1 className="section-title">Welcome back</h1>
        <p className="notice">Use your credentials to access your profile.</p>
        <div className="divider" />
        <form className="form" onSubmit={onSubmit}>
          <label className="label">Username</label>
          <input
            className="input"
            value={form.username}
            onChange={(event) => onChange("username", event.target.value)}
            required
          />
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(event) => onChange("password", event.target.value)}
            required
          />
          <button className="button" type="submit">
            Login
          </button>
          {status ? <p className="notice">{status}</p> : null}
          {error ? <p className="notice">{error}</p> : null}
        </form>
      </div>
      <div className="card">
        <h2 className="section-title">No account yet?</h2>
        <p className="notice">Create your profile in less than a minute.</p>
        <a className="button secondary" href="/register">
          Register
        </a>
      </div>
    </section>
  );
}