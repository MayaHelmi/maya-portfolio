# Maya Helmi Portfolio Design System

This folder is the single source of truth for the portfolio's visual design.

## Structure

- `tokens/colors.css` — portrait-derived light and dark palettes
- `tokens/typography.css` — font families, weights, type scale and line heights
- `tokens/spacing.css` — spacing scale and page gutters
- `tokens/dimensions.css` — deliberate component geometry and fixed sizes
- `tokens/shapes.css` — border widths and corner radii
- `tokens/motion.css` — durations and easing curves
- `tokens/effects.css` — shadows, blur and glass treatments
- `tokens/layout.css` — content widths, controls, icons and documented breakpoints
- `tailwind/source.css` — Tailwind utility configuration
- `tailwind/utilities.css` — generated responsive utilities
- `components/site.css` — website components that consume the tokens
- `index.css` — the only stylesheet entry point loaded by the website

## Rules

1. Add or change design values in a token file first.
2. Component rules must consume tokens instead of declaring colors, fonts,
   radii, shadows or animation timings directly.
3. Colors outside `tokens/colors.css` are rejected by the validator.
4. Breakpoint conditions and keyframe percentage selectors are the sole
   literal-value exceptions because CSS custom properties cannot be evaluated
   in those positions.

Run `npm run validate:design-system` before committing design changes.
