"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/devices", label: "Devices" },
  { href: "/settings", label: "Settings" },
  { href: "/logs", label: "Logs" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem("theme-mode");
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = storedTheme || (preferredDark ? "dark" : "light");

    setTheme(initialTheme);
    root.classList.toggle("theme-dark", initialTheme === "dark");
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme-mode", nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
  }

  return (
    <header className="topnav">
      <div className="topnav-brand">
        <div className="brand-mark">AI</div>
        <div>
          <div className="brand-title">AIoT FaceAI Smart Door</div>
          <div className="brand-subtitle">Next.js • PostgreSQL • Adafruit IO</div>
        </div>
      </div>

      <nav className="topnav-menu">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`topnav-link ${active ? "active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="topnav-right">
        <button
          type="button"
          className={`theme-toggle-btn ${theme === "dark" ? "is-light" : "is-dark"}`}
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Chuyen sang che do sang" : "Chuyen sang che do toi"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            {theme === "dark" ? "☀" : "☾"}
          </span>
          <span className="theme-toggle-text">
            {theme === "dark" ? "Light" : "Dark"}
          </span>
        </button>

        <div className="system-badge">
          <span className="status-dot" />
          Online
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}