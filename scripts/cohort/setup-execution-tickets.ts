/**
 * setup-execution-tickets.ts
 *
 * Creates individual boot camp execution tickets in Linear for each enrolled participant.
 *
 * For each participant:
 *   - One parent ticket:  "Boot Camp [cohort] — [participant name]"
 *   - Five sub-tickets:   one per exercise (BOOTCAMP-1 through BOOTCAMP-5)
 *
 * Usage:
 *   npx tsx scripts/cohort/setup-execution-tickets.ts \
 *     --cohort 2026-06 \
 *     --team <linear-team-id> \
 *     [--roster cohort-roster.csv] \
 *     [--dry-run]
 *
 * Required env vars:
 *   LINEAR_API_KEY          — Linear personal API key
 *
 * Optional env vars (read from .env if present):
 *   LINEAR_TEAM_ID          — default team ID (can be overridden with --team)
 */

import { readFileSync, existsSync } from "fs";
import { loadEnv, requireEnv, parseArg, REPO_ROOT } from "./_shared.js";
import { resolve } from "path";

// ─── Linear API client (lightweight — no SDK dependency) ──────────────────────

async function linearRequest(apiKey: string, query: string, variables?: Record<string, unknown>) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Linear API error: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data?: unknown; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Linear GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`);
  return json.data;
}

// ─── Exercise definitions ─────────────────────────────────────────────────────

interface Exercise {
  id: string;
  title: string;
  description: string;
  mode: string;
  difficulty: string;
}

const EXERCISES: Exercise[] = [
  {
    id: "BOOTCAMP-1",
    title: "Exercise 01 — Cancel a Booking",
    description:
      "**Mode:** Traditional Ticket (Mode 1) | **Difficulty:** Medium\n\n" +
      "Implement soft-delete cancellation for confirmed bookings. A user can cancel a confirmed booking they own, provided the check-in date has not yet passed. The booking is retained with `status = 'cancelled'` and a `cancelled_at` timestamp.\n\n" +
      "**Start here:** `docs/boot-camp/exercises/01-cancel-booking/01-feature-brief.md`",
    mode: "Traditional Ticket",
    difficulty: "Medium",
  },
  {
    id: "BOOTCAMP-2",
    title: "Exercise 02 — Change Booking Dates",
    description:
      "**Mode:** Standard AI-SDLC (Mode 2) | **Difficulty:** Medium\n\n" +
      "Implement atomic date modification for confirmed bookings. A user can change the check-in and check-out dates of a booking they own, with conflict detection that correctly excludes the booking being modified.\n\n" +
      "**Start here:** `docs/boot-camp/exercises/02-modify-booking-dates/01-feature-brief.md`",
    mode: "Standard AI-SDLC",
    difficulty: "Medium",
  },
  {
    id: "BOOTCAMP-3",
    title: "Exercise 03 — Admin Pages",
    description:
      "**Mode:** Standard AI-SDLC (Mode 2) | **Difficulty:** Medium–Complex\n\n" +
      "Build a tabbed admin dashboard behind RBAC (`requireRole('admin')`). Capabilities: view all bookings, create/edit/delete rooms, view all users, change user roles.\n\n" +
      "**Start here:** `docs/boot-camp/exercises/03-admin-pages/01-feature-brief.md`",
    mode: "Standard AI-SDLC",
    difficulty: "Medium–Complex",
  },
  {
    id: "BOOTCAMP-4",
    title: "Exercise 04 — Activity Log",
    description:
      "**Mode:** Standard AI-SDLC (Mode 2) | **Difficulty:** Medium–Complex\n\n" +
      "Add an append-only `booking_events` table that records every booking lifecycle event (created, cancelled, dates modified). A booking detail page at `/bookings/:id` shows the event timeline.\n\n" +
      "**Start here:** `docs/boot-camp/exercises/04-activity-log/01-feature-brief.md`",
    mode: "Standard AI-SDLC",
    difficulty: "Medium–Complex",
  },
  {
    id: "BOOTCAMP-5",
    title: "Exercise 05 — Email Notifications",
    description:
      "**Mode:** Standard AI-SDLC (Mode 2) | **Difficulty:** Medium–Complex\n\n" +
      "Send idempotent confirmation and cancellation emails via LocalStack SES. Notifications are fire-and-forget (do not block the API response) with up to 3 retry attempts and exponential backoff.\n\n" +
      "**Start here:** `docs/boot-camp/exercises/05-email-notifications/01-feature-brief.md`",
    mode: "Standard AI-SDLC",
    difficulty: "Medium–Complex",
  },
];

// ─── CSV parsing ──────────────────────────────────────────────────────────────

interface Participant {
  name: string;
  email: string;
}

function parseRoster(csvPath: string): Participant[] {
  const lines = readFileSync(csvPath, "utf8").split("\n").filter((l) => l.trim());
  const header = lines[0]?.toLowerCase() ?? "";
  const nameIdx = header.split(",").findIndex((h) => h.trim().includes("name"));
  const emailIdx = header.split(",").findIndex((h) => h.trim().includes("email"));

  if (nameIdx === -1 || emailIdx === -1) {
    throw new Error(`CSV must have 'name' and 'email' columns. Found header: ${lines[0]}`);
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const name = cols[nameIdx] ?? "";
    const email = cols[emailIdx] ?? "";
    if (!name || !email) throw new Error(`Invalid CSV row: ${line}`);
    return { name, email };
  });
}

// ─── Linear mutations ─────────────────────────────────────────────────────────

async function getTeamId(apiKey: string, teamFlag?: string): Promise<string> {
  if (teamFlag) return teamFlag;
  const envTeam = process.env["LINEAR_TEAM_ID"];
  if (envTeam) return envTeam;

  const data = (await linearRequest(apiKey, `{ teams { nodes { id name } } }`)) as {
    teams: { nodes: { id: string; name: string }[] };
  };
  const teams = data.teams.nodes;
  if (teams.length === 0) throw new Error("No Linear teams found. Check your API key.");
  if (teams.length === 1) return teams[0]!.id;
  throw new Error(
    `Multiple Linear teams found. Specify --team or set LINEAR_TEAM_ID.\nTeams: ${teams.map((t) => `${t.name} (${t.id})`).join(", ")}`,
  );
}

async function getTodoStateId(apiKey: string, teamId: string): Promise<string> {
  const data = (await linearRequest(
    apiKey,
    `query($teamId: String!) { workflowStates(filter: { team: { id: { eq: $teamId } }, type: { eq: "triage" } }) { nodes { id name } } }`,
    { teamId },
  )) as { workflowStates: { nodes: { id: string; name: string }[] } };

  const states = data.workflowStates.nodes;
  return states[0]?.id ?? "";
}

async function createIssue(
  apiKey: string,
  teamId: string,
  title: string,
  description: string,
  parentId?: string,
  stateId?: string,
): Promise<string> {
  const data = (await linearRequest(
    apiKey,
    `mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { issue { id identifier } } }`,
    {
      input: {
        teamId,
        title,
        description,
        ...(parentId ? { parentId } : {}),
        ...(stateId ? { stateId } : {}),
      },
    },
  )) as { issueCreate: { issue: { id: string; identifier: string } } };

  return data.issueCreate.issue.identifier;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Result {
  participant: string;
  email: string;
  parentTicket: string;
  subTickets: string[];
  error?: string;
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const cohort = parseArg(args, "--cohort");
  const rosterPath = parseArg(args, "--roster");
  const teamFlag = parseArg(args, "--team");
  const dryRun = args.includes("--dry-run");

  if (!cohort) {
    console.error("Usage: npx tsx scripts/cohort/setup-execution-tickets.ts --cohort <cohort-id> [--team <team-id>] [--roster <path>] [--dry-run]");
    process.exit(1);
  }

  const csvPath = rosterPath
    ? resolve(process.cwd(), rosterPath)
    : resolve(REPO_ROOT, "cohort-roster.csv");

  if (!existsSync(csvPath)) {
    console.error(`Roster not found: ${csvPath}\nCreate it or pass --roster <path>`);
    process.exit(1);
  }

  const participants = parseRoster(csvPath);
  console.log(`\nBoot Camp Execution Ticket Setup`);
  console.log(`Cohort:       ${cohort}`);
  console.log(`Participants: ${participants.length}`);
  console.log(`Dry run:      ${dryRun}`);
  console.log(`Roster:       ${csvPath}\n`);

  if (dryRun) {
    console.log("── DRY RUN — no tickets will be created ──\n");
    for (const p of participants) {
      console.log(`📋 Boot Camp ${cohort} — ${p.name} (${p.email})`);
      for (const ex of EXERCISES) {
        console.log(`   └─ ${ex.title}`);
      }
    }
    console.log(`\nWould create: ${participants.length} parent tickets + ${participants.length * EXERCISES.length} sub-tickets`);
    return;
  }

  const apiKey = requireEnv("LINEAR_API_KEY");
  const teamId = await getTeamId(apiKey, teamFlag);
  const triageStateId = await getTodoStateId(apiKey, teamId);

  console.log(`Linear team: ${teamId}\n`);

  const results: Result[] = [];

  for (const participant of participants) {
    const result: Result = {
      participant: participant.name,
      email: participant.email,
      parentTicket: "",
      subTickets: [],
    };

    try {
      // Create parent ticket
      const parentTitle = `Boot Camp ${cohort} — ${participant.name}`;
      const parentDescription =
        `**Participant:** ${participant.name} (${participant.email})\n` +
        `**Cohort:** ${cohort}\n\n` +
        `This ticket tracks all 5 boot camp exercises for this participant. Each sub-ticket is one exercise.\n\n` +
        `**Workflow:** For each exercise, branch from \`claude-harness-v1.0.1\`, run \`/implement BOOTCAMP-N\`, and open a PR to \`solutions/NN-exercise-name\`.\n\n` +
        `**Exercises:**\n${EXERCISES.map((e) => `- ${e.title} (${e.mode}, ${e.difficulty})`).join("\n")}`;

      result.parentTicket = await createIssue(apiKey, teamId, parentTitle, parentDescription, undefined, triageStateId);
      console.log(`✅ Created parent: ${result.parentTicket} — ${parentTitle}`);

      // Need internal ID for parentId
      const parentInternalId = await getIssueInternalId(apiKey, result.parentTicket);

      // Create sub-tickets for each exercise
      for (const exercise of EXERCISES) {
        const subTitle = `[${cohort}] [${participant.name}] ${exercise.title}`;
        const subId = await createIssue(apiKey, teamId, subTitle, exercise.description, parentInternalId);
        result.subTickets.push(subId);
        console.log(`   └─ ${subId}: ${exercise.id}`);
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      console.error(`❌ Failed for ${participant.name}: ${result.error}`);
    }

    results.push(result);
  }

  // Summary table
  console.log("\n── Summary ──────────────────────────────────────────────────");
  console.log(`${"Participant".padEnd(25)} ${"Parent".padEnd(12)} ${"Sub-tickets"}`);
  console.log("─".repeat(70));
  for (const r of results) {
    if (r.error) {
      console.log(`${r.participant.padEnd(25)} ERROR: ${r.error}`);
    } else {
      console.log(`${r.participant.padEnd(25)} ${r.parentTicket.padEnd(12)} ${r.subTickets.join(", ")}`);
    }
  }

  const failed = results.filter((r) => r.error).length;
  console.log(`\nCreated: ${results.length - failed} / ${results.length} participants`);
  if (failed > 0) console.log(`Failed:  ${failed} (see errors above)`);
}

async function getIssueInternalId(apiKey: string, identifier: string): Promise<string> {
  const data = (await linearRequest(
    apiKey,
    `query($id: String!) { issue(id: $id) { id } }`,
    { id: identifier },
  )) as { issue: { id: string } };
  return data.issue.id;
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
