import nodemailer from "nodemailer";

function getResendConfig() {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.MAIL_FROM || "").trim();

  if (!apiKey || !from) {
    return null;
  }

  return { apiKey, from };
}

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const from = String(process.env.MAIL_FROM || user || "").trim();

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    from,
  };
}

export function isMailerConfigured() {
  return Boolean(getResendConfig() || getSmtpConfig());
}

async function sendViaResend(config, payload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [payload.toEmail],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend gửi mail thất bại: ${response.status} ${detail}`);
  }
}

export async function sendPasswordResetEmail({ toEmail, username, resetToken }) {
  const appBaseUrl =
    String(process.env.APP_BASE_URL || "").trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const payload = {
    toEmail,
    subject: "[AIoT FaceAI] Dat lai mat khau",
    text: [
      `Xin chao ${username || "ban"},`,
      "",
      "Ban vua yeu cau dat lai mat khau cho tai khoan AIoT FaceAI.",
      `Lien ket dat lai mat khau: ${resetUrl}`,
      `Hoac nhap ma token nay trong trang reset: ${resetToken}`,
      "",
      "Token co hieu luc trong 15 phut. Neu ban khong yeu cau, hay bo qua email nay.",
    ].join("\n"),
    html: `
      <p>Xin chao <strong>${username || "ban"}</strong>,</p>
      <p>Ban vua yeu cau dat lai mat khau cho tai khoan AIoT FaceAI.</p>
      <p><a href="${resetUrl}">Dat lai mat khau</a></p>
      <p>Hoac nhap ma token nay trong trang reset:</p>
      <p><code>${resetToken}</code></p>
      <p>Token co hieu luc trong <strong>15 phut</strong>. Neu ban khong yeu cau, hay bo qua email nay.</p>
    `,
  };

  const resendConfig = getResendConfig();
  if (resendConfig) {
    await sendViaResend(resendConfig, payload);
    return;
  }

  const smtpConfig = getSmtpConfig();
  if (!smtpConfig) {
    throw new Error("Mailer is not configured. Set RESEND_API_KEY or SMTP_* variables");
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  await transporter.sendMail({
    from: smtpConfig.from,
    to: toEmail,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}
