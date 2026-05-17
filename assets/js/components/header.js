import { applyRoutes, fetchComponentMarkup, normalizePath } from "../utils/site.js";

const ACTIVE_CLASS = "is-active";
const DESKTOP_HEADER_MEDIA = "(min-width: 768px)";
const HEADER_HIDE_SCROLL_START = 24;
const HEADER_SHOW_DELTA = 8;
const HEADER_SURFACE_LIGHT_CLASS = "site-header--over-light";
const HEADER_SURFACE_DARK_CLASS = "site-header--over-dark";
const HEADER_THEME_SELECTOR = "[data-header-theme]";

const setHeaderLayoutMode = (header) => {
  const pageMain = document.querySelector("#main-content");
  const configuredMode = document.body.dataset.headerMode?.trim() || pageMain?.dataset.headerMode?.trim() || "auto";
  const hasPageContent = Boolean(pageMain?.firstElementChild);
  const useOverlayMode = configuredMode === "overlay" || (configuredMode === "auto" && hasPageContent);

  header.classList.toggle("site-header--overlay", useOverlayMode);
  document.body.classList.toggle("has-header-overlay", useOverlayMode);
};

const setActiveNavigation = (header) => {
  const currentPath = normalizePath(window.location.href);

  header.querySelectorAll("[data-nav-link]").forEach((link) => {
    const linkPath = normalizePath(link.href);
    const isCurrentPage = currentPath === linkPath;

    link.classList.toggle(ACTIVE_CLASS, isCurrentPage);

    if (isCurrentPage) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
};

const bindMobileNavigation = (header) => {
  const toggleButton = header.querySelector("[data-menu-toggle]");
  const mobilePanel = header.querySelector("[data-menu-panel]");

  if (!toggleButton || !mobilePanel) {
    return;
  }

  if (mobilePanel.parentElement !== document.body) {
    document.body.appendChild(mobilePanel);
  }

  const setHeaderMenuState = (isOpen) => {
    header.classList.toggle("menu-is-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
  };

  const setMenuOrigin = () => {
    const rect = toggleButton.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    mobilePanel.style.setProperty("--menu-origin-x", `${centerX}px`);
    mobilePanel.style.setProperty("--menu-origin-y", `${centerY}px`);
  };

  const openPanel = () => {
    setMenuOrigin();
    toggleButton.setAttribute("aria-expanded", "true");
    header.classList.remove("site-header--hidden");
    setHeaderMenuState(true);
    mobilePanel.hidden = false;

    window.requestAnimationFrame(() => {
      mobilePanel.classList.add("is-open");
    });

    mobilePanel.querySelector("[data-nav-link]")?.focus();
  };

  const closePanel = () => {
    setMenuOrigin();
    toggleButton.setAttribute("aria-expanded", "false");
    mobilePanel.classList.remove("is-open");
  };

  const handleDocumentClick = (event) => {
    if (!header.contains(event.target) && !mobilePanel.contains(event.target)) {
      closePanel();
    }
  };

  const handleEscape = (event) => {
    if (event.key === "Escape") {
      closePanel();
    }
  };

  mobilePanel.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "clip-path" || mobilePanel.classList.contains("is-open")) {
      return;
    }

    mobilePanel.hidden = true;
    setHeaderMenuState(false);
  });

  toggleButton.addEventListener("click", () => {
    const nextExpandedState = toggleButton.getAttribute("aria-expanded") !== "true";
    if (nextExpandedState) {
      openPanel();
      return;
    }

    closePanel();
  });

  mobilePanel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closePanel);
  });

  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleEscape);

  window.addEventListener("resize", () => {
    setMenuOrigin();
  });

  setMenuOrigin();
};

const bindDesktopStickyHeader = (header) => {
  const desktopMedia = window.matchMedia(DESKTOP_HEADER_MEDIA);
  let lastScrollY = window.scrollY;
  let ticking = false;

  const showHeader = () => {
    header.classList.remove("site-header--hidden");
  };

  const applyDesktopMode = () => {
    const isDesktop = desktopMedia.matches;

    header.classList.toggle("site-header--sticky-enabled", isDesktop);

    if (!isDesktop) {
      showHeader();
    }

    lastScrollY = window.scrollY;
  };

  const updateOnScroll = () => {
    ticking = false;

    if (!desktopMedia.matches || header.classList.contains("menu-is-open")) {
      showHeader();
      lastScrollY = window.scrollY;
      return;
    }

    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;

    if (currentScrollY <= 0) {
      showHeader();
    } else if (delta > 0 && currentScrollY > HEADER_HIDE_SCROLL_START) {
      header.classList.add("site-header--hidden");
    } else if (delta <= -HEADER_SHOW_DELTA) {
      showHeader();
    }

    lastScrollY = currentScrollY;
  };

  const requestUpdate = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateOnScroll);
  };

  applyDesktopMode();

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", applyDesktopMode, { passive: true });

  if (typeof desktopMedia.addEventListener === "function") {
    desktopMedia.addEventListener("change", applyDesktopMode);
  } else if (typeof desktopMedia.addListener === "function") {
    desktopMedia.addListener(applyDesktopMode);
  }
};

const bindAdaptiveHeaderTheme = (header) => {
  const themedSections = Array.from(document.querySelectorAll(HEADER_THEME_SELECTOR));

  if (!header.classList.contains("site-header--overlay") || themedSections.length === 0) {
    return;
  }

  let ticking = false;

  const applyTheme = () => {
    ticking = false;

    const probeY = Math.min(window.innerHeight - 1, Math.max(1, header.offsetHeight + 12));
    const activeSection = themedSections.find((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= probeY && rect.bottom > probeY;
    });
    const isOverLightSurface = activeSection?.dataset.headerTheme === "light";

    header.classList.toggle(HEADER_SURFACE_LIGHT_CLASS, isOverLightSurface);
    header.classList.toggle(HEADER_SURFACE_DARK_CLASS, !isOverLightSurface);
  };

  const requestThemeUpdate = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(applyTheme);
  };

  window.addEventListener("scroll", requestThemeUpdate, { passive: true });
  window.addEventListener("resize", requestThemeUpdate, { passive: true });
  applyTheme();
};

export const loadHeader = async (siteRoot) => {
  const slot = document.querySelector('[data-component="header"]');

  if (!slot) {
    return;
  }

  slot.innerHTML = await fetchComponentMarkup(siteRoot, "header");
  applyRoutes(slot, siteRoot);
};

export const initializeHeader = () => {
  const header = document.querySelector("[data-header]");

  if (!header) {
    return;
  }

  setHeaderLayoutMode(header);
  setActiveNavigation(header);
  bindMobileNavigation(header);
  bindDesktopStickyHeader(header);
  bindAdaptiveHeaderTheme(header);
};
