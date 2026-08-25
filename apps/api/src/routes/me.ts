import type { FastifyPluginAsync } from "fastify";
import type { CurrentUserResponse } from "@boot-camp/shared-types";

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: CurrentUserResponse }>(
    "/",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const { id, email, displayName, role } = request.sessionUser!;
      return reply.send({ id, email, displayName, role });
    },
  );
};
