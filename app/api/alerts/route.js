import { requireAuth } from "../../lib/sessionAuth";
import { getAlertSnapshot } from "../../lib/alerts/alertService";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const snapshot = await getAlertSnapshot();

    return Response.json({
      success: true,
      data: snapshot,
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