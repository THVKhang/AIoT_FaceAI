"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || "Đăng nhập thất bại");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra khi đăng nhập");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Login</h1>
        <p style={styles.subtitle}>AIoT FaceAI Dashboard</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập username"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập password"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#071226",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "18px",
    padding: "28px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    color: "#f8fafc",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "700",
  },
  subtitle: {
    marginTop: "8px",
    marginBottom: "24px",
    color: "#94a3b8",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontWeight: "700",
    fontSize: "14px",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #334155",
    background: "#111827",
    color: "#f8fafc",
    outline: "none",
  },
  button: {
    marginTop: "8px",
    border: "none",
    borderRadius: "12px",
    padding: "12px 16px",
    background: "#22c55e",
    color: "#08110b",
    fontWeight: "700",
    cursor: "pointer",
  },
  error: {
    background: "#450a0a",
    border: "1px solid #7f1d1d",
    color: "#fecaca",
    padding: "10px 12px",
    borderRadius: "12px",
    fontSize: "14px",
  },
};