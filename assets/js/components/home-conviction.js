const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getSectionProgress = (element) => {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const travelDistance = viewportHeight + rect.height;

  if (travelDistance <= 0) {
    return 0;
  }

  return clamp((viewportHeight - rect.top) / travelDistance, 0, 1);
};

export const initializeHomeConviction = () => {
  const section = document.querySelector("[data-home-conviction]");

  if (!section) {
    return;
  }

  const cards = Array.from(section.querySelectorAll("[data-parallax-card]"));

  if (cards.length === 0) {
    return;
  }

  let frameId = 0;
  const revealState = new WeakMap();

  const render = () => {
    frameId = 0;

    const progress = getSectionProgress(section);
    const centeredProgress = (progress - 0.5) * 2;
    const parallaxFactor = window.innerWidth <= 767 ? 0.52 : window.innerWidth <= 1199 ? 0.72 : 1;

    cards.forEach((card) => {
      const rotate = Number(card.dataset.rotate || 0);
      const parallaxX = Number(card.dataset.parallaxX || 0) * centeredProgress * parallaxFactor;
      const parallaxY = Number(card.dataset.parallaxY || 0) * centeredProgress * parallaxFactor;
      const revealStart = Number(card.dataset.revealStart || 0);
      const revealSpan = Number(card.dataset.revealSpan || 0.22);
      const currentReveal = clamp((progress - revealStart) / revealSpan, 0, 1);
      const revealProgress = Math.max(revealState.get(card) || 0, currentReveal);
      const scale = 0.94 + revealProgress * 0.06;

      revealState.set(card, revealProgress);

      card.style.setProperty("--card-translate-x", `${parallaxX.toFixed(2)}px`);
      card.style.setProperty("--card-translate-y", `${parallaxY.toFixed(2)}px`);
      card.style.setProperty("--card-rotate", `${rotate}deg`);
      card.style.setProperty("--card-reveal-progress", revealProgress.toFixed(3));
      card.style.setProperty("--card-scale", scale.toFixed(3));
    });
  };

  const requestRender = () => {
    if (frameId !== 0) {
      return;
    }

    frameId = window.requestAnimationFrame(render);
  };

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender, { passive: true });

  requestRender();
};
