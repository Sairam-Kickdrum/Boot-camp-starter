---
name: init-product-wiki
description: One-time onboarding scaffold of the product-wiki directory structure — wiki/SCHEMA.md and wiki/{project-id}/ with index.md and feature-requests/index.md — pushed as a PR to the project's repository. Creates structure only, no feature-request content. Shares one branch/PR with /init-code-wiki so /wiki-ingest can later commit wiki content into the same PR.
disable-model-invocation: true
allowed-tools:
  - Read
  - Write
  - Glob
  - Bash
---

# Init Product Wiki

Scaffold the empty directory structure for a project's product wiki. **This skill only creates
structure** — `wiki/SCHEMA.md` (the one static schema-definition file, written once) plus an empty
index file with header rows and no data. It never writes a
`feature-requests/{feature-id}/feature-request.md` file — that's written later, by `/wiki-ingest`
(the "temporal agent" — see `.claude/skills/wiki-ingest/SKILL.md`), the first time an actual
meeting produces a feature-relevant fact to record.

There is no decisions ledger in this wiki. A transcript-derived fact is written straight into the
relevant feature's `feature-request.md` — current truth, not an append-only history — and git is
the history mechanism for anything that later changes. See `wiki/SCHEMA.md`'s Step 5 content below
for the full rationale.

**This is a one-time onboarding step.** It runs once per project, ever — see the Guard below and
`docs/ONBOARDING.md`, which points to this skill as part of first-time setup.

## Directory Structure This Skill Creates

```
wiki/
├── SCHEMA.md
└── {project-id}/
    ├── index.md
    └── feature-requests/
        └── index.md
```

Nothing else.

## 1. Guard — Has This Already Run?

This scaffold may live on the shared `wiki/init-scaffold` branch and not yet be merged to `main`,
so check both places before concluding it hasn't run.

Check the current branch's working tree first:

```bash
find wiki/{project-id} -maxdepth 2 -name "*.md" 2>/dev/null
```

If `index.md` or `feature-requests/index.md` already exist for this `project-id`, **stop** — tell
the user the product wiki was already scaffolded and this skill is a one-time onboarding step, not
a recurring one.

If nothing turns up locally, also check whether the shared scaffold branch has it already on the
target repository, in case it exists there but hasn't been merged or checked out here. Resolve the
target remote the same way Step 3 does — this workspace's own `origin`:

```bash
GITHUB_REPO=$(git remote get-url origin 2>/dev/null)
TARGET_REMOTE="origin"
git fetch "$TARGET_REMOTE" wiki/init-scaffold 2>/dev/null && git ls-tree -r "$TARGET_REMOTE"/wiki/init-scaffold --name-only | grep "^wiki/{project-id}/"
```

If that returns anything, stop for the same reason — point the user at the open PR on that branch
(Step 11 shows how to find it) rather than re-scaffolding. If there's no `origin` remote configured
yet, this simply finds nothing to fetch — harmless, the local-directory check above is what
actually matters in that case.

## 2. Determine `project-id` and Project Name

In production this is **one repo, one project, one wiki** — the `project-id` is this project.
Derive it (kebab-case, e.g. `billing-export-service`) and its display name from `CLAUDE.md`'s
title, the same deterministic derivation `/init-code-wiki` uses — since both skills compute it
from the same source, it stays consistent with `code-wiki/{project-id}/` without needing to read
anything back from a shared file.

## 3. Determine the Target Repository

The target repository is this workspace's own `origin` remote:

```bash
git rev-parse --show-toplevel 2>/dev/null
GITHUB_REPO=$(git remote get-url origin 2>/dev/null)
```

If this isn't a git repo yet, or has no `origin` remote configured, **ask the user** for the
project's repository URL (e.g. `git@github.com:org/repo.git`) — don't guess or invent one — then:
```bash
git init 2>/dev/null   # only if not already a repo
git remote add origin {url}
GITHUB_REPO={url}
```

Resolve `$REPO_SLUG` — the `owner/repo` form `gh --repo` needs — from `$GITHUB_REPO`, and set
`$TARGET_REMOTE` to `origin`, the only remote this skill ever fetches/pushes through:
```bash
REPO_SLUG=$(echo "$GITHUB_REPO" | sed -E 's#^(https://github\.com/|git@github\.com:)##; s#\.git$##')
TARGET_REMOTE="origin"
```

## 4. Determine the Shared Wiki Branch

`/init-product-wiki` and `/init-code-wiki` share **one** fixed branch name, `wiki/init-scaffold`,
and one PR on it, so that `/wiki-ingest` (or whatever eventually writes code-wiki content) has a
single, unambiguous place to commit into later. Both skills simply target this constant name
directly; there's no shared state to read or originate first.

## 5. Create `wiki/SCHEMA.md` (only if it doesn't already exist)

This file is not per-project — it's written once for the whole `wiki/` tree and every project
under it follows the same schema. If `wiki/SCHEMA.md` already exists, skip this step entirely.

**This template is not the enforcement point for the rules it states.** Because the file is written
once per `wiki/` tree and this skill is a one-time scaffold (Step 1 stops if the project is already
scaffolded), an edit here reaches new repositories only. The skills that actually write feature
requests — `wiki-feature-onboarder.md`, `wiki-writer.md`, and `seed-wiki-content/SKILL.md` — carry
the same rules themselves, so they apply whatever a target repo's committed `wiki/SCHEMA.md` happens
to say. That duplication is deliberate; do not "tidy" it by deleting the rules from those skills.

Write it with this exact content:

````markdown
# Product Wiki Schema & Conventions

This file defines conventions for every file under `wiki/{project-id}/`. Follow them precisely —
without a single enforced format, drift creeps in: inconsistent frontmatter, inconsistent
linking, inconsistent layout from one write to the next.

This is a **product wiki**: everything under `feature-requests/` is a *feature request* — a
capability proposed, being defined, or being changed — not a *feature* in the sense of code that
already exists. A separate codebase wiki (out of scope here) is where already-built system
architecture belongs; product-wiki pages never link into it.

In production this is **one repo, one project, one wiki** — `wiki/{project-id}/` is one full
instance of everything below.

There is no decisions ledger here. Earlier versions of this wiki kept an immutable
`decisions/DEC-*.md` ledger and linked every fact back to the record that established it. That's
gone: every fact-bearing section below is current-state only, cited with its evidence inline, and
simply overwritten when a later meeting changes it. Git is the history mechanism — `git log -p` on
any `feature-request.md` shows every value a line ever held and when it changed — so nothing here
needs to duplicate that inside the file itself.

---

## Current-State Discipline

Every section in `feature-requests/{id}/feature-request.md` (Current State, Key Facts,
Requirements, Business Rules, Open Questions, Risks / Rejected Approaches, Relationships)
represents *today's truth*, not a history log. When a new meeting changes what's true, **replace or
trim the stale line** — never just append forever. The one section that's append-mostly by nature
is `## Risks / Rejected Approaches`: it's the record a later fact gets checked against before it's
allowed to silently contradict a rejection (see `wiki-fact-classifier.md`'s rejected-approach
check), so entries there aren't trimmed the way current-state facts are.

Every fact bullet cites its evidence inline, not via a link to a separate record:

```
<fact> (per meeting <date>, "<verbatim quote>")
```

When a ticket is created from a fact, the link attaches to that same bullet:

```
<fact> (per meeting <date>, "<verbatim quote>") — [Linear](<url>)
```

---

## Slug & ID Formats

- Feature-request ids: `FR-NNNN`, sequential, zero-padded, per-project. Scan existing
  `feature-request.md` frontmatter for the current max `feature_id` and increment — never reuse or
  renumber once assigned. This id is stable and separate from `slug`; renaming a feature changes
  `slug`, never `feature_id`.
- `slug`: kebab-case, short, stable in practice but *can* change on a deliberate rename — treat
  renaming one as a breaking change to every link pointing at `feature-requests/{slug}/`, and
  update `dependencies`/`conflicts` entries elsewhere that reference the old slug.

---

## `wiki/{project-id}/index.md` — project landing page

A short entry point that links out, not a raw content dump:

```markdown
# Wiki — <Project Name>

Last updated: <date>

- [Feature Requests](feature-requests/index.md) — what this project does, organized by capability
```

---

## `feature-requests/` — feature-request tree

One directory per feature request, created the first time a fact is confidently mapped to it.
Everything about a feature request lives in one file, `feature-request.md` — not split across
separate files.

### `feature-requests/index.md` — feature-request catalog

The first place to look to see "what does this project do" — one row per known feature request,
sourced from each FR's own frontmatter (`feature_id`, `title`, `domain`, `description`), plus a
generated dependency/conflict view. Never hand-typed beyond the header — regenerated whenever a
row's source frontmatter changes:

```markdown
# Feature Requests — <Project Name>

Last updated: <date>

| ID | Feature Request | Domain | Summary | Status | Open Questions | Last Touched |
|---|---|---|---|---|---|---|
| [FR-0001](billing-export/feature-request.md) | Billing Export | billing | Billing export job and its trigger | active | 0 | <date> |

## Dependency Graph
*Generated from every FR's `dependencies`/`conflicts` frontmatter — never hand-edited.*

- **FR-0001 (Billing Export)** depends on **FR-0002 (Invoice Numbering)**
- No conflicts currently recorded
```

### `feature-requests/{feature-id}/feature-request.md`

**On `proposed_by` / `identity_confirmed`.** A feature request can be created by an agent
recording the first ticket that needed one — that is how this tree gets built forward rather
than seeded up front. Those two fields are what keep such a file honest: it is a **proposal
under review** until a human merges its pull request and clears
`identity_confirmed`. Treat `identity_confirmed: false` as "the name and boundary of this
feature request are unconfirmed", and expect the reason to be stated in its `## Open
Questions`. Never delete the question to tidy the file — answer it, then set the flag.

**Write this file in product language, not technical language.** `## Current State`,
`## Key Facts`, `## Requirements` and `## Business Rules` are the four sections a Linear ticket is
built from, and they are read by product managers and business stakeholders. Describe screens,
user-visible workflows and business rules: what a person is trying to do, what they see, and what
the product must guarantee.

**Those four sections may not name a file, directory, function, class, method, module, package,
database table, column, environment variable, or any other code identifier.** Naming a product
surface is required — "the booking cancellation screen", "the checkout flow", "the invitation
email". Naming code is forbidden. If a requirement can only be expressed by naming code, it is a
statement about the implementation and does not belong in a feature request: the technical
approach is derived later, from the codebase itself, by whoever implements it.

`## Relationships` is unaffected by this — a feature-request id is a wiki reference, not a code
identifier.

Everything from the `---` below to the end of this block is the template itself — copy the
structure, not this paragraph.

```yaml
---
title: "Billing Export"
slug: billing-export
feature_id: FR-0001    # stable id, separate from slug — assigned once, never renumbered
description: "One canonical sentence describing what this feature request is."
domain: billing         # one business-domain label
aliases: []             # nicknames this feature gets called informally in meetings
owners:
  - <owner name>
status: active   # active | deprecated
last_updated: <date>
dependencies: []        # feature-request ids this one depends on (outgoing edges only)
conflicts: []           # feature-request ids this one is in tension with (always mirrored both ways)
# Both optional, and both only ever set by an agent creating this file headlessly
# (see wiki-feature-onboarder.md's "Non-interactive runs"). Absent means a human
# authored it — do not add them to a human's own feature request.
proposed_by: agent          # omit entirely when a human created this
identity_confirmed: false   # true once a human has confirmed this is the right
                            # feature request for the work filed against it
---

## Current State
<Plain-language description of how this feature request works TODAY, cited with its evidence
inline: "<fact> (per meeting <date>, "<quote>")". Rewrite/trim as later meetings change it — not a
running log of everything ever said about it.>

## Key Facts
- <Fact that holds today> (per meeting <date>, "<quote>")

## Requirements
- <Requirement that holds today> (per meeting <date>, "<quote>")

## Business Rules
- <Rule that holds today> (per meeting <date>, "<quote>") — [Linear](<url>)   <!-- ticket link only if one was created from this fact -->

## Evidence
- [Feat-NNNN-<feature-id>](../../../code-wiki/{project-id}/Features/Feat-NNNN-<feature-id>/Index.md)

The one link-only section kept from the old schema — not a decisions index, but the FR ↔ FEAT
bridge to this feature's code-wiki twin (see `wiki-bridge-verifier.md`). Omit entirely, with a
one-line note instead ("No codebase-wiki page exists — this feature isn't built yet."), when
nothing is built yet.

## Open Questions
- <Unresolved question> (raised in meeting <date>: "<quote>")

**Resolved:**
- ~~<Former question>~~ → resolved per meeting <date> (<what it resolved to>)

## Risks / Rejected Approaches
- Rejected: <approach> — <why> (per meeting <date>, "<quote>")

## Relationships
**Depends On:** [<feature-id>](../<feature-id>/feature-request.md) — <one-line reason>
**Conflicts With:** [<feature-id>](../<feature-id>/feature-request.md) — <one-line reason>
```

Every section heading stays present even when empty — write "Nothing recorded yet." rather than
omitting it, so the next write has an obvious place to land (`## Evidence` is the one exception:
omit the heading entirely when nothing is built yet, per its own note above). `## Evidence` is a
thin index — a link only, never a copied excerpt — to this feature's code-wiki twin.
`## Relationships` is a generated rendering of the `dependencies`/`conflicts` frontmatter
(`wiki-relationship-scanner.md` writes both together) — never hand-authored independently of the
frontmatter it renders.

---

## No Local Meeting Archive

There is no `archive/meetings/` directory and no per-meeting page under `wiki/{project-id}/`. A
meeting is a source event, not a durable artifact — its evidence lives inline on whichever fact(s)
it produced (the `(per meeting <date>, "<quote>")` citation), not as a separately rendered page. A
meeting-archive page would just be a second copy of what the fact citation already holds.

## No Local Ticket Draft

A fact never gets a local ticket file. There is no `triage/` directory: a local draft ticket would
just duplicate content the fact bullet itself already holds. A ticket link attaches directly to the
fact bullet it was created from once a real Linear issue exists; until then the bullet carries no
ticket link at all.
````

## 6. Create `wiki/{project-id}/index.md`

```markdown
# Wiki — <Project Name>

Last updated: <date>

- [Feature Requests](feature-requests/index.md) — what this project does, organized by capability
```

## 7. Create `wiki/{project-id}/feature-requests/index.md`

Header row only — no feature requests exist yet:

```markdown
# Feature Requests — <Project Name>

Last updated: <date>

| ID | Feature Request | Domain | Summary | Status | Open Questions | Last Touched |
|---|---|---|---|---|---|---|

## Dependency Graph
*Generated from every FR's `dependencies`/`conflicts` frontmatter — never hand-edited.*

Nothing recorded yet.
```

## 8. Confirm Before Pushing

Before touching git history or opening/updating a PR, show the user:
- the target repo (from Step 3) and branch name (`wiki/init-scaffold`, from Step 4)
- exactly what's about to be committed (`wiki/SCHEMA.md` if newly written, the
  `wiki/{project-id}/` tree)
- whether a PR will be **created** (no open PR found for this branch — see Step 10) or an existing
  one will simply gain a new **commit** (a PR for this branch already exists)

Get explicit go-ahead before proceeding — pushing and opening a PR are visible, shared-state
actions.

## 9. Branch, Commit, Push

```bash
git fetch "$TARGET_REMOTE"
git checkout wiki/init-scaffold 2>/dev/null || git checkout -b wiki/init-scaffold "$TARGET_REMOTE"/main 2>/dev/null || git checkout -b wiki/init-scaffold
git add wiki/SCHEMA.md wiki/{project-id}
git commit -m "chore: scaffold product-wiki directory structure for {project-id}"
git push -u "$TARGET_REMOTE" wiki/init-scaffold
```

## 10. Create or Reuse the PR

Check GitHub directly for an existing open PR on this branch — this is the authoritative check,
there's no local state file to consult:

```bash
gh pr list --repo "$REPO_SLUG" --head wiki/init-scaffold --state open --json url,number
```

- **If a PR is returned** — one already exists (opened by `/init-code-wiki` or a prior run).
  Nothing further to do; the commit just pushed lands on it automatically.
- **If none is returned** — this skill is the first of the two to reach this point. Create it:
  ```bash
  gh pr create --repo "$REPO_SLUG" --draft --title "Scaffold project wiki (code-wiki + product wiki)" --body "$(cat <<'EOF'
  ## Summary
  - Scaffolds wiki/SCHEMA.md and wiki/{project-id}/ (index.md, feature-requests/index.md — structure only, no content)
  - Long-lived scaffold PR: /wiki-ingest commits actual feature-request content here as it's written
  - Do not merge until the wiki has real content — this PR is the living wiki changeset

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  EOF
  )"
  ```

## 11. Report

Tell the user:
- `wiki/SCHEMA.md` was created (or already existed and was left untouched)
- `wiki/{project-id}/index.md` and `wiki/{project-id}/feature-requests/index.md` are scaffolded and
  pushed
- The PR URL (whether newly created or already existing)
- No `feature-requests/{feature-id}/feature-request.md` files exist yet — those get written by
  `/wiki-ingest` the first time an actual feature-relevant fact exists, as additional commits on
  the same branch/PR
- This was a one-time onboarding step — running it again will stop at the Step 1 guard

---

## Rules

- This skill never writes `feature-requests/{feature-id}/feature-request.md` — that
  content-writing step belongs to `/wiki-ingest`, not this scaffold.
- Never create `archive/meetings/`, `triage/`, or `decisions/` under `wiki/{project-id}/` — see
  the notes at the end of `wiki/SCHEMA.md` for why. There is no decisions ledger in this wiki.
- `wiki/SCHEMA.md` is written once for the whole `wiki/` tree, never per-project — check it
  doesn't already exist before writing it.
- **One-time only.** Always check the working tree, and the shared branch if nothing's local,
  first (Step 1) — never re-scaffold if `wiki/{project-id}/` already exists either place.
- Share the branch and PR with `/init-code-wiki` — always check `gh pr list --repo "$REPO_SLUG"
  --head wiki/init-scaffold` before creating one; never open a second PR if one is already open.
- **The target repository is always this workspace's own `origin` remote** (Step 3) — resolve
  `$REPO_SLUG` from it and use `origin`, plus `gh --repo`, for every git/gh operation.
- Never invent a git remote URL — if `origin` isn't configured, ask the user for it.
- Always confirm with the user (Step 8) before pushing or creating a PR.
- Never overwrite an existing `wiki/{project-id}/` — guard first, stop if content is already there.
