#!/usr/bin/env tsx
/**
 * Reset a participant's Cognito password.
 *
 * Usage:
 *   npm run cohort:reset -- --email alice@kickdrum.com
 *   npm run cohort:reset -- --email alice@kickdrum.com --password "NewPass123!"
 *
 * Omitting --password generates a new random one and prints it to stdout.
 */

import { AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { randomBytes } from "crypto";
import { loadEnv, requireEnv, createCognitoClient, parseArg } from "./_shared.js";

loadEnv();

const args = process.argv.slice(2);
const email = parseArg(args, "--email");
const explicitPassword = parseArg(args, "--password");

if (!email) {
  console.error("Usage: npm run cohort:reset -- --email <email> [--password <new-password>]");
  process.exit(1);
}

const region = process.env["AWS_REGION"] ?? "us-east-1";
const userPoolId = requireEnv("COGNITO_USER_POOL_ID");
const client = createCognitoClient(region);

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%";
  const all = upper + lower + digits + symbols;

  const bytes = randomBytes(16);
  const required = [
    upper[bytes[0]! % upper.length]!,
    lower[bytes[1]! % lower.length]!,
    digits[bytes[2]! % digits.length]!,
    symbols[bytes[3]! % symbols.length]!,
  ];
  const rest = Array.from({ length: 8 }, (_, i) => all[bytes[i + 4]! % all.length]!);
  const chars = [...required, ...rest];

  const shuffleBytes = randomBytes(chars.length);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

const password = explicitPassword ?? generatePassword();

await client.send(
  new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: email,
    Password: password,
    Permanent: true,
  }),
);

console.log(`\n✓ Password reset for: ${email}`);
if (!explicitPassword) {
  console.log(`  New password: ${password}`);
  console.log("  Share this securely with the participant.\n");
}
