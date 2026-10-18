# Quality and verification

## Commands

- `npm test`: Node test runner, `test/startup.test.js` and `test/favorite-names.test.js` with jsdom fixtures.
- `npm run build`: Rollup regenerates the distributed userscript.
- `git diff --check`: whitespace check before commit.

No lint/typecheck script is currently configured; do not claim otherwise. Add focused behavior tests when changes affect startup, names, state replay, batch progress, or failure handling. Avoid implementation-mirroring tests for documentation or simple cosmetic changes.

## Review

Preserve legacy/VUI layout support, asynchronous readiness, SPA entry, dismissal, sandbox compatibility, normalized names, target reuse, and no uncertain automatic replay. Tests must observe outcomes, not simply call the same helper twice. Use temporary/synthetic data. Do not mutate real collections as part of the default test suite.

Use `examples/panel-preview.html` for visual acceptance with fictional data. Record exactly which live checks ran, which realm was used, and what remains unverified. Avoid screenshots of the user's favorites. Never log credentials, full storage, request authorization, or webhook secrets.

Product changes and dev records are separate commits. Follow the branch policy before touching master or Greasy Fork. Documentation-only Trellis setup does not require rewriting build outputs or bumping the script version.
