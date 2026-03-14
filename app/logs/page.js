"use client";

import AppShell from "../components/AppShell";
import useDashboardData from "../hooks/useDashboardData";
import {
  formatDateTime,
  getSeverityColor,
  getSourceColor,
} from "../lib/dashboardClient";

export default function LogsPage() {
  const { logs, loading, error } = useDashboardData();

  return (
    <AppShell
      title="System Logs"
      subtitle="Review activity, alerts and execution history"
    >
      {loading && <div className="surface-card">Đang tải logs...</div>}
      {error && <div className="surface-card">{error}</div>}

      <div className="surface-card">
        <div className="logs-table">
          <div className="logs-head">
            <span>Time</span>
            <span>Event</span>
            <span>Source</span>
            <span>Severity</span>
            <span>Details</span>
          </div>

          {logs.map((log) => (
            <div className="logs-row" key={log.id}>
              <span>{formatDateTime(log.timestamp)}</span>
              <span>{log.event_name}</span>
              <span>
                <span
                  className="pill"
                  style={{ background: getSourceColor(log.source), color: "#fff" }}
                >
                  {log.source}
                </span>
              </span>
              <span>
                <span
                  className="pill"
                  style={{ background: getSeverityColor(log.severity), color: "#fff" }}
                >
                  {log.severity}
                </span>
              </span>
              <span>{log.log_details}</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}