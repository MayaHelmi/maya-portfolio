live url:  https://mayahelmi.github.io/maya-portfolio/

# Maya Helmi — portfolio

Five hand-written pages: `index`, `projects`, `certificates`, and a case-study
page for each of Besign and Glamé AI.

## Opening it

Double-click `index.html`. Nothing needs to be installed or built — the site
is plain HTML, CSS and JavaScript, and the compiled Tailwind file is already
in the folder. Deploying is still just uploading these files.

## Where the styling lives

| File | What it holds |
| --- | --- |
| `style.css` | Everything hand-written: colours, dark mode, typography, and the components (navbar, hero, cards, footer). This is the main stylesheet. |
| `src/tailwind.css` | The Tailwind **source**. Design tokens and settings only — edit this one. |
| `tailwind.css` | The **built** file the pages load. Generated from the file above — don't edit it by hand, your changes get overwritten on the next build. |
| `script.js` | The theme toggle and the phone menu. |
| `images/projects/` | One 960×600 screenshot per project card on `projects.html`. Web projects are real browser captures; Besign is a simulator capture; Glamé AI shows its screen designs. |

Tailwind is used for the responsive column layouts, written straight onto the
elements in the HTML:

```html
<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
```

which reads as: one column on a phone, two from 768px, three from 992px.
Everything else — all the colour and component styling — stays in `style.css`.

## Changing the Tailwind part

Only needed if you edit `src/tailwind.css`, or add a Tailwind class to a page
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

Then commit the updated `tailwind.css` along with your changes, because that
is the file the live site actually loads.

## Two things worth knowing

**The breakpoints are custom.** Tailwind normally uses 640 / 768 / 1024, but
`src/tailwind.css` sets them to **576 / 768 / 992** to match the `@media`
lines already in `style.css`. So `md:` in the HTML and
`@media (min-width: 768px)` in the stylesheet always mean the same width.

**Tailwind's reset is switched off.** Tailwind usually ships a "preflight"
reset that strips heading sizes, list bullets and margins. `style.css` already
handles all of that, so `src/tailwind.css` imports only the utility classes
and leaves the reset out. That is why adding Tailwind changed nothing about
how the site already looked.
