import Link from "next/link";

const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Devices", href: "/devices" },
  { label: "Face AI", href: "/admin/faces" },
  { label: "Settings", href: "/settings" },
  { label: "Logs", href: "/logs" },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer-compact">
      <div className="site-footer-compact-inner">
        <div className="site-footer-compact-brand">
          <div className="site-footer-compact-logo">AI</div>
          <span className="site-footer-compact-name">YoloHome</span>
        </div>

        <nav className="site-footer-compact-nav">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="site-footer-compact-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-footer-compact-meta">
          <a
            href="https://github.com/THVKhang/AIoT_FaceAI"
            target="_blank"
            rel="noreferrer"
            className="site-footer-compact-link"
          >
            GitHub
          </a>
          <span className="site-footer-compact-sep">•</span>
          <span>© 2026 THVKhang</span>
        </div>
      </div>
    </footer>
  );
}