import type { RoomResult, RoomsRepository, RoomsResponse } from "@confy/shared";
import { NotFoundError } from "../errors.js";

export interface RoomsService {
  list(): Promise<RoomsResponse>;
  get(id: string): Promise<RoomResult>;
}

export function createRoomsService(deps: { rooms: RoomsRepository }): RoomsService {
  return {
    async list() {
      return { rooms: await deps.rooms.list() };
    },

    async get(id) {
      const room = await deps.rooms.get(id);
      if (!room) throw new NotFoundError(`Room "${id}" not found`);
      return room;
    },
  };
}
