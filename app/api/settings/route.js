import { requireAuth } from "../../lib/sessionAuth";
import {
  buildSettingsError,
  getSettingsData,
  updateSettingsData,
} from "../../lib/settings/settingsService";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const rows = await getSettingsData();

    return Response.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return Response.json(
      {
        success: false,
        message: "Không lấy được cấu hình ngưỡng",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    await updateSettingsData(body);

    return Response.json({
      success: true,
      message: "Cập nhật ngưỡng thành công",
    });
  } catch (error) {
    console.error("POST /api/settings error:", error);
    const failure = buildSettingsError(error);

    return Response.json(
      {
        success: false,
        message: failure.message,
        error: failure.message,
      },
      { status: failure.status }
    );
  }
}