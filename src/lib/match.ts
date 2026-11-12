/* Decides, from an answer's text and sources, whether it recommends the product.
   Deterministic on purpose: every verdict comes with the sentence that triggered it, so a user can check it. */

// Fold case and diacritics (é -> e) so spellings compare equal; Unicode-aware, any script (§16.5).
export const norm = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
/** norm() plus, for each position in the result, the index in the original text, so evidence quotes the right place. */
export function normWithMap(text: string): { n: string; map: number[] } {
  let n = "";
  const map: number[] = [];
  let i = 0;
  for (const ch of text) {
    const f = norm(ch);
    for (let k = 0; k < f.length; k++) map.push(i);
    n += f;
    i += ch.length;
  }
  map.push(i);
  return { n, map };
}
// Scripts written without spaces between words: match as a substring (F-09).
const NO_SPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Domain roots too generic to count as a mention on their own.
const GENERIC = new Set(["app", "get", "try", "use", "my", "the", "go", "hq", "web", "site", "home", "shop", "store", "online", "best", "free"]);

export type Brand = { name: string; aliases: string[]; domain: string };

export function brandTerms(b: Brand): string[] {
  const terms = new Set<string>();
  for (const t of [b.name, ...b.aliases]) {
    const n = norm(t).trim();
    if (n.length < 2) continue;
    terms.add(n);
    if (n.includes(" ")) { terms.add(n.replace(/\s+/g, "")); terms.add(n.replace(/\s+/g, "-")); }
  }
  const d = norm(b.domain).replace(/^www\./, "");
  if (d) {
    terms.add(d);
    const root = d.split(".")[0].replace(/^(get|try|use|go)(?=[a-z]{4,})/, "").replace(/(app|hq)$/, "");
    if (root.length >= 4 && !GENERIC.has(root)) terms.add(root);
  }
  return [...terms];
}

export function matcher(b: Brand) {
  // Word boundaries are any letter or digit in any script, so a short name can't match inside a longer word.
  const res = brandTerms(b).map((t) => NO_SPACES.test(t) ? new RegExp(esc(t), "u") : new RegExp(String.raw`(?<![\p{L}\p{N}])` + esc(t) + String.raw`(?![\p{L}\p{N}])`, "iu"));
  const domain = norm(b.domain).replace(/^www\./, "");
  return {
    /** Index of the first mention in the original text, or -1. */
    test(text: string) {
      const { n, map } = normWithMap(text);
      let first = -1;
      for (const re of res) {
        const m = re.exec(n);
        if (m && (first < 0 || m.index < first)) first = m.index;
      }
      return first < 0 ? -1 : map[first];
    },
    citesOwnSite(domains: string[]) {
      return !!domain && domains.some((d) => d === domain || d.endsWith(`.${domain}`));
    },
  };
}

/** Product names an answer lists: numbered or bulleted items, headings and bold names, in order. */
export function listedNames(text: string): string[] {
  const out: string[] = [];
  const push = (raw: string) => {
    const s = raw.replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^[\s\d.)#-]+/, "").replace(/[\s:–—\-,.]+$/, "").trim();
    if (s.length < 2 || s.length > 48 || s.split(/\s+/).length > 6) return;
    if (/^(pros|cons|why|best for|price|pricing|features?|summary|verdict|note|tip|bottom line|how|what|when|overview|conclusion|key|option|step)\b/i.test(s)) return;
    if (!out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
  };
  for (const line of text.split(/\r?\n/)) {
    const item = line.match(/^\s*(?:#{1,4}\s*)?(?:\d{1,2}[.)]|[-*•])\s+(.+)$/) ?? line.match(/^\s*#{1,4}\s+(.+)$/);
    if (item) {
      const body = item[1];
      const bold = body.match(/^\*\*([^*]+)\*\*/) ?? body.match(/^\[([^\]]+)\]/);
      push(bold ? bold[1] : body.split(/\s[–—-]\s|:|\s\(/)[0]);
      continue;
    }
    for (const m of line.matchAll(/\*\*([^*\n]{2,48})\*\*/g)) push(m[1]);
  }
  return out;
}

/** The sentence around a match, for showing the user what triggered the verdict. */
export function snippet(text: string, index: number) {
  const start = Math.max(0, text.lastIndexOf("\n", index) + 1, index - 160);
  const endNl = text.indexOf("\n", index);
  const end = Math.min(text.length, endNl < 0 ? text.length : endNl, index + 220);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\*\*/g, "").trim() + (end < text.length ? "…" : "");
}

export function judge(b: Brand, text: string, sourceDomains: string[]) {
  const m = matcher(b);
  const at = m.test(text);
  const names = listedNames(text);
  const ownIdx = names.findIndex((n) => m.test(n) >= 0);
  return {
    mentioned: at >= 0,
    cited: m.citesOwnSite(sourceDomains),
    rank: ownIdx >= 0 ? ownIdx + 1 : null,
    evidence: at >= 0 ? snippet(text, at) : undefined,
    others: names.filter((_, i) => i !== ownIdx).slice(0, 12),
  };
}
