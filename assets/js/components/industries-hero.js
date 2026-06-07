const TYPING_TEXT = "That's usually where we enter.";
const TYPING_BASE_MS = 45;
const TYPING_JITTER_MS = 18;
const TYPING_START_DELAY_MS = 1520;
const CURSOR_POST_BLINK_COUNT = 3;

const scheduleTyping = (typedEl, cursorEl) => {
  let index = 0;

  cursorEl.style.opacity = "1";

  const tick = () => {
    if (index >= TYPING_TEXT.length) {
      cursorEl.classList.add("is-done");
      cursorEl.addEventListener(
        "animationend",
        () => {
          cursorEl.style.opacity = "0";
        },
        { once: true }
      );
      return;
    }

    typedEl.textContent += TYPING_TEXT[index];
    index += 1;

    const jitter = Math.floor(Math.random() * TYPING_JITTER_MS * 2) - TYPING_JITTER_MS;
    setTimeout(tick, TYPING_BASE_MS + jitter);
  };

  tick();
};

export const initializeIndustriesHero = () => {
  const hero = document.querySelector("[data-industries-hero]");

  if (!hero) {
    return;
  }

  const labelEl = hero.querySelector("[data-inh-label]");
  const lineEls = Array.from(hero.querySelectorAll("[data-inh-line]"));
  const subEl = hero.querySelector("[data-inh-sub]");
  const typedEl = hero.querySelector("[data-inh-typed]");
  const cursorEl = hero.querySelector("[data-inh-cursor]");

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    hero.classList.add("is-active");
    if (typedEl) typedEl.textContent = TYPING_TEXT;
    if (cursorEl) cursorEl.style.opacity = "0";
    return;
  }

  const triggerSequence = () => {
    window.requestAnimationFrame(() => {
      hero.classList.add("is-active");
    });

    if (typedEl && cursorEl) {
      setTimeout(() => {
        scheduleTyping(typedEl, cursorEl);
      }, TYPING_START_DELAY_MS);
    }
  };

  window.addEventListener("bib:layout-ready", triggerSequence, { once: true });
};
