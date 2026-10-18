# Design, pass 1

Subject: a Bilibili collection utility used while browsing, primarily to copy video favorites into the user's own folders. This is a tool window, not a dashboard or marketing page. The memorable element is the source-to-destination pairing itself.

Tokens: paper #FFFFFF, ink #203344, secondary #526879, Bilibili blue #007FA8, selection wash #EAF7FC, caution #AA4332. Borders #DAE5EC are structural, not card decoration. Local type only: Microsoft YaHei UI for Chinese legibility, PingFang SC/Noto Sans CJK SC fallback; 13px support,14px row/control,18px view heading, weights400/600/700. No remote fonts/assets.

Compare A: two source/target rows plus a separate review column (previous layout) duplicates content, consumes height and loses the pair. B: a full-width transfer sheet with adjacent source/target cells; a quiet footer owns count and action. Choose B. Left align labels and fields, align column boundaries across all rows. Header/navigation/footer stay outside the single scrolling body.

```text
A rejected                  B selected
Source       Review         Collection manager          Logs  Min Close
  Target     Source>Target   Copy        Statistics       Manage
Source       ...            Copy into my folders
  Target     Start          Select sources; edit destinations alongside.
                            [all] Source        >       Target (mine)
                            [x] Programming     >       [Learning notes]
                            [ ] Photography     >       [Photography   ]
                            ------------------------------------------------
                            Selected 1 of 5             [Copy 1 folder]
```

Secondary views: statistics and management share explicit scope/load but show only the active operation's list/actions. Management selection never shares scan selection. Help and full IDs appear in expandable object details; destructive review ALWAYS displays exact ID/owner/count. Status is hidden when idle, concise when active, with expandable last confirmed/details. Diagnostics occupy their own view with one scrollable log body; export review occupies a dedicated overlay sheet, not appended below all content.

# Review, pass 2

The prior soft card grid and broad blue status box could suit any dashboard and overwhelm this brief. Remove the review card, repeated numbered headings, always-visible idle metrics and multiple list scrollers. Keep blue for selected rows/action, not decoration. Navigation is task-based (copy/statistics/manage), with copy first; no sidebar taking space from the actual pairs. At 390px retain adjacent source/target columns with wrapped names and compact padding; never collapse the pair into two disconnected lines. Custom resizing uses panel width, so responsive row rules use container width instead of only window width. Native keyboard focus remains visible; no decorative animation.

Boundaries: FloatingPanel owns view/footer/scroll; CheckboxItem owns pair; InventoryPanel toggles existing read/mutation consumers. No changes to API/engine semantics. Switching away consumes no work but invalidates pending confirmation. A running operation locks navigation except diagnostics. Reverting the UI product commit restores layout, with no migration.
