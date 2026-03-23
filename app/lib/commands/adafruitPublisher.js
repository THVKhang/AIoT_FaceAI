export async function publishCommand(feedKey, value) {
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
