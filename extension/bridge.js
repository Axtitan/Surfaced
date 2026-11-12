// Runs only on the Surfaced app. Receives the listing kit from the page and stores it for the popup.
// The origins below are the only ones trusted (F-03). The development build lists localhost; the production build is
// made by `npm run ext:build -- https://your-app.example` and lists exactly that origin.
(() => {
  const ALLOWED = ["http://localhost:3100", "http://127.0.0.1:3100"]; // @origins
  const here = window.location.origin;
  if (!ALLOWED.includes(here)) return;

  const hello = () => window.postMessage({ source: "surfaced-ext", type: "hello" }, here);
  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== here || e.data?.source !== "surfaced-app") return;
    if (e.data.type === "ping") hello();
    if (e.data.type === "kit" && e.data.kit && typeof e.data.kit === "object") {
      const kit = {};
      for (const [k, v] of Object.entries(e.data.kit)) if (typeof v === "string" && k.length < 40) kit[k] = v.slice(0, 5000);
      chrome.storage.local.set({ kit, savedAt: Date.now() }, () =>
        window.postMessage({ source: "surfaced-ext", type: "kit-saved" }, here)
      );
    }
    // The page asks for answers captured on an AI site (free mode). Each is delivered once, then removed.
    if (e.data.type === "captures-request") {
      chrome.storage.local.get(["captures"], ({ captures }) => {
        const list = Array.isArray(captures) ? captures : [];
        if (!list.length) return;
        chrome.storage.local.set({ captures: [] }, () =>
          window.postMessage({ source: "surfaced-ext", type: "captures", captures: list }, here)
        );
      });
    }
  });
  hello();
})();
