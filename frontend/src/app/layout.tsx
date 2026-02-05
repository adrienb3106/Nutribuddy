"use client";

import { useEffect, useState } from "react";
import { Newsreader, Space_Grotesk } from "next/font/google";
import "./globals.css";

import { clearTokens, getToken } from "@/lib/auth";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
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
      <body className={`${spaceGrotesk.variable} ${newsreader.variable}`}>
        <nav className="nav">
          <div className="nav-inner">
            <div className="brand">Nutribuddy</div>
            <div className="nav-links">
              <a href="/">Accueil</a>
              <a href="/foods">Aliments</a>
              <a href="/scan">Scanner</a>
              {isAuthed ? <a href="/profile">Profil</a> : null}
              {!isAuthed ? (
                <>
                  <a href="/login">Connexion</a>
                  <a href="/register">Inscription</a>
                </>
              ) : (
                <button className="link-button" onClick={onLogout}>
                  Déconnexion
                </button>
              )}
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
