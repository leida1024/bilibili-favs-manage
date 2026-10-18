# Frontend guidelines

This is a plain JavaScript userscript, not a React application. Existing behavior is documented in `docs/architecture.md` and `CONTRIBUTING.md`.

## Pre-development checklist

1. Read the current task PRD and, for complex work, design and implementation plan.
2. Read [directory structure](directory-structure.md) and [quality](quality-guidelines.md).
3. UI work: read [components](component-guidelines.md) and [state](state-management.md).
4. Startup/SPA work: read [lifecycle](hook-guidelines.md). Persisted data work: read [validation](type-safety.md).
5. Read [branch policy](../guides/branch-policy.md) and [browser testing](../guides/browser-testing.md) before any live testing/release.

## Quality check

Run `npm test`; source changes also require `npm run build` and generated diff review. Use synthetic UI previews. Preserve old/VUI adapters and one lifecycle per page realm. Real-account console injection is a separate, limited check, not proof of Tampermonkey sandbox or cross-page recovery compatibility.
