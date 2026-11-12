import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

/* The extension bridge (F-03, §12): the content script that passes the listing kit and captured answers between the app
   page and the extension. It must act only on the app's own origin and only on messages the page posted to itself. */

const ROOT = join(__dirname, "..", "..");
const SOURCE = readFileSync(join(ROOT, "extension", "bridge.js"), "utf8");

type Msg = { data: unknown; origin: string; source: unknown };

/** Runs bridge.js in a fake page at `origin` with a fake chrome.storage, and returns handles to drive it. */
function load(origin: string, stored: Record<string, unknown> = {}, source = SOURCE) {
  const posted: { data: Record<string, unknown>; target: string }[] = [];
  const listeners: ((e: Msg) => void)[] = [];
  const store: Record<string, unknown> = { ...stored };
  const win = {
    location: { origin },
    addEventListener: (type: string, fn: (e: Msg) => void) => { if (type === "message") listeners.push(fn); },
    postMessage: (data: Record<string, unknown>, target: string) => posted.push({ data, target }),
  };
  const chrome = {
    storage: {
      local: {
        get: (keys: string[], cb: (v: Record<string, unknown>) => void) => cb(Object.fromEntries(keys.map((k) => [k, store[k]]))),
        set: (v: Record<string, unknown>, cb?: () => void) => { Object.assign(store, v); cb?.(); },
      },
    },
  };
  runInNewContext(source, { window: win, chrome });
  const send = (data: unknown, over: Partial<Msg> = {}) => listeners.forEach((fn) => fn({ data, origin, source: win, ...over }));
  return { posted, listeners, store, send, win };
}

describe("extension bridge", () => {
  it("does nothing on a site that isn't the app", () => {
    const b = load("https://evil.test");
    expect(b.listeners).toHaveLength(0);
    expect(b.posted).toHaveLength(0);
  });

  it("says hello to the app, only to its own origin", () => {
    const b = load("http://localhost:3100");
    expect(b.posted).toEqual([{ data: { source: "surfaced-ext", type: "hello" }, target: "http://localhost:3100" }]);
  });

  it("ignores messages from frames, other origins or other senders", () => {
    const b = load("http://localhost:3100", { captures: [{ provider: "chatgpt", text: "x" }] });
    b.posted.length = 0;
    b.send({ source: "surfaced-app", type: "ping" }, { source: {} });
    b.send({ source: "surfaced-app", type: "ping" }, { origin: "https://evil.test" });
    b.send({ source: "someone-else", type: "ping" });
    b.send({ source: "surfaced-app", type: "captures-request" }, { origin: "http://127.0.0.1:3100" });
    b.send({ source: "surfaced-app", type: "kit", kit: { name: "x" } }, { source: null });
    expect(b.posted).toHaveLength(0);
    expect(b.store.kit).toBeUndefined();
    expect(b.store.captures).toHaveLength(1);
  });

  it("stores only string kit fields, trimmed", () => {
    const b = load("http://localhost:3100");
    b.send({ source: "surfaced-app", type: "kit", kit: { name: "Acme", long: "y".repeat(9000), n: 5, obj: { a: 1 }, ["k".repeat(50)]: "dropped" } });
    const kit = b.store.kit as Record<string, string>;
    expect(Object.keys(kit).sort()).toEqual(["long", "name"]);
    expect(kit.long).toHaveLength(5000);
    expect(b.posted.at(-1)?.data).toEqual({ source: "surfaced-ext", type: "kit-saved" });
  });

  it("hands over captured answers once", () => {
    const b = load("http://localhost:3100", { captures: [{ provider: "chatgpt", text: "answer" }] });
    b.send({ source: "surfaced-app", type: "captures-request" });
    b.send({ source: "surfaced-app", type: "captures-request" });
    const delivered = b.posted.filter((p) => p.data.type === "captures");
    expect(delivered).toHaveLength(1);
    expect(delivered[0].target).toBe("http://localhost:3100");
    expect(b.store.captures).toEqual([]);
  });
});

describe("extension build", () => {
  const run = (...args: string[]) => execFileSync(process.execPath, [join(ROOT, "scripts", "build-extension.mjs"), ...args], { cwd: ROOT, stdio: "pipe" }).toString();

  it("refuses non-https and wildcard origins", () => {
    expect(() => run("http://app.example")).toThrow();
    expect(() => run("https://*.example.com")).toThrow();
  });

  it("writes exactly the given origin into the manifest and the bridge", () => {
    const dist = mkdtempSync(join(tmpdir(), "surfaced-ext-"));
    try {
      run("https://app.example", `--out=${dist}`);
      const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));
      expect(manifest.content_scripts[0].matches).toEqual(["https://app.example/*"]);
      const bridge = readFileSync(join(dist, "bridge.js"), "utf8");
      expect(bridge).toContain('const ALLOWED = ["https://app.example"]; // @origins');
      // The built bridge runs on that origin only.
      expect(load("https://app.example", {}, bridge).listeners).toHaveLength(1);
      expect(load("http://localhost:3100", {}, bridge).listeners).toHaveLength(0);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});
