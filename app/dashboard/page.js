"use client";

import AppShell from "../components/AppShell";
import AlertSection from "../components/AlertSection";
import useDashboardData from "../hooks/useDashboardData";
import { formatDateTime, getGaugeColor } from "../lib/dashboardClient";

export default function DashboardPage() {
  const { gauges, stateMap, loading, error, lastUpdated } = useDashboardData();

  function renderGaugeCard(g) {
    const value = Number(g.value_num ?? 0);
    const min = Number(g.min_value ?? 0);
    const max = Number(g.max_value ?? 100);
    const percent =
      max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
    const color = getGaugeColor(g.metric_key, value, min, max);

    return (
      <div className="hero-card metric-card" key={g.metric_key}>
        <div className="metric-top">
          <div className="metric-name">{g.display_name}</div>
          <div className="metric-chip">{g.unit || "--"}</div>
        </div>

        <div className="metric-value">{value}</div>
        <div className="metric-sub">
          Min {min} • Max {max}
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%`, background: color }} />
        </div>

        <div className="metric-footer">
          <span>Updated</span>
          <strong>{formatDateTime(g.updated_at)}</strong>
        </div>
      </div>
    );
  }

  function renderState(label, feedKey) {
    const item = stateMap[feedKey];
    const value =
      item?.value_text ??
      (item?.value_num !== null && item?.value_num !== undefined ? item.value_num : "--");

    return (
      <div className="state-line" key={feedKey}>
        <div>
          <div className="state-label">{label}</div>
          <div className="state-time">{formatDateTime(item?.updated_at)}</div>
        </div>
        <div className="pill state-pill">{String(value)}</div>
      </div>
    );
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle={`System overview and live monitoring${
        lastUpdated ? ` • ${formatDateTime(lastUpdated)}` : ""
      }`}
    >
      {loading && <div className="surface-card">Đang tải dữ liệu...</div>}
      {error && <div className="surface-card">{error}</div>}

      <div className="section-block">
        <h2 className="section-title">Live Metrics</h2>
        <div className="grid-4">{gauges.map(renderGaugeCard)}</div>
      </div>

      <div className="section-block">
        <AlertSection />
      </div>

      <div className="section-block">
        <h2 className="section-title">Security & Device State</h2>
        <div className="grid-2">
          <div className="surface-card">
            {renderState("Motion", "sensor-motion")}
            {renderState("Door", "button-door")}
            {renderState("Light", "button-light")}
            {renderState("FaceAI Result", "faceai-result")}
          </div>
          <div className="surface-card">
            {renderState("Temperature", "sensor-temp")}
            {renderState("Humidity", "sensor-humid")}
            {renderState("Light Sensor", "sensor-light")}
            {renderState("Fan", "fan")}
          </div>
        </div>
      </div>
    </AppShell>
  );
}