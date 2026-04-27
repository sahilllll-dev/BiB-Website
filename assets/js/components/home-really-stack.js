const DESKTOP_QUERY = "(min-width: 1100px)";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const easeInOut = (value) => {
  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
};

export const initializeHomeReallyStack = () => {
  const homeReally = document.querySelector(".home-really");
  const stickyStack = document.querySelector(".home-sticky-stack");
  const titleFrame = document.querySelector("[data-home-really-title-frame]");
  const titleAnchor = document.querySelector(".home-sticky-stack-title-anchor");

  if (!homeReally || !stickyStack || !titleFrame || !titleAnchor) {
    return;
  }

  const desktopMedia = window.matchMedia(DESKTOP_QUERY);
  const ghost = document.createElement("div");
  let isTicking = false;
  let sourceMetrics = null;
  let sourcePosition = null;

  ghost.setAttribute("aria-hidden", "true");
  ghost.style.display = "none";
  ghost.style.visibility = "hidden";
  ghost.style.pointerEvents = "none";
  ghost.style.marginInline = "auto";

  titleFrame.parentNode.insertBefore(ghost, titleFrame);

  const floatingStyleKeys = [
    "left",
    "top",
    "width",
    "height",
    "transform",
    "opacity",
    "pointerEvents"
  ];

  const captureFloatingState = () => ({
    isFloating: titleFrame.classList.contains("is-floating"),
    styles: Object.fromEntries(floatingStyleKeys.map((key) => [key, titleFrame.style[key]]))
  });

  const restoreFloatingState = (state) => {
    titleFrame.classList.toggle("is-floating", state.isFloating);

    floatingStyleKeys.forEach((key) => {
      titleFrame.style[key] = state.styles[key];
    });
  };

  const resetFrame = () => {
    titleFrame.classList.remove("is-floating");
    titleFrame.style.left = "";
    titleFrame.style.top = "";
    titleFrame.style.width = "";
    titleFrame.style.height = "";
    titleFrame.style.transform = "";
    titleFrame.style.opacity = "";
    titleFrame.style.pointerEvents = "";

    ghost.style.display = "none";
    ghost.style.width = "";
    ghost.style.height = "";
  };

  const measureSourceMetrics = () => {
    const snapshot = captureFloatingState();

    titleFrame.classList.remove("is-floating");
    floatingStyleKeys.forEach((key) => {
      titleFrame.style[key] = "";
    });

    const frameRect = titleFrame.getBoundingClientRect();
    const documentTop = frameRect.top + window.scrollY;

    sourceMetrics = {
      width: frameRect.width,
      height: frameRect.height
    };
    sourcePosition = {
      left: frameRect.left,
      top: documentTop - homeReally.offsetTop
    };

    ghost.style.display = "block";
    ghost.style.width = `${sourceMetrics.width}px`;
    ghost.style.height = `${sourceMetrics.height}px`;

    restoreFloatingState(snapshot);
  };

  const updateFrame = () => {
    isTicking = false;

    if (!desktopMedia.matches) {
      resetFrame();
      return;
    }

    const scrollY = window.scrollY;
    const homeTop = homeReally.offsetTop;
    const homeHeight = homeReally.offsetHeight;
    const stackTop = stickyStack.offsetTop;
    const stackBottom = stackTop + stickyStack.offsetHeight;
    const floatStart = homeTop;
    const morphStart = homeTop + homeHeight * 0.14;
    const morphEnd = stackTop + Math.min(window.innerHeight * 0.1, 96);
    const exitStart = stackBottom - window.innerHeight * 1.02;
    const exitEnd = stackBottom - window.innerHeight * 0.52;

    if (scrollY < floatStart) {
      resetFrame();
      return;
    }

    if (!sourceMetrics) {
      measureSourceMetrics();
    }

    titleFrame.classList.add("is-floating");

    const anchorRect = titleAnchor.getBoundingClientRect();
    const targetScale = anchorRect.width / Math.max(sourceMetrics.width, 1);
    const targetLeft = anchorRect.left;
    const targetTop = anchorRect.top - (sourceMetrics.height * targetScale) / 2;
    const morphProgress = easeInOut(
      clamp((scrollY - morphStart) / Math.max(1, morphEnd - morphStart), 0, 1)
    );
    const currentLeft = sourcePosition.left + (targetLeft - sourcePosition.left) * morphProgress;
    const currentTop = sourcePosition.top + (targetTop - sourcePosition.top) * morphProgress;
    const currentScale = 1 + (targetScale - 1) * morphProgress;

    let opacity = 1;
    let translateY = 0;

    if (scrollY > exitStart) {
      const fadeProgress = clamp((scrollY - exitStart) / Math.max(1, exitEnd - exitStart), 0, 1);
      opacity = 1 - fadeProgress;
      translateY = -window.innerHeight * 0.34 * fadeProgress;
    }

    titleFrame.style.left = "0";
    titleFrame.style.top = "0";
    titleFrame.style.width = `${sourceMetrics.width}px`;
    titleFrame.style.height = `${sourceMetrics.height}px`;
    titleFrame.style.transform = `translate3d(${currentLeft}px, ${currentTop + translateY}px, 0) scale(${currentScale})`;
    titleFrame.style.opacity = `${opacity}`;
    titleFrame.style.pointerEvents = "none";
  };

  const requestUpdate = () => {
    if (isTicking) {
      return;
    }

    isTicking = true;
    window.requestAnimationFrame(updateFrame);
  };

  const handleMediaChange = () => {
    sourceMetrics = null;
    sourcePosition = null;
    resetFrame();
    requestUpdate();
  };

  const handleResize = () => {
    sourceMetrics = null;
    sourcePosition = null;
    requestUpdate();
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", handleResize);
  desktopMedia.addEventListener("change", handleMediaChange);

  requestUpdate();
};
