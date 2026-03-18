import TopNav from "./TopNav";
import SiteFooter from "./SiteFooter";

export default function AppShell({ title, subtitle, children, actions = null }) {
  return (
    <main className="app-shell">
      <div className="app-shell-bg" />
      <div className="dashboard-container">
        <TopNav />

        <section className="page-hero">
          <div>
            <h1 className="page-hero-title">{title}</h1>
            {subtitle ? <p className="page-hero-subtitle">{subtitle}</p> : null}
          </div>

          {actions ? <div className="page-hero-actions">{actions}</div> : null}
        </section>

        <section className="page-content">{children}</section>

        <SiteFooter />
      </div>
    </main>
  );
}