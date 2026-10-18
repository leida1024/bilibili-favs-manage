# Read-only video statistics

## Goal

Help users understand the contents of selected favorites without changing them. Start with documented, reliably obtainable fields rather than promising unsupported metrics.

## Dependencies and discovery

After UI/logs, investigate stable folder/video IDs, legacy/VUI pagination, duplicate videos, invalid/private videos, and available metadata. Current BilibiliAPI is DOM automation, not an HTTP API layer. Decide and document data source and compatibility before implementation; do not silently mix partial page counts with complete collection totals.

## Initial requirements

- Show selected scope, unique videos, duplicates, and accessible metadata such as duration/uploader only when actually available.
- Mark partial scans, missing values, failed pages, and invalid videos explicitly.
- Allow cancellation and apply bounded pagination/request pacing; read-only scans never click mutation controls.
- Offer local export of intentionally selected information, with an explicit user action. Do not upload account data or add telemetry.

## Acceptance criteria

- Synthetic multiple-page fixtures validate deduplication by video identity, missing metadata, failed/partial scans, and cancellation.
- Counts match fixture ground truth; unknown values stay unknown rather than zero.
- Scanning does not create/copy/delete favorites, change subscriptions, or persist private data in repository files.
- Live tests report only aggregate results and the known coverage limits.

## Scope and authorization

Authorized Stage 2 implementation; design.md resolves discovery and the MVP. Local commits only, no push. Account-wide background crawling and cloud analytics are out of scope. No Greasy Fork publication.
