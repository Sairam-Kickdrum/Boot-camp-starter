import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, lte, gte } from "drizzle-orm";
import { bookings } from "../../../../db/schema/index.js";
import type * as schema from "../../../../db/schema/index.js";
import { NotFoundError } from "../errors/app-error.js";

export class BookingRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async listForUser(userId: string) {
    return this.db.select().from(bookings).where(eq(bookings.userId, userId));
  }

  async findById(id: string) {
    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);
    if (!booking) throw new NotFoundError("Booking", id);
    return booking;
  }

  async hasConflict(roomId: string, checkIn: string, checkOut: string, excludeBookingId?: string) {
    const conditions = [
      eq(bookings.roomId, roomId),
      eq(bookings.status, "confirmed"),
      lte(bookings.checkIn, checkOut),
      gte(bookings.checkOut, checkIn),
    ];

    const rows = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(...conditions));

    return rows.some((r) => r.id !== excludeBookingId);
  }

  async create(data: {
    userId: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
  }) {
    const [booking] = await this.db
      .insert(bookings)
      .values(data)
      .returning();
    return booking!;
  }
}
