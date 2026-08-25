# Git Worktrees in the Boot Camp

A git worktree lets you check out a branch into a **separate directory** while sharing the same git object store. Two directories, two Claude Code sessions, two independent commit histories — no stashing, no branch switching, no conflicts between parallel sessions.

---

## Exercise 03 — Parallel setup

After the BOOTCAMP-3 skeleton PR is created, all three capability sub-tickets (3-1, 3-2, 3-3) are fully independent. Worktrees are required — multiple Claude agents committing to the same working tree cause git conflicts.

### Normal flow — worktrees created automatically

When `/implement BOOTCAMP-3` completes and creates the skeleton PR, the workflow automatically:
1. Creates capability branches off the skeleton branch
2. Adds a worktree sibling directory for each
3. Runs `npm install` in each
4. Prints the ready-to-use terminal commands

You will see output like:
```
✅ Worktrees ready for parallel sub-tickets:

  BOOTCAMP-3-1 → ../bootcamp-03-1-admin-room-management
  BOOTCAMP-3-2 → ../bootcamp-03-2-admin-bookings-overview
  BOOTCAMP-3-3 → ../bootcamp-03-3-admin-user-management

Open each sub-ticket in Claude Code using either method:
...
```

### Starting your session

Choose either approach to open each sub-ticket:

**Option A — Claude Code (recommended):**
```bash
claude --worktree participant/<your-name>/03-1-admin-room-management
claude --worktree participant/<your-name>/03-2-admin-bookings-overview
claude --worktree participant/<your-name>/03-3-admin-user-management
```
Claude Code opens automatically in each worktree. In each session, run:
```
/implement BOOTCAMP-3-1
/implement BOOTCAMP-3-2
/implement BOOTCAMP-3-3
```

**Option B — terminal:**
Open three terminals and `cd` into each directory:
```bash
cd ../bootcamp-03-1-admin-room-management && /implement BOOTCAMP-3-1
cd ../bootcamp-03-2-admin-bookings-overview && /implement BOOTCAMP-3-2
cd ../bootcamp-03-3-admin-user-management && /implement BOOTCAMP-3-3
```

> You do not need to re-run Docker or database setup — all worktrees share the same running Postgres instance.

### Testing your implementation from a worktree

**Independent — run freely in each worktree terminal:**

```bash
npm run typecheck
npm run lint
npm test
```

These do not need the app running and do not conflict across worktrees. Run them in all three terminals simultaneously.

**E2E tests and manual testing require the app — one worktree at a time:**

Ports 3000 and 5173 can only be bound once. To test a specific worktree end-to-end:

1. Stop the current `npm run dev` (Ctrl+C in the dev terminal)
2. Start the app from the worktree you want to test:
   ```bash
   cd ../bootcamp-03-1-admin-room-management
   npm run dev
   ```
3. Open http://localhost:5173, log in, and verify the feature manually
4. Run the E2E suite for that worktree:
   ```bash
   npx playwright test e2e/exercises/03-admin-pages.spec.ts
   ```
5. Switch to the next worktree: Ctrl+C, cd to the next directory, repeat

> **Integration test note:** All worktrees share the same Postgres instance. Integration tests use transactions that roll back, so they are safe to run sequentially — but avoid running `npm test` across two worktrees simultaneously, as the shared database can produce flaky failures.

**Recommended order during parallel work:**
1. Run `npm test` continuously in each worktree terminal as Claude implements
2. Once a sub-ticket is fully implemented, switch the dev server to that worktree and run `npm run test:e2e`
3. No need to switch the dev server mid-implementation — unit tests give sufficient signal

---

### After all three PRs are merged, clean up

```bash
# From the main checkout — use the actual directory names printed above
git worktree remove ../bootcamp-03-1-admin-room-management
git worktree remove ../bootcamp-03-2-admin-bookings-overview
git worktree remove ../bootcamp-03-3-admin-user-management
```

---

### Manual setup (fallback only)

Use this only if you skipped the parent ticket flow or need to recreate a worktree.

**Step 1: Create branches (same for both options)**

```bash
# From the skeleton branch in boot-camp-starter
git checkout participant/<your-name>/03-admin-pages

git checkout -b participant/<your-name>/03-1-admin-room-management
git checkout participant/<your-name>/03-admin-pages

git checkout -b participant/<your-name>/03-2-admin-bookings-overview
git checkout participant/<your-name>/03-admin-pages

git checkout -b participant/<your-name>/03-3-admin-user-management
git checkout participant/<your-name>/03-admin-pages
```

**Step 2: Open worktrees — choose either option**

Option A — Claude Code (recommended):
```bash
claude --worktree participant/<your-name>/03-1-admin-room-management
claude --worktree participant/<your-name>/03-2-admin-bookings-overview
claude --worktree participant/<your-name>/03-3-admin-user-management
```
Then in each Claude session: `npm install && /implement BOOTCAMP-3-X`

Option B — git worktree add (existing approach):
```bash
git worktree add ../bootcamp-03-1-admin-room-management participant/<your-name>/03-1-admin-room-management
git worktree add ../bootcamp-03-2-admin-bookings-overview participant/<your-name>/03-2-admin-bookings-overview
git worktree add ../bootcamp-03-3-admin-user-management participant/<your-name>/03-3-admin-user-management

cd ../bootcamp-03-1-admin-room-management && npm install
cd ../bootcamp-03-2-admin-bookings-overview && npm install
cd ../bootcamp-03-3-admin-user-management && npm install
```

---

## Advanced — Cross-exercise parallelism (optional)

You can use the same worktree pattern to work on two different exercises side by side — for example, to reference your Exercise 01 implementation while working on Exercise 02. This is **not required** and is not part of the structured boot camp progression.

```bash
# Example: add a reference worktree for a completed exercise
git worktree add ../bootcamp-01-ref participant/<your-name>/01-cancel-booking
```

Open it in a separate terminal to browse the finished code. Do not run `/implement` in a reference worktree.

### Limitations for cross-exercise parallelism

| Constraint | Detail |
|---|---|
| **Port conflicts** | `npm run dev` binds to ports 3000 and 5173. Only one exercise can run the app at a time |
| **Shared Postgres** | One Docker instance, one database. Migrations from one worktree affect the other |
| **E2E tests** | Require `npm run dev` running — only one exercise can run E2E at a time |
| **`npm install` per worktree** | Each worktree needs its own `node_modules` (~300 MB) |
| **Pedagogical sequencing** | Exercises are designed to build on each other — doing them out of order risks missing patterns |

For full parallel development of two exercises, you would need to resolve the port and database conflicts manually (e.g., custom `.env` per worktree with different ports and a second Docker Compose stack). This is out of scope for the boot camp.

---

## Useful commands

| Command | What it does |
|---|---|
| `claude --worktree <branch>` | Create (or reuse) a worktree for `<branch>` and open a Claude Code session in it |
| `claude -w <branch>` | Short alias for `claude --worktree` |
| `git worktree list` | Show all active worktrees and their branches |
| `git worktree add <path> <branch>` | Check out a branch into a new directory |
| `git worktree remove <path>` | Remove a worktree (branch is not deleted) |
| `git worktree prune` | Clean up stale worktree metadata after manual directory deletion |
