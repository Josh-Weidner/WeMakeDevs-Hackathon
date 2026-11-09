import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/shell/PageHeader";

export default function RoomNotFound() {
  return (
    <>
      <PageHeader title="Room not found" description="We couldn't find that room. It may have been renamed, or the link is mistyped." />
      <Button asChild>
        <Link href="/rooms">
          <ArrowLeft aria-hidden="true" />
          Back to all rooms
        </Link>
      </Button>
    </>
  );
}
