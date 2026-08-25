import { z } from "zod";

export const BookingStatusSchema = z.enum(["confirmed", "cancelled"]);

export const BookingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  roomId: z.string().uuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  status: BookingStatusSchema,
  createdAt: z.string().datetime(),
  cancelledAt: z.string().datetime().nullable(),
});

export const CreateBookingRequestSchema = z.object({
  roomId: z.string().uuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
}).refine(
  (data) => new Date(data.checkOut) > new Date(data.checkIn),
  { message: "checkOut must be after checkIn", path: ["checkOut"] }
);

export const BookingListResponseSchema = z.object({
  bookings: z.array(BookingSchema),
});

export type Booking = z.infer<typeof BookingSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type CreateBookingRequest = z.infer<typeof CreateBookingRequestSchema>;
export type BookingListResponse = z.infer<typeof BookingListResponseSchema>;
