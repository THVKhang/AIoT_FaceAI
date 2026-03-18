"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [identity, setIdentity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devToken, setDevToken] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setDevToken("");
    setLoading(true);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
      });

      const json = await response.json();
      if (!json.success) throw new Error(json.message || "Yêu cầu thất bại");

      setMessage(json.message || "Đã tạo yêu cầu đặt lại mật khẩu");
      if (json.dev_reset_token) {
        setDevToken(json.dev_reset_token);
      }
    } catch (err) {
      setError(err.message || "Không thể gửi yêu cầu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-v2-page">
      <div className="login-v2-bg-overlay" aria-hidden="true" />

      <section className="login-v2-card">
        <div className="login-v2-header">
          <div className="login-v2-logo-wrap" aria-hidden="true">
            <span className="login-v2-logo-text">FP</span>
          </div>
          <h1 className="login-v2-title">Quên mật khẩu</h1>
          <p className="login-v2-subtitle">Nhập tên đăng nhập hoặc email để đặt lại mật khẩu</p>
        </div>

        <form className="login-v2-form" onSubmit={handleSubmit}>
          <div className="login-v2-field">
            <label className="login-v2-label" htmlFor="forgot-identity">Tên đăng nhập / Email</label>
            <input
              id="forgot-identity"
              className="login-v2-input"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="Nhập tên đăng nhập hoặc email"
              required
            />
          </div>

          {error ? <div className="login-v2-error">{error}</div> : null}
          {message ? <div className="login-v2-success">{message}</div> : null}
          {devToken ? (
            <div className="login-v2-dev-token">
              <div className="login-v2-dev-token-label">Mã đặt lại mật khẩu (dev)</div>
              <div className="login-v2-dev-token-value">{devToken}</div>
            </div>
          ) : null}

          <button className="login-v2-submit" type="submit" disabled={loading}>
            {loading ? "Đang tạo yêu cầu..." : "Gửi yêu cầu"}
          </button>
        </form>

        <footer className="login-v2-footer">
          <Link href="/reset-password" className="login-v2-link">Đã có mã? Đặt lại mật khẩu</Link>
          <span> • </span>
          <Link href="/login" className="login-v2-link">Quay lại đăng nhập</Link>
        </footer>
      </section>
    </main>
  );
}
