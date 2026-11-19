# Security policy (CSP)

The content security policy tells browsers which scripts, styles and connections a page may use. It runs in
report-only mode until `CSP_ENFORCE=1` is set: browsers report what the policy would block, to `/api/csp-report`, and
block nothing.

## Reading reports

Vercel → **Logs**, search `csp violation`. Each line has `directive` (the rule), `blocked` (what it would block) and
`page` (where, without the query string).

- **Expected noise:** browser extensions (`chrome-extension:`, `moz-extension:`), injected ad or translation scripts.
  Ignore these.
- **Real problems:** our own pages, our own domain, or a service we chose (Vercel Analytics). These would break when
  enforced: change the policy in `next.config.ts`, deploy, and watch again.

## Turning enforcement on

After about a week of reports with nothing but expected noise:

1. Set `CSP_ENFORCE=1` for **Preview** first and click through a preview deployment: the landing page, a check, every
   check tab, the free tools, Save as PDF.
2. Then set it for **Production** and redeploy.
3. Watch the logs for an hour.

## If enforcing breaks something

Remove `CSP_ENFORCE` (or set it to anything but `1`) and redeploy. That puts the policy back to report-only at once.
Then find the blocked item in the reports and fix the policy before trying again.
