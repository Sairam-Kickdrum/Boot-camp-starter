import type { FastifyPluginAsync } from "fastify";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";
import { LoginRequestSchema } from "@boot-camp/shared-types";
import { UnauthorizedError } from "../errors/app-error.js";

const REGION = process.env["AWS_REGION"] ?? "us-east-1";
const CLIENT_ID = process.env["COGNITO_CLIENT_ID"] ?? "";

// Explicit endpoint bypasses AWS_ENDPOINT_URL (used by LocalStack for S3/SES)
// so Cognito calls always hit real AWS, not LocalStack.
const cognitoClient = new CognitoIdentityProviderClient({
  region: REGION,
  endpoint: `https://cognito-idp.${REGION}.amazonaws.com`,
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/login — email + password → Cognito AccessToken in httpOnly session cookie
  app.post("/login", async (request, reply) => {
    const { email, password } = LoginRequestSchema.parse(request.body);

    let accessToken: string;
    try {
      const result = await cognitoClient.send(
        new InitiateAuthCommand({
          AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
          ClientId: CLIENT_ID,
          AuthParameters: { USERNAME: email, PASSWORD: password },
        }),
      );
      accessToken = result.AuthenticationResult?.AccessToken ?? "";
      if (!accessToken) throw new Error("No AccessToken in Cognito response");
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      if (name === "NotAuthorizedException" || name === "UserNotFoundException") {
        throw new UnauthorizedError("Invalid credentials");
      }
      throw err;
    }

    reply.setCookie("session", accessToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour — matches Cognito AccessToken default TTL
    });

    request.log.info("User logged in");
    return reply.send({ ok: true });
  });

  // POST /auth/logout — clear session cookie
  app.post("/logout", async (_request, reply) => {
    reply.clearCookie("session", { path: "/" });
    return reply.send({ ok: true });
  });
};
