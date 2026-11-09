import type { Metadata } from "next";
import { firstParam } from "@/lib/ask";
import { PageHeader } from "@/features/shell/PageHeader";
import { ScheduleBuilder } from "@/features/schedule/ScheduleBuilder";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  // Opened from the Ask palette with a request: the feature fills it in and runs it.
  const initialQuery = firstParam((await searchParams).q, 300);

  return (
    <>
      <PageHeader
        title="Build your schedule"
        description="Tell Confy what you want in plain language. It picks talks that never overlap, warns you about rooms that will fill up, and can build a calmer day with real breaks."
      />
      <ScheduleBuilder key={initialQuery ?? ""} initialQuery={initialQuery} />
    </>
  );
}
