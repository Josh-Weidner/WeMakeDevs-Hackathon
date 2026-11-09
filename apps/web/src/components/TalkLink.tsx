import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A talk's title as a link to its page. Used everywhere a talk is mentioned, so it's always one click away. */
export function TalkLink({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <Link href={`/talks/${encodeURIComponent(id)}`} className={cn("underline-offset-4 hover:underline focus-visible:underline", className)}>
      {children}
    </Link>
  );
}
