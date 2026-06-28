// Thin wrapper around Anthropic and OpenAI APIs, called directly from the browser.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_PRICING = { inputPerMillion: 3, outputPerMillion: 15 };

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-5.1-mini";
const OPENAI_PRICING = { inputPerMillion: 2.5, outputPerMillion: 10 };

const MAX_TOKENS = 4096;

// Send the tailoring request. Returns the model's text output.
// Throws Error with a human-readable message on any failure.
async function tailorResume({ apiKey, system, userPrompt, provider = "anthropic" }) {
  return provider === "openai"
    ? tailorWithOpenAI({ apiKey, system, userPrompt })
    : tailorWithAnthropic({ apiKey, system, userPrompt });
}

async function tailorWithAnthropic({ apiKey, system, userPrompt }) {
  let res;
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch (_) {
    throw new Error("Network error — could not reach the Anthropic API. Check your connection.");
  }

  if (!res.ok) throw new Error(await describeHttpError(res, "anthropic"));

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) throw new Error("The model returned an empty response. Try again.");
  return { data: parseResumeJson(text), usage: { provider: "anthropic", ...data.usage } };
}

async function tailorWithOpenAI({ apiKey, system, userPrompt }) {
  let res;
  try {
    res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch (_) {
    throw new Error("Network error — could not reach the OpenAI API. Check your connection.");
  }

  if (!res.ok) throw new Error(await describeHttpError(res, "openai"));

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() || "";

  if (!text) throw new Error("The model returned an empty response. Try again.");
  return {
    data: parseResumeJson(text),
    usage: {
      provider: "openai",
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
    },
  };
}

// Compute cost from a usage object. Returns null if usage missing.
function estimateCost(usage) {
  if (!usage) return null;
  const pricing = usage.provider === "openai" ? OPENAI_PRICING : ANTHROPIC_PRICING;
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cost =
    (input / 1e6) * pricing.inputPerMillion +
    (output / 1e6) * pricing.outputPerMillion;
  return { input, output, cost };
}

// Parse the model's JSON output defensively (strip any stray fences/prose).
function parseResumeJson(text) {
  let raw = text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  if (!raw.startsWith("{")) {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s !== -1 && e !== -1) raw = raw.slice(s, e + 1);
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    throw new Error("Could not parse the model's response as JSON. Try tailoring again.");
  }
}

// Map common HTTP errors to clear messages. Never exposes the key.
async function describeHttpError(res, provider) {
  const name = provider === "openai" ? "OpenAI" : "Anthropic";
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.error?.message ? ` — ${body.error.message}` : "";
  } catch (_) {
    /* body not JSON; ignore */
  }

  if (res.status === 401) return `Invalid API key (401). Check your ${name} key in Settings.`;
  if (res.status === 403) return `Access forbidden (403). Your ${name} key may lack permission.`;
  if (res.status === 429) return "Rate limited (429). Wait a moment and try again.";
  if (res.status >= 500) return `${name} server error (${res.status}). Try again shortly.`;
  return `Request failed (${res.status})${detail}`;
}
