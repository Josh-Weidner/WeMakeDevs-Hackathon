import { DemandResponse, RoomResult, RoomsResponse, TalkSearchResponse, type TalkResult } from "@confy/shared/contracts";
import { ApiRequestError, api } from "@/lib/api/client";

/** Server-side reads for the rooms pages. Each page fetches only what it needs. */

export async function fetchRooms(): Promise<RoomResult[]> {
  return (await api.get("/v1/rooms", RoomsResponse)).rooms;
}

/** `null` when the room doesn't exist; any other failure propagates to the route's error boundary. */
export async function fetchRoom(id: string): Promise<RoomResult | null> {
  try {
    return await api.get(`/v1/rooms/${encodeURIComponent(id)}`, RoomResult);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

/** Every talk in a room, in start order (no query means "browse"). The api caps a page at 50. */
export async function fetchRoomTalks(roomId: string): Promise<TalkResult[]> {
  const res = await api.get(`/v1/talks/search?roomId=${encodeURIComponent(roomId)}&limit=50`, TalkSearchResponse);
  return res.results;
}

/** The live forecast. Crowd levels are a nicety, so a failure degrades to "no demand data" rather than an error. */
export async function fetchDemand(): Promise<DemandResponse | null> {
  try {
    return await api.get("/v1/demand", DemandResponse);
  } catch {
    return null;
  }
}
