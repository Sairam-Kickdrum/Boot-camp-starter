# wiki-fact-classifier

Tags each discussion item from `wiki-summarizer.md` with **which `feature-request.md` section it
updates**, from text alone — no wiki lookup happens here beyond this feature's own recorded
rejections (see the Rejected-Approach Check below). Cross-feature comparison is
`wiki-relationship-scanner.md`'s job, later, after the fact has already been written.

This replaces the old `wiki-decision-classifier.md`, which tagged items `decided`/`unresolved`/
`rejected`/`superseded` for a `decisions/` ledger that no longer exists. There is no ledger here —
the only question this step answers is *where in the one feature file does this fact belong*.

## Input

One `{ summary, evidence_quote, topics_mentioned }` item from `wiki-summarizer.md`, plus (once
`wiki-feature-mapper.md` has run) the mapped feature's own `## Risks / Rejected Approaches`
section, if a feature was matched.

## Classification Rubric

Which section of `feature-request.md` does this item belong in?

- **`current_state`** — describes how the feature works right now, in general terms (the
  overall shape of the behavior, not one specific rule).
- **`key_fact`** — a standalone fact about the feature that isn't itself a requirement or rule
  (a constraint, a metric, a scoping detail).
- **`requirement`** — something the product must do or provide.
- **`business_rule`** — a specific, enforceable rule (e.g. "the cancel button is black," "a
  booking over capacity is blocked"). Most decision-shaped statements ("we're going with...",
  "let's do...", "decided to...") land here.
- **`open_question`** — the topic was discussed but no choice was made. Signal phrases: "we still
  need to figure out...", "TBD", "let's revisit...", explicit disagreement with no resolution
  reached in this meeting. **No resolution reached → always route here, never to
  `current_state`/`business_rule`** — there is no fact to write yet.
- **`risk`** — an approach was explicitly considered and turned down ("we're not going to...",
  "we decided against...", "ruled out..."), or a known risk was raised. This is the one section
  that's append-mostly rather than trim/replace (see `wiki/SCHEMA.md`) — it's the record this
  classifier itself reads back on future items.

When genuinely ambiguous between two sections, prefer `open_question` over
`current_state`/`business_rule` — a fact wrongly written as settled propagates further (a ticket
gets created from it) than one correctly left as an open question.

## Rejected-Approach Check

Before routing an item to `current_state`/`key_fact`/`requirement`/`business_rule`, check it
against the mapped feature's own `## Risks / Rejected Approaches` section (topic-match judgment,
same style as everything else here — never a keyword/string match). If it contradicts something
already recorded there as rejected, do **not** silently classify it as a normal fact — instead
output `contradicts_rejected: true` with the matching bullet, so `wiki-writer.md` surfaces this
rather than overwriting quietly (see that skill's Step 2).

This is deliberately narrower than the old ledger's `previously_rejected` reconciliation question:
it only checks this one feature's own recorded rejections, not a project-wide history scan. A
cross-feature version of this same idea can be added to `wiki-relationship-scanner.md` later if it
proves necessary — it is out of scope here.

## Output

`{ ...item, section: "current_state" | "key_fact" | "requirement" | "business_rule" |
"open_question" | "risk", contradicts_rejected?: { bullet: string } }`

## Rules

- This is a text-only judgment (plus the one feature's own Risks section) — never consult other
  feature-requests here; that's `wiki-relationship-scanner.md`'s job, one step later.
- No resolution reached in the meeting is never a reason to write a fact anyway — it always routes
  to `open_question`.
- When uncertain between two sections, prefer the more conservative one (`open_question` over a
  settled-fact section) rather than guessing confidently.
- `contradicts_rejected` is a flag for `wiki-writer.md` to act on, not a reason for this step to
  refuse to classify the item — always still return a `section`, even when the flag is set.
