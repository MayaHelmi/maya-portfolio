(function () {
  const carousel = document.querySelector('[data-showcase-carousel]');
  if (!carousel) return;

  const section = carousel.closest('.showcase');
  /* Lead with the final project, then continue through the full collection.
     The two sentinels added below make either end wrap without a visual gap. */
  const sourceCards = Array.from(carousel.querySelectorAll('.project-card'));
  const leadCard = sourceCards.pop();
  const cards = leadCard ? [leadCard].concat(sourceCards) : sourceCards;
  if (leadCard) carousel.prepend(leadCard);
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
  let lastModalTrigger = null;

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

  function makeSentinel(card) {
    const clone = card.cloneNode(true);
    clone.classList.add('project-card--sentinel');
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('inert', '');
    clone.querySelectorAll('[id]').forEach(function (element) { element.removeAttribute('id'); });
    return clone;
  }

  const beforeSentinel = makeSentinel(cards[cards.length - 1]);
  const afterSentinel = makeSentinel(cards[0]);
  carousel.prepend(beforeSentinel);
  carousel.append(afterSentinel);
  const displayCards = [beforeSentinel].concat(cards, afterSentinel);

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
    const isApp = card.dataset.showcaseKind === 'app';
    const fullImage = card.dataset.projectFullImage;
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
    modalImage.src = fullImage || image.currentSrc || image.src;
    window.portfolioSkeletons?.watch(modalImageScroll, modalImage);
    if (modalImage.complete && modalImage.naturalWidth) requestAnimationFrame(revealImage);
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
    cards.forEach(function (card, index) {
      if (index === activeIndex) card.dataset.active = 'true';
      else delete card.dataset.active;
    });
  }

  function realIndexFor(card) {
    if (card === beforeSentinel) return cards.length - 1;
    if (card === afterSentinel) return 0;
    return cards.indexOf(card);
  }

  let closestDisplayCard = cards[0];

  function render() {
    animationFrame = 0;

    const carouselRect = carousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    let closestIndex = 0;
    let closestDistance = Infinity;

    displayCards.forEach(function (card) {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = cardCenter - carouselCenter;

      if (Math.abs(distance) < closestDistance) {
        closestDistance = Math.abs(distance);
        closestIndex = realIndexFor(card);
        closestDisplayCard = card;
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

  function goTo(index, shouldAnnounce, behavior) {
    const nextIndex = (index % cards.length + cards.length) % cards.length;
    const card = index < 0
      ? beforeSentinel
      : (index >= cards.length ? afterSentinel : cards[nextIndex]);
    const carouselRect = carousel.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const cardCenter = carousel.scrollLeft + cardRect.left - carouselRect.left + cardRect.width / 2;
    const targetLeft = cardCenter - carousel.clientWidth / 2;

    targetIndex = nextIndex;
    activeIndex = nextIndex;
    updateControls();
    const shouldJump = behavior === 'auto' || reducedMotion.matches;
    if (shouldJump) {
      carousel.classList.add('is-jumping');
      carousel.scrollLeft = targetLeft;
      void carousel.offsetWidth;
      carousel.classList.remove('is-jumping');
    } else {
      carousel.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }

    if (shouldAnnounce) announce(nextIndex);
    requestRender();
  }

  carousel.addEventListener('scroll', function () {
    requestRender();
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(function () {
      render();
      if (closestDisplayCard === beforeSentinel) {
        goTo(cards.length - 1, false, 'auto');
      } else if (closestDisplayCard === afterSentinel) {
        goTo(0, false, 'auto');
      }
      if (activeIndex !== lastAnnouncedIndex) announce(activeIndex);
    }, 180);
  }, { passive: true });
  window.addEventListener('resize', requestRender);
  window.addEventListener('load', requestRender);

  carousel.addEventListener('keydown', function (event) {
    if (event.target !== carousel) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    goTo((targetIndex ?? activeIndex) + (event.key === 'ArrowRight' ? 1 : -1), true);
  });

  previousButton?.addEventListener('click', function () {
    goTo((targetIndex ?? activeIndex) - 1, true);
  });

  nextButton?.addEventListener('click', function () {
    goTo((targetIndex ?? activeIndex) + 1, true);
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

  requestAnimationFrame(function () {
    goTo(0, false, 'auto');
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
