#!/usr/bin/env tsx
/**
 * Provision a cohort of participants in the shared Cognito User Pool.
 *
 * Usage:
 *   npm run cohort:provision -- --cohort 2026-06 --roster cohort-roster.csv
 *
 * Input:  cohort-roster.csv  (columns: name, email, role)
 * Output: credentials-2026-06.csv  — distribute securely, then delete
 *
 * Prerequisites:
 *   - AWS credentials with cognito-idp:AdminCreateUser, AdminSetUserPassword,
 *     AdminAddUserToGroup, CreateGroup, GetGroup permissions.
 *   - COGNITO_USER_POOL_ID set in .env (or exported in the shell).
 */

import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  CreateGroupCommand,
  GetGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";
import { loadEnv, requireEnv, createCognitoClient, parseArg, REPO_ROOT } from "./_shared.js";

loadEnv();

const args = process.argv.slice(2);
const cohort = parseArg(args, "--cohort");
const rosterPath = parseArg(args, "--roster");

if (!cohort || !rosterPath) {
  console.error("Usage: npm run cohort:provision -- --cohort YYYY-MM --roster path/to/roster.csv");
  process.exit(1);
}

const region = process.env["AWS_REGION"] ?? "us-east-1";
const userPoolId = requireEnv("COGNITO_USER_POOL_ID");
const cohortGroup = `cohort-${cohort}`;
const client = createCognitoClient(region);

// ── CSV parsing ───────────────────────────────────────────────────────────────

type RosterRow = { name: string; email: string; role: "user" | "admin" };

function parseCsv(content: string): RosterRow[] {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = Object.fromEntries(
      headers.map((h, i) => [h, values[i] ?? ""]),
    );
    return {
      name: row["name"] ?? row["email"] ?? "",
      email: row["email"] ?? "",
      role: row["role"] === "admin" ? "admin" : "user",
    };
  });
}

// ── Password generation ───────────────────────────────────────────────────────

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%";
  const all = upper + lower + digits + symbols;

  const bytes = randomBytes(16);
  // Guarantee one character from each required class
  const required = [
    upper[bytes[0]! % upper.length]!,
    lower[bytes[1]! % lower.length]!,
    digits[bytes[2]! % digits.length]!,
    symbols[bytes[3]! % symbols.length]!,
  ];
  const rest = Array.from({ length: 8 }, (_, i) => all[bytes[i + 4]! % all.length]!);
  const chars = [...required, ...rest];

  // Fisher-Yates shuffle
  const shuffleBytes = randomBytes(chars.length);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

// ── Cognito helpers ───────────────────────────────────────────────────────────

async function ensureGroup(groupName: string, description: string): Promise<void> {
  try {
    await client.send(new GetGroupCommand({ UserPoolId: userPoolId, GroupName: groupName }));
  } catch {
    await client.send(
      new CreateGroupCommand({
        UserPoolId: userPoolId,
        GroupName: groupName,
        Description: description,
      }),
    );
    console.log(`  Created Cognito group: ${groupName}`);
  }
}

async function provisionUser(row: RosterRow, password: string): Promise<void> {
  // Create user — idempotent via UsernameExistsException
  try {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: row.email,
        UserAttributes: [
          { Name: "email", Value: row.email },
          { Name: "email_verified", Value: "true" },
          { Name: "name", Value: row.name },
        ],
        MessageAction: "SUPPRESS",
      }),
    );
  } catch (err: unknown) {
    if ((err as { name?: string }).name !== "UsernameExistsException") throw err;
    // Already exists — still update password below
  }

  // Set permanent password (bypasses FORCE_CHANGE_PASSWORD state)
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: row.email,
      Password: password,
      Permanent: true,
    }),
  );

  // Add to cohort group
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: row.email,
      GroupName: cohortGroup,
    }),
  );

  // Add to admin group if role = admin
  if (row.role === "admin") {
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: row.email,
        GroupName: "admin",
      }),
    );
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const rosterAbs = resolve(REPO_ROOT, rosterPath);
const roster = parseCsv(readFileSync(rosterAbs, "utf8"));

if (roster.length === 0) {
  console.error("Roster is empty or malformed. Expected columns: name,email,role");
  process.exit(1);
}

console.log(`\nProvisioning cohort: ${cohort}`);
console.log(`User Pool:  ${userPoolId} (${region})`);
console.log(`Roster:     ${rosterAbs}`);
console.log(`Participants: ${roster.length}\n`);

await ensureGroup(cohortGroup, `Boot camp cohort ${cohort}`);
await ensureGroup("admin", "Admin users — maps to role=admin in the app");

type CredentialRow = RosterRow & { password: string };
const succeeded: CredentialRow[] = [];
const failed: { email: string; error: string }[] = [];

for (const row of roster) {
  if (!row.email) {
    failed.push({ email: "(missing)", error: "Empty email in roster" });
    continue;
  }
  const password = generatePassword();
  try {
    await provisionUser(row, password);
    succeeded.push({ ...row, password });
    console.log(`  ✓  ${row.email}  (${row.role})`);
  } catch (err: unknown) {
    const msg = (err as Error).message ?? String(err);
    failed.push({ email: row.email, error: msg });
    console.error(`  ✗  ${row.email}: ${msg}`);
  }
}

// Write credentials CSV to repo root
const outPath = resolve(REPO_ROOT, `credentials-${cohort}.csv`);
const csv = [
  "name,email,password,role",
  ...succeeded.map((c) => `${c.name},${c.email},${c.password},${c.role}`),
].join("\n");
writeFileSync(outPath, csv + "\n", { mode: 0o600 });

console.log(`\n✓ Provisioned: ${succeeded.length}  ✗ Failed: ${failed.length}`);
console.log(`\nCredentials written to: ${outPath}`);
console.log("  ⚠  Distribute this file securely (encrypted channel) and delete it after.\n");

if (failed.length > 0) {
  console.log("Failed users:");
  for (const f of failed) console.log(`  ${f.email}: ${f.error}`);
  process.exit(1);
}
