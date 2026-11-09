import type { Metadata } from "next";
import { ClipMode } from "@/features/clip/ClipMode";
import { PageHeader } from "@/features/shell/PageHeader";

export const metadata: Metadata = { title: "Clip" };

export default function ClipPage() {
  return (
    <>
      {/* On phones the page is just the QR and two buttons; ClipMode renders its own visually hidden h1. */}
      <div className="hidden md:block">
        <PageHeader
          title="Clip"
          description="Save the last minute of a conversation or a talk. Confy turns a new connection into a contact with a LinkedIn note you can send yourself, and a talk highlight into a hands-on experiment and related resources."
        />
      </div>
      <ClipMode />
    </>
  );
}
