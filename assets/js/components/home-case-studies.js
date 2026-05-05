import { resolveRoute } from "../utils/site.js";

const OPEN_CLASS = "is-open";
const FRAME_SMOOTHING = 0.18;
const INITIAL_PRELOAD_COUNT = 14;
const PRELOAD_BACKWARD_RANGE = 10;
const PRELOAD_FORWARD_RANGE = 20;
const MAX_ACTIVE_LOADS = 4;
const MAX_DEVICE_PIXEL_RATIO = 2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, amount) => start + (end - start) * amount;

const getFrameUrl = (siteRoot, directory, prefix, extension, index) => {
  const frameName = `${prefix}${String(index).padStart(5, "0")}.${extension}`;
  return resolveRoute(siteRoot, `${directory}/${frameName}`);
};

const setExpandedState = (visual, isExpanded) => {
  const toggle = visual.querySelector("[data-case-toggle]");
  const panelId = toggle?.getAttribute("aria-controls");
  const panel = panelId ? document.getElementById(panelId) : visual.querySelector(".case-detail-panel");

  visual.classList.toggle(OPEN_CLASS, isExpanded);

  if (toggle) {
    toggle.setAttribute("aria-expanded", String(isExpanded));
  }

  if (panel) {
    panel.setAttribute("aria-hidden", String(!isExpanded));
  }
};

class CaseStudySequence {
  constructor(root, siteRoot) {
    this.root = root;
    this.siteRoot = siteRoot;
    this.canvas = root.querySelector("[data-case-sequence-canvas]");
    this.context = this.canvas?.getContext("2d", { alpha: false });
    this.frameCount = Number(root.dataset.frameCount || 0);
    this.sequenceDirectory = root.dataset.sequenceDirectory || "assets/images/Keys-seq";
    this.framePrefix = root.dataset.framePrefix || "Keys_";
    this.frameExtension = root.dataset.frameExtension || "png";
    this.sequenceSpeed = Math.max(0, Number(root.dataset.sequenceSpeed || 1));

    this.frameUrls = Array.from({ length: this.frameCount }, (_, index) =>
      getFrameUrl(this.siteRoot, this.sequenceDirectory, this.framePrefix, this.frameExtension, index)
    );

    this.images = new Map();
    this.loading = new Map();
    this.queue = [];
    this.queuedFrames = new Set();
    this.activeLoads = 0;

    this.targetFrame = 0;
    this.smoothedFrame = 0;
    this.lastDrawnFrame = -1;
    this.lastQueuedCenter = -1;
    this.animationFrameId = 0;
    this.needsRedraw = true;

    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.renderLoop = this.renderLoop.bind(this);
  }

  initialize() {
    if (!this.canvas || !this.context || this.frameCount <= 0) {
      return;
    }

    this.updateCanvasSize();
    this.updateScrollProgress();
    this.preloadInitialFrames();
    this.preloadWindow(Math.round(this.targetFrame));

    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("resize", this.handleResize, { passive: true });

    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.root);
    }

    this.animationFrameId = window.requestAnimationFrame(this.renderLoop);
  }

  preloadInitialFrames() {
    const preloadCount = Math.min(this.frameCount, INITIAL_PRELOAD_COUNT);

    for (let index = 0; index < preloadCount; index += 1) {
      this.queueFrame(index, true);
    }
  }

  preloadWindow(centerFrame) {
    if (centerFrame === this.lastQueuedCenter) {
      return;
    }

    this.lastQueuedCenter = centerFrame;

    for (let offset = 0; offset <= PRELOAD_FORWARD_RANGE; offset += 1) {
      this.queueFrame(centerFrame + offset, offset < 10);
    }

    for (let offset = 1; offset <= PRELOAD_BACKWARD_RANGE; offset += 1) {
      this.queueFrame(centerFrame - offset, offset < 6);
    }
  }

  queueFrame(index, priority = false) {
    if (
      index < 0 ||
      index >= this.frameCount ||
      this.images.has(index) ||
      this.loading.has(index) ||
      this.queuedFrames.has(index)
    ) {
      return;
    }

    if (priority) {
      this.queue.unshift(index);
    } else {
      this.queue.push(index);
    }

    this.queuedFrames.add(index);
    this.pumpQueue();
  }

  pumpQueue() {
    while (this.activeLoads < MAX_ACTIVE_LOADS && this.queue.length > 0) {
      const frameIndex = this.queue.shift();

      if (frameIndex === undefined) {
        return;
      }

      this.queuedFrames.delete(frameIndex);
      this.activeLoads += 1;

      this.loadFrame(frameIndex).finally(() => {
        this.activeLoads -= 1;
        this.pumpQueue();
      });
    }
  }

  loadFrame(index) {
    if (this.images.has(index)) {
      return Promise.resolve(this.images.get(index));
    }

    if (this.loading.has(index)) {
      return this.loading.get(index);
    }

    const imageUrl = this.frameUrls[index];
    const framePromise = new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";

      image.onload = () => {
        const finalizeLoad = () => {
          this.images.set(index, image);
          this.needsRedraw = true;
          this.root.classList.add("is-loaded");
          resolve(image);
        };

        if (typeof image.decode === "function") {
          image.decode().catch(() => {}).finally(finalizeLoad);
          return;
        }

        finalizeLoad();
      };

      image.onerror = () => {
        console.warn(`BiB case study frame failed to load: ${imageUrl}`);
        resolve(null);
      };

      image.src = imageUrl;
    }).finally(() => {
      this.loading.delete(index);
    });

    this.loading.set(index, framePromise);
    return framePromise;
  }

  handleScroll() {
    this.updateScrollProgress();
  }

  handleResize() {
    this.updateCanvasSize();
    this.updateScrollProgress();
  }

  updateScrollProgress() {
    const rect = this.root.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const travelDistance = viewportHeight + rect.height;
    const progress = clamp((viewportHeight - rect.top) / travelDistance, 0, 1);

    this.root.style.setProperty("--case-sequence-progress", progress.toFixed(4));
    this.targetFrame = progress * (this.frameCount - 1) * this.sequenceSpeed;
    this.preloadWindow(Math.round(this.targetFrame));
  }

  updateCanvasSize() {
    if (!this.canvas || !this.context) {
      return;
    }

    const rect = this.root.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
    const canvasWidth = Math.max(1, Math.round(rect.width * pixelRatio));
    const canvasHeight = Math.max(1, Math.round(rect.height * pixelRatio));

    if (this.canvas.width === canvasWidth && this.canvas.height === canvasHeight) {
      return;
    }

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = "high";
    this.needsRedraw = true;
  }

  getNearestLoadedFrame(frameIndex) {
    if (this.images.has(frameIndex)) {
      return { frameIndex, image: this.images.get(frameIndex) };
    }

    for (let distance = 1; distance < this.frameCount; distance += 1) {
      const forwardIndex = frameIndex + distance;
      const backwardIndex = frameIndex - distance;

      if (forwardIndex < this.frameCount && this.images.has(forwardIndex)) {
        return { frameIndex: forwardIndex, image: this.images.get(forwardIndex) };
      }

      if (backwardIndex >= 0 && this.images.has(backwardIndex)) {
        return { frameIndex: backwardIndex, image: this.images.get(backwardIndex) };
      }
    }

    return null;
  }

  drawFrame(image) {
    if (!image || !this.context || !this.canvas) {
      return;
    }

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const scale = Math.max(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const drawX = (canvasWidth - drawWidth) / 2;
    const drawY = (canvasHeight - drawHeight) / 2;

    this.context.clearRect(0, 0, canvasWidth, canvasHeight);
    this.context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  renderLoop() {
    this.animationFrameId = window.requestAnimationFrame(this.renderLoop);
    this.smoothedFrame = lerp(this.smoothedFrame, this.targetFrame, FRAME_SMOOTHING);

    if (Math.abs(this.smoothedFrame - this.targetFrame) < 0.02) {
      this.smoothedFrame = this.targetFrame;
    }

    const desiredFrame = Math.round(this.smoothedFrame);
    const loadedFrame = this.getNearestLoadedFrame(desiredFrame);

    if (!loadedFrame) {
      return;
    }

    if (!this.needsRedraw && this.lastDrawnFrame === loadedFrame.frameIndex) {
      return;
    }

    this.drawFrame(loadedFrame.image);
    this.lastDrawnFrame = loadedFrame.frameIndex;
    this.needsRedraw = false;
  }
}

const initializeCaseSequence = (section, siteRoot) => {
  const sequenceRoots = Array.from(section.querySelectorAll("[data-case-sequence]"));

  if (sequenceRoots.length === 0) {
    return;
  }

  sequenceRoots.forEach((sequenceRoot) => {
    const mountSequence = () => {
      if (sequenceRoot.dataset.sequenceInitialized === "true") {
        return;
      }

      sequenceRoot.dataset.sequenceInitialized = "true";
      const sequence = new CaseStudySequence(sequenceRoot, siteRoot);
      sequence.initialize();
      sequenceRoot.caseSequence = sequence;
    };

    if (!("IntersectionObserver" in window)) {
      mountSequence();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const shouldInitialize = entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0);

        if (!shouldInitialize) {
          return;
        }

        observer.disconnect();
        mountSequence();
      },
      {
        rootMargin: "35% 0px"
      }
    );

    observer.observe(sequenceRoot);
  });
};

export const initializeHomeCaseStudies = (siteRoot = ".") => {
  const section = document.querySelector(".home-case-studies");

  if (!section) {
    return;
  }

  const visuals = Array.from(section.querySelectorAll("[data-case-visual]"));

  if (visuals.length === 0) {
    return;
  }

  const closeAll = (exception = null) => {
    visuals.forEach((visual) => {
      if (visual === exception) {
        return;
      }

      setExpandedState(visual, false);
    });
  };

  visuals.forEach((visual) => {
    const toggle = visual.querySelector("[data-case-toggle]");

    setExpandedState(visual, false);

    if (!toggle) {
      return;
    }

    toggle.addEventListener("click", (event) => {
      event.preventDefault();

      const nextExpandedState = !visual.classList.contains(OPEN_CLASS);
      closeAll(nextExpandedState ? visual : null);
      setExpandedState(visual, nextExpandedState);
    });
  });

  document.addEventListener("click", (event) => {
    const openVisual = visuals.find((visual) => visual.classList.contains(OPEN_CLASS));

    if (!openVisual || openVisual.contains(event.target)) {
      return;
    }

    setExpandedState(openVisual, false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    closeAll();
  });

  initializeCaseSequence(section, siteRoot);
};
