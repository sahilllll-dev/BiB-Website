import { resolveRoute } from "../utils/site.js";

const FRAME_PREFIX = "Comp 1_";
const FRAME_EXTENSION = "png";
const FRAME_SMOOTHING = 0.16;
const INITIAL_PRELOAD_COUNT = 48;
const PRELOAD_BACKWARD_RANGE = 18;
const PRELOAD_FORWARD_RANGE = 36;
const MAX_ACTIVE_LOADS = 6;
const MAX_DEVICE_PIXEL_RATIO = 2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, amount) => start + (end - start) * amount;

const getFrameUrl = (siteRoot, directory, index) => {
  const frameName = `${FRAME_PREFIX}${String(index).padStart(5, "0")}.${FRAME_EXTENSION}`;
  return resolveRoute(siteRoot, `${directory}/${frameName}`);
};

class HomeHeroSequence {
  constructor(root, siteRoot) {
    this.root = root;
    this.siteRoot = siteRoot;
    this.stage = root.querySelector("[data-hero-stage]");
    this.canvas = root.querySelector("[data-hero-canvas]");
    this.context = this.canvas?.getContext("2d", { alpha: false });
    this.frameCount = Number(root.dataset.frameCount || 0);
    this.sequenceDirectory = root.dataset.sequenceDirectory || "assets/images/hero-seq";

    this.frameUrls = Array.from({ length: this.frameCount }, (_, index) =>
      getFrameUrl(this.siteRoot, this.sequenceDirectory, index)
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
    this.hasStartedBackgroundPreload = false;
    this.resolveReady = null;
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.renderLoop = this.renderLoop.bind(this);
  }

  markReady() {
    if (!this.resolveReady) {
      return;
    }

    this.resolveReady();
    this.resolveReady = null;
  }

  initialize() {
    if (!this.stage || !this.canvas || !this.context || this.frameCount <= 0) {
      this.markReady();
      return;
    }

    this.updateCanvasSize();
    this.updateScrollProgress();
    this.preloadInitialFrames();

    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("resize", this.handleResize, { passive: true });

    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.stage);
    }

    this.animationFrameId = window.requestAnimationFrame(this.renderLoop);
  }

  preloadInitialFrames() {
    const preloadCount = Math.min(this.frameCount, INITIAL_PRELOAD_COUNT);

    for (let index = 0; index < preloadCount; index += 1) {
      this.queueFrame(index, true);
    }
  }

  preloadRemainingFrames() {
    if (this.hasStartedBackgroundPreload) {
      return;
    }

    this.hasStartedBackgroundPreload = true;

    for (let index = INITIAL_PRELOAD_COUNT; index < this.frameCount; index += 1) {
      this.queueFrame(index);
    }
  }

  preloadWindow(centerFrame) {
    if (centerFrame === this.lastQueuedCenter) {
      return;
    }

    this.lastQueuedCenter = centerFrame;

    for (let offset = 0; offset <= PRELOAD_FORWARD_RANGE; offset += 1) {
      this.queueFrame(centerFrame + offset, offset < 12);
    }

    for (let offset = 1; offset <= PRELOAD_BACKWARD_RANGE; offset += 1) {
      this.queueFrame(centerFrame - offset, offset < 8);
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

          if (index === 0) {
            this.root.classList.add("is-loaded");
            this.preloadRemainingFrames();
            this.markReady();
          }

          resolve(image);
        };

        if (typeof image.decode === "function") {
          image.decode().catch(() => {}).finally(finalizeLoad);
          return;
        }

        finalizeLoad();
      };

      image.onerror = () => {
        console.warn(`BiB hero frame failed to load: ${imageUrl}`);
        if (index === 0) {
          this.markReady();
        }
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
    if (!this.stage) {
      return;
    }

    const sectionTop = this.root.offsetTop;
    const scrollRange = this.root.offsetHeight - this.stage.offsetHeight;

    if (scrollRange <= 0) {
      this.targetFrame = 0;
      return;
    }

    const progress = clamp((window.scrollY - sectionTop) / scrollRange, 0, 1);

    this.root.style.setProperty("--hero-progress", progress.toFixed(4));
    this.targetFrame = progress * (this.frameCount - 1);
    this.preloadWindow(Math.round(this.targetFrame));
  }

  updateCanvasSize() {
    if (!this.stage || !this.canvas || !this.context) {
      return;
    }

    const rect = this.stage.getBoundingClientRect();
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

export const initializeHomeHero = (siteRoot) => {
  const homeHero = document.querySelector("[data-home-hero]");

  if (!homeHero) {
    return Promise.resolve();
  }

  const sequence = new HomeHeroSequence(homeHero, siteRoot);
  sequence.initialize();
  return sequence.readyPromise;
};
