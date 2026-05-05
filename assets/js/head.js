(() => {
  const html = document.documentElement;
  const head = document.head;

  html.classList.remove("no-js");
  html.classList.add("js");

  const normalizeRoot = (value) => String(value || ".").replace(/\/$/, "");

  const resolveRoute = (siteRoot, route = "") => {
    if (/^(https?:)?\/\//.test(route) || route.startsWith("mailto:") || route.startsWith("tel:")) {
      return route;
    }

    const cleanRoot = normalizeRoot(siteRoot);
    const cleanRoute = route.replace(/^\.?\//, "");

    if (!cleanRoute) {
      return cleanRoot;
    }

    return `${cleanRoot}/${cleanRoute}`.replace(/\/{2,}/g, "/");
  };

  const upsertMeta = ({ name, property, content, key }) => {
    if (!content) {
      return;
    }

    const selectors = [];

    if (key) {
      selectors.push(`[data-bib-head="${key}"]`);
    }

    if (name) {
      selectors.push(`meta[name="${name}"]`);
    }

    if (property) {
      selectors.push(`meta[property="${property}"]`);
    }

    let node = head.querySelector(selectors.join(", "));

    if (!node) {
      node = document.createElement("meta");

      if (name) {
        node.setAttribute("name", name);
      }

      if (property) {
        node.setAttribute("property", property);
      }

      if (key) {
        node.setAttribute("data-bib-head", key);
      }

      head.append(node);
    }

    node.setAttribute("content", content);
  };

  const upsertLink = (key, attributes) => {
    let node = head.querySelector(`link[data-bib-head="${key}"]`);

    if (!node) {
      node = document.createElement("link");
      node.setAttribute("data-bib-head", key);
      head.append(node);
    }

    Object.entries(attributes).forEach(([attribute, value]) => {
      if (value === false || value === null || value === undefined) {
        return;
      }

      if (value === true) {
        node.setAttribute(attribute, "");
        return;
      }

      node.setAttribute(attribute, value);
    });
  };

  const upsertScript = (key, attributes = {}, inlineCode = "") => {
    let node = head.querySelector(`script[data-bib-head="${key}"]`);

    if (!node) {
      node = document.createElement("script");
      node.setAttribute("data-bib-head", key);
      head.append(node);
    }

    Object.entries(attributes).forEach(([attribute, value]) => {
      if (value === false || value === null || value === undefined) {
        return;
      }

      if (value === true) {
        node.setAttribute(attribute, "");
        return;
      }

      node.setAttribute(attribute, value);
    });

    if (inlineCode) {
      node.textContent = inlineCode;
    }
  };

  const siteRoot = normalizeRoot(html.dataset.siteRoot || (window.location.pathname.includes("/pages/") ? ".." : "."));
  const siteName = html.dataset.siteName?.trim() || "BiB (Business Into Brands)";
  const siteUrl = html.dataset.siteUrl?.trim();
  const pagePath = html.dataset.pagePath?.trim() || window.location.pathname;
  const pageTitle = document.title.trim() || siteName;
  const descriptionNode = head.querySelector('meta[name="description"]');
  const robotsNode = head.querySelector('meta[name="robots"]');
  const pageDescription = descriptionNode?.getAttribute("content")?.trim() || "";
  const pageRobots = robotsNode?.getAttribute("content")?.trim() || "index, follow";
  const pageImage = html.dataset.pageImage?.trim();

  upsertLink("fonts-preconnect", {
    rel: "preconnect",
    href: "https://fonts.googleapis.com"
  });

  upsertLink("fonts-crossorigin", {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossorigin: true
  });

  upsertLink("fonts-stylesheet", {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap"
  });

  upsertMeta({
    name: "theme-color",
    content: "#0f172a",
    key: "theme-color"
  });

  upsertMeta({
    name: "robots",
    content: pageRobots,
    key: "robots"
  });

  upsertMeta({
    property: "og:site_name",
    content: siteName,
    key: "og-site-name"
  });

  upsertMeta({
    property: "og:type",
    content: "website",
    key: "og-type"
  });

  upsertMeta({
    property: "og:title",
    content: pageTitle,
    key: "og-title"
  });

  upsertMeta({
    property: "og:description",
    content: pageDescription,
    key: "og-description"
  });

  upsertMeta({
    name: "twitter:card",
    content: pageImage ? "summary_large_image" : "summary",
    key: "twitter-card"
  });

  upsertMeta({
    name: "twitter:title",
    content: pageTitle,
    key: "twitter-title"
  });

  upsertMeta({
    name: "twitter:description",
    content: pageDescription,
    key: "twitter-description"
  });

  if (siteUrl) {
    const canonicalUrl = new URL(pagePath, siteUrl).toString();

    upsertLink("canonical", {
      rel: "canonical",
      href: canonicalUrl
    });

    upsertMeta({
      property: "og:url",
      content: canonicalUrl,
      key: "og-url"
    });
  }

  if (pageImage) {
    const socialImageUrl = siteUrl ? new URL(pageImage, siteUrl).toString() : resolveRoute(siteRoot, pageImage);

    upsertMeta({
      property: "og:image",
      content: socialImageUrl,
      key: "og-image"
    });

    upsertMeta({
      name: "twitter:image",
      content: socialImageUrl,
      key: "twitter-image"
    });
  }

  const registerGlobalHeadTags = () => {
    upsertScript("ga-loader", {
      async: true,
      src: "https://www.googletagmanager.com/gtag/js?id=G-LKCWRZ2T9Y"
    });

    upsertScript(
      "ga-config",
      {},
      "window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-LKCWRZ2T9Y');"
    );
  };

  registerGlobalHeadTags();
})();
