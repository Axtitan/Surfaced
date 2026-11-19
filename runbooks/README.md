# Runbooks

What to do when something goes wrong, one page per problem. Each page says what the problem means, how to check it, how
to fix it and what to tell users. No secrets belong here: name a key, never paste one.

| Page | Use it when |
|---|---|
| [Incidents](incidents.md) | Anything users can see is broken. Start here |
| [Site down or erroring](site-down.md) | Pages or `/api/health` fail, or many requests return 500 |
| [Checks failing](checks-failing.md) | Scans, site reads or cited-page reads fail for many users |
| [Spend](spend.md) | An AI provider's spend alert fires, or costs look wrong |
| [Key rotation](key-rotation.md) | Every 90 days, and at once if a key may have leaked |
| [Security policy (CSP)](csp.md) | CSP reports appear, or enforcing the policy broke a page |
| [Crawler complaints](crawler-complaints.md) | A site owner asks SurfacedBot to stop reading their site |
| [Security reports](security-reports.md) | Someone reports a vulnerability |

Pages for alerts that need parts not built yet (webhooks, sign-in anomalies, queue lag, backups) are written when those
parts are.

## Where to look

- **Logs:** Vercel → the project → **Logs**. Every API request logs one JSON line, `{"level":"info","msg":"request",
  "requestId":…,"path":…,"status":…,"ms":…}`. Errors log `level: "error"` with the same `requestId`. Search for the id a
  user quotes from an error screen.
- **Deployments:** Vercel → **Deployments**. Any earlier production deployment can be put back with **Instant Rollback**.
- **CI:** GitHub → `Axtitan/Surfaced` → **Actions**.
- **Health:** `GET /api/health` answers `{"ok":true}` while the app runs.

## Switches

Set in Vercel → **Settings → Environment Variables** for Production, then redeploy (Deployments → ⋯ → Redeploy).

| Variable | Effect |
|---|---|
| `SURFACED_PAUSE_SCANS=1` | Stops every automatic AI call at once. Paste mode and Estimate mode keep working |
| `AUTH_ENABLED` | Unset in production: automatic checks are refused. Set to `1` only once accounts, quotas and the spend guard exist |
| `CRAWL_DENYLIST` | Comma-separated domains SurfacedBot never reads (subdomains included) |
| `CSP_ENFORCE=1` | Enforces the content security policy. Remove to go back to report-only |
| `SCANS_PER_HOUR`, `MAX_SCAN_USD` | Per-user scan rate and the cost ceiling for one scan |
