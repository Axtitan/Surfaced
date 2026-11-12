// Runs only on the Surfaced app. Receives the listing kit from the page and stores it for the popup.
(() => {
  const hello = () => window.postMessage({ source: "surfaced-ext", type: "hello" }, window.location.origin);
  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== window.location.origin || e.data?.source !== "surfaced-app") return;
    if (e.data.type === "ping") hello();
    if (e.data.type === "kit" && e.data.kit && typeof e.data.kit === "object") {
      const kit = {};
      for (const [k, v] of Object.entries(e.data.kit)) if (typeof v === "string") kit[k] = v.slice(0, 5000);
      chrome.storage.local.set({ kit, savedAt: Date.now() }, () =>
        window.postMessage({ source: "surfaced-ext", type: "kit-saved" }, window.location.origin)
      );
    }
  });
  hello();
})();
