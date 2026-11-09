import { RoomResult, RoomsResponse } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import type { RoomsService } from "../services/rooms.js";

export function roomsRoutes(rooms: RoomsService) {
  return async (app: FastifyInstance) => {
    app.get("/rooms", async () => RoomsResponse.parse(await rooms.list()));

    app.get<{ Params: { id: string } }>("/rooms/:id", async (request) =>
      RoomResult.parse(await rooms.get(request.params.id)),
    );
  };
}
