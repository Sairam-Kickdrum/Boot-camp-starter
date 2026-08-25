#!/usr/bin/env tsx
/**
 * Disable all participants in a cohort group and remove their group membership.
 *
 * Users are DISABLED (not deleted) — re-enable via:
 *   aws cognito-idp admin-enable-user --user-pool-id <id> --username <email>
 *
 * Usage:
 *   npm run cohort:teardown -- --cohort 2026-06
 */

import {
  ListUsersInGroupCommand,
  AdminDisableUserCommand,
  AdminRemoveUserFromGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { loadEnv, requireEnv, createCognitoClient, parseArg } from "./_shared.js";

loadEnv();

const args = process.argv.slice(2);
const cohort = parseArg(args, "--cohort");

if (!cohort) {
  console.error("Usage: npm run cohort:teardown -- --cohort YYYY-MM");
  process.exit(1);
}

const region = process.env["AWS_REGION"] ?? "us-east-1";
const userPoolId = requireEnv("COGNITO_USER_POOL_ID");
const cohortGroup = `cohort-${cohort}`;
const client = createCognitoClient(region);

// Collect all usernames in the group
const usernames: string[] = [];
let nextToken: string | undefined;

do {
  const res = await client.send(
    new ListUsersInGroupCommand({
      UserPoolId: userPoolId,
      GroupName: cohortGroup,
      NextToken: nextToken,
    }),
  );
  for (const u of res.Users ?? []) {
    if (u.Username) usernames.push(u.Username);
  }
  nextToken = res.NextToken;
} while (nextToken);

if (usernames.length === 0) {
  console.log(`\nNo users found in group: ${cohortGroup}. Nothing to do.\n`);
  process.exit(0);
}

console.log(`\nTearing down cohort: ${cohort}`);
console.log(`User Pool: ${userPoolId} (${region})`);
console.log(`Users to disable: ${usernames.length}\n`);

let ok = 0;
let fail = 0;

for (const username of usernames) {
  try {
    await client.send(
      new AdminDisableUserCommand({ UserPoolId: userPoolId, Username: username }),
    );
    await client.send(
      new AdminRemoveUserFromGroupCommand({
        UserPoolId: userPoolId,
        Username: username,
        GroupName: cohortGroup,
      }),
    );
    console.log(`  ✓  ${username}`);
    ok++;
  } catch (err: unknown) {
    console.error(`  ✗  ${username}: ${(err as Error).message}`);
    fail++;
  }
}

console.log(`\n✓ Disabled: ${ok}  ✗ Failed: ${fail}`);
console.log("Users are disabled (not deleted). Re-enable individually if needed.");
console.log(`  aws cognito-idp admin-enable-user --user-pool-id ${userPoolId} --username <email>\n`);

if (fail > 0) process.exit(1);
