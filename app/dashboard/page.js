"use client";

import AppShell from "../components/AppShell";
import AlertSection from "../components/AlertSection";
import useDashboardData from "../hooks/useDashboardData";
import { formatDateTime, getGaugeColor } from "../lib/DashboardClient";

function buildSmoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const cp1x = current.x + (next.x - current.x) * 0.45;
    const cp1y = current.y;
    const cp2x = current.x + (next.x - current.x) * 0.55;
    const cp2y = next.y;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  return path;
}

function MetricRowCard({ gauge, history = [] }) {
  const value = Number(gauge.value_num ?? 0);
  const min = Number(gauge.min_value ?? 0);
  const max = Number(gauge.max_value ?? 100);
  const unit = gauge.unit || "";
  const percent =
    max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  const color = getGaugeColor(gauge.metric_key, value, min, max);

  const historyValues = history
    .map((item) => Number(item?.value_num))
    .filter((num) => Number.isFinite(num));

  const paddedHistory =
    historyValues.length >= 2 ? historyValues : [value, value, value, value];
  const slicedHistory = paddedHistory.slice(-12);

  const trendValues = slicedHistory.map((num) => {
    if (max <= min) return 50;
    const pointPercent = ((num - min) / (max - min)) * 100;
    return Math.max(8, Math.min(96, pointPercent));
  });

  const linePointCount = Math.max(2, trendValues.length);
  const chartPoints = trendValues.map((point, index) => {
    const x = (index / (linePointCount - 1)) * 100;
    const y = 40 - (point / 100) * 32;
    return { x, y };
  });

  const linePath = buildSmoothPath(chartPoints);
  const areaPath = chartPoints.length
    ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} 40 L ${chartPoints[0].x} 40 Z`
    : "";

  const safeMetricId = String(gauge.metric_key || "metric").replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `metricFill${safeMetricId}`;
  const metricBadge = gauge.display_name || gauge.metric_key || "Sensor";

  const firstHistory = slicedHistory[0] ?? value;
  const trendPct =
    firstHistory === 0
      ? 0
      : ((value - firstHistory) / Math.abs(firstHistory)) * 100;
  const trendLabel = `${Math.abs(trendPct).toFixed(1)}%`;
  const trendTone = trendPct >= 0 ? "up" : "down";

  return (
    <div className="live-metric-row-card">
      <div className="live-metric-card-head">
        <div className="live-metric-badge">{metricBadge}</div>
        <div className={`live-metric-trend tone-${trendTone}`}>
          <span>{trendTone === "up" ? "UP" : "DOWN"}</span>
          {trendLabel}
        </div>
      </div>

      <div className="live-metric-value-row">
        <div className="live-metric-row-value">
          {value}
          <span>{unit}</span>
        </div>

        <div className="live-metric-line-chart" aria-hidden="true">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path className="live-metric-line" d={linePath} style={{ stroke: color }} />

            {chartPoints.length > 0 && (
              <circle
                cx={chartPoints[chartPoints.length - 1].x}
                cy={chartPoints[chartPoints.length - 1].y}
                r="1.9"
                style={{ fill: color }}
                className="live-metric-dot"
              />
            )}
          </svg>
        </div>
      </div>

      <div className="live-metric-row-footer">
        <div className="live-metric-row-meta">
          Min {min} • Max {max}
        </div>

        <div className="live-metric-updated">{formatDateTime(gauge.updated_at)}</div>
      </div>
    </div>
  );
}

function SnapshotItem({ title, value, time, tone = "neutral" }) {
  return (
    <div className={`snapshot-item tone-${tone}`}>
      <div className="snapshot-item-title">{title}</div>
      <div className="snapshot-item-value">{value}</div>
      <div className="snapshot-item-time">{time}</div>
    </div>
  );
}

function RealtimeStatusCard({ title, value, time, tone = "neutral" }) {
  return (
    <div className={`realtime-status-row tone-${tone}`}>
      <div className="realtime-status-left">
        <div className="realtime-status-title">{title}</div>
        <div className="realtime-status-time">{time}</div>
      </div>

      <div className={`realtime-status-pill tone-${tone}`}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { gauges, gaugeHistoryMap, stateMap, loading, error, lastUpdated } = useDashboardData();

  const motionValue = Number(stateMap["sensor-motion"]?.value_num ?? 0);
  const doorValue = Number(stateMap["button-door"]?.value_num ?? 0);
  const lightValue = Number(stateMap["button-light"]?.value_num ?? 0);
  const faceValue =
    stateMap["faceai-result"]?.value_text ??
    stateMap["faceai-result"]?.value_num ??
    "--";

  const doorText = doorValue === 1 ? "OPEN" : "CLOSED";
  const lightText = lightValue === 1 ? "ON" : "OFF";
  const motionText = motionValue === 1 ? "DETECTED" : "CLEAR";

  const systemTime = lastUpdated ? formatDateTime(lastUpdated) : "--";

  return (
    <AppShell
      title="Dashboard"
      subtitle="Live monitoring and security overview"
      actions={
        <div className="dashboard-hero-badges">
          <span className="hero-badge hero-badge-success">Online</span>
          <span className="hero-badge">Updated: {systemTime}</span>
        </div>
      }
    >
      {loading && <div className="surface-card">Đang tải dashboard...</div>}
      {error && <div className="surface-card">{error}</div>}

      <section className="section-block">
        <div className="dashboard-simple-hero">
          <div className="dashboard-simple-hero-left">
            <div className="dashboard-simple-label">Overview</div>
            <h2 className="dashboard-simple-title">Smart door system is running</h2>
            <p className="dashboard-simple-text">
              Theo dõi dữ liệu môi trường, trạng thái cửa, nhận diện khuôn mặt và cảnh báo theo thời gian thực.
            </p>
          </div>

          <div className="dashboard-simple-hero-right">
            <div className="realtime-summary-card">
              <div className="realtime-summary-title">Realtime State</div>
              <div className="realtime-summary-subtitle">
                Current device and security status
              </div>

              <div className="realtime-summary-grid">
                <RealtimeStatusCard
                  title="Door"
                  value={doorText}
                  time={formatDateTime(stateMap["button-door"]?.updated_at)}
                  tone={doorValue === 1 ? "success" : "neutral"}
                />
                <RealtimeStatusCard
                  title="Light"
                  value={lightText}
                  time={formatDateTime(stateMap["button-light"]?.updated_at)}
                  tone={lightValue === 1 ? "warning" : "neutral"}
                />
                <RealtimeStatusCard
                  title="Motion"
                  value={motionText}
                  time={formatDateTime(stateMap["sensor-motion"]?.updated_at)}
                  tone={motionValue === 1 ? "danger" : "success"}
                />
                <RealtimeStatusCard
                  title="FaceAI"
                  value={String(faceValue)}
                  time={formatDateTime(stateMap["faceai-result"]?.updated_at)}
                  tone={
                    String(faceValue).toLowerCase() === "unknown"
                      ? "danger"
                      : "info"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <h2 className="section-title">Live Metrics</h2>
        </div>

        <div className="live-metrics-layout">
          <div className="live-metrics-list">
            {gauges.map((gauge) => (
              <MetricRowCard
                key={gauge.metric_key}
                gauge={gauge}
                history={gaugeHistoryMap[gauge.metric_key] || []}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading-row">
          <h2 className="section-title">Security Snapshot</h2>
          <span className="section-caption">Alerts and current security state</span>
        </div>

        <div className="security-alert-layout">
          <div className="security-alert-left">
            <AlertSection />
          </div>

          <div className="security-alert-right">
            <div className="snapshot-grid">
              <SnapshotItem
                title="Door Status"
                value={doorText}
                time={formatDateTime(stateMap["button-door"]?.updated_at)}
                tone={doorValue === 1 ? "success" : "neutral"}
              />
              <SnapshotItem
                title="Motion"
                value={motionText}
                time={formatDateTime(stateMap["sensor-motion"]?.updated_at)}
                tone={motionValue === 1 ? "warning" : "success"}
              />
              <SnapshotItem
                title="Light"
                value={lightText}
                time={formatDateTime(stateMap["button-light"]?.updated_at)}
                tone={lightValue === 1 ? "info" : "neutral"}
              />
              <SnapshotItem
                title="FaceAI"
                value={String(faceValue)}
                time={formatDateTime(stateMap["faceai-result"]?.updated_at)}
                tone={
                  String(faceValue).toLowerCase() === "unknown" ? "danger" : "success"
                }
              />
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
