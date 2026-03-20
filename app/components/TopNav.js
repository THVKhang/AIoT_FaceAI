"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const [theme, setTheme] = useState("light");
  const [session, setSession] = useState(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");

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

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme-mode", nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
  }

  const isTemporaryAdmin = Boolean(session?.isElevated && session?.baseRole !== "admin");
  const canUseAdminMode = Boolean(session?.baseRole === "user");
  const canGenerateToken = Boolean(session?.baseRole === "admin");

  async function enterAdminMode() {
    const token = window.prompt("Nhập Admin token để bật Admin Mode");
    if (token === null) return;

    setAdminBusy(true);
    setAdminMessage("");

    try {
      const response = await fetch("/api/admin/elevate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || "Không thể bật Admin Mode");
      }

      setAdminMessage("Đã bật Admin Mode");
      router.refresh();
      window.location.reload();
    } catch (error) {
      setAdminMessage(error.message || "Không thể bật Admin Mode");
    } finally {
      setAdminBusy(false);
    }
  }

  async function exitAdminMode() {
    setAdminBusy(true);
    setAdminMessage("");

    try {
      const response = await fetch("/api/admin/revert", {
        method: "POST",
      });

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || "Không thể thoát Admin Mode");
      }

      setAdminMessage("Đã trở về quyền User");
      router.refresh();
      window.location.reload();
    } catch (error) {
      setAdminMessage(error.message || "Không thể thoát Admin Mode");
    } finally {
      setAdminBusy(false);
    }
  }

  async function generateAdminToken() {
    const minutesInput = window.prompt("Token có hiệu lực bao nhiêu phút? (1-120)", "15");
    if (minutesInput === null) return;

    const expiresMinutes = Number(minutesInput);
    if (!Number.isFinite(expiresMinutes) || expiresMinutes < 1 || expiresMinutes > 120) {
      setAdminMessage("Thời gian token phải từ 1 đến 120 phút");
      return;
    }

    setAdminBusy(true);
    setAdminMessage("");

    try {
      const response = await fetch("/api/admin/tokens/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresMinutes }),
      });

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.message || "Không thể tạo admin token");
      }

      const token = String(json?.data?.token || "");
      const expiresAt = json?.data?.expiresAt
        ? new Date(json.data.expiresAt).toLocaleString("vi-VN")
        : "--";

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(token);
        window.alert(`Đã tạo token và copy vào clipboard.\nHết hạn: ${expiresAt}`);
      } else {
        window.alert(`Admin token: ${token}\nHết hạn: ${expiresAt}`);
      }

      setAdminMessage(`Đã tạo token (hết hạn: ${expiresAt})`);
    } catch (error) {
      setAdminMessage(error.message || "Không thể tạo admin token");
    } finally {
      setAdminBusy(false);
    }
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
        {canGenerateToken ? (
          <button
            type="button"
            className="admin-token-generate-btn"
            disabled={adminBusy}
            onClick={generateAdminToken}
          >
            {adminBusy ? "Creating..." : "Generate Token"}
          </button>
        ) : null}

        {canUseAdminMode ? (
          <button
            type="button"
            className={`admin-mode-btn ${isTemporaryAdmin ? "is-elevated" : ""}`}
            disabled={adminBusy}
            onClick={isTemporaryAdmin ? exitAdminMode : enterAdminMode}
          >
            {adminBusy ? "Processing..." : isTemporaryAdmin ? "Exit Admin" : "Admin Mode"}
          </button>
        ) : null}

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

      {adminMessage ? <div className="admin-mode-message">{adminMessage}</div> : null}
    </header>
  );
}