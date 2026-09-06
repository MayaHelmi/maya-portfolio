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

/* Runs when the sun/moon button is clicked. */
function switchTheme() {
  const newTheme = page.dataset.theme === "dark" ? "light" : "dark";
  page.dataset.theme = newTheme;
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
