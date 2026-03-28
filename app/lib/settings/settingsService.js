import {
  fetchGaugeSettings,
  insertSettingsUpdateLog,
  updateGaugeSettings,
} from "./settingsRepository";
import { normalizeSettingsPayload } from "./settingsValidators";

export async function getSettingsData() {
  return fetchGaugeSettings();
}

export async function updateSettingsData(body) {
  const payload = normalizeSettingsPayload(body);

  await updateGaugeSettings(payload);
  await insertSettingsUpdateLog(payload);

  return payload;
}

export function buildSettingsError(error) {
  const reason = String(error?.message || "Cập nhật ngưỡng thất bại");

  const isValidationError =
    reason.includes("Giá trị số không hợp lệ") ||
    reason.includes("Thiếu metric_key") ||
    reason.includes("Ngưỡng không hợp lệ") ||
    reason.includes("Ngưỡng cảnh báo không hợp lệ");

  return {
    status: isValidationError ? 400 : 500,
    message: reason,
  };
}
