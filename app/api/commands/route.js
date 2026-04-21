import { requireAuth } from "../../lib/sessionAuth";
import { createFailureResponse, executeCommand } from "../../lib/commands/commandService";

export const runtime = "nodejs";

const globalForCommands = globalThis;
if (!globalForCommands.__lastCommandTimes) {
  globalForCommands.__lastCommandTimes = {};
}

export async function POST(request) {
  let body = null;

  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    body = await request.json();
    
    // Rate limiting: 3 seconds per feed
    const feedKey = body?.feed_key;
    if (feedKey) {
      const now = Date.now();
      const lastTime = globalForCommands.__lastCommandTimes[feedKey] || 0;
      if (now - lastTime < 3000) {
        return Response.json({ success: false, message: "Vui lòng thao tác chậm lại, hệ thống đang xử lý lệnh trước đó." }, { status: 429 });
      }
      globalForCommands.__lastCommandTimes[feedKey] = now;
    }

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