# Incidents

An incident is anything users can see is broken: the site is down, checks fail for many people, data looks wrong, or a
security problem is suspected.

## Steps

1. **Acknowledge.** Note the time you noticed and what you saw. One person leads; others help when asked.
2. **Tell users within 15 minutes.** Once the status page exists, post there: what's affected, that you're on it, when
   you'll update next. Until then, a line on the changelog or social account is enough. Plain words, no blame, no guesses
   about the cause.
3. **Stop the harm first, then find the cause.** Roll back the last deployment if the problem started with it
   ([Site down](site-down.md)). Use a switch from the [README](README.md) if one part is the problem. A rollback is
   cheap; a long investigation while users are affected is not.
4. **Fix.** Make the fix on a branch, let CI pass, deploy. Check the problem is gone the way a user would.
5. **Close.** Post "resolved" with one sentence on what happened.
6. **Review within 3 days.** A short note: timeline, cause, what stopped it, what will stop it happening again, and any
   follow-up work with an owner. Keep it with the private planning files.

## If data or keys may have leaked

- Rotate the affected keys at once ([Key rotation](key-rotation.md)).
- Today Surfaced stores checks in each user's browser, so a server problem can't expose them. Once accounts exist, a leak
  of personal data has legal deadlines (72 hours to the regulator under GDPR): involve the lawyer the same day.
