"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { initialScan, scanReducer, type ScanEvent } from "@/lib/scan-machine";
import type { Run } from "@/lib/types";

export type ScanRequest = {
  brand: { name: string; aliases: string[]; domain: string; competitors: string[] };
  prompts: string[];
  providers: string[];
  samples: number;
  memory: boolean;
};

/** Runs one automatic scan at a time over the NDJSON stream and reports it through the scan state machine.
    Leaving the page aborts the request, which stops the server's provider calls (F-28). */
export function useScan(onFinish: (received: Run[]) => void) {
  const [state, dispatch] = useReducer(scanReducer, initialScan);
  const abort = useRef<AbortController | null>(null);
  const active = useRef(false);
  const finish = useRef(onFinish);
  useEffect(() => { finish.current = onFinish; });

  // Abort on unmount, and warn before closing the tab while a scan runs.
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (state.status !== "running") return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.status]);

  const start = useCallback(async (req: ScanRequest) => {
    if (active.current) return; // double-click guard
    active.current = true;
    const ac = new AbortController();
    abort.current = ac;
    const received: Run[] = [];
    let sawDone = false;
    const send = (e: ScanEvent) => dispatch(e);
    send({ type: "start" });
    try {
      const res = await fetch("/api/scan", { method: "POST", signal: ac.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || "The scan failed to start.");
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          let msg: { type: string; [k: string]: unknown };
          try { msg = JSON.parse(line); } catch { continue; }
          if (msg.type === "start") send({ type: "started", total: Number(msg.total) || 0 });
          else if (msg.type === "run") { const run = { ...(msg.run as Run), via: "api" as const }; received.push(run); send({ type: "run", run }); }
          else if (msg.type === "done") { sawDone = true; send(msg as Extract<ScanEvent, { type: "done" }>); }
        }
      }
      if (!sawDone) send({ type: "stream-ended" });
    } catch (err) {
      if ((err as Error).name === "AbortError") send({ type: "cancel" });
      else send({ type: "error", message: (err as Error).message });
    } finally {
      active.current = false;
      abort.current = null;
      if (!ac.signal.aborted || received.length) finish.current(received);
    }
  }, []);

  const stop = useCallback(() => abort.current?.abort(), []);
  return { state, start, stop, running: state.status === "running" };
}
