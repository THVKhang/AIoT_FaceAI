function parseNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error("Giá trị số không hợp lệ");
  }
  return n;
}

export function normalizeSettingsPayload(body) {
  const metricKey = String(body?.metric_key || "").trim();

  if (!metricKey) {
    throw new Error("Thiếu metric_key");
  }

  return {
    metric_key: metricKey,
    min_value: parseNullableNumber(body?.min_value),
    max_value: parseNullableNumber(body?.max_value),
    warn_low: parseNullableNumber(body?.warn_low),
    warn_high: parseNullableNumber(body?.warn_high),
  };
}
