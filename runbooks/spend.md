# Spend

**Alert:** a provider's spend alert at 50%, 80% or 100% of the daily or monthly budget.

Rule: nothing that costs money runs for the public without accounts, quotas and the spend guard. Until those exist,
production refuses automatic checks (`AUTH_ENABLED` unset) and no AI key belongs in the production environment.

## Check

1. Which provider, and which key? Each environment has its own key, so the alert says whether it's staging or
   production.
2. In the provider's console, look at usage by hour. A steady rise is growth; a spike is a bug, abuse or a leaked key.
3. Vercel → **Logs**, path `/api/scan`: how many scans, from how many different IP addresses? One address running many
   scans is abuse; requests you can't find in the logs at all mean the key is being used elsewhere.

## Fix

- **At 100%, or anything unexplained:** set `SURFACED_PAUSE_SCANS=1` and redeploy. This stops every automatic call; paste
  and estimate modes keep working.
- **Key used outside the app:** rotate it now ([Key rotation](key-rotation.md)).
- **Abuse from a few addresses:** lower `SCANS_PER_HOUR`; block the addresses in the Vercel Firewall.
- **A bug calling too often:** roll back the deployment, then fix it.
- **Real growth:** raise the budget only after checking the cost per scan still fits the price.

Every provider needs a hard monthly limit and alerts set in its own console before its key goes anywhere: OpenAI
project budget, Anthropic workspace spend limit, Google Cloud budget alerts with quota caps, DeepSeek prepaid balance
with auto top-up off.
