import { requireAuth } from "../../lib/sessionAuth";
import { createFailureResponse, executeCommand } from "../../lib/commands/commandService";

export const runtime = "nodejs";

export async function POST(request) {
  let body = null;

  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    body = await request.json();
    const result = await executeCommand(body);

    return Response.json({
      success: true,
      message: "Gửi lệnh thành công",
      data: result,
    });
  } catch (error) {
    console.error("POST /api/commands error:", error);
    const failure = await createFailureResponse(body, error);

    return Response.json(
      failure.payload,
      { status: failure.status }
    );
  }
}