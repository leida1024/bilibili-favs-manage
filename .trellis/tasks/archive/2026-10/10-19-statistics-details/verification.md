# Verification — statistics details and native pages

Product commit594be17 (local2.2.11), alias/context/pagination refinements41ea877 (local2.2.12).144 tests/build initially;149 at final acceptance.

## Behavioral coverage

- Title, generated safe URL, uploader ID/name, duration, availability, publication timestamp and per-folder membership/collection timestamp; av/BV aliases join identity without deriving guessed IDs. Unknown identity retains metadata separately. Known metadata survives alias bridges, counts and duration recompute correctly.
- Local searchable50-item detail pages; JSON retains all fetched records, typed scope, occurrences and unknown values. Malicious fixture title renders as text.
- Native old/VUI fixtures: start at page2, reset to1, active page updates before cards, delayed cards, next fallback outside number window, stable context, cancellation. Shared pagination also copies synthetic pages1/2/3 once each; VUI numeric total no longer becomes1.
- Folder read/count failure preserves partial data and continues other selected folders; cancellation stops. Advertised vs actual counts explicit. Page/entry bounds500/10000.

## Real account, dedicated logged-in VUI, console realm (read only)

- API catalog21 created folders. Two selected multi-page folders advertise120/69 but API returns114/64. Total178 entries/unique videos,178 titles,178 uploader names, known duration404337s,15 unknown durations.
- Native scans same folders through3+2 pages: exact BV-set and duration parity with API. Entire native path also loaded21-folder catalog then scanned same scope with the same178 results. Final shared-pagination refactor rerun reproduced these aggregates.
- One available subscribed folder advertised8: API and native each completed8 entries, identical BV set and duration. Local detail8 rows and export8 records with title/link/memberships checked through actual panel controls; no download/share.
- Large-folder page count152 identified read only; did NOT scan all6042 entries or copy them. Pending execution state checked absent before each injection. Read setting restored to API in the saved UI preferences.

## Findings / limits

Initial suspicion about missing aria-current was corrected after checking: live VUI provides both aria-current and active class. The reproduced50→49 and120→114/69→64 mismatches occur in BOTH platform API and native view, so missing entries are not fabricated and reports remain incomplete. Actual VUI author markup has an empty first span and name/date in a later titled span; extraction and regression updated accordingly.

No real mutations. Old-layout native behavior covered synthetically, not on a live legacy page. Console realm does not verify GM sandbox, automatic reinjection/navigation recovery, or all account/page types.
