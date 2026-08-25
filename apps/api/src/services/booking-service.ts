import type { CreateBookingRequest } from "@boot-camp/shared-types";
import { ConflictError } from "../errors/app-error.js";
import type { BookingRepository } from "../repositories/booking-repository.js";
import type { RoomRepository } from "../repositories/room-repository.js";

export class BookingService {
  constructor(
    private readonly bookingRepo: BookingRepository,
    private readonly roomRepo: RoomRepository,
  ) {}

  async listForUser(userId: string) {
    return this.bookingRepo.listForUser(userId);
  }

  async getById(id: string) {
    return this.bookingRepo.findById(id);
  }

  async bookRoom(userId: string, request: CreateBookingRequest) {
    await this.roomRepo.findById(request.roomId); // throws NotFoundError if missing

    // NOTE: hasConflict + create are two separate round-trips; a concurrent
    // booking for the same room/dates could slip through. Mitigate by catching
    // a unique-constraint violation from create (if one is added to the schema)
    // or by wrapping both operations in a SELECT FOR UPDATE transaction.
    const conflict = await this.bookingRepo.hasConflict(
      request.roomId,
      request.checkIn,
      request.checkOut,
    );
    if (conflict) {
      throw new ConflictError("Room is not available for the requested dates");
    }

    return this.bookingRepo.create({
      userId,
      roomId: request.roomId,
      checkIn: request.checkIn,
      checkOut: request.checkOut,
    });
  }
}
