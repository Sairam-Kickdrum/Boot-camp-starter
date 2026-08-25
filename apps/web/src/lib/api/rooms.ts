import type { RoomListResponse, Room } from "@boot-camp/shared-types";
import { request } from "./client.js";

export function listRooms(checkIn?: string, checkOut?: string) {
  const params = new URLSearchParams();
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request<RoomListResponse>(`/rooms${qs}`);
}

export function getRoom(id: string) {
  return request<Room>(`/rooms/${id}`);
}
