import type { PersonMatch } from "@confy/shared/contracts";
import { MessageCircle, Moon } from "lucide-react";
import { DraftNote } from "@/components/DraftNote";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { initials, introPreferenceLabel, subtitle } from "@/lib/people/format";

/** One match: who they are, what you share, and a suggested way to start the conversation. */
export function PersonCard({ person }: { person: PersonMatch }) {
  const PrefIcon = person.intro_prefs === "quiet" ? Moon : MessageCircle;

  return (
    <Card>
      <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-4">
        <Avatar className="size-11">
          <AvatarFallback aria-hidden="true">{initials(person.display_name)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-1">
          <h3 className="text-lg leading-tight font-semibold">{person.display_name}</h3>
          <p className="text-sm text-muted-foreground">{subtitle(person.role, person.company_type)}</p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <p className="text-sm">{person.bio}</p>

        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Works with:</span> {person.stack}
          </p>
          {person.interests.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label={`Interests of ${person.display_name}`}>
              {person.interests.map((interest) => (
                <li key={interest}>
                  <Badge variant="secondary">{interest}</Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <PrefIcon aria-hidden="true" className="size-4" />
            {introPreferenceLabel(person.intro_prefs)}
          </p>
        </div>

        {person.opener && <DraftNote label="Suggested opener" text={person.opener} name={person.display_name} linkedinUrl={person.linkedin_url} />}
      </CardContent>
    </Card>
  );
}
