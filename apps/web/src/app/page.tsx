import { redirect } from "next/navigation";

// No landing page (it's a demo): the schedule builder is the front door.
export default function HomePage() {
  redirect("/schedule");
}
