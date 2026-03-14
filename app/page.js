// "use client";

// import { useEffect, useMemo, useState } from "react";
// import LogoutButton from "./components/LogoutButton";
// import SettingsPanel from "./components/SettingsPanel";
// import AlertSection from "./components/AlertSection";
// export default function Page() {
//   const [gauges, setGauges] = useState([]);
//   const [states, setStates] = useState([]);
//   const [logs, setLogs] = useState([]);
//   const [commandLoading, setCommandLoading] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [lastUpdated, setLastUpdated] = useState(null);

//   const [theme, setTheme] = useState("dark");

//   const [doorValue, setDoorValue] = useState(0);
//   const [lightValue, setLightValue] = useState(0);
//   const [fanValue, setFanValue] = useState(0);

//   const ui = getTheme(theme);

//   async function loadDashboard() {
//     try {
//       setError("");

//       const [gaugesRes, stateRes, logsRes] = await Promise.all([
//         fetch("/api/gauges", { cache: "no-store" }),
//         fetch("/api/state", { cache: "no-store" }),
//         fetch("/api/logs?limit=12", { cache: "no-store" }),
//       ]);

//       const [gaugesJson, stateJson, logsJson] = await Promise.all([
//         gaugesRes.json(),
//         stateRes.json(),
//         logsRes.json(),
//       ]);

//       if (!gaugesJson.success) throw new Error("Không lấy được gauges");
//       if (!stateJson.success) throw new Error("Không lấy được state");
//       if (!logsJson.success) throw new Error("Không lấy được logs");

//       const gaugesData = gaugesJson.data || [];
//       const stateData = stateJson.data || [];
//       const logsData = logsJson.data || [];

//       setGauges(gaugesData);
//       setStates(stateData);
//       setLogs(logsData);
//       setLastUpdated(new Date());

//       const stateMap = {};
//       for (const item of stateData) {
//         stateMap[item.feed_key] = item;
//       }

//       setDoorValue(Number(stateMap["button-door"]?.value_num ?? 0));
//       setLightValue(Number(stateMap["button-light"]?.value_num ?? 0));
//       setFanValue(Number(stateMap["fan"]?.value_num ?? 0));
//     } catch (err) {
//       console.error(err);
//       setError(err.message || "Lỗi tải dashboard");
//     } finally {
//       setLoading(false);
//     }
//   }
//   async function sendCommand(feedKey, value) {
//   try {
//     setError("");
//     setCommandLoading(feedKey);

//     const res = await fetch("/api/commands", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         feed_key: feedKey,
//         value,
//       }),
//     });

//     const json = await res.json();

//     if (!json.success) {
//       throw new Error(json.message || json.error || "Gửi lệnh thất bại");
//     }

//     await loadDashboard();
//   } catch (err) {
//     console.error(err);
//     setError(err.message || "Không gửi được lệnh");
//   } finally {
//     setCommandLoading("");
//   }
// }
//   useEffect(() => {
//     loadDashboard();

//     const timer = setInterval(() => {
//       loadDashboard();
//     }, 5000);

//     return () => clearInterval(timer);
//   }, []);

//   const stateMap = useMemo(() => {
//     const map = {};
//     for (const item of states) {
//       map[item.feed_key] = item;
//     }
//     return map;
//   }, [states]);

//   function formatDateTime(value) {
//     if (!value) return "--";
//     const d = new Date(value);
//     return d.toLocaleString("vi-VN");
//   }

//   function getGaugeColor(metricKey, value, min, max) {
//     const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

//     if (metricKey === "sensor-light") {
//       if (percent < 30) return "#ef4444";
//       if (percent < 70) return "#eab308";
//       return "#84cc16";
//     }

//     if (metricKey === "sensor-temp") {
//       if (percent < 40) return "#84cc16";
//       if (percent < 75) return "#eab308";
//       return "#ef4444";
//     }

//     if (metricKey === "sensor-humid") {
//       if (percent < 30) return "#f97316";
//       if (percent < 80) return "#3b82f6";
//       return "#ef4444";
//     }

//     if (metricKey === "fan") return "#84cc16";

//     return "#22c55e";
//   }

//   function getSeverityColor(severity) {
//     if (severity === "error") return "#ef4444";
//     if (severity === "warning") return "#f59e0b";
//     return "#22c55e";
//   }
// function getSourceColor(source) {
//   if (source === "web") return "#2563eb";
//   if (source === "device") return "#16a34a";
//   if (source === "ai") return "#a16207";
//   if (source === "rule-engine") return "#7c3aed";
//   if (source === "adafruit") return "#0f766e";
//   return "#475569";
// }
//   function renderGaugeCard(g) {
//     const value = Number(g.value_num ?? 0);
//     const min = Number(g.min_value ?? 0);
//     const max = Number(g.max_value ?? 100);
//     const percent =
//       max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
//     const color = getGaugeColor(g.metric_key, value, min, max);

//     return (
//       <div key={g.metric_key} style={ui.card}>
//         <div style={ui.cardHeader}>
//           <span style={ui.cardTitle}>{g.display_name}</span>
//           <span style={ui.unitBadge}>{g.unit || "-"}</span>
//         </div>

//         <div style={ui.gaugeValue}>{value}</div>
//         <div style={ui.subText}>
//           Min: {min} | Max: {max}
//         </div>

//         <div style={ui.progressTrack}>
//           <div
//             style={{
//               ...ui.progressFill,
//               width: `${percent}%`,
//               background: color,
//             }}
//           />
//         </div>

//         <div style={ui.subText}>Updated: {formatDateTime(g.updated_at)}</div>
//       </div>
//     );
//   }

//   function renderStateRow(label, feedKey) {
//     const item = stateMap[feedKey];
//     const value =
//       item?.value_text ??
//       (item?.value_num !== null && item?.value_num !== undefined ? item.value_num : "--");

//     let badgeStyle = { ...ui.badge, background: ui.badgeBg, color: ui.badgeColor };

//     if (feedKey === "sensor-motion") {
//       badgeStyle =
//         Number(item?.value_num) === 1
//           ? { ...ui.badge, background: "#166534", color: "#dcfce7" }
//           : { ...ui.badge, background: "#374151", color: "#e5e7eb" };
//     }

//     if (feedKey === "button-door" || feedKey === "button-light") {
//       badgeStyle =
//         Number(item?.value_num) === 1
//           ? { ...ui.badge, background: "#166534", color: "#dcfce7" }
//           : { ...ui.badge, background: "#7f1d1d", color: "#fee2e2" };
//     }

//     if (feedKey === "faceai-result") {
//       badgeStyle =
//         value && value !== "Unknown"
//           ? { ...ui.badge, background: "#a16207", color: "#fef3c7" }
//           : { ...ui.badge, background: "#374151", color: "#e5e7eb" };
//     }

//     return (
//       <div key={feedKey} style={ui.stateRow}>
//         <div>
//           <div style={ui.stateLabel}>{label}</div>
//           <div style={ui.stateTime}>{formatDateTime(item?.updated_at)}</div>
//         </div>
//         <div style={badgeStyle}>{String(value)}</div>
//       </div>
//     );
//   }

// async function handleDoorToggle() {
//   const nextValue = doorValue === 1 ? 0 : 1;
//   await sendCommand("button-door", nextValue);
// }

// async function handleLightToggle() {
//   const nextValue = lightValue === 1 ? 0 : 1;
//   await sendCommand("button-light", nextValue);
// }

// async function handleFanChange(e) {
//   const nextValue = Number(e.target.value);
//   setFanValue(nextValue);
// }

// async function handleFanCommit() {
//   await sendCommand("fan", fanValue);
// }

//   return (
//     <main style={ui.page}>
//       <div style={ui.container}>
//         <div style={ui.topBar}>
//           <div>
//             <h1 style={ui.title}>AIoT FaceAI Dashboard</h1>
//             <p style={ui.subtitle}>YoloHome Smart Door - PostgreSQL + Next.js</p>
//           </div>

//           <div style={ui.topRight}>
//             <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
//               <button style={ui.secondaryButton} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
//                 {theme === "dark" ? "Light Mode" : "Dark Mode"}
//               </button>
//               <button style={ui.refreshButton} onClick={loadDashboard}>
//                 Refresh
//               </button>
//               <LogoutButton />
//             </div>
//             <div style={ui.lastUpdated}>
//               {lastUpdated ? `Updated: ${formatDateTime(lastUpdated)}` : "Chưa cập nhật"}
//             </div>
//           </div>
//         </div>

//         {loading && <div style={ui.infoBox}>Đang tải dữ liệu...</div>}
//         {error && <div style={ui.errorBox}>{error}</div>}

//         <section style={ui.section}>
//           <h2 style={ui.sectionTitle}>Monitor</h2>
//           <div style={ui.grid4}>{gauges.map((g) => renderGaugeCard(g))}</div>
//         </section>
//       <AlertSection theme={theme} />
//       <SettingsPanel theme={theme} onUpdated={loadDashboard} />
//         <section style={ui.section}>
//           <h2 style={ui.sectionTitle}>Current State</h2>
//           <div style={ui.grid2}>
//             <div style={ui.panel}>
//               {renderStateRow("Motion", "sensor-motion")}
//               {renderStateRow("Door", "button-door")}
//               {renderStateRow("Light", "button-light")}
//               {renderStateRow("FaceAI Result", "faceai-result")}
//             </div>

//             <div style={ui.panel}>
//               {renderStateRow("Temperature", "sensor-temp")}
//               {renderStateRow("Humidity", "sensor-humid")}
//               {renderStateRow("Light Sensor", "sensor-light")}
//               {renderStateRow("Fan Speed", "fan")}
//             </div>
//           </div>
//         </section>

//         <section style={ui.section}>
//           <h2 style={ui.sectionTitle}>Control Section</h2>
//           <div style={ui.grid3}>
//             <div style={ui.panel}>
//               <div style={ui.controlTitle}>Door Control</div>
//               <div style={ui.controlValue}>{doorValue === 1 ? "OPEN" : "CLOSED"}</div>
//               <button
//                             style={{
//                   ...ui.controlButton,
//                   background: doorValue === 1 ? "#22c55e" : "#ef4444",
//                   opacity: commandLoading === "button-door" ? 0.7 : 1,
//                 }}
//                 onClick={handleDoorToggle}
//                 disabled={commandLoading === "button-door"}
//               >
//                 {commandLoading === "button-door"
//                   ? "Sending..."
//                   : doorValue === 1
//                   ? "Close Door"
//                   : "Open Door"}
//               </button>
//             </div>

//             <div style={ui.panel}>
//               <div style={ui.controlTitle}>Light Control</div>
//               <div style={ui.controlValue}>{lightValue === 1 ? "ON" : "OFF"}</div>
//               <button
//                 style={{
//                   ...ui.controlButton,
//                   background: lightValue === 1 ? "#22c55e" : "#64748b",
//                   opacity: commandLoading === "button-light" ? 0.7 : 1,
//                 }}
//                 onClick={handleLightToggle}
//                 disabled={commandLoading === "button-light"}
//               >
//                 {commandLoading === "button-light"
//                   ? "Sending..."
//                   : lightValue === 1
//                   ? "Turn Off"
//                   : "Turn On"}
//               </button>
//             </div>

//             <div style={ui.panel}>
//             <div style={ui.controlTitle}>Fan Speed</div>
//             <div style={ui.controlValue}>{fanValue}%</div>

//             <input
//               type="range"
//               min="0"
//               max="100"
//               value={fanValue}
//               onChange={handleFanChange}
//               style={ui.slider}
//             />

//             <button
//               style={{
//                 ...ui.controlButton,
//                 background: "#84cc16",
//                 color: "#08110b",
//                 marginTop: "10px",
//                 opacity: commandLoading === "fan" ? 0.7 : 1,
//               }}
//               onClick={handleFanCommit}
//               disabled={commandLoading === "fan"}
//             >
//               {commandLoading === "fan" ? "Sending..." : "Apply Fan Speed"}
//             </button>

//             <div style={ui.subText}>Điều chỉnh tốc độ quạt từ 0 đến 100%</div>
//           </div>
//           </div>
//         </section>

//         <section style={ui.section}>
//           <h2 style={ui.sectionTitle}>Recent Activity / Logs</h2>
//           <div style={ui.panel}>
//             <div style={ui.logHeader}>
//               <span>Time</span>
//               <span>Event</span>
//               <span>Source</span>
//               <span>Severity</span>
//               <span>Details</span>
//             </div>

//             {logs.length === 0 ? (
//               <div style={ui.emptyState}>Chưa có log</div>
//             ) : (
//               logs.map((log) => (
//                 <div key={log.id} style={ui.logRow}>
//                   <div>{formatDateTime(log.timestamp)}</div>
//                   <div>{log.event_name}</div>
//                   <div>
//                   <span
//                     style={{
//                       ...ui.badge,
//                       background: getSourceColor(log.source),
//                       color: "#fff",
//                     }}
//                   >
//                     {log.source}
//                   </span>
//                 </div>
//                   <div>
//                     <span
//                       style={{
//                         ...ui.badge,
//                         background: getSeverityColor(log.severity),
//                         color: "#fff",
//                       }}
//                     >
//                       {log.severity}
//                     </span>
//                   </div>
//                   <div>{log.log_details}</div>
//                 </div>
//               ))
//             )}
//           </div>
//         </section>
//       </div>
//     </main>
//   );
// }

// function getTheme(mode) {
//   const dark = mode === "dark";

//   return {
//     page: {
//       minHeight: "100vh",
//       background: dark ? "#071226" : "#f8fafc",
//       color: dark ? "#f8fafc" : "#0f172a",
//       padding: "24px",
//       fontFamily: "Arial, sans-serif",
//       transition: "all 0.2s ease",
//     },
//     container: {
//       maxWidth: "1400px",
//       margin: "0 auto",
//     },
//     topBar: {
//       display: "flex",
//       justifyContent: "space-between",
//       alignItems: "flex-start",
//       gap: "16px",
//       flexWrap: "wrap",
//       marginBottom: "24px",
//     },
//     title: {
//       margin: 0,
//       fontSize: "36px",
//       fontWeight: "700",
//     },
//     subtitle: {
//       marginTop: "8px",
//       color: dark ? "#94a3b8" : "#475569",
//       fontSize: "15px",
//     },
//     topRight: {
//       display: "flex",
//       flexDirection: "column",
//       alignItems: "flex-end",
//       gap: "8px",
//     },
//     refreshButton: {
//       background: "#22c55e",
//       color: "#08110b",
//       border: "none",
//       borderRadius: "10px",
//       padding: "10px 16px",
//       fontWeight: "700",
//       cursor: "pointer",
//     },
//     secondaryButton: {
//       background: dark ? "#e2e8f0" : "#0f172a",
//       color: dark ? "#0f172a" : "#f8fafc",
//       border: "none",
//       borderRadius: "10px",
//       padding: "10px 16px",
//       fontWeight: "700",
//       cursor: "pointer",
//     },
//     lastUpdated: {
//       color: dark ? "#94a3b8" : "#475569",
//       fontSize: "14px",
//     },
//     infoBox: {
//       background: dark ? "#1e293b" : "#e2e8f0",
//       border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
//       padding: "12px 16px",
//       borderRadius: "12px",
//       marginBottom: "20px",
//     },
//     errorBox: {
//       background: "#450a0a",
//       border: "1px solid #7f1d1d",
//       color: "#fecaca",
//       padding: "12px 16px",
//       borderRadius: "12px",
//       marginBottom: "20px",
//     },
//     section: {
//       marginBottom: "28px",
//     },
//     sectionTitle: {
//       fontSize: "24px",
//       marginBottom: "16px",
//     },
//     grid4: {
//       display: "grid",
//       gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
//       gap: "16px",
//     },
//     grid3: {
//       display: "grid",
//       gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
//       gap: "16px",
//     },
//     grid2: {
//       display: "grid",
//       gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
//       gap: "16px",
//     },
//     card: {
//       background: dark ? "#0f172a" : "#ffffff",
//       border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
//       borderRadius: "16px",
//       padding: "18px",
//       boxShadow: dark
//         ? "0 8px 24px rgba(0,0,0,0.25)"
//         : "0 8px 24px rgba(15,23,42,0.08)",
//     },
//     cardHeader: {
//       display: "flex",
//       justifyContent: "space-between",
//       alignItems: "center",
//       marginBottom: "18px",
//     },
//     cardTitle: {
//       fontSize: "18px",
//       fontWeight: "700",
//     },
//     unitBadge: {
//       padding: "6px 10px",
//       borderRadius: "999px",
//       background: dark ? "#1e293b" : "#e2e8f0",
//       color: dark ? "#e2e8f0" : "#334155",
//       fontWeight: "700",
//       fontSize: "13px",
//     },
//     gaugeValue: {
//       fontSize: "42px",
//       fontWeight: "800",
//       marginBottom: "8px",
//     },
//     subText: {
//       color: dark ? "#94a3b8" : "#475569",
//       fontSize: "13px",
//       marginBottom: "10px",
//     },
//     progressTrack: {
//       width: "100%",
//       height: "12px",
//       background: dark ? "#1e293b" : "#e2e8f0",
//       borderRadius: "999px",
//       overflow: "hidden",
//       marginBottom: "10px",
//     },
//     progressFill: {
//       height: "100%",
//       borderRadius: "999px",
//     },
//     panel: {
//       background: dark ? "#0f172a" : "#ffffff",
//       border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
//       borderRadius: "16px",
//       padding: "16px",
//       boxShadow: dark
//         ? "0 8px 24px rgba(0,0,0,0.25)"
//         : "0 8px 24px rgba(15,23,42,0.08)",
//     },
//     stateRow: {
//       display: "flex",
//       justifyContent: "space-between",
//       alignItems: "center",
//       gap: "12px",
//       padding: "14px 0",
//       borderBottom: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
//     },
//     stateLabel: {
//       fontWeight: "700",
//       marginBottom: "4px",
//     },
//     stateTime: {
//       color: dark ? "#94a3b8" : "#475569",
//       fontSize: "12px",
//     },
//     badge: {
//       padding: "6px 10px",
//       borderRadius: "999px",
//       fontSize: "13px",
//       fontWeight: "700",
//       whiteSpace: "nowrap",
//     },
//     badgeBg: dark ? "#1e293b" : "#e2e8f0",
//     badgeColor: dark ? "#e5e7eb" : "#334155",
//     controlTitle: {
//       fontSize: "18px",
//       fontWeight: "700",
//       marginBottom: "14px",
//     },
//     controlValue: {
//       fontSize: "34px",
//       fontWeight: "800",
//       marginBottom: "14px",
//     },
//     controlButton: {
//       border: "none",
//       color: "#fff",
//       borderRadius: "12px",
//       padding: "12px 16px",
//       fontWeight: "700",
//       cursor: "pointer",
//       width: "100%",
//     },
//     slider: {
//       width: "100%",
//       marginBottom: "10px",
//       accentColor: "#84cc16",
//     },
//     logHeader: {
//       display: "grid",
//       gridTemplateColumns: "1.4fr 1fr 0.8fr 0.8fr 2fr",
//       gap: "12px",
//       padding: "12px 0",
//       fontWeight: "700",
//       borderBottom: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
//       color: dark ? "#cbd5e1" : "#334155",
//     },
//     logRow: {
//       display: "grid",
//       gridTemplateColumns: "1.4fr 1fr 0.8fr 0.8fr 2fr",
//       gap: "12px",
//       padding: "14px 0",
//       borderBottom: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
//       fontSize: "14px",
//       alignItems: "start",
//     },
//     emptyState: {
//       padding: "18px 0",
//       color: dark ? "#94a3b8" : "#475569",
//     },
//   };
// }
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/dashboard");
}