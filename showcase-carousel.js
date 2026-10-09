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
  const modal = document.querySelector('[data-project-modal]');
  const modalClose = modal?.querySelector('[data-project-modal-close]');
  const modalImage = modal?.querySelector('[data-project-modal-image]');
  const modalImageScroll = modal?.querySelector('.project-modal-image-scroll');
  const modalPreviewLabel = modal?.querySelector('[data-project-modal-preview-label]');
  const modalCopyScroll = modal?.querySelector('.project-modal-copy-scroll');
  const modalKicker = modal?.querySelector('[data-project-modal-kicker]');
  const modalTitle = modal?.querySelector('[data-project-modal-title]');
  const modalBadges = modal?.querySelector('[data-project-modal-badges]');
  const modalDescription = modal?.querySelector('[data-project-modal-description]');
  const modalNote = modal?.querySelector('[data-project-modal-note]');
  const modalTech = modal?.querySelector('[data-project-modal-tech]');
  const modalCta = modal?.querySelector('[data-project-modal-cta]');

  if (!modal) return;

  let activeIndex = 0;
  let animationFrame = 0;
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragging = false;
  let dragMoved = false;
  let suppressOpen = false;
  let scrollEndTimer = 0;
  let lastAnnouncedIndex = 0;
  let targetIndex = null;
  let lastModalTrigger = null;

  /* Website screenshots lead the carousel; the featured mobile app remains
     part of the selected work, but follows the website slides. */
  cards.forEach(function (card) {
    carousel.appendChild(card);
  });

  cards.forEach(function (card, index) {
    const title = card.querySelector('.project-title')?.textContent.trim() || 'Project';
    const trigger = card.querySelector('[data-project-trigger]');
    card.removeAttribute('tabindex');
    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-label', (index + 1) + ' of ' + cards.length + ': ' + title);
    card.querySelectorAll('img').forEach(function (image) {
      image.draggable = false;
    });

    trigger.setAttribute('aria-label', 'Open details for ' + title);
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', modal.id);
    trigger.addEventListener('click', function () {
      if (!suppressOpen) openProject(card, trigger);
    });
  });

  function projectTitle(index) {
    return cards[index]?.querySelector('.project-title')?.textContent.trim() || 'Project';
  }

  function cloneChildren(target, source) {
    const children = source ? Array.from(source.children).map(function (child) {
      return child.cloneNode(true);
    }) : [];
    target.replaceChildren(...children);
  }

  function openProject(card, trigger) {
    const image = card.querySelector('.project-shot img');
    const title = card.querySelector('.project-title')?.textContent.trim() || 'Project';
    const kicker = card.querySelector('.flip-back .kicker')?.textContent.trim() || 'Project details';
    const description = card.querySelector('.project-description')?.textContent.trim() || '';
    const badges = card.querySelector('.project-badges');
    const tech = card.querySelector('.project-tech');
    const links = Array.from(card.querySelectorAll('.project-links a'));
    const liveLink = links.find(function (link) {
      return /live demo|live site/i.test(link.textContent);
    });
    const primaryLink = liveLink || links.find(function (link) {
      return !/github/i.test(link.textContent);
    });
    const notes = Array.from(card.querySelectorAll('.project-note, .project-private'))
      .map(function (note) { return note.textContent.trim(); })
      .filter(Boolean);

    lastModalTrigger = trigger;
    modalImage.src = image.currentSrc || image.src;
    modalImage.alt = image.alt;
    modalPreviewLabel.textContent = card.dataset.showcaseKind === 'app' ? 'App preview' : 'Website preview';
    modalImageScroll.setAttribute('aria-label', 'Scrollable ' + modalPreviewLabel.textContent.toLowerCase() + ' for ' + title);
    modalKicker.textContent = kicker;
    modalTitle.textContent = title;
    modalDescription.textContent = description;
    cloneChildren(modalBadges, badges);
    cloneChildren(modalTech, tech);

    modalNote.textContent = notes.join(' ');
    modalNote.hidden = notes.length === 0;

    if (primaryLink) {
      modalCta.href = primaryLink.href;
      if (primaryLink.hasAttribute('target')) modalCta.target = primaryLink.target;
      else modalCta.removeAttribute('target');
      if (primaryLink.hasAttribute('rel')) modalCta.rel = primaryLink.rel;
      else modalCta.removeAttribute('rel');
      modalCta.textContent = liveLink
        ? (/demo/i.test(liveLink.textContent) ? 'View live demo ↗' : 'Visit website ↗')
        : 'Read project story →';
      if (modalCta.target === '_blank') {
        modalCta.setAttribute('aria-label', modalCta.textContent.replace(' ↗', '') + ' (opens in a new tab)');
      } else {
        modalCta.removeAttribute('aria-label');
      }
      modalCta.hidden = false;
    } else {
      modalCta.hidden = true;
      modalCta.removeAttribute('href');
    }

    modalImageScroll.scrollTop = 0;
    modalCopyScroll.scrollTop = 0;
    modal.showModal();
    document.documentElement.classList.add('project-modal-open');
    modalTitle.focus();
  }

  modalClose.addEventListener('click', function () {
    modal.close();
  });

  modal.addEventListener('click', function (event) {
    if (event.target === modal) modal.close();
  });

  modal.addEventListener('close', function () {
    document.documentElement.classList.remove('project-modal-open');
    lastModalTrigger?.focus();
  });

  modal.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(modal.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
      .filter(function (element) { return !element.hidden; });
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  modalCta.addEventListener('click', function () {
    modal.close();
  });

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
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('a, button:not([data-project-trigger])')) return;

    dragging = true;
    dragMoved = false;
    targetIndex = null;
    dragStartX = event.clientX;
    dragStartScroll = carousel.scrollLeft;
  });

  carousel.addEventListener('pointermove', function (event) {
    if (!dragging) return;

    const distance = event.clientX - dragStartX;
    if (!dragMoved && Math.abs(distance) > 6) {
      dragMoved = true;
      carousel.classList.add('is-dragging');
      carousel.setPointerCapture(event.pointerId);
    }
    if (!dragMoved) return;

    event.preventDefault();
    carousel.scrollLeft = dragStartScroll - distance;
  });

  function stopDragging(event) {
    if (!dragging) return;
    dragging = false;
    carousel.classList.remove('is-dragging');
    if (carousel.hasPointerCapture(event.pointerId)) carousel.releasePointerCapture(event.pointerId);
    if (dragMoved) {
      suppressOpen = true;
      window.setTimeout(function () { suppressOpen = false; }, 0);
    }
    requestRender();
  }

  carousel.addEventListener('pointerup', stopDragging);
  carousel.addEventListener('pointercancel', stopDragging);

  render();
}());
