# wiki-relationship-scanner

Auto-detects cross-feature relationships and writes them directly into `feature-request.md`
frontmatter — modeled on the code-wiki's `depends_on`/`consumed_by` pattern, where these arrays are
the one authoritative record of the relationship graph and every rendered graph elsewhere
(`feature-requests/index.md`'s `## Dependency Graph`, a feature's own `## Relationships` section)
is a regenerated view, never hand-edited.

Runs once per item, **after** `wiki-writer.md` has written the fact into a feature-request — not
once per meeting, and not before the fact exists to compare against.

## Input

`{ feature, section, fact_line, evidence_quote }` from `wiki-writer.md`, plus the full
`feature-requests/index.md` catalog (every other known FR's `feature_id`, `domain`, `description`,
`aliases`).

## Steps

1. **Explicit mentions.** Check the item's own evidence text for direct relationship language
   ("this depends on X", "conflicts with Y", "same as Z"). Same confidence-threshold style as
   `wiki-feature-mapper.md` (≥0.55) — a clear, direct statement counts even before Step 2 runs.
2. **Auto cross-check.** Compare this feature's current `## Current State`/`## Key Facts`/
   `## Business Rules` against every other known feature-request's, to catch relationships nobody
   said out loud — e.g. two FRs both claiming to control the same UI element or behavior.
   `domain` is a cheap first filter: check same-domain FRs before falling back to comparing against
   everything.
3. **Write results directly into frontmatter** — no confirmation gate, per this project's
   convention (auto cross-checked dependencies/conflicts, unlike the human-gated
   `new_feature_candidate`/`possible_alias_of` flow in `wiki-feature-onboarder.md`):
   - `dependencies` — **single-directional**, written only to the file that depends on the other.
     (Unlike the code-wiki's manual `depends_on`+`consumed_by` pair — that dual bookkeeping exists
     there for hand-authored precision at scan time; here it's machine-detected fresh each run, so
     one direction is enough and cheaper to keep consistent.)
   - `conflicts` — **always mirrored**, written to both files, since a conflict is inherently
     symmetric — if A conflicts with B, B conflicts with A.
   - Never duplicate an edge already present in the array.
4. **Regenerate `## Relationships`** on every touched feature-request file — a plain rendering of
   its own `dependencies`/`conflicts` frontmatter, one line per edge with a one-line reason drawn
   from whatever evidence triggered it:
   ```
   ## Relationships
   **Depends On:** [<feature-id>](../<feature-id>/feature-request.md) — <one-line reason>
   **Conflicts With:** [<feature-id>](../<feature-id>/feature-request.md) — <one-line reason>
   ```
   Omit a line entirely (not "Nothing recorded yet.") when that array is empty — `## Relationships`
   always exists as a heading, but an empty array means genuinely nothing to render under it.
5. **Regenerate `feature-requests/index.md`'s `## Dependency Graph`** from the full set of every
   FR's `dependencies`/`conflicts` frontmatter — never hand-patched, always a full regeneration of
   that one section (the rest of the index — the row table — still gets surgical updates from
   `wiki-index-updater.md`, unaffected by this step).

## Output

Confirmation that any touched FRs' frontmatter/`## Relationships` and the index's
`## Dependency Graph` are current. No further step consumes this — it's the last phase for this
item.

## Rules

- Runs **after** the fact is written, never before — comparing against a feature-request's stale
  content would miss the very fact this item just added.
- `dependencies` is directional and single-write; `conflicts` is symmetric and always mirrored —
  don't apply the mirroring rule to `dependencies` or the single-write rule to `conflicts`.
- Never invent a relationship from naming similarity alone (two features sharing a similar title
  is not evidence of dependency or conflict) — same discipline `wiki-bridge-verifier.md` already
  applies to FR↔FEAT matching, applied here to FR↔FR matching.
- `## Relationships`/`## Dependency Graph` are generated views — never hand-author an edge in
  either; fix the frontmatter and regenerate the view when the two disagree (frontmatter wins).
- This step has no interactive/confirmation gate, unlike `wiki-feature-onboarder.md`'s creation
  flow — dependency/conflict edges are auto-written directly, by design.
