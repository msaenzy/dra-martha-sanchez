// animations.js — scroll reveals con IntersectionObserver (+ parallax sutil opcional).
// Uso: <div data-reveal="fade-up"> · variantes en css/motion.css.
// Grupos con stagger: <ul data-reveal-group="fade-up" data-stagger="80"> hijos se animan en cascada.
export function initAnimations() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    const variant = group.dataset.revealGroup || "fade-up";
    const step = Number(group.dataset.stagger || 80);
    [...group.children].forEach((child, i) => {
      if (!child.hasAttribute("data-reveal")) child.setAttribute("data-reveal", variant);
      child.style.setProperty("--reveal-delay", `${i * step}ms`);
    });
  });

  const items = [...document.querySelectorAll("[data-reveal]")];
  const show = (el) => el.classList.add("is-visible");
  if (reduce || !("IntersectionObserver" in window)) { items.forEach(show); return; }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); } });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  items.forEach((el) => io.observe(el));

  // Parallax sutil: <img data-parallax="0.12"> (factor pequeño; solo elementos visibles)
  const par = [...document.querySelectorAll("[data-parallax]")];
  if (!par.length) return;
  const visible = new Set();
  const pio = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))));
  par.forEach((el) => pio.observe(el));
  let ticking = false;
  const tick = () => {
    visible.forEach((el) => {
      const r = el.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * Number(el.dataset.parallax || 0.1);
      el.style.transform = `translate3d(0, ${(-offset).toFixed(1)}px, 0)`;
    });
    ticking = false;
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
  tick();
}
