(function () {
  const carousel = document.querySelector('[data-showcase-carousel]');
  if (!carousel) return;

  const section = carousel.closest('.showcase');
  /* Cards show in page order. Copies of the last few cards are added before
     the first one and copies of the first few after the last one, so the strip
     looks endless: scrolling past either end lands on a copy, and once the
     scroll settles the strip jumps silently to the matching real card. */
  const cards = Array.from(carousel.querySelectorAll('.project-card'));
  const currentText = section.querySelector('[data-showcase-current]');
  const totalText = section.querySelector('[data-showcase-total]');
  const liveText = section.querySelector('[data-showcase-live]');
  const previousButton = section.querySelector('[data-showcase-previous]');
  const nextButton = section.querySelector('[data-showcase-next]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const modal = document.querySelector('[data-project-modal]');
  const modalClose = modal?.querySelector('[data-project-modal-close]');
  const modalImage = modal?.querySelector('[data-project-modal-image]');
  const modalImageScroll = modal?.querySelector('.project-modal-image-scroll');
  const modalPreviewLabel = modal?.querySelector('[data-project-modal-preview-label]');
  const modalScrollHint = modal?.querySelector('[data-project-modal-scroll-hint]');
  const modalDevices = modal?.querySelector('[data-project-modal-devices]');
  const modalDeviceButtons = Array.from(modal?.querySelectorAll('[data-project-modal-device]') || []);
  const modalCopyScroll = modal?.querySelector('.project-modal-copy-scroll');
  const modalKicker = modal?.querySelector('[data-project-modal-kicker]');
  const modalTitle = modal?.querySelector('[data-project-modal-title]');
  const modalBadges = modal?.querySelector('[data-project-modal-badges]');
  const modalDescription = modal?.querySelector('[data-project-modal-description]');
  const modalNote = modal?.querySelector('[data-project-modal-note]');
  const modalDetails = modal?.querySelector('[data-project-modal-details]');
  const modalAwards = modal?.querySelector('[data-project-modal-awards]');
  const modalTech = modal?.querySelector('[data-project-modal-tech]');
  const modalCta = modal?.querySelector('[data-project-modal-cta]');
  const modalMore = modal?.querySelector('[data-project-modal-more]');

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
  let targetDisplayIndex = null;
  let touching = false;
  let lastModalTrigger = null;
  let modalImages = { desktop: '', mobile: '' };   /* screenshots of the open project */

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

  function makeCopy(card) {
    const copy = card.cloneNode(true);
    copy.classList.add('project-card--sentinel');
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('inert', '');
    copy.querySelectorAll('[id]').forEach(function (element) { element.removeAttribute('id'); });
    return copy;
  }

  /* How many copies sit at each end: enough to fill the peeking neighbours
     on a very wide screen while the strip scrolls onto a copy. */
  const COPIES = cards.length > 1 ? Math.min(3, cards.length) : 0;
  const beforeCopies = [];
  const afterCopies = [];
  for (let i = 0; i < COPIES; i += 1) {
    const before = makeCopy(cards[cards.length - COPIES + i]);
    const after = makeCopy(cards[i]);
    beforeCopies.push(before);
    afterCopies.push(after);
  }
  carousel.prepend(...beforeCopies);
  carousel.append(...afterCopies);
  /* Everything in the strip, in order; realIndexOf maps each to its project. */
  const displayCards = beforeCopies.concat(cards, afterCopies);
  const realIndexOf = new Map();
  displayCards.forEach(function (card, displayIndex) {
    realIndexOf.set(card, ((displayIndex - COPIES) % cards.length + cards.length) % cards.length);
  });

  function projectTitle(index) {
    return cards[index]?.querySelector('.project-title')?.textContent.trim() || 'Project';
  }

  function cloneChildren(target, source) {
    const children = source ? Array.from(source.children).map(function (child) {
      return child.cloneNode(true);
    }) : [];
    target.replaceChildren(...children);
    /* Copied images arrive still hidden by the loading skeleton (their
       originals sit on the hidden back of the card and never loaded), so
       watch each copy again and reveal it once it has loaded. */
    target.querySelectorAll('img.opacity-0').forEach(function (img) {
      window.portfolioSkeletons?.watch(img.parentElement, img);
    });
  }

  function openProject(card, trigger) {
    const image = card.querySelector('.project-shot img');
    const title = card.querySelector('.project-title')?.textContent.trim() || 'Project';
    const kicker = card.querySelector('.flip-back .kicker')?.textContent.trim() || 'Project details';
    const description = card.querySelector('.project-description')?.textContent.trim() || '';
    const isApp = card.dataset.showcaseKind === 'app';
    const fullImage = card.dataset.projectFullImage;
    const mobileImage = card.dataset.projectFullImageMobile;
    const hasFullPage = Boolean(fullImage);
    const previewKind = isApp ? 'app' : (hasFullPage ? 'website' : 'concept');
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
    modal.dataset.previewKind = previewKind;
    /* Every project opens in the desktop view; the Phone button shows only
       when the project has a phone screenshot too. */
    modalImages = { desktop: fullImage || image.currentSrc || image.src, mobile: mobileImage || '' };
    modal.dataset.previewDevice = 'desktop';
    modalDevices.hidden = !(hasFullPage && mobileImage);
    setDeviceButtons('desktop');
    modalImageScroll.scrollTop = 0;
    modalImage.hidden = true;
    modalImage.alt = isApp
      ? image.alt
      : (hasFullPage ? 'Full-page screenshot of ' + title : 'Project preview of ' + title);
    modalPreviewLabel.textContent = isApp
      ? 'App preview'
      : (hasFullPage ? 'Website preview' : 'Project preview');
    modalScrollHint.textContent = isApp
      ? 'Explore the app screens'
      : (hasFullPage ? 'Scroll to view the full page ↓' : 'Preview image');
    modalImageScroll.setAttribute(
      'aria-label',
      (hasFullPage ? 'Scrollable ' : '') + modalPreviewLabel.textContent.toLowerCase() + ' for ' + title
    );
    modalKicker.textContent = kicker;
    modalTitle.textContent = title;
    modalDescription.textContent = description;
    cloneChildren(modalBadges, badges);
    cloneChildren(modalTech, tech);

    const awards = card.querySelector('.project-awards');
    cloneChildren(modalAwards, awards);
    modalAwards.hidden = !awards;

    const details = card.querySelector('.project-details');
    cloneChildren(modalDetails, details);
    modalDetails.hidden = !details;

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

    /* Every other link on the card (GitHub, extra pages) sits next to the
       main button, so nothing on the card is out of reach. */
    const moreLinks = links.filter(function (link) { return link !== primaryLink; }).map(function (link) {
      const extra = document.createElement('a');
      extra.className = 'btn secondary-btn project-modal-link';
      extra.href = link.getAttribute('href');
      extra.textContent = link.textContent.trim();
      if (link.target === '_blank') {
        extra.target = '_blank';
        extra.rel = 'noopener';
        extra.textContent += ' ↗';
        extra.setAttribute('aria-label', link.textContent.trim() + ' (opens in a new tab)');
      }
      extra.addEventListener('click', function () { modal.close(); });
      return extra;
    });
    modalMore.replaceChildren(...moreLinks);
    modalMore.hidden = moreLinks.length === 0;

    modalCopyScroll.scrollTop = 0;
    modal.showModal();
    document.documentElement.classList.add('project-modal-open');
    modalTitle.focus();

    function revealImage() {
      modalImage.hidden = false;
      modalImageScroll.scrollTop = 0;
    }

    modalImage.onload = revealImage;
    modalImage.onerror = revealImage;
    modalImage.src = modalImages.desktop;
    window.portfolioSkeletons?.watch(modalImageScroll, modalImage);
    if (modalImage.complete && modalImage.naturalWidth) requestAnimationFrame(revealImage);
  }

  function setDeviceButtons(device) {
    modalDeviceButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.projectModalDevice === device));
    });
  }

  /* Desktop / Phone switch: swaps the screenshot and scrolls back to the top */
  modalDeviceButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const device = button.dataset.projectModalDevice;
      if (modal.dataset.previewDevice === device || !modalImages[device]) return;
      modal.dataset.previewDevice = device;
      setDeviceButtons(device);
      const title = modalTitle.textContent;
      modalImage.alt = (device === 'mobile' ? 'Full-page phone screenshot of ' : 'Full-page screenshot of ') + title;
      modalImage.hidden = true;
      modalImage.src = modalImages[device];
      window.portfolioSkeletons?.watch(modalImageScroll, modalImage);
      if (modalImage.complete && modalImage.naturalWidth) {
        modalImage.hidden = false;
        modalImageScroll.scrollTop = 0;
      }
    });
  });

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

  /* Pictures load lazily as cards scroll into view. The card in the middle,
     its two neighbours and all their copies are loaded right away instead, so
     the real card already shows its picture when the strip jumps onto it. */
  const loadedIndexes = new Set();
  function loadPicturesAround(index) {
    [-1, 0, 1].forEach(function (offset) {
      const realIndex = ((index + offset) % cards.length + cards.length) % cards.length;
      if (loadedIndexes.has(realIndex)) return;
      loadedIndexes.add(realIndex);
      displayCards.forEach(function (card) {
        if (realIndexOf.get(card) !== realIndex) return;
        card.querySelectorAll('.project-shot img[loading="lazy"]').forEach(function (image) { image.loading = 'eager'; });
      });
    });
  }

  function updateControls() {
    currentText.textContent = String(activeIndex + 1).padStart(2, '0');
    totalText.textContent = String(cards.length).padStart(2, '0');
    /* A project and its copies are highlighted together, so the real card
       already looks exactly like the copy when the strip jumps between them. */
    displayCards.forEach(function (card) {
      if (realIndexOf.get(card) === activeIndex) card.dataset.active = 'true';
      else delete card.dataset.active;
    });
    loadPicturesAround(activeIndex);
  }

  let closestDisplayIndex = COPIES;

  function render() {
    animationFrame = 0;

    const carouselRect = carousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    let closestDistance = Infinity;

    displayCards.forEach(function (card, displayIndex) {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - carouselCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestDisplayIndex = displayIndex;
      }
    });

    activeIndex = realIndexOf.get(displayCards[closestDisplayIndex]);
    if (targetDisplayIndex === closestDisplayIndex) {
      targetIndex = null;
      targetDisplayIndex = null;
    }
    updateControls();
  }

  function requestRender() {
    if (!animationFrame) animationFrame = requestAnimationFrame(render);
  }

  function announce(index) {
    liveText.textContent = projectTitle(index) + ', slide ' + (index + 1) + ' of ' + cards.length;
    lastAnnouncedIndex = index;
  }

  function scrollLeftFor(card) {
    const carouselRect = carousel.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const cardCenter = carousel.scrollLeft + cardRect.left - carouselRect.left + cardRect.width / 2;
    return cardCenter - carousel.clientWidth / 2;
  }

  /* Moves the strip without any animation or snapping. With keepFree the
     snapping stays off afterwards (used mid-scroll) until the strip settles. */
  function jumpTo(left, keepFree) {
    carousel.classList.add('is-jumping');
    carousel.scrollLeft = left;
    void carousel.offsetWidth;
    if (!keepFree) carousel.classList.remove('is-jumping');
  }

  /* Width of one full set of cards: the distance between a card and its copy. */
  function setWidth() {
    return scrollLeftFor(afterCopies[0]) - scrollLeftFor(cards[0]);
  }

  /* Shifts the strip by one full set of cards (sets = +1 or -1), keeping the
     same position within the card. The card now in the middle looks exactly
     like the one before, and so do its neighbours, so nothing on screen
     changes; only the bookkeeping moves. */
  function shiftSets(sets, keepFree) {
    const distance = sets * setWidth();
    jumpTo(carousel.scrollLeft + distance, keepFree);
    if (dragging) dragStartScroll += distance;
    closestDisplayIndex += sets * cards.length;
    if (targetDisplayIndex !== null) targetDisplayIndex += sets * cards.length;
  }

  /* Direction to shift so this position lands on a real card: 0 if it already is one. */
  function setsToReal(displayIndex) {
    if (displayIndex < COPIES) return 1;
    if (displayIndex >= COPIES + cards.length) return -1;
    return 0;
  }

  /* Once the strip is at rest: if it sits on a copy, swap to the real card. */
  function settleOntoRealCard() {
    render();
    const sets = setsToReal(closestDisplayIndex);
    if (sets) shiftSets(sets);
    if (!carousel.classList.contains('is-jumping')) return;
    /* Snapping was left off during a mid-scroll shift; turn it back on, after
       a last glide to the nearest card if the strip stopped between two. */
    const left = scrollLeftFor(displayCards[closestDisplayIndex]);
    if (Math.abs(carousel.scrollLeft - left) > 1) carousel.scrollTo({ left: left, behavior: 'smooth' });
    else carousel.classList.remove('is-jumping');
  }

  function goToDisplay(displayIndex, shouldAnnounce, behavior) {
    const card = displayCards[displayIndex];
    if (!card) return;
    const nextIndex = realIndexOf.get(card);

    targetIndex = nextIndex;
    targetDisplayIndex = displayIndex;
    activeIndex = nextIndex;
    updateControls();
    const shouldJump = behavior === 'auto' || reducedMotion.matches;
    if (shouldJump) jumpTo(scrollLeftFor(card));
    else carousel.scrollTo({ left: scrollLeftFor(card), behavior: 'smooth' });

    if (shouldAnnounce) announce(nextIndex);
    requestRender();
  }

  /* Goes to a project by number, using whichever copy is nearest. */
  function goTo(index, shouldAnnounce, behavior) {
    const nextIndex = (index % cards.length + cards.length) % cards.length;
    const from = targetDisplayIndex ?? closestDisplayIndex;
    let best = COPIES + nextIndex;
    displayCards.forEach(function (card, displayIndex) {
      if (realIndexOf.get(card) === nextIndex && Math.abs(displayIndex - from) < Math.abs(best - from)) best = displayIndex;
    });
    goToDisplay(best, shouldAnnounce, behavior);
  }

  /* Moves one card left or right. Heading for a copy (quick repeated
     presses), the strip first swaps to the real card, invisibly, so there is
     always a next card. */
  function step(delta, shouldAnnounce) {
    const sets = setsToReal(targetDisplayIndex ?? closestDisplayIndex);
    if (sets) shiftSets(sets, true);
    goToDisplay((targetDisplayIndex ?? closestDisplayIndex) + delta, shouldAnnounce);
  }

  function onScrollSettled() {
    if (touching || dragging) return;   /* a finger is still on the strip; wait for it to lift */
    settleOntoRealCard();
    if (activeIndex !== lastAnnouncedIndex) announce(activeIndex);
  }

  carousel.addEventListener('scroll', function () {
    requestRender();
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(onScrollSettled, 180);
  }, { passive: true });

  carousel.addEventListener('touchstart', function () { touching = true; }, { passive: true });
  function onTouchEnd() {
    touching = false;
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(onScrollSettled, 180);
  }
  carousel.addEventListener('touchend', onTouchEnd, { passive: true });
  carousel.addEventListener('touchcancel', onTouchEnd, { passive: true });
  window.addEventListener('resize', requestRender);
  window.addEventListener('load', requestRender);

  carousel.addEventListener('keydown', function (event) {
    if (event.target !== carousel) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    step(event.key === 'ArrowRight' ? 1 : -1, true);
  });

  previousButton?.addEventListener('click', function () {
    step(-1, true);
  });

  nextButton?.addEventListener('click', function () {
    step(1, true);
  });

  carousel.addEventListener('pointerdown', function (event) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('a, button:not([data-project-trigger])')) return;

    dragging = true;
    dragMoved = false;
    targetIndex = null;
    targetDisplayIndex = null;
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
    render();
    const sets = setsToReal(closestDisplayIndex);
    if (sets) shiftSets(sets);
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
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(onScrollSettled, 180);
  }

  carousel.addEventListener('pointerup', stopDragging);
  carousel.addEventListener('pointercancel', stopDragging);

  /* Start on the first real card, before the strip is first painted, and
     again once everything is laid out. */
  goToDisplay(COPIES, false, 'auto');
  requestAnimationFrame(function () {
    goToDisplay(COPIES, false, 'auto');
    render();
  });

  /* Lets other parts of the page (the skills panel) list the projects and
     open one. `returnTo` gets focus back when the pop-up closes. */
  window.portfolioProjects = {
    list: function () {
      return cards.map(function (card) {
        const image = card.querySelector('.project-shot img');
        return {
          title: card.querySelector('.project-title')?.textContent.trim() || 'Project',
          image: image ? image.getAttribute('src') : '',
          tags: Array.from(card.querySelectorAll('.tech-tag')).map(function (tag) {
            return tag.textContent.trim();
          }),
          hasGitHub: Array.from(card.querySelectorAll('.project-links a')).some(function (link) {
            return /github/i.test(link.textContent);
          })
        };
      });
    },
    open: function (title, returnTo) {
      const index = cards.findIndex(function (card) {
        return card.querySelector('.project-title')?.textContent.trim() === title;
      });
      if (index < 0) return;
      goTo(index, false);
      const card = cards[index];
      openProject(card, returnTo || card.querySelector('[data-project-trigger]'));
    }
  };
}());
