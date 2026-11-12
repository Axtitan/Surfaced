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

const $ = (id) => document.getElementById(id);
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
