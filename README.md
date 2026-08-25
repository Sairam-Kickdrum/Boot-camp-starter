# Boot Camp Starter

A learning environment for KickDrum developers new to Claude Code. Clone it, run one command, and you have a working full-stack application ready for AI-assisted feature development.

## Quick start

**Prerequisites:** Node 20+, npm 9+, Docker, AWS CLI

```bash
git clone <repo-url> boot-camp-starter
cd boot-camp-starter
./scripts/bootstrap.sh
npm run dev
```

Open http://localhost:5173 — log in with `participant@example.com` / `Bootcamp1!`

That's it. From clone to working booking app in under 5 minutes.

## What's inside

A simplified room-booking application:
- React + Vite frontend
- Fastify REST API
- Postgres (via Docker Compose)
- AWS Cognito auth (LocalStack — no real AWS account needed)

## For cohort participants

Read [`docs/boot-camp/README.md`](docs/boot-camp/README.md) to understand how exercises work.

## Useful commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start API + web in parallel |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm test` | Run all unit tests |
| `npm run test:e2e` | Run Playwright tests |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:seed` | Seed local database |
| `./scripts/db-reset.sh` | Reset DB to clean state |
| `npm run cdk:synth` | Validate CDK infrastructure |
