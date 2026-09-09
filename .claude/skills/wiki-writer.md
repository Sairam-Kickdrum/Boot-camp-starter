# wiki-writer

Writes the actual wiki content — the one step in the pipeline that edits
`feature-requests/{id}/feature-request.md`. Follow `wiki/SCHEMA.md` exactly for the file format;
this skill assumes that schema is already read.

There is no `decisions/` ledger — this skill never assigns a `DEC-NNNN` or writes a decision file.
Every item lands directly in the mapped feature's own file, in the section
`wiki-fact-classifier.md` chose.

## Input

`{ summary, evidence_quote, feature, section, contradicts_rejected? }` — `feature` from
`wiki-feature-mapper.md`/`wiki-feature-onboarder.md`, `section`/`contradicts_rejected` from
`wiki-fact-classifier.md` — plus this item's `recording_id`/`transcript_id` (Drive source, or a
ticket id/URL for `wiki-ticket-recorder.md`'s callers) and `source_meeting` label (a label, not a
file — no local meeting page exists).

## Skip Condition

If `feature` is `null`: **write nothing to a feature file.** Unlike the old ledger (which still
wrote a `DEC-NNNN` with `feature: null`), there is no ledger to fall back to here — an item with no
matched feature and no signal to onboard a new one simply has nowhere to go. Log it as
`unmapped_skipped` for the run report. (This should be rare: `wiki-feature-mapper.md`/
`wiki-feature-onboarder.md` already try hard to map or create a feature first.)

## Steps (for every mapped item)

Open `feature-requests/{feature}/feature-request.md`.

1. **If `contradicts_rejected` is set** — don't write the fact to its real section. Since there's
   no ledger to escalate a contradiction through (no `wiki-resolution-handler.md` anymore), surface
   it the cheapest way available: write into `## Open Questions` instead —
   *"Reopens a previously rejected approach: {summary} (per meeting {date}, "{evidence_quote}") vs.
   rejected approach: {contradicts_rejected.bullet}. Confirm this is an intentional reversal before
   it's written as current truth."* Skip straight to Step 6 — do not also write the fact to its
   originally-classified section. A human resolves this next pass, either by editing the file
   directly or via a follow-up meeting item that explicitly confirms the reversal (which then
   arrives as a normal item with no `contradicts_rejected` flag, since the rejection has been
   superseded by the confirmation).
2. **Section = `open_question`:** find an existing Open Question bullet about the same topic
   (topic-match judgment, not string match). Found → **update its date/quote in place** — never
   add a second bullet for the same still-unresolved topic. Not found → append a new bullet:
   `- <topic still undecided> (raised in meeting <date>: "<quote>")`.
3. **Section = `current_state`/`key_fact`/`requirement`/`business_rule`:** find the matching or
   stale line in that section (topic-match judgment) and **replace** it with:
   `<fact> (per meeting <date>, "<quote>")`. Nothing existing matches → append as a new bullet. If
   this resolves an existing Open Question (topic-match again), move that bullet to "Resolved":
   `- ~~<former question>~~ → resolved per meeting <date> (<what it resolved to>)`.
4. **Section = `risk`:** append to `## Risks / Rejected Approaches`:
   `- Rejected: <approach> — <why> (per meeting <date>, "<quote>")`. This section is append-mostly
   by nature (see `wiki/SCHEMA.md`) — don't trim existing entries the way current-state sections
   get trimmed; they're what `wiki-fact-classifier.md`'s rejected-approach check reads back later.
5. Update `last_updated` in the frontmatter.
6. Hand off `{ feature, section, fact_line, evidence_quote }` to
   `wiki-relationship-scanner.md` — even for a Step 1 (`contradicts_rejected`) write, since the
   surfaced open question can still be topically related to other features.

## Output

`{ feature: string, section: string, feature_file: path, fact_line: string }` — passed to
`wiki-index-updater.md` and `wiki-relationship-scanner.md` next.

## Rules

- No `DEC-NNNN`, ever. This skill's only write target is `feature-requests/{id}/feature-request.md`.
- Current-state sections (Current State/Key Facts/Requirements/Business Rules) are
  **trimmed/replaced**, never append-forever — re-read `wiki/SCHEMA.md`'s Current-State
  Discipline section before editing one.
- `## Risks / Rejected Approaches` is the one append-mostly section — never trim it the way
  current-state sections get trimmed.
- Evidence is always cited inline (`(per meeting <date>, "<quote>")`) — never a link to a separate
  record, since none exists.
- A ticket link, when one exists, is appended directly to the fact bullet it came from
  (`— [Linear](<url>)`) — never to a separate index row.
- `contradicts_rejected` items are surfaced as an Open Question, never written to their originally
  classified section and never silently dropped.
- An unmapped (`feature: null`) item writes nothing — log it, don't fabricate a home for it.
