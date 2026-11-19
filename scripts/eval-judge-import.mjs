#!/usr/bin/env node
/* Turns a Surfaced export (Settings → "Export all checks") into unlabelled judge-eval cases.

   npm run eval:judge:import -- surfaced-checks-2026-11-17.json

   Writes evals/judge/private/pasted-<date>.json, which git ignores: real answers can hold other people's text and your
   customers' names, so they stay on this machine. Each case starts with "mentioned": null. Label it by reading the
   answer yourself (true or false, and the 1-based position if the answer lists products), not by copying what the app
   said: the point is to check the app. Unlabelled cases are skipped by `npm run eval:judge`. */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error("Usage: npm run eval:judge:import -- <export.json>");
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, "utf8"));
const projects = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : [];
const cases = [];
const seen = new Set();
for (const p of projects) {
  const profile = p?.analysis?.profile;
  if (!profile?.name) continue;
  const brand = { name: String(profile.name), aliases: (profile.aliases ?? []).map(String), domain: String(profile.domain ?? "") };
  for (const r of p.runs ?? []) {
    const text = typeof r?.text === "string" ? r.text.trim() : "";
    if (!r?.ok || text.length < 20 || seen.has(text)) continue;
    seen.add(text);
    cases.push({ id: `${profile.domain}-${r.provider}-${cases.length + 1}`, brand, text, mentioned: null, rank: null, source: r.via === "paste" ? "pasted" : "api" });
  }
}

if (!cases.length) {
  console.error("No answers found in that file. Is it a Surfaced export?");
  process.exit(1);
}
const dir = join(process.cwd(), "evals", "judge", "private");
mkdirSync(dir, { recursive: true });
const out = join(dir, `pasted-${new Date().toISOString().slice(0, 10)}.json`);
if (existsSync(out)) {
  console.error(`${out} already exists; label or move it first.`);
  process.exit(1);
}
writeFileSync(out, JSON.stringify({ about: "Real answers to label by hand. Set mentioned (true/false) and rank (1-based position in the answer's list, or null).", cases }, null, 2) + "\n");
console.log(`Wrote ${cases.length} answers to label: ${out}`);
