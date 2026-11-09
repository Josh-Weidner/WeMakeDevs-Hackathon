import { Button } from "@/components/ui/button";

/**
 * "Or start from an example" chips under a free-text box. Choosing one fills the box; the user still
 * decides when to submit. Shared by every natural-language feature (schedule, people, contacts).
 */
export function ExamplePrompts({ examples, onSelect }: { examples: readonly string[]; onSelect: (example: string) => void }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">Or start from an example</legend>
      <ul className="flex flex-wrap gap-2">
        {examples.map((example) => (
          <li key={example}>
            <Button type="button" variant="outline" size="sm" className="h-auto rounded-full py-1.5 whitespace-normal" onClick={() => onSelect(example)}>
              {example}
            </Button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
