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


/* ============ 4. Highlight the section currently in view ============ */

function setupSectionNavigation() {
  const sectionLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const items = sectionLinks.map(function (link) {
    const id = link.getAttribute("href").slice(1);
    return { id: id, link: link, target: document.getElementById(id) };
  }).filter(function (item) {
    return item.id && item.target;
  });

  /* Case-study pages only have an in-page Contact link. Scroll tracking is
     for the homepage, where there are several real section choices. */
  if (items.length < 2) return;

  const header = document.querySelector(".header");
  let currentLink = document.querySelector(".nav-links a.is-current");
  let pendingLink = null;
  let bottomPreferenceLink = null;
  let pendingReleaseTimer = 0;
  let updateQueued = false;

  function setCurrent(link) {
    if (link === currentLink) return;

    items.forEach(function (item) {
      const isCurrent = item.link === link;
      item.link.classList.toggle("is-current", isCurrent);
      if (isCurrent) {
        item.link.setAttribute("aria-current", "location");
      } else {
        item.link.removeAttribute("aria-current");
      }
    });

    currentLink = link;
  }

  function updateCurrentSection() {
    updateQueued = false;

    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const activationLine = window.scrollY + headerHeight + Math.min(window.innerHeight * 0.28, 220);
    let activeItem = items[0];

    items.forEach(function (item) {
      const sectionTop = item.target.getBoundingClientRect().top + window.scrollY;
      if (sectionTop <= activationLine) activeItem = item;
    });

    /* The footer can be shorter than the viewport, so its top may never cross
       the activation line. Reaching the bottom should still select Contact. */
    const scrollingElement = document.scrollingElement || document.documentElement;
    const atPageBottom = window.innerHeight + window.scrollY >= scrollingElement.scrollHeight - 2;
    if (atPageBottom && bottomPreferenceLink) {
      const preferredItem = items.find(function (item) {
        return item.link === bottomPreferenceLink;
      });
      if (preferredItem) activeItem = preferredItem;
    } else if (atPageBottom) {
      const contactItem = items.find(function (item) { return item.id === "contact"; });
      if (contactItem) activeItem = contactItem;
    }

    setCurrent(activeItem.link);
  }

  function queueUpdate() {
    if (pendingLink) {
      window.clearTimeout(pendingReleaseTimer);
      pendingReleaseTimer = window.setTimeout(function () {
        pendingLink = null;
        queueUpdate();
      }, 180);
      return;
    }

    if (updateQueued) return;
    updateQueued = true;
    window.requestAnimationFrame(updateCurrentSection);
  }

  function selectRequestedSection(link) {
    pendingLink = link;
    bottomPreferenceLink = link;
    setCurrent(link);
    queueUpdate();
  }

  function releaseBottomPreference() {
    bottomPreferenceLink = null;
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    const item = items.find(function (candidate) {
      return anchor.getAttribute("href") === "#" + candidate.id;
    });
    if (!item) return;

    anchor.addEventListener("click", function () {
      selectRequestedSection(item.link);
    });
  });

  window.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate);
  window.addEventListener("hashchange", queueUpdate);
  window.addEventListener("load", queueUpdate, { once: true });
  window.addEventListener("pageshow", queueUpdate);
  window.addEventListener("wheel", releaseBottomPreference, { passive: true });
  window.addEventListener("touchstart", releaseBottomPreference, { passive: true });
  window.addEventListener("keydown", function (event) {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
      releaseBottomPreference();
    }
  });

  if ("ResizeObserver" in window) {
    const layoutObserver = new ResizeObserver(queueUpdate);
    layoutObserver.observe(document.body);
  }

  const hashId = window.location.hash.slice(1);
  let hashItem = items.find(function (item) {
    return "#" + item.id === window.location.hash;
  });
  const hashTarget = hashId ? document.getElementById(hashId) : null;
  if (!hashItem && hashTarget && (hashId === "certificates" || hashTarget.closest("#achievements"))) {
    hashItem = items.find(function (item) { return item.id === "achievements"; });
  }
  if (hashItem) selectRequestedSection(hashItem.link);

  queueUpdate();
}


/* ============ 5. Continuously moving achievements ============ */

function setupAchievementTreadmill() {
  const treadmill = document.querySelector("[data-achievement-treadmill]");
  const track = treadmill && treadmill.querySelector("[data-achievement-treadmill-track]");
  const originalSet = treadmill && treadmill.querySelector("[data-achievement-treadmill-set]");
  const toggle = document.querySelector("[data-achievement-treadmill-toggle]");

  if (!treadmill || !track || !originalSet) return;

  const clone = originalSet.cloneNode(true);
  clone.removeAttribute("data-achievement-treadmill-set");
  clone.setAttribute("data-achievement-treadmill-clone", "");
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  clone.querySelectorAll("[id]").forEach(function (element) {
    element.removeAttribute("id");
  });
  clone.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach(function (element) {
    element.setAttribute("tabindex", "-1");
  });
  track.appendChild(clone);

  function updateDuration() {
    const pixelsPerSecond = 52;
    const duration = Math.min(92, Math.max(38, originalSet.scrollWidth / pixelsPerSecond));
    treadmill.style.setProperty("--achievement-duration", duration.toFixed(2) + "s");
  }

  function setPaused(paused) {
    treadmill.classList.toggle("is-paused", paused);
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.textContent = paused ? "Resume motion" : "Pause motion";
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setPaused(!treadmill.classList.contains("is-paused"));
    });
  }

  /* When a certificate link receives keyboard focus, reset the moving strip
     to a static, horizontally scrollable row before the browser paints focus.
     This keeps the focused card visible instead of freezing it off-screen. */
  treadmill.addEventListener("focusin", function (event) {
    if (!event.target.closest(".achievement-treadmill-frame[href]")) return;
    treadmill.classList.add("is-keyboard-browsing");
    window.requestAnimationFrame(function () {
      event.target.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  });
  treadmill.addEventListener("focusout", function (event) {
    if (event.relatedTarget && treadmill.contains(event.relatedTarget)) return;
    treadmill.classList.remove("is-keyboard-browsing");
  });

  updateDuration();
  treadmill.classList.add("is-ready");

  if ("ResizeObserver" in window) {
    const treadmillObserver = new ResizeObserver(updateDuration);
    treadmillObserver.observe(originalSet);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    setupSectionNavigation();
    setupAchievementTreadmill();
  }, { once: true });
} else {
  setupSectionNavigation();
  setupAchievementTreadmill();
}
