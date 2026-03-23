"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [issuedRecoveryCode, setIssuedRecoveryCode] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIssuedRecoveryCode("");

    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const json = await response.json();
      if (!json.success) throw new Error(json.message || "Đăng ký thất bại");

      const recoveryCode = String(json?.data?.recoveryCode || "").trim();
      setIssuedRecoveryCode(recoveryCode);
      setSuccessMessage(json.message || "Đăng ký thành công");

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 3000);
    } catch (err) {
      setError(err.message || "Không thể đăng ký");
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
            <span className="login-v2-logo-text">RG</span>
          </div>
          <h1 className="login-v2-title">Tạo tài khoản</h1>
          <p className="login-v2-subtitle">FaceAI Smart Door Registration</p>
        </div>

        <form className="login-v2-form" onSubmit={handleSubmit}>
          <div className="login-v2-field">
            <label className="login-v2-label" htmlFor="register-username">Tên đăng nhập</label>
            <input
              id="register-username"
              className="login-v2-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              required
            />
          </div>

          <div className="login-v2-field">
            <label className="login-v2-label" htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              className="login-v2-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="login-v2-field">
            <label className="login-v2-label" htmlFor="register-password">Mật khẩu</label>
            <input
              id="register-password"
              type="password"
              className="login-v2-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=">=7 ký tự, gồm a-z, A-Z, 0-9"
              minLength={7}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{7,}"
              title="Mật khẩu phải dài hơn 6 ký tự và gồm chữ thường, chữ hoa, số"
              required
            />
          </div>

          <div className="login-v2-field">
            <label className="login-v2-label" htmlFor="register-confirm">Xác nhận mật khẩu</label>
            <input
              id="register-confirm"
              type="password"
              className="login-v2-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              minLength={7}
              required
            />
          </div>

          {error ? <div className="login-v2-error">{error}</div> : null}
          {successMessage ? <div className="login-v2-success">{successMessage}</div> : null}
          {issuedRecoveryCode ? (
            <div className="login-v2-dev-token" role="status" aria-live="polite">
              <div className="login-v2-dev-token-label">Mã khôi phục (lưu lại ngay)</div>
              <div className="login-v2-dev-token-value">{issuedRecoveryCode}</div>
            </div>
          ) : null}

          <button className="login-v2-submit" type="submit" disabled={loading}>
            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <footer className="login-v2-footer">
          Đã có tài khoản? <Link href="/login" className="login-v2-link">Đăng nhập</Link>
        </footer>
      </section>
    </main>
  );
}
