/* Projects (one per website) live in this browser's localStorage until accounts exist.
   The index holds small summaries so the dashboard and sidebar don't load every answer. */
import type { Analysis, CitedReport, Run } from "./types";
import { ALL_AIS } from "./ais";
import { summarise } from "./score";
import { estimateCheck, type EstimateReport } from "./estimate";

/** paste and auto collect real answers. estimate (experimental) asks no AI: it predicts from pages, and keeps its own
    report so it never touches saved answers. */
export type AnswerMode = "paste" | "auto" | "estimate";
export type Project = {
  id: string; analysis: Analysis; runs: Run[]; mode: AnswerMode; createdAt: number; updatedAt: number; cited?: CitedReport;
  /** Estimate mode: the pages read so far, and pages the user added as evidence for each question. */
  estimate?: EstimateReport;
  evidence?: Record<string, string[]>;
};
/** `estimated` marks a score that came from estimate mode rather than real answers. */
export type ProjectMeta = { id: string; name: string; domain: string; score: number | null; answers: number; updatedAt: number; estimated?: boolean };

const INDEX = "surfaced:projects";
const key = (id: string) => `surfaced:project:${id}`;
export const projectKey = key;
export const CHANGED = "surfaced:projects-changed";

const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export const projectId = (domain: string) => domain.toLowerCase().replace(/^www\./, "").replace(/[^a-z0-9.-]/g, "");

/** The answers that count for the project's current mode (pasted vs automatic), for questions still in the list (F-11). */
export const modeRuns = (p: Pick<Project, "runs" | "mode"> & { analysis?: Pick<Analysis, "prompts"> }) => {
  const live = p.analysis ? new Set(p.analysis.prompts) : null;
  const current = p.runs.filter((r) => !live || live.has(r.prompt));
  const pasted = current.filter((r) => r.via === "paste"), auto = current.filter((r) => r.via !== "paste");
  // Estimate mode has no answers of its own: the other tabs show the real ones the check has, pasted first.
  if (p.mode === "estimate") return pasted.length ? pasted : auto;
  return p.mode === "paste" ? pasted : auto;
};

/** The estimate for a check from everything it holds: all real answers (as evidence), added pages and pages read. */
export const projectEstimate = (p: Pick<Project, "runs" | "analysis" | "evidence" | "estimate">) =>
  estimateCheck({ prompts: p.analysis.prompts, runs: p.runs, added: p.evidence, pages: p.estimate?.pages, competitors: p.analysis.profile.competitors });

export function scoreOf(runs: Run[]) {
  const ok = runs.filter((r) => r.ok);
  if (!ok.length) return null;
  const used = ALL_AIS.filter((id) => ok.some((r) => r.provider === id));
  return summarise(runs, used).score;
}

function migrate() {
  const last = read<{ analysis?: Analysis; runs?: Run[]; at?: number } | null>("surfaced:last", null);
  if (!last?.analysis) return;
  try { localStorage.removeItem("surfaced:last"); } catch { /* ignore */ }
  const id = projectId(last.analysis.profile.domain);
  if (read(key(id), null)) return;
  saveProject({ id, analysis: last.analysis, runs: last.runs ?? [], mode: "auto", createdAt: last.at ?? Date.now(), updatedAt: last.at ?? Date.now() });
}

export function listProjects(): ProjectMeta[] {
  migrate();
  return read<ProjectMeta[]>(INDEX, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Project | null {
  migrate();
  return read<Project | null>(key(id), null);
}

export function saveProject(p: Project) {
  const ok = write(key(p.id), p);
  const mine = modeRuns(p);
  const estimated = p.mode === "estimate";
  const meta: ProjectMeta = {
    id: p.id, name: p.analysis.profile.name, domain: p.analysis.profile.domain, answers: mine.filter((r) => r.ok).length, updatedAt: p.updatedAt,
    score: estimated ? projectEstimate(p).score : scoreOf(mine), ...(estimated ? { estimated: true } : {}),
  };
  write(INDEX, [meta, ...read<ProjectMeta[]>(INDEX, []).filter((m) => m.id !== p.id)]);
  window.dispatchEvent(new Event(CHANGED));
  return ok;
}

export function deleteProject(id: string) {
  try {
    localStorage.removeItem(key(id));
    localStorage.removeItem(`surfaced:kit:${id}`);
    localStorage.removeItem(`surfaced:track:${id}`);
    localStorage.removeItem(`surfaced:live:${id}`);
  } catch { /* ignore */ }
  write(INDEX, read<ProjectMeta[]>(INDEX, []).filter((m) => m.id !== id));
  window.dispatchEvent(new Event(CHANGED));
}

/** Listings marked submitted or live for a project. */
export function submittedCount(id: string) {
  return Object.values(read<Record<string, string>>(`surfaced:track:${id}`, {})).filter((s) => s === "submitted" || s === "live").length;
}

/** Removes every check, kit and tracker this app saved in this browser. */
export function clearAll() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith("surfaced:")) keys.push(k); }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
  window.dispatchEvent(new Event(CHANGED));
}

/** Rough share of this browser's storage that Surfaced uses, for the storage warning (F-12). */
export function storageBytes() {
  let n = 0;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) ?? ""; if (k.startsWith("surfaced:")) n += k.length + (localStorage.getItem(k)?.length ?? 0); } } catch { /* ignore */ }
  return n * 2;
}

export function exportAll() {
  return listProjects().map((m) => getProject(m.id)).filter(Boolean);
}
