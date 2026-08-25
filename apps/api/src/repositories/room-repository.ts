import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, gte, lte, notInArray, eq } from "drizzle-orm";
import { rooms, bookings } from "../../../../db/schema/index.js";
import type * as schema from "../../../../db/schema/index.js";
import { NotFoundError } from "../errors/app-error.js";

export class RoomRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async listAvailable(checkIn?: string, checkOut?: string) {
    if (!checkIn || !checkOut) {
      return this.db.select().from(rooms);
    }

    // Rooms are unavailable if any confirmed booking overlaps the requested dates.
    const overlapping = this.db
      .select({ roomId: bookings.roomId })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "confirmed"),
          lte(bookings.checkIn, checkOut),
          gte(bookings.checkOut, checkIn),
        ),
      );

    return this.db
      .select()
      .from(rooms)
      .where(notInArray(rooms.id, overlapping));
  }

  async findById(id: string) {
    const [room] = await this.db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
    if (!room) throw new NotFoundError("Room", id);
    return room;
  }
}
