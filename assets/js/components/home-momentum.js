const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const MOBILE_BREAKPOINT = 767;
const CURVE_VIEWBOX_WIDTH = 1200;
const CURVE_VIEWBOX_HEIGHT = 540;
const CONNECTOR_OVERLAP = 2;
const MIN_CONNECTOR_HEIGHT = 18;

export const initializeHomeMomentum = () => {
  const section = document.querySelector("[data-home-momentum]");

  if (!section) {
    return;
  }

  const stage = section.querySelector("[data-momentum-stage]");
  const curve = section.querySelector("[data-momentum-curve]");
  const cards = Array.from(section.querySelectorAll("[data-momentum-card]"));
  const arrows = Array.from(section.querySelectorAll("[data-momentum-arrow]"));

  if (!stage || !curve || cards.length === 0) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let curveLength = 0;
  let frameId = 0;

  const isMobileViewport = () => window.innerWidth <= MOBILE_BREAKPOINT;

  const getCurvePointAtX = (targetX) => {
    let start = 0;
    let end = curveLength;

    for (let iteration = 0; iteration < 24; iteration += 1) {
      const midpoint = (start + end) / 2;
      const point = curve.getPointAtLength(midpoint);

      if (point.x < targetX) {
        start = midpoint;
      } else {
        end = midpoint;
      }
    }

    return curve.getPointAtLength((start + end) / 2);
  };

  const updateConnectorHeights = () => {
    if (isMobileViewport()) {
      cards.forEach((cardNode) => {
        cardNode.style.removeProperty("--node-line-height");
      });
      return;
    }

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;

    if (!stageWidth || !stageHeight || !curveLength) {
      return;
    }

    cards.forEach((cardNode) => {
      const card = cardNode.querySelector(".momentum-card");

      if (!card) {
        return;
      }

      const curvePoint = getCurvePointAtX((cardNode.offsetLeft / stageWidth) * CURVE_VIEWBOX_WIDTH);
      const curveY = (curvePoint.y / CURVE_VIEWBOX_HEIGHT) * stageHeight;
      const cardBottom = cardNode.offsetTop + card.offsetHeight;
      const connectorHeight = Math.max(MIN_CONNECTOR_HEIGHT, curveY - cardBottom + CONNECTOR_OVERLAP);

      cardNode.style.setProperty("--node-line-height", `${connectorHeight.toFixed(2)}px`);
    });
  };

  const setStaticState = () => {
    curve.style.strokeDasharray = "";
    curve.style.strokeDashoffset = "0";
    section.style.setProperty("--momentum-progress", "1");

    cards.forEach((card) => {
      card.style.setProperty("--card-progress", "1");
    });

    arrows.forEach((arrow) => {
      arrow.style.setProperty("--arrow-progress", "1");
    });
  };

  const updateCurveMetrics = () => {
    curveLength = curve.getTotalLength();
    curve.style.strokeDasharray = `${curveLength}`;

    arrows.forEach((arrow) => {
      const distance = clamp(Number(arrow.dataset.distance || 0), 0, 1);
      const point = curve.getPointAtLength(curveLength * distance);
      const tangentPoint = curve.getPointAtLength(Math.min(curveLength, (curveLength * distance) + 1));
      const angle = Math.atan2(tangentPoint.y - point.y, tangentPoint.x - point.x) * (180 / Math.PI);

      arrow.style.setProperty("--arrow-x", `${(point.x / 1200) * 100}%`);
      arrow.style.setProperty("--arrow-y", `${(point.y / 540) * 100}%`);
      arrow.style.setProperty("--arrow-rotation", `${angle}deg`);
    });

    updateConnectorHeights();
  };

  const render = () => {
    frameId = 0;

    if (isMobileViewport() || prefersReducedMotion.matches) {
      setStaticState();
      return;
    }

    const rect = section.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const start = viewportHeight * 0.98;
    const end = -rect.height * 0.06;
    const progress = clamp((start - rect.top) / (start - end), 0, 1);

    section.style.setProperty("--momentum-progress", progress.toFixed(4));
    curve.style.strokeDashoffset = `${curveLength * (1 - progress)}`;

    cards.forEach((card) => {
      const appearStart = Number(card.dataset.appearStart || 0);
      const localProgress = clamp((progress - appearStart) / 0.16, 0, 1);
      card.style.setProperty("--card-progress", localProgress.toFixed(4));
    });

    arrows.forEach((arrow) => {
      const appearStart = Number(arrow.dataset.appearStart || 0);
      const localProgress = clamp((progress - appearStart) / 0.07, 0, 1);
      arrow.style.setProperty("--arrow-progress", localProgress.toFixed(4));
    });
  };

  const requestRender = () => {
    if (frameId !== 0) {
      return;
    }

    frameId = window.requestAnimationFrame(render);
  };

  const handleResize = () => {
    updateCurveMetrics();
    requestRender();
  };

  updateCurveMetrics();
  requestRender();

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", handleResize, { passive: true });
  window.addEventListener("load", handleResize, { passive: true });
};
