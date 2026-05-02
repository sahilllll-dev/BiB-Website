const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const REVEAL_READY_CLASS = "is-motion-ready";
const REVEAL_ACTIVE_CLASS = "is-active";

const getLightRevealProgress = (element) => {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const fadeStart = viewportHeight * 0.92;
  const fadeEnd = viewportHeight * 0.44;

  if (fadeStart <= fadeEnd) {
    return rect.top <= fadeEnd ? 1 : 0;
  }

  return clamp((fadeStart - rect.top) / (fadeStart - fadeEnd), 0, 1);
};

export const initializeHomeWhatWeDo = () => {
  const section = document.querySelector("[data-home-what-we-do]");

  if (!section) {
    return;
  }

  const points = section.querySelector(".what-we-do-points");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frameId = 0;

  if (points && !prefersReducedMotion.matches) {
    section.classList.add(REVEAL_READY_CLASS);

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;

          if (!entry?.isIntersecting) {
            return;
          }

          section.classList.add(REVEAL_ACTIVE_CLASS);
          observer.disconnect();
        },
        {
          threshold: 0.3,
          rootMargin: "0px 0px -8% 0px"
        }
      );

      observer.observe(points);
    } else {
      window.requestAnimationFrame(() => {
        section.classList.add(REVEAL_ACTIVE_CLASS);
      });
    }
  }

  const render = () => {
    frameId = 0;

    if (prefersReducedMotion.matches) {
      section.style.setProperty("--what-we-do-light-progress", "1");
      section.classList.add(REVEAL_ACTIVE_CLASS);
      return;
    }

    const lightProgress = getLightRevealProgress(section);
    section.style.setProperty("--what-we-do-light-progress", lightProgress.toFixed(4));
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
