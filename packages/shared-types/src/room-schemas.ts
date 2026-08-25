import { z } from "zod";

export const RoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  pricePerNightCents: z.number().int().positive(),
  capacity: z.number().int().positive(),
  imageUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});

export const RoomListQuerySchema = z.object({
  checkIn: z.string().date().optional(),
  checkOut: z.string().date().optional(),
});

export const RoomListResponseSchema = z.object({
  rooms: z.array(RoomSchema),
});

export type Room = z.infer<typeof RoomSchema>;
export type RoomListQuery = z.infer<typeof RoomListQuerySchema>;
export type RoomListResponse = z.infer<typeof RoomListResponseSchema>;
