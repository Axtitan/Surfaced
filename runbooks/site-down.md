# Site down or erroring

**Alert:** site or app down (2 failed checks from 2 regions), or error rate above 2% of requests for 5 minutes.

## Check

1. Open the site and `/api/health` yourself, from a phone on mobile data as well as your computer.
2. Vercel → **Deployments**: did a deployment go out just before the problem started? Did the latest build fail?
3. Vercel → **Logs**, filter by level `error`: is one path failing, or everything?
4. Vercel's own status page and your domain registrar: is the platform or DNS the problem?

## Fix

- **Started with a deployment:** Deployments → the last good production deployment → **Instant Rollback**. Then fix the
  bug on a branch.
- **One API route failing:** read its error lines. Errors from a site being read or an AI provider are expected now and
  then; many at once usually means an upstream outage ([Checks failing](checks-failing.md)).
- **Platform or DNS outage:** nothing to fix on our side. Post an update and wait; check again every 15 minutes.
- **Domain expired or DNS changed:** renew or restore the records at the registrar. Vercel → Settings → Domains shows the
  records it expects.

## Tell users

"Surfaced is down / some pages aren't loading. We're on it and will update by HH:MM." When fixed: "Fixed at HH:MM. The
cause was … ." Checks saved in browsers are unaffected by a server outage.
