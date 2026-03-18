export default function SiteFooter() {
  const quickLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Devices", href: "/devices" },
    { label: "Settings", href: "/settings" },
    { label: "Logs", href: "/logs" },
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer-middle">
        <div className="site-footer-brand">
          <div className="site-footer-logo">AIOT</div>
          <div>
            <div className="site-footer-brand-title">AIoT FaceAI Smart Door</div>
            <div className="site-footer-brand-subtitle">
              Monitoring • Control • Alerts • Logs
            </div>
          </div>
        </div>

        <div className="site-footer-nav">
          {quickLinks.map((item) => (
            <a key={item.href} href={item.href} className="site-footer-link strong-link">
              {item.label}
            </a>
          ))}
        </div>

        <div className="site-footer-socials">
          <a
            href="https://github.com/THVKhang"
            target="_blank"
            rel="noreferrer"
            className="site-footer-icon"
            aria-label="Profile"
            title="Profile"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
            </svg>
          </a>
        </div>
      </div>

      <div className="site-footer-bottom">
        <div className="site-footer-contact">
          <div className="site-footer-contact-title">Maintainer</div>
          <div className="site-footer-contact-line">
            GitHub:{" "}
            <a
              href="https://github.com/THVKhang"
              target="_blank"
              rel="noreferrer"
              className="site-footer-link"
            >
              https://github.com/THVKhang
            </a>
          </div>
          <div className="site-footer-contact-line">
            Project:{" "}
            <a
              href="https://github.com/THVKhang/AIoT_FaceAI"
              target="_blank"
              rel="noreferrer"
              className="site-footer-link"
            >
              AIoT_FaceAI
            </a>
          </div>
        </div>

        <div className="site-footer-center-note">
          <div className="site-footer-contact-title">System Scope</div>
          <div className="site-footer-contact-line">Dashboard • Device Control • Threshold Settings • Logs</div>
          <div className="site-footer-contact-line">Realtime monitoring with PostgreSQL + Adafruit IO + Next.js</div>
        </div>

        <div className="site-footer-copyright">
          <div className="site-footer-contact-title">Notice</div>
          <div className="site-footer-contact-line">
            Built for academic demo and system visualization.
          </div>
          <div className="site-footer-contact-line">
            © 2026 AIoT FaceAI Dashboard
          </div>
        </div>
      </div>
    </footer>
  );
}