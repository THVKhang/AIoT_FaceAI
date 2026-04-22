"use client";

import { useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import useDashboardData from "../hooks/useDashboardData";
import { formatDateTime } from "../lib/DashboardClient";

function StatCard({ label, value, tone = "neutral", icon = "LG" }) {
  return (
    <article className={`logs-v2-stat-card tone-${tone}`}>
      <div className={`logs-v2-stat-icon tone-${tone}`}>{icon}</div>
      <div>
        <div className="logs-v2-stat-label">{label}</div>
        <div className="logs-v2-stat-value">{value}</div>
      </div>
    </article>
  );
}

function sourceLabel(source) {
  if (!source) return "unknown";
  if (source === "rule-engine") return "automation";
  return String(source);
}

function severityLabel(severity) {
  if (!severity) return "info";
  return String(severity);
}

function sourceTone(source) {
  const value = String(source || "").toLowerCase();
  if (value === "web") return "web";
  if (value === "device") return "device";
  if (value === "rule-engine" || value === "automation") return "automation";
  if (value === "ai") return "ai";
  return "neutral";
}

function severityTone(severity) {
  const value = String(severity || "info").toLowerCase();
  if (value === "error") return "danger";
  if (value === "warning") return "warning";
  if (value === "success") return "success";
  if (value === "info") return "info";
  return "neutral";
}

function toCsvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function exportLogsAsCsv(rows) {
  const headers = ["timestamp", "event_name", "source", "severity", "log_details"];
  const csvRows = [headers.join(",")];

  for (const row of rows) {
    csvRows.push(
      [
        toCsvCell(row.timestamp),
        toCsvCell(row.event_name),
        toCsvCell(row.source),
        toCsvCell(row.severity),
        toCsvCell(row.log_details),
      ].join(",")
    );
  }

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.setAttribute("download", `logs-${Date.now()}.csv`);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function LogsPage() {
  const { logs, loading, error, lastUpdated } = useDashboardData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return (logs || []).filter((log) => {
      const matchesKeyword =
        !keyword ||
        String(log.event_name || "").toLowerCase().includes(keyword) ||
        String(log.log_details || "").toLowerCase().includes(keyword) ||
        String(log.source || "").toLowerCase().includes(keyword) ||
        String(log.severity || "").toLowerCase().includes(keyword);

      const matchesFilter =
        filter === "all" ||
        log.severity === filter ||
        log.source === filter;

      return matchesKeyword && matchesFilter;
    });
  }, [logs, search, filter]);

  const sortedLogs = useMemo(() => {
    return [...(logs || [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [logs]);

  const totalLogs = sortedLogs.length;
  const warningCount = (logs || []).filter((log) => log.severity === "warning").length;
  const errorCount = (logs || []).filter((log) => log.severity === "error").length;
  const deviceCount = (logs || []).filter((log) => log.source === "device").length;

  const timelineLogs = filteredLogs.slice(0, 6);
  const tableLogs = filteredLogs.slice(0, 12);
  const syncText = lastUpdated ? formatDateTime(lastUpdated) : "--";

  const filterOptions = [
    { key: "all", label: "All" },
    { key: "warning", label: "Warnings" },
    { key: "error", label: "Errors" },
    { key: "device", label: "Device" },
    { key: "web", label: "Web" },
    { key: "ai", label: "AI" },
    { key: "rule-engine", label: "Rules" },
  ];

  return (
    <AppShell
      title="System Logs"
      subtitle="Review recent activity, alerts, command execution, and device responses"
      actions={
        <div className="logs-v2-hero-stats">
          <span className="logs-v2-hero-pill">
            <strong>Total Logs</strong>
            <span>{totalLogs}</span>
          </span>
          <span className="logs-v2-hero-pill">
            <strong>Last Sync</strong>
            <span>{syncText}</span>
          </span>
          <span className="logs-v2-hero-pill">
            <strong>Filtered</strong>
            <span>{filteredLogs.length}</span>
          </span>
        </div>
      }
    >
      {loading && <div className="surface-card">Loading logs...</div>}
      {error && <div className="surface-card">{error}</div>}

      <section className="section-block logs-v2-shell">
        <div className="logs-v2-stats-grid">
          <StatCard label="Total Logs" value={totalLogs} tone="info" icon="📊" />
          <StatCard label="Warnings" value={warningCount} tone="warning" icon="⚠️" />
          <StatCard label="Errors" value={errorCount} tone="danger" icon="🔴" />
          <StatCard label="Device Logs" value={deviceCount} tone="success" icon="📡" />
        </div>

        <div className="surface-card logs-v2-toolbar-card">
          <div className="logs-v2-toolbar-row">
            <div className="logs-v2-filter-row">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  className={`logs-v2-filter-chip ${filter === option.key ? "active" : ""}`}
                  onClick={() => setFilter(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="logs-v2-search-wrap">
              <input
                type="text"
                className="logs-v2-search-input"
                placeholder="Filter by event, source, severity or details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="logs-v2-content-grid">
          <aside className="surface-card logs-v2-timeline-panel">
            <div className="logs-v2-block-head">
              <h2 className="section-title">Recent Activity Timeline</h2>
            </div>

            <div className="logs-v2-timeline">
              {timelineLogs.length === 0 ? (
                <div className="logs-v2-empty-state">No logs match the current filters.</div>
              ) : (
                timelineLogs.map((log) => (
                  <div className="logs-v2-timeline-item" key={log.id}>
                    <div className="logs-v2-timeline-dot" />
                    <div className="logs-v2-timeline-card">
                      <div className="logs-v2-timeline-top">
                        <div className="logs-v2-timeline-left">
                          <h3 className="logs-v2-event-title">{log.event_name}</h3>
                          <div className="logs-v2-pill-row">
                            <span className={`logs-v2-tag tone-${sourceTone(log.source)}`}>
                              {sourceLabel(log.source)}
                            </span>
                            <span className={`logs-v2-tag tone-${severityTone(log.severity)}`}>
                              {severityLabel(log.severity)}
                            </span>
                          </div>
                        </div>
                        <span className="logs-v2-event-time">{formatDateTime(log.timestamp)}</span>
                      </div>

                      <p className="logs-v2-event-detail">{log.log_details || "No details"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          <div className="surface-card logs-v2-table-card">
            <div className="logs-v2-table-head">
              <h2 className="section-title">Detailed Log Explorer</h2>
              <button
                className="logs-v2-export-btn"
                onClick={() => exportLogsAsCsv(filteredLogs)}
                disabled={filteredLogs.length === 0}
              >
                Export CSV
              </button>
            </div>

            <div className="logs-v2-table-wrap">
              <table className="logs-v2-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Name</th>
                    <th>Source</th>
                    <th>Severity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {tableLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="logs-v2-empty-cell">
                        No data
                      </td>
                    </tr>
                  ) : (
                    tableLogs.map((log) => (
                      <tr key={`table-${log.id}`}>
                        <td>{formatDateTime(log.timestamp)}</td>
                        <td className="logs-v2-table-event">{log.event_name}</td>
                        <td>
                          <span className={`logs-v2-tag tone-${sourceTone(log.source)}`}>
                            {sourceLabel(log.source)}
                          </span>
                        </td>
                        <td>
                          <span className={`logs-v2-tag tone-${severityTone(log.severity)}`}>
                            {severityLabel(log.severity)}
                          </span>
                        </td>
                        <td className="logs-v2-table-detail">{log.log_details || "No details"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="logs-v2-table-foot">
              <span>
                Showing {tableLogs.length} of {filteredLogs.length} entries
              </span>
              <div className="logs-v2-foot-actions">
                <button disabled>Previous</button>
                <button disabled={tableLogs.length === 0}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}