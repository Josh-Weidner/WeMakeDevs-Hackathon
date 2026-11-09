---
title: "Accessibility (Merge Forward)"
description: "Block UI changes that break Confy's accessibility requirements"
type: check
when: "PRs that add or modify files under apps/web/ (.tsx, .ts, .css)"
actions: "Request changes listing each violation with file, line, and a concrete fix; approve the check only when none remain"
---

# Accessibility (Merge Forward)

Confy is entered in the Merge Forward track ("Conferences for Everyone"). Every UI change must keep the app usable with a screen reader, keyboard only, and low-stimulation needs.

Check each changed UI file for:

1. **Images:** every `<img>` / `next/image` has a meaningful `alt`. Use `alt=""` only for purely decorative images.
2. **Labeled controls:** every `<button>`, icon-only button, link, and form control has an accessible name (visible text, `<label htmlFor>`, `aria-label`, or `aria-labelledby`). An icon-only button without `aria-label` is a violation.
3. **No color-only status:** status, crowd level ("Likely full"), errors, and success must be conveyed with text and/or a labeled icon, not just color. Prefer the shared `StatusBadge` component.
4. **Keyboard:** interactive elements are native (`<button>`, `<a href>`) or have `role`, `tabIndex={0}`, and key handlers. No `onClick` on a bare `<div>`/`<span>`. Focus outlines must not be removed without a visible replacement.
5. **Dynamic announcements:** async updates (search result counts, warnings, "clip saved") are announced through an `aria-live` region.
6. **Motion and stimulation:** new animations respect `prefers-reduced-motion` and low-stimulation mode.
7. **Structure:** one `<h1>` per page, headings in order, and landmarks (`<main>`, `<nav>`) used correctly. `<html lang>` is preserved.

When you find a violation, suggest the exact code fix so it can be applied with `gitar fix`.
