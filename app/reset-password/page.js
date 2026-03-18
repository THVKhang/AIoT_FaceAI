"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const json = await response.json();
      if (!json.success) throw new Error(json.message || "Đặt lại mật khẩu thất bại");

      setSuccess(json.message || "Đặt lại mật khẩu thành công");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err) {
      setError(err.message || "Không thể đặt lại mật khẩu");
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
            <span className="login-v2-logo-text">RP</span>
          </div>
          <h1 className="login-v2-title">Đặt lại mật khẩu</h1>
          <p className="login-v2-subtitle">Sử dụng mã để tạo mật khẩu mới</p>
        </div>

        <form className="login-v2-form" onSubmit={handleSubmit}>
          <div className="login-v2-field">
            <label className="login-v2-label" htmlFor="reset-token">Mã đặt lại mật khẩu</label>
            <input
              id="reset-token"
              className="login-v2-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Dán mã đặt lại mật khẩu"
              required
            />
          </div>

          <div className="login-v2-field">
            <label className="login-v2-label" htmlFor="reset-new-password">Mật khẩu mới</label>
            <input
              id="reset-new-password"
              className="login-v2-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="login-v2-field">
            <label className="login-v2-label" htmlFor="reset-confirm-password">Nhập lại mật khẩu</label>
            <input
              id="reset-confirm-password"
              className="login-v2-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {error ? <div className="login-v2-error">{error}</div> : null}
          {success ? <div className="login-v2-success">{success}</div> : null}

          <button className="login-v2-submit" type="submit" disabled={loading}>
            {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </button>
        </form>

        <footer className="login-v2-footer">
          <Link href="/login" className="login-v2-link">Quay lại đăng nhập</Link>
        </footer>
      </section>
    </main>
  );
}
