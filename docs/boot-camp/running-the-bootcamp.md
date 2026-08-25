# Running the Boot Camp

Operational guide covering facilitator setup, participant onboarding, user management, and teardown.

---

## Roles

| Role                  | Responsibility                                                              |
| --------------------- | --------------------------------------------------------------------------- |
| **Facilitator** | Provisions Cognito accounts, distributes credentials, supports participants |
| **Participant** | Clones the repo, completes exercises using Claude Code                      |

---

## Facilitator — before the cohort starts

### Prerequisites

- Node 20+ (Node 24 recommended), npm 9+ installed
- AWS CLI v2 configured with the KickDrum shared dev account credentials

### Step 0 — First-time env setup

If you have not set up the repo before:

```bash
cp .env.example .env
npm install
```

Open `.env` and fill in your Cognito pool details (`COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `AWS_REGION`). If you do not have a User Pool yet, follow [`docs/boot-camp/cognito-setup.md`](./cognito-setup.md) first.

### Step 1 — Build the roster

```bash
cp cohort-roster.example.csv cohort-roster.csv
```

Edit `cohort-roster.csv`. One row per participant:

```
name,email,role
Alice Smith,alice.smith@yopmail.com,user
Bob Jones,bob.jones@yopmail.com,user
Dave Mentor,dave.mentor@yopmail.com,admin
```

- `role = user` — standard user to the application
- `role = admin` — admin users (gets access to admin API routes)

### Step 2 — Provision participants in Cognito

```bash
npm run cohort:provision -- --cohort 2026-06 --roster cohort-roster.csv
```

This will:

1. Create the `cohort-2026-06` group in Cognito (idempotent — safe to re-run)
2. Create each participant's account with a permanent randomly-generated password
3. Add each participant to `cohort-2026-06` (and `admin` group for admin rows)
4. Write `credentials-2026-06.csv` to the repo root

### Step 3 — Create Linear exercise tickets

Once the roster is finalised, create the Linear ticket hierarchy for each participant using the `/create-cohort-tickets` Claude Code skill. **No API key required** — it uses the Linear MCP already authenticated in your Claude Code session.

Each participant gets:

- One **enrollment parent ticket** — "Boot Camp — [name]"
- Five **exercise parent tickets** (sub-issues) — one per exercise
- **Capability sub-tickets** for exercises 03–05, with dependency relationships set automatically

Ticket content is read directly from the exercise scoping docs in `docs/boot-camp/exercises/*/04-scoping-doc.md`.

**Open Claude Code in the boot-camp-starter directory, then:**

```
# Dry run — verify the planned hierarchy without creating anything
/create-cohort-tickets --roster cohort-roster.csv --dry-run

# Live run — creates all tickets in Linear via MCP
/create-cohort-tickets --roster cohort-roster.csv

# To nest all tickets under an existing Linear ticket
/create-cohort-tickets --roster cohort-roster.csv --parent https://linear.app/my-org/issue/KD-123
```

If you have multiple Linear teams, Claude will ask you to choose.

> **Prerequisite:** The Linear MCP must be connected in your Claude Code session. If not connected, add it via Claude Code settings → MCP servers.

---

### Step 4 — Distribute credentials

Open `credentials-2026-06.csv`. For each participant, send them **via a secure internal channel**:

- Their email address
- Their password
- The value of `COGNITO_USER_POOL_ID`
- The value of `COGNITO_CLIENT_ID`

> **Delete `credentials-2026-06.csv` from your machine after distribution.** The file is gitignored and must not be committed or left on disk.

---

## Participant — getting started

### Prerequisites

- Node 20+ (Node 24 recommended), npm 9+
- Docker Desktop — install from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) or via Homebrew:
  ```bash
  brew install --cask docker
  open -a Docker   # launch Docker Desktop; wait for the whale icon in the menu bar
  ```
- `gh` CLI (`brew install gh`) — needed to open PRs during exercises
- AWS credentials **not required**

### Step 1 — Clone the repo

```bash
git clone <repo-url>
cd boot-camp-starter
```

### Step 2 — Configure your environment

```bash
cp .env.cohort.example .env
```

Open `.env` and fill in the two values your facilitator sent:

```env
COGNITO_USER_POOL_ID=<provided by facilitator>
COGNITO_CLIENT_ID=<provided by facilitator>
```

Leave everything else as-is.

### Step 3 — Bootstrap

```bash
./scripts/bootstrap.sh
```

This installs dependencies, starts Docker (Postgres + LocalStack), runs database migrations, and seeds the database.

### Step 3a — Install Playwright browsers (once)

```bash
npx playwright install chromium
```

Required for `npm run test:e2e`. Only needs to be done once per machine.

### Step 4 — Start the app

```bash
npm run dev
```

Open **http://localhost:5173** and log in with the email and password your facilitator sent.

Your account is created in the local database automatically on first login — no extra steps needed.

---

## Adding a new user mid-cohort

### Add one participant

```bash
echo "name,email,role" > one-user.csv
echo "Carol White,carol.white@yopmail.com,user" >> one-user.csv

npm run cohort:provision -- --cohort 2026-06 --roster one-user.csv
```

The script is idempotent — existing users are not affected, only the new one is created.

### Reset a forgotten password

```bash
# Generate a new random password (printed to stdout)
npm run cohort:reset -- --email carol.white@yopmail.com

# Or set a specific password
npm run cohort:reset -- --email carol.white@yopmail.com --password "NewPass123!"
```

Share the new password with the participant via a secure channel.

---

## Facilitator — during the cohort

### Check participant status

```bash
npm run cohort:list -- --cohort 2026-06
```

Shows each participant's email, name, account status (`CONFIRMED` = logged in at least once), and whether their account is enabled.

---

## Facilitator — after the cohort

```bash
npm run cohort:teardown -- --cohort 2026-06
```

Disables all accounts in the cohort group. Users are **not deleted** — they can be re-enabled via the AWS Console if needed.

---

## Exercise workflow (participants)

**Exercises 01 and 02** — single ticket, one branch, one PR:

```bash
# 1. Start from the stable scaffold tag
git checkout claude-harness-v1.0.1

# 2. Read the exercise docs in order
cat docs/boot-camp/exercises/01-cancel-booking/01-feature-brief.md
cat docs/boot-camp/exercises/01-cancel-booking/03-architecture-plan.md
cat docs/boot-camp/exercises/01-cancel-booking/04-scoping-doc.md

# 3. Implement — branch participant/<your-name>/01-cancel-booking is auto-created
/implement BOOTCAMP-1
```

**Exercises 03, 04, 05** — parent skeleton PR first, then capability sub-tickets:

```bash
# 1. Start from the stable scaffold tag
git checkout claude-harness-v1.0.1

# 2. Read the exercise docs in order
cat docs/boot-camp/exercises/03-admin-pages/01-feature-brief.md
cat docs/boot-camp/exercises/03-admin-pages/03-architecture-plan.md
cat docs/boot-camp/exercises/03-admin-pages/04-scoping-doc.md

# 3. Implement the skeleton — branch + PR auto-created; PR targets solutions/03-admin-pages
/implement BOOTCAMP-3
# ↳ After the skeleton PR is pushed, the workflow auto-creates worktree directories
#   for each parallel capability sub-ticket and prints the /implement commands.

# 4. Open each sub-ticket in Claude Code using either method:

# Option A — Claude Code (recommended):
claude --worktree participant/<name>/03-1-admin-room-management
# In that Claude session, run: /implement BOOTCAMP-3-1

# Option B — terminal (existing approach):
cd ../bootcamp-03-1-admin-room-management && /implement BOOTCAMP-3-1   # PRs target participant/<name>/03-admin-pages

# Repeat for the other sub-tickets (03-2, 03-3)
```

For Exercise 03, all three capability worktrees are created automatically after the skeleton PR step. See [`docs/boot-camp/git-worktrees.md`](./git-worktrees.md) if you need to set them up manually.

Each exercise folder contains three documents:

| File                        | What it is                                                                      |
| --------------------------- | ------------------------------------------------------------------------------- |
| `01-feature-brief.md`     | What to build — user story, acceptance criteria, edge cases                    |
| `03-architecture-plan.md` | Target architecture — grounded in the actual codebase                          |
| `04-scoping-doc.md`       | Ticket breakdown — parent ticket + capability sub-tickets for exercises 03–05 |

See [`README.md`](./README.md) for the full exercise list and [`review-checklist.md`](./review-checklist.md) for what reviewers check.

---

## Useful commands

| Command                              | Who                       | What it does                                                |
| ------------------------------------ | ------------------------- | ----------------------------------------------------------- |
| `git worktree add <path> <branch>` | Participant               | Set up an isolated working tree for parallel Exercise 03 sessions — see [git-worktrees.md](./git-worktrees.md) |
| `npm run dev`                      | Participant               | Start API + web                                             |
| `npm run test`                     | Participant               | Run unit tests                                              |
| `npx playwright install chromium`  | Participant               | Install Playwright browser (once per machine)               |
| `npm run test:e2e`                 | Participant               | Run Playwright E2E tests                                    |
| `./scripts/db-reset.sh`            | Participant               | Reset local DB to clean state                               |
| `npm run cohort:provision`         | Facilitator               | Create Cognito accounts from a roster                       |
| `/create-cohort-tickets --dry-run` | Facilitator (Claude Code) | Preview Linear ticket structure without creating anything   |
| `/create-cohort-tickets`           | Facilitator (Claude Code) | Create Linear exercise tickets via MCP — no API key needed |
| `npm run cohort:list`              | Facilitator               | List participants and their status                          |
| `npm run cohort:reset`             | Facilitator               | Reset a participant's password                              |
| `npm run cohort:teardown`          | Facilitator               | Disable all accounts after cohort ends                      |
