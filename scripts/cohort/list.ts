#!/usr/bin/env tsx
/**
 * List all participants in a cohort group.
 *
 * Usage:
 *   npm run cohort:list -- --cohort 2026-06
 */

import {
  ListUsersInGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { loadEnv, requireEnv, createCognitoClient, parseArg } from "./_shared.js";

loadEnv();

const args = process.argv.slice(2);
const cohort = parseArg(args, "--cohort");

if (!cohort) {
  console.error("Usage: npm run cohort:list -- --cohort YYYY-MM");
  process.exit(1);
}

const region = process.env["AWS_REGION"] ?? "us-east-1";
const userPoolId = requireEnv("COGNITO_USER_POOL_ID");
const cohortGroup = `cohort-${cohort}`;
const client = createCognitoClient(region);

type UserEntry = { email: string; name: string; status: string; enabled: boolean };

async function listGroupUsers(groupName: string): Promise<UserEntry[]> {
  const users: UserEntry[] = [];
  let nextToken: string | undefined;

  do {
    const res = await client.send(
      new ListUsersInGroupCommand({
        UserPoolId: userPoolId,
        GroupName: groupName,
        NextToken: nextToken,
      }),
    );
    for (const u of res.Users ?? []) {
      const attr = (name: string) =>
        u.Attributes?.find((a) => a.Name === name)?.Value ?? "";
      users.push({
        email: attr("email") || u.Username || "",
        name: attr("name"),
        status: u.UserStatus ?? "UNKNOWN",
        enabled: u.Enabled ?? false,
      });
    }
    nextToken = res.NextToken;
  } while (nextToken);

  return users;
}

const users = await listGroupUsers(cohortGroup);

if (users.length === 0) {
  console.log(`\nNo users found in group: ${cohortGroup}`);
  console.log("Check the cohort name or run cohort:provision first.\n");
  process.exit(0);
}

console.log(`\nCohort: ${cohort}`);
console.log(`User Pool: ${userPoolId} (${region})\n`);

const colW = { email: 38, name: 22, status: 24 };
const header =
  "Email".padEnd(colW.email) +
  "Name".padEnd(colW.name) +
  "Status".padEnd(colW.status) +
  "Enabled";
console.log(header);
console.log("─".repeat(header.length + 4));

for (const u of users) {
  const statusLabel =
    u.status === "CONFIRMED" ? "CONFIRMED" :
    u.status === "FORCE_CHANGE_PASSWORD" ? "FORCE_CHANGE_PASSWORD" :
    u.status;
  console.log(
    u.email.padEnd(colW.email) +
    u.name.padEnd(colW.name) +
    statusLabel.padEnd(colW.status) +
    (u.enabled ? "yes" : "no"),
  );
}

console.log(`\nTotal: ${users.length} user${users.length !== 1 ? "s" : ""}\n`);
