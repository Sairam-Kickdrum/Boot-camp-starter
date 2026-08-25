import type { BookingListResponse, Booking, CreateBookingRequest } from "@boot-camp/shared-types";
import { request } from "./client.js";

export function listBookings() {
  return request<BookingListResponse>("/bookings");
}

export function createBooking(body: CreateBookingRequest) {
  return request<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getBooking(id: string) {
  return request<Booking>(`/bookings/${id}`);
}
