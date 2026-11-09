import type { Metadata } from "next";
import { ClipMode } from "@/features/clip/ClipMode";
import { PageHeader } from "@/features/shell/PageHeader";

export const metadata: Metadata = { title: "Clip" };

export default function ClipPage() {
  return (
    <>
      <PageHeader
        title="Clip"
        description="Save the last minute of a conversation or a talk. Confy turns a new connection into a contact with a LinkedIn note you can send yourself, and a talk highlight into a hands-on experiment and related resources."
      />
      <ClipMode />
    </>
  );
}
