import { resolveRoute } from "../utils/site.js";

const VELOCITY_THRESHOLD = 2.2;
const TRAIL_INTERVAL_MS = 18;
const MAX_ACTIVE_CARDS = 6;
const TRAIL_LIFETIME_MS = 300;

const TRAIL_IMAGES = [
  "assets/images/portfolio img 01.png",
  "assets/images/portfolio img 02.png",
  "assets/images/portfolio img 03.png",
  "assets/images/portfolio img 04.png",
];

class PortfolioHero {
  constructor(root, siteRoot) {
    this.root = root;
    this.imageUrls = TRAIL_IMAGES.map((p) => resolveRoute(siteRoot, p));

    this.mouse = { x: 0, y: 0 };
    this.prevMouse = { x: 0, y: 0 };
    this.velocity = 0;
    this.imageIndex = 0;
    this.activeCards = 0;
    this.lastSpawnTime = 0;
    this.rafId = 0;

    this.onMouseMove = this.onMouseMove.bind(this);
    this.loop = this.loop.bind(this);
  }

  initialize() {
    // Trail is a pointer/cursor interaction — skip on touch
    if (window.matchMedia("(hover: none)").matches) return;

    this.root.addEventListener("mousemove", this.onMouseMove, { passive: true });
    this.rafId = requestAnimationFrame(this.loop);
  }

  onMouseMove(e) {
    const rect = this.root.getBoundingClientRect();
    this.mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  loop(timestamp) {
    this.rafId = requestAnimationFrame(this.loop);

    const dx = this.mouse.x - this.prevMouse.x;
    const dy = this.mouse.y - this.prevMouse.y;
    const rawSpeed = Math.sqrt(dx * dx + dy * dy);

    // Responsive lerp — snaps up quickly, decays naturally
    this.velocity = this.velocity * 0.68 + rawSpeed * 0.32;

    if (
      this.velocity > VELOCITY_THRESHOLD &&
      this.activeCards < MAX_ACTIVE_CARDS &&
      timestamp - this.lastSpawnTime > TRAIL_INTERVAL_MS
    ) {
      this.spawnCard(this.mouse.x, this.mouse.y);
      this.lastSpawnTime = timestamp;
    }

    this.prevMouse = { x: this.mouse.x, y: this.mouse.y };
  }

  spawnCard(x, y) {
    this.activeCards++;

    const el = document.createElement("div");
    el.className = "portfolio-trail-card";
    el.setAttribute("aria-hidden", "true");

    const img = document.createElement("img");
    img.src = this.imageUrls[this.imageIndex % this.imageUrls.length];
    img.alt = "";
    img.draggable = false;
    el.appendChild(img);

    this.imageIndex++;

    const rotation = (Math.random() - 0.5) * 12;

    el.style.cssText = `left:${x}px;top:${y}px;transform:translate(-50%,-50%) rotate(${rotation}deg);`;

    this.root.appendChild(el);

    // Hard remove — no fade, no transition
    setTimeout(() => {
      el.remove();
      this.activeCards = Math.max(0, this.activeCards - 1);
    }, TRAIL_LIFETIME_MS);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    this.root.removeEventListener("mousemove", this.onMouseMove);
    this.root.querySelectorAll(".portfolio-trail-card").forEach((el) => el.remove());
    this.activeCards = 0;
  }
}

export const initializePortfolioHero = (siteRoot) => {
  const root = document.querySelector("[data-portfolio-hero]");
  if (!root) return;

  const hero = new PortfolioHero(root, siteRoot);
  hero.initialize();
};
