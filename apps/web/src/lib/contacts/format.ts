import { clock, dayLabel } from "../schedule/format";

/** "Staff Security Engineer at Halden Bank". */
export function contactSubtitle(role: string, company: string): string {
  return `${role} at ${company}`;
}

/** "Tuesday, November 10, 12:20 PM": when you met, in venue time. */
export function metAt(iso: string): string {
  return `${dayLabel(iso)}, ${clock(iso)}`;
}
