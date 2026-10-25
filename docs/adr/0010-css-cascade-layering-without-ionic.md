# 0010: CSS Cascade Layering, and the Ionic Global Stylesheet

- **Status**: Accepted
- **Date**: 2026-10-23
- **Relates to**: [ADR 0009](0009-studio-port-to-next-app-router.md) (studio port), [ADR 0008](0008-frontend-stack-version-baseline.md) (Tailwind v4 baseline)

The feature branch styled the studio with Ionic React's global stylesheet. Importing it into `main` silently defeated the entire Tailwind utility layer, and we decided to remove the dependency on it and adopt a cascade-layer rule for the project instead of merely deleting one import.

## The failure

`@ionic/react`'s global CSS is **unlayered**. In the CSS cascade, an unlayered author style outranks every style in a named layer — including Tailwind v4's `@layer utilities`, which is where every utility class lives. Importing that stylesheet therefore did not merely add Ionic's look: it made Tailwind utilities that competed with it stop winning. The visible symptom was a page that ignored its own Tailwind classes while looking superficially styled; the hidden symptom was a scroll container that would not scroll, because Ionic's `body` rules were beating the layout.

Deleting the import fixes the symptom. It does not stop the same class of bug arriving again from the next unlayered stylesheet, so the fix is a rule rather than a deletion.

## The rule

1. **No stylesheet is imported outside a cascade layer.** Third-party CSS is imported into a named layer, or wrapped in one, before it is used.
2. **No custom rule is written outside `@layer`.** Every rule this project authors belongs to `theme`, `base`, `components`, or `utilities`.
3. **The layer order is declared before the Tailwind import**, because the `@layer` statement itself is what fixes the precedence order:

   ```css
   @layer theme, base, components, utilities;
   @import "tailwindcss";
   ```

   The import must come second. A `@layer` statement after the import would still work, but putting it first makes the precedence contract readable at the top of the file, before anything depends on it.

4. **Tailwind's `@theme inline` maps tokens to CSS variables** (`--color-ink: var(--studio-text)`), so a theme swap recolours every utility that uses it without a rebuild. A literal hex in a component is a bug: it cannot follow the theme.

## Consequences

- `@ionic/react` and `ionicons` are no longer imported anywhere in the studio. The branch's UI used Ionic components for a handful of icons and controls; the port uses `lucide-react` and the studio's own primitives instead. The dependencies remain in `package.json` only until the branch is deleted.
- `app/globals.css` owns the whole token surface: `--studio-accent`, `--studio-home`, `--studio-away`, `--studio-panel-bg`, `--studio-inner-bg`, `--studio-text`, `--border-subtle`, and the light-theme overrides. Panels, meters, and chips are token classes, never literal colours.
- The single permitted inline style in the studio is a numeric geometry value that cannot be known ahead of time — a bar's width, a player's pitch coordinate. A colour is never inline.
- A focus ring is defined once in `@layer base` and never removed, and a `prefers-reduced-motion` block caps every animation. The studio is keyboard navigable and a judge may drive it from a keyboard.
