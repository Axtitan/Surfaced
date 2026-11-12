import { matcher, type Brand } from "./match";

/* Checks on questions and competitor names (ARCHITECTURE §9.2, §13.1, §13.2). Text from websites, AIs and users is data:
   these checks make sure what comes back from the profile builder, or what a user asks us to send to paid AIs,
   still looks like a buyer question and nothing else. */

const URLISH = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|ai|app|co|dev|xyz|me|info|biz)\b)/i;
const INSTRUCTION = /\b(ignore (all |any |the )?(previous|prior|above)|system prompt|you are (now )?an? |disregard|instructions?:|jailbreak|developer mode|<\/?script|```)/i;

/** Why a question is refused for sending to the AIs, or null if it's fine. */
export function questionProblem(q: string): string | null {
  const t = q.trim();
  if (t.length < 8) return "is too short";
  if (t.length > 300) return "is longer than 300 characters";
  if (t.split(/\s+/).length > 60) return "is too long to be a buyer question";
  if (URLISH.test(t)) return "contains a link";
  if (INSTRUCTION.test(t)) return "looks like instructions rather than a question";
  return null;
}

/** Profile builder output: a question is kept only if it passes the checks, is 10–200 characters and doesn't name the brand. */
export function cleanQuestions(list: string[], brand: Brand): string[] {
  const m = matcher(brand);
  const seen = new Set<string>();
  return list
    .map((q) => q.replace(/\s+/g, " ").trim())
    .filter((q) => q.length >= 10 && q.length <= 200 && !questionProblem(q) && m.test(q) < 0)
    .filter((q) => !seen.has(q.toLowerCase()) && (seen.add(q.toLowerCase()), true));
}

/** Competitor names: no URLs, at most 60 characters, no instruction-like text, not the brand itself. */
export function cleanCompetitors(list: string[], brand: Brand): string[] {
  const m = matcher(brand);
  const seen = new Set<string>();
  return list
    .map((c) => c.replace(/\s+/g, " ").trim())
    .filter((c) => c.length >= 2 && c.length <= 60 && !/https?:\/\/|www\./i.test(c) && !INSTRUCTION.test(c) && m.test(c) < 0)
    .filter((c) => !seen.has(c.toLowerCase()) && (seen.add(c.toLowerCase()), true));
}

/** Plain short text field from the model: strip links and instruction-like text, cap length. */
export function cleanField(s: string, max: number): string {
  const t = s.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
  return INSTRUCTION.test(t) ? "" : t.slice(0, max);
}
