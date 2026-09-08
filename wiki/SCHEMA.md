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
