// Builds the extension for one exact app origin (F-03): `npm run ext:build -- https://surfaced.example`
// Writes extension-dist/ (ignored by git). Load that folder in chrome://extensions, or zip it for the Chrome Web Store.
// Add --with-localhost to keep the development origins as well, and --out=<folder> to write somewhere else.
import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const withLocal = args.includes("--with-localhost");
const outArg = args.find((a) => a.startsWith("--out="))?.slice(6);
const origins = args.filter((a) => !a.startsWith("--")).map((a) => {
  const u = new URL(a);
  if (u.protocol !== "https:") throw new Error(`Production origins must be https: ${a}`);
  if (u.hostname.includes("*")) throw new Error("Wildcards are not allowed; give the exact host.");
  return u.origin;
});
if (!origins.length) {
  console.error("Usage: npm run ext:build -- https://your-app.example [more origins] [--with-localhost]");
  process.exit(1);
}
const local = ["http://localhost:3100", "http://127.0.0.1:3100"];
const all = [...origins, ...(withLocal ? local : [])];

const src = new URL("../extension/", import.meta.url);
const out = outArg ? pathToFileURL(outArg.replace(/[\\/]*$/, "/")) : new URL("../extension-dist/", import.meta.url);
await rm(out, { recursive: true, force: true });
await cp(src, out, { recursive: true });

const manifest = JSON.parse(await readFile(new URL("manifest.json", out), "utf8"));
manifest.content_scripts[0].matches = all.map((o) => `${o}/*`);
await writeFile(new URL("manifest.json", out), JSON.stringify(manifest, null, 2) + "\n");

const bridge = await readFile(new URL("bridge.js", out), "utf8");
const line = /const ALLOWED = \[[^\]]*\]; \/\/ @origins/;
if (!line.test(bridge)) throw new Error("bridge.js: allow-list marker not found");
await writeFile(new URL("bridge.js", out), bridge.replace(line, `const ALLOWED = ${JSON.stringify(all)}; // @origins`));

console.log(`${outArg ?? "extension-dist/"} built for: ${all.join(", ")}`);
