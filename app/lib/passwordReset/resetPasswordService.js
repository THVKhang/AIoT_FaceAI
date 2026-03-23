import { hashPassword, hashToken, validatePasswordPolicy, verifyHashedToken } from "../auth";
import {
  findActiveResetToken,
  findUserByRecoveryIdentity,
  markResetTokenUsed,
  revokeUserSessions,
  runInTransaction,
  updateUserPassword,
} from "./resetPasswordRepository";

const RESET_METHOD_EMAIL_TOKEN = "token";
const RESET_METHOD_RECOVERY_CODE = "recovery";

export function normalizeResetPayload(body) {
  const resetMethod = String(body?.resetMethod || RESET_METHOD_EMAIL_TOKEN).trim().toLowerCase();
  const resetToken = String(body?.resetToken ?? body?.token ?? "").trim();
  const accountIdentifier = String(body?.accountIdentifier ?? body?.identity ?? "").trim();
  const recoveryCode = String(body?.recoveryCode || "").trim().toUpperCase();
  const newPassword = String(body?.newPassword || "").trim();

  if (!newPassword) {
    throw new Error("Vui lòng nhập mã và mật khẩu mới");
  }

  if (![RESET_METHOD_EMAIL_TOKEN, RESET_METHOD_RECOVERY_CODE].includes(resetMethod)) {
    throw new Error("Phương thức đặt lại mật khẩu không hợp lệ");
  }

  if (resetMethod === RESET_METHOD_RECOVERY_CODE) {
    if (!accountIdentifier || !recoveryCode) {
      throw new Error("Vui lòng nhập tên đăng nhập/email và mã khôi phục");
    }
  } else if (!resetToken) {
    throw new Error("Vui lòng nhập mã đặt lại mật khẩu");
  }

  const passwordCheck = validatePasswordPolicy(newPassword);
  if (!passwordCheck.ok) {
    throw new Error(passwordCheck.message);
  }

  return { resetMethod, resetToken, accountIdentifier, recoveryCode, newPassword };
}

export async function resetPassword(body) {
  const payload = normalizeResetPayload(body);

  await runInTransaction(async (client) => {
    let userId = null;
    let resetTokenId = null;

    if (payload.resetMethod === RESET_METHOD_RECOVERY_CODE) {
      const user = await findUserByRecoveryIdentity(client, payload.accountIdentifier);

      if (!user || !user.recovery_code_hash || !user.recovery_code_created_at) {
        throw new Error("Tài khoản chưa có mã khôi phục");
      }

      const isValidRecoveryCode = verifyHashedToken(payload.recoveryCode, user.recovery_code_hash);
      if (!isValidRecoveryCode) {
        throw new Error("Mã khôi phục không hợp lệ");
      }

      userId = user.id;
    } else {
      const tokenHash = hashToken(payload.resetToken);
      const activeTokenRow = await findActiveResetToken(client, tokenHash);

      if (!activeTokenRow) {
        throw new Error("Mã không hợp lệ hoặc đã hết hạn");
      }

      userId = activeTokenRow.user_id;
      resetTokenId = activeTokenRow.id;
    }

    const passwordHash = hashPassword(payload.newPassword);

    await updateUserPassword(client, userId, passwordHash);

    if (resetTokenId) {
      await markResetTokenUsed(client, resetTokenId);
    }

    await revokeUserSessions(client, userId);
  });
}

export function buildResetPasswordError(error) {
  const reason = String(error?.message || "Đặt lại mật khẩu thất bại");

  const isValidationError =
    reason.includes("Vui lòng nhập mã và mật khẩu mới") ||
    reason.includes("Vui lòng nhập mã đặt lại mật khẩu") ||
    reason.includes("Phương thức đặt lại mật khẩu không hợp lệ") ||
    reason.includes("Vui lòng nhập tên đăng nhập/email và mã khôi phục") ||
    reason.includes("Tài khoản chưa có mã khôi phục") ||
    reason.includes("Mật khẩu phải") ||
    reason.includes("Mã không hợp lệ hoặc đã hết hạn") ||
    reason.includes("Mã khôi phục không hợp lệ");

  return {
    status: isValidationError ? 400 : 500,
    message: reason,
  };
}
