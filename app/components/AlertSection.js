"use client";

import { useEffect, useState } from "react";

export default function AlertSection({ theme = "dark" }) {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  const dark = theme === "dark";

  async function loadAlerts() {
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      const json = await res.json();

      if (json.success) {
        setAlerts(json.data);
      }
    } catch (error) {
      console.error("Load alerts error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();

    const timer = setInterval(() => {
      loadAlerts();
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  function getStatusColor(status) {
    if (status === "ALERT") return "#ef4444";
    if (status === "HOT") return "#f97316";
    if (status === "DARK") return "#eab308";
    return "#22c55e";
  }

  function getSeverityColor(severity) {
    if (severity === "error") return "#ef4444";
    if (severity === "warning") return "#f59e0b";
    return "#3b82f6";
  }

  if (loading) {
    return (
      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>Alert Status</h2>
        <div
          style={{
            background: dark ? "#0f172a" : "#ffffff",
            border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          Đang tải cảnh báo...
        </div>
      </section>
    );
  }

  if (!alerts) return null;

  return (
    <section style={{ marginBottom: "28px" }}>
      <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>Alert Status</h2>

      <div
        style={{
          background: dark ? "#0f172a" : "#ffffff",
          border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
          borderRadius: "16px",
          padding: "18px",
          marginBottom: "16px",
          boxShadow: dark
            ? "0 8px 24px rgba(0,0,0,0.25)"
            : "0 8px 24px rgba(15,23,42,0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Overall Status</div>
            <div
              style={{
                display: "inline-block",
                padding: "8px 14px",
                borderRadius: "999px",
                background: getStatusColor(alerts.overall_status),
                color: "#fff",
                fontWeight: "700",
              }}
            >
              {alerts.overall_status}
            </div>
          </div>

          <div style={{ maxWidth: "760px", flex: 1 }}>
            <div style={{ fontWeight: "700", marginBottom: "6px" }}>{alerts.overall_message}</div>
            <div style={{ color: dark ? "#94a3b8" : "#475569" }}>
              Gợi ý: {alerts.suggested_action}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
        }}
      >
        {alerts.items.length === 0 ? (
          <div
            style={{
              background: dark ? "#0f172a" : "#ffffff",
              border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
              borderRadius: "16px",
              padding: "16px",
            }}
          >
            Không có cảnh báo. Hệ thống đang bình thường.
          </div>
        ) : (
          alerts.items.map((item, index) => (
            <div
              key={`${item.code}-${index}`}
              style={{
                background: dark ? "#0f172a" : "#ffffff",
                border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
                borderRadius: "16px",
                padding: "16px",
                boxShadow: dark
                  ? "0 8px 24px rgba(0,0,0,0.25)"
                  : "0 8px 24px rgba(15,23,42,0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
                <div style={{ fontWeight: "700" }}>{item.title}</div>
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: "999px",
                    background: getSeverityColor(item.severity),
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: "12px",
                  }}
                >
                  {item.code}
                </span>
              </div>

              <div style={{ marginBottom: "10px" }}>{item.message}</div>
              <div style={{ color: dark ? "#94a3b8" : "#475569", fontSize: "14px" }}>
                Gợi ý: {item.suggested_action}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}