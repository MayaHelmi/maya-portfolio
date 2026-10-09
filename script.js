/* ==========================================================================
   Shared script for every page: the dark/light theme, and the phone menu.

   This file is loaded from the <head> of each page WITHOUT "defer", on
   purpose. It has to run before the page is painted, otherwise a dark-mode
   visitor would see a white flash for a split second before the theme
   is applied.
   ========================================================================== */

/* The <html> element. Everything below works by putting things on it:
   - a data-theme="dark" attribute  -> the CSS switches to dark colours
   - a class of "nav-open"          -> the CSS shows the phone menu        */
const page = document.documentElement;
page.classList.add("js");


/* ============ 1. Dark / light theme ============ */

/* Use the theme saved from the last visit. If there isn't one, follow
   whatever the phone or laptop is already set to. */
let savedTheme = null;
try {
  savedTheme = localStorage.getItem("theme");
} catch (error) {
  /* Some browsers block storage in private mode. Not a problem, we just
     fall back to the system setting below. */
}

const systemIsDark = matchMedia("(prefers-color-scheme: dark)").matches;
page.dataset.theme = savedTheme || (systemIsDark ? "dark" : "light");

/* Build the custom cursor from the palette instead of storing a second,
   independently coloured SVG. This keeps colors.css as the single source
   of truth for every interface colour, including the wand. */
function updateMagicWandCursor() {
  if (!matchMedia("(pointer: fine)").matches) return;

  const palette = getComputedStyle(page);
  const charcoal = palette.getPropertyValue("--portrait-charcoal").trim();
  const hijab = palette.getPropertyValue("--portrait-hijab").trim();
  const rose = palette.getPropertyValue("--portrait-rose").trim();
  const cream = palette.getPropertyValue("--portrait-cream").trim();
  const peach = palette.getPropertyValue("--portrait-peach").trim();
  const cursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path d="M10 10L26.5 26.5" stroke="${charcoal}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M10 10L26.5 26.5" stroke="${hijab}" stroke-width="3" stroke-linecap="round"/>
    <path d="M22.5 22.5L26.5 26.5" stroke="${rose}" stroke-width="3" stroke-linecap="round"/>
    <path d="M7 1.75L8.55 5.15L12.25 5.55L9.5 8.1L10.25 11.75L7 9.9L3.75 11.75L4.5 8.1L1.75 5.55L5.45 5.15L7 1.75Z" fill="${cream}" stroke="${charcoal}" stroke-width="1.35" stroke-linejoin="round"/>
    <path d="M18 2.5L18.55 4.05L20 4.6L18.55 5.15L18 6.7L17.45 5.15L16 4.6L17.45 4.05L18 2.5Z" fill="${peach}" stroke="${charcoal}" stroke-width=".65" stroke-linejoin="round"/>
    <path d="M3.2 15L3.75 16.55L5.2 17.1L3.75 17.65L3.2 19.2L2.65 17.65L1.2 17.1L2.65 16.55L3.2 15Z" fill="${hijab}" stroke="${charcoal}" stroke-width=".65" stroke-linejoin="round"/>
  </svg>`;

  page.style.setProperty(
    "--magic-wand-cursor",
    `url("data:image/svg+xml,${encodeURIComponent(cursorSvg)}") 7 7`
  );
}

updateMagicWandCursor();


/* ============ Landing hero entrance ============ */

/* Wait for the portrait and the rest of the page assets before opening the
   navigation capsules. The moving role title begins only after they settle,
   so the first load reads as one deliberate sequence. */
function startHeroEntrance() {
  if (!document.body.classList.contains("landing-only")) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) {
    page.classList.add("hero-ready");
    return;
  }

  requestAnimationFrame(function () {
    page.classList.add("hero-ready");
  });

  window.setTimeout(function () {
    page.classList.add("snake-ready");

    document.querySelectorAll(".hero-role-snake animate, .hero-role-snake--phone animate")
      .forEach(function (motion) {
        if (typeof motion.beginElement === "function") motion.beginElement();
      });
  }, 1400);
}

if (document.readyState === "complete") {
  startHeroEntrance();
} else {
  window.addEventListener("load", startHeroEntrance, { once: true });
}


/* Runs when the sun/moon button is clicked. */
function switchTheme() {
  const newTheme = page.dataset.theme === "dark" ? "light" : "dark";
  page.dataset.theme = newTheme;
  updateMagicWandCursor();
  try {
    localStorage.setItem("theme", newTheme);
  } catch (error) {
    /* Storage blocked - the theme still changes, it just won't be
       remembered next time. */
  }
}


/* ============ 2. Phone menu ============ */

/* Runs when the burger button is clicked. */
function openOrCloseMenu(button) {
  const isOpen = page.classList.toggle("nav-open");
  button.setAttribute("aria-expanded", String(isOpen));
}

function closeMenu() {
  if (!page.classList.contains("nav-open")) return;

  /* Take the focus off the menu link BEFORE hiding the menu. If a link
     inside a hidden menu still has focus, the browser moves the focus
     itself and that cancels the smooth scroll to the link's section. */
  const focused = document.activeElement;
  if (focused && focused.closest(".nav-links")) focused.blur();

  page.classList.remove("nav-open");

  const button = document.querySelector(".nav-toggle");
  if (button) button.setAttribute("aria-expanded", "false");
}


/* ============ 3. Listen for clicks ============ */

/* One listener on the whole page, instead of one per button. When something
   is clicked, closest() looks at the clicked element and walks up its
   parents to find out what it was inside of. */
document.addEventListener("click", function (event) {
  const themeButton = event.target.closest(".theme-toggle");
  const menuButton = event.target.closest(".nav-toggle");
  const menuLink = event.target.closest(".nav-links a, .logo a");
  const insideNavbar = event.target.closest(".navbar");

  if (themeButton) {
    switchTheme();
  } else if (menuButton) {
    openOrCloseMenu(menuButton);
  } else if (menuLink || !insideNavbar) {
    /* Picked something from the menu, or clicked away from the navbar
       entirely - either way the menu should close. */
    closeMenu();
  }
});

/* The Escape key closes the menu too. */
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") closeMenu();
});


/* ============ 4. Magic-wand cursor sparkles ============ */

function setUpMagicCursor() {
  const hasFinePointer = matchMedia("(pointer: fine)").matches;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!hasFinePointer || reducedMotion) return;

  const sparkleCharacters = ["✦", "✧", "⋆"];
  let lastSparkle = 0;

  document.addEventListener("pointermove", function (event) {
    const now = performance.now();
    if (now - lastSparkle < 60) return;
    lastSparkle = now;

    const sparkle = document.createElement("span");
    sparkle.className = "cursor-sparkle";
    sparkle.setAttribute("aria-hidden", "true");
    sparkle.textContent = sparkleCharacters[Math.floor(Math.random() * sparkleCharacters.length)];
    sparkle.style.left = `${event.clientX - 8 + (Math.random() * 8 - 4)}px`;
    sparkle.style.top = `${event.clientY - 8 + (Math.random() * 8 - 4)}px`;
    sparkle.style.setProperty("--sparkle-x", `${Math.random() * 14 - 7}px`);
    sparkle.style.setProperty("--sparkle-y", `${-10 - Math.random() * 10}px`);
    document.body.appendChild(sparkle);

    sparkle.addEventListener("animationend", function () {
      sparkle.remove();
    }, { once: true });
  }, { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setUpMagicCursor, { once: true });
} else {
  setUpMagicCursor();
}
