/**
 * create-exercise-tickets.ts
 *
 * Reads all exercise scoping docs, parses the ticket definitions, and creates
 * the full Linear ticket hierarchy for each enrolled participant.
 *
 * Hierarchy created per participant:
 *
 *   Boot Camp [cohort] — [participant name]       (enrollment parent)
 *     BOOTCAMP-1: Cancel a Booking                (single ticket)
 *     BOOTCAMP-2: Change Booking Dates            (single ticket)
 *     BOOTCAMP-3: Admin Pages                     (parent)
 *       BOOTCAMP-3-1: Room Management             (sub-ticket)
 *       BOOTCAMP-3-2: Bookings Overview           (sub-ticket, depends on 3-1)
 *       BOOTCAMP-3-3: User Management             (sub-ticket, depends on 3-1)
 *     BOOTCAMP-4: Activity Log                    (parent)
 *       BOOTCAMP-4-1: Backend                     (sub-ticket)
 *       BOOTCAMP-4-2: Frontend                    (sub-ticket, depends on 4-1)
 *     BOOTCAMP-5: Email Notifications             (parent)
 *       BOOTCAMP-5-1: Notification Infrastructure (sub-ticket)
 *       BOOTCAMP-5-2: Booking Hooks & Tests       (sub-ticket, depends on 5-1)
 *
 * Usage:
 *   npx tsx scripts/cohort/create-exercise-tickets.ts \
 *     --cohort 2026-06 \
 *     [--team <linear-team-id>] \
 *     [--roster cohort-roster.csv] \
 *     [--dry-run]
 *
 * Required env: LINEAR_API_KEY
 * Optional env: LINEAR_TEAM_ID
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { loadEnv, requireEnv, parseArg, REPO_ROOT } from "./_shared.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedTicket {
  refId: string;         // e.g. "BOOTCAMP-1", "BOOTCAMP-3-1"
  title: string;         // e.g. "Cancel a Booking"
  type: "enrollment" | "feature-parent" | "capability";
  exerciseNum: string;   // "01"–"05"
  isParent: boolean;     // true for feature-parent (has capability sub-tickets)
  dependsOnRefs: string[]; // refIds this ticket depends on (within same exercise)
  description: string;   // Linear-ready content
}

interface Participant {
  name: string;
  email: string;
}

// Maps refId → Linear internal UUID (filled during creation)
type IdMap = Map<string, string>;

// ─── Linear API (minimal GraphQL client) ─────────────────────────────────────

async function gql(apiKey: string, query: string, variables?: Record<string, unknown>) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Linear HTTP ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { data?: unknown; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  return body.data as Record<string, unknown>;
}

async function resolveTeamId(apiKey: string, flag?: string): Promise<string> {
  if (flag) return flag;
  if (process.env["LINEAR_TEAM_ID"]) return process.env["LINEAR_TEAM_ID"]!;
  const data = await gql(apiKey, `{ teams { nodes { id name } } }`);
  const teams = (data["teams"] as { nodes: { id: string; name: string }[] }).nodes;
  if (!teams.length) throw new Error("No Linear teams found. Check your API key.");
  if (teams.length === 1) return teams[0]!.id;
  throw new Error(
    `Multiple teams found — specify --team or set LINEAR_TEAM_ID.\n` +
      teams.map((t) => `  ${t.name}  (${t.id})`).join("\n"),
  );
}

async function getTriageStateId(apiKey: string, teamId: string): Promise<string> {
  const data = await gql(
    apiKey,
    `query($tid: String!) {
       workflowStates(filter: { team: { id: { eq: $tid } } }) {
         nodes { id name type }
       }
     }`,
    { tid: teamId },
  );
  const states = (
    data["workflowStates"] as { nodes: { id: string; name: string; type: string }[] }
  ).nodes;
  // Prefer explicit triage state; fall back to first backlog; then first state
  return (
    states.find((s) => s.type === "triage")?.id ??
    states.find((s) => s.type === "backlog")?.id ??
    states[0]?.id ??
    ""
  );
}

async function createIssue(
  apiKey: string,
  teamId: string,
  stateId: string,
  title: string,
  description: string,
  parentInternalId?: string,
): Promise<{ id: string; identifier: string }> {
  const data = await gql(
    apiKey,
    `mutation($input: IssueCreateInput!) {
       issueCreate(input: $input) { issue { id identifier } }
     }`,
    {
      input: {
        teamId,
        title,
        description,
        stateId,
        ...(parentInternalId ? { parentId: parentInternalId } : {}),
      },
    },
  );
  return (data["issueCreate"] as { issue: { id: string; identifier: string } }).issue;
}

async function setBlocks(apiKey: string, blockerId: string, blockedById: string): Promise<void> {
  // blockerId "blocks" blockedById  →  blockedById "depends on" blockerId
  await gql(
    apiKey,
    `mutation($input: IssueRelationCreateInput!) {
       issueRelationCreate(input: $input) { issueRelation { id } }
     }`,
    { input: { issueId: blockerId, relatedIssueId: blockedById, type: "blocks" } },
  );
}

// ─── Scoping doc parser ───────────────────────────────────────────────────────

/**
 * Extracts a named subsection from a parent section string.
 * Returns the content between `### <name>` and the next `###` or `##`.
 */
function extractSubsection(section: string, name: string): string {
  const re = new RegExp(`### ${name}\\s*\\n([\\s\\S]*?)(?=\\n###|\\n##|$)`, "i");
  return section.match(re)?.[1]?.trim() ?? "";
}

/**
 * Applies Linear-ready trim: removes lines that contain implementation details
 * (file paths, migration patterns, convention codes, entity field types).
 */
function linearTrim(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      // Remove lines that are purely file-path references
      if (/`(apps\/|db\/|packages\/|scripts\/)/.test(line)) return false;
      // Remove migration version patterns
      if (/V\d+\.\d+__/.test(line)) return false;
      // Remove lines that are just TypeScript type signatures
      if (/^\s*(export|import)\s+(type|const|class|interface)/.test(line)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Builds a Linear-ready description from extracted ticket sections.
 */
function buildDescription(sections: {
  summary: string;
  context: string;
  whatUserCanDo: string;
  acs: string;
  scopeBoundaries: string;
  subTickets?: string;
}): string {
  const parts: string[] = [];

  if (sections.summary) parts.push(`## Summary\n\n${sections.summary}`);
  if (sections.subTickets) parts.push(`## Sub-tickets\n\n${sections.subTickets}`);
  if (sections.context) parts.push(`## Context — Where This Lives\n\n${sections.context}`);
  if (sections.whatUserCanDo) parts.push(`## What the User Can Do\n\n${sections.whatUserCanDo}`);
  if (sections.acs) parts.push(`## Acceptance Criteria\n\n${sections.acs}`);
  if (sections.scopeBoundaries) parts.push(`## Scope Boundaries\n\n${sections.scopeBoundaries}`);

  return linearTrim(parts.join("\n\n---\n\n"));
}

/**
 * Parses a scoping doc and returns all ticket definitions.
 */
function parseScopingDoc(content: string, exerciseNum: string): ParsedTicket[] {
  const tickets: ParsedTicket[] = [];

  // Split into top-level sections (## headers)
  const sections = content.split(/(?=^## )/m);

  for (const section of sections) {
    // Match: ## Parent Ticket: BOOTCAMP-N — Optional Title
    const parentMatch = section.match(/^## Parent Ticket:\s*(BOOTCAMP-\d+)(?:\s*[—–-]\s*(.+))?/m);
    // Match: ## Ticket BOOTCAMP-N(-N)?: Title
    const ticketMatch = section.match(/^## Ticket\s+(BOOTCAMP-[\d-]+):\s*(.+)/m);

    if (!parentMatch && !ticketMatch) continue;

    const refId = (parentMatch?.[1] ?? ticketMatch?.[1])?.trim();
    if (!refId) continue;
    // Title: from header suffix → body **Summary:** → "# Title:" line → refId fallback
    const rawTitle =
      (parentMatch?.[2] ?? ticketMatch?.[2])?.trim() ||
      section.match(/\*\*Summary:\*\*\s*(.+?)(?:\.|$)/m)?.[1]?.trim() ||
      section.match(/^# [^:]+:\s*(.+)/m)?.[1]?.trim() ||
      // For exercise scoping docs, derive from the Feature Overview first sentence
      section.match(/(?:admin|activity|email|cancel|booking)[^\n.!?]*/i)?.[0]?.trim().replace(/\*\*/g, "") ||
      refId;
    const isParent = !!parentMatch;

    // Parse depends-on from the metadata block
    const dependsOnRaw = section.match(/\*\*Depends on:\*\*\s*(.+)/)?.[1] ?? "None";
    const dependsOnRefs =
      dependsOnRaw.trim().toLowerCase() === "none"
        ? []
        : dependsOnRaw.match(/BOOTCAMP-[\d-]+/g) ?? [];

    // Extract sub-ticket list for parent tickets
    let subTicketsText = "";
    if (isParent) {
      const subMatch = section.match(/\*\*Sub-tickets:\*\*([\s\S]*?)(?=\n\n|\*\*Note|\*\*This ticket)/);
      if (subMatch) subTicketsText = subMatch[1]!.trim();
    }

    // Extract description sections
    const summary = extractSubsection(section, "Summary");
    const context = extractSubsection(section, "Context — Where This Lives");
    const whatUserCanDo = extractSubsection(section, "What the User Can Do");
    const acs = extractSubsection(section, "Acceptance Criteria");
    const scopeBoundaries = extractSubsection(section, "Scope Boundaries");

    // For parent tickets with no subsections, extract Summary-like content from the body
    let bodyContext = "";
    let bodySubTickets = subTicketsText;
    if (isParent && !summary) {
      const contextMatch = section.match(/\*\*Context:\*\*\n([\s\S]*?)(?=\n\*\*|\n---)/);
      if (contextMatch) bodyContext = contextMatch[1]!.trim();
    }

    const description = buildDescription({
      summary: summary || section.match(/\*\*Summary:\*\*\s*(.*)/)?.[1] || "",
      context: context || bodyContext,
      whatUserCanDo,
      acs,
      scopeBoundaries,
      subTickets: bodySubTickets || undefined,
    });

    tickets.push({
      refId,
      title: rawTitle,
      type: isParent ? "feature-parent" : "capability",
      exerciseNum,
      isParent,
      dependsOnRefs,
      description,
    });
  }

  return tickets;
}

// ─── Load exercises from scoping docs ────────────────────────────────────────

const EXERCISE_SLUGS: Record<string, string> = {
  "01": "01-cancel-booking",
  "02": "02-modify-booking-dates",
  "03": "03-admin-pages",
  "04": "04-activity-log",
  "05": "05-email-notifications",
};

function loadAllExercises(): ParsedTicket[] {
  const all: ParsedTicket[] = [];
  for (const [num, slug] of Object.entries(EXERCISE_SLUGS)) {
    const docPath = resolve(
      REPO_ROOT,
      `docs/boot-camp/exercises/${slug}/04-scoping-doc.md`,
    );
    if (!existsSync(docPath)) {
      console.warn(`⚠️  Scoping doc not found: ${docPath} — skipping exercise ${num}`);
      continue;
    }
    const content = readFileSync(docPath, "utf8");
    const tickets = parseScopingDoc(content, num);
    if (!tickets.length) {
      console.warn(`⚠️  No tickets parsed from exercise ${num} — check section headers`);
    }
    all.push(...tickets);
  }
  return all;
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseRoster(csvPath: string): Participant[] {
  const lines = readFileSync(csvPath, "utf8")
    .split("\n")
    .filter((l) => l.trim());
  const headerCols = lines[0]!.toLowerCase().split(",").map((c) => c.trim());
  const nameIdx = headerCols.findIndex((h) => h.includes("name"));
  const emailIdx = headerCols.findIndex((h) => h.includes("email"));
  if (nameIdx === -1 || emailIdx === -1)
    throw new Error(`CSV must have 'name' and 'email' columns. Found: ${lines[0]}`);
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const name = cols[nameIdx] ?? "";
    const email = cols[emailIdx] ?? "";
    if (!name || !email) throw new Error(`Invalid CSV row: "${line}"`);
    return { name, email };
  });
}

// ─── Ticket creation ──────────────────────────────────────────────────────────

interface CreatedTicket {
  refId: string;
  linearId: string;       // internal UUID
  linearIdentifier: string; // e.g. "KD-42"
}

async function createHierarchyForParticipant(
  apiKey: string,
  teamId: string,
  stateId: string,
  cohort: string,
  participant: Participant,
  allTickets: ParsedTicket[],
  dryRun: boolean,
): Promise<{ enrollmentIdentifier: string; created: CreatedTicket[]; failed: string[] }> {
  const created: CreatedTicket[] = [];
  const failed: string[] = [];
  const idMap: IdMap = new Map();

  // ── Step 1: Create enrollment parent ────────────────────────────────────────
  const enrollmentTitle = `Boot Camp ${cohort} — ${participant.name}`;
  const enrollmentDesc =
    `**Participant:** ${participant.name} (${participant.email})\n` +
    `**Cohort:** ${cohort}\n\n` +
    `This ticket tracks all 5 boot camp exercises for this participant.\n\n` +
    `**Exercise sub-tickets:**\n` +
    allTickets
      .filter((t) => t.type === "feature-parent" || (t.type === "capability" && !allTickets.some((p) => p.isParent && p.exerciseNum === t.exerciseNum)))
      .filter((t, _, arr) => {
        // One line per exercise — only the root ticket per exercise
        const ex = t.exerciseNum;
        const hasParent = arr.some((p) => p.isParent && p.exerciseNum === ex);
        return hasParent ? t.isParent : t.exerciseNum === ex;
      })
      .map((t) => `- ${t.refId}: ${t.title}`)
      .join("\n") + "\n\n" +
    `**Workflow for each exercise:**\n` +
    `1. Branch from \`claude-harness-v1.0.1\`: \`git checkout claude-harness-v1.0.1 && git checkout -b participant/${participant.name.toLowerCase().replace(/\s+/g, "-")}/NN-exercise\`\n` +
    `2. Read \`docs/boot-camp/exercises/NN-name/01-feature-brief.md\`\n` +
    `3. Run \`/implement BOOTCAMP-N\`\n` +
    `4. Open PR to \`solutions/NN-name\` — never to \`main\``;

  let enrollmentId = "DRY-RUN-enrollment";
  let enrollmentIdentifier = "DRY-RUN";

  if (!dryRun) {
    try {
      const issue = await createIssue(apiKey, teamId, stateId, enrollmentTitle, enrollmentDesc);
      enrollmentId = issue.id;
      enrollmentIdentifier = issue.identifier;
      idMap.set("ENROLLMENT", enrollmentId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Failed to create enrollment ticket: ${msg}`);
      return { enrollmentIdentifier: "ERROR", created, failed: [`enrollment: ${msg}`] };
    }
  }

  console.log(`  ✔ Enrollment: ${enrollmentIdentifier} — ${enrollmentTitle}`);

  // ── Step 2: Group tickets by exercise, create in order ────────────────────
  const exercises = [...new Set(allTickets.map((t) => t.exerciseNum))].sort();

  for (const exNum of exercises) {
    const exTickets = allTickets.filter((t) => t.exerciseNum === exNum);
    const parentTicket = exTickets.find((t) => t.isParent);
    const capabilityTickets = exTickets.filter((t) => !t.isParent);

    // Create feature-parent (or single capability for ex 01/02)
    const rootTickets = parentTicket ? [parentTicket] : capabilityTickets;

    for (const ticket of rootTickets) {
      const linearTitle = `[${cohort}] [${participant.name}] ${ticket.refId}: ${ticket.title}`;
      let linearId = `DRY-RUN-${ticket.refId}`;
      let linearIdentifier = `DRY-RUN-${ticket.refId}`;

      if (!dryRun) {
        try {
          const issue = await createIssue(
            apiKey, teamId, stateId,
            linearTitle, ticket.description,
            enrollmentId,
          );
          linearId = issue.id;
          linearIdentifier = issue.identifier;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          failed.push(`${ticket.refId}: ${msg}`);
          console.error(`  ✗ ${ticket.refId}: ${msg}`);
          continue;
        }
      }

      idMap.set(ticket.refId, linearId);
      created.push({ refId: ticket.refId, linearId, linearIdentifier });
      const indent = "      ";
      console.log(`${indent}✔ ${linearIdentifier} — ${ticket.refId}: ${ticket.title}`);

      // If this is a parent, create its sub-tickets
      if (parentTicket && ticket.isParent) {
        for (const cap of capabilityTickets) {
          const capTitle = `[${cohort}] [${participant.name}] ${cap.refId}: ${cap.title}`;
          let capId = `DRY-RUN-${cap.refId}`;
          let capIdentifier = `DRY-RUN-${cap.refId}`;

          if (!dryRun) {
            try {
              const issue = await createIssue(
                apiKey, teamId, stateId,
                capTitle, cap.description,
                linearId, // parent = feature-parent ticket
              );
              capId = issue.id;
              capIdentifier = issue.identifier;
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              failed.push(`${cap.refId}: ${msg}`);
              console.error(`  ✗ ${cap.refId}: ${msg}`);
              continue;
            }
          }

          idMap.set(cap.refId, capId);
          created.push({ refId: cap.refId, linearId: capId, linearIdentifier: capIdentifier });
          console.log(`${indent}  ✔ ${capIdentifier} — ${cap.refId}: ${cap.title}`);
        }
      }
    }
  }

  // ── Step 3: Set dependency relations (blocks) ─────────────────────────────
  if (!dryRun) {
    for (const ticket of allTickets) {
      for (const depRef of ticket.dependsOnRefs) {
        const blockerId = idMap.get(depRef);
        const blockedId = idMap.get(ticket.refId);
        if (!blockerId || !blockedId) {
          console.warn(`  ⚠ Could not set dependency ${depRef} → ${ticket.refId} (IDs missing)`);
          continue;
        }
        try {
          await setBlocks(apiKey, blockerId, blockedId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`  ⚠ Dependency ${depRef} → ${ticket.refId}: ${msg}`);
        }
      }
    }
  }

  return { enrollmentIdentifier, created, failed };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const cohort = parseArg(args, "--cohort");
  const rosterPath = parseArg(args, "--roster");
  const teamFlag = parseArg(args, "--team");
  const dryRun = args.includes("--dry-run");

  if (!cohort) {
    console.error(
      "Usage: npx tsx scripts/cohort/create-exercise-tickets.ts\n" +
        "         --cohort <cohort-id>\n" +
        "        [--team <linear-team-id>]\n" +
        "        [--roster <path-to-csv>]\n" +
        "        [--dry-run]",
    );
    process.exit(1);
  }

  // Load and parse all exercise scoping docs
  const allTickets = loadAllExercises();
  if (!allTickets.length) {
    console.error("No tickets parsed. Check that scoping docs exist at docs/boot-camp/exercises/*/04-scoping-doc.md");
    process.exit(1);
  }

  // Show what we parsed
  const exerciseSummary: Record<string, string[]> = {};
  for (const t of allTickets) {
    if (!exerciseSummary[t.exerciseNum]) exerciseSummary[t.exerciseNum] = [];
    exerciseSummary[t.exerciseNum]!.push(`${t.refId}${t.isParent ? " (parent)" : ""}`);
  }

  console.log("\n── Parsed ticket structure ──────────────────────────────");
  for (const [num, ids] of Object.entries(exerciseSummary)) {
    console.log(`  Exercise ${num}: ${ids.join(" → ")}`);
  }
  console.log("");

  // Load participant roster
  const csvPath = rosterPath
    ? resolve(process.cwd(), rosterPath)
    : resolve(REPO_ROOT, "cohort-roster.csv");
  if (!existsSync(csvPath)) {
    console.error(`Roster not found: ${csvPath}\nCreate it or pass --roster <path>`);
    process.exit(1);
  }
  const participants = parseRoster(csvPath);

  console.log(`── Setup ─────────────────────────────────────────────────`);
  console.log(`Cohort:       ${cohort}`);
  console.log(`Participants: ${participants.length}`);
  console.log(`Dry run:      ${dryRun}`);
  console.log(`Roster:       ${csvPath}`);

  if (dryRun) {
    console.log("\n── DRY RUN — no tickets will be created ─────────────────\n");
    for (const p of participants) {
      console.log(`📋 Boot Camp ${cohort} — ${p.name} (${p.email})`);
      const exercises = [...new Set(allTickets.map((t) => t.exerciseNum))].sort();
      for (const exNum of exercises) {
        const exTickets = allTickets.filter((t) => t.exerciseNum === exNum);
        const parent = exTickets.find((t) => t.isParent);
        const caps = exTickets.filter((t) => !t.isParent);
        if (parent) {
          console.log(`   📂 ${parent.refId}: ${parent.title}`);
          for (const cap of caps) {
            const dep = cap.dependsOnRefs.length ? ` [depends on ${cap.dependsOnRefs.join(", ")}]` : "";
            console.log(`      📌 ${cap.refId}: ${cap.title}${dep}`);
          }
        } else {
          for (const t of caps) {
            console.log(`   📌 ${t.refId}: ${t.title}`);
          }
        }
      }
    }
    const totalTickets = allTickets.length;
    console.log(
      `\nWould create per participant: 1 enrollment + ${totalTickets} exercise tickets` +
        ` = ${1 + totalTickets} tickets × ${participants.length} participants` +
        ` = ${(1 + totalTickets) * participants.length} total`,
    );
    return;
  }

  const apiKey = requireEnv("LINEAR_API_KEY");
  const teamId = await resolveTeamId(apiKey, teamFlag);
  const stateId = await getTriageStateId(apiKey, teamId);
  console.log(`Linear team:  ${teamId}\nState:        ${stateId || "(default)"}\n`);

  // Create tickets for each participant
  const results: { participant: string; enrollment: string; ticketCount: number; failed: number }[] = [];

  for (const participant of participants) {
    console.log(`\n▶ ${participant.name} (${participant.email})`);
    const { enrollmentIdentifier, created, failed } = await createHierarchyForParticipant(
      apiKey, teamId, stateId, cohort, participant, allTickets, dryRun,
    );
    results.push({
      participant: participant.name,
      enrollment: enrollmentIdentifier,
      ticketCount: created.length,
      failed: failed.length,
    });
  }

  // Summary table
  console.log("\n── Summary ───────────────────────────────────────────────");
  const w = Math.max(...results.map((r) => r.participant.length), 12);
  console.log(`${"Participant".padEnd(w + 2)} ${"Enrollment".padEnd(10)} ${"Tickets".padEnd(8)} Errors`);
  console.log("─".repeat(w + 36));
  for (const r of results) {
    const err = r.failed > 0 ? `⚠ ${r.failed} failed` : "✓";
    console.log(`${r.participant.padEnd(w + 2)} ${r.enrollment.padEnd(10)} ${String(r.ticketCount).padEnd(8)} ${err}`);
  }
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);
  console.log(`\nCompleted: ${results.length} participants. Failed tickets: ${totalFailed}`);
}

main().catch((err) => {
  console.error("\nFatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
