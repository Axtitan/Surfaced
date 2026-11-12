import { describe, expect, it } from "vitest";
import { autoRunsAfter, initialScan, isFinished, scanReducer, type ScanEvent, type ScanState } from "@/lib/scan-machine";
import { run } from "./helpers";

const play = (...events: ScanEvent[]) => events.reduce<ScanState>(scanReducer, initialScan);
const done = (stoppedBy: "deadline" | "client" | null = null, skipped = 0): ScanEvent => ({ type: "done", answered: 0, failed: 0, skipped, stoppedBy });

describe("scanReducer", () => {
  it("completes when every answer arrived", () => {
    const s = play({ type: "start" }, { type: "started", total: 2 }, { type: "run", run: run() }, { type: "run", run: run() }, done());
    expect(s.status).toBe("complete");
    expect(isFinished(s.status)).toBe(true);
  });

  it("is partial, with a note, when some failed or time ran out", () => {
    const s = play({ type: "start" }, { type: "started", total: 3 }, { type: "run", run: run() }, { type: "run", run: run({ ok: false }) }, done("deadline", 1));
    expect(s.status).toBe("partial");
    expect(s.note).toMatch(/ran out of time/);
    expect(s.note).toMatch(/2 of 3 answers are missing/);
  });

  it("fails when nothing answered", () => {
    expect(play({ type: "start" }, { type: "run", run: run({ ok: false }) }, done()).status).toBe("failed");
  });

  it("treats a stream that ends without done as cut off, not finished (F-29)", () => {
    expect(play({ type: "start" }, { type: "started", total: 4 }, { type: "run", run: run() }, { type: "stream-ended" }).status).toBe("partial");
    expect(play({ type: "start" }, { type: "stream-ended" }).status).toBe("failed");
  });

  it("cancels from the client and keeps what arrived", () => {
    const s = play({ type: "start" }, { type: "run", run: run() }, { type: "cancel" });
    expect(s.status).toBe("cancelled");
    expect(s.received).toHaveLength(1);
    expect(play({ type: "start" }, { type: "run", run: run() }, done("client")).status).toBe("cancelled");
  });

  it("ignores events that don't apply and a second start while running", () => {
    expect(scanReducer(initialScan, { type: "run", run: run() })).toBe(initialScan);
    const running = play({ type: "start" }, { type: "run", run: run() });
    expect(scanReducer(running, { type: "start" })).toBe(running);
  });

  it("can start again after finishing, clearing the old state", () => {
    const s = play({ type: "start" }, { type: "error", message: "x" }, { type: "start" });
    expect(s).toMatchObject({ status: "running", received: [], error: "" });
  });
});

describe("autoRunsAfter", () => {
  const old = [run({ id: "old" })];
  it("keeps the earlier answers until new ones arrive (F-26)", () => {
    expect(autoRunsAfter(play({ type: "start" }, { type: "error", message: "x" }), old)).toBe(old);
    const fresh = play({ type: "start" }, { type: "run", run: run({ id: "new" }) });
    expect(autoRunsAfter(fresh, old).map((r) => r.id)).toEqual(["new"]);
  });
});
