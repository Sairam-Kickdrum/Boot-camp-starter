import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  date,
  check,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const bookingStatusEnum = pgEnum("booking_status", ["confirmed", "cancelled"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  cognitoSub: text("cognito_sub").unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  role: roleEnum("role").notNull().default("user"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  pricePerNightCents: integer("price_per_night_cents").notNull(),
  capacity: integer("capacity").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    status: bookingStatusEnum("status").notNull().default("confirmed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => [
    index("bookings_room_dates_idx").on(table.roomId, table.checkIn, table.checkOut),
    index("bookings_user_id_idx").on(table.userId),
    check("chk_dates", sql`${table.checkOut} > ${table.checkIn}`),
  ],
);
