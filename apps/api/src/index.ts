import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { dbPlugin } from "./plugins/db.js";
import { authPlugin } from "./plugins/auth.js";
import { errorHandler } from "./plugins/error-handler.js";
import { authRoutes } from "./routes/auth.js";
import { roomRoutes } from "./routes/rooms.js";
import { bookingRoutes } from "./routes/bookings.js";
import { meRoutes } from "./routes/me.js";

if (process.env["NODE_ENV"] === "production") {
  const secret = process.env["SESSION_SECRET"];
  if (!secret || secret === "dev-secret-change-in-prod") {
    throw new Error("SESSION_SECRET must be set to a strong secret in production");
  }
  if (!process.env["WEB_ORIGIN"]) {
    throw new Error("WEB_ORIGIN must be set in production");
  }
}

const app = Fastify({
  logger: {
    level: process.env["LOG_LEVEL"] ?? "info",
    ...(process.env["NODE_ENV"] === "development"
      ? { transport: { target: "pino-pretty", options: { colorize: true } } }
      : {}),
  },
});

await app.register(cors, {
  origin: process.env["WEB_ORIGIN"] ?? "http://localhost:5173",
  credentials: true,
});

await app.register(cookie, {
  secret: process.env["SESSION_SECRET"] ?? "dev-secret-change-in-prod",
});

await app.register(dbPlugin);
await app.register(authPlugin);

app.setErrorHandler(errorHandler);

await app.register(authRoutes, { prefix: "/auth" });
await app.register(meRoutes, { prefix: "/me" });
await app.register(roomRoutes, { prefix: "/rooms" });
await app.register(bookingRoutes, { prefix: "/bookings" });

app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env["PORT"] ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
