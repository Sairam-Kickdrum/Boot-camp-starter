import fp from "fastify-plugin";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../../../../db/schema/index.js";

declare module "fastify" {
  interface FastifyInstance {
    db: NodePgDatabase<typeof schema>;
  }
}

export const dbPlugin = fp(async (app) => {
  const pool = new pg.Pool({
    connectionString: process.env["DATABASE_URL"],
  });

  const db = drizzle(pool, { schema });

  app.decorate("db", db);
  app.addHook("onClose", async () => pool.end());

  app.log.info("Database connected");
});
