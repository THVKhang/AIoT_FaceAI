const FEED_DEFINITIONS = {
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

export function isSupportedFeed(feedKey) {
  return Boolean(feedKey && FEED_DEFINITIONS[feedKey]);
}

export function normalizeCommandValue(feedKey, value) {
  if (!isSupportedFeed(feedKey)) {
    throw new Error("feed_key không hợp lệ");
  }

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

export function buildCommandEvent(feedKey, value) {
  const config = FEED_DEFINITIONS[feedKey];

  if (!config) {
    throw new Error("feed_key không hợp lệ");
  }

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

export function toStateValues(feedKey, value) {
  const numericFeeds = new Set(["button-door", "button-light", "fan"]);
  const isNumeric = numericFeeds.has(feedKey);

  return {
    value_num: isNumeric ? Number(value) : null,
    value_text: isNumeric ? null : String(value),
  };
}
