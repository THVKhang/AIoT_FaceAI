"use client";

import AppShell from "../components/AppShell";
import SettingsPanel from "../components/SettingsPanel";
import useDashboardData from "../hooks/useDashboardData";
import { formatDateTime } from "../lib/DashboardClient";

function GuidanceCard({ title, note, range, tone = "neutral", tag = "Active" }) {
  return (
    <article className={`settings-v2-guidance-card tone-${tone}`}>
      <div className="settings-v2-guidance-top">
        <div className="settings-v2-guidance-title">{title}</div>
        <span className="settings-v2-guidance-tag">{tag}</span>
      </div>
      <p className="settings-v2-guidance-note">{note}</p>
      <div className="settings-v2-guidance-range">Normal: {range}</div>
    </article>
  );
}

function Recommendation({ title, description }) {
  return (
    <li className="settings-v2-recommend-item">
      <p className="settings-v2-recommend-title">{title}</p>
      <p className="settings-v2-recommend-text">{description}</p>
    </li>
  );
}

function QuickLog({ item }) {
  return (
    <div className="settings-v2-log-row">
      <div>
        <div className="settings-v2-log-event">{item.event_name || "No event"}</div>
        <div className="settings-v2-log-time">{formatDateTime(item.timestamp)}</div>
      </div>
      <span className="settings-v2-log-source">{item.source || "system"}</span>
    </div>
  );
}

function toRangeText(gauge, fallbackUnit = "") {
  if (!gauge) return "--";
  const unit = gauge.unit || fallbackUnit;
  const unitSuffix = unit ? ` ${unit}` : "";
  return `${gauge.min_value} - ${gauge.max_value}${unitSuffix}`;
}

function toWarnText(gauge, fallbackUnit = "") {
  if (!gauge) return "Warn range unavailable";
  const unit = gauge.unit || fallbackUnit;
  const unitSuffix = unit ? ` ${unit}` : "";
  return `Warning zone: ${gauge.warn_low} to ${gauge.warn_high}${unitSuffix}`;
}

function buildProfileTags(gauges) {
  const map = {
    "sensor-temp": "TEMP",
    "sensor-humid": "HUM",
    "sensor-light": "LUX",
    fan: "FAN",
  };

  return gauges
    .filter((g) => map[g.metric_key])
    .map((g) => map[g.metric_key]);
}

export default function SettingsPage() {
  const { gauges, logs, lastUpdated } = useDashboardData();

  const tempGauge = gauges.find((g) => g.metric_key === "sensor-temp");
  const humidGauge = gauges.find((g) => g.metric_key === "sensor-humid");
  const lightGauge = gauges.find((g) => g.metric_key === "sensor-light");
  const fanGauge = gauges.find((g) => g.metric_key === "fan");

  const profileTags = buildProfileTags(gauges);
  const recentLogs = (logs || []).slice(0, 3);
  const syncText = lastUpdated ? formatDateTime(lastUpdated) : "--";

  return (
    <AppShell
      title="Threshold Settings"
      subtitle="Configure sensor limits, warning thresholds, and rule behavior."
      actions={
        <div className="settings-v2-hero-badges">
          <span className="settings-v2-hero-pill">Last Sync: {syncText}</span>
          <span className="settings-v2-hero-pill tone-primary">PostgreSQL: Connected</span>
        </div>
      }
    >
      <section className="section-block settings-v2-shell">
        <div className="settings-v2-layout">
          <div className="settings-v2-main">
            <section className="settings-v2-overview-grid">
              <article className="settings-v2-overview-primary">
                <h2>System Overview</h2>
                <p>
                  Manage AIoT sensor parameters and alert rules to keep device behavior stable.
                  Better calibration reduces false positives and improves security confidence.
                </p>
              </article>

              <article className="settings-v2-overview-stat">
                <div className="settings-v2-overview-value">{profileTags.length || gauges.length || 0}</div>
                <p>Active Configuration Profiles</p>
                <div className="settings-v2-overview-tags">
                  {(profileTags.length ? profileTags : ["TEMP", "HUM", "LUX", "FAN"]).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>
            </section>

            <section className="settings-v2-guidance-wrap">
              <div className="settings-v2-section-head">
                <h3>Threshold Guidance</h3>
              </div>

              <div className="settings-v2-guidance-grid">
                <GuidanceCard
                  title="Temperature"
                  note={toWarnText(tempGauge, "C")}
                  range={toRangeText(tempGauge, "C")}
                  tone="danger"
                  tag="Crucial"
                />
                <GuidanceCard
                  title="Humidity"
                  note={toWarnText(humidGauge, "%")}
                  range={toRangeText(humidGauge, "%")}
                  tone="info"
                  tag="Active"
                />
                <GuidanceCard
                  title="Light Lux"
                  note={toWarnText(lightGauge, "lx")}
                  range={toRangeText(lightGauge, "lx")}
                  tone="warning"
                  tag="Auto"
                />
                <GuidanceCard
                  title="Fan Speed"
                  note={toWarnText(fanGauge, "RPM")}
                  range={toRangeText(fanGauge, "RPM")}
                  tone="success"
                  tag="Dynamic"
                />
              </div>
            </section>

            <section className="settings-v2-config-card">
              <div className="settings-v2-config-head">
                <div>
                  <h3>Sensor Configuration Panel</h3>
                  <p>Edit thresholds and save directly through the settings API.</p>
                </div>
                <span className="settings-v2-config-status">Ready to update</span>
              </div>

              <div className="settings-v2-panel-wrap">
                <SettingsPanel theme="light" embedded />
              </div>
            </section>
          </div>

          <aside className="settings-v2-side">
            <section className="settings-v2-side-card">
              <h4>Quick Recommendations</h4>
              <ul className="settings-v2-recommend-list">
                <Recommendation
                  title="Avoid narrow ranges"
                  description="Very tight min-max windows can create jitter and repetitive alerts."
                />
                <Recommendation
                  title="Keep warning zones meaningful"
                  description="Use warning thresholds for non-urgent but actionable states."
                />
                <Recommendation
                  title="Validate on real devices"
                  description="After changing limits, test dashboard, alerts, and command behavior."
                />
              </ul>
            </section>

            <section className="settings-v2-help-card">
              <h4>Need Help?</h4>
              <p>Check calibration guidelines before applying aggressive threshold values.</p>
            </section>

            <section className="settings-v2-side-card dark">
              <h4>Recent Logs</h4>
              <div className="settings-v2-log-list">
                {recentLogs.length ? (
                  recentLogs.map((item) => <QuickLog key={item.id} item={item} />)
                ) : (
                  <p className="settings-v2-empty-log">No logs yet</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
