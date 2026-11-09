import { CalendarDays, Contact, DoorOpen, Mic, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Features that aren't built yet show as "Soon" and are not links. */
  ready: boolean;
}

/**
 * The app's feature areas. To add a feature: build `features/<name>/`, add a thin route in `app/<name>/page.tsx`,
 * and flip `ready` to true here. Nothing else in the shell changes.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/schedule", label: "Schedule", description: "Build a clash-free day from plain language", icon: CalendarDays, ready: true },
  { href: "/people", label: "People", description: "Find people to meet, with a suggested opener", icon: Users, ready: true },
  { href: "/clip", label: "Clip", description: "Save a moment: a new connection or a talk highlight", icon: Mic, ready: true },
  { href: "/contacts", label: "Contacts", description: "Recall who you met, by what you remember", icon: Contact, ready: true },
  { href: "/rooms", label: "Rooms", description: "Locations, step-free routes and quiet spaces", icon: DoorOpen, ready: true },
];

/** Active when the path is the item's route or inside it. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
