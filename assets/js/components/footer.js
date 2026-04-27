import { applyRoutes, fetchComponentMarkup } from "../utils/site.js";

export const loadFooter = async (siteRoot) => {
  const slot = document.querySelector('[data-component="footer"]');

  if (!slot) {
    return;
  }

  slot.innerHTML = await fetchComponentMarkup(siteRoot, "footer");
  applyRoutes(slot, siteRoot);
};

export const initializeFooter = () => {
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
};
