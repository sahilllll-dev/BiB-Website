import { loadHeader, initializeHeader } from "./components/header.js";
import { initializeHomeConviction } from "./components/home-conviction.js";
import { loadFooter, initializeFooter } from "./components/footer.js";
import { initializeHomeHero } from "./components/home-hero.js";
import { initializeHomeMomentum } from "./components/home-momentum.js";
import { initializeHomeReallyStack } from "./components/home-really-stack.js";
import { initializeHomeSystems } from "./components/home-systems.js";
import { getSiteRoot } from "./utils/site.js";

const initializeApplication = async () => {
  const siteRoot = getSiteRoot();

  try {
    await Promise.all([loadHeader(siteRoot), loadFooter(siteRoot)]);
  } catch (error) {
    console.error("BiB layout bootstrap failed.", error);
  }

  initializeHeader();
  initializeFooter();
  initializeHomeHero(siteRoot);
  initializeHomeMomentum();
  initializeHomeConviction();
  initializeHomeReallyStack();
  initializeHomeSystems();

  document.documentElement.classList.remove("no-js");
  document.body.dataset.ui = "ready";

  window.dispatchEvent(
    new CustomEvent("bib:layout-ready", {
      detail: { siteRoot }
    })
  );
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApplication);
} else {
  initializeApplication();
}
