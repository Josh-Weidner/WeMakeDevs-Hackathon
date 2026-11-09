import type { Metadata } from "next";
import { RoomsBrowser } from "@/features/rooms/RoomsBrowser";
import { fetchRooms } from "@/features/rooms/data";
import { PageHeader } from "@/features/shell/PageHeader";

export const metadata: Metadata = { title: "Rooms" };

export default async function RoomsPage() {
  const rooms = await fetchRooms();

  return (
    <>
      <PageHeader
        title="Rooms"
        description="Where everything is, how to get there without steps, and which spaces are quiet. Open a room to see its sessions and how busy they're expected to be."
      />
      <RoomsBrowser rooms={rooms} />
    </>
  );
}
