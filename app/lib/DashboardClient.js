export async function loadDashboardData() {
  const [gaugesRes, gaugeHistoryRes, stateRes, logsRes] = await Promise.all([
    fetch("/api/gauges", { cache: "no-store" }),
    fetch("/api/gauges/history?points=30&windowMinutes=1440", { cache: "no-store" }),
    fetch("/api/state", { cache: "no-store" }),
    fetch("/api/logs?limit=12", { cache: "no-store" }),
  ]);

  const [gaugesJson, gaugeHistoryJson, stateJson, logsJson] = await Promise.all([
    gaugesRes.json(),
    gaugeHistoryRes.json(),
    stateRes.json(),
    logsRes.json(),
  ]);

  if (!gaugesJson.success) throw new Error("Không lấy được gauges");
  if (!gaugeHistoryJson.success) throw new Error("Không lấy được gauge history");
  if (!stateJson.success) throw new Error("Không lấy được state");
  if (!logsJson.success) throw new Error("Không lấy được logs");

  return {
    gauges: gaugesJson.data || [],
    gaugeHistory: gaugeHistoryJson.data || [],
    states: stateJson.data || [],
    logs: logsJson.data || [],
  };
}

export async function sendDashboardCommand(feedKey, value) {
  const res = await fetch("/api/commands", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      feed_key: feedKey,
      value,
    }),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.message || json.error || "Gửi lệnh thất bại");
  }

  return json;
}

export function buildStateMap(states) {
  const map = {};
  for (const item of states) {
    map[item.feed_key] = item;
  }
  return map;
}

export function buildGaugeHistoryMap(historyRows) {
  const map = {};

  for (const item of historyRows || []) {
    const feedKey = item.feed_key;
    if (!feedKey) continue;

    if (!Array.isArray(map[feedKey])) {
      map[feedKey] = [];
    }

    map[feedKey].push({
      value_num: Number(item.value_num),
      updated_at: item.updated_at,
    });
  }

  return map;
}

export function formatDateTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString("vi-VN");
}

export function getSeverityColor(severity) {
  if (severity === "error") return "#ef4444";
  if (severity === "warning") return "#f59e0b";
  return "#22c55e";
}

export function getSourceColor(source) {
  if (source === "web") return "#2563eb";
  if (source === "device") return "#16a34a";
  if (source === "ai") return "#a16207";
  if (source === "rule-engine") return "#7c3aed";
  if (source === "adafruit") return "#0f766e";
  return "#475569";
}

export function getGaugeColor(metricKey, value, min, max) {
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

  if (metricKey === "sensor-light") {
    if (percent < 30) return "#ef4444";
    if (percent < 70) return "#eab308";
    return "#84cc16";
  }

  if (metricKey === "sensor-temp") {
    if (percent < 40) return "#84cc16";
    if (percent < 75) return "#eab308";
    return "#ef4444";
  }

  if (metricKey === "sensor-humid") {
    if (percent < 30) return "#f97316";
    if (percent < 80) return "#3b82f6";
    return "#ef4444";
  }

  if (metricKey === "fan") return "#84cc16";
  return "#22c55e";
}