// SCROLL ARCHITECTURE
// ─────────────────────────────────────────────────────────────
// Each story-scene-wrap is position:sticky top:0.
// As the user scrolls, each section sticks at the top while the
// next section scrolls up from below and covers it (z-index order).
//
// CARD REVEAL: Scroll-driven via RAF.
//   heroRect.bottom falls 100vh → 0 → card opacity/scale follows.
//
// ACTIVE SCENE: Derived from scroll position — no IntersectionObserver.
//   scrolledIntoStory / viewportHeight = scene index.
//
// PAST: IntersectionObserver on the story section detects when
//   all scenes have cleared the viewport, then hides the card.
// ─────────────────────────────────────────────────────────────

const SCENE_COUNT = 7;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const smoothScrollTo = (targetY, duration = 1200) => {
  const startY    = window.scrollY;
  const dist      = targetY - startY;
  const startTime = performance.now();
  const step = (now) => {
    const p = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + dist * easeInOutCubic(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

export const initializeIndustriesStory = () => {
  const section   = document.querySelector("[data-industries-story]");
  const fixedCard = document.querySelector("[data-story-fixed-card]");
  const storyNav  = document.querySelector("[data-story-nav]");
  const hero      = document.querySelector("[data-industries-hero]");

  if (!section || !fixedCard) return;

  const sceneWraps = Array.from(section.querySelectorAll("[data-scene-index]"));
  const slides     = Array.from(fixedCard.querySelectorAll("[data-scene-slide]"));
  const dots       = storyNav ? Array.from(storyNav.querySelectorAll("[data-scene-dot]")) : [];

  let currentScene = -1;
  let isPast       = false;
  let rafId        = 0;

  // ── Slide + dot sync ─────────────────────────────────────────
  const syncScene = (index) => {
    if (index === currentScene) return;
    currentScene = index;
    slides.forEach((el, i) => {
      el.classList.toggle("is-active", i === index);
      el.setAttribute("aria-hidden", String(i !== index));
    });
    dots.forEach((el, i) => el.classList.toggle("is-active", i === index));
    fixedCard.setAttribute("aria-hidden", "false");
  };

  // ── Main RAF loop ─────────────────────────────────────────────
  const update = () => {
    rafId = 0;
    if (isPast) return;

    const vh = window.innerHeight;

    // 1. Scroll-driven card reveal — tracks hero exit in real time
    let heroProgress = 1; // assume hero gone if not found
    if (hero) {
      const heroRect = hero.getBoundingClientRect();
      heroProgress   = clamp(1 - heroRect.bottom / vh, 0, 1);
    }
    const eased = 1 - Math.pow(1 - heroProgress, 2.2);
    const scale  = 0.7 + 0.3 * eased;
    fixedCard.style.transform     = `translate(-50%, -50%) scale(${scale})`;
    fixedCard.style.pointerEvents = heroProgress >= 0.99 ? "auto" : "none";

    // 2. Nav visibility — show once hero is fully gone
    if (storyNav) storyNav.classList.toggle("is-visible", heroProgress >= 1);

    // 3. Active scene — derived from how far we've scrolled into the story.
    //    Each sticky scene occupies one viewport height of scroll space.
    //    storyRect.top goes from 0 → -(SCENE_COUNT * vh) as user scrolls through.
    const storyRect = section.getBoundingClientRect();
    if (storyRect.top <= 0 && storyRect.bottom > 0) {
      const scrolledIn = -storyRect.top;
      const sceneIndex = clamp(Math.floor(scrolledIn / vh), 0, SCENE_COUNT - 1);
      syncScene(sceneIndex);
    }
  };

  const requestUpdate = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(update);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });

  // ── Story section: is-past detection ─────────────────────────
  const storyObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const rect        = entry.boundingClientRect;
      const scrolledPast = !entry.isIntersecting && rect.bottom < 0;

      if (scrolledPast && !isPast) {
        isPast = true;
        // Clear inline styles BEFORE adding class so CSS transition takes over
        fixedCard.style.transform     = "";
        fixedCard.style.pointerEvents = "";
        if (storyNav) storyNav.classList.remove("is-visible");
        requestAnimationFrame(() => fixedCard.classList.add("is-past"));

      } else if (!scrolledPast && isPast) {
        isPast = false;
        fixedCard.classList.remove("is-past");
        requestUpdate();
      }
    });
  }, { threshold: 0 });

  storyObs.observe(section);

  // ── Dot click: smooth-scroll to the target scene ─────────────
  // Sticky elements return unreliable getBoundingClientRect() as a
  // scroll target, so we derive the position from the story section's
  // document-flow top (non-sticky parent) + scene offset.
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const idx = parseInt(dot.dataset.sceneDot, 10);
      // Story section document-flow top (non-sticky, always accurate)
      const storyDocTop = section.getBoundingClientRect().top + window.scrollY;
      const targetY     = storyDocTop + idx * window.innerHeight;
      smoothScrollTo(targetY, 1200);
    });
  });

  // Bootstrap
  syncScene(0);
  update();
};
