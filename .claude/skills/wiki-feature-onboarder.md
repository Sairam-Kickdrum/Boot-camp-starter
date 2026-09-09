# wiki-feature-onboarder

Runs only when `wiki-feature-mapper.md` flags an item `new_feature_candidate` or
`possible_alias_of`. **Never renames or merges an existing feature request without a human
deciding** — but see "Non-interactive runs" below for what "a human deciding" means when there
is no one to prompt, because that is not the same thing as "never writes anything".

## Input

An item from `wiki-feature-mapper.md` carrying `new_feature_candidate: { id, title, description,
domain }` or `possible_alias_of: "<feature-id>"` (with `matched_wording` — the actual phrase used
that triggered the alias suspicion).

## Non-interactive runs (the webhook-triggered ticket path)

`AskUserQuestion` does not exist in a headless sortie. That does **not** make this skill a
dead end there, and treating it as one is what made the first ticket on a fresh project
unrecordable: with an empty `feature-requests/index.md` every ticket is a
`new_feature_candidate`, so every ticket reached a step that could not run, so the wiki was
never built — and it is supposed to be built forward, ticket by ticket, by exactly this path.

**What the rule actually requires is that a human decides — not that a human is prompted.**
On the ticket path there are two channels the meeting-ingest pipeline never had: the Linear
ticket itself (a bot comment plus the `open-questions` label and its reply window), and the
**wiki pull request**, which a human reviews before anything merges. A feature request created
in an unmerged PR is a proposal on the record, not a fact in the wiki. That is a stronger form
of asking than a prompt, because it leaves an artifact the reviewer can act on later.

So the split below is by **whether the write is additive or mutating**, not by whether a human
is present:

| Flag | Nature | Headless behaviour |
|---|---|---|
| `new_feature_candidate` | **Additive** — creates a record that did not exist. A wrong id costs a rename. | **Create it.** Case 1(a) below, plus the marking rules here. |
| `possible_alias_of` | **Mutating** — merges this item into an existing feature, or renames one. Not reversible by a rename. | **Do not alias.** Create it as a distinct feature request and flag the suspected alias. |

When you create headlessly, all three of these are required — the create is only defensible
because they make it reviewable:

1. Set `proposed_by: agent` and `identity_confirmed: false` in the new
   `feature-request.md`'s frontmatter, so a later reader can tell an agent's proposal from a
   human's own feature request without reading git history.
2. Write the identity question into that file's `## Open Questions` verbatim — for a
   `new_feature_candidate`: *"Is `{id}` the right feature request for this work, or does it
   belong to an existing one? Created by an agent from ticket `{ticket}`; rename or merge if
   wrong."* For a `possible_alias_of`: *"This may be the same feature as `{feature-id}` under
   different wording. Created as distinct rather than merged, because merging cannot be undone
   by a rename. Confirm or merge."*
3. State it in the PR description too, not only in the file. The reviewer's decision is the
   approval this skill would otherwise have prompted for, and they cannot give it to a
   question buried in a diff.

**A `contradicts_rejected` flag (from `wiki-fact-classifier.md`, downstream of this skill) needs
no special handling here** — there is no interactive gate to fall back on for it either way, so
`wiki-writer.md` handles it uniformly for every caller (meeting or ticket): the fact is routed
into `## Open Questions` as a flagged reversal instead of its real section, never silently
overwritten and never blocking the run. This differs from the old ledger's
`wiki-resolution-handler.md`, which used to pause and ask — that step no longer exists, and
nothing here needs to replace its gate.

## Product language, not technical language

`## Current State`, `## Key Facts`, `## Requirements` and `## Business Rules` are read by product
managers and business stakeholders, and a Linear ticket's Acceptance Criteria is built **verbatim**
from `## Requirements`. Write all four as screens, user-visible workflows and business rules: what a
person is trying to do, what they see, and what the product must guarantee.

**Those four sections may not name a file, directory, function, class, method, module, package,
database table, column, environment variable, or any other code identifier.** Naming a product
surface is required — "the booking cancellation screen", "the checkout flow", "the invitation email".
Naming code is forbidden. If something can only be said by naming code, it is a statement about the
implementation and does not belong in a feature request at all; the technical approach is derived
later, from the codebase itself, by whoever implements it.

`## Relationships` is unaffected. A feature-request id or a code-wiki link is a reference, not a
code identifier.

**Why this rule is here and not only in `wiki/SCHEMA.md`.** That file is written once per `wiki/`
tree by a one-time scaffold (`init-product-wiki`), which stops if the project is already scaffolded —
so a repository scaffolded before this rule existed never receives it. Carrying the rule in the
skills that actually write feature requests is what makes it apply everywhere. The duplication is
deliberate; do not remove it in favour of the template.

## Steps

1. **`new_feature_candidate`** — use `AskUserQuestion` to confirm: show the item's `summary` and
   `evidence_quote`, the proposed feature-request `id`/`title`, and ask whether to (a) create this
   new feature request, (b) actually resolve it to an existing feature request instead (offer the
   closest existing matches from `feature-requests/index.md` as options), or (c) leave it
   unassigned (`feature: null`) for this item.
   - **(a) Create** — bootstrap `feature-requests/{id}/feature-request.md` per `wiki/SCHEMA.md`'s
     template (empty Current State/Key Facts/Requirements/etc. sections, all reading "Nothing
     recorded yet." until `wiki-writer.md` fills them from this item), including its frontmatter:
     - `feature_id` — scan every existing FR's frontmatter for the current max `FR-NNNN` and
       increment. Never reuse or renumber.
     - `description` — the one-line summary carried on `new_feature_candidate` (from
       `wiki-feature-mapper.md`), written in product language per the rule above.
     - `domain` — likewise carried from `new_feature_candidate`.
     - `aliases: []` — empty at creation; nothing to record yet since this is a *new* match, not
       an alias resolution.
     Then add a row to `feature-requests/index.md` via `wiki-index-updater.md`. Return
     `{ feature: id }` for this item. The `title` written here is read by humans triaging a board —
     name the capability in product terms, per "Product language, not technical language" above.
   - **(b) Resolve to existing** — return `{ feature: <chosen existing id> }`. Also add
     `matched_wording` (if this candidate was actually a near-miss of an existing FR) to that FR's
     `aliases` array, so the same wording is a direct hit next time.
   - **(c) Leave unassigned** — return `{ feature: null }`.
2. **`possible_alias_of`** — use `AskUserQuestion` to confirm: is this really the same feature
   request under different wording, or a genuinely distinct one that happens to sound similar?
   - **Same feature** — return `{ feature: <that feature-id> }`, and add `matched_wording` to that
     FR's `aliases` array (via a direct edit, not through `wiki-writer.md` — this is a frontmatter
     update, not a fact write) so the wording is a direct hit on future mentions.
   - **Distinct, new feature** — treat as case 1(a) above, but seed the new FR's `aliases` with
     `matched_wording` instead of leaving it empty — this is exactly the wording that triggered the
     suspicion, worth recording even though the two FRs stay separate.
   - **Leave unassigned** — return `{ feature: null }`.

## Output

`{ ...item, feature: "<feature-id>" | null }` — same shape `wiki-feature-mapper.md` produces for a
confidently-matched item, so `wiki-fact-classifier.md` (next) doesn't need to know whether the
match came from confidence or a human confirmation.

## Rules

- **Never alias, merge or rename an existing feature request without a human deciding.** That
  judgment call always goes to a human regardless of how confident the model feels, because it
  is not reversible by a rename. Interactively that means `AskUserQuestion`; headlessly it means
  do not do it at all — create a distinct feature request and flag the suspicion.
- **Creating** a new feature request headlessly is allowed, and required for the ticket path to
  work at all, but only under the three marking rules in "Non-interactive runs" above.
  `proposed_by: agent` plus an unanswered question in the file plus the same question in the PR
  body is what makes it a proposal under review rather than an invented fact.
- Ask about one item at a time — don't batch multiple onboarding decisions into a single prompt,
  since each answer can change what's "existing" for the next one (a newly created feature
  request should be offered as a match option for subsequent items in the same run).
- A declined/unassigned item is not an error, but it is a dead end for that item — with no
  decisions ledger to fall back to, `feature: null` means `wiki-writer.md` writes nothing at all
  (see its skip condition). Log it as `unmapped_skipped` in the run report; there is no separate
  "pending onboarding" file.
- Every `aliases` write is additive (never removes an existing alias) and is a direct frontmatter
  edit — it does not go through `wiki-writer.md`'s fact-writing logic, since it isn't a fact about
  the feature's behavior, just a lookup aid.
