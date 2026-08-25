import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, "../..");

// Mirror seed-cognito.sh: load .env from repo root without overwriting existing shell vars
export function loadEnv(): void {
  const envPath = resolve(REPO_ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

export function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`Error: ${key} is not set. Add it to .env or export it before running.`);
    process.exit(1);
  }
  return val;
}

// Hardcode the Cognito endpoint to prevent AWS_ENDPOINT_URL (used for LocalStack S3/SES)
// from accidentally routing Cognito calls to LocalStack (Cognito is a Pro-only feature there).
export function createCognitoClient(region: string): CognitoIdentityProviderClient {
  return new CognitoIdentityProviderClient({
    region,
    endpoint: `https://cognito-idp.${region}.amazonaws.com`,
  });
}

export function parseArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}
