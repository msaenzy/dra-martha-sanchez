// site-data.js — aplica en la página los datos editables del Panel web (Google Sheet).
// Estrategia: el HTML ya trae los datos por defecto (bueno para SEO y si el Sheet falla).
// Al cargar: 1) aplica la última copia guardada (sin parpadeo), 2) pide datos frescos a la API.
import { SHEET_API_URL, DEFAULTS } from "../config/site-data.js";

const CACHE_KEY = "ms-site-data-v1";
const TIMEOUT_MS = 7000;
export const siteData = { ...DEFAULTS };

/** Cualquier formato → dígitos internacionales (igual que el backend). 0979530787 → 593979530787 */
const digits = (v) => {
  let d = String(v || "").replace(/\D/g, "");
  if (/^00\d+/.test(d)) d = d.slice(2);
  if (/^0\d{8,9}$/.test(d)) d = "593" + d.slice(1);
  if (/^9\d{8}$/.test(d)) d = "593" + d;
  return /^\d{10,15}$/.test(d) ? d : "";
};
/** 593979530787 → "097 953 0787" (como se lee en la web) */
export const phoneDisplay = (v) => {
  const d = digits(v); let m;
  if ((m = d.match(/^593(9\d)(\d{3})(\d{4})$/))) return `0${m[1]} ${m[2]} ${m[3]}`;
  if ((m = d.match(/^593(\d)(\d{3})(\d{4})$/))) return `0${m[1]} ${m[2]} ${m[3]}`;
  return d ? "+" + d : "";
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch { return null; } };
const writeCache = (d) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch { /* sin almacenamiento */ } };

/** Pares [texto viejo → texto nuevo] a reemplazar en textos y atributos visibles. */
function replacementPairs(cur, next) {
  const pairs = [];
  const add = (a, b) => { if (a && b && a !== b) pairs.push([a, b]); };
  const lugarCur = cur.direccion_detalle ? `${cur.lugar_nombre}, ${cur.direccion_detalle}` : cur.lugar_nombre;
  const lugarNext = next.direccion_detalle ? `${next.lugar_nombre}, ${next.direccion_detalle}` : next.lugar_nombre;
  add(lugarCur, lugarNext);                       // primero el más largo
  add(cur.lugar_nombre, next.lugar_nombre);
  add(cur.lugar_corto, next.lugar_corto);
  add(phoneDisplay(cur.telefono), phoneDisplay(next.telefono));
  [[cur.horario_manana, next.horario_manana], [cur.horario_tarde, next.horario_tarde]].forEach(([a, b]) => {
    add(a, b);
    add(a.replace(" a ", "–"), b.replace(" a ", "–"));   // variante "8:00–13:00" del pie de página
  });
  add(cur.dias_atencion, next.dias_atencion);
  add(cap(cur.dias_atencion), cap(next.dias_atencion));
  add("@" + cur.instagram_usuario, "@" + next.instagram_usuario);
  add(cur.ciudad, next.ciudad);
  add(cur.pais, next.pais);
  return pairs;
}

const replaceAll = (text, pairs) => pairs.reduce((t, [a, b]) => t.split(a).join(b), text);

function apply(next) {
  const cur = { ...siteData };
  next = { ...DEFAULTS, ...cur, ...Object.fromEntries(Object.entries(next || {}).filter(([, v]) => v !== undefined && v !== null)) };
  if (!digits(next.telefono)) next.telefono = cur.telefono;   // nunca aplicar un número inválido
  const pairs = replacementPairs(cur, next);

  // 1) Textos visibles
  if (pairs.length) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => { const t = replaceAll(n.nodeValue, pairs); if (t !== n.nodeValue) n.nodeValue = t; });
    document.querySelectorAll("[alt],[aria-label],[title],[placeholder],option[value]").forEach((el) => {
      ["alt", "aria-label", "title", "placeholder", "value"].forEach((attr) => {
        const v = el.getAttribute(attr); if (!v) return;
        const t = replaceAll(v, pairs); if (t !== v) el.setAttribute(attr, t);
      });
    });
  }

  // 2) Enlaces
  const wa = digits(next.telefono) || digits(DEFAULTS.telefono), tel = wa;   // un solo número para todo
  const q = [next.lugar_nombre, next.direccion_detalle, next.ciudad, next.pais].filter(Boolean).join(" ");
  const mapsLink = next.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (href.startsWith("https://wa.me/")) {
      const u = new URL(href);
      const text = u.searchParams.get("text");
      let out = `https://wa.me/${wa}`;
      if (text) out += "?text=" + encodeURIComponent(replaceAll(text, pairs));
      a.setAttribute("href", out);
    } else if (href.startsWith("tel:")) a.setAttribute("href", "tel:+" + tel);
    else if (href.includes("google.com/maps")) a.setAttribute("href", mapsLink);
    else if (/instagram\.com\/[^/]+\/?(reels\/)?$/.test(href) && !/\/(reel|p)\//.test(href)) {
      a.setAttribute("href", href.replace(/instagram\.com\/[^/]+/, "instagram.com/" + next.instagram_usuario));
    } else if (href.startsWith("https://ig.me/m/")) a.setAttribute("href", "https://ig.me/m/" + next.instagram_usuario);
  });
  document.querySelectorAll('iframe[src*="google.com/maps"]').forEach((f) => {
    const src = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    if (f.getAttribute("src") !== src && JSON.stringify([cur.lugar_nombre, cur.direccion_detalle, cur.ciudad, cur.pais]) !== JSON.stringify([next.lugar_nombre, next.direccion_detalle, next.ciudad, next.pais])) f.setAttribute("src", src);
  });

  // 3) Facebook / TikTok en el pie de página (solo si tienen enlace)
  const social = document.querySelector(".site-footer__social");
  if (social) {
    [["facebook_url", "Facebook", '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>'],
     ["tiktok_url", "TikTok", '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.8 2.4 4.5 5 4.8"/>']].forEach(([k, name, path]) => {
      let a = social.querySelector(`[data-social="${k}"]`);
      if (!next[k]) { a?.remove(); return; }
      if (!a) {
        a = document.createElement("a"); a.dataset.social = k; a.target = "_blank"; a.rel = "noopener";
        a.setAttribute("aria-label", `${name} de la Dra. Martha Sánchez`);
        a.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
        social.appendChild(a);
      }
      a.href = next[k];
    });
  }

  // 4) Datos estructurados para Google
  const ld = document.querySelector('script[type="application/ld+json"]');
  if (ld) {
    try {
      const json = JSON.parse(ld.textContent);
      const doc = (json["@graph"] || []).find((n) => n["@id"] && n["@id"].endsWith("#doctora"));
      if (doc) {
        doc.telephone = "+" + tel;
        doc.address = { ...doc.address, streetAddress: [next.lugar_nombre, next.direccion_detalle].filter(Boolean).join(", "), addressLocality: next.ciudad, addressRegion: next.provincia, addressCountry: next.pais === "Ecuador" ? "EC" : next.pais };
        doc.areaServed = { "@type": "City", name: next.ciudad };
        doc.hasMap = mapsLink;
        doc.potentialAction = { ...doc.potentialAction, target: `https://wa.me/${wa}` };
        doc.sameAs = [`https://www.instagram.com/${next.instagram_usuario}/`, next.facebook_url, next.tiktok_url].filter(Boolean);
        ld.textContent = JSON.stringify(json);
      }
    } catch { /* JSON-LD intacto */ }
  }

  Object.assign(siteData, next);
}

export function initSiteData() {
  const cached = readCache();
  if (cached && cached.data) apply(cached.data);
  if (!SHEET_API_URL) return;

  const ctrl = "AbortController" in window ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), TIMEOUT_MS);
  fetch(`${SHEET_API_URL}?api=config&t=${Date.now()}`, { signal: ctrl?.signal, redirect: "follow" })
    .then((r) => r.json())
    .then((res) => {
      if (!res || !res.ok || !res.data) return;
      apply(res.data);
      writeCache({ data: res.data, at: Date.now() });
    })
    .catch(() => { /* sin conexión: se quedan los datos del HTML o la copia guardada */ })
    .finally(() => clearTimeout(timer));
}
