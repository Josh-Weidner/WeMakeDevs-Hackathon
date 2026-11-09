import { SystemStatus } from "@/features/system-status/SystemStatus";

// Always render at request time: status must reflect the live api.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <h1>Confy</h1>
      <p className="lede">
        Find the right talks, meet the right people, and get through the conference your way, including a
        low-stimulation mode.
      </p>
      <SystemStatus />
    </>
  );
}
