# Maya Helmi — portfolio

Personal portfolio of Maya Helmi, Full-Stack Developer. Live at
https://mayahelmi.github.io/maya-portfolio/

Everything lives on one page (`index.html`): projects (with a details pop-up),
skills, education, achievements and contact. The other `.html` files are small
redirects that keep old links working (`projects.html`, `certificates.html`,
`recognition.html`, `besign.html`, `glame-ai.html`, `noi-beauty-lounge.html`).

## Folder structure

```
index.html, *.html     pages (old URLs redirect to the homepage)
tokens/                design tokens as CSS custom properties on :root
  colors.css           all colours + the dark-theme overrides
  typography.css       font families, sizes, weights, line-heights, tracking
  spacing.css          spacing scale, sizes, container widths, radii, shadows
  motion.css           durations and easing curves (also read by the JS)
css/
  portfolio.css        hand-written component styles (uses var(--…) only)
  tailwind.input.css   build entry: tokens + Tailwind utilities + portfolio.css
  tailwind.css         BUILT stylesheet the pages load — don't edit by hand
js/                    theme toggle, menu, carousel, skills, education, achievements
assets/images/         photos, certificates, skill logos, project screenshots
assets/icons/          favicons
Maya-Helmi-CV.pdf      the downloadable CV (kept at the root so its link stays stable)
```

## Running it

Open `index.html` in a browser, or serve the folder (e.g. `npx serve .`).
Nothing needs installing: the built `css/tailwind.css` is committed.

## Changing styles

Change a colour, size or timing in `tokens/`, components in
`css/portfolio.css`, then rebuild and commit `css/tailwind.css`:

```bash
npm install
npm run build:css     # or: npm run watch:css
```

Tailwind's theme (spacing, colours, motion) is mapped to the tokens in
`css/tailwind.input.css`; breakpoints are 576 / 768 / 992 / 1200px, the same
as the `@media` rules in `portfolio.css`. Tailwind's preflight reset is not
used.
