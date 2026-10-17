# Orphaned hub PostRefs: production runbook

The error log fills up with `Post not found in ThreadStead database: <id>`. Each of those is a RingHub PostRef that points at a ThreadStead post that has been deleted. Until July 2026 (hub commit e46efaf), deleting a post never reached the hub, so older deletions left these refs behind. See FUTURE_IMPROVEMENTS.md A3.

Who owns what: the hub owns PostRefs, and ThreadStead owns posts. The script reads both sides. It changes the hub only through the hub's own `POST /trp/curate` `remove`, signed by the post's author, whose key ThreadStead still holds. With `--owner-fallback` it signs as the ring owner instead. Removed refs stay in the hub DB with status `REMOVED` and an audit-log row, and they drop out of every ring feed. Nothing is hard-deleted on either side.

After the deploy, the feed skips these refs and logs each one once per process, as `Skipping hub PostRef for a deleted ThreadStead post (logged once)`. The site works the same before and after the cleanup. The cleanup only empties the log and gives the feed its 20-post page back.

## Steps (ThreadStead VPS, in `~/threadstead`; run one at a time)

1. Record the current noise, so step 5 has something to compare against:
   ```bash
   pm2 logs threadstead --err --lines 5000 --nostream | grep -o 'Post not found in ThreadStead database: [A-Za-z0-9_-]*' | sort | uniq -c | sort -rn
   ```
   This should show about 15 distinct IDs.

2. Deploy. The script and the quieter feed ship in this deploy:
   ```bash
   ./scripts/deploy.sh
   ```

3. Check that user requests sign as the users themselves. Author removal needs this.
   ```bash
   grep -c '^RINGHUB_USER_AUTH_MODE=server-proxy' .env
   ```
   Expect `0`. If you get `1`, stop: every author-signed removal would come back 403.

4. Dry run. It reads only.
   ```bash
   npx tsx scripts/reconcile-orphan-postrefs.ts
   ```
   - `(N from this instance)` must be more than 0. If it's 0, `NEXT_PUBLIC_BASE_URL` doesn't match the URIs on the hub. Stop.
   - The `post=` IDs should match the ones from step 1.
   - Each orphan gets one line: `remove as author …`, `covered by …` (the same post in another ring, which one author call handles), or `SKIP: …`.

5. Only if step 4 printed `SKIP: author has no key here`: the author's account was deleted, so only the ring owner can remove the ref. To see that plan (still a dry run):
   ```bash
   npx tsx scripts/reconcile-orphan-postrefs.ts --owner-fallback
   ```
   The owner's DID will appear as the moderator in that ring's audit log. Leave these refs alone if you'd rather not do that. The feed hides them either way.

6. Apply. Keep the output, because it lists every PostRef ID touched:
   ```bash
   npx tsx scripts/reconcile-orphan-postrefs.ts --apply 2>&1 | tee ~/a3-reconcile-$(date +%F).log
   ```
   If you decided on step 5, add `--owner-fallback`. Look for `Applied: N ok, 0 failed`.

7. Confirm:
   ```bash
   npx tsx scripts/reconcile-orphan-postrefs.ts
   ```
   Expect `Orphans: 0`, or only refs you chose to skip.

8. A day later, check that the log stayed quiet:
   ```bash
   pm2 logs threadstead --err --lines 5000 --nostream | grep -c 'deleted ThreadStead post\|Post not found in ThreadStead'
   ```
   The old message is gone after the deploy. The new one appears at most once per orphan per restart.

Undo: a ring moderator or owner can restore a ref with curate `accept`, using the PostRef ID from the step 6 log. Authors can't, because the hub only lets authors `remove`.

Limits: the script scans `ACCEPTED` refs, which is what every feed serves. `PENDING` refs in curated rings aren't scanned. With `--ring <slug>` it scans only that ring.
