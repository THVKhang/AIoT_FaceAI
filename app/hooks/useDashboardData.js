"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AuthExpiredError,
  buildGaugeHistoryMap,
  buildStateMap,
  loadDashboardData,
} from "../lib/DashboardClient";

const MAX_HISTORY_POINTS_PER_METRIC = 60;

function mergeGaugeHistoryRows(prevRows, incomingRows, gauges) {
  const map = new Map();

  for (const row of prevRows || []) {
    if (!row?.feed_key) continue;
    if (!map.has(row.feed_key)) {
      map.set(row.feed_key, []);
    }
    map.get(row.feed_key).push(row);
  }

  for (const row of incomingRows || []) {
    if (!row?.feed_key) continue;
    if (!map.has(row.feed_key)) {
      map.set(row.feed_key, []);
    }
    map.get(row.feed_key).push(row);
  }

  for (const gauge of gauges || []) {
    const feedKey = gauge?.metric_key;
    const numericValue = Number(gauge?.value_num);
    if (!feedKey || !Number.isFinite(numericValue)) continue;

    if (!map.has(feedKey)) {
      map.set(feedKey, []);
    }

    map.get(feedKey).push({
      feed_key: feedKey,
      value_num: numericValue,
      updated_at: gauge?.updated_at || new Date().toISOString(),
    });
  }

  const mergedRows = [];

  for (const [feedKey, rows] of map.entries()) {
    const byStamp = new Map();

    for (const row of rows) {
      const stamp = row?.updated_at || new Date().toISOString();
      const key = `${stamp}|${row?.value_num}`;
      if (!byStamp.has(key)) {
        byStamp.set(key, {
          feed_key: feedKey,
          value_num: Number(row?.value_num),
          updated_at: stamp,
        });
      }
    }

    const sorted = Array.from(byStamp.values()).sort(
      (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    );

    const trimmed = sorted.slice(-MAX_HISTORY_POINTS_PER_METRIC);
    mergedRows.push(...trimmed);
  }

  return mergedRows;
}

export default function useDashboardData() {
  const [gauges, setGauges] = useState([]);
  const [gaugeHistory, setGaugeHistory] = useState([]);
  const [states, setStates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await loadDashboardData();
      setGauges(data.gauges);
      setGaugeHistory((prev) =>
        mergeGaugeHistoryRows(prev, data.gaugeHistory, data.gauges)
      );
      setStates(data.states);
      setLogs(data.logs);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      if (err instanceof AuthExpiredError) {
        window.location.href = "/login";
        return;
      }
      setError(err.message || "Lỗi tải dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const stateMap = useMemo(() => buildStateMap(states), [states]);
  const gaugeHistoryMap = useMemo(
    () => buildGaugeHistoryMap(gaugeHistory),
    [gaugeHistory]
  );

  return {
    gauges,
    gaugeHistory,
    gaugeHistoryMap,
    states,
    logs,
    stateMap,
    loading,
    error,
    lastUpdated,
    reload: load,
  };
}