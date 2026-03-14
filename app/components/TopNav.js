"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/devices", label: "Devices" },
  { href: "/settings", label: "Settings" },
  { href: "/logs", label: "Logs" },
];

export default function TopNav() {
  const pathname = usePathname();

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
        <div className="system-badge">
          <span className="status-dot" />
          Online
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}