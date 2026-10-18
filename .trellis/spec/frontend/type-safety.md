# Runtime validation

The project uses JavaScript ES modules and JSDoc, with no TypeScript compiler or runtime schema dependency. Keep that baseline unless a separate migration is justified.

Validate names with `utils/favoriteNames.js` before side effects. Use adapters to discover real DOM structures and check required nodes before clicking. Hidden pre-rendered dialogs must not count as an open operation dialog. Serialized state parsing and expiry are handled by `StateManager`; new state formats need explicit validation and compatibility handling.

DOM text and persisted state can be incomplete or stale. Do not cast missing values into usable IDs, invent counts, or treat a successful click as a successful mutation. Future statistics must distinguish known totals, loaded-page counts, unavailable values, and failed/partial enumeration.

Created-list responses use boolean is_kid_playlist today; historical fixtures may use0/1. Accept exactly false or0 for ordinary folders. true/1 means special, and missing/null/strings/other numbers remain protected/unknown. Preserve first-entry protection, type/owner/availability checks, and revalidate protectionReason with immutable target identity. Wrong:`raw.is_kid_playlist !== 0` disables every boolean-false ordinary folder. Correct:`[false,0].includes(raw.is_kid_playlist)`. Regression fixtures must mirror actual API shapes rather than only the original numeric assumption.
