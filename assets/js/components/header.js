import { applyRoutes, fetchComponentMarkup, normalizePath } from "../utils/site.js";

const ACTIVE_CLASS = "is-active";

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
    if (!header.contains(event.target)) {
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
};
