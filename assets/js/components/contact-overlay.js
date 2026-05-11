import { resolveRoute } from "../utils/site.js";

const CONTACT_ENDPOINT_ROUTE = "api/contact.php";
const CONTACT_TRIGGER_PHRASES = [
  "get started",
  "let's talk",
  "this is the meeting most agencies skip",
  "we've seen this before",
  "tell us what the market isn't seeing",
  "start here",
  "the brief starts here",
  "we'll find what it actually is",
  "this is where it begins",
  "stop the noise. start here"
];

const normalizeTriggerText = (value = "") =>
  value
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "");

const createContactPanel = () => {
  const panel = document.createElement("div");
  panel.className = "contact-panel";
  panel.id = "contact-panel";
  panel.setAttribute("data-contact-panel", "");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "contact-panel-title");
  panel.setAttribute("aria-hidden", "true");
  panel.hidden = true;

  panel.innerHTML = `
    <div class="contact-panel-shell">
      <button class="contact-panel-close" type="button" aria-label="Close contact form" data-contact-close>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </button>

      <div class="contact-panel-grid">
        <section class="contact-panel-intro" aria-label="Contact introduction">
          <p class="contact-panel-kicker">One conversation is enough to start.</p>
          <h2 class="contact-panel-title" id="contact-panel-title">Tell us what's not working.</h2>
          <p class="contact-panel-subline">
            We don't need a brief. We need a conversation. One email is enough to start.
          </p>

          <div class="contact-panel-proof" aria-label="What to expect">
            <span>No decks.</span>
            <span>No RFPs.</span>
            <span>Just the real problem.</span>
          </div>
        </section>

        <form class="contact-form" data-contact-form novalidate>
          <div class="contact-form-grid">
            <label class="contact-field">
              <span class="contact-label-row contact-label-row--required">Name</span>
              <input class="contact-input" name="name" type="text" autocomplete="name" required />
            </label>

            <label class="contact-field">
              <span class="contact-label-row contact-label-row--required">Your email &rarr;</span>
              <input class="contact-input" name="email" type="email" autocomplete="email" required />
            </label>

            <label class="contact-field">
              <span class="contact-label-row contact-label-row--required">Brand / Company Name</span>
              <input class="contact-input" name="brand" type="text" autocomplete="organization" required />
            </label>

            <label class="contact-field">
              <span class="contact-label-row contact-label-row--required">Industry</span>
              <select class="contact-input contact-select" name="industry" required>
                <option value="">Select industry</option>
                <option value="Food/FMCG">Food/FMCG</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Political">Political</option>
                <option value="D2C/E-commerce">D2C/E-commerce</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Fashion">Fashion</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label class="contact-field contact-field--wide">
              <span class="contact-label-row">What's not working?</span>
              <textarea class="contact-input contact-textarea" name="problem" rows="4"></textarea>
            </label>

            <label class="contact-field contact-field--wide">
              <span class="contact-label-row">How did you find us?</span>
              <select class="contact-input contact-select" name="source">
                <option value="">Select one</option>
                <option value="Instagram">Instagram</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Referral">Referral</option>
                <option value="Search">Search</option>
                <option value="Event">Event</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>

          <div class="contact-form-footer">
            <p data-contact-status>No decks. No RFPs. Just a straight conversation about your brand.</p>
            <button class="contact-submit" type="submit">Let's talk.</button>
          </div>
        </form>
      </div>
    </div>
  `;

  return panel;
};

const isContactRoute = (element) => {
  const href = element.getAttribute?.("href") || "";
  const route = element.dataset?.route || "";
  return /(^|\/)pages\/contact\.html$/.test(route) || /(^|\/)pages\/contact\.html($|[?#])/.test(href);
};

const isContactTextTrigger = (element) => {
  const text = normalizeTriggerText(element.textContent);

  if (!text) {
    return false;
  }

  return CONTACT_TRIGGER_PHRASES.some((phrase) => text.includes(phrase));
};

const isContactTrigger = (element) =>
  Boolean(element?.matches?.("[data-contact-trigger]")) || isContactRoute(element) || isContactTextTrigger(element);

const setContactOrigin = (panel, trigger) => {
  const fallbackX = window.innerWidth - 42;
  const fallbackY = 42;

  if (!trigger?.getBoundingClientRect) {
    panel.style.setProperty("--contact-origin-x", `${fallbackX}px`);
    panel.style.setProperty("--contact-origin-y", `${fallbackY}px`);
    return;
  }

  const rect = trigger.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  panel.style.setProperty("--contact-origin-x", `${centerX || fallbackX}px`);
  panel.style.setProperty("--contact-origin-y", `${centerY || fallbackY}px`);
};

const closeMenuPanel = () => {
  const header = document.querySelector("[data-header]");
  const menuPanel = document.querySelector("[data-menu-panel]");
  const menuToggle = document.querySelector("[data-menu-toggle]");

  header?.classList.remove("menu-is-open");
  document.body.classList.remove("menu-open");
  menuToggle?.setAttribute("aria-expanded", "false");

  if (menuPanel) {
    menuPanel.classList.remove("is-open");
    menuPanel.hidden = true;
  }
};

const enhanceContactTriggers = () => {
  const panel = document.querySelector("[data-contact-panel]");

  document.querySelectorAll("a, button, [data-contact-trigger]").forEach((element) => {
    if (panel?.contains(element) || !isContactTrigger(element)) {
      return;
    }

    element.setAttribute("data-contact-trigger", "");
    element.setAttribute("aria-haspopup", "dialog");
    element.setAttribute("aria-controls", "contact-panel");
  });
};

export const initializeContactOverlay = (siteRoot = ".") => {
  let panel = document.querySelector("[data-contact-panel]");

  if (!panel) {
    panel = createContactPanel();
    document.body.appendChild(panel);
  }

  const form = panel.querySelector("[data-contact-form]");
  const status = panel.querySelector("[data-contact-status]");
  const submitButton = panel.querySelector(".contact-submit");
  const firstField = panel.querySelector("input, select, textarea");
  const closeButtons = panel.querySelectorAll("[data-contact-close]");
  const endpoint = resolveRoute(siteRoot, CONTACT_ENDPOINT_ROUTE);
  let lastTrigger = null;

  const defaultStatusText = status?.textContent || "";

  const setStatus = (message, type = "idle") => {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.status = type;
  };

  const openPanel = (trigger) => {
    lastTrigger = trigger || document.activeElement;
    closeMenuPanel();
    setContactOrigin(panel, trigger);
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("contact-open");

    window.requestAnimationFrame(() => {
      panel.classList.add("is-open");
      firstField?.focus({ preventScroll: true });
    });
  };

  const closePanel = () => {
    setContactOrigin(panel, lastTrigger);
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("contact-open");
  };

  const setSubmitting = (isSubmitting) => {
    if (!submitButton) {
      return;
    }

    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Sending..." : "Let's talk.";
  };

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("a, button, [data-contact-trigger]");

    if (!trigger || panel.contains(trigger) || !isContactTrigger(trigger)) {
      return;
    }

    event.preventDefault();
    openPanel(trigger);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) {
      closePanel();
    }
  });

  panel.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "clip-path" || panel.classList.contains("is-open")) {
      return;
    }

    panel.hidden = true;
    lastTrigger?.focus?.({ preventScroll: true });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closePanel);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setSubmitting(true);
    setStatus("Sending your query...", "pending");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json"
        },
        body: new FormData(form)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message || "Something went wrong. Please try again.");
      }

      form.reset();
      setStatus(defaultStatusText, "idle");
      closePanel();
    } catch (error) {
      setStatus(error.message || "Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  });

  enhanceContactTriggers();
};
