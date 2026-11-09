import { CircleAlert, UsersRound } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

/** Something went wrong: shown as an alert so it's announced immediately. */
export function ErrorNotice({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/** No results: a calm status message, not an error. */
export function EmptyNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Alert role="status">
      <UsersRound aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

/** Placeholder rows while loading. Hidden from assistive tech: the form's status line announces progress. */
export function LoadingList({ rows = 2, rowClass = "h-40" }: { rows?: number; rowClass?: string }) {
  return (
    <div aria-hidden="true" className="grid gap-4">
      <Skeleton className="h-6 w-56" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`${rowClass} w-full`} />
      ))}
    </div>
  );
}

/** The results heading. Focusable (not tabbable) so focus can move here after a search completes. */
export function ResultsHeading({ id, ref, children }: { id: string; ref?: Ref<HTMLHeadingElement>; children: ReactNode }) {
  return (
    <h2 id={id} ref={ref} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
      {children}
    </h2>
  );
}
