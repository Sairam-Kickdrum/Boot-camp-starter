import type { FastifyPluginAsync, FastifyInstance } from "fastify";
import {
  CreateBookingRequestSchema,
  type BookingListResponse,
  type Booking,
} from "@boot-camp/shared-types";
import { BookingRepository } from "../repositories/booking-repository.js";
import { RoomRepository } from "../repositories/room-repository.js";
import { BookingService } from "../services/booking-service.js";
import { ForbiddenError, NotFoundError } from "../errors/app-error.js";

export const bookingRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: BookingListResponse }>(
    "/",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const service = buildService(app);
      const rows = await service.listForUser(request.sessionUser!.id);
      return reply.send({ bookings: rows.map(toBooking) });
    },
  );

  app.post<{ Reply: Booking }>(
    "/",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const body = CreateBookingRequestSchema.parse(request.body);
      const service = buildService(app);
      const booking = await service.bookRoom(request.sessionUser!.id, body);
      return reply.status(201).send(toBooking(booking));
    },
  );

  app.get<{ Params: { id: string }; Reply: Booking }>(
    "/:id",
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const service = buildService(app);
      let booking: Awaited<ReturnType<typeof service.getById>>;
      try {
        booking = await service.getById(request.params.id);
      } catch (err) {
        if (err instanceof NotFoundError) throw new ForbiddenError();
        throw err;
      }
      if (booking.userId !== request.sessionUser!.id) throw new ForbiddenError();
      return reply.send(toBooking(booking));
    },
  );
};

function buildService(app: FastifyInstance) {
  const bookingRepo = new BookingRepository(app.db);
  const roomRepo = new RoomRepository(app.db);
  return new BookingService(bookingRepo, roomRepo);
}

function toBooking(b: {
  id: string;
  userId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: "confirmed" | "cancelled";
  createdAt: Date;
  cancelledAt: Date | null;
}): Booking {
  return {
    id: b.id,
    userId: b.userId,
    roomId: b.roomId,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    cancelledAt: b.cancelledAt?.toISOString() ?? null,
  };
}
