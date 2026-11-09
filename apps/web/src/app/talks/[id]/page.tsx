import { Accessibility, ArrowLeft, Captions, FileText, MapPin, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookmarkButton } from "@/components/BookmarkButton";
import { CrowdBadge } from "@/components/CrowdBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDemand, fetchRoom } from "@/features/rooms/data";
import { PageHeader } from "@/features/shell/PageHeader";
import { fetchTalk } from "@/features/talks/data";
import { crowdLevel } from "@/lib/rooms/crowd";
import { clock, dayLabel, levelLabel } from "@/lib/schedule/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const talk = await fetchTalk((await params).id);
  return { title: talk?.title ?? "Talk not found" };
}

export default async function TalkPage({ params }: { params: Promise<{ id: string }> }) {
  const talk = await fetchTalk((await params).id);
  if (!talk) notFound();

  const [room, demand] = await Promise.all([fetchRoom(talk.room_id), fetchDemand()]);
  const crowd = crowdLevel(demand?.talks.find((t) => t.talk_id === talk.id));
  const links = [
    { href: talk.captions_url, label: "Captions", icon: Captions },
    { href: talk.transcript_url, label: "Transcript", icon: FileText },
    { href: talk.stream_url, label: "Watch the stream", icon: Video },
  ].filter((l): l is { href: string; label: string; icon: typeof Captions } => Boolean(l.href));

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/schedule">
          <ArrowLeft aria-hidden="true" />
          Schedule
        </Link>
      </Button>

      <PageHeader title={talk.title} description={talk.speaker_names.join(", ")} />

      <div className="grid gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{levelLabel(talk.level)}</Badge>
          <Badge variant="outline">{talk.track}</Badge>
          <Badge variant="outline">{levelLabel(talk.format)}</Badge>
          <CrowdBadge level={crowd} />
        </div>

        <BookmarkButton talkId={talk.id} title={talk.title} />

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>When and where</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p className="font-medium">
              {dayLabel(talk.start)} ·{" "}
              <time dateTime={talk.start}>{clock(talk.start)}</time> to <time dateTime={talk.end}>{clock(talk.end)}</time>
            </p>
            {room && (
              <>
                <p className="flex items-start gap-2">
                  <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <Link href={`/rooms/${encodeURIComponent(room.id)}`} className="font-semibold underline-offset-4 hover:underline">
                      {room.name}
                    </Link>
                    , floor {room.floor} · {room.capacity} seats
                  </span>
                </p>
                <p className="flex items-start gap-2 text-muted-foreground">
                  <Accessibility aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span>Step-free route: {room.step_free_route}</span>
                </p>
                <p className="text-muted-foreground">{room.accessibility_notes}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>About this talk</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm leading-relaxed">{talk.abstract}</p>
            <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
              {talk.tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="secondary">{tag}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {links.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Follow along</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-5 gap-y-2">
              {links.map(({ href, label, icon: Icon }) => (
                <Button key={label} asChild variant="link" size="sm" className="h-auto p-0">
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <Icon aria-hidden="true" />
                    {label}
                    <span className="sr-only"> for {talk.title} (opens in a new tab)</span>
                  </a>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
