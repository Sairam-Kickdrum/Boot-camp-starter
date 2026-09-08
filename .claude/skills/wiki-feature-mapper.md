# wiki-feature-mapper

Matches each summarized item against this project's known feature requests
(`feature-requests/index.md`) — the one-level-down equivalent of what the old multi-project
design used a project-mapper for, now scoped within this single project.

## Input

A summarized item `{ summary, evidence_quote, topics_mentioned }` from `wiki-summarizer.md`, plus
`wiki/{project-id}/feature-requests/index.md` and each candidate FR's own frontmatter
(`feature_id`, `description`, `aliases`, `domain`).

## Steps

1. Read `feature-requests/index.md` for the current catalog of known feature-request ids,
   domains, and descriptions.
2. **Direct lookup first.** Check the item's `topics_mentioned`/`summary` against every known FR's
   `aliases` array and `description` for a direct or near-direct textual hit. This is the common
   case once a project has a few meetings behind it — most repeat mentions of a feature use
   wording already recorded in `aliases` or close to its `description`.
3. **Domain-narrowed fallback.** If step 2 gives no confident hit, and the item's topic clearly
   names a business area matching some FRs' `domain`, narrow the candidate set to that domain
   before judging further — cheaper and more precise than comparing against the whole catalog.
4. **Prose-similarity fallback.** Only if steps 2–3 give nothing confident: fall back to today's
   full judgment call — an LLM reading the item against each remaining candidate's `description`
   (and, if still ambiguous, its `## Current State`) and deciding how well they match. Not a
   similarity algorithm.
5. Score confidence 0.0–1.0 for the best-matching feature request, whichever step produced it.
6. Apply the same hard threshold used throughout this pipeline: **confidence ≥ 0.55** is a match.
   Below that:
   - If the item clearly concerns *some* coherent capability that just isn't in the catalog yet,
     flag `new_feature_candidate: true` with a proposed `id`/`title`/`description`/`domain`.
   - If it plausibly matches an existing feature request under different wording (e.g. "the
     export thing" vs. registered `billing-export`), flag
     `possible_alias_of: "<feature-id>"` instead — carry the actual wording used
     (`matched_wording`) so `wiki-feature-onboarder.md` can record it as an alias regardless of how
     the flag itself gets resolved.
   - If there's no signal at all — genuinely ambiguous, not clearly anything — leave both flags
     unset; the item proceeds with `feature: null` and skips `wiki-feature-onboarder.md`
     entirely.

## Output

`{ ...item, feature: "<feature-id>" | null, confidence: float, new_feature_candidate?: {...}, possible_alias_of?: string, matched_wording?: string }`

- `feature` set (confidence ≥ 0.55) → proceeds to `wiki-fact-classifier.md`.
- `new_feature_candidate` or `possible_alias_of` set → `wiki-feature-onboarder.md` runs next, then
  its result proceeds to `wiki-fact-classifier.md`.
- Neither set → proceeds with `feature: null`. There is no ledger to fall back to here —
  `wiki-writer.md` writes nothing for an unmapped item (see its skip condition), so this is the
  rare, final outcome for genuinely unmatched content, not an intermediate state.

## Rules

- **Never guess.** Below 0.55 confidence, `feature` is `null` — always flag *why* it's unmatched
  (candidate vs. alias vs. no signal) so `wiki-feature-onboarder.md` can act on the specific
  reason.
- This step runs per **summarized item**, not per raw meeting segment — one meeting can produce
  several items mapping to different features, or none.
- A `feature: null` item is not an error, but it is a dead end for this item — unlike the old
  ledger (which still recorded it with `feature: null`), there is no project-wide file for an
  unmapped item to land in, so nothing gets written. Try direct/domain lookup and the onboarder's
  new-candidate flow before conceding this.
- Prefer `aliases`/`description` hits over prose-similarity judgment whenever both are available —
  they're cheaper and more precise, and their accuracy compounds: every alias
  `wiki-feature-onboarder.md` records makes the next mention of the same wording a direct hit
  instead of a fresh inference.
