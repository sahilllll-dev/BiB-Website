const OPEN_CLASS = "is-open";

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

export const initializeHomeCaseStudies = () => {
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
};
