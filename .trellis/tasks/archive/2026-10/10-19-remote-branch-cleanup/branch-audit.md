# Remote branch audit and decisions

| Branch | Tip at inspection | Evidence | Decision |
| --- | --- | --- | --- |
| master |21f25785e3da2ad247e262ad52652b43c22f6092|Published2.2.13, PR#4 merged; live code verified|Keep release branch unchanged|
| develop |74352e143c606c23266dd56a40c275db7b47949c|Strict ancestor of reviewed local develop,77 commits behind at task start|Keep and fast-forward after content audit|
| api |81c3166d2971af32393189ffd6b164c6c40e580c|June27 stashed experimental direction explicitly retained for reference;26 unique commits|Preserve archive/api-2026-10-19, remove branch|
| dev |4b73bcba7c0527b1c0a985aa5435f05952a5c1b0|June27 development, historical PR#2 merged; exact history is not ancestor of maintained branches,26 unique commits|Preserve archive/dev-2026-10-19, remove branch|
| revert-2-dev |da7570eb200fcc5df98fdaa92c369f1e8419cd56|June27 rollback of obsolete PR#2,28 unique commits; open PR#3 would roll back superseded work|Preserve archive/revert-2-dev-2026-10-19, close PR#3 and remove branch|

Counts overlap across old branches and do not imply78 independent changes. Unique histories were preserved rather than treated as already merged. No old experiment or rollback was integrated into current product.

Archive tags were pushed atomically and read back at exact original objects before normal atomic deletion of the three old branch refs. Tip objects were rechecked immediately before deletion. No force or history rewrite; master was unchanged. PR#3 closed without a comment or merge.

Restoring a historical branch is possible, for example:

```bash
git push origin refs/tags/archive/api-2026-10-19:refs/heads/api
```

The same pattern applies to the recorded dev/revert tag names; use only when that history is needed again. Archives are not published product versions.

Before syncing develop,763 pending blobs (738 text) were checked for high-confidence token/private-key/cookie literals, known private-test markers and forbidden runtime files. No matches. Full intermediate blobs were inspected so deleting a secret from only the latest tree would not hide it from this check. This remains a targeted check, not a complete privacy guarantee. New task/policy records contain only sanitized public refs and outcomes.
