# wiki-ticket-creator

Creates one ticket per fact `wiki-writer.md` actually wrote into a feature-request's
`current_state`/`key_fact`/`requirement`/`business_rule` section. No further gate: a fact reaching
this step (and not skipped per below) always gets a ticket.

There is no decision record to frame this ticket from anymore — the ticket is built straight from
the fact bullet itself and the item's own evidence.

## Input

`{ feature, section, feature_file, fact_line, evidence_quote, summary }` plus `WIKI_TICKET_MODE`
and `LINEAR_TEAM_KEY` from `.claude/wiki-project.env`.

## Skip Conditions

- **`section == "open_question"` or `"risk"`** — no ticket. An open question isn't actionable yet
  (that's the whole point of the section), and a rejected approach is explicitly *not* being
  built. Only `current_state`/`key_fact`/`requirement`/`business_rule` writes reach this step.
- **`contradicts_rejected` was set on this item** (`wiki-writer.md` routed it to Open Questions
  instead of its real section) — no ticket either, same reason: nothing settled was actually
  written.

## Per-Section Framing

- **`business_rule`/`requirement`** — full actionable template: **Context** (from `summary` and
  `evidence_quote`), **What the User Can Do** (concrete outcome), **Acceptance Criteria** (derived
  from the fact's substance).
- **`current_state`/`key_fact`** — lighter framing: **Context** and **What Changed**, since these
  sections describe current shape/facts rather than a specific enforceable rule — not every one
  of these needs a full acceptance-criteria ticket. Use judgment on whether this genuinely
  warrants a ticket at all versus just documentation; when in doubt, still create one (no gate
  here, per the header) but keep the template light.

Every section is filled **only from what the meeting evidence actually supports** — an unsupported
section reads `_Not specified in source — needs elaboration before implementation._` rather than
inventing detail to fill it in.

## Steps

1. Determine the framing template from `section` (above).
2. Build the ticket body from `summary` and `evidence_quote` — never re-summarize from raw
   transcript text directly if a cleaner `summary` is already available.
3. **If `WIKI_TICKET_MODE == "draft"`:** do not call Linear. Add this ticket's title + body to
   this run's `pending` list for the final report — no local ticket file is written (that would
   duplicate content the fact bullet already holds), and no link is appended to the feature file.
4. **If `WIKI_TICKET_MODE == "live"`:** call `mcp__claude_ai_Linear__save_issue`, routed into
   `LINEAR_TEAM_KEY`'s **Triage** state specifically (not the team's default workflow state) — a
   human reviews every wiki-sourced ticket before it's actionable. If `LINEAR_TEAM_KEY` isn't set
   yet, ask the user which Linear team this project files into, then write it back to
   `.claude/wiki-project.env` so future runs don't ask again.
5. **Append the ticket link directly to the fact bullet** `wiki-writer.md` just wrote in
   `feature-requests/{feature}/feature-request.md` (live mode only):
   ```
   <fact> (per meeting <date>, "<quote>") — [Linear](<url>)
   ```
   There is no separate index row to fill in — `feature-requests/index.md` carries no ticket-link
   column (see `wiki-index-updater.md`).

## Output

`{ feature, section, ticket: { mode: "draft" | "live", url: string | null } }`

## Rules

- **Skip `open_question`/`risk` sections and `contradicts_rejected` items entirely** — nothing
  settled was written for either, so there's nothing to file.
- Always route live-mode tickets into **Triage**, never a team's default/ready state — a human
  reviews every wiki-sourced ticket before it's picked up for work.
- Never fabricate acceptance criteria or context beyond what the source evidence supports — use
  the explicit "not specified" language instead.
- Draft mode never touches Linear and never appends a link to the feature file — this run's
  summary is the only record of a draft-mode "would-be" ticket.
- The ticket link lives on the fact bullet itself, in the feature-request file — never in a
  separate ledger or index row.
