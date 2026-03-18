"use client";

import { useEffect, useState } from "react";

function getAlertTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "alert" || s === "danger" || s === "error") return "danger";
  if (s === "hot" || s === "dark") return "warning";
  if (s === "warning") return "warning";
  return "normal";
}

function getStatusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "alert" || s === "danger" || s === "error") return "ALERT";
  if (s === "warning") return "WARNING";
  return "NORMAL";
}

export default function AlertSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAlerts() {
    try {
      setError("");
      const res = await fetch("/api/alerts", { cache: "no-store" });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || "Không lấy được alerts");
      }

      setData(json.data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Lỗi tải alerts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(loadAlerts, 5000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <div className="alert-panel-card">Đang tải cảnh báo...</div>;
  }

  if (error) {
    return <div className="alert-panel-card">{error}</div>;
  }

  const overallStatus = data?.overall_status || data?.status;
  const tone = getAlertTone(overallStatus);
  const statusLabel = getStatusLabel(overallStatus);
  const title =
    data?.title ||
    (overallStatus === "ALERT"
      ? "Security Alert"
      : overallStatus === "HOT"
      ? "Temperature Warning"
      : overallStatus === "DARK"
      ? "Light Warning"
      : "System Status");
  const message = data?.overall_message || data?.message;
  const suggestion = data?.suggested_action || data?.suggestion;
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <div className={`alert-panel-card tone-${tone}`}>
      <div className="alert-panel-header">
        <div>
          <div className="alert-panel-eyebrow">Alert Status</div>
          <h3 className="alert-panel-title">{title}</h3>
        </div>

        <span className={`alert-status-badge tone-${tone}`}>
          {statusLabel}
        </span>
      </div>

      <div className="alert-panel-message">
        {message || "Hệ thống đang hoạt động bình thường."}
      </div>

      <div className="alert-panel-note">
        {suggestion || "Tiếp tục giám sát dashboard."}
      </div>

      {items.length > 0 ? (
        <div className="alert-panel-list">
          {items.map((item, index) => (
            <div className="alert-panel-item" key={index}>
              {typeof item === "string"
                ? item
                : item?.message || item?.title || "Cảnh báo cần kiểm tra"}
            </div>
          ))}
        </div>
      ) : (
        <div className="alert-panel-list">
          <div className="alert-panel-item">
            Không có cảnh báo. Hệ thống đang bình thường.
          </div>
        </div>
      )}
    </div>
  );
}