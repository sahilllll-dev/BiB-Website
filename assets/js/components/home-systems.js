const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const INTERACTIVE_MIN_WIDTH = 1100;

const getBreakpoint = () => {
  if (window.innerWidth <= 767) {
    return "mobile";
  }

  if (window.innerWidth <= 1199) {
    return "tablet";
  }

  return "desktop";
};

const readResponsiveX = (card, breakpoint) => {
  if (breakpoint === "mobile") {
    return Number(card.dataset.mobileX ?? card.dataset.tabletX ?? card.dataset.desktopX ?? 0);
  }

  if (breakpoint === "tablet") {
    return Number(card.dataset.tabletX ?? card.dataset.desktopX ?? 0);
  }

  return Number(card.dataset.desktopX ?? 0);
};

const isInteractiveViewport = () => window.innerWidth >= INTERACTIVE_MIN_WIDTH;

export const initializeHomeSystems = () => {
  const section = document.querySelector("[data-home-systems]");

  if (!section) {
    return;
  }

  const stage = section.querySelector("[data-systems-stage]");
  const cards = Array.from(stage?.querySelectorAll("[data-gravity-card]") || []);

  if (!stage || cards.length === 0) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const states = new Map();
  let stageWidth = 0;
  let stageHeight = 0;
  let stageLeft = 0;
  let floorOffset = 0;
  let viewportWidth = 0;
  let animationFrameId = 0;
  let activePointerState = null;
  let zCounter = 20;
  let lastFrameTime = 0;

  const bringToFront = (state) => {
    zCounter += 1;
    state.card.style.zIndex = String(zCounter);
  };

  const renderCard = (state) => {
    state.card.style.transform = `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, 0) rotate(${(
      state.baseRotation + state.tilt
    ).toFixed(2)}deg)`;
  };

  const updateMetrics = ({ preservePosition = true } = {}) => {
    const breakpoint = getBreakpoint();
    const interactive = isInteractiveViewport();
    const stageRect = stage.getBoundingClientRect();

    stageWidth = stage.clientWidth;
    stageHeight = stage.clientHeight;
    stageLeft = stageRect.left;
    viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    floorOffset =
      parseFloat(window.getComputedStyle(stage).getPropertyValue("--systems-floor-offset").trim() || "0") || 0;

    if (!interactive && activePointerState) {
      if (
        activePointerState.pointerId !== null &&
        activePointerState.card.hasPointerCapture(activePointerState.pointerId)
      ) {
        activePointerState.card.releasePointerCapture(activePointerState.pointerId);
      }

      activePointerState.card.classList.remove("is-dragging");
      activePointerState.isDragging = false;
      activePointerState = null;
    }

    cards.forEach((card) => {
      const state = states.get(card);
      const width = card.offsetWidth;
      const height = card.offsetHeight;
      const spillY = height * 0.9;
      const minX = -stageLeft;
      const maxX = Math.max(minX, viewportWidth - stageLeft - width);
      const minY = -spillY;
      const floorY = Math.max(0, stageHeight - floorOffset - height);
      const initialXPct = readResponsiveX(card, breakpoint);
      const initialX = stageWidth * (initialXPct / 100) - width / 2;

      state.width = width;
      state.height = height;
      state.minX = minX;
      state.maxX = maxX;
      state.minY = minY;
      state.floorY = floorY;
      state.baseRotation = Number(card.dataset.rotate || 0);

      if (!interactive) {
        state.x = 0;
        state.y = 0;
        state.vx = 0;
        state.vy = 0;
        state.tilt = 0;
        state.isDragging = false;
        state.hasLayout = false;
        card.classList.remove("is-dragging");
        card.style.transform = "";
        card.style.zIndex = String(state.baseZ);
        return;
      }

      if (!preservePosition || !state.hasLayout) {
        state.x = initialX;
        state.y = floorY;
        state.vx = 0;
        state.vy = 0;
        state.tilt = 0;
        state.hasLayout = true;
      } else {
        state.x = clamp(state.x, minX, maxX);
        state.y = clamp(state.y, minY, floorY);
      }

      renderCard(state);
    });
  };

  const onPointerMove = (event) => {
    const state = activePointerState;

    if (!state || event.pointerId !== state.pointerId) {
      return;
    }

    const nextX = clamp(event.clientX - state.stageLeft - state.pointerOffsetX, state.minX, state.maxX);
    const nextY = clamp(event.clientY - state.stageTop - state.pointerOffsetY, state.minY, state.floorY);
    const deltaX = nextX - state.x;
    const deltaY = nextY - state.y;

    state.x = nextX;
    state.y = nextY;
    state.vx = deltaX;
    state.vy = deltaY;
    state.tilt = clamp(deltaX * 0.45, -9, 9);

    renderCard(state);
  };

  const releaseCard = (event) => {
    const state = activePointerState;

    if (!state || event.pointerId !== state.pointerId) {
      return;
    }

    state.isDragging = false;
    state.card.classList.remove("is-dragging");
    activePointerState = null;

    if (state.card.hasPointerCapture(event.pointerId)) {
      state.card.releasePointerCapture(event.pointerId);
    }
  };

  const tick = (time) => {
    if (!isInteractiveViewport()) {
      lastFrameTime = time;
      animationFrameId = window.requestAnimationFrame(tick);
      return;
    }

    const delta = lastFrameTime === 0 ? 16.67 : Math.min(32, time - lastFrameTime);
    const frameScale = delta / 16.67;
    const gravity = prefersReducedMotion.matches ? 0.7 : 0.92;
    const bounce = prefersReducedMotion.matches ? 0.28 : 0.46;
    const horizontalDrag = prefersReducedMotion.matches ? 0.86 : 0.975;
    const tiltRecovery = prefersReducedMotion.matches ? 0.18 : 0.12;

    lastFrameTime = time;

    states.forEach((state) => {
      if (state.isDragging) {
        return;
      }

      state.x += state.vx * frameScale;
      state.vx *= horizontalDrag;
      state.tilt += (0 - state.tilt) * tiltRecovery * frameScale;

      const isRestingOnFloor = Math.abs(state.y - state.floorY) < 0.5 && Math.abs(state.vy) < 0.01;

      if (!isRestingOnFloor) {
        state.vy += gravity * frameScale;
        state.y += state.vy * frameScale;
      } else {
        state.y = state.floorY;
        state.vy = 0;

        if (Math.abs(state.vx) < 0.03) {
          state.vx = 0;
        }
      }

      if (state.x < state.minX) {
        state.x = state.minX;
        state.vx *= -0.3;
      } else if (state.x > state.maxX) {
        state.x = state.maxX;
        state.vx *= -0.3;
      }

      if (state.y >= state.floorY) {
        state.y = state.floorY;

        if (Math.abs(state.vy) > 0.55) {
          state.vy *= -bounce;
          state.tilt += clamp(state.vx * 0.1, -2.5, 2.5);
        } else {
          state.vy = 0;

          if (Math.abs(state.vx) < 0.03) {
            state.vx = 0;
          }
        }
      }

      renderCard(state);
    });

    animationFrameId = window.requestAnimationFrame(tick);
  };

  cards.forEach((card, index) => {
    const baseZ = Number(card.dataset.z || index + 1);
    const state = {
      baseZ,
      card,
      baseRotation: Number(card.dataset.rotate || 0),
      floorY: 0,
      hasLayout: false,
      height: 0,
      isDragging: false,
      maxX: 0,
      minX: 0,
      minY: 0,
      pointerId: null,
      pointerOffsetX: 0,
      pointerOffsetY: 0,
      stageLeft: 0,
      stageTop: 0,
      tilt: 0,
      vx: 0,
      vy: 0,
      width: 0,
      x: 0,
      y: 0
    };

    card.style.zIndex = String(baseZ);
    zCounter = Math.max(zCounter, baseZ);
    states.set(card, state);

    card.addEventListener("pointerdown", (event) => {
      if (!isInteractiveViewport()) {
        return;
      }

      if (event.button !== 0 && event.pointerType !== "touch") {
        return;
      }

      updateMetrics({ preservePosition: true });

      state.isDragging = true;
      state.pointerId = event.pointerId;
      state.stageLeft = stageLeft;
      state.stageTop = stage.getBoundingClientRect().top;
      state.pointerOffsetX = event.clientX - state.stageLeft - state.x;
      state.pointerOffsetY = event.clientY - state.stageTop - state.y;
      state.vx = 0;
      state.vy = 0;
      bringToFront(state);
      card.classList.add("is-dragging");
      activePointerState = state;
      card.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerup", releaseCard);
    card.addEventListener("pointercancel", releaseCard);
  });

  const handleResize = () => {
    updateMetrics({ preservePosition: true });
  };

  window.addEventListener("resize", handleResize, { passive: true });
  updateMetrics({ preservePosition: false });
  animationFrameId = window.requestAnimationFrame(tick);
};
