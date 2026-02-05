"use client";

import { useEffect, useState } from "react";
import { Fraunces, Sora } from "next/font/google";
import "./globals.css";

import { clearTokens, getToken } from "@/lib/auth";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setIsAuthed(!!getToken());
  }, []);

  const onLogout = () => {
    clearTokens();
    setIsAuthed(false);
  };

  return (
    <html lang="fr">
      <body className={`${sora.variable} ${fraunces.variable} app-shell`}>
        <nav className="nav">
          <div className="nav-inner">
            <div className="nav-left">
              <a className="brand" href="/">
                <span className="brand-mark">NB</span>
                <span>Nutribuddy</span>
              </a>
            </div>
            <div className="nav-links">
              <a href="/">Accueil</a>
              <a href="/foods">Aliments</a>
              <a href="/scan">Scanner</a>
              <a href="/info">Info</a>
              {isAuthed ? <a href="/profile">Profil</a> : null}
              {!isAuthed ? (
                <>
                  <a href="/login">Connexion</a>
                  <a href="/register">Inscription</a>
                </>
              ) : (
                <button className="link-button" onClick={onLogout}>
                  Deconnexion
                </button>
              )}
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <span className="brand-mark">NB</span>
              <span>Nutribuddy</span>
            </div>
            <span className="notice">CIQUAL + Open Food Facts - 2026</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
