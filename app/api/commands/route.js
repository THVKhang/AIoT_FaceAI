import { pool } from "../../lib/db";
import { appendMetricHistory } from "../../lib/metricHistory";
import { requireRole } from "../../lib/sessionAuth";

export const runtime = "nodejs";

const ALLOWED_FEEDS = {
  "button-door": {
    type: "toggle",
    onEvent: "Door Opened",
    offEvent: "Door Closed",
  },
  "button-light": {
    type: "toggle",
    onEvent: "Light ON",
    offEvent: "Light OFF",
  },
  fan: {
    type: "range",
    event: "Fan Speed Updated",
  },
};

function normalizeValue(feedKey, value) {
  if (feedKey === "fan") {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0 || num > 100) {
      throw new Error("Fan phải nằm trong khoảng 0-100");
    }
    return String(num);
  }

  if (feedKey === "button-door" || feedKey === "button-light") {
    if (!(String(value) === "0" || String(value) === "1")) {
      throw new Error("Toggle chỉ nhận 0 hoặc 1");
    }
    return String(value);
  }

  return String(value);
}

function buildEvent(feedKey, value) {
  const config = ALLOWED_FEEDS[feedKey];

  if (feedKey === "fan") {
    return {
      eventName: config.event,
      details: `fan = ${value}%`,
    };
  }

  return String(value) === "1"
    ? { eventName: config.onEvent, details: `${feedKey} = ${value}` }
    : { eventName: config.offEvent, details: `${feedKey} = ${value}` };
}

async function publishToAdafruit(feedKey, value) {
  const username = process.env.AIO_USERNAME;
  const aioKey = process.env.AIO_KEY;

  if (!username || !aioKey) {
    throw new Error("Thiếu AIO_USERNAME hoặc AIO_KEY trong .env");
  }

  const url = `https://io.adafruit.com/api/v2/${username}/feeds/${feedKey}/data`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AIO-Key": aioKey,
    },
    body: JSON.stringify({ value: String(value) }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Publish Adafruit thất bại: ${response.status} ${text}`);
  }

  return response.json();
}

async function insertFailedCommand(feedKey, value, reason) {
  await pool.query(
    `
      INSERT INTO commands (feed_key, command_value, source, status, created_at)
      VALUES ($1, $2, 'web', 'failed', CURRENT_TIMESTAMP)
    `,
    [feedKey, String(value)]
  );

  await pool.query(
    `
      INSERT INTO system_logs (event_name, source, severity, log_details)
      VALUES ($1, $2, $3, $4)
    `,
    ["Command Failed", "web", "error", `${feedKey}=${value} | ${reason}`]
  );
}

export async function POST(request) {
  try {
    const auth = await requireRole(request, ["admin"]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const feed_key = body?.feed_key;
    const rawValue = body?.value;

    if (!feed_key || !(feed_key in ALLOWED_FEEDS)) {
      return Response.json(
        { success: false, message: "feed_key không hợp lệ" },
        { status: 400 }
      );
    }

    const value = normalizeValue(feed_key, rawValue);

    await publishToAdafruit(feed_key, value);

    await pool.query(
      `
        INSERT INTO commands (feed_key, command_value, source, status, created_at, executed_at)
        VALUES ($1, $2, 'web', 'success', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [feed_key, value]
    );

    const numericFeeds = new Set(["button-door", "button-light", "fan"]);
    const value_num = numericFeeds.has(feed_key) ? Number(value) : null;
    const value_text = numericFeeds.has(feed_key) ? null : String(value);

    await pool.query(
      `
        INSERT INTO current_state (feed_key, value_num, value_text, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (feed_key)
        DO UPDATE SET
          value_num = EXCLUDED.value_num,
          value_text = EXCLUDED.value_text,
          updated_at = CURRENT_TIMESTAMP
      `,
      [feed_key, value_num, value_text]
    );

    await appendMetricHistory(feed_key, value_num, value_text);

    const { eventName, details } = buildEvent(feed_key, value);

    await pool.query(
      `
        INSERT INTO system_logs (event_name, source, severity, log_details)
        VALUES ($1, 'web', 'info', $2)
      `,
      [eventName, details]
    );

    return Response.json({
      success: true,
      message: "Gửi lệnh thành công",
      data: { feed_key, value },
    });
  } catch (error) {
    console.error("POST /api/commands error:", error);

    try {
      const body = await request.clone().json();
      if (body?.feed_key && body?.value !== undefined) {
        await insertFailedCommand(body.feed_key, body.value, error.message);
      }
    } catch {}

    return Response.json(
      {
        success: false,
        message: "Gửi lệnh thất bại",
        error: error.message,
      },
      { status: 500 }
    );
  }
}