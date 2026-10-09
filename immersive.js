(function () {
  "use strict";

  const root = document.documentElement;
  const gallery = document.querySelector("[data-gallery]");
  const cards = gallery ? Array.from(gallery.querySelectorAll("[data-project]")) : [];
  const profileButton = document.querySelector(".profile-toggle");
  const profilePanel = document.querySelector(".profile-panel");
  const currentLabel = document.querySelector("[data-current]");
  const totalLabel = document.querySelector("[data-total]");

  if (totalLabel) totalLabel.textContent = String(cards.length).padStart(2, "0");

  function setProfile(open) {
    if (!profileButton || !profilePanel) return;
    root.classList.toggle("profile-open", open);
    profilePanel.classList.toggle("is-open", open);
    profilePanel.setAttribute("aria-hidden", String(!open));
    profileButton.setAttribute("aria-expanded", String(open));
    profileButton.textContent = open ? "Close" : "Profile";
  }

  profileButton?.addEventListener("click", function () {
    setProfile(!profilePanel.classList.contains("is-open"));
  });

  profilePanel?.addEventListener("click", function (event) {
    if (event.target === profilePanel) setProfile(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && profilePanel?.classList.contains("is-open")) {
      setProfile(false);
    }
  });

  if (!gallery || cards.length === 0) return;

  let target = 0;
  let position = target;
  let pointerStart = 0;
  let pointerPosition = 0;
  let moved = false;
  let dragging = false;
  let wheelTimer = 0;

  const isMobile = function () {
    return window.matchMedia("(max-width: 720px)").matches;
  };

  function wrap(value) {
    return ((value % cards.length) + cards.length) % cards.length;
  }

  function shortestOffset(index, value) {
    let distance = index - wrap(value);
    const half = cards.length / 2;
    if (distance > half) distance -= cards.length;
    if (distance < -half) distance += cards.length;
    return distance;
  }

  function render() {
    if (isMobile()) {
      cards.forEach(function (card) {
        card.style.removeProperty("--x");
        card.style.removeProperty("--z");
        card.style.removeProperty("--ry");
        card.style.removeProperty("--scale");
        card.style.removeProperty("--opacity");
        card.classList.remove("is-active");
        card.removeAttribute("aria-hidden");
      });
      return;
    }

    position = target;
    const activeIndex = wrap(Math.round(position));

    cards.forEach(function (card, index) {
      const distance = shortestOffset(index, position);
      const abs = Math.abs(distance);
      const x = distance * Math.min(window.innerWidth * .405, 620);
      const z = -Math.min(abs * 150, 430);
      const rotate = distance * -13;
      const scale = Math.max(.74, 1 - abs * .055);
      const opacity = Math.max(.16, 1 - Math.max(0, abs - 1.65) * .55);

      card.style.setProperty("--x", x.toFixed(2) + "px");
      card.style.setProperty("--z", z.toFixed(2) + "px");
      card.style.setProperty("--ry", rotate.toFixed(2) + "deg");
      card.style.setProperty("--scale", scale.toFixed(3));
      card.style.setProperty("--opacity", opacity.toFixed(3));
      card.style.zIndex = String(100 - Math.round(abs * 10));
      card.classList.toggle("is-active", index === activeIndex);
      card.setAttribute("aria-hidden", String(abs > 2.7));
      const link = card.querySelector("a");
      if (link) link.tabIndex = index === activeIndex ? 0 : -1;
    });

    if (currentLabel) currentLabel.textContent = String(activeIndex + 1).padStart(2, "0");

  }

  function go(step) {
    target += step;
    render();
  }

  document.querySelector("[data-gallery-previous]")?.addEventListener("click", function () {
    go(-1);
  });

  document.querySelector("[data-gallery-next]")?.addEventListener("click", function () {
    go(1);
  });

  gallery.addEventListener("wheel", function (event) {
    if (isMobile() || profilePanel?.classList.contains("is-open")) return;
    event.preventDefault();
    if (wheelTimer) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    go(delta > 0 ? 1 : -1);
    wheelTimer = window.setTimeout(function () {
      wheelTimer = 0;
    }, 280);
  }, { passive: false });

  gallery.addEventListener("pointerdown", function (event) {
    if (event.target.closest(".gallery-control")) return;
    if (isMobile() || profilePanel?.classList.contains("is-open")) return;
    dragging = true;
    moved = false;
    pointerStart = event.clientX;
    pointerPosition = event.clientX;
    gallery.classList.add("is-dragging");
    gallery.setPointerCapture(event.pointerId);
  });

  gallery.addEventListener("pointermove", function (event) {
    if (!dragging || isMobile()) return;
    const delta = event.clientX - pointerPosition;
    pointerPosition = event.clientX;
    if (Math.abs(event.clientX - pointerStart) > 7) moved = true;
    target -= delta / Math.max(window.innerWidth * .42, 420);
    position = target;
    render();
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    gallery.classList.remove("is-dragging");
    target = Math.round(target);
    render();
    if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
  }

  gallery.addEventListener("pointerup", endDrag);
  gallery.addEventListener("pointercancel", endDrag);

  gallery.addEventListener("click", function (event) {
    if (moved) {
      event.preventDefault();
      moved = false;
    }
  }, true);

  document.addEventListener("keydown", function (event) {
    if (isMobile() || profilePanel?.classList.contains("is-open")) return;
    if (event.key === "ArrowLeft") go(-1);
    if (event.key === "ArrowRight") go(1);
  });

  window.addEventListener("resize", render);
  render();
}());
