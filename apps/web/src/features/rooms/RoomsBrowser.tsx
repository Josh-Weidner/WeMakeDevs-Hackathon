"use client";

import type { RoomResult } from "@confy/shared/contracts";
import { DoorOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filterRooms, roomCountLabel } from "@/lib/rooms/filter";
import { RoomCard } from "./RoomCard";

/** The rooms grid with a name search and a "quiet rooms only" filter. The count is announced politely. */
export function RoomsBrowser({ rooms }: { rooms: RoomResult[] }) {
  const [query, setQuery] = useState("");
  const [quietOnly, setQuietOnly] = useState(false);
  const shown = useMemo(() => filterRooms(rooms, { quietOnly, query }), [rooms, quietOnly, query]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="room-search">Search rooms</Label>
            <Input
              id="room-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, floor or feature"
              aria-describedby="rooms-count"
            />
          </div>
          <div className="flex items-center gap-3 pb-1">
            <Checkbox id="quiet-only" checked={quietOnly} onCheckedChange={(checked) => setQuietOnly(checked === true)} />
            <Label htmlFor="quiet-only">Quiet rooms only</Label>
          </div>
        </CardContent>
      </Card>

      <p id="rooms-count" role="status" className="text-sm text-muted-foreground">
        {roomCountLabel(shown.length, rooms.length)}
      </p>

      {shown.length === 0 ? (
        <Alert>
          <DoorOpen aria-hidden="true" />
          <AlertTitle>No rooms match</AlertTitle>
          <AlertDescription>Clear the search or turn off “Quiet rooms only” to see every room.</AlertDescription>
        </Alert>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((room) => (
            <li key={room.id}>
              <RoomCard room={room} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
