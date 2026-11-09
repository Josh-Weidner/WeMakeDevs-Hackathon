import { Accessibility, ArrowLeft, Armchair, Layers, Moon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomSessions } from "@/features/rooms/RoomSessions";
import { fetchDemand, fetchRoom, fetchRoomTalks } from "@/features/rooms/data";
import { PageHeader } from "@/features/shell/PageHeader";
import { sessionsByDay } from "@/lib/rooms/crowd";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const room = await fetchRoom((await params).id);
  return { title: room?.name ?? "Room not found" };
}

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await fetchRoom(id);
  if (!room) notFound();

  // Quiet rooms host no talks, so skip the extra reads for them.
  const [talks, demand] = room.is_quiet_room ? [[], null] : await Promise.all([fetchRoomTalks(id), fetchDemand()]);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/rooms">
          <ArrowLeft aria-hidden="true" />
          All rooms
        </Link>
      </Button>

      <PageHeader title={room.name} description={`Floor ${room.floor} · ${room.capacity} seats`} />

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Getting there</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <ul className="flex flex-wrap gap-1.5" aria-label={`About ${room.name}`}>
              <li>
                <Badge variant="outline">
                  <Layers aria-hidden="true" />
                  Floor {room.floor}
                </Badge>
              </li>
              <li>
                <Badge variant="outline">
                  <Armchair aria-hidden="true" />
                  {room.capacity} seats
                </Badge>
              </li>
              {room.is_quiet_room && (
                <li>
                  <Badge variant="secondary">
                    <Moon aria-hidden="true" />
                    Quiet room
                  </Badge>
                </li>
              )}
            </ul>
            <p className="flex items-start gap-2">
              <Accessibility aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">Step-free route:</span> {room.step_free_route}
              </span>
            </p>
            <p className="text-muted-foreground">{room.accessibility_notes}</p>
          </CardContent>
        </Card>

        {room.is_quiet_room ? (
          <Alert role="status">
            <Moon aria-hidden="true" />
            <AlertTitle>A place to rest, not a session room</AlertTitle>
            <AlertDescription>
              No talks are held here. Use it for a break between sessions, a quiet call, or a planned one-to-one intro. Low-stimulation
              schedules point you here during breaks.
            </AlertDescription>
          </Alert>
        ) : (
          <section aria-labelledby="sessions-heading" className="grid gap-4">
            <h2 id="sessions-heading" className="text-2xl font-semibold tracking-tight">
              Sessions in this room
            </h2>
            <RoomSessions days={sessionsByDay(talks, demand)} />
          </section>
        )}
      </div>
    </>
  );
}
