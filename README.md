live url:  https://mayahelmi.github.io/maya-portfolio/

# Maya Helmi — portfolio

Six hand-written pages: `index`, `projects`, `certificates`, and a case-study
page for each of Besign, Glamé AI and NOI Beauty Lounge. Glamé is presented as
an in-progress beauty-tech website concept; NOI is clearly identified as an
independent salon website concept.

## Opening it

Double-click `index.html`. Nothing needs to be installed or built — the site
is plain HTML, CSS and JavaScript, and the compiled Tailwind file is already
in the folder. Deploying is still just uploading these files.

## Where the styling lives

| File | What it holds |
| --- | --- |
| `design-system/index.css` | The single stylesheet entry point loaded by every page. |
| `design-system/tokens/` | Colors, typography, spacing, dimensions, shapes, motion, effects and layout tokens. |
| `design-system/components/site.css` | Navbar, hero, galleries, cards, forms and page components. Components consume tokens instead of declaring visual values. |
| `design-system/tailwind/source.css` | The Tailwind **source**. Edit this when utility configuration changes. |
| `design-system/tailwind/utilities.css` | The generated utility file. Don't edit it by hand. |
| `script.js` | The theme toggle and the phone menu. |
| `images/projects/` | One 960×1067 image per project card on `projects.html`. Web projects use browser captures or representative hero imagery; Besign uses a screen-design composite. |

Tailwind is used for the responsive column layouts, written straight onto the
elements in the HTML:

```html
<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
```

which reads as: one column on a phone, two from 768px, three from 992px.
Everything else is routed through `design-system/index.css`.

## Changing the Tailwind part

Only needed if you edit `design-system/tailwind/source.css`, or add a Tailwind class to a page
that isn't used anywhere yet.

```bash
npm install
```

```bash
npm run build:css
```

Or leave it running while you work, so it rebuilds on every save:

```bash
npm run watch:css
```

Then commit the updated `design-system/tailwind/utilities.css` with your changes.

## Two things worth knowing

**The breakpoints are custom.** Tailwind normally uses 640 / 768 / 1024, but
`design-system/tailwind/source.css` sets them to **576 / 768 / 992** to match
the `@media` lines in `design-system/components/site.css`. So `md:` in the HTML and
`@media (min-width: 768px)` in the stylesheet always mean the same width.

**Tailwind's reset is switched off.** Tailwind usually ships a "preflight"
reset that strips heading sizes, list bullets and margins. The component layer
already handles all of that, so the Tailwind source imports only utility classes
and leaves the reset out. That is why adding Tailwind changed nothing about
how the site already looked.
