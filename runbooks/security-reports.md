# Security reports

Reports arrive at the address in `SECURITY_CONTACT`, published at `/.well-known/security.txt`.

1. **Reply within 2 working days**, even if only to say it's being looked at. Thank the reporter.
2. **Reproduce it** on a preview or staging deployment, never by testing against other users' data.
3. **Judge the severity:** can it expose user data or keys, cost money, or let someone act as another user? Those are
   urgent: fix first, then follow [Incidents](incidents.md). Missing headers or theoretical issues can wait for the
   normal cycle.
4. **Fix** on a branch with a test that fails before the fix and passes after. If a key may have been exposed, rotate it
   ([Key rotation](key-rotation.md)).
5. **Tell the reporter** when it's fixed, and ask whether they'd like to be credited in the changelog.

Don't threaten or pursue people who report in good faith, even if they went further than they should have. There's no
paid bounty; say so if asked.
