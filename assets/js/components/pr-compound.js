const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const INTERACTIVE_CARD_MEDIA = "(min-width: 768px) and (hover: hover) and (pointer: fine)";
const REDUCED_MOTION_MEDIA = "(prefers-reduced-motion: reduce)";

const initializeRibbonMarquee = (section) => {
  const ribbonPath = section.querySelector(".pr-compound-ribbon-path");
  const textPath = section.querySelector("[data-pr-marquee-text]");

  if (!ribbonPath || !textPath || typeof ribbonPath.getTotalLength !== "function") {
    return;
  }

  const pathLength = ribbonPath.getTotalLength();
  const loopDistance = pathLength * 0.42;
  const baseOffset = pathLength * 0.085;
  let offset = 0;
  let lastTime = 0;

  const tick = (time) => {
    const delta = lastTime === 0 ? 16.67 : Math.min(48, time - lastTime);
    lastTime = time;
    offset = (offset + delta * 0.045) % loopDistance;
    textPath.setAttribute("startOffset", `${baseOffset - offset}px`);
    window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
};

const initializeSwingCards = (section) => {
  const cards = Array.from(section.querySelectorAll("[data-pr-swing-card]"));

  if (cards.length === 0) {
    return;
  }

  const interactiveMedia = window.matchMedia(INTERACTIVE_CARD_MEDIA);
  const reducedMotionMedia = window.matchMedia(REDUCED_MOTION_MEDIA);
  const states = cards.map((card) => ({
    angle: 0,
    card,
    hovering: false,
    velocity: 0
  }));

  let animationFrameId = 0;
  let lastFrameTime = 0;

  const render = (state) => {
    state.card.style.setProperty("--swing-angle", `${state.angle.toFixed(3)}deg`);
  };

  const resetState = (state) => {
    state.angle = 0;
    state.velocity = 0;
    state.hovering = false;
    state.card.classList.remove("is-swinging");
    state.card.style.removeProperty("--swing-angle");
  };

  const ensureTicking = () => {
    if (animationFrameId || !interactiveMedia.matches || reducedMotionMedia.matches) {
      return;
    }

    animationFrameId = window.requestAnimationFrame(tick);
  };

  const tick = (time) => {
    const delta = lastFrameTime === 0 ? 16.67 : Math.min(32, time - lastFrameTime);
    const frameScale = delta / 16.67;
    lastFrameTime = time;
    let hasMotion = false;

    states.forEach((state) => {
      if (!interactiveMedia.matches || reducedMotionMedia.matches) {
        resetState(state);
        return;
      }

      const restoringForce = -Math.sin((state.angle * Math.PI) / 180) * 0.42;
      const damping = state.hovering ? 0.986 : 0.935;

      state.velocity += restoringForce * frameScale;
      state.velocity *= damping;
      state.angle = clamp(state.angle + state.velocity * frameScale, -16, 16);

      if (Math.abs(state.angle) < 0.015 && Math.abs(state.velocity) < 0.012 && !state.hovering) {
        state.angle = 0;
        state.velocity = 0;
        state.card.classList.remove("is-swinging");
      } else {
        hasMotion = true;
        state.card.classList.add("is-swinging");
      }

      render(state);
    });

    if (hasMotion) {
      animationFrameId = window.requestAnimationFrame(tick);
      return;
    }

    animationFrameId = 0;
    lastFrameTime = 0;
  };

  states.forEach((state) => {
    const impulse = Number(state.card.dataset.swingImpulse || 1);

    state.card.addEventListener("pointerenter", () => {
      if (!interactiveMedia.matches || reducedMotionMedia.matches) {
        return;
      }

      state.hovering = true;
      state.velocity += impulse * 1.05;
      state.angle += impulse * 0.9;
      ensureTicking();
    });

    state.card.addEventListener("pointermove", (event) => {
      if (!state.hovering || !interactiveMedia.matches || reducedMotionMedia.matches) {
        return;
      }

      const rect = state.card.getBoundingClientRect();
      const originX = rect.left + rect.width * 0.24;
      const pointerLeverage = clamp((event.clientX - originX) / rect.width, -1, 1);
      state.velocity += pointerLeverage * 0.09;
      ensureTicking();
    });

    state.card.addEventListener("pointerleave", () => {
      state.hovering = false;
      ensureTicking();
    });
  });

  const resetAll = () => {
    if (interactiveMedia.matches && !reducedMotionMedia.matches) {
      return;
    }

    states.forEach(resetState);
  };

  if (typeof interactiveMedia.addEventListener === "function") {
    interactiveMedia.addEventListener("change", resetAll);
    reducedMotionMedia.addEventListener("change", resetAll);
  } else if (typeof interactiveMedia.addListener === "function") {
    interactiveMedia.addListener(resetAll);
    reducedMotionMedia.addListener(resetAll);
  }
};

export const initializePrCompound = () => {
  const section = document.querySelector("[data-pr-compound]");

  if (!section) {
    return;
  }

  initializeRibbonMarquee(section);
  initializeSwingCards(section);
};
