function parseNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error("Giá trị số không hợp lệ");
  }
  return n;
}

function validateThresholdRelationship(payload) {
  const { min_value, max_value, warn_low, warn_high } = payload;

  if (min_value !== null && max_value !== null && min_value >= max_value) {
    throw new Error("Ngưỡng không hợp lệ: Min phải nhỏ hơn Max");
  }

  if (warn_low !== null && warn_high !== null && warn_low > warn_high) {
    throw new Error("Ngưỡng cảnh báo không hợp lệ: Warn Low phải nhỏ hơn hoặc bằng Warn High");
  }

  if (min_value !== null && warn_low !== null && warn_low < min_value) {
    throw new Error("Ngưỡng cảnh báo không hợp lệ: Warn Low phải lớn hơn hoặc bằng Min");
  }

  if (max_value !== null && warn_high !== null && warn_high > max_value) {
    throw new Error("Ngưỡng cảnh báo không hợp lệ: Warn High phải nhỏ hơn hoặc bằng Max");
  }
}

export function normalizeSettingsPayload(body) {
  const metricKey = String(body?.metric_key || "").trim();

  if (!metricKey) {
    throw new Error("Thiếu metric_key");
  }

  const payload = {
    metric_key: metricKey,
    min_value: parseNullableNumber(body?.min_value),
    max_value: parseNullableNumber(body?.max_value),
    warn_low: parseNullableNumber(body?.warn_low),
    warn_high: parseNullableNumber(body?.warn_high),
  };

  validateThresholdRelationship(payload);
  return payload;
}
