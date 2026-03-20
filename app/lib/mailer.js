import nodemailer from "nodemailer";

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
  return Boolean(getSmtpConfig());
}

export async function sendPasswordResetEmail({ toEmail, username, resetToken }) {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("SMTP mailer is not configured");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const appBaseUrl =
    String(process.env.APP_BASE_URL || "").trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await transporter.sendMail({
    from: config.from,
    to: toEmail,
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
  });
}
