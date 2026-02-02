"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
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
      await apiFetch("/api/auth/register/", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setStatus("Account created. You can now log in.");
      setForm({ username: "", email: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <section className="grid">
      <div className="card">
        <h1 className="section-title">Create your account</h1>
        <p className="notice">Save your restrictions and keep them synced.</p>
        <div className="divider" />
        <form className="form" onSubmit={onSubmit}>
          <label className="label">Username</label>
          <input
            className="input"
            value={form.username}
            onChange={(event) => onChange("username", event.target.value)}
            required
          />
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(event) => onChange("email", event.target.value)}
          />
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(event) => onChange("password", event.target.value)}
            required
            minLength={8}
          />
          <button className="button" type="submit">
            Register
          </button>
          {status ? <p className="notice">{status}</p> : null}
          {error ? <p className="notice">{error}</p> : null}
        </form>
      </div>
      <div className="card">
        <h2 className="section-title">Already have an account?</h2>
        <p className="notice">Log in to update your dietary profile.</p>
        <a className="button secondary" href="/login">
          Go to login
        </a>
      </div>
    </section>
  );
}