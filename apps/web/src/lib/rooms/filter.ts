import type { RoomResult } from "@confy/shared/contracts";

export interface RoomFilters {
  quietOnly: boolean;
  /** Free text matched against name, floor and accessibility notes (case-insensitive). */
  query: string;
}

/** Client-side filtering for the rooms grid. The list is small (about ten rooms), so no api round trip. */
export function filterRooms(rooms: RoomResult[], { quietOnly, query }: RoomFilters): RoomResult[] {
  const needle = query.trim().toLowerCase();
  return rooms.filter((room) => {
    if (quietOnly && !room.is_quiet_room) return false;
    if (!needle) return true;
    return [room.name, `floor ${room.floor}`, room.accessibility_notes].some((field) => field.toLowerCase().includes(needle));
  });
}

export const roomCountLabel = (shown: number, total: number) =>
  shown === total ? `Showing all ${total} rooms.` : `Showing ${shown} of ${total} rooms.`;
