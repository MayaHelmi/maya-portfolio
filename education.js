/* ==========================================================================
   Education: the certificate stack

   The degree certificates stay fanned around the graduation portrait, with
   the education details underneath. Hovering or focusing a certificate
   enlarges it, and selecting one opens the full-size viewer.
   ========================================================================== */

(function () {
  const card = document.querySelector("[data-edu]");
  if (!card) return;

  const figure = card.querySelector("[data-edu-figure]");
  const certs = Array.from(card.querySelectorAll(".edu-cert"));
  const links = Array.from(card.querySelectorAll(".edu-cert-link"));
  if (!figure || !certs.length || !links.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(.22, 1, .36, 1)";

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
    const radius = .9;                                   /* a little air around the logo */
    let step = 40;                                        /* wider spacing between certificates */
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

  placeArch();
  window.addEventListener("resize", placeArch);

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
    });

    links.forEach(function (link, index) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
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

}());
