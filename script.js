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


/* ============ 4. Keep the mobile hero snake aligned ============ */

function setupMobileHeroSnake() {
  const stage = document.querySelector(".hero-stage");
  const svg = document.querySelector(".hero-role-snake--phone");
  const track = document.getElementById("snake-track-phone");
  const portrait = document.querySelector(".capsule-photo");
  if (!stage || !svg || !track || !portrait) return;

  function redraw() {
    if (!matchMedia("(max-width: 767px)").matches) return;

    const stageBox = stage.getBoundingClientRect();
    const photoBox = portrait.getBoundingClientRect();
    const box = {
      left: photoBox.left - stageBox.left,
      right: photoBox.right - stageBox.left,
      top: photoBox.top - stageBox.top,
      bottom: photoBox.bottom - stageBox.top
    };
    const photoX = (box.left + box.right) / 2;
    const radius = (box.right - box.left) / 2;

    svg.setAttribute("viewBox", "0 0 " + stageBox.width + " " + stageBox.height);
    /* The mobile snake now belongs only to the central portrait. Its route
       uses the portrait's rendered border, so it remains aligned as the
       image scales on different phone widths. */
    track.setAttribute("d", [
      "M", photoX, box.top,
      "C", box.right, box.top, box.right, box.top + radius, box.right, box.top + radius,
      "L", box.right, box.bottom - radius,
      "C", box.right, box.bottom, photoX, box.bottom, photoX, box.bottom,
      "C", box.left, box.bottom, box.left, box.bottom - radius, box.left, box.bottom - radius,
      "L", box.left, box.top + radius,
      "C", box.left, box.top, photoX, box.top, photoX, box.top,
      "Z"
    ].join(" "));
  }

  redraw();
  window.addEventListener("resize", redraw, { passive: true });
}


/* ============ 5. Type the About statement like code ============ */

function setupAboutTypewriter() {
  const target = document.querySelector(".about-typewriter");
  const line = target && target.closest(".about-code-line");
  if (!target || !line) return;

  const text = target.dataset.typewriter || target.textContent.trim();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    target.textContent = text;
    return;
  }

  /* Reserve the paragraph's completed height before clearing it, so typing
     never makes the sections below jump up and down. */
  line.style.minHeight = line.getBoundingClientRect().height + "px";
  target.textContent = "";

  let started = false;
  function startTyping() {
    if (started) return;
    started = true;

    let index = 0;
    function typeNextCharacter() {
      index += 1;
      target.textContent = text.slice(0, index);
      if (index >= text.length) return;

      const character = text.charAt(index - 1);
      const pause = /[.,]/.test(character) ? 115 : character === " " ? 18 : 28;
      window.setTimeout(typeNextCharacter, pause);
    }
    typeNextCharacter();
  }

  if (!("IntersectionObserver" in window)) {
    startTyping();
    return;
  }

  const observer = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    startTyping();
  }, { threshold: .35 });
  observer.observe(line);
}


/* ============ 6. Highlight the section currently in view ============ */

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


/* ============ 5. Achievements: moving strip + "View all" deck ============

   The strip (the "treadmill") is an ordinary sideways-scrolling row. It
   holds three copies of the cards - a hidden copy, the real one, a hidden
   copy - and drifts by nudging its own scroll position every frame. Because
   it is a real scroll position, a visitor can also push it by hand
   (trackpad, shift + wheel, finger, or dragging with the mouse). Whenever
   the position strays more than half a copy from the real cards, it is
   shifted back by exactly one copy; the copies are identical, so that jump
   can't be seen and the strip never runs out.

   Speed eases in and out instead of switching on and off. The strip glides
   to a stop under the pointer, holds still while something inside has
   keyboard focus or was just touched, and rests while off-screen or while
   "View all" is open.

   "View all" and "Collapse" move the cards themselves: each card the visitor
   can see glides from its place in the strip to its seat in the grid (and
   back again), the rest fade in or out around them, and the section's
   height eases between the two layouts. */

function setupAchievements() {
  const section = document.querySelector("#achievements");
  if (!section) return;

  const treadmill = section.querySelector("[data-achievement-treadmill]");
  const track = section.querySelector("[data-achievement-treadmill-track]");
  const originalSet = section.querySelector("[data-achievement-treadmill-set]");
  const stage = section.querySelector("[data-achievement-stage]");
  const toggle = section.querySelector("[data-achievement-toggle]");
  const head = section.querySelector("[data-achievement-head]");
  const deck = section.querySelector("[data-achievement-deck]");
  const deckGrid = section.querySelector("[data-achievement-deck-grid]");
  const collapseButton = section.querySelector("[data-achievement-collapse]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!treadmill || !track || !originalSet) return;

  const PIXELS_PER_SECOND = 42;
  const EASE_IN_OUT = "cubic-bezier(.65, 0, .35, 1)";

  /* ---- Build the hidden copies and the deck ---- */

  function makeCopy() {
    const copy = originalSet.cloneNode(true);
    copy.removeAttribute("data-achievement-treadmill-set");
    copy.setAttribute("data-achievement-treadmill-clone", "");
    copy.setAttribute("aria-hidden", "true");
    copy.setAttribute("inert", "");
    copy.querySelectorAll("a").forEach(function (link) { link.setAttribute("tabindex", "-1"); });
    return copy;
  }
  track.insertBefore(makeCopy(), originalSet);
  track.appendChild(makeCopy());

  if (deckGrid) {
    originalSet.querySelectorAll(".achievement-card").forEach(function (card) {
      deckGrid.appendChild(card.cloneNode(true));
    });
  }

  track.querySelectorAll("img").forEach(function (image) { image.draggable = false; });

  /* ---- The drifting strip ---- */

  let loopWidth = 0;
  let position = 0;
  let speed = 0;                  /* 0 = still, 1 = full speed */
  let frame = 0;
  let lastTime = 0;
  let hovering = false;
  let focused = false;
  let touching = false;
  let inView = true;
  let expanded = false;
  let resumeTimer = 0;
  let settleTimer = 0;
  let pointerInteraction = false;

  /* Reasons to stop at once, without easing. */
  function mustHold() {
    return reducedMotion.matches || expanded || !inView || focused || touching ||
      document.hidden || loopWidth <= 0;
  }

  function measure() {
    loopWidth = reducedMotion.matches ? 0 : originalSet.offsetWidth;
  }

  /* Bring the position back into the middle copy. */
  function recentre() {
    if (!loopWidth || focused) return;
    let moved = false;
    while (position < loopWidth * 0.5) { position += loopWidth; moved = true; }
    while (position >= loopWidth * 1.5) { position -= loopWidth; moved = true; }
    if (moved) treadmill.scrollLeft = position;
  }

  function step(now) {
    frame = 0;
    if (mustHold()) { speed = 0; lastTime = 0; return; }

    const seconds = lastTime ? Math.min(now - lastTime, 64) / 1000 : 0;
    lastTime = now;

    /* Ease toward full speed, or toward a stop while the pointer is over it. */
    const target = hovering ? 0 : 1;
    const response = target ? 1.6 : 7;
    speed += (target - speed) * (1 - Math.exp(-seconds * response));
    if (!target && speed < 0.004) { speed = 0; lastTime = 0; return; }

    /* Anything that scrolled the strip since the last frame wins. */
    if (Math.abs(treadmill.scrollLeft - position) > 2) position = treadmill.scrollLeft;

    position += PIXELS_PER_SECOND * speed * seconds;
    recentre();
    treadmill.scrollLeft = position;
    frame = window.requestAnimationFrame(step);
  }

  function refresh() {
    if (mustHold()) {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      speed = 0;
      lastTime = 0;
    } else if (!frame && (!hovering || speed > 0)) {
      lastTime = 0;
      frame = window.requestAnimationFrame(step);
    }
  }

  function placeAtStart() {
    measure();
    position = loopWidth;            /* the real cards, first one at the left */
    treadmill.scrollLeft = position;
  }

  /* A hand-made scroll: follow it, and quietly recentre once it settles. */
  treadmill.addEventListener("scroll", function () {
    if (frame) return;
    position = treadmill.scrollLeft;
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(recentre, 140);
  }, { passive: true });

  treadmill.addEventListener("pointerenter", function (event) {
    if (event.pointerType === "mouse") { hovering = true; refresh(); }
  });
  treadmill.addEventListener("pointerleave", function (event) {
    if (event.pointerType === "mouse") { hovering = false; refresh(); }
  });

  function pauseForTouch() {
    touching = true;
    window.clearTimeout(resumeTimer);
    refresh();
  }
  function resumeAfterTouch() {
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(function () {
      touching = false;
      position = treadmill.scrollLeft;
      recentre();
      refresh();
    }, 2200);
  }
  treadmill.addEventListener("touchstart", pauseForTouch, { passive: true });
  treadmill.addEventListener("touchend", resumeAfterTouch, { passive: true });
  treadmill.addEventListener("touchcancel", resumeAfterTouch, { passive: true });

  /* Dragging with a mouse. A drag never counts as a click on a certificate. */
  let dragStartX = 0;
  let dragStartScroll = 0;
  let pointerDown = false;
  let dragged = false;

  treadmill.addEventListener("pointerdown", function (event) {
    pointerInteraction = true;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    pointerDown = true;
    dragged = false;
    dragStartX = event.clientX;
    dragStartScroll = treadmill.scrollLeft;
  });
  treadmill.addEventListener("pointermove", function (event) {
    if (!pointerDown) return;
    const distance = event.clientX - dragStartX;
    if (!dragged && Math.abs(distance) > 6) {
      dragged = true;
      treadmill.classList.add("is-dragging");
      treadmill.setPointerCapture(event.pointerId);
    }
    if (!dragged) return;
    event.preventDefault();
    treadmill.scrollLeft = dragStartScroll - distance;
  });
  function endDrag(event) {
    if (!pointerDown) return;
    pointerDown = false;
    treadmill.classList.remove("is-dragging");
    if (treadmill.hasPointerCapture(event.pointerId)) treadmill.releasePointerCapture(event.pointerId);
    position = treadmill.scrollLeft;
    recentre();
  }
  function endPointerInteraction(event) {
    if (!pointerInteraction) return;
    endDrag(event);
    window.requestAnimationFrame(function () {
      const active = document.activeElement;
      if (active && treadmill.contains(active) && typeof active.blur === "function") active.blur();
      pointerInteraction = false;
      refresh();
    });
  }
  window.addEventListener("pointerup", endPointerInteraction);
  window.addEventListener("pointercancel", endPointerInteraction);
  treadmill.addEventListener("click", function (event) {
    if (!dragged) return;
    event.preventDefault();
    event.stopPropagation();
    dragged = false;
  }, true);

  /* Keyboard: the strip holds still while anything in it has focus, and the
     focused card is brought clear of the faded edges. */
  treadmill.addEventListener("focusin", function (event) {
    if (pointerInteraction) return;
    focused = true;
    refresh();
    const link = event.target.closest(".achievement-card-link");
    if (link) {
      window.requestAnimationFrame(function () {
        link.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    }
  });
  treadmill.addEventListener("focusout", function (event) {
    if (event.relatedTarget && treadmill.contains(event.relatedTarget)) return;
    focused = false;
    position = treadmill.scrollLeft;
    recentre();
    refresh();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      refresh();
    }).observe(treadmill);
  }
  document.addEventListener("visibilitychange", refresh);

  if ("ResizeObserver" in window) {
    let firstObservation = true;
    new ResizeObserver(function () {
      if (firstObservation) { firstObservation = false; return; }
      if (expanded || treadmill.hidden) return;
      const oldWidth = loopWidth;
      measure();
      if (oldWidth && loopWidth) position = position / oldWidth * loopWidth;
      else position = loopWidth;
      treadmill.scrollLeft = position;
      recentre();
    }).observe(originalSet);
  }

  reducedMotion.addEventListener("change", function () {
    placeAtStart();
    refresh();
  });

  placeAtStart();
  refresh();

  /* ---- "View all" and "Collapse" ---- */

  if (!toggle || !deck || !deckGrid || !stage) return;
  toggle.hidden = false;

  const deckCards = Array.from(deckGrid.children);
  let busy = false;

  function setToggle(isOpen) {
    toggle.textContent = isOpen ? "Collapse" : "View all";
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  /* Timing of the card trick, in milliseconds. */
  const GATHER = 560;          /* one card sliding into the stack */
  const GATHER_GAP = 40;       /* between cards joining the stack */
  const REST = 140;            /* the stack sits still for a beat */
  const DEAL = 680;            /* one card travelling to its place */
  const DEAL_GAP = 75;         /* between cards leaving the stack */
  const DEAL_EASE = "cubic-bezier(.2, .8, .25, 1)";

  /* For each certificate (by its place in the list), the copy of it the
     visitor can actually see in the strip right now, and how much of it is
     showing. Cards hidden past the edges are left out. */
  function visibleStripCards() {
    const view = treadmill.getBoundingClientRect();
    const found = new Map();
    track.querySelectorAll(".achievement-treadmill-set").forEach(function (set) {
      Array.from(set.children).forEach(function (card, index) {
        const box = card.querySelector(".achievement-card-link").getBoundingClientRect();
        const shown = Math.min(box.right, view.right) - Math.max(box.left, view.left);
        if (shown <= 0) return;
        const share = shown / box.width;
        const best = found.get(index);
        if (!best || share > best.share) found.set(index, { box: box, share: share });
      });
    });
    return found;
  }

  /* Each card is drawn somewhere else while it travels; its real place in
     the grid (its "seat") never changes. These turn a place on screen into
     the transform that draws the card there. */
  function poseOver(box, seat) {
    /* Same top-left corner and width as box: used for the strip, so a card
       lands exactly on its twin there. */
    const scale = box.width / seat.width;
    const x = box.left - (seat.left + seat.width / 2 - scale * seat.width / 2);
    const y = box.top - (seat.top + seat.height / 2 - scale * seat.height / 2);
    return "translate(" + x + "px, " + y + "px) rotate(0deg) scale(" + scale + ")";
  }
  function poseInStack(pile, seat, index) {
    /* Centred on the stack, tilted a little differently for every card, and
       nudged up one step per card so the stack has some thickness. */
    const scale = pile.width / seat.width;
    const tilt = ((index * 47) % 13) - 6;
    const x = pile.x - (seat.left + seat.width / 2);
    const y = pile.y - (seat.top + seat.height / 2) - (deckCards.length - index) * 1.5;
    return "translate(" + x + "px, " + y + "px) rotate(" + tilt + "deg) scale(" + scale + ")";
  }
  const SEATED = "translate(0px, 0px) rotate(0deg) scale(1)";

  /* Where the stack sits: in the middle of the section, level with the strip. */
  function stackPoint(stripBox, cardBox) {
    const stageBox = stage.getBoundingClientRect();
    const width = cardBox ? cardBox.width * 0.9 : 230;
    const height = cardBox ? cardBox.height * 0.9 : 220;
    return {
      x: stageBox.left + stageBox.width / 2,
      y: stripBox.top + 10 + height / 2,
      width: width
    };
  }

  function layer(card, value) { card.style.zIndex = value === "" ? "" : String(value); }

  /* One card's whole journey as a single animation, so it never stutters
     between steps. `steps` is a list of [time in ms, transform, opacity]. */
  function journey(element, steps, easings) {
    const total = steps[steps.length - 1][0];
    const frames = steps.map(function (step, index) {
      const frame = { offset: total ? step[0] / total : 1, transform: step[1], opacity: step[2] };
      if (easings && easings[index]) frame.easing = easings[index];
      return frame;
    });
    return element.animate(frames, { duration: total, fill: "both" });
  }

  /* The name under each card fades while it is in the stack. */
  function nameFade(card, steps) {
    const name = card.querySelector(".achievement-card-name");
    const total = steps[steps.length - 1][0];
    return name.animate(steps.map(function (step) {
      return { offset: total ? step[0] / total : 1, opacity: step[1] };
    }), { duration: total, fill: "both" });
  }

  /* Ease the section between two heights. It holds the final height until
     released, so nothing jumps between the end and the swap that follows. */
  function easeHeight(fromHeight, toHeight, duration, delay) {
    return stage.animate(
      [{ height: fromHeight + "px" }, { height: toHeight + "px" }],
      { duration: duration, delay: delay || 0, easing: EASE_IN_OUT, fill: "both" }
    );
  }
  function releaseAll() {
    stage.getAnimations().forEach(function (animation) { animation.cancel(); });
    deckCards.forEach(function (card) {
      card.querySelectorAll(".achievement-card-link, .achievement-card-name").forEach(function (element) {
        element.getAnimations().forEach(function (animation) { animation.cancel(); });
      });
      layer(card, "");
    });
  }
  function settle(animations) {
    return Promise.all(animations.map(function (animation) {
      return animation.finished.catch(function () {});
    }));
  }
  function canAnimate() {
    return !reducedMotion.matches && typeof stage.animate === "function";
  }
  function later(ms, callback) { window.setTimeout(callback, ms); }

  /* ---- View all: gather into a stack, then deal into the grid ---- */
  function expand() {
    if (busy || expanded) return;

    const startHeight = stage.offsetHeight;
    const stripBox = treadmill.getBoundingClientRect();
    const fromStrip = canAnimate() ? visibleStripCards() : new Map();
    const anyCard = fromStrip.size ? fromStrip.values().next().value.box : null;

    expanded = true;
    refresh();
    setToggle(true);
    treadmill.hidden = true;
    deck.hidden = false;

    if (!canAnimate()) return;

    busy = true;
    stage.classList.add("is-animating");
    const endHeight = stage.offsetHeight;
    const pile = stackPoint(stripBox, anyCard);
    const count = deckCards.length;
    const animations = [];

    /* Visible cards join the stack left to right; the rest are already in it. */
    const joining = Array.from(fromStrip.keys()).sort(function (a, b) {
      return fromStrip.get(a).box.left - fromStrip.get(b).box.left;
    });
    const gathered = GATHER + Math.max(0, joining.length - 1) * GATHER_GAP;
    const dealFrom = gathered + REST;

    deckCards.forEach(function (card, index) {
      const link = card.querySelector(".achievement-card-link");
      const seat = link.getBoundingClientRect();
      const inStack = poseInStack(pile, seat, index);
      const origin = fromStrip.get(index);
      const leave = dealFrom + index * DEAL_GAP;
      const land = leave + DEAL;

      layer(card, 100 + count - index);          /* first to be dealt on top */
      later(leave, function () { layer(card, 200 + index); });

      if (origin) {
        const joinAt = joining.indexOf(index) * GATHER_GAP;
        animations.push(journey(link, [
          [0, poseOver(origin.box, seat), 1],
          [joinAt, poseOver(origin.box, seat), 1],
          [joinAt + GATHER, inStack, 1],
          [leave, inStack, 1],
          [land, SEATED, 1]
        ], [null, EASE_IN_OUT, null, DEAL_EASE]));
        animations.push(nameFade(card, [[0, 1], [joinAt + GATHER * .4, 0], [land - 220, 0], [land, 1]]));
      } else {
        /* Out of sight in the strip: it quietly appears under the stack. */
        animations.push(journey(link, [
          [0, inStack, 0],
          [gathered, inStack, 1],
          [leave, inStack, 1],
          [land, SEATED, 1]
        ], [EASE_IN_OUT, null, DEAL_EASE]));
        animations.push(nameFade(card, [[0, 0], [land - 220, 0], [land, 1]]));
      }
    });

    /* The section opens up as the cards start to leave the stack. */
    animations.push(easeHeight(startHeight, endHeight, Math.min(1400, Math.max(700, (endHeight - startHeight) * 0.9)), dealFrom));

    settle(animations).then(function () {
      releaseAll();
      stage.classList.remove("is-animating");
      busy = false;
    });
  }

  /* ---- Collapse: gather into a stack, then deal back into the strip ---- */
  function collapse(fromBottom) {
    if (busy || !expanded) return;
    busy = true;
    setToggle(false);

    function finish() {
      deck.hidden = true;
      treadmill.classList.remove("is-landing");
      releaseAll();
      stage.classList.remove("is-animating");
      expanded = false;
      busy = false;
      speed = 0;
      refresh();
      if (fromBottom) toggle.focus({ preventScroll: true });
    }

    if (!canAnimate()) {
      treadmill.hidden = false;
      placeAtStart();
      finish();
      return;
    }

    /* If the heading has scrolled away, glide back up first so the whole
       trick happens in view. */
    const needsScroll = head && head.getBoundingClientRect().top < 0;
    if (needsScroll) head.scrollIntoView({ block: "start", behavior: "smooth" });
    window.setTimeout(run, needsScroll ? 650 : 0);

    function run() {
      const startHeight = stage.offsetHeight;

      /* Lay the strip out invisibly at its starting place, so every card
         knows exactly where it is going. */
      treadmill.classList.add("is-landing");
      treadmill.hidden = false;
      placeAtStart();
      const endHeight = treadmill.offsetHeight;
      const stripBox = treadmill.getBoundingClientRect();
      const targets = visibleStripCards();
      const anyCard = targets.size ? targets.values().next().value.box : null;
      const pile = stackPoint(stripBox, anyCard);

      stage.classList.add("is-animating");

      const count = deckCards.length;
      const seats = deckCards.map(function (card) {
        return card.querySelector(".achievement-card-link").getBoundingClientRect();
      });
      const onScreen = function (box) { return box.bottom > 0 && box.top < window.innerHeight; };

      /* Cards on screen slide into the stack, last card first, so the first
         card ends up on top. The rest appear under the stack. */
      const joining = [];
      for (let index = count - 1; index >= 0; index -= 1) {
        if (onScreen(seats[index])) joining.push(index);
      }
      const gathered = GATHER + Math.max(0, joining.length - 1) * GATHER_GAP;
      const dealFrom = gathered + REST;

      /* Only the cards with a visible place in the strip are dealt out. */
      const dealt = Array.from(targets.keys()).sort(function (a, b) {
        return targets.get(a).box.left - targets.get(b).box.left;
      });
      const lastLanding = dealFrom + Math.max(0, dealt.length - 1) * DEAL_GAP + DEAL;
      const animations = [];

      deckCards.forEach(function (card, index) {
        const link = card.querySelector(".achievement-card-link");
        const seat = seats[index];
        const inStack = poseInStack(pile, seat, index);
        const joinOrder = joining.indexOf(index);
        const joinAt = joinOrder * GATHER_GAP;
        const target = targets.get(index);

        layer(card, 100 + count - index);

        const start = joinOrder >= 0
          ? [[0, SEATED, 1], [joinAt, SEATED, 1], [joinAt + GATHER, inStack, 1]]
          : [[0, inStack, 0], [gathered, inStack, 1]];
        const startEasings = joinOrder >= 0 ? [null, EASE_IN_OUT] : [EASE_IN_OUT];

        if (target) {
          const leave = dealFrom + dealt.indexOf(index) * DEAL_GAP;
          const land = leave + DEAL;
          const finalOpacity = Math.max(.35, Math.min(1, target.share * 1.25));
          later(leave, function () { layer(card, 200 + index); });
          animations.push(journey(link, start.concat([
            [leave, inStack, 1],
            [land, poseOver(target.box, seat), finalOpacity],
            [lastLanding, poseOver(target.box, seat), finalOpacity]
          ]), startEasings.concat([null, DEAL_EASE, null])));
          animations.push(nameFade(card, [[0, 1], [GATHER * .4, 0], [land - 220, 0], [land, 1], [lastLanding, 1]]));
        } else {
          /* No place in view: it stays under the stack and fades away as the
             stack is dealt out. */
          animations.push(journey(link, start.concat([
            [dealFrom, inStack, 1],
            [lastLanding - DEAL * .5, inStack, 0],
            [lastLanding, inStack, 0]
          ]), startEasings.concat([null, EASE_IN_OUT, null])));
          animations.push(nameFade(card, [[0, joinOrder >= 0 ? 1 : 0], [GATHER * .4, 0], [lastLanding, 0]]));
        }
      });

      /* Once everything is in the stack, the section closes up around it. */
      animations.push(easeHeight(startHeight, endHeight, Math.min(1200, Math.max(650, (startHeight - endHeight) * 0.8)), dealFrom));

      settle(animations).then(function () {
        /* Every visible card now sits exactly on its twin in the strip, so
           swapping one for the other can't be seen. */
        finish();
      });
    }
  }

  toggle.addEventListener("click", function () {
    if (expanded) collapse(false);
    else expand();
  });
  if (collapseButton) {
    collapseButton.addEventListener("click", function () { collapse(true); });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    setupMobileHeroSnake();
    setupAboutTypewriter();
    setupSectionNavigation();
    setupAchievements();
  }, { once: true });
} else {
  setupMobileHeroSnake();
  setupAboutTypewriter();
  setupSectionNavigation();
  setupAchievements();
}
