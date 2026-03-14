"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import useDashboardData from "../hooks/useDashboardData";
import { sendDashboardCommand } from "../lib/dashboardClient";

export default function DevicesPage() {
  const { stateMap, reload } = useDashboardData();
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

  async function sendCommand(feedKey, value) {
    try {
      setError("");
      setCommandLoading(feedKey);
      await sendDashboardCommand(feedKey, value);
      await reload();
    } catch (err) {
      setError(err.message || "Không gửi được lệnh");
    } finally {
      setCommandLoading("");
    }
  }

  return (
    <AppShell
      title="Device Control"
      subtitle="Control connected devices and apply actions in real time"
    >
      {error && <div className="surface-card">{error}</div>}

      <div className="grid-3">
        <div className="surface-card control-card">
          <div className="metric-name">Door Control</div>
          <div className="control-main-value">{doorValue === 1 ? "OPEN" : "CLOSED"}</div>
          <button
            className="primary-btn"
            onClick={() => sendCommand("button-door", doorValue === 1 ? 0 : 1)}
            disabled={commandLoading === "button-door"}
          >
            {commandLoading === "button-door"
              ? "Sending..."
              : doorValue === 1
              ? "Close Door"
              : "Open Door"}
          </button>
        </div>

        <div className="surface-card control-card">
          <div className="metric-name">Light Control</div>
          <div className="control-main-value">{lightValue === 1 ? "ON" : "OFF"}</div>
          <button
            className="primary-btn"
            onClick={() => sendCommand("button-light", lightValue === 1 ? 0 : 1)}
            disabled={commandLoading === "button-light"}
          >
            {commandLoading === "button-light"
              ? "Sending..."
              : lightValue === 1
              ? "Turn Off"
              : "Turn On"}
          </button>
        </div>

        <div className="surface-card control-card">
          <div className="metric-name">Fan Speed</div>
          <div className="control-main-value">{fanValue}%</div>
          <input
            type="range"
            min="0"
            max="100"
            value={fanValue}
            onChange={(e) => setFanValue(Number(e.target.value))}
            className="range-input"
          />
          <div className="preset-row">
            {[25, 50, 100].map((preset) => (
              <button
                key={preset}
                className="secondary-btn"
                onClick={() => setFanValue(preset)}
              >
                {preset}%
              </button>
            ))}
          </div>
          <button
            className="primary-btn"
            onClick={() => sendCommand("fan", fanValue)}
            disabled={commandLoading === "fan"}
          >
            {commandLoading === "fan" ? "Sending..." : "Apply Fan Speed"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}