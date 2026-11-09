import { PeopleMatcher } from "@/features/people/PeopleMatcher";
import { PageHeader } from "@/features/shell/PageHeader";

export default function PeoplePage() {
  return (
    <>
      <PageHeader
        title="Find people to meet"
        description="Describe who you want to meet in plain language. Each match comes with a suggested opener, so the first hello is easy and low-pressure."
      />
      <PeopleMatcher />
    </>
  );
}
