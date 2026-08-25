import type { FastifyPluginAsync } from "fastify";
import { RoomListQuerySchema, type RoomListResponse } from "@boot-camp/shared-types";
import { RoomRepository } from "../repositories/room-repository.js";
import { RoomService } from "../services/room-service.js";

export const roomRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: RoomListResponse }>(
    "/",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const query = RoomListQuerySchema.parse(request.query);
      const service = new RoomService(new RoomRepository(app.db));
      const rows = await service.listAvailable(query.checkIn, query.checkOut);
      return reply.send({ rooms: rows.map(toRoom) });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const service = new RoomService(new RoomRepository(app.db));
      const room = await service.getById(request.params.id);
      return reply.send(toRoom(room));
    },
  );
};

function toRoom(r: {
  id: string;
  name: string;
  description: string | null;
  pricePerNightCents: number;
  capacity: number;
  imageUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    pricePerNightCents: r.pricePerNightCents,
    capacity: r.capacity,
    imageUrl: r.imageUrl,
    createdAt: r.createdAt.toISOString(),
  };
}
