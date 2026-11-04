import { normalizeSettingsPayload } from "../../app/lib/settings/settingsValidators";

describe("normalizeSettingsPayload", () => {
  it("parses numbers and keeps empty values as null", () => {
    expect(
      normalizeSettingsPayload({ metric_key: " sensor-temp ", min_value: "0", max_value: 50, warn_low: "", warn_high: "40" })
    ).toEqual({ metric_key: "sensor-temp", min_value: 0, max_value: 50, warn_low: null, warn_high: 40 });
  });

  it.each([
    [{}, "Thiếu metric_key"],
    [{ metric_key: "a", min_value: "x" }, "Giá trị số không hợp lệ"],
    [{ metric_key: "a", min_value: 10, max_value: 5 }, "Min phải nhỏ hơn Max"],
    [{ metric_key: "a", warn_low: 10, warn_high: 5 }, "Warn Low phải nhỏ hơn"],
    [{ metric_key: "a", min_value: 5, warn_low: 1 }, "Warn Low phải lớn hơn"],
    [{ metric_key: "a", max_value: 5, warn_high: 9 }, "Warn High phải nhỏ hơn"],
  ])("rejects %p", (body, message) => {
    expect(() => normalizeSettingsPayload(body)).toThrow(message);
  });
});
