import type { ScheduleResponse } from "@confy/shared/contracts";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { clock, durationLabel, groupByDay, levelLabel } from "@/lib/schedule/format";

/** The built schedule as one timeline per day. Talks, breaks and warnings are all text + icon, never color alone. */
export function ScheduleResults({ schedule }: { schedule: ScheduleResponse }) {
  const days = groupByDay(schedule.items, schedule.breaks);

  return (
    <div className="schedule-results">
      {schedule.warnings.length > 0 && (
        <ul className="notice-list">
          {schedule.warnings.map((warning) => (
            <li key={warning}>
              <StatusBadge status="warning" label={warning} />
            </li>
          ))}
        </ul>
      )}

      {days.map((group) => (
        <section key={group.day} aria-labelledby={`day-${group.day}`} className="day">
          <h3 id={`day-${group.day}`}>{group.label}</h3>
          <ol className="timeline">
            {group.entries.map((entry) =>
              entry.kind === "break" ? (
                <li key={`break-${entry.rest.start}`} className="timeline__break">
                  <p>
                    <strong>
                      Break · <time dateTime={entry.rest.start}>{clock(entry.rest.start)}</time> to{" "}
                      <time dateTime={entry.rest.end}>{clock(entry.rest.end)}</time>
                    </strong>{" "}
                    ({durationLabel(entry.rest.minutes)})
                  </p>
                  {entry.rest.quiet_room && (
                    <p className="muted">
                      Quiet space: {entry.rest.quiet_room.name}, floor {entry.rest.quiet_room.floor}.{" "}
                      {entry.rest.quiet_room.step_free_route}
                    </p>
                  )}
                </li>
              ) : (
                <li key={entry.item.talk_id} className="talk">
                  <p className="talk__time">
                    <time dateTime={entry.item.start}>{clock(entry.item.start)}</time> to{" "}
                    <time dateTime={entry.item.end}>{clock(entry.item.end)}</time>
                  </p>
                  <h4 className="talk__title">{entry.item.title}</h4>
                  <p className="talk__meta">
                    {levelLabel(entry.item.level)} · {entry.item.track} · {entry.item.speaker_names.join(", ")}
                  </p>
                  <p className="talk__room">
                    <strong>
                      {entry.item.room.name}
                    </strong>
                    , floor {entry.item.room.floor} · {entry.item.room.capacity} seats
                  </p>
                  <p className="muted">Step-free route: {entry.item.room.step_free_route}</p>
                  {entry.item.likely_full && (
                    <p className="talk__warning">
                      <StatusBadge status="warning" label="Likely full: arrive early or watch the stream" />
                      {entry.item.stream_url && (
                        <>
                          {" "}
                          <a href={entry.item.stream_url}>Watch the stream of {entry.item.title}</a>
                        </>
                      )}
                    </p>
                  )}
                </li>
              ),
            )}
          </ol>
        </section>
      ))}
    </div>
  );
}
