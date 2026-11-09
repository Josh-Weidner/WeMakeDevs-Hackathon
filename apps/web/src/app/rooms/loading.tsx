import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while the rooms (or a room) load. Hidden from assistive tech; the page announces itself when ready. */
export default function RoomsLoading() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    </div>
  );
}
