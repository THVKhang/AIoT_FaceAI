import { appendMetricHistory } from "../../../lib/metricHistory";
import { upsertCurrentState } from "../../../lib/commands/commandRepository";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/adafruit
 * 
 * Endpoint to receive webhook payloads from Adafruit IO.
 * Useful for when the local Python bridge is not running.
 * 
 * To set up on Adafruit IO:
 * 1. Go to Adafruit IO Actions -> New Action -> Webhook
 * 2. Set Webhook URL to: https://YOUR-DOMAIN.vercel.app/api/webhooks/adafruit?feed=FEED_KEY
 * 3. Or rely on the payload containing the feed key.
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Security: Verify webhook secret token
    const WEBHOOK_SECRET = process.env.ADAFRUIT_WEBHOOK_SECRET;
    if (WEBHOOK_SECRET) {
      const providedSecret = searchParams.get("secret") || request.headers.get("x-webhook-secret");
      if (providedSecret !== WEBHOOK_SECRET) {
        return Response.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));

    // Extract feed key from multiple possible Adafruit IO payload formats
    const feedKey = 
      searchParams.get("feed") || 
      body?.feed_key || 
      body?.feed?.key || 
      body?.stream_id;

    const value = body?.value;

    if (!feedKey || value === undefined) {
      return Response.json(
        { success: false, error: "Thiếu feed_key hoặc value trong webhook payload." },
        { status: 400 }
      );
    }

    // Determine numeric vs text value
    const parsedNum = Number(value);
    const isNumeric = !Number.isNaN(parsedNum) && String(value).trim() !== "";
    
    const valueNum = isNumeric ? parsedNum : null;
    const valueText = !isNumeric ? String(value) : null;

    // Update current state
    await upsertCurrentState(feedKey, valueNum, valueText);

    // Append to history (for graphs)
    await appendMetricHistory(feedKey, valueNum, valueText);

    return Response.json({
      success: true,
      message: `Webhook processed for ${feedKey}`,
      data: { valueNum, valueText }
    });
  } catch (error) {
    console.error("Adafruit Webhook Error:", error);
    return Response.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
