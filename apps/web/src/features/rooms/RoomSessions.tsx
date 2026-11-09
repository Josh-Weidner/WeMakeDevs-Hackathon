import { Captions, Video } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SessionDay } from "@/lib/rooms/crowd";
import { clock, levelLabel } from "@/lib/schedule/format";
import { BookmarkButton } from "@/components/BookmarkButton";
import { CrowdBadge } from "@/components/CrowdBadge";
import { TalkLink } from "@/components/TalkLink";

/** A room's sessions, one timeline per day, each with the expected crowd and any captions or stream links. */
export function RoomSessions({ days }: { days: SessionDay[] }) {
  if (days.length === 0) {
    return (
      <Alert role="status">
        <AlertTitle>No sessions scheduled here</AlertTitle>
        <AlertDescription>Nothing is booked in this room yet. Check back later or browse another room.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-8">
      {days.map((day) => (
        <section key={day.day} aria-labelledby={`room-day-${day.day}`} className="grid gap-3">
          <h3 id={`room-day-${day.day}`} className="text-lg font-semibold">
            {day.label}
          </h3>
          <ol className="grid gap-3">
            {day.sessions.map(({ talk, crowd }) => (
              <li key={talk.id}>
                <Card className="gap-0 py-0">
                  <CardContent className="grid gap-3 p-4 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
                    <p className="font-semibold text-primary tabular-nums">
                      <time dateTime={talk.start}>{clock(talk.start)}</time>
                      <span className="text-muted-foreground"> to </span>
                      <time dateTime={talk.end}>{clock(talk.end)}</time>
                    </p>

                    <div className="grid gap-2">
                      <h4 className="text-base leading-snug font-semibold">
                        <TalkLink id={talk.id}>{talk.title}</TalkLink>
                      </h4>
                      <p className="text-sm text-muted-foreground">{talk.speaker_names.join(", ")}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">{levelLabel(talk.level)}</Badge>
                        <Badge variant="outline">{talk.track}</Badge>
                        <CrowdBadge level={crowd} />
                      </div>

                      {(talk.captions_url || talk.stream_url) && (
                        <div className="flex flex-wrap gap-x-4">
                          {talk.captions_url && (
                            <Button asChild variant="link" size="sm" className="h-auto p-0">
                              <a href={talk.captions_url} target="_blank" rel="noopener noreferrer">
                                <Captions aria-hidden="true" />
                                Captions
                                <span className="sr-only"> for {talk.title} (opens in a new tab)</span>
                              </a>
                            </Button>
                          )}
                          {talk.stream_url && (
                            <Button asChild variant="link" size="sm" className="h-auto p-0">
                              <a href={talk.stream_url} target="_blank" rel="noopener noreferrer">
                                <Video aria-hidden="true" />
                                Watch the stream
                                <span className="sr-only"> of {talk.title} (opens in a new tab)</span>
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                      <div>
                        <BookmarkButton talkId={talk.id} title={talk.title} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
