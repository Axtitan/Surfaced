# Key rotation

Rotate every key every 90 days, and at once if a key may have leaked (pasted in a chat, committed, shown on screen,
used from somewhere unexpected). Record the date of each rotation with the private planning files.

## The keys

| Key | Where it's made | Where it's set |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Console → API keys (one workspace per environment) | Vercel env vars, per environment |
| `OPENAI_API_KEY` | OpenAI platform → project → API keys (one project per environment) | Vercel env vars, per environment |
| `GEMINI_API_KEY` | Google AI Studio or Google Cloud → credentials (one project per environment) | Vercel env vars, per environment |
| `DEEPSEEK_API_KEY` | DeepSeek platform → API keys | Vercel env vars, per environment |
| Supabase, Upstash, Resend, Sentry, Turnstile, Inngest keys | Each service's dashboard | Added to this table when the code that uses them is built |

None of these is ever set in a variable starting `NEXT_PUBLIC_` (those are sent to browsers), committed, or logged.
`.env.example` lists names only.

## Rotating without downtime

1. **Create the new key** in the provider's console. Name it with the environment and date, for example
   `surfaced-production-2026-11`. Use a restricted key if the provider offers one.
2. **Set it in Vercel:** Settings → Environment Variables → edit the variable for that one environment → save.
3. **Redeploy** that environment (Deployments → ⋯ → Redeploy). Server variables are read when the function starts, so
   the new key is used once the deployment is live.
4. **Check** the new key works: run one check on staging, or watch the provider's usage page for the new key.
5. **Revoke the old key** in the provider's console.
6. **If it leaked:** look at the provider's usage for the old key since the leak and note anything you didn't cause. If
   it was committed, rotating is the fix; rewriting git history doesn't help once the key has been pushed.

## Leaked in a commit

GitHub push protection should block it. If one gets through: rotate first, then remove it from the code in a normal
commit, then check gitleaks in CI passes.
