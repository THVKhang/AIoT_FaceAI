"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildStateMap, loadDashboardData } from "../lib/dashboardClient";

export default function useDashboardData() {
  const [gauges, setGauges] = useState([]);
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
      setStates(data.states);
      setLogs(data.logs);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
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

  return {
    gauges,
    states,
    logs,
    stateMap,
    loading,
    error,
    lastUpdated,
    reload: load,
  };
}