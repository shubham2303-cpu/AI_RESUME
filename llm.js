// Thin wrapper around the Anthropic Messages API, called directly from the browser.
// Verified against live docs (2026-06): endpoint, version header, and the
// browser-access opt-in header are all current.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-sonnet-4-6"; // current mid-tier Sonnet — right speed/cost fit
const MAX_TOKENS = 4096;

// Send the tailoring request. Returns the model's text output.
// Throws Error with a human-readable message on any failure.
async function tailorResume({ apiKey, system, userPrompt }) {
  let res;
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        // Required to call the API directly from browser JavaScript (CORS).
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch (networkErr) {
    // Note: never log apiKey anywhere.
    throw new Error(
      "Network error — could not reach the Anthropic API. Check your connection."
    );
  }

  if (!res.ok) {
    throw new Error(await describeHttpError(res));
  }

  const data = await res.json();
  // Messages API returns content as an array of blocks; collect the text blocks.
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) throw new Error("The model returned an empty response. Try again.");
  // Return parsed resume + token usage (for cost display).
  return { data: parseResumeJson(text), usage: data.usage || null };
}

// Pricing for claude-sonnet-4-6 (USD per million tokens). Update if pricing changes.
const PRICING = { inputPerMillion: 3, outputPerMillion: 15 };

// Compute cost from a usage object. Returns null if usage missing.
function estimateCost(usage) {
  if (!usage) return null;
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cost =
    (input / 1e6) * PRICING.inputPerMillion +
    (output / 1e6) * PRICING.outputPerMillion;
  return { input, output, cost };
}

// Parse the model's JSON output defensively (strip any stray fences/prose).
function parseResumeJson(text) {
  let raw = text.trim();
  // Remove code fences if the model wrapped the JSON despite instructions.
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  // Fallback: slice from first { to last } if extra prose leaked in.
  if (!raw.startsWith("{")) {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s !== -1 && e !== -1) raw = raw.slice(s, e + 1);
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    throw new Error(
      "Could not parse the model's response as JSON. Try tailoring again."
    );
  }
}

// Map common HTTP errors to clear messages. Never exposes the key.
async function describeHttpError(res) {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.error?.message ? ` — ${body.error.message}` : "";
  } catch (_) {
    /* body not JSON; ignore */
  }

  if (res.status === 401)
    return "Invalid API key (401). Check your key in Settings.";
  if (res.status === 403)
    return "Access forbidden (403). Your key may lack permission.";
  if (res.status === 429)
    return "Rate limited (429). Wait a moment and try again.";
  if (res.status >= 500)
    return `Anthropic server error (${res.status}). Try again shortly.`;
  return `Request failed (${res.status})${detail}`;
}
