"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
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
    <main className="login-v2-page">
      <div className="login-v2-photo-bg" aria-hidden="true" />
      <div className="login-v2-bg-overlay" aria-hidden="true" />

      <section className="login-v2-card">
        <div className="login-v2-header">
          <div className="login-v2-logo-wrap" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="login-v2-logo">
              <path
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.744c0 5.578 3.65 10.301 8.659 11.895a11.977 11.977 0 008.659-11.895c0-1.303-.208-2.558-.598-3.738A11.952 11.952 0 0112 2.714z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>

          <h1 className="login-v2-title">Đăng nhập hệ thống</h1>
          <p className="login-v2-subtitle">FaceAI Smart Door Management</p>
        </div>

        <form onSubmit={handleSubmit} className="login-v2-form">
          <div className="login-v2-field">
            <label className="login-v2-label" htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              name="username"
              className="login-v2-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập mã số cán bộ / sinh viên"
              autoComplete="username"
              required
            />
          </div>

          <div className="login-v2-field">
            <label className="login-v2-label" htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              name="password"
              type="password"
              className="login-v2-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập password"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="login-v2-row">
            <label className="login-v2-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Ghi nhớ</span>
            </label>

            <Link href="/forgot-password" className="login-v2-forgot-btn">
              Quên mật khẩu?
            </Link>
          </div>

          {error ? <div className="login-v2-error">{error}</div> : null}

          <button type="submit" className="login-v2-submit" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <footer className="login-v2-footer">
          <Link href="/register" className="login-v2-link">Tạo tài khoản</Link>
          <span> • </span>
          © 2026 Hệ thống Quản lý Cửa Thông minh FaceAI.
        </footer>
      </section>
    </main>
  );
}
