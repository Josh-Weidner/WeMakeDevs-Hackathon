"use client";

import { CalendarDays, Contact, CornerDownLeft, Search, Users, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ASK_TARGETS, askHref, matchPages, rankAskTargets, type AskTarget } from "@/lib/ask";
import { NAV_ITEMS } from "@/lib/nav";

const ASK_ICON: Record<AskTarget["id"], LucideIcon> = { schedule: CalendarDays, people: Users, contacts: Contact };

/**
 * Ctrl/Cmd+K: jump to any page, or type a plain-language request and send it to the right feature, which runs it
 * on arrival. One box instead of having to know which page's text box to use.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setOpen(false);
    setText("");
    router.push(href);
  }

  const asking = text.trim().length >= 2;
  const pages = matchPages(NAV_ITEMS, text);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} aria-keyshortcuts="Control+K Meta+K" aria-label="Search or ask Confy">
        <Search aria-hidden="true" />
        <span className="hidden md:inline">Search or ask…</span>
        <kbd className="ml-1 hidden rounded border px-1 text-xs text-muted-foreground lg:inline">Ctrl K</kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Search or ask Confy" description="Jump to a page, or describe what you need and press Enter.">
        {/* We filter ourselves (matchPages): the library would hide the always-on "Ask" actions that don't match the text. */}
        <Command shouldFilter={false}>
          <CommandInput value={text} onValueChange={setText} placeholder="Go to a page, or ask: beginner talks on multi-tenancy…" />
          <CommandList>
            <CommandEmpty>No matching page. Describe what you need to ask Confy.</CommandEmpty>

            {asking && (
              <CommandGroup heading="Ask">
                {rankAskTargets(text).map((target) => {
                  const Icon = ASK_ICON[target.id];
                  return (
                    <CommandItem key={target.id} value={`ask-${target.id}`} onSelect={() => go(askHref(ASK_TARGETS[target.id], text))}>
                      <Icon aria-hidden="true" />
                      <span className="truncate">
                        {target.verb} “{text.trim()}”
                      </span>
                      <CornerDownLeft aria-hidden="true" className="ml-auto text-muted-foreground" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {pages.length > 0 && (
              <CommandGroup heading="Go to">
                {pages.map(({ href, label, description, icon: Icon }) => (
                  <CommandItem key={href} value={`page ${label} ${description}`} onSelect={() => go(href)}>
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">{description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
