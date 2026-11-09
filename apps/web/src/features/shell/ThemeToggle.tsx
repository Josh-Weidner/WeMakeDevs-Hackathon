"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEME_OPTIONS, type ThemePreference } from "@/lib/theme/theme";
import { useTheme } from "@/lib/theme/ThemeProvider";

const OPTIONS: Record<ThemePreference, { label: string; icon: LucideIcon }> = {
  system: { label: "System", icon: Monitor },
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
};

/** Three-way theme switch. Each button is a toggle (aria-pressed) with an icon and an accessible name. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div role="group" aria-label="Color theme" className="flex items-center gap-0.5 rounded-lg border p-0.5">
      {THEME_OPTIONS.map((option) => {
        const { label, icon: Icon } = OPTIONS[option];
        return (
          <Button
            key={option}
            type="button"
            variant={preference === option ? "secondary" : "ghost"}
            size="icon-sm"
            aria-pressed={preference === option}
            aria-label={`${label} theme`}
            onClick={() => setPreference(option)}
          >
            <Icon aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}
