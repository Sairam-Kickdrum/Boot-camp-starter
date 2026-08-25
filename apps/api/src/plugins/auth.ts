import fp from "fastify-plugin";
import type { FastifyRequest, FastifyReply } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq, and, isNull } from "drizzle-orm";
import { users } from "../../../../db/schema/index.js";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
}

declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (role: "admin" | "user") => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    sessionUser?: SessionUser;
  }
}

const REGION = process.env["AWS_REGION"] ?? "us-east-1";
const USER_POOL_ID = process.env["COGNITO_USER_POOL_ID"] ?? "";
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
// JWKS is fetched once on first use and cached; Cognito rotates keys infrequently
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

export const authPlugin = fp(async (app) => {
  app.decorate(
    "requireAuth",
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const token = request.cookies["session"];
      if (!token) throw new UnauthorizedError("No session cookie");

      let cognitoSub: string;
      let cognitoUsername: string;
      let cognitoGroups: string[];
      try {
        const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });
        if (payload["token_use"] !== "access") throw new Error("Not an access token");
        cognitoSub = payload.sub as string;
        cognitoUsername = (payload["username"] as string | undefined) ?? "";
        cognitoGroups = (payload["cognito:groups"] as string[] | undefined) ?? [];
      } catch {
        throw new UnauthorizedError("Invalid session");
      }

      const cols = { id: users.id, email: users.email, displayName: users.displayName, role: users.role };

      // Fast path: returning user already linked
      let [user] = await app.db.select(cols).from(users).where(eq(users.cognitoSub, cognitoSub)).limit(1);

      // First login via cohort: link sub to an existing email row (e.g. from db:seed)
      if (!user && cognitoUsername) {
        await app.db
          .update(users)
          .set({ cognitoSub })
          .where(and(eq(users.email, cognitoUsername), isNull(users.cognitoSub)));
        [user] = await app.db.select(cols).from(users).where(eq(users.cognitoSub, cognitoSub)).limit(1);
      }

      // Brand-new cohort participant not in seed: auto-create with role from Cognito group
      if (!user && cognitoUsername) {
        const role: "user" | "admin" = cognitoGroups.includes("admin") ? "admin" : "user";
        const displayName = cognitoUsername.split("@")[0] ?? cognitoUsername;
        [user] = await app.db
          .insert(users)
          .values({ cognitoSub, email: cognitoUsername, displayName, role })
          .onConflictDoNothing()
          .returning(cols);
        request.log.info("Auto-created local user for cohort participant");
      }

      if (!user) throw new UnauthorizedError("User not found");
      request.sessionUser = { id: user.id, email: user.email, displayName: user.displayName ?? null, role: user.role };
    },
  );

  app.decorate(
    "requireRole",
    (role: "admin" | "user") =>
      async (request: FastifyRequest, _reply: FastifyReply) => {
        if (!request.sessionUser) throw new UnauthorizedError("Not authenticated");
        if (request.sessionUser.role !== role) throw new ForbiddenError();
      },
  );
});
