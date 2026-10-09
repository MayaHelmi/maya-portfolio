(function () {
  document.querySelectorAll('.certificate-track').forEach(function (track) {
    const sectionTitle = track.closest('.section')?.querySelector('.section-title')?.textContent.trim();
    track.tabIndex = 0;
    track.setAttribute('aria-label', (sectionTitle || 'Certificates') + ' horizontal gallery');

    track.querySelectorAll('.flip-card--cert').forEach(function (card) {
      card.removeAttribute('tabindex');
    });

    let pointerDown = false;
    let pointerStart = 0;
    let scrollStart = 0;

    track.addEventListener('pointerdown', function (event) {
      if (event.target.closest('a')) return;
      pointerDown = true;
      pointerStart = event.clientX;
      scrollStart = track.scrollLeft;
      track.setPointerCapture(event.pointerId);
    });

    track.addEventListener('pointermove', function (event) {
      if (!pointerDown) return;
      track.scrollLeft = scrollStart - (event.clientX - pointerStart);
    });

    function stopDragging() {
      pointerDown = false;
    }

    track.addEventListener('pointerup', stopDragging);
    track.addEventListener('pointercancel', stopDragging);

    track.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      track.scrollBy({ left: direction * Math.min(track.clientWidth * .75, 340), behavior: 'smooth' });
    });
  });
}());
