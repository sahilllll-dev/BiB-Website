const PANEL_COUNT = 3;
const BREAKPOINT = 1024;

class PortfolioHScroll {
  constructor(root) {
    this.root = root;
    this.track = root.querySelector("[data-hscroll-track]");

    this.isEnabled = false;
    this.ticking = false;
    this.sectionTop = 0;
    this.scrollRange = 0;

    this.onScroll = this.onScroll.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  initialize() {
    this.onResize();
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.cacheLayout();
    window.addEventListener("scroll", this.onScroll, { passive: true });
    this.update();
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    window.removeEventListener("scroll", this.onScroll);
    // Remove dynamic height so CSS takes over (stacked mobile layout)
    this.root.style.height = "";
    if (this.track) this.track.style.transform = "";
  }

  onResize() {
    const shouldEnable = window.innerWidth >= BREAKPOINT;
    if (shouldEnable && !this.isEnabled) {
      this.enable();
    } else if (!shouldEnable && this.isEnabled) {
      this.disable();
    } else if (shouldEnable && this.isEnabled) {
      this.cacheLayout();
      this.update();
    }
  }

  cacheLayout() {
    // The track must travel exactly (PANEL_COUNT - 1) × viewportWidth pixels.
    // Pin duration must equal that travel distance so the sticky section only
    // releases once the last panel is fully aligned with the viewport edge.
    //
    // Correct formula:
    //   scrollRange = (PANEL_COUNT - 1) × vw       ← horizontal travel in px
    //   sectionHeight = vh + scrollRange            ← sticky unpin point = sectionTop + scrollRange
    //
    // Using vh (height: 300vh) is WRONG on wide screens because vw > vh,
    // which makes the section unpin before the translation completes.

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    this.scrollRange = (PANEL_COUNT - 1) * vw;

    // Set section height so the sticky inner element stays pinned for exactly
    // scrollRange pixels of scroll — no more, no less.
    this.root.style.height = `${vh + this.scrollRange}px`;

    // Re-read position after height write to get accurate document offset.
    const rect = this.root.getBoundingClientRect();
    this.sectionTop = rect.top + window.scrollY;
  }

  onScroll() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.update();
      this.ticking = false;
    });
  }

  update() {
    if (!this.track || this.scrollRange <= 0) return;

    const progress = Math.max(0, Math.min(1,
      (window.scrollY - this.sectionTop) / this.scrollRange
    ));

    // translateX travels from 0 → −scrollRange, exactly filling the viewport
    // with the last panel at progress = 1.0.
    this.track.style.transform = `translate3d(${-progress * this.scrollRange}px, 0, 0)`;
  }

  destroy() {
    this.disable();
    window.removeEventListener("resize", this.onResize);
  }
}

export const initializePortfolioHScroll = () => {
  const root = document.querySelector("[data-portfolio-hscroll]");
  if (!root) return;

  const scroller = new PortfolioHScroll(root);
  scroller.initialize();
};
