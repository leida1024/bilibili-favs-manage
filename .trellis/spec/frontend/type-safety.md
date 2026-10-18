# Runtime validation

The project uses JavaScript ES modules and JSDoc, with no TypeScript compiler or runtime schema dependency. Keep that baseline unless a separate migration is justified.

Validate names with `utils/favoriteNames.js` before side effects. Use adapters to discover real DOM structures and check required nodes before clicking. Hidden pre-rendered dialogs must not count as an open operation dialog. Serialized state parsing and expiry are handled by `StateManager`; new state formats need explicit validation and compatibility handling.

DOM text and persisted state can be incomplete or stale. Do not cast missing values into usable IDs, invent counts, or treat a successful click as a successful mutation. Future statistics must distinguish known totals, loaded-page counts, unavailable values, and failed/partial enumeration.
