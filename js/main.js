// main.js — punto de entrada. Hidrata imágenes desde config/assets.js e inicia navegación y animaciones.
import { assets } from "../config/assets.js";
import { initNavigation } from "./navigation.js";
import { initAnimations } from "./animations.js";

// <html data-base="./"> en la raíz, "../" en pages/*.html
const base = document.documentElement.dataset.base || "./";
const lookup = (key) => key.split(".").reduce((o, k) => (o == null ? o : o[k]), assets);

document.querySelectorAll("[data-asset]").forEach((el) => {
  const path = lookup(el.dataset.asset);
  if (typeof path !== "string") { console.warn(`[assets] clave no encontrada: ${el.dataset.asset}`); return; }
  const url = base === "./" ? path : path.replace(/^\.\//, base);
  if (el.getAttribute("src") !== url) el.setAttribute("src", url);
});

document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

initNavigation();
initAnimations();

// Formulario → WhatsApp (sin backend): arma el mensaje y abre wa.me con los datos del formulario.
const form = document.getElementById("form-cita");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const msg = `Hola Dra. Martha, soy ${String(d.get("nombre") || "").trim()}. Quiero agendar ${d.get("motivo")} (${d.get("modalidad")}) y prefiero atención en ${d.get("horario")}. ¿Me ayudan con la cita?`;
    window.open(`https://wa.me/593979530787?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  });
}
