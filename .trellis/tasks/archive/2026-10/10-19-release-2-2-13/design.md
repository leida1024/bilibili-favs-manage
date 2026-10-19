# Release assembly design

Use a sibling worktree based on freshly fetched origin/master. Apply22 reviewed product commits sequentially with cherry-pick -x and retain source/release hash mapping. Keep master unchanged; building without Trellis detects missing product dependencies. Development records stay in the main develop checkout.

Adjust README/changelog/management wording for the candidate version without asserting it is live; consolidate notes for changes since published baseline. No code version bump beyond2.2.13 for release-only documentation.

Validate the full tree and product parity, then push only release/2.2.13 and open a normal reviewable PR with an exact body file. No automatic merge. If the release branch exists, inspect before any reuse and never overwrite it blindly.

Before merge the PR can remain unmerged; no published userscript or real collection changes during preparation.
