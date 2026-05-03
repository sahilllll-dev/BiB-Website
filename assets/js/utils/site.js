const normalizeRoot = (value) => value.replace(/\/$/, "");

export const getSiteRoot = () => {
  const configuredRoot = document.documentElement.dataset.siteRoot?.trim() || document.body?.dataset.siteRoot?.trim();

  if (configuredRoot) {
    return normalizeRoot(configuredRoot);
  }

  return window.location.pathname.includes("/pages/") ? ".." : ".";
};

export const resolveRoute = (siteRoot, route = "") => {
  if (/^(https?:)?\/\//.test(route) || route.startsWith("mailto:") || route.startsWith("tel:")) {
    return route;
  }

  const cleanRoot = normalizeRoot(siteRoot || ".");
  const cleanRoute = route.replace(/^\.?\//, "");

  if (!cleanRoute) {
    return cleanRoot;
  }

  return `${cleanRoot}/${cleanRoute}`.replace(/\/{2,}/g, "/");
};

export const normalizePath = (value) => {
  const url = new URL(value, window.location.origin);
  const normalized = url.pathname.replace(/\/index\.html$/, "").replace(/\/+$/, "");
  return normalized || "/";
};

export const applyRoutes = (scope, siteRoot) => {
  scope.querySelectorAll("[data-route]").forEach((link) => {
    const route = link.dataset.route || "";
    link.setAttribute("href", resolveRoute(siteRoot, route));
  });

  scope.querySelectorAll("[data-route-src]").forEach((asset) => {
    const route = asset.dataset.routeSrc || "";
    asset.setAttribute("src", resolveRoute(siteRoot, route));
  });
};

export const fetchComponentMarkup = async (siteRoot, componentName) => {
  const response = await fetch(resolveRoute(siteRoot, `components/${componentName}.html`));

  if (!response.ok) {
    throw new Error(`Failed to load component: ${componentName}`);
  }

  return response.text();
};
