"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import useDashboardData from "../hooks/useDashboardData";
import {
  formatDateTime,
  sendDashboardCommand,
} from "../lib/DashboardClient";

export default function DevicesPage() {
  const router = useRouter();
  const { stateMap, logs, reload } = useDashboardData();

  const [commandLoading, setCommandLoading] = useState("");
  const [error, setError] = useState("");

  const [doorValue, setDoorValue] = useState(0);
  const [lightValue, setLightValue] = useState(0);
  const [fanValue, setFanValue] = useState(0);

  useEffect(() => {
    setDoorValue(Number(stateMap["button-door"]?.value_num ?? 0));
    setLightValue(Number(stateMap["button-light"]?.value_num ?? 0));
    setFanValue(Number(stateMap["fan"]?.value_num ?? 0));
  }, [stateMap]);

  const doorText = doorValue === 1 ? "OPEN" : "CLOSED";
  const lightText = lightValue > 0 ? "ON" : "OFF";
  const motionText =
    Number(stateMap["sensor-motion"]?.value_num ?? 0) === 1 ? "DETECTED" : "CLEAR";

  const lastDeviceLog = useMemo(() => {
    if (!logs?.length) return null;
    return (
      logs.find((log) => log.source === "device") ||
      logs.find((log) => log.source === "adafruit") ||
      logs[0]
    );
  }, [logs]);

  async function sendCommand(feedKey, value) {
    try {
      setError("");
      setCommandLoading(feedKey);

      await sendDashboardCommand(feedKey, value);
      await reload();
    } catch (err) {
      console.error(err);
      setError(err.message || "Cannot send command");
    } finally {
      setCommandLoading("");
    }
  }

  function handleReviewFootage() {
    // Reuse existing Logs page as the actionable destination for reviewing recent security events.
    router.push("/logs");
  }

  return (
    <AppShell title="Devices Controller" subtitle="" actions={null}>
      <section className="section-block devices-page-v2">
        {error && (
          <div className="device-message-strip">
            {error ? <span className="device-message error">{error}</span> : null}
          </div>
        )}

        <div className="devices-v2-grid">
          <article className="devices-v2-card">
            <div className="devices-v2-card-head">
              <div className="devices-v2-icon tone-primary">Door</div>
              <span className={`devices-v2-pill ${doorValue === 1 ? "tone-safe" : "tone-neutral"}`}>
                {doorValue === 1 ? "OPEN" : "SECURE"}
              </span>
            </div>

            <h3 className="devices-v2-card-title">Door</h3>
            <p className="devices-v2-card-meta">
              Last update: {formatDateTime(stateMap["button-door"]?.updated_at)}
            </p>

            <div className="devices-v2-inline-state">
              <span className="devices-v2-tag">Current: {doorText}</span>
              <span className="devices-v2-tag">Motion: {motionText}</span>
            </div>

            <div className="devices-v2-action-row">
              <button
                className="devices-v2-btn-primary"
                onClick={() => sendCommand("button-door", 1)}
                disabled={commandLoading === "button-door"}
              >
                {commandLoading === "button-door" ? "Sending..." : "OPEN"}
              </button>
              <button
                className="devices-v2-btn-secondary"
                onClick={() => sendCommand("button-door", 0)}
                disabled={commandLoading === "button-door"}
              >
                CLOSE
              </button>
            </div>
          </article>

          <article className="devices-v2-card">
            <div className="devices-v2-card-head">
              <div className="devices-v2-icon tone-warm">Light</div>
              <span className={`devices-v2-pill ${lightValue > 0 ? "tone-safe" : "tone-neutral"}`}>
                {lightText}
              </span>
            </div>

            <h3 className="devices-v2-card-title">Light</h3>

            <div className="devices-v2-slider-wrap">
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={lightValue}
                onChange={(e) => setLightValue(Number(e.target.value))}
                className="range-input"
              />
              <div className="devices-v2-scale-row">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="devices-v2-preset-row">
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((preset) => (
                <button
                  key={preset}
                  className={`devices-v2-preset ${lightValue === preset ? "is-active" : ""}`}
                  onClick={() => setLightValue(preset)}
                >
                  {preset}%
                </button>
              ))}
            </div>

            <div className="devices-v2-list">
              <div className="devices-v2-list-row">
                <span>State</span>
                <strong>{lightText}</strong>
              </div>
              <div className="devices-v2-list-row">
                <span>Level</span>
                <strong>{lightValue}%</strong>
              </div>
              <div className="devices-v2-list-row">
                <span>Sensor</span>
                <strong>{String(stateMap["sensor-light"]?.value_num ?? "--")}</strong>
              </div>
            </div>

            <div className="devices-v2-action-row one-col">
              <button
                className="devices-v2-btn-primary"
                onClick={() => sendCommand("button-light", lightValue)}
                disabled={commandLoading === "button-light"}
              >
                {commandLoading === "button-light"
                  ? "Sending..."
                  : "Apply Light"}
              </button>
            </div>

            <p className="devices-v2-card-meta">
              Last update: {formatDateTime(stateMap["button-light"]?.updated_at)}
            </p>
          </article>

          <article className="devices-v2-card">
            <div className="devices-v2-card-head">
              <div className="devices-v2-icon tone-cool">Fan</div>
              <div className="devices-v2-speed-box">
                <p>SPEED</p>
                <strong>{fanValue}%</strong>
              </div>
            </div>

            <h3 className="devices-v2-card-title">Fan</h3>

            <div className="devices-v2-slider-wrap">
              <input
                type="range"
                min="0"
                max="100"
                value={fanValue}
                onChange={(e) => setFanValue(Number(e.target.value))}
                className="range-input"
              />
              <div className="devices-v2-scale-row">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="devices-v2-preset-row">
              {[0, 25, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  className={`devices-v2-preset ${fanValue === preset ? "is-active" : ""}`}
                  onClick={() => setFanValue(preset)}
                >
                  {preset}%
                </button>
              ))}
            </div>

            <button
              className="devices-v2-btn-primary devices-v2-fan-apply"
              onClick={() => sendCommand("fan", fanValue)}
              disabled={commandLoading === "fan"}
            >
              {commandLoading === "fan" ? "Sending..." : "Apply Speed"}
            </button>

            <p className="devices-v2-card-meta">Last update: {formatDateTime(stateMap.fan?.updated_at)}</p>
          </article>
        </div>

        <div className="devices-v2-bottom-grid">
          <article className="devices-v2-alert-panel">
            <h3>Smart Security Alert</h3>
            <p>
              {lastDeviceLog
                ? `${lastDeviceLog.event_name}`
                : "Door Opened"}
            </p>
            <button className="devices-v2-btn-light" type="button" onClick={handleReviewFootage}>
              Review Footage
            </button>
          </article>

          <article className="devices-v2-schedule-panel">
            <h3>Active Schedules</h3>
            <div className="devices-v2-schedule-list">
              <div className="devices-v2-schedule-row">
                <div className="devices-v2-schedule-dot">NM</div>
                <div>
                  <p className="devices-v2-schedule-name">Night Mode</p>
                  <p className="devices-v2-schedule-detail">All lights OFF • Doors LOCKED</p>
                </div>
                <strong>11:00 PM</strong>
              </div>
              <div className="devices-v2-schedule-row">
                <div className="devices-v2-schedule-dot">MR</div>
                <div>
                  <p className="devices-v2-schedule-name">Morning Routine</p>
                  <p className="devices-v2-schedule-detail">Coffee ON • Curtains OPEN</p>
                </div>
                <strong>06:45 AM</strong>
              </div>
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}