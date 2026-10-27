// carousel.js — carruseles con scroll-snap: flechas, puntos, arrastre con mouse, teclado y autoplay.
// Hooks: [data-carousel] > .carousel__track > .carousel__slide · .carousel__btn--prev/--next · [data-dots]
// data-autoplay="4000" activa el avance automático (se pausa con hover, foco, toque o fuera de pantalla).
export function initCarousels() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-carousel]").forEach((root) => {
    const track = root.querySelector(".carousel__track");
    const slides = [...root.querySelectorAll(".carousel__slide")];
    const prev = root.querySelector(".carousel__btn--prev");
    const next = root.querySelector(".carousel__btn--next");
    const dotsBox = root.querySelector("[data-dots]");
    if (!track || !slides.length) return;

    prev?.removeAttribute("hidden"); next?.removeAttribute("hidden");
    track.setAttribute("aria-label", root.getAttribute("aria-label") || "Carrusel");
    const dots = slides.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", `Ir al elemento ${i + 1} de ${slides.length}`);
      b.addEventListener("click", () => goTo(i));
      dotsBox?.append(b); return b;
    });

    const step = () => (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : slides[0].offsetWidth);
    const maxLeft = () => track.scrollWidth - track.clientWidth;
    const current = () => Math.min(slides.length - 1, Math.round(track.scrollLeft / step()));
    const goTo = (i) => track.scrollTo({ left: Math.min(i * step(), maxLeft()), behavior: reduce ? "auto" : "smooth" });

    const sync = () => {
      const i = track.scrollLeft >= maxLeft() - 4 ? slides.length - 1 : current();
      dots.forEach((d, k) => d.setAttribute("aria-current", String(k === i)));
    };
    track.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
    prev?.addEventListener("click", () => goTo(Math.max(0, current() - 1)));
    next?.addEventListener("click", () => (track.scrollLeft >= maxLeft() - 4 ? goTo(0) : goTo(current() + 1)));
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(current() + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(Math.max(0, current() - 1)); }
    });
    window.addEventListener("resize", sync);
    sync();

    // Arrastrar con mouse (en táctil ya funciona el swipe nativo)
    let down = false, startX = 0, startLeft = 0, moved = false;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 6) { moved = true; track.classList.add("is-dragging"); }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      if (moved) { track.classList.remove("is-dragging"); goTo(current()); }
    });
    track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

    // Autoplay
    const every = Number(root.dataset.autoplay || 0);
    if (!every || reduce) return;
    let paused = false, inView = false;
    const pause = () => (paused = true), resume = () => (paused = false);
    ["pointerenter", "focusin", "touchstart"].forEach((t) => root.addEventListener(t, pause, { passive: true }));
    ["pointerleave", "focusout", "touchend"].forEach((t) => root.addEventListener(t, resume, { passive: true }));
    if ("IntersectionObserver" in window) new IntersectionObserver(([en]) => (inView = en.isIntersecting), { threshold: 0.35 }).observe(root);
    else inView = true;
    setInterval(() => {
      if (paused || !inView || document.hidden || down) return;
      track.scrollLeft >= maxLeft() - 4 ? goTo(0) : goTo(current() + 1);
    }, every);
  });
}
