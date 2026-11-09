import type { ScheduleItem, ScheduleResponse } from "@confy/shared/contracts";
import { Accessibility, MapPin, Moon, Video } from "lucide-react";
import { BookmarkButton } from "@/components/BookmarkButton";
import { TalkLink } from "@/components/TalkLink";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { clock, durationLabel, groupByDay, levelLabel } from "@/lib/schedule/format";

function TalkCard({ item }: { item: ScheduleItem }) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="grid gap-3 p-4 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
        <p className="font-semibold text-primary tabular-nums">
          <time dateTime={item.start}>{clock(item.start)}</time>
          <span className="text-muted-foreground"> to </span>
          <time dateTime={item.end}>{clock(item.end)}</time>
        </p>

        <div className="grid gap-2">
          <h4 className="text-base leading-snug font-semibold">
            <TalkLink id={item.talk_id}>{item.title}</TalkLink>
          </h4>
          <p className="text-sm text-muted-foreground">{item.speaker_names.join(", ")}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{levelLabel(item.level)}</Badge>
            <Badge variant="outline">{item.track}</Badge>
          </div>

          <p className="flex items-start gap-2 text-sm">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <strong>{item.room.name}</strong>, floor {item.room.floor} · {item.room.capacity} seats
            </span>
          </p>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Accessibility aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>Step-free route: {item.room.step_free_route}</span>
          </p>

          {item.likely_full && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="warning" label="Likely full: arrive early or watch the stream" />
              {item.stream_url && (
                <Button asChild variant="link" size="sm">
                  <a href={item.stream_url}>
                    <Video aria-hidden="true" />
                    Watch the stream
                    <span className="sr-only"> of {item.title}</span>
                  </a>
                </Button>
              )}
            </div>
          )}
          <div>
            <BookmarkButton talkId={item.talk_id} title={item.title} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** The built schedule as one timeline per day. Talks, breaks and warnings are all text + icon, never color alone. */
export function ScheduleResults({ schedule }: { schedule: ScheduleResponse }) {
  const days = groupByDay(schedule.items, schedule.breaks);

  return (
    <div className="grid gap-6">
      {schedule.warnings.map((warning) => (
        <Alert key={warning} role="status">
          <AlertDescription className="text-foreground">{warning}</AlertDescription>
        </Alert>
      ))}

      {days.map((group) => (
        <section key={group.day} aria-labelledby={`day-${group.day}`} className="grid gap-3">
          <h3 id={`day-${group.day}`} className="text-lg font-semibold">
            {group.label}
          </h3>
          <ol className="grid gap-3">
            {group.entries.map((entry) =>
              entry.kind === "break" ? (
                <li key={`break-${entry.rest.start}`} className="flex gap-3 rounded-xl border-2 border-dashed p-4">
                  <Moon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="grid gap-1 text-sm">
                    <p className="font-medium">
                      Break · <time dateTime={entry.rest.start}>{clock(entry.rest.start)}</time> to{" "}
                      <time dateTime={entry.rest.end}>{clock(entry.rest.end)}</time>{" "}
                      <span className="font-normal text-muted-foreground">({durationLabel(entry.rest.minutes)})</span>
                    </p>
                    {entry.rest.quiet_room && (
                      <p className="text-muted-foreground">
                        Quiet space: {entry.rest.quiet_room.name}, floor {entry.rest.quiet_room.floor}.{" "}
                        {entry.rest.quiet_room.step_free_route}
                      </p>
                    )}
                  </div>
                </li>
              ) : (
                <li key={entry.item.talk_id}>
                  <TalkCard item={entry.item} />
                </li>
              ),
            )}
          </ol>
        </section>
      ))}
    </div>
  );
}
