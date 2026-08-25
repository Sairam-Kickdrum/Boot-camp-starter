import type { RoomRepository } from "../repositories/room-repository.js";

export class RoomService {
  constructor(private readonly roomRepo: RoomRepository) {}

  async listAvailable(checkIn?: string, checkOut?: string) {
    return this.roomRepo.listAvailable(checkIn, checkOut);
  }

  async getById(id: string) {
    return this.roomRepo.findById(id);
  }
}
