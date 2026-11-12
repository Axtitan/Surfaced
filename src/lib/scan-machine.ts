import type { Run } from "./types";

/* The automatic scan as an explicit state machine (ARCHITECTURE §10). Today it runs in the browser over one streamed
   request; with background jobs the same states come from the server, plus "queued".

     idle ──start──▶ running ──done──▶ complete | partial | failed | cancelled
                        │──stream ends without "done"──▶ partial | failed      (cut off by the platform, F-29)
                        │──error──▶ failed
                        └──cancel──▶ cancelled
   Any finished state can start again. Events that don't apply to the current state are ignored. */

export type ScanStatus = "idle" | "running" | "complete" | "partial" | "failed" | "cancelled";

export type ScanState = {
  status: ScanStatus;
  total: number;
  received: Run[];
  error: string;
  /** Plain-language reason for partial and failed states. */
  note: string;
};

export type ScanEvent =
  | { type: "start" }
  | { type: "started"; total: number }
  | { type: "run"; run: Run }
  | { type: "done"; answered: number; failed: number; skipped: number; stoppedBy: "deadline" | "client" | null }
  | { type: "stream-ended" }
  | { type: "error"; message: string }
  | { type: "cancel" };

export const initialScan: ScanState = { status: "idle", total: 0, received: [], error: "", note: "" };

export const isFinished = (s: ScanStatus) => s === "complete" || s === "partial" || s === "failed" || s === "cancelled";

const missingNote = (got: number, total: number) => {
  const missing = Math.max(0, total - got);
  return missing ? `${missing} of ${total} answers are missing; they aren't counted in the score.` : "";
};

export function scanReducer(s: ScanState, e: ScanEvent): ScanState {
  if (e.type === "start") return s.status === "running" ? s : { ...initialScan, status: "running" };
  if (s.status !== "running") return s;
  switch (e.type) {
    case "started":
      return { ...s, total: e.total };
    case "run":
      return { ...s, received: [...s.received, e.run] };
    case "done": {
      const ok = s.received.filter((r) => r.ok).length;
      if (e.stoppedBy === "client") return { ...s, status: "cancelled", note: ok ? `Stopped. ${ok} answers kept.` : "Stopped before any answer came in." };
      if (!ok) return { ...s, status: "failed", note: "No AI answered. Nothing was changed.", error: s.error || "No AI answered." };
      const failed = s.received.length - ok + e.skipped;
      if (!failed) return { ...s, status: "complete", note: "" };
      const why = e.stoppedBy === "deadline" ? "The scan ran out of time. " : "";
      return { ...s, status: "partial", note: why + missingNote(ok, s.total || s.received.length + e.skipped) };
    }
    case "stream-ended": {
      // No "done" line: the connection or the server function was cut off.
      const ok = s.received.filter((r) => r.ok).length;
      if (!ok) return { ...s, status: "failed", error: "The scan was cut off before any answer came in. Try again with fewer questions." };
      return { ...s, status: "partial", note: `The scan was cut off. ${missingNote(ok, s.total)}`.trim() };
    }
    case "error":
      return { ...s, status: "failed", error: e.message };
    case "cancel":
      return { ...s, status: "cancelled", note: s.received.some((r) => r.ok) ? "Stopped. Answers so far are kept." : "Stopped before any answer came in." };
  }
}

/** Which automatic answers to show and keep: the new ones once any arrived, otherwise the previous ones (F-26). */
export function autoRunsAfter(state: ScanState, previous: Run[]): Run[] {
  return state.received.length ? state.received : previous;
}
