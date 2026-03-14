"use client";

import { useEffect, useState } from "react";

export default function SettingsPanel({ theme = "dark", onUpdated }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const dark = theme === "dark";

  async function loadSettings() {
    try {
      setError("");
      const res = await fetch("/api/settings", { cache: "no-store" });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || "Không lấy được settings");
      }

      setItems(json.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Lỗi tải settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateLocal(metricKey, field, value) {
    setItems((prev) =>
      prev.map((item) =>
        item.metric_key === metricKey ? { ...item, [field]: value } : item
      )
    );
  }

  async function saveItem(item) {
    try {
      setSavingKey(item.metric_key);
      setError("");
      setMessage("");

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metric_key: item.metric_key,
          min_value: item.min_value,
          max_value: item.max_value,
          warn_low: item.warn_low,
          warn_high: item.warn_high,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || json.error || "Lưu thất bại");
      }

      setMessage(`Đã lưu cấu hình cho ${item.display_name}`);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error(err);
      setError(err.message || "Không lưu được cấu hình");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <section style={{ marginBottom: "28px" }}>
      <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>Settings / Threshold Config</h2>

      <div
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
        {loading && <div>Đang tải cấu hình...</div>}
        {error && (
          <div
            style={{
              background: "#450a0a",
              border: "1px solid #7f1d1d",
              color: "#fecaca",
              padding: "10px 12px",
              borderRadius: "12px",
              marginBottom: "12px",
            }}
          >
            {error}
          </div>
        )}
        {message && (
          <div
            style={{
              background: "#052e16",
              border: "1px solid #166534",
              color: "#dcfce7",
              padding: "10px 12px",
              borderRadius: "12px",
              marginBottom: "12px",
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {items.map((item) => (
            <div
              key={item.metric_key}
              style={{
                border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
                borderRadius: "14px",
                padding: "14px",
                background: dark ? "#111827" : "#f8fafc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: "18px" }}>{item.display_name}</div>
                  <div style={{ color: dark ? "#94a3b8" : "#475569", fontSize: "13px" }}>
                    metric_key: {item.metric_key} | unit: {item.unit || "-"}
                  </div>
                </div>

                <button
                  onClick={() => saveItem(item)}
                  disabled={savingKey === item.metric_key}
                  style={{
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    background: "#22c55e",
                    color: "#08110b",
                    fontWeight: "700",
                    cursor: "pointer",
                    opacity: savingKey === item.metric_key ? 0.7 : 1,
                  }}
                >
                  {savingKey === item.metric_key ? "Đang lưu..." : "Lưu"}
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "12px",
                }}
              >
                <InputBox
                  label="Min"
                  value={item.min_value ?? ""}
                  onChange={(v) => updateLocal(item.metric_key, "min_value", v)}
                  dark={dark}
                />
                <InputBox
                  label="Max"
                  value={item.max_value ?? ""}
                  onChange={(v) => updateLocal(item.metric_key, "max_value", v)}
                  dark={dark}
                />
                <InputBox
                  label="Warn Low"
                  value={item.warn_low ?? ""}
                  onChange={(v) => updateLocal(item.metric_key, "warn_low", v)}
                  dark={dark}
                />
                <InputBox
                  label="Warn High"
                  value={item.warn_high ?? ""}
                  onChange={(v) => updateLocal(item.metric_key, "warn_high", v)}
                  dark={dark}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InputBox({ label, value, onChange, dark }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontWeight: "700", fontSize: "14px" }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: "10px",
          border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
          background: dark ? "#0f172a" : "#ffffff",
          color: dark ? "#f8fafc" : "#0f172a",
          outline: "none",
        }}
      />
    </div>
  );
}