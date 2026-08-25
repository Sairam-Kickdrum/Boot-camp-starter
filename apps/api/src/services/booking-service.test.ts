import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingService } from "./booking-service.js";
import { NotFoundError, ConflictError } from "../errors/app-error.js";
import type { BookingRepository } from "../repositories/booking-repository.js";
import type { RoomRepository } from "../repositories/room-repository.js";

const makeRoom = (overrides: Record<string, unknown> = {}) => ({
  id: "room-1",
  name: "Test Room",
  description: "A room",
  pricePerNightCents: 10000,
  capacity: 2,
  imageUrl: null as string | null,
  createdAt: new Date("2026-01-01"),
  ...overrides,
});

const makeBooking = (overrides: Record<string, unknown> = {}) => ({
  id: "booking-1",
  userId: "user-1",
  roomId: "room-1",
  checkIn: "2026-06-01",
  checkOut: "2026-06-03",
  status: "confirmed" as const,
  createdAt: new Date("2026-01-01"),
  cancelledAt: null as Date | null,
  ...overrides,
});

describe("BookingService", () => {
  let service: BookingService;
  let bookingRepo: BookingRepository;
  let roomRepo: RoomRepository;

  beforeEach(() => {
    bookingRepo = {
      listForUser: vi.fn(),
      findById: vi.fn(),
      hasConflict: vi.fn(),
      create: vi.fn(),
    } as unknown as BookingRepository;

    roomRepo = {
      findById: vi.fn(),
      listAvailable: vi.fn(),
    } as unknown as RoomRepository;

    service = new BookingService(bookingRepo, roomRepo);
  });

  describe("bookRoom", () => {
    const request = { roomId: "room-1", checkIn: "2026-06-01", checkOut: "2026-06-03" };

    it("creates a booking when room exists and dates are free", async () => {
      vi.mocked(roomRepo.findById).mockResolvedValue(makeRoom());
      vi.mocked(bookingRepo.hasConflict).mockResolvedValue(false);
      vi.mocked(bookingRepo.create).mockResolvedValue(makeBooking());

      const result = await service.bookRoom("user-1", request);

      expect(bookingRepo.create).toHaveBeenCalledWith({
        userId: "user-1",
        roomId: "room-1",
        checkIn: "2026-06-01",
        checkOut: "2026-06-03",
      });
      expect(result.status).toBe("confirmed");
    });

    it("throws NotFoundError when room does not exist", async () => {
      vi.mocked(roomRepo.findById).mockRejectedValue(new NotFoundError("Room", "room-1"));

      await expect(service.bookRoom("user-1", request)).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when dates overlap an existing booking", async () => {
      vi.mocked(roomRepo.findById).mockResolvedValue(makeRoom());
      vi.mocked(bookingRepo.hasConflict).mockResolvedValue(true);

      await expect(service.bookRoom("user-1", request)).rejects.toThrow(ConflictError);
    });

    it("does not call create when a conflict exists", async () => {
      vi.mocked(roomRepo.findById).mockResolvedValue(makeRoom());
      vi.mocked(bookingRepo.hasConflict).mockResolvedValue(true);

      await expect(service.bookRoom("user-1", request)).rejects.toThrow();
      expect(bookingRepo.create).not.toHaveBeenCalled();
    });

    it("checks conflict before creating", async () => {
      vi.mocked(roomRepo.findById).mockResolvedValue(makeRoom());
      vi.mocked(bookingRepo.hasConflict).mockResolvedValue(false);
      vi.mocked(bookingRepo.create).mockResolvedValue(makeBooking());

      await service.bookRoom("user-1", request);

      expect(bookingRepo.hasConflict).toHaveBeenCalledWith("room-1", "2026-06-01", "2026-06-03");
    });
  });

  describe("listForUser", () => {
    it("returns bookings for the given user", async () => {
      const bookings = [makeBooking(), makeBooking({ id: "booking-2" })];
      vi.mocked(bookingRepo.listForUser).mockResolvedValue(bookings);

      const result = await service.listForUser("user-1");

      expect(bookingRepo.listForUser).toHaveBeenCalledWith("user-1");
      expect(result).toEqual(bookings);
    });

    it("returns empty array when user has no bookings", async () => {
      vi.mocked(bookingRepo.listForUser).mockResolvedValue([]);

      const result = await service.listForUser("user-1");

      expect(result).toEqual([]);
    });

    it("passes userId to repository — does not return another user's bookings", async () => {
      const user1Bookings = [makeBooking({ userId: "user-1" })];
      vi.mocked(bookingRepo.listForUser).mockResolvedValue(user1Bookings);

      const result = await service.listForUser("user-1");

      // Ownership filtering is enforced at the repository layer (WHERE user_id = $1).
      // This test verifies the correct userId is forwarded — never a wildcard or other user's id.
      expect(bookingRepo.listForUser).toHaveBeenCalledWith("user-1");
      expect(bookingRepo.listForUser).not.toHaveBeenCalledWith("user-2");
      expect(result.every((b) => b.userId === "user-1")).toBe(true);
    });
  });

  describe("getById", () => {
    it("returns the booking by id", async () => {
      const booking = makeBooking();
      vi.mocked(bookingRepo.findById).mockResolvedValue(booking);

      const result = await service.getById("booking-1");

      expect(bookingRepo.findById).toHaveBeenCalledWith("booking-1");
      expect(result).toEqual(booking);
    });

    it("propagates NotFoundError when booking does not exist", async () => {
      vi.mocked(bookingRepo.findById).mockRejectedValue(new NotFoundError("Booking", "booking-1"));

      await expect(service.getById("booking-1")).rejects.toThrow(NotFoundError);
    });
  });
});
