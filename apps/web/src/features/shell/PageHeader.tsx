/** Every feature page opens with this: the page's single h1 plus a one-line description. */
export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-6 space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="max-w-2xl text-muted-foreground">{description}</p>
    </header>
  );
}
