// animations.js — reveals BIDIRECCIONALES (se repiten al bajar y al subir), titular palabra por palabra,
// parallax de stickers y barra de progreso. Sin librerías. Respeta prefers-reduced-motion.
export function initAnimations() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Grupos con stagger: <ul data-reveal-group="fade-up" data-stagger="80">
  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    const variant = group.dataset.revealGroup || "fade-up";
    const step = Number(group.dataset.stagger || 80);
    [...group.children].forEach((child, i) => {
      if (!child.hasAttribute("data-reveal")) child.setAttribute("data-reveal", variant);
      child.style.setProperty("--reveal-delay", `${i * step}ms`);
    });
  });

  // Titular: cada palabra entra con su propio retraso
  document.querySelectorAll("[data-split]").forEach((el) => {
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part.trim()) { frag.append(part); return; }
            const s = document.createElement("span");
            s.className = "w"; s.style.setProperty("--i", i++); s.textContent = part; frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")));
  });

  const items = [...document.querySelectorAll("[data-reveal]")];
  const progress = document.querySelector("[data-progress]");
  if (reduce || !("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("is-visible")); }
  else {
    // Entra → .is-visible. Sale → se quita y se recuerda por dónde salió (.from-top),
    // así al volver (subiendo o bajando) el elemento entra desde ese lado.
    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting, boundingClientRect }) => {
        if (isIntersecting) { target.classList.remove("from-top"); target.classList.add("is-visible"); }
        else {
          target.classList.remove("is-visible");
          target.classList.toggle("from-top", boundingClientRect.top < 0);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach((el) => io.observe(el));
  }

  // Parallax + progreso de scroll (una sola pasada por frame)
  const par = reduce ? [] : [...document.querySelectorAll("[data-parallax]")];
  const visible = new Set();
  if (par.length && "IntersectionObserver" in window) {
    const pio = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))), { rootMargin: "20% 0px" });
    par.forEach((el) => pio.observe(el));
  }
  let ticking = false;
  const tick = () => {
    visible.forEach((el) => {
      const r = el.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * Number(el.dataset.parallax || 0.1);
      el.style.transform = `translate3d(0, ${(-offset).toFixed(1)}px, 0)`;
    });
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty("--progress", max > 0 ? (window.scrollY / max).toFixed(4) : 0);
    }
    ticking = false;
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  tick();
}
