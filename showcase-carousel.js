(function () {
  const carousel = document.querySelector('[data-showcase-carousel]');
  if (!carousel) return;

  const section = carousel.closest('.showcase');
  const cards = Array.from(carousel.querySelectorAll('.project-card')).sort(function (first, second) {
    return Number(first.dataset.showcaseKind === 'app') - Number(second.dataset.showcaseKind === 'app');
  });
  const previousButton = section.querySelector('[data-showcase-prev]');
  const nextButton = section.querySelector('[data-showcase-next]');
  const currentText = section.querySelector('[data-showcase-current]');
  const totalText = section.querySelector('[data-showcase-total]');
  const liveText = section.querySelector('[data-showcase-live]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let activeIndex = 0;
  let animationFrame = 0;
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragging = false;
  let scrollEndTimer = 0;
  let lastAnnouncedIndex = 0;
  let targetIndex = null;

  /* Website screenshots lead the carousel; the featured mobile app remains
     part of the selected work, but follows the website slides. */
  cards.forEach(function (card) {
    carousel.appendChild(card);
  });

  cards.forEach(function (card, index) {
    const title = card.querySelector('.project-title')?.textContent.trim() || 'Project';
    card.removeAttribute('tabindex');
    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-label', (index + 1) + ' of ' + cards.length + ': ' + title);
    card.querySelectorAll('img').forEach(function (image) {
      image.draggable = false;
    });
  });

  function projectTitle(index) {
    return cards[index]?.querySelector('.project-title')?.textContent.trim() || 'Project';
  }

  function updateControls() {
    currentText.textContent = String(activeIndex + 1).padStart(2, '0');
    totalText.textContent = String(cards.length).padStart(2, '0');
    previousButton.disabled = activeIndex === 0;
    nextButton.disabled = activeIndex === cards.length - 1;

    cards.forEach(function (card, index) {
      if (index === activeIndex) card.dataset.active = 'true';
      else delete card.dataset.active;
    });
  }

  function render() {
    animationFrame = 0;

    const carouselRect = carousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    const maxAngle = window.innerWidth <= 767 ? 11 : 17;
    let closestIndex = 0;
    let closestDistance = Infinity;

    cards.forEach(function (card, index) {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = cardCenter - carouselCenter;
      const offset = distance / Math.max(carouselRect.width * .68, 1);
      const clamped = Math.max(-1, Math.min(1, offset));
      const depth = Math.abs(clamped);
      const media = card.querySelector('.project-shot');

      media.style.setProperty('--showcase-angle', (-clamped * maxAngle).toFixed(2) + 'deg');
      media.style.setProperty('--showcase-scale', (1 - depth * .09).toFixed(3));
      media.style.setProperty('--showcase-opacity', (1 - depth * .22).toFixed(3));
      media.style.setProperty('--showcase-saturation', (1 - depth * .18).toFixed(3));

      if (Math.abs(distance) < closestDistance) {
        closestDistance = Math.abs(distance);
        closestIndex = index;
      }
    });

    activeIndex = closestIndex;
    if (targetIndex === closestIndex) targetIndex = null;
    updateControls();
  }

  function requestRender() {
    if (!animationFrame) animationFrame = requestAnimationFrame(render);
  }

  function announce(index) {
    liveText.textContent = projectTitle(index) + ', slide ' + (index + 1) + ' of ' + cards.length;
    lastAnnouncedIndex = index;
  }

  function goTo(index, shouldAnnounce) {
    const nextIndex = Math.max(0, Math.min(cards.length - 1, index));
    const card = cards[nextIndex];
    const targetLeft = card.offsetLeft - (carousel.clientWidth - card.clientWidth) / 2;

    targetIndex = nextIndex;
    activeIndex = nextIndex;
    updateControls();
    carousel.scrollTo({
      left: targetLeft,
      behavior: reducedMotion.matches ? 'auto' : 'smooth'
    });

    if (shouldAnnounce) announce(nextIndex);
    requestRender();
  }

  carousel.addEventListener('scroll', function () {
    requestRender();
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(function () {
      render();
      if (activeIndex !== lastAnnouncedIndex) announce(activeIndex);
    }, 180);
  }, { passive: true });
  window.addEventListener('resize', requestRender);
  window.addEventListener('load', requestRender);

  previousButton.addEventListener('click', function () {
    goTo((targetIndex ?? activeIndex) - 1, true);
  });

  nextButton.addEventListener('click', function () {
    goTo((targetIndex ?? activeIndex) + 1, true);
  });

  carousel.addEventListener('keydown', function (event) {
    if (event.target !== carousel) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    goTo((targetIndex ?? activeIndex) + (event.key === 'ArrowRight' ? 1 : -1), true);
  });

  carousel.addEventListener('pointerdown', function (event) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('a, button')) return;

    dragging = true;
    targetIndex = null;
    dragStartX = event.clientX;
    dragStartScroll = carousel.scrollLeft;
    carousel.classList.add('is-dragging');
    carousel.setPointerCapture(event.pointerId);
  });

  carousel.addEventListener('pointermove', function (event) {
    if (!dragging) return;
    event.preventDefault();
    carousel.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
  });

  function stopDragging(event) {
    if (!dragging) return;
    dragging = false;
    carousel.classList.remove('is-dragging');
    if (carousel.hasPointerCapture(event.pointerId)) carousel.releasePointerCapture(event.pointerId);
    requestRender();
  }

  carousel.addEventListener('pointerup', stopDragging);
  carousel.addEventListener('pointercancel', stopDragging);

  render();
}());
