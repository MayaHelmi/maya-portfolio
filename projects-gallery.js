(function () {
  const gallery = document.querySelector('.projects-gallery-page #projects');
  if (!gallery) return;

  const cards = Array.from(gallery.querySelectorAll('.project-card'));
  const help = document.createElement('p');
  const status = document.createElement('p');

  help.className = 'gallery-help';
  help.textContent = 'Drag or scroll to explore';
  status.className = 'gallery-status';
  document.body.append(help, status);

  cards.forEach(function (card, index) {
    card.removeAttribute('tabindex');
    card.dataset.galleryIndex = String(index);

    const sourceLink = card.querySelector('.flip-back .project-links a');
    const front = card.querySelector('.flip-front');
    if (!sourceLink || !front) return;

    const open = document.createElement('a');
    open.className = 'gallery-open';
    open.href = sourceLink.href;
    open.setAttribute('aria-label', 'Open ' + (card.querySelector('.project-title')?.textContent.trim() || 'project'));
    if (sourceLink.target) open.target = sourceLink.target;
    if (sourceLink.rel) open.rel = sourceLink.rel;
    open.textContent = '→';
    front.appendChild(open);
  });

  let frame = 0;
  let activeIndex = 0;

  function render() {
    frame = 0;
    const viewportCenter = window.innerWidth / 2;
    let closestDistance = Infinity;

    cards.forEach(function (card, index) {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const offset = (cardCenter - viewportCenter) / Math.max(window.innerWidth * .72, 1);
      const clamped = Math.max(-1, Math.min(1, offset));
      const distance = Math.abs(cardCenter - viewportCenter);

      card.style.setProperty('--gallery-angle', (-clamped * 17).toFixed(2) + 'deg');
      card.style.setProperty('--gallery-scale', (1 - Math.abs(clamped) * .1).toFixed(3));
      card.style.setProperty('--gallery-opacity', (1 - Math.abs(clamped) * .24).toFixed(3));

      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });

    status.textContent = String(activeIndex + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
  }

  function requestRender() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  gallery.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender);

  gallery.addEventListener('wheel', function (event) {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    gallery.scrollLeft += event.deltaY;
  }, { passive: false });

  let pointerDown = false;
  let pointerStart = 0;
  let scrollStart = 0;

  gallery.addEventListener('pointerdown', function (event) {
    if (event.target.closest('a')) return;
    pointerDown = true;
    pointerStart = event.clientX;
    scrollStart = gallery.scrollLeft;
    gallery.classList.add('is-dragging');
    gallery.setPointerCapture(event.pointerId);
  });

  gallery.addEventListener('pointermove', function (event) {
    if (!pointerDown) return;
    gallery.scrollLeft = scrollStart - (event.clientX - pointerStart);
  });

  function stopDragging() {
    pointerDown = false;
    gallery.classList.remove('is-dragging');
  }

  gallery.addEventListener('pointerup', stopDragging);
  gallery.addEventListener('pointercancel', stopDragging);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = Math.max(0, Math.min(cards.length - 1, activeIndex + direction));
    cards[next].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  });

  render();
}());
