import { LikelyFull } from "@/features/rooms/LikelyFull";
import { ScheduleBuilder } from "@/features/schedule/ScheduleBuilder";
import { SystemStatus } from "@/features/system-status/SystemStatus";

// Always render at request time: demand and status must reflect the live api.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <section aria-labelledby="hero-heading" className="hero">
        <h1 id="hero-heading">Your conference, your way.</h1>
        <p className="lede">
          Confy finds the right talks, warns you before rooms fill up, and builds a day that fits how you work,
          including a low-stimulation mode with real breaks and quiet spaces.
        </p>
      </section>

      <ScheduleBuilder />
      <LikelyFull />
      <SystemStatus />
    </>
  );
}
