const DESKTOP_QUERY = "(min-width: 768px)";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getDocumentTop = (element) => element.getBoundingClientRect().top + window.scrollY;

export const initializePrLaunchStack = () => {
  const stack = document.querySelector(".pr-launch-stack");
  const copy = document.querySelector(".pr-launch-stack-copy");
  const cards = Array.from(document.querySelectorAll(".pr-launch-card"));

  if (!stack || !copy || cards.length === 0) {
    return;
  }

  const desktopMedia = window.matchMedia(DESKTOP_QUERY);
  let isTicking = false;

  const reset = () => {
    copy.style.setProperty("--pr-launch-copy-release", "0px");
  };

  const update = () => {
    isTicking = false;

    if (!desktopMedia.matches) {
      reset();
      return;
    }

    const lastCard = cards[cards.length - 1];
    const lastCardTop = getDocumentTop(lastCard);
    const lastCardStickyTop = Number.parseFloat(window.getComputedStyle(lastCard).top) || 0;
    const releaseStart = lastCardTop - lastCardStickyTop;
    const releaseDistance = Math.max(window.innerHeight * 0.55, copy.offsetHeight * 1.2);
    const release = clamp(window.scrollY - releaseStart, 0, releaseDistance);

    copy.style.setProperty("--pr-launch-copy-release", `${release}px`);
  };

  const requestUpdate = () => {
    if (isTicking) {
      return;
    }

    isTicking = true;
    window.requestAnimationFrame(update);
  };

  const handleMediaChange = () => {
    reset();
    requestUpdate();
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  desktopMedia.addEventListener("change", handleMediaChange);

  requestUpdate();
};
