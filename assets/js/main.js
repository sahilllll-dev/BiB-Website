import { loadHeader, initializeHeader } from "./components/header.js";
import { initializeHomeConviction } from "./components/home-conviction.js";
import { loadFooter, initializeFooter } from "./components/footer.js";
import { initializeHomeHero } from "./components/home-hero.js";
import { initializeHomeMomentum } from "./components/home-momentum.js";
import { initializeHomeReallyStack } from "./components/home-really-stack.js";
import { initializeHomeSystems } from "./components/home-systems.js";
import { createSiteLoader } from "./components/site-loader.js";
import { getSiteRoot } from "./utils/site.js";

const waitForWindowLoad = () =>
  new Promise((resolve) => {
    if (document.readyState === "complete") {
      resolve();
      return;
    }

    window.addEventListener("load", resolve, { once: true });
  });

const initializeApplication = async () => {
  const siteRoot = getSiteRoot();
  const siteLoader = createSiteLoader();
  let heroReadyPromise = Promise.resolve();

  try {
    try {
      await Promise.all([loadHeader(siteRoot), loadFooter(siteRoot)]);
    } catch (error) {
      console.error("BiB layout bootstrap failed.", error);
    }

    initializeHeader();
    initializeFooter();
    heroReadyPromise = initializeHomeHero(siteRoot);
    initializeHomeMomentum();
    initializeHomeConviction();
    initializeHomeReallyStack();
    initializeHomeSystems();
    siteLoader.markBootstrapped();

    await Promise.all([heroReadyPromise, waitForWindowLoad()]);
  } catch (error) {
    console.error("BiB application bootstrap failed.", error);
    await Promise.allSettled([heroReadyPromise, waitForWindowLoad()]);
  } finally {
    await siteLoader.complete();
  }

  document.documentElement.classList.remove("no-js");
  document.documentElement.dataset.ui = "ready";
  document.body.dataset.ui = "ready";
  document.body.removeAttribute("aria-busy");

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
