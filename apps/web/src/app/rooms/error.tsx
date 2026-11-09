"use client";

import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** Shown when the api can't be reached (anything other than "room not found"). */
export default function RoomsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid gap-4">
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>We couldn&apos;t load the rooms</AlertTitle>
        <AlertDescription>The room service didn&apos;t respond. Check your connection and try again.</AlertDescription>
      </Alert>
      <div>
        <Button type="button" variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
