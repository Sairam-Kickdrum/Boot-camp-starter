import { z } from "zod";

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

export const CurrentUserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: z.enum(["user", "admin"]),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;
