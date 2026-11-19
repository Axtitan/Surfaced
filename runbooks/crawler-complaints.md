# Crawler complaints

SurfacedBot reads pages when a user asks: the site they enter, the pages AIs cited, listings they check, and the pages
Estimate mode reads. It identifies itself as `SurfacedBot` with a link to `/bot`, obeys robots.txt for each path, goes one
request at a time per site, and never follows links on its own.

## When a site owner complains

1. **Thank them and act the same day.** They're right to ask.
2. **Add their domain to `CRAWL_DENYLIST`** in Vercel (Production, and Preview if they mention it), comma-separated, and
   redeploy. Subdomains are covered. SurfacedBot then treats the site as off limits; users see "not allowed to read".
3. **Tell them** it's done, and that they can also block us themselves for good with:

   ```
   User-agent: SurfacedBot
   Disallow: /
   ```

4. If they report heavy traffic, check Vercel → **Logs** for `/api/cited-pages`, `/api/estimate` and
   `/api/verify-listing` requests naming their domain. Many requests from one user is abuse of our app: lower the rate
   limits and say so in your reply.

Keep the list of denied domains with the private planning files too, so it survives a change of environment.
