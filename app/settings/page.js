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
  const { gauges, lastUpdated } = useDashboardData();

  const tempGauge = gauges.find((g) => g.metric_key === "sensor-temp");
  const humidGauge = gauges.find((g) => g.metric_key === "sensor-humid");
  const lightGauge = gauges.find((g) => g.metric_key === "sensor-light");
  const fanGauge = gauges.find((g) => g.metric_key === "fan");

  const profileTags = buildProfileTags(gauges);
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


      <section className="section-block settings-clean-shell">
        <section className="settings-clean-guidance">
          <div className="settings-clean-head-row">
            <h3>Threshold Guidance</h3>
            <span>Set practical ranges before saving</span>
          </div>

          <div className="settings-clean-guidance-grid">
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
              note={toWarnText(fanGauge, "%")}
              range={toRangeText(fanGauge, "%")}
              tone="success"
              tag="Dynamic"
            />
          </div>
        </section>

        <section className="settings-v2-config-card settings-clean-config-card">
          <div className="settings-v2-config-head">
            <div>
              <h3>Sensor Configuration Panel</h3>
              <p>Edit values directly and save each sensor row.</p>
            </div>
            <span className="settings-v2-config-status">Ready to update</span>
          </div>

          <div className="settings-v2-panel-wrap">
            <SettingsPanel theme="light" embedded />
          </div>
        </section>
      </section>
    </AppShell>
  );
}
