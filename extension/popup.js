const LABELS = { name: "Name", url: "Website", tagline: "Tagline", shortDescription: "Short description", longDescription: "Full description", keywords: "Tags", pricing: "Pricing", platforms: "Platforms", alternativeTo: "Alternative to", email: "Email", logoUrl: "Logo URL", twitter: "X / Twitter" };

// Injected into the submission page. Must be self-contained: it is serialised by chrome.scripting.
function fillPage(kit) {
  const RULES = [
    ["email", /e-?mail/],
    ["twitter", /twitter|x handle|x\.com|x username/],
    ["logoUrl", /logo|icon|image url/],
    ["alternativeTo", /alternative|competitor|similar to|compared? (to|with)/],
    ["tagline", /tagline|slogan|one.?liner|headline|catch.?phrase|subtitle/],
    ["shortDescription", /short.?desc|summary|excerpt|brief|pitch|meta.?desc|elevator/],
    ["longDescription", /desc|about|details|tell us|overview|what does|explain/],
    ["keywords", /tags?\b|keyword|categor/],
    ["pricing", /pric|cost|plan type|business model/],
    ["platforms", /platform|operating system|\bos\b/],
    ["url", /website|url|link|homepage|domain|\bsite\b/],
    ["name", /(product|app|tool|startup|company|project|software|listing|business|brand)?.?(name|title)/],
  ];
  const PERSON = /\b(your|full|first|last|contact|author|maker|founder|user|submitter)\b.?(name)/;
  const labelText = (el) => {
    const parts = [el.name, el.id, el.placeholder, el.getAttribute("aria-label"), el.getAttribute("autocomplete"), el.getAttribute("data-testid")];
    if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) parts.push(l.textContent); }
    const wrap = el.closest("label"); if (wrap) parts.push(wrap.textContent);
    const by = el.getAttribute("aria-labelledby"); if (by) by.split(/\s+/).forEach((id) => parts.push(document.getElementById(id)?.textContent));
    if (parts.filter(Boolean).length < 2) { const prev = el.parentElement?.previousElementSibling; if (prev) parts.push(prev.textContent); }
    return parts.filter(Boolean).join(" ").toLowerCase().replace(/\s+/g, " ").slice(0, 300);
  };
  const setValue = (el, value) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.style.outline = "2px solid #138a52";
    el.style.outlineOffset = "1px";
  };
  const used = new Set();
  const filled = [];
  const els = [...document.querySelectorAll("input, textarea")].filter((el) => {
    if (el.disabled || el.readOnly || el.value) return false;
    if (el instanceof HTMLInputElement && !["text", "url", "email", "", "tel"].includes(el.type)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  });
  for (const el of els) {
    const d = labelText(el);
    if (!d || /search|captcha|password|coupon|promo code|card|cvc|iban/.test(d)) continue;
    for (const [key, re] of RULES) {
      if (!re.test(d)) continue;
      if (key === "name" && PERSON.test(d)) break;
      let k = key;
      if (k === "longDescription" && !(el instanceof HTMLTextAreaElement)) k = "shortDescription";
      if (k === "url" && el.type === "email") k = "email";
      if (el.type === "email" && k !== "email") continue;
      const value = kit[k];
      if (!value) break;
      if (used.has(k) && !["keywords"].includes(k)) break;
      setValue(el, value);
      used.add(k);
      filled.push(k);
      break;
    }
  }
  if (filled.length) document.querySelector("input[style*='138a52'], textarea[style*='138a52']")?.scrollIntoView({ block: "center", behavior: "smooth" });
  return filled;
}

// Injected into an AI chat page. Self-contained. Returns the latest answer (or the user's selection) and its links.
function readAnswer() {
  const host = location.hostname;
  const pick = (sels) => { for (const s of sels) { const all = document.querySelectorAll(s); if (all.length) return all[all.length - 1]; } return null; };
  const sel = window.getSelection();
  let el = null;
  let text = sel && String(sel).trim().length > 40 ? String(sel).trim() : "";
  if (!text) {
    el = /chatgpt\.com$/.test(host) ? pick(['[data-message-author-role="assistant"]'])
      : /claude\.ai$/.test(host) ? pick([".font-claude-response", "[data-is-streaming] .font-claude-message", ".font-claude-message"])
      : /gemini\.google\.com$/.test(host) ? pick(["model-response message-content", "model-response", ".model-response-text"])
      : /chat\.deepseek\.com$/.test(host) ? pick([".ds-markdown"])
      : null;
    text = el ? el.innerText.trim() : "";
  }
  const scope = el || (sel && sel.rangeCount ? sel.getRangeAt(0).cloneContents() : null);
  const links = scope ? [...scope.querySelectorAll("a[href]")].map((a) => ({ url: a.href, title: (a.textContent || "").trim().slice(0, 200) })).filter((l) => /^https?:/.test(l.url)).slice(0, 40) : [];
  return { text: text.slice(0, 60000), links };
}

const AI_SITES = { "chatgpt.com": "chatgpt", "claude.ai": "claude", "gemini.google.com": "gemini", "chat.deepseek.com": "deepseek" };
const $ = (id) => document.getElementById(id);

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  let host = "";
  try { host = new URL(tab?.url || "").hostname; } catch { /* not a web page */ }
  const provider = AI_SITES[host];
  if (!provider) return;
  $("capture").hidden = false;
  $("grab").onclick = async () => {
    try {
      const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readAnswer });
      const a = res?.result;
      if (!a?.text) { $("capstatus").textContent = "No answer found. Select the answer text, then try again."; return; }
      const { captures } = await chrome.storage.local.get(["captures"]);
      const list = (Array.isArray(captures) ? captures : []).slice(-19);
      list.push({ provider, text: a.text, links: a.links, at: Date.now() });
      await chrome.storage.local.set({ captures: list });
      $("capstatus").textContent = "Sent. Switch to your Surfaced tab to review and save it.";
    } catch {
      $("capstatus").textContent = "This page can't be read. Copy the answer and paste it into Surfaced instead.";
    }
  };
});
chrome.storage.local.get(["kit"], ({ kit }) => {
  if (!kit) return;
  $("who").textContent = `Kit for ${kit.name || kit.url}. Open a submission page, then fill it.`;
  $("fill").disabled = false;
  for (const [k, label] of Object.entries(LABELS)) {
    if (!kit[k]) continue;
    const row = document.createElement("div");
    row.className = "row";
    const s = document.createElement("span"); s.textContent = `${label}: ${kit[k]}`;
    const a = document.createElement("a"); a.textContent = "copy";
    a.onclick = async () => { await navigator.clipboard.writeText(kit[k]); a.textContent = "copied"; setTimeout(() => (a.textContent = "copy"), 1000); };
    row.append(s, a);
    $("fields").append(row);
  }
  $("fill").onclick = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fillPage, args: [kit] });
      const n = res?.result?.length ?? 0;
      $("status").textContent = n ? `Filled ${n} field${n > 1 ? "s" : ""}. Check them, add anything missing, then submit.` : "No matching empty fields found. Use the copy links below.";
    } catch (e) {
      $("status").textContent = "This page can't be filled (browser pages and some sites block extensions). Use the copy links below.";
    }
  };
});
