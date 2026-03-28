import { appendMetricHistory } from "../metricHistory";
import {
  buildCommandEvent,
  isSupportedFeed,
  normalizeCommandValue,
  toStateValues,
} from "./feedStrategies";
import { publishCommand } from "./adafruitPublisher";
import {
  insertFailedCommand,
  insertSuccessfulCommand,
  insertSystemEvent,
  upsertCurrentState,
} from "./commandRepository";

function isValidationError(reason) {
  return (
    reason.includes("feed_key không hợp lệ") ||
    reason.includes("Fan phải nằm trong khoảng") ||
    reason.includes("Light phải nằm trong khoảng") ||
    reason.includes("Toggle chỉ nhận")
  );
}

export async function executeCommand(input) {
  const feedKey = String(input?.feed_key || "").trim();
  const rawValue = input?.value;

  if (!isSupportedFeed(feedKey)) {
    throw new Error("feed_key không hợp lệ");
  }

  const value = normalizeCommandValue(feedKey, rawValue);

  await publishCommand(feedKey, value);
  await insertSuccessfulCommand(feedKey, value);

  const stateValues = toStateValues(feedKey, value);
  await upsertCurrentState(feedKey, stateValues.value_num, stateValues.value_text);
  await appendMetricHistory(feedKey, stateValues.value_num, stateValues.value_text);

  const event = buildCommandEvent(feedKey, value);
  await insertSystemEvent(event.eventName, event.details);

  return { feed_key: feedKey, value };
}

export async function createFailureResponse(body, error) {
  const reason = String(error?.message || "Gửi lệnh thất bại");

  if (body?.feed_key && body?.value !== undefined) {
    await insertFailedCommand(body.feed_key, body.value, reason);
  }

  return {
    status: isValidationError(reason) ? 400 : 500,
    payload: {
      success: false,
      message: reason,
      error: reason,
    },
  };
}
