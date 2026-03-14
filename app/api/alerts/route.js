import { pool } from "../../lib/db";

export const runtime = "nodejs";

function toNumber(value) {
  if (value === null || value === undefined) return NaN;
  const n = Number(value);
  return Number.isNaN(n) ? NaN : n;
}

export async function GET() {
  try {
    const [gaugeResult, stateResult] = await Promise.all([
      pool.query(`
        SELECT metric_key, display_name, warn_low, warn_high, unit
        FROM gauge_config
      `),
      pool.query(`
        SELECT feed_key, value_num, value_text, updated_at
        FROM current_state
      `),
    ]);

    const gaugeMap = {};
    for (const row of gaugeResult.rows) {
      gaugeMap[row.metric_key] = row;
    }

    const stateMap = {};
    for (const row of stateResult.rows) {
      stateMap[row.feed_key] = row;
    }

    const alerts = [];

    const temp = toNumber(stateMap["sensor-temp"]?.value_num);
    const humid = toNumber(stateMap["sensor-humid"]?.value_num);
    const light = toNumber(stateMap["sensor-light"]?.value_num);
    const motion = toNumber(stateMap["sensor-motion"]?.value_num);
    const faceResult = String(stateMap["faceai-result"]?.value_text || "").trim();

    const tempHigh = toNumber(gaugeMap["sensor-temp"]?.warn_high);
    const humidLow = toNumber(gaugeMap["sensor-humid"]?.warn_low);
    const humidHigh = toNumber(gaugeMap["sensor-humid"]?.warn_high);
    const lightLow = toNumber(gaugeMap["sensor-light"]?.warn_low);

    if (!Number.isNaN(light) && !Number.isNaN(lightLow) && light < lightLow) {
      alerts.push({
        code: "DARK",
        severity: "warning",
        title: "Thiếu sáng",
        message: `Ánh sáng hiện tại ${light} thấp hơn ngưỡng ${lightLow}.`,
        suggested_action: "Bật đèn hoặc kích hoạt auto lighting.",
      });
    }

    if (!Number.isNaN(temp) && !Number.isNaN(tempHigh) && temp > tempHigh) {
      alerts.push({
        code: "HOT",
        severity: "warning",
        title: "Nhiệt độ cao",
        message: `Nhiệt độ hiện tại ${temp}°C vượt ngưỡng ${tempHigh}°C.`,
        suggested_action: "Bật quạt hoặc giảm tải thiết bị.",
      });
    }

    if (!Number.isNaN(humid) && !Number.isNaN(humidLow) && humid < humidLow) {
      alerts.push({
        code: "DRY",
        severity: "warning",
        title: "Độ ẩm thấp",
        message: `Độ ẩm hiện tại ${humid}% thấp hơn ngưỡng ${humidLow}%.`,
        suggested_action: "Kiểm tra môi trường hoặc điều chỉnh thiết bị.",
      });
    }

    if (!Number.isNaN(humid) && !Number.isNaN(humidHigh) && humid > humidHigh) {
      alerts.push({
        code: "HUMID_HIGH",
        severity: "warning",
        title: "Độ ẩm cao",
        message: `Độ ẩm hiện tại ${humid}% vượt ngưỡng ${humidHigh}%.`,
        suggested_action: "Thông gió hoặc kiểm tra cảm biến/thiết bị.",
      });
    }

    const normalizedFace = faceResult.toLowerCase();
    const isUnknownFace =
      normalizedFace === "unknown" ||
      normalizedFace === "" ||
      normalizedFace === "--";

    if (motion === 1 && isUnknownFace) {
      alerts.push({
        code: "ALERT",
        severity: "error",
        title: "Cảnh báo an ninh",
        message: "Phát hiện chuyển động nhưng không nhận diện được người hợp lệ.",
        suggested_action: "Giữ cửa khóa, kiểm tra camera và gửi cảnh báo.",
      });
    } else if (motion === 1) {
      alerts.push({
        code: "VISITOR",
        severity: "info",
        title: "Có người trước cửa",
        message: `Phát hiện chuyển động. Kết quả FaceAI: ${faceResult || "chưa có"}.`,
        suggested_action: "Theo dõi trạng thái cửa và log ra vào.",
      });
    }

    let overallStatus = "NORMAL";
    let overallMessage = "Hệ thống đang hoạt động bình thường.";
    let suggestedAction = "Tiếp tục giám sát dashboard.";

    if (alerts.some((a) => a.code === "ALERT")) {
      overallStatus = "ALERT";
      overallMessage = "Có cảnh báo an ninh cần xử lý ngay.";
      suggestedAction = "Giữ cửa khóa và kiểm tra người trước cửa.";
    } else if (alerts.some((a) => a.code === "HOT")) {
      overallStatus = "HOT";
      overallMessage = "Nhiệt độ đang vượt ngưỡng cho phép.";
      suggestedAction = "Bật quạt hoặc giảm tải hệ thống.";
    } else if (alerts.some((a) => a.code === "DARK")) {
      overallStatus = "DARK";
      overallMessage = "Môi trường hiện tại thiếu sáng.";
      suggestedAction = "Bật đèn hoặc kích hoạt auto lighting.";
    }

    return Response.json({
      success: true,
      data: {
        overall_status: overallStatus,
        overall_message: overallMessage,
        suggested_action: suggestedAction,
        items: alerts,
        evaluated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("GET /api/alerts error:", error);

    return Response.json(
      {
        success: false,
        message: "Không lấy được trạng thái cảnh báo",
        error: error.message,
      },
      { status: 500 }
    );
  }
}