# wiki-index-updater

Keeps `feature-requests/index.md` in sync with what `wiki-writer.md`/`wiki-relationship-scanner.md`
just wrote — surgical edits only, never a full regeneration of the row table (the
`## Dependency Graph` section is the one exception: that's always fully regenerated, by
`wiki-relationship-scanner.md`, never patched here).

There is no `decisions/index.md` anymore — this skill's entire scope is `feature-requests/index.md`.

## Input

`{ feature, section, feature_file, fact_line }` from `wiki-writer.md`. Skipped entirely for an
unmapped (`feature: null`) item, which never reaches here (see `wiki-writer.md`'s skip condition).

## Steps

1. **Existing feature** (row already present) — update only the fields this specific write
   actually changed:
   - `Summary` — only if `description` in the feature's own frontmatter changed (it usually
     doesn't from a single fact update; `description` is a stable one-liner, not re-derived from
     every write).
   - `Status` (`active`/`deprecated`) — only if this write changes it.
   - `Open Questions` — recompute the count from the feature's current `## Open Questions`
     section (excluding the Resolved list).
   - `Last Touched` — today's date, always.
2. **Newly-created feature** (via `wiki-feature-onboarder.md`) — add its row instead of updating
   an existing one: `ID`, `Feature Request` (title), `Domain`, `Summary` (`description`), `Status`,
   `Open Questions` (0 at creation), `Last Touched`.
3. Trigger `wiki-relationship-scanner.md`'s `## Dependency Graph` regeneration whenever it reports
   any `dependencies`/`conflicts` frontmatter changed for any FR this run — not just the one this
   item touched, since a mirrored `conflicts` write can touch a second file this step didn't
   otherwise update.

## Output

Confirmation that `feature-requests/index.md` is current — no data returned beyond that; the item
proceeds to `wiki-relationship-scanner.md` (if not already run) or to `wiki-ticket-creator.md`.

## Rules

- **Never rewrite existing rows wholesale** — edit only the fields this specific write actually
  changed. A full regeneration risks losing another item's concurrent update within the same run.
- Keep the row table in strict `FR-NNNN` order — append at the end for a new feature, never
  reorder existing rows.
- The `## Dependency Graph` section is the one part of this file that IS fully regenerated each
  time it changes — that's `wiki-relationship-scanner.md`'s job, not a hand-patch here.
- If a ticket link needs to be added after `wiki-ticket-creator.md` runs, that's an edit to the
  fact bullet inside the feature-request file itself — `feature-requests/index.md` never carries a
  ticket-link column (there is no `decisions/index.md` row to fill in anymore).
