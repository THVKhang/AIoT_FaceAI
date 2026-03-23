import { generateResetToken } from "../auth";
import { isMailerConfigured, sendPasswordResetEmail } from "../mailer";
import {
  deletePasswordResetTokenByHash,
  findUsersByIdentity,
  insertPasswordResetToken,
} from "./forgotPasswordRepository";

export const FORGOT_PASSWORD_GENERIC_RESPONSE = {
  success: true,
  message: "Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu đã được tạo",
};

export function normalizeForgotPasswordIdentity(body) {
  const accountIdentifier = String(body?.accountIdentifier ?? body?.identity ?? "").trim();
  if (!accountIdentifier) {
    throw new Error("Vui lòng nhập tên đăng nhập hoặc email");
  }
  return accountIdentifier;
}

export async function createForgotPasswordRequest(accountIdentifier) {
  const matchedUsers = await findUsersByIdentity(accountIdentifier);
  if (matchedUsers.length === 0) {
    return;
  }

  const deliveryErrors = [];

  for (const user of matchedUsers) {
    if (!(user.email && isMailerConfigured())) {
      deliveryErrors.push("Mailer chưa được cấu hình hoặc tài khoản không có email");
      continue;
    }

    const generatedResetToken = generateResetToken();
    await insertPasswordResetToken(user.id, generatedResetToken.hash);

    try {
      await sendPasswordResetEmail({
        toEmail: user.email,
        username: user.username,
        resetToken: generatedResetToken.raw,
      });
    } catch (mailError) {
      await deletePasswordResetTokenByHash(generatedResetToken.hash);
      console.error("Forgot password email failed:", mailError);
      deliveryErrors.push(String(mailError?.message || mailError));
    }
  }

  if (deliveryErrors.length > 0) {
    throw new Error(`Không thể gửi email đặt lại mật khẩu: ${deliveryErrors[0]}`);
  }
}
