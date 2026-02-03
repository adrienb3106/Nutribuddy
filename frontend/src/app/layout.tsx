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
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${newsreader.variable}`}>
        <nav className="nav">
          <div className="nav-inner">
            <div className="brand">Nutribuddy</div>
            <div className="nav-links">
              <a href="/">Home</a>
              <a href="/foods">Foods</a>
              <a href="/scan">Scan</a>
              <a href="/profile">Profile</a>
              {!isAuthed ? (
                <>
                  <a href="/login">Login</a>
                  <a href="/register">Register</a>
                </>
              ) : (
                <button className="link-button" onClick={onLogout}>
                  Logout
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
