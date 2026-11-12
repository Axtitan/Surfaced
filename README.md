# Surfaced

Checks whether ChatGPT, Claude, Gemini and DeepSeek recommend a product or business, and gets it listed on the
sites those assistants read.

**Why it works:** assistants answer "what's the best X" and "alternatives to Y" from sources they trust, and
comparison sites (AlternativeTo, SaaSHub, G2, Capterra…) are among the most cited. Listing a product there as an
alternative to a name the AI already knows puts it next to that name in the answers.

## Pages

- `/`: the landing page. The hero background is `public/hero.webp`, generated with ChatGPT.
- `/app`: the dashboard, listing every website checked in this browser.
- `/app/new`: start a check.
- `/app/p/<domain>`: one check, with tabs for Questions, Answers & score, Get listed and Site fixes.
- `/app/settings`: AI connections, the extension, and data export.

There are no accounts yet. Checks live in the browser's localStorage (`surfaced:projects`, `surfaced:project:<domain>`).

## Two ways to get answers

- **Free (paste-in):** the user asks each question in their own ChatGPT, Claude, Gemini and DeepSeek accounts and pastes
  the answer back. ChatGPT and Claude open with the question already filled in, through the unofficial `?q=` links. For
  Gemini and DeepSeek, the question is copied to the clipboard. Links in the pasted answer, read from the copied HTML or
  markdown, become its sources. Needs no API keys.
- **Automatic:** the APIs, as described below. Each mode scores only its own answers.

Without an Anthropic key the questions come from a template, so the new-check form asks for the category up front.

## How it works

1. **Profile.** We read the homepage (plus robots.txt, llms.txt and the sitemap). Claude writes a profile: name,
   other spellings, category, the competitors AIs already recommend, and 10 questions real buyers ask.
   Everything is editable.
2. **Scan.** Each question goes to each connected AI, the way their apps answer: ChatGPT (Responses API with web
   search), Claude (web search tool), Gemini (Google Search grounding). DeepSeek's API has no web search, so it
   measures what the model already knows. An optional pass with search off shows what each model learned in
   training. Answers vary between runs, so each question can be asked up to three times. The score is the share
   of answers that name the product, averaged across AIs, with a confidence range per AI.
3. **Verdicts you can check.** Matching is deterministic, on the name, its other spellings and the domain. Every
   "named you" comes with the sentence that triggered it and the full answer, plus its position in the list,
   the products named instead, and the sources the AI cited.
4. **Fix plan.**
   - **Where to submit:** destinations from the [Submitlist](https://github.com/alvinunreal/awesome-submitlist)
     catalog (3,477 hand-checked places, CC0), ranked for the product. Comparison sites come first, plus any
     site the AIs actually cited in this scan.
   - **Listing kit:** written once and reused for every submission.
   - **Tracker:** a status for each destination.
   - **Site fixes:** an AI-readiness checklist (crawler access, server-rendered text, JSON-LD, llms.txt,
     sitemap), with a generated llms.txt and JSON-LD.
5. **A few clicks per submission.** "Open next" opens the next destination. The extension in `extension/`
   fills the form from the kit. The user reviews it, does any sign-up or CAPTCHA, and presses submit. We
   never submit on anyone's behalf: most of these sites require an account and a human, and automated
   submissions get listings rejected.

## Run it

```bash
cd products/surfaced
npm install
cp .env.example .env.local   # add the API keys you have
npm run dev                  # http://localhost:3100
```

- **Providers:** any provider without a key shows as "not connected". `SURFACED_DEMO=1` simulates answers for
  them, for UI work only. The UI labels these answers and demo mode is ignored in production.
- **Extension:** in Chrome, open `chrome://extensions`, turn on Developer mode, choose **Load unpacked** and
  pick `extension/`. Before deploying, add the production domain to `content_scripts.matches` in
  `extension/manifest.json`.
- **Catalog refresh:** `npm run sync:destinations` pulls the latest Submitlist catalog (it syncs weekly).

## Cost and limits

- **Default scan:** 10 questions × 4 AIs × 2 tries = 80 answers. Each answer is one API call, and the search-backed
  ones cost the most. Set the price of paid plans with that in mind.
- **Limits:** 6 scans per IP per hour (`SCANS_PER_HOUR`) and 80 answers per scan. The rate limit lives in memory,
  so move it to Redis or Postgres before running more than one server.
- **API answers versus the apps:** API answers approximate what the consumer apps show; they are not identical.
  The apps add personalisation, memory and location.

## Not built yet

- Accounts, billing, and saved history.
- Scheduled re-checks with alerts when visibility changes.
- Shareable report links.
- Perplexity and Copilot as extra providers.
- Pull requests to GitHub awesome lists through a GitHub sign-in.
