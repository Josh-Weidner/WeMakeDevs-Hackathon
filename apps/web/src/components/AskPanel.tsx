import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { ExamplePrompts } from "@/components/ExamplePrompts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface AskPanelProps {
  /** Prefix for the element ids (`<id>-input`, `<id>-hint`, `<id>-status`). Unique per page. */
  id: string;
  title: string;
  description: string;
  label: string;
  hint: string;
  placeholder: string;
  maxLength: number;
  rows?: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  examples: readonly string[];
  submitLabel: string;
  busyLabel: string;
  icon: LucideIcon;
  busy: boolean;
  /** True after a failed attempt, so the box is marked invalid for assistive tech. */
  invalid?: boolean;
  /** Spoken politely to screen readers (e.g. "Finding people…", "3 people found."). */
  status: string;
  /** Extra controls between the examples and the submit button (e.g. a checkbox). */
  children?: ReactNode;
}

/**
 * The "describe what you want in your own words" form used by every natural-language feature: labelled box, hint,
 * example chips, optional extras, and a submit button with a busy state and a polite status line.
 */
export function AskPanel(p: AskPanelProps) {
  const inputId = `${p.id}-input`;
  const hintId = `${p.id}-hint`;
  const statusId = `${p.id}-status`;
  const Icon = p.icon;

  function submit(event: FormEvent) {
    event.preventDefault();
    p.onSubmit();
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate className="grid gap-6">
        <CardHeader>
          <CardTitle>
            <h2>{p.title}</h2>
          </CardTitle>
          <CardDescription>{p.description}</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor={inputId}>{p.label}</Label>
            <Textarea
              id={inputId}
              rows={p.rows ?? 2}
              maxLength={p.maxLength}
              value={p.value}
              onChange={(event) => p.onChange(event.target.value)}
              aria-describedby={hintId}
              aria-invalid={p.invalid ? true : undefined}
              placeholder={p.placeholder}
            />
            <p id={hintId} className="text-sm text-muted-foreground">
              {p.hint}
            </p>
          </div>

          <ExamplePrompts examples={p.examples} onSelect={p.onChange} />
          {p.children}
        </CardContent>

        <CardFooter>
          <Button type="submit" size="lg" disabled={p.busy} aria-describedby={statusId}>
            {p.busy ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Icon aria-hidden="true" />}
            {p.busy ? p.busyLabel : p.submitLabel}
          </Button>
        </CardFooter>
      </form>

      <p id={statusId} role="status" className="sr-only">
        {p.status}
      </p>
    </Card>
  );
}
