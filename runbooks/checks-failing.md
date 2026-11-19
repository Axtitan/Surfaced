# Checks failing

**Alert:** scan failure rate above 10% over 30 minutes, or one provider's errors or 429s above 20% over 15 minutes.
Today, before accounts exist, this usually shows up as user reports or many `warn` lines for `/api/analyze`,
`/api/cited-pages` or `/api/estimate`.

## Check

1. Vercel → **Logs**, filter by path. Group the errors: is it one AI provider, one kind of site, or every request?
2. For an AI provider: open its status page. 429 means rate limited or out of credit; 401 means the key is wrong or
   revoked; 5xx is their outage.
3. For site reads: are the failures timeouts (slow sites, or our function running out of time) or refusals (robots.txt,
   the deny-list, private addresses)? Refusals are working as designed.

## Fix

- **Provider outage:** nothing to fix. Scans finish as "partial" and say which AI didn't answer; those answers aren't
  counted. If it lasts, set `SURFACED_PAUSE_SCANS=1` so users aren't charged time for failures, and remove it after.
- **Out of credit or rate limited:** check the provider's billing page. Don't raise limits without checking why usage
  rose ([Spend](spend.md)).
- **Key rejected (401):** the key was revoked or rotated without updating Vercel. See [Key rotation](key-rotation.md).
- **Timeouts:** check whether a deployment changed `SCAN_DEADLINE_SECONDS` or the function's maximum duration.

## Tell users

"Checks with [provider] are failing because of a problem on their side. Other AIs are working; answers that failed
aren't counted in your score."
