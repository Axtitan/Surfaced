import "server-only";

/* Structured JSON logs. Never log answer text, page text, secrets or full email addresses: everything passes through
   redact() first, which masks values that look like keys, tokens, cookies or auth headers. */

const SECRET_KEYS = /^(authorization|cookie|set-cookie|x-api-key|x-goog-api-key|api[-_]?key|token|secret|password)$/i;
const SECRET_VALUES = [
  /\bsk-[A-Za-z0-9_-]{12,}/g, // OpenAI, Anthropic, DeepSeek style
  /\bAIza[0-9A-Za-z_-]{20,}/g, // Google
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, // JWT
];
const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

export function redactText(s: string): string {
  let out = s;
  for (const re of SECRET_VALUES) out = out.replace(re, "[redacted]");
  return out.replace(EMAIL, "$1***@$2");
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[deep]";
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    if (value instanceof Error) return { name: value.name, message: redactText(value.message) };
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SECRET_KEYS.test(k) ? "[redacted]" : redact(v, depth + 1);
    return out;
  }
  return value;
}

type Level = "info" | "warn" | "error";
export function log(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, msg, at: new Date().toISOString(), ...(redact(fields) as object) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
