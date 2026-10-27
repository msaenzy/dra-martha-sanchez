// navigation.js — dirección de scroll, header que se oculta/reaparece y menú móvil accesible.
// Hooks HTML: [data-header] · [data-nav-toggle] (botón) · [data-nav-menu] (lista de enlaces).
// Expone en <html>: data-scroll-dir="up|down", data-scrolled="true|false".
export function initNavigation() {
  const root = document.documentElement;
  const header = document.querySelector("[data-header]");
  if (!header) return;
  const toggle = header.querySelector("[data-nav-toggle]");
  const menu = header.querySelector("[data-nav-menu]");
  const BREAKPOINT = Number(header.dataset.navBreakpoint || 768);
  const THRESHOLD = 8;      // px mínimos de movimiento para cambiar de dirección
  const HIDE_AFTER = 96;    // no ocultar cerca del tope
  let lastY = window.scrollY;
  let ticking = false;
  let menuOpen = false;

  const setMenu = (open, { restoreFocus = true } = {}) => {
    menuOpen = open;
    header.dataset.menuOpen = String(open);
    root.classList.toggle("menu-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? toggle.dataset.labelClose || "Cerrar menú" : toggle.dataset.labelOpen || "Abrir menú");
    }
    if (open) { header.classList.remove("is-hidden"); menu?.querySelector("a, button")?.focus(); }
    else if (restoreFocus) toggle?.focus();
  };

  const update = () => {
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    if (Math.abs(delta) >= THRESHOLD) {
      root.dataset.scrollDir = delta > 0 ? "down" : "up";
      lastY = y;
    }
    root.dataset.scrolled = String(y > HIDE_AFTER);
    const hide = root.dataset.scrollDir === "down" && y > HIDE_AFTER && !menuOpen && !header.contains(document.activeElement);
    header.classList.toggle("is-hidden", hide);
    ticking = false;
  };

  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  header.addEventListener("focusin", () => header.classList.remove("is-hidden")); // teclado: nunca perder la navegación
  update();

  if (toggle && menu) {
    toggle.addEventListener("click", () => setMenu(!menuOpen));
    menu.addEventListener("click", (e) => { if (e.target.closest("a") && menuOpen) setMenu(false, { restoreFocus: false }); });
    document.addEventListener("keydown", (e) => {
      if (!menuOpen) return;
      if (e.key === "Escape") { setMenu(false); return; }
      if (e.key === "Tab") { // trampa de foco simple dentro del header mientras el menú está abierto
        const f = [...header.querySelectorAll("a[href], button:not([disabled])")].filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia(`(min-width: ${BREAKPOINT}px)`).addEventListener("change", (e) => { if (e.matches && menuOpen) setMenu(false, { restoreFocus: false }); });
    setMenu(false, { restoreFocus: false });
  }
}
