"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/devices", label: "Devices" },
  { href: "/admin/faces", label: "Face AI" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
  { href: "/logs", label: "Logs" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [theme, setTheme] = useState("light");
  const [session, setSession] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem("theme-mode");
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = storedTheme || (preferredDark ? "dark" : "light");

    setTheme(initialTheme);
    root.classList.toggle("theme-dark", initialTheme === "dark");
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        if (!alive) return;

        if (!response.ok) {
          setSession(null);
          return;
        }

        const json = await response.json();
        if (!alive) return;

        if (json?.success) {
          setSession(json.data);
        } else {
          setSession(null);
        }
      } catch {
        if (alive) setSession(null);
      }
    }

    loadSession();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme-mode", nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
  }

  return (
    <header className={`topnav${scrolled ? " topnav-scrolled" : ""}`}>
      <div className="topnav-brand">
        <div className="brand-mark">
          AI
          <span className="brand-online-dot" />
        </div>
        <div className="brand-title">YoloHome</div>
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
          aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            {theme === "dark" ? "☀" : "☾"}
          </span>
        </button>

        {session?.username && (
          <div className="user-info">
            <span className="user-icon">👤</span>
            <span className="user-name">{session.username}</span>
          </div>
        )}

        <LogoutButton />
      </div>

    </header>
  );
}