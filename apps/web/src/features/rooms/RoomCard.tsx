import type { RoomResult } from "@confy/shared/contracts";
import { Accessibility, ArrowRight, Armchair, Layers, Moon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

/** One room: where it is, how big, and how to get there without steps. */
export function RoomCard({ room }: { room: RoomResult }) {
  return (
    <Card className="h-full">
      <CardHeader className="gap-3">
        <h3 className="text-lg leading-tight font-semibold">{room.name}</h3>
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
      </CardHeader>

      <CardContent className="grid gap-2 text-sm">
        <p className="flex items-start gap-2">
          <Accessibility aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            <span className="font-medium">Step-free route:</span> {room.step_free_route}
          </span>
        </p>
        <p className="text-muted-foreground">{room.accessibility_notes}</p>
      </CardContent>

      <CardFooter>
        <Button asChild variant="outline" size="sm">
          <Link href={`/rooms/${room.id}`}>
            {room.is_quiet_room ? "About this room" : "See sessions"}
            <span className="sr-only"> in {room.name}</span>
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
