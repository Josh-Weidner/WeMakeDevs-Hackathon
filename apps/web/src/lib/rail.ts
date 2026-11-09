import { isActive } from "./nav";

export type RailPanel = "next-up" | "demand";

/**
 * Which side panels a page shows. Panels earn their place: live crowd data belongs next to the schedule and
 * the rooms, not on the contacts or clip pages, where it would only be noise. No panels means the page
 * gets a narrower, more readable single column.
 */
export function railFor(pathname: string): RailPanel[] {
  if (isActive(pathname, "/schedule")) return ["next-up", "demand"];
  if (isActive(pathname, "/rooms") || isActive(pathname, "/talks")) return ["demand"];
  return [];
}
