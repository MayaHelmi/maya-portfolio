/* ==========================================================================
   Education: the certificate stack

   Closed, the degree certificates sit in a small stack under the graduation
   photo and nudge every few seconds (the CSS does that). Pointing at the
   card, or tapping the photo, opens it:
     1. the details fade out,
     2. the photo glides to the centre while the certificates fan out from
        under it into an arch above it, and
     3. the details come back underneath, laid out in a row.
   Closing plays the same steps in reverse. Each certificate opens full size
   in a new tab once the arch is out.
   ========================================================================== */

(function () {
  const card = document.querySelector("[data-edu]");
  if (!card) return;

  const figure = card.querySelector("[data-edu-figure]");
  const toggle = card.querySelector("[data-edu-toggle]");
  const facts = card.querySelector("[data-edu-facts]");
  const certs = Array.from(card.querySelectorAll(".edu-cert"));
  const links = Array.from(card.querySelectorAll(".edu-cert-link"));
  if (!figure || !toggle || !facts || !certs.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  const EASE = "cubic-bezier(.22, 1, .36, 1)";

  let open = false;          /* the state on screen */
  let wanted = false;        /* the state asked for */
  let busy = false;
  let leaveTimer = 0;

  certs.forEach(function (cert) {
    const d = Number(getComputedStyle(cert).getPropertyValue("--d")) || 0;
    cert.style.setProperty("--abs", Math.abs(d));
  });

  /* The arch: certificates on a circle around the photo's centre, the middle
     one straight above the photo. On a narrow card the fan closes up a
     little so it still fits. */
  function placeArch() {
    const width = figure.offsetWidth;
    const style = getComputedStyle(card);
    const room = card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const radius = 1.1;                                   /* in photo widths */
    let step = 36;                                        /* degrees between certificates */
    const reach = function (angle) {
      const a = angle * Math.PI / 180;
      return radius * Math.sin(a) + .3 * Math.cos(a) + .425 * Math.sin(a);
    };
    while (step > 18 && reach(step * 2) * width > room / 2) step -= 2;

    certs.forEach(function (cert) {
      const d = Number(getComputedStyle(cert).getPropertyValue("--d")) || 0;
      const angle = d * step;
      const a = angle * Math.PI / 180;
      cert.style.setProperty("--ox", (radius * Math.sin(a)).toFixed(3));
      cert.style.setProperty("--oy", (-radius * Math.cos(a)).toFixed(3));
      cert.style.setProperty("--oa", angle + "deg");
    });
  }

  function setLinks(enabled) {
    links.forEach(function (link) {
      if (enabled) link.removeAttribute("tabindex");
      else link.setAttribute("tabindex", "-1");
    });
    toggle.setAttribute("aria-expanded", String(enabled));
    toggle.setAttribute("aria-label", enabled ? "Hide my degree certificates" : "Show my degree certificates");
  }

  function wait(ms) { return new Promise(function (resolve) { window.setTimeout(resolve, ms); }); }

  function finished(animation) {
    return animation ? animation.finished.catch(function () {}) : Promise.resolve();
  }

  /* Move from one layout to the other without a jump: note where the photo
     and the card are, switch the layout, then animate from the old place to
     the new one. */
  function switchLayout(toOpen) {
    const before = figure.getBoundingClientRect();
    const beforeHeight = card.offsetHeight;

    card.classList.toggle("is-open", toOpen);
    if (toOpen) placeArch();

    const after = figure.getBoundingClientRect();
    const afterHeight = card.offsetHeight;
    const dx = before.left - after.left;
    const dy = before.top - after.top;

    const glide = figure.animate([
      { transform: "translate(" + dx + "px, " + dy + "px)" },
      { transform: "translate(0, 0)" }
    ], { duration: 720, easing: EASE });

    const grow = card.animate([
      { height: beforeHeight + "px" },
      { height: afterHeight + "px" }
    ], { duration: 720, easing: EASE });

    return Promise.all([finished(glide), finished(grow)]);
  }

  function fadeFacts(show, delay) {
    return facts.animate(show ? [
      { opacity: 0, transform: "translateY(14px)" },
      { opacity: 1, transform: "none" }
    ] : [
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: "translateY(8px)" }
    ], { duration: show ? 420 : 160, delay: delay || 0, easing: EASE, fill: "both" });
  }

  async function run() {
    if (busy || wanted === open) return;
    busy = true;
    const toOpen = wanted;

    if (reducedMotion.matches) {
      card.classList.toggle("is-open", toOpen);
      if (toOpen) placeArch();
    } else {
      card.classList.add("is-moving");
      const out = fadeFacts(false);
      await finished(out);
      const layout = switchLayout(toOpen);
      const back = fadeFacts(true, toOpen ? 380 : 260);
      await Promise.all([layout, finished(back)]);
      out.cancel();
      back.cancel();
      card.classList.remove("is-moving");
    }

    open = toOpen;
    setLinks(open);
    busy = false;
    if (wanted !== open) run();      /* the visitor changed their mind meanwhile */
  }

  function request(state) {
    if (!state && document.documentElement.classList.contains("cert-viewer-open")) return;
    wanted = state;
    run();
  }

  /* Pointer devices: open on hover, close shortly after leaving. */
  /* A short pause before opening, so the card doesn't burst open when the
     pointer merely passes over it while scrolling. */
  let enterTimer = 0;
  card.addEventListener("pointerenter", function (event) {
    if (event.pointerType !== "mouse" || !canHover.matches) return;
    window.clearTimeout(leaveTimer);
    window.clearTimeout(enterTimer);
    enterTimer = window.setTimeout(function () { request(true); }, 140);
  });
  card.addEventListener("pointerleave", function (event) {
    if (event.pointerType !== "mouse" || !canHover.matches) return;
    window.clearTimeout(enterTimer);
    window.clearTimeout(leaveTimer);
    leaveTimer = window.setTimeout(function () { request(false); }, 320);
  });

  /* Tap or keyboard: the photo toggles. */
  toggle.addEventListener("click", function () {
    if (canHover.matches && open) return;   /* with a mouse, leaving the card closes it */
    request(!wanted);
  });

  document.addEventListener("click", function (event) {
    if (!wanted || card.contains(event.target)) return;
    request(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !wanted) return;
    if (document.documentElement.classList.contains("cert-viewer-open")) return;
    request(false);
    toggle.focus();
  });

  card.addEventListener("focusout", function (event) {
    if (!wanted || (event.relatedTarget && card.contains(event.relatedTarget))) return;
    if (canHover.matches && card.matches(":hover")) return;
    request(false);
  });

  window.addEventListener("resize", function () {
    if (open) placeArch();
  });

  /* ---- Full-size view ----
     Clicking a certificate grows it from its place in the arch into a
     pop-up; the arrows (or arrow keys) step through the others, and closing
     shrinks it back to where it came from. */
  const viewer = document.querySelector("[data-cert-viewer]");
  if (viewer) {
    const viewerImage = viewer.querySelector("[data-cert-viewer-image]");
    const viewerTitle = viewer.querySelector("[data-cert-viewer-title]");
    const viewerCount = viewer.querySelector("[data-cert-viewer-count]");
    let current = 0;

    function show(index) {
      current = (index + links.length) % links.length;
      const link = links[current];
      viewerImage.src = link.getAttribute("href");
      viewerImage.alt = link.getAttribute("title") || "";
      viewerTitle.textContent = link.getAttribute("title") || "";
      viewerCount.textContent = (current + 1) + " / " + links.length;
    }

    /* Animate the big image from (or back to) the small certificate. */
    function morph(link, opening) {
      if (reducedMotion.matches || typeof viewerImage.animate !== "function") return Promise.resolve();
      const from = link.getBoundingClientRect();
      const to = viewerImage.getBoundingClientRect();
      if (!to.width || !from.width) return Promise.resolve();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const scale = from.width / to.width;
      const small = "translate(" + dx + "px, " + dy + "px) scale(" + scale + ")";
      const frames = [{ transform: small, opacity: .6 }, { transform: "none", opacity: 1 }];
      return viewerImage.animate(opening ? frames : frames.slice().reverse(), {
        duration: opening ? 520 : 380,
        easing: opening ? EASE : "cubic-bezier(.4, 0, .6, 1)",
        fill: "both"
      }).finished.catch(function () {});
    }

    let closing = false;

    function openViewer(index) {
      show(index);
      viewer.showModal();
      document.documentElement.classList.add("cert-viewer-open");
      const start = function () { morph(links[current], true); };
      if (viewerImage.complete && viewerImage.naturalWidth) start();
      else viewerImage.addEventListener("load", start, { once: true });
    }

    async function closeViewer() {
      if (closing || !viewer.open) return;
      closing = true;
      viewer.classList.add("is-closing");
      await morph(links[current], false);
      viewer.close();
      viewer.classList.remove("is-closing");
      viewerImage.getAnimations().forEach(function (animation) { animation.cancel(); });
      closing = false;
    }

    viewer.addEventListener("close", function () {
      document.documentElement.classList.remove("cert-viewer-open");
      viewerImage.getAnimations().forEach(function (animation) { animation.cancel(); });
      links[current].focus({ preventScroll: true });
      /* If the pointer is no longer over the card once it moves again, fold
         the arch away (hover isn't updated until the pointer moves). */
      if (canHover.matches) {
        document.addEventListener("pointermove", function check(event) {
          document.removeEventListener("pointermove", check);
          if (!card.contains(document.elementFromPoint(event.clientX, event.clientY))) request(false);
        });
      }
    });

    links.forEach(function (link, index) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        if (!open) return;
        openViewer(index);
      });
    });

    viewer.addEventListener("cancel", function (event) { event.preventDefault(); closeViewer(); });
    viewer.querySelector("[data-cert-viewer-close]").addEventListener("click", closeViewer);
    viewer.querySelector("[data-cert-viewer-prev]").addEventListener("click", function () { show(current - 1); });
    viewer.querySelector("[data-cert-viewer-next]").addEventListener("click", function () { show(current + 1); });
    viewer.addEventListener("click", function (event) {
      if (event.target === viewer) closeViewer();       /* the dimmed backdrop */
    });
    viewer.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") { event.preventDefault(); show(current - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); show(current + 1); }
    });
  }

  setLinks(false);
}());
