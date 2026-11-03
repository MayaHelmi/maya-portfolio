/* ==========================================================================
   Skills: floating bubbles + "where I used it"

   1. Bubbles. Every skill becomes a round bubble that drifts around the
      section and bounces off the walls and off the other bubbles, like
      ping-pong balls. A bubble holds still under the pointer, and with a
      mouse it can be grabbed and thrown. Category tabs above the bubbles
      separate the skill groups without colour-coding the circles.

   2. Evidence. Each skill that appears in a project carries a small
      count. Selecting it:
        - freezes the bubbles and lights up the skills used alongside it, and
        - opens a small panel listing those projects, with thumbnails.
      Choosing a project in the panel opens that project's pop-up.

   Without JavaScript the original grouped grid stays as it is. The list of
   projects is read from the project cards' tech tags, so adding a tag to a
   card updates the counts automatically.
   ========================================================================== */

(function () {
  const section = document.querySelector("#skills");
  const board = section && section.querySelector("[data-skills-board]");
  const panel = section && section.querySelector("[data-skill-panel]");
  const motionToggle = section && section.querySelector("[data-skills-motion]");
  const motionLabel = motionToggle && motionToggle.querySelector("[data-skills-motion-label]");
  if (!section || !board || !panel) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---- Which skill was used where ---- */

  const projects = window.portfolioProjects ? window.portfolioProjects.list() : [];

  function skillName(item) {
    /* A <br> inside a label counts as a space ("Supabase (PostgreSQL)"). */
    const label = item.querySelector("span").cloneNode(true);
    label.querySelectorAll("br").forEach(function (br) { br.replaceWith(" "); });
    return label.textContent.replace(/\s+/g, " ").trim();
  }

  function usesOf(item, name) {
    const aliases = (item.dataset.projectTags || "").split("|").filter(Boolean);
    const tags = [name].concat(aliases);
    const found = projects.filter(function (project) {
      if (name === "Git" || name === "GitHub") return project.hasGitHub;
      return project.tags.some(function (tag) { return tags.includes(tag); });
    });
    return { projects: found };
  }

  /* ---- Build the bubbles ---- */

  const groupCards = Array.from(board.querySelectorAll(".skill-card"));
  const grid = groupCards.length ? groupCards[0].parentElement : null;
  if (!grid) return;

  const arena = document.createElement("ul");
  arena.className = "skill-arena";
  arena.id = "skills-category-panel";
  arena.setAttribute("role", "tabpanel");
  arena.setAttribute("aria-label", "Skills in the selected category");

  const guides = document.createElement("div");
  guides.className = "skill-guides";
  guides.setAttribute("aria-hidden", "true");
  groupCards.forEach(function (_, groupIndex) {
    const guide = document.createElement("span");
    guide.className = "skill-guide";
    guide.dataset.group = groupIndex;
    guide.style.setProperty("--guide-position", ((groupIndex + .5) / groupCards.length * 100) + "%");
    guides.appendChild(guide);
  });

  const legend = document.createElement("ul");
  legend.className = "skill-legend";
  legend.setAttribute("role", "tablist");
  legend.setAttribute("aria-label", "Skill categories");

  const chips = [];       /* skills with evidence (clickable) */
  const balls = [];       /* every bubble, for the physics */
  const seen = new Set();

  groupCards.forEach(function (card, groupIndex) {
    const groupName = card.querySelector(".skill-group").textContent.trim();

    const key = document.createElement("li");
    key.innerHTML = '<button type="button" class="skill-legend-item" data-group="' + groupIndex + '">' +
      groupName + "</button>";
    const tab = key.querySelector("button");
    tab.id = "skill-category-" + groupIndex;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", "false");
    tab.setAttribute("aria-controls", arena.id);
    tab.tabIndex = -1;
    legend.appendChild(key);

    card.querySelectorAll(".skill-grid li").forEach(function (item) {
      const name = skillName(item);
      const groupSkill = groupIndex + "::" + name;
      if (seen.has(groupSkill)) return;
      seen.add(groupSkill);

      const ball = document.createElement("li");
      ball.className = "skill-ball";
      ball.dataset.group = groupIndex;

      const uses = usesOf(item, name);
      const count = uses.projects.length;
      const face = document.createElement(count ? "button" : "div");
      face.className = "skill-ball-face";
      while (item.firstChild) face.appendChild(item.firstChild);
      face.querySelectorAll("br").forEach(function (br) { br.replaceWith(" "); });
      face.querySelectorAll("img").forEach(function (image) { image.draggable = false; });

      if (count) {
        face.type = "button";
        face.classList.add("skill-chip");
        face.setAttribute("aria-expanded", "false");
        face.setAttribute("aria-controls", panel.id);
        face.setAttribute("aria-label", name + ": used in " + count + (count === 1 ? " project" : " projects"));
        const badge = document.createElement("span");
        badge.className = "skill-count";
        badge.setAttribute("aria-hidden", "true");
        badge.textContent = count;
        face.appendChild(badge);
        chips.push({ button: face, item: ball, name: name, uses: uses });
      }

      ball.appendChild(face);
      ball.style.setProperty("--item", balls.length);
      arena.appendChild(ball);
      balls.push({ el: ball, face: face, x: 0, y: 0, vx: 0, vy: 0, r: 0, held: false });
    });
  });

  const categoryPicker = document.createElement("div");
  categoryPicker.className = "skills-category-select";

  const categoryLabel = document.createElement("label");
  categoryLabel.htmlFor = "skills-category-select";
  categoryLabel.textContent = "Choose a category";

  const categorySelect = document.createElement("select");
  categorySelect.id = "skills-category-select";
  categorySelect.setAttribute("aria-controls", arena.id);
  legend.querySelectorAll(".skill-legend-item").forEach(function (tab) {
    const option = document.createElement("option");
    option.value = tab.dataset.group;
    option.textContent = tab.textContent.trim();
    categorySelect.appendChild(option);
  });
  categoryPicker.append(categoryLabel, categorySelect);

  arena.prepend(guides);
  grid.replaceWith(categoryPicker, legend);
  legend.after(arena);
  board.classList.add("is-arena");
  if (motionToggle && !reducedMotion.matches) motionToggle.hidden = false;

  /* ---- Entrance: the bubbles pop in one after another ---- */

  if (!reducedMotion.matches && "IntersectionObserver" in window &&
      section.getBoundingClientRect().top > window.innerHeight * 0.85) {
    section.classList.add("skills-waiting");
    const observer = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      observer.disconnect();
      section.classList.add("skills-revealed");
      section.classList.remove("skills-waiting");
      window.setTimeout(function () { section.classList.remove("skills-revealed"); }, 2000);
    }, { threshold: 0.2 });
    observer.observe(arena);
  }

  /* ---- Physics ---- */

  const CRUISE = 46;          /* drifting speed, px per second */
  let width = 0;
  let height = 0;
  let frame = 0;
  let lastTime = 0;
  let inView = true;
  let userPaused = false;
  let active = null;          /* the skill whose panel is open */
  let dragging = null;

  function keepInside(ball) {
    ball.x = Math.min(Math.max(ball.x, ball.r), width - ball.r);
    ball.y = Math.min(Math.max(ball.y, ball.r), height - ball.r);
  }

  function measure() {
    const oldWidth = width;
    const oldHeight = height;
    width = arena.clientWidth;
    height = arena.clientHeight;
    balls.forEach(function (ball) {
      ball.r = ball.el.offsetWidth / 2;
      if (oldWidth && oldHeight) {
        ball.x = ball.x / oldWidth * width;
        ball.y = ball.y / oldHeight * height;
      }
      keepInside(ball);
    });
  }

  /* Start spread out on a loose grid with a little jitter, so nothing
     overlaps, each heading its own way. */
  function scatter() {
    const columns = Math.max(1, Math.floor(width / (balls[0].r * 2.5)));
    const rows = Math.ceil(balls.length / columns);
    const cellW = width / columns;
    const cellH = height / rows;
    balls.forEach(function (ball, index) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const slackX = Math.max(0, cellW / 2 - ball.r);
      const slackY = Math.max(0, cellH / 2 - ball.r);
      ball.x = cellW * (column + .5) + (Math.random() * 2 - 1) * slackX * .6;
      ball.y = cellH * (row + .5) + (Math.random() * 2 - 1) * slackY * .6;
      const angle = Math.random() * Math.PI * 2;
      ball.vx = Math.cos(angle) * CRUISE;
      ball.vy = Math.sin(angle) * CRUISE;
      keepInside(ball);
    });
  }

  function draw() {
    balls.forEach(function (ball) {
      ball.el.style.transform = "translate3d(" + (ball.x - ball.r) + "px, " + (ball.y - ball.r) + "px, 0)";
    });
  }

  /* Pausing gathers each category onto its own guide. Wide screens use
     horizontal rows; narrow screens use vertical columns so every bubble
     remains readable without overlapping. */
  function organize() {
    measure();
    const groups = Array.from(new Set(balls.map(function (ball) { return ball.el.dataset.group; })));
    const vertical = width < 600;

    groups.forEach(function (group, groupIndex) {
      const members = balls.filter(function (ball) { return ball.el.dataset.group === group; });
      const maxRadius = members.reduce(function (largest, ball) { return Math.max(largest, ball.r); }, 0);
      const span = vertical ? height : width;
      const usable = Math.max(0, span - maxRadius * 2);

      members.forEach(function (ball, memberIndex) {
        const progress = members.length === 1 ? .5 : memberIndex / (members.length - 1);
        if (vertical) {
          ball.x = width * (groupIndex + .5) / groups.length;
          ball.y = maxRadius + usable * progress;
        } else {
          ball.x = maxRadius + usable * progress;
          ball.y = height * (groupIndex + .5) / groups.length;
        }
        keepInside(ball);
      });
    });

    draw();
  }

  function frozen() {
    return reducedMotion.matches || userPaused || !inView || document.hidden || active !== null;
  }

  function step(now) {
    frame = 0;
    if (frozen() && !dragging) { lastTime = 0; return; }
    const seconds = lastTime ? Math.min(now - lastTime, 50) / 1000 : 0;
    lastTime = now;
    const activeBalls = balls.filter(function (ball) { return ball.el.classList.contains("in-group"); });

    activeBalls.forEach(function (ball) {
      if (ball.held) return;

      /* A thrown bubble eases back down to a gentle drift. */
      const speed = Math.hypot(ball.vx, ball.vy) || 1;
      const target = speed + (CRUISE - speed) * Math.min(1, seconds * 1.6);
      ball.vx *= target / speed;
      ball.vy *= target / speed;

      ball.x += ball.vx * seconds;
      ball.y += ball.vy * seconds;

      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x > width - ball.r) { ball.x = width - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
      if (ball.y > height - ball.r) { ball.y = height - ball.r; ball.vy = -Math.abs(ball.vy); }
    });

    /* Bubbles bounce off each other; a held bubble acts like a wall. */
    for (let i = 0; i < activeBalls.length; i += 1) {
      for (let j = i + 1; j < activeBalls.length; j += 1) {
        const a = activeBalls[i];
        const b = activeBalls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 0.01;
        const overlap = a.r + b.r - distance;
        if (overlap <= 0 || (a.held && b.held)) continue;

        const nx = dx / distance;
        const ny = dy / distance;

        if (a.held || b.held) {
          const moving = a.held ? b : a;
          const sign = a.held ? 1 : -1;      /* direction pointing away from the held one */
          moving.x += nx * overlap * sign;
          moving.y += ny * overlap * sign;
          const along = (moving.vx * nx + moving.vy * ny) * sign;
          if (along < 0) {
            moving.vx -= 2 * along * nx * sign;
            moving.vy -= 2 * along * ny * sign;
          }
          continue;
        }

        a.x -= nx * overlap / 2;
        a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2;
        b.y += ny * overlap / 2;

        const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (closing > 0) {
          a.vx -= closing * nx;
          a.vy -= closing * ny;
          b.vx += closing * nx;
          b.vy += closing * ny;
        }
      }
    }

    activeBalls.forEach(keepInside);
    draw();
    frame = window.requestAnimationFrame(step);
  }

  function refresh() {
    if ((!frozen() || dragging) && !frame) {
      lastTime = 0;
      frame = window.requestAnimationFrame(step);
    }
  }

  function syncMotionToggle() {
    if (!motionToggle) return;
    motionToggle.hidden = reducedMotion.matches;
    motionToggle.setAttribute("aria-pressed", String(userPaused));
    motionToggle.setAttribute("aria-label", userPaused ? "Resume skills animation" : "Pause skills animation");
    if (motionLabel) motionLabel.textContent = userPaused ? "Resume animation" : "Pause animation";
  }

  if (motionToggle) {
    let releaseTimer = 0;
    motionToggle.addEventListener("click", function () {
      userPaused = !userPaused;
      window.clearTimeout(releaseTimer);

      if (userPaused) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
        arena.classList.remove("is-releasing");
        arena.classList.add("is-organized");
        void arena.offsetWidth;
        organize();
      } else {
        arena.classList.add("is-releasing");
        arena.classList.remove("is-organized");
        releaseTimer = window.setTimeout(function () {
          arena.classList.remove("is-releasing");
        }, 700);
      }
      syncMotionToggle();
      refresh();
    });
  }

  function nudge(ball) {
    if (Math.hypot(ball.vx, ball.vy) > 1) return;
    const angle = Math.random() * Math.PI * 2;
    ball.vx = Math.cos(angle) * CRUISE;
    ball.vy = Math.sin(angle) * CRUISE;
  }

  /* A bubble holds still under the pointer or keyboard focus, so it is easy
     to click; the others keep bouncing off it. */
  balls.forEach(function (ball) {
    ball.el.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "mouse") ball.held = true;
    });
    ball.el.addEventListener("pointerleave", function (event) {
      if (event.pointerType !== "mouse" || dragging === ball) return;
      ball.held = false;
      nudge(ball);
    });
    ball.face.addEventListener("focus", function () { ball.held = true; });
    ball.face.addEventListener("blur", function () { ball.held = false; nudge(ball); });
  });

  /* Grab and throw with a mouse or pen. On touch screens a drag keeps
     scrolling the page, and a tap simply selects the bubble. */
  let grabX = 0;
  let grabY = 0;
  let moved = false;
  let trail = [];

  arena.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "touch" || event.button !== 0 || reducedMotion.matches || active) return;
    const element = event.target.closest(".skill-ball");
    if (!element) return;
    const ball = balls.find(function (candidate) { return candidate.el === element; });
    const box = arena.getBoundingClientRect();
    dragging = ball;
    moved = false;
    grabX = event.clientX - box.left - ball.x;
    grabY = event.clientY - box.top - ball.y;
    trail = [{ x: ball.x, y: ball.y, t: performance.now() }];
    ball.held = true;
    refresh();
  });

  arena.addEventListener("pointermove", function (event) {
    if (!dragging) return;
    const box = arena.getBoundingClientRect();
    const x = event.clientX - box.left - grabX;
    const y = event.clientY - box.top - grabY;
    if (!moved && Math.hypot(x - dragging.x, y - dragging.y) > 5) {
      moved = true;
      dragging.el.classList.add("is-grabbed");
      /* Capture only once it is really a drag: capturing on press would
         send the click to the bubble's wrapper instead of its button. */
      dragging.el.setPointerCapture(event.pointerId);
    }
    if (!moved) return;
    dragging.x = x;
    dragging.y = y;
    keepInside(dragging);
    const now = performance.now();
    trail.push({ x: dragging.x, y: dragging.y, t: now });
    trail = trail.filter(function (point) { return now - point.t < 90; });
  });

  function release(event) {
    if (!dragging) return;
    const ball = dragging;
    dragging = null;
    ball.el.classList.remove("is-grabbed");
    if (ball.el.hasPointerCapture(event.pointerId)) ball.el.releasePointerCapture(event.pointerId);
    if (moved && trail.length > 1) {
      const first = trail[0];
      const last = trail[trail.length - 1];
      const seconds = Math.max((last.t - first.t) / 1000, 0.016);
      const limit = 900;
      ball.vx = Math.max(-limit, Math.min(limit, (last.x - first.x) / seconds));
      ball.vy = Math.max(-limit, Math.min(limit, (last.y - first.y) / seconds));
      ball.held = false;
      nudge(ball);
    }
    refresh();
  }
  arena.addEventListener("pointerup", release);
  arena.addEventListener("pointercancel", release);

  /* A throw is not a click. */
  arena.addEventListener("click", function (event) {
    if (!moved) return;
    event.preventDefault();
    event.stopPropagation();
    moved = false;
  }, true);

  /* The key doubles as a compact tab bar. Selecting a category keeps only
     that category visible; hovering previews another one. */
  let selectedGroup = "0";

  function showGroup(index) {
    arena.classList.toggle("has-group", index !== null);
    balls.forEach(function (ball) {
      const inGroup = index !== null && ball.el.dataset.group === String(index);
      ball.el.classList.toggle("in-group", inGroup);
      ball.el.setAttribute("aria-hidden", String(!inGroup));
      if (ball.face.matches("button")) ball.face.tabIndex = inGroup ? 0 : -1;
    });
  }

  function selectGroup(index, moveFocus) {
    const tabs = Array.from(legend.querySelectorAll(".skill-legend-item"));
    const next = tabs[Math.max(0, Math.min(tabs.length - 1, Number(index)))];
    if (!next) return;

    if (active) close(false);
    selectedGroup = next.dataset.group;
    tabs.forEach(function (tab) {
      const selected = tab === next;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    categorySelect.value = selectedGroup;
    arena.setAttribute("aria-labelledby", next.id);
    showGroup(selectedGroup);
    if (moveFocus) next.focus();
  }

  legend.addEventListener("pointerover", function (event) {
    const item = event.target.closest(".skill-legend-item");
    if (item && !active) showGroup(item.dataset.group);
  });
  legend.addEventListener("pointerout", function (event) {
    if (!event.relatedTarget || !legend.contains(event.relatedTarget)) showGroup(selectedGroup);
  });
  legend.addEventListener("focusin", function (event) {
    const item = event.target.closest(".skill-legend-item");
    if (item && !active) showGroup(item.dataset.group);
  });
  legend.addEventListener("focusout", function () { showGroup(selectedGroup); });
  legend.addEventListener("click", function (event) {
    const item = event.target.closest(".skill-legend-item");
    if (item) selectGroup(item.dataset.group, false);
  });
  legend.addEventListener("keydown", function (event) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = Array.from(legend.querySelectorAll(".skill-legend-item"));
    const current = tabs.indexOf(event.target.closest(".skill-legend-item"));
    if (current < 0) return;
    event.preventDefault();
    let next = current;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else next = (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    selectGroup(next, true);
  });
  categorySelect.addEventListener("change", function () {
    selectGroup(categorySelect.value, false);
  });

  selectGroup(0, false);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      refresh();
    }).observe(arena);
  }
  document.addEventListener("visibilitychange", refresh);

  /* With reduced motion, the bubbles sit still in tidy rows instead. */
  let scattered = false;
  function layOut() {
    measure();
    if (reducedMotion.matches) {
      arena.classList.remove("is-organized", "is-releasing");
      arena.classList.add("is-still");
      balls.forEach(function (ball) { ball.el.style.transform = ""; });
      return;
    }
    arena.classList.remove("is-still");
    measure();
    if (!scattered) { scatter(); scattered = true; }
    draw();
  }
  reducedMotion.addEventListener("change", function () { layOut(); syncMotionToggle(); refresh(); });

  layOut();
  syncMotionToggle();
  refresh();

  let resizeTimer = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (reducedMotion.matches) return;
      measure();
      if (userPaused) organize(); else draw();
      if (active) place(active);
    }, 100);
  });

  /* ---- The "used in" panel ---- */

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function iconOf(chip) {
    const image = chip.button.querySelector("img");
    return image ? image.getAttribute("src") : "";
  }

  function buildPanel(chip) {
    const count = chip.uses.projects.length;
    const rows = chip.uses.projects.map(function (project) {
      return '<li><button class="skill-use" type="button" data-skill-project="' + escapeHtml(project.title) + '">' +
        '<img class="skill-use-thumb" src="' + escapeHtml(project.image) + '" alt="" loading="lazy">' +
        '<span class="skill-use-text"><strong>' + escapeHtml(project.title) + '</strong></span>' +
        '<span class="skill-use-go" aria-hidden="true">&rarr;</span></button></li>';
    });

    panel.innerHTML =
      '<span class="skill-panel-nub" aria-hidden="true"></span>' +
      '<div class="skill-panel-head">' +
        '<img src="' + escapeHtml(iconOf(chip)) + '" alt="" width="32" height="32">' +
        '<h3 class="skill-panel-title" id="skill-panel-title">' + escapeHtml(chip.name) + '</h3>' +
        '<button class="skill-panel-close" type="button" aria-label="Close">&times;</button>' +
      '</div>' +
      '<p class="skill-panel-kicker">Used in ' + count + (count === 1 ? ' project' : ' projects') + '</p>' +
      '<ul class="skill-panel-list">' + rows.join("") + '</ul>';
  }

  /* Skills that share at least one project with the selected one. */
  function linkedTo(chip) {
    const titles = new Set(chip.uses.projects.map(function (project) { return project.title; }));
    return chips.filter(function (other) {
      if (other === chip) return true;
      return other.uses.projects.some(function (project) { return titles.has(project.title); });
    });
  }

  function place(chip) {
    const boardBox = board.getBoundingClientRect();
    const chipBox = chip.button.getBoundingClientRect();
    const panelWidth = Math.min(360, boardBox.width);
    const chipCentre = chipBox.left + chipBox.width / 2 - boardBox.left;
    const left = Math.max(0, Math.min(boardBox.width - panelWidth, chipCentre - panelWidth / 2));
    panel.style.width = panelWidth + "px";
    panel.style.left = left + "px";
    panel.style.top = (chipBox.bottom - boardBox.top + 12) + "px";
    panel.style.setProperty("--nub", Math.max(18, Math.min(panelWidth - 18, chipCentre - left)) + "px");
  }

  function open(chip) {
    if (active === chip) { close(true); return; }
    if (active) active.button.setAttribute("aria-expanded", "false");
    active = chip;
    showGroup(null);

    const linked = new Set(linkedTo(chip));
    chips.forEach(function (other) {
      other.item.classList.toggle("is-active", other === chip);
      other.item.classList.toggle("is-linked", other !== chip && linked.has(other));
    });
    board.classList.add("is-focused");

    buildPanel(chip);
    panel.hidden = false;
    place(chip);
    panel.classList.remove("is-open");
    void panel.offsetWidth;                /* restart the opening transition */
    panel.classList.add("is-open");
    chip.button.setAttribute("aria-expanded", "true");
  }

  function close(returnFocus) {
    if (!active) return;
    const chip = active;
    active = null;
    chip.button.setAttribute("aria-expanded", "false");
    chips.forEach(function (other) { other.item.classList.remove("is-active", "is-linked"); });
    board.classList.remove("is-focused");
    panel.classList.remove("is-open");
    panel.hidden = true;
    if (returnFocus) chip.button.focus();
    refresh();
  }

  chips.forEach(function (chip) {
    chip.button.addEventListener("click", function () { open(chip); });
  });

  panel.addEventListener("click", function (event) {
    if (event.target.closest(".skill-panel-close")) { close(true); return; }

    const projectButton = event.target.closest("[data-skill-project]");
    if (projectButton && window.portfolioProjects) {
      const returnTo = active ? active.button : null;
      window.portfolioProjects.open(projectButton.getAttribute("data-skill-project"), returnTo);
      return;
    }

  });

  document.addEventListener("click", function (event) {
    if (!active) return;
    if (panel.contains(event.target) || event.target.closest(".skill-chip")) return;
    if (event.target.closest("[data-project-modal]")) return;
    close(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !active) return;
    if (document.querySelector("[data-project-modal][open]")) return;
    close(true);
  });
}());
