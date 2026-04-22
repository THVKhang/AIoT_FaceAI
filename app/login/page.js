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
        headers: { "Content-Type": "application/json" },
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
    <main className="auth-split-page">
      {/* LEFT — Brand Panel */}
      <div className="auth-split-left">
        <div className="auth-split-left-content">
          <div className="auth-split-brand">
            <div className="auth-split-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.744c0 5.578 3.65 10.301 8.659 11.895a11.977 11.977 0 008.659-11.895c0-1.303-.208-2.558-.598-3.738A11.952 11.952 0 0012 2.714z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="auth-split-brand-name">YoloHome</span>
          </div>

          <h1 className="auth-split-headline">
            Smart Door<br />
            <span className="auth-split-headline-accent">AI System</span>
          </h1>

          <p className="auth-split-description">
            Hệ thống quản lý cửa thông minh với nhận diện khuôn mặt AI, giám sát môi trường và điều khiển thiết bị IoT theo thời gian thực.
          </p>

          <div className="auth-split-features">
            <div className="auth-split-feature">
              <span className="auth-split-feature-icon">🤖</span>
              <div>
                <strong>Face Recognition</strong>
                <span>Nhận diện khuôn mặt realtime</span>
              </div>
            </div>
            <div className="auth-split-feature">
              <span className="auth-split-feature-icon">🏠</span>
              <div>
                <strong>IoT Control</strong>
                <span>Điều khiển cửa, đèn, quạt</span>
              </div>
            </div>
            <div className="auth-split-feature">
              <span className="auth-split-feature-icon">📊</span>
              <div>
                <strong>Live Monitoring</strong>
                <span>Nhiệt độ, độ ẩm, ánh sáng</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-split-left-footer">
          © 2026 AIoT FaceAI • THVKhang
        </div>
      </div>

      {/* RIGHT — Login Form */}
      <div className="auth-split-right">
        <section className="auth-split-form-card">
          <div className="auth-split-form-header">
            <h2 className="auth-split-form-title">Đăng nhập</h2>
            <p className="auth-split-form-subtitle">Chào mừng trở lại! Vui lòng đăng nhập.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-split-form">
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

          <footer className="auth-split-form-footer">
            Chưa có tài khoản? <Link href="/register" className="login-v2-link">Tạo tài khoản</Link>
          </footer>
        </section>
      </div>
    </main>
  );
}
