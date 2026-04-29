const QUOTE_ROTATION_DELAY = 4000;
const QUOTE_FADE_DELAY = 180;
const MIN_VISIBLE_DURATION = 1400;
const EXIT_DURATION = 560;
const MAX_IDLE_PROGRESS = 92;
const BOOTSTRAP_PROGRESS_FLOOR = 68;
const IDLE_PROGRESS_EASE = 0.08;
const FINISH_PROGRESS_EASE = 0.18;

const LOADER_QUOTES = [
  "Aligning narrative vectors.",
  "Turning attention into recall.",
  "Filtering noise. Sharpening signal.",
  "Building momentum before the scroll.",
  "Calibrating story for compound reach."
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatProgress = (value) => `${String(Math.round(value)).padStart(3, "0")}%`;

export const createSiteLoader = () => {
  const root = document.querySelector("[data-site-loader]");
  const quoteNode = root?.querySelector("[data-loader-quote]");
  const progressBar = root?.querySelector("[data-loader-progress-bar]");
  const progressText = root?.querySelector("[data-loader-progress-text]");

  if (!root || !quoteNode || !progressBar || !progressText) {
    return {
      markBootstrapped() {},
      complete: () => Promise.resolve()
    };
  }

  let progress = 0;
  let targetProgress = 0;
  let animationFrameId = 0;
  let quoteTimerId = 0;
  let quoteSwapTimerId = 0;
  let finishTimerId = 0;
  let quoteIndex = 0;
  let isBootstrapped = false;
  let isFinishing = false;
  let isComplete = false;
  const startTime = performance.now();
  let resolveCompletion = () => {};

  const completionPromise = new Promise((resolve) => {
    resolveCompletion = resolve;
  });

  const applyProgress = () => {
    const safeProgress = clamp(progress, 0, 100);
    progressBar.style.width = `${safeProgress.toFixed(2)}%`;
    progressText.textContent = formatProgress(safeProgress);
  };

  const scheduleQuoteSwap = () => {
    if (LOADER_QUOTES.length < 2 || isFinishing || isComplete) {
      return;
    }

    quoteTimerId = window.setTimeout(() => {
      quoteNode.classList.add("is-fading");

      quoteSwapTimerId = window.setTimeout(() => {
        quoteIndex = (quoteIndex + 1) % LOADER_QUOTES.length;
        quoteNode.textContent = LOADER_QUOTES[quoteIndex];
        quoteNode.classList.remove("is-fading");
        scheduleQuoteSwap();
      }, QUOTE_FADE_DELAY);
    }, QUOTE_ROTATION_DELAY);
  };

  const clearTimers = () => {
    window.clearTimeout(quoteTimerId);
    window.clearTimeout(quoteSwapTimerId);
    window.clearTimeout(finishTimerId);
  };

  const finalize = () => {
    if (isComplete) {
      return;
    }

    isComplete = true;
    clearTimers();
    window.cancelAnimationFrame(animationFrameId);
    progress = 100;
    applyProgress();
    root.classList.add("is-complete");

    window.setTimeout(() => {
      root.remove();
      resolveCompletion();
    }, EXIT_DURATION);
  };

  const tick = (timestamp) => {
    const elapsed = timestamp - startTime;
    const idleProgress = MAX_IDLE_PROGRESS * (1 - Math.exp(-elapsed / 1900));
    targetProgress = Math.max(targetProgress, idleProgress);

    if (isBootstrapped) {
      targetProgress = Math.max(targetProgress, BOOTSTRAP_PROGRESS_FLOOR);
    }

    if (!isFinishing) {
      targetProgress = Math.min(targetProgress, MAX_IDLE_PROGRESS);
    }

    const ease = isFinishing ? FINISH_PROGRESS_EASE : IDLE_PROGRESS_EASE;
    progress += (targetProgress - progress) * ease;

    if (!isFinishing) {
      progress = Math.min(progress, MAX_IDLE_PROGRESS);
    } else if (progress >= 99.7) {
      progress = 100;
    }

    applyProgress();

    if (isFinishing && progress >= 100) {
      finalize();
      return;
    }

    animationFrameId = window.requestAnimationFrame(tick);
  };

  quoteNode.textContent = LOADER_QUOTES[quoteIndex];
  applyProgress();
  scheduleQuoteSwap();
  animationFrameId = window.requestAnimationFrame(tick);
  document.body.setAttribute("aria-busy", "true");

  return {
    markBootstrapped() {
      isBootstrapped = true;
      targetProgress = Math.max(targetProgress, BOOTSTRAP_PROGRESS_FLOOR);
    },
    complete() {
      if (isFinishing || isComplete) {
        return completionPromise;
      }

      const elapsed = performance.now() - startTime;
      const delay = Math.max(0, MIN_VISIBLE_DURATION - elapsed);

      finishTimerId = window.setTimeout(() => {
        isFinishing = true;
        targetProgress = 100;
      }, delay);

      return completionPromise;
    }
  };
};
