// Base stagger delays (ms) — spread across 150–880ms for a natural cascade
const BASE_DELAYS = [300, 720, 150, 880, 460];

export const initializePortfolioImpact = () => {
  const section = document.querySelector("[data-portfolio-impact]");
  if (!section) return;

  const images = Array.from(section.querySelectorAll(".impact-img"));
  if (images.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;

      images.forEach((img, i) => {
        // Add random jitter (0–280ms) on top of the base delay for an organic feel
        const delay = BASE_DELAYS[i] + Math.random() * 280;
        setTimeout(() => img.classList.add("is-visible"), delay);
      });

      observer.disconnect();
    },
    { threshold: 0.15 }
  );

  observer.observe(section);
};
