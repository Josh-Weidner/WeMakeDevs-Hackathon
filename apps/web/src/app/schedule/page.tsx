import type { Metadata } from "next";
import { PageHeader } from "@/features/shell/PageHeader";
import { ScheduleBuilder } from "@/features/schedule/ScheduleBuilder";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <>
      <PageHeader
        title="Build your schedule"
        description="Tell Confy what you want in plain language. It picks talks that never overlap, warns you about rooms that will fill up, and can build a calmer day with real breaks."
      />
      <ScheduleBuilder />
    </>
  );
}
