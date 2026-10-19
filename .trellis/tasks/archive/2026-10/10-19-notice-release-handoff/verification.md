# Verification and acceptance

- Product commit: 0eb73bd on develop, local version2.2.13.
- npm run build passed; generated diff contains only version and notice label changes.
- npm test passed149/149, zero skipped/failed. Updated existing notice interaction test verifies both text/accessible-name states and paused state; no extra test file was needed.
- git diff --check passed. Reviewed staged product paths: no Trellis/agent records mixed into product commit.
- CONTRIBUTING now explains develop feature branches/PRs, external fork workflow, no mandatory Trellis/account setup, numeric versions, existing build/test commands, synthetic/live boundaries and product-only release procedure.
- Reviewed local master..develop history by touched paths rather than commit subject.21 earlier product candidates plus this task's commit;26 development-only commits excluded; mixed26f7830 contains only skills and their Python-cache ignore rules and is excluded in full.
- Public source/tests/build config have no Trellis/agent imports or references. This inspection does not establish that cherry-picks will apply cleanly; release assembly and clean-tree verification are explicitly deferred to an authorized release task.
- Existing600px header uses a flexing notice window and narrow<=420px panels hide the notice; wording changed only. No new browser/visual or real-account check was performed. No remote fetch/push, master/main ref edits, publication, webhook updates or real mutations.
- Reusable UI convention updated: notice controls name scrolling and the top notice, avoiding generic task-like pause/play labels. Development handoff refreshed; task completed with no blocking questions.
