import type { CurrentUserResponse } from "@boot-camp/shared-types";
import { request } from "./client.js";

export function login(email: string, password: string) {
  return request<{ ok: boolean }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

export function getMe() {
  return request<CurrentUserResponse>("/me");
}
