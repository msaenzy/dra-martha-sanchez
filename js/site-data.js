// site-data.js — v5.3 · aplica en la página los datos editables del Panel web (Google Sheet + Apps Script).
// • El HTML trae los datos por defecto (SEO y respaldo si el Sheet falla).
// • Al cargar: 1) aplica la última copia guardada, 2) pide datos frescos a la API y actualiza TODO
//   (textos, enlaces de WhatsApp, llamadas, Maps, Instagram, Facebook/TikTok y datos para Google).
// • Logs en la consola del navegador (F12 → Consola) con el prefijo [Panel web].
// • Diagnóstico visible: abre la web con ?debug=1 (o #debug) y aparece un recuadro con el estado.
// • En consola: MS_SITE.status, MS_SITE.log, MS_SITE.refresh(), MS_SITE.clearCache().
import { SHEET_API_URL, DEFAULTS } from "../config/site-data.js?v=5.3";

const VERSION = "web v5.3";
const CACHE_KEY = "ms-site-data-v2";
const TIMEOUT_MS = 12000;
const DEBUG = /[?&]debug=1\b/.test(location.search) || location.hash === "#debug";

export const siteData = { ...DEFAULTS };
const state = { status: "inicio", version: VERSION, api: SHEET_API_URL || "(sin configurar)", lastSync: null, source: "html", backend: null, log: [] };

/* ------------------------------------------------------------------ logs */
const STYLES = { info: "color:#7b4fc0;font-weight:700", ok: "color:#2c9d55;font-weight:700", warn: "color:#e39a1b;font-weight:700", error: "color:#d9476d;font-weight:700" };
function log(level, msg, extra) {
  const time = new Date().toLocaleTimeString("es-EC", { hour12: false });
  state.log.push({ time, level, msg, extra });
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  extra !== undefined ? fn(`%c[Panel web]%c ${msg}`, STYLES[level], "", extra) : fn(`%c[Panel web]%c ${msg}`, STYLES[level], "");
  renderDebug();
}

/* ------------------------------------------------------------------ utilidades */
/** Cualquier formato → dígitos internacionales (igual que el backend). 0979530787 → 593979530787 */
const digits = (v) => {
  let d = String(v || "").replace(/\D/g, "");
  if (/^00\d+/.test(d)) d = d.slice(2);
  if (/^0\d{8,9}$/.test(d)) d = "593" + d.slice(1);
  if (/^9\d{8}$/.test(d)) d = "593" + d;
  return /^\d{10,15}$/.test(d) ? d : "";
};
/** 593979530787 → "097 953 0787" */
export const phoneDisplay = (v) => {
  const d = digits(v); let m;
  if ((m = d.match(/^593(9\d)(\d{3})(\d{4})$/))) return `0${m[1]} ${m[2]} ${m[3]}`;
  if ((m = d.match(/^593(\d)(\d{3})(\d{4})$/))) return `0${m[1]} ${m[2]} ${m[3]}`;
  return d ? "+" + d : "";
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch { return null; } };
const writeCache = (d) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch { /* sin almacenamiento */ } };
const clean = (s) => String(s ?? "").trim();

/** Normaliza lo que llega de la API (acepta también las claves de versiones anteriores). */
function normalize(raw) {
  const d = { ...(raw || {}) };
  if (!d.telefono && (d.whatsapp || d.telefono_llamadas)) d.telefono = d.whatsapp || d.telefono_llamadas;   // panel v5.0
  const out = {};
  Object.keys(DEFAULTS).forEach((k) => { if (d[k] !== undefined && d[k] !== null) out[k] = clean(d[k]); });
  if (out.telefono !== undefined && !digits(out.telefono)) { log("warn", `Teléfono no válido en el Sheet ("${out.telefono}"): se mantiene el anterior.`); delete out.telefono; }
  if (out.instagram_usuario) out.instagram_usuario = out.instagram_usuario.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
  ["lugar_nombre", "lugar_corto", "ciudad", "pais", "dias_atencion", "horario_manana", "horario_tarde", "instagram_usuario"].forEach((k) => {
    if (out[k] === "") { log("warn", `"${k}" está vacío en el Sheet: se mantiene el valor anterior.`); delete out[k]; }
  });
  return out;
}

/** Pares [texto actual → texto nuevo] para textos y atributos visibles. */
function replacementPairs(cur, next) {
  const pairs = [];
  const add = (a, b) => { if (a && b && a !== b && !pairs.some(([x]) => x === a)) pairs.push([a, b]); };
  const full = (o) => (o.direccion_detalle ? `${o.lugar_nombre}, ${o.direccion_detalle}` : o.lugar_nombre);
  add(full(cur), full(next));                                   // primero lo más largo
  add(cur.lugar_nombre, next.lugar_nombre);
  add(cur.lugar_corto, next.lugar_corto);
  add(phoneDisplay(cur.telefono), phoneDisplay(next.telefono));
  [[cur.horario_manana, next.horario_manana], [cur.horario_tarde, next.horario_tarde]].forEach(([a, b]) => {
    add(a, b);
    add(a.replace(" a ", "–"), b.replace(" a ", "–"));          // variante "8:00–13:00" del pie de página
  });
  add(cap(cur.dias_atencion), cap(next.dias_atencion));
  add(cur.dias_atencion, next.dias_atencion);
  add("@" + cur.instagram_usuario, "@" + next.instagram_usuario);
  add(cur.ciudad, next.ciudad);
  add(cur.pais, next.pais);
  return pairs;
}
const replaceAll = (text, pairs) => pairs.reduce((t, [a, b]) => (t.includes(a) ? t.split(a).join(b) : t), text);

/* ------------------------------------------------------------------ aplicar a la página */
function apply(incoming, source) {
  const cur = { ...siteData };
  const next = { ...cur, ...normalize(incoming) };
  const changed = Object.keys(DEFAULTS).filter((k) => clean(cur[k]) !== clean(next[k]));
  const counts = { textos: 0, atributos: 0, whatsapp: 0, llamadas: 0, mapas: 0, instagram: 0, redes: 0, jsonld: 0 };

  // 1) Textos y atributos visibles
  const pairs = replacementPairs(cur, next);
  if (pairs.length) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => { const t = replaceAll(n.nodeValue, pairs); if (t !== n.nodeValue) { n.nodeValue = t; counts.textos++; } });
    document.querySelectorAll("[alt],[aria-label],[title],[placeholder],option[value]").forEach((el) => {
      ["alt", "aria-label", "title", "placeholder", "value"].forEach((attr) => {
        const v = el.getAttribute(attr); if (!v) return;
        const t = replaceAll(v, pairs); if (t !== v) { el.setAttribute(attr, t); counts.atributos++; }
      });
    });
  }

  // 2) Enlaces (siempre se reescriben desde los datos: así no dependen del texto anterior)
  const tel = digits(next.telefono) || digits(DEFAULTS.telefono);
  const q = [next.lugar_nombre, next.direccion_detalle, next.ciudad, next.pais].filter(Boolean).join(" ");
  const mapsLink = next.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const ig = next.instagram_usuario || DEFAULTS.instagram_usuario;
  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    let out = href;
    if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) {
      const u = new URL(href);
      const text = u.searchParams.get("text");
      out = `https://wa.me/${tel}` + (text ? "?text=" + encodeURIComponent(replaceAll(text, pairs)) : "");
      if (out !== href) counts.whatsapp++;
    } else if (href.startsWith("tel:")) {
      out = "tel:+" + tel; if (out !== href) counts.llamadas++;
    } else if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/.test(href)) {
      out = mapsLink; if (out !== href) counts.mapas++;
    } else if (/instagram\.com\//.test(href) && !/\/(reel|p|tv)\//.test(href)) {
      out = href.replace(/instagram\.com\/[^/?#]+/, "instagram.com/" + ig); if (out !== href) counts.instagram++;
    } else if (href.startsWith("https://ig.me/m/")) {
      out = "https://ig.me/m/" + ig; if (out !== href) counts.instagram++;
    }
    if (out !== href) a.setAttribute("href", out);
  });
  document.querySelectorAll('iframe[src*="google.com/maps"]').forEach((f) => {
    const src = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
    if (f.getAttribute("src") !== src && (changed.some((k) => ["lugar_nombre", "direccion_detalle", "ciudad", "pais"].includes(k)))) { f.setAttribute("src", src); counts.mapas++; }
  });

  // 3) Facebook / TikTok en el pie de página (solo si tienen enlace)
  const social = document.querySelector(".site-footer__social");
  if (social) {
    [["facebook_url", "Facebook", '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>'],
     ["tiktok_url", "TikTok", '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.8 2.4 4.5 5 4.8"/>']].forEach(([k, name, path]) => {
      let a = social.querySelector(`[data-social="${k}"]`);
      if (!next[k]) { if (a) { a.remove(); counts.redes++; } return; }
      if (!a) {
        a = document.createElement("a"); a.dataset.social = k; a.target = "_blank"; a.rel = "noopener";
        a.setAttribute("aria-label", `${name} de la Dra. Martha Sánchez`);
        a.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
        social.appendChild(a);
      }
      if (a.getAttribute("href") !== next[k]) { a.href = next[k]; counts.redes++; }
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
        doc.potentialAction = { ...doc.potentialAction, target: `https://wa.me/${tel}` };
        doc.sameAs = [`https://www.instagram.com/${ig}/`, next.facebook_url, next.tiktok_url].filter(Boolean);
        const txt = JSON.stringify(json);
        if (txt !== ld.textContent) { ld.textContent = txt; counts.jsonld++; }
      }
    } catch (e) { log("warn", "No se pudo actualizar el JSON-LD", e); }
  }

  Object.assign(siteData, next);
  state.source = source;
  document.documentElement.dataset.sheetData = source;

  const resumen = Object.entries(counts).filter(([, n]) => n).map(([k, n]) => `${k}: ${n}`).join(" · ") || "sin cambios en la página";
  if (changed.length) {
    log("ok", `Datos aplicados desde ${source}. Campos distintos al HTML/última versión: ${changed.join(", ")}. Actualizados → ${resumen}`);
    console.table(Object.fromEntries(changed.map((k) => [k, { antes: cur[k], ahora: next[k] }])));
  } else {
    log("info", `Datos desde ${source} iguales a los que ya muestra la página (nada que cambiar).`);
  }
  return { changed, counts };
}

/* ------------------------------------------------------------------ conexión con la API */
function diagnose(err, res, body) {
  if (err && err.name === "AbortError") return `La API no respondió en ${TIMEOUT_MS / 1000} s. Apps Script puede tardar la primera vez; recarga la página.`;
  if (err && /Failed to fetch|NetworkError|Load failed/i.test(err.message || "")) {
    return "El navegador bloqueó la respuesta (CORS) o no hay internet. Causa más común: la Aplicación web NO está con acceso \"Cualquier persona\", o la URL /exec es de otra implementación. Abre la URL de la API en una pestaña y revisa qué muestra.";
  }
  if (res && !res.ok) return `La API respondió HTTP ${res.status}. Revisa que la implementación exista y esté activa.`;
  if (body !== undefined && /^\s*</.test(body)) {
    return /accounts\.google\.com|ServiceLogin|Iniciar sesión|Sign in/i.test(body)
      ? "La API pide iniciar sesión en Google: cambia el acceso de la Aplicación web a \"Cualquier persona\" y crea una versión nueva."
      : "La API devolvió una página HTML en vez de datos: hay un error en el script o la URL /exec apunta al panel de otra versión. Implementar → Gestionar implementaciones → Versión nueva.";
  }
  return err ? err.message || String(err) : "Respuesta desconocida.";
}

async function sync(reason = "carga de la página") {
  if (!SHEET_API_URL) { state.status = "desactivado"; log("warn", "SHEET_API_URL está vacío en config/site-data.js: la web usa los datos del HTML."); return; }
  const url = `${SHEET_API_URL}?api=config${DEBUG ? "&nocache=1" : ""}&t=${Date.now()}`;
  state.status = "conectando";
  log("info", `Conectando con el Panel web (${reason})…`, url);
  const t0 = performance.now();
  const ctrl = "AbortController" in window ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), TIMEOUT_MS);
  let res, body;
  try {
    res = await fetch(url, { signal: ctrl?.signal, redirect: "follow", cache: "no-store" });
    body = await res.text();
    const ms = Math.round(performance.now() - t0);
    if (!res.ok) throw new Error("HTTP " + res.status);
    let json;
    try { json = JSON.parse(body); } catch { throw Object.assign(new Error("Respuesta no es JSON"), { notJson: true }); }
    if (!json.ok || !json.data) throw new Error(json.error || "La API respondió ok:false");
    state.backend = json.meta || null;
    log("ok", `Conectado en ${ms} ms · HTTP ${res.status} · backend ${json.meta?.version || "(versión anterior a v5.3)"} · origen ${json.meta?.origen || "?"} · ${Object.keys(json.data).length} claves · última edición en el Sheet: ${json.actualizado || "—"}`);
    if (!json.meta) log("warn", "El Apps Script publicado es una versión anterior. Pega el Codigo.gs v5.3 y crea una Versión nueva de la implementación para ver más detalles.");
    console.log("%c[Panel web]%c Datos recibidos:", STYLES.info, "", json.data);
    apply(json.data, "Google Sheet");
    writeCache({ data: json.data, at: Date.now() });
    state.status = "conectado";
    state.lastSync = new Date().toISOString();
  } catch (err) {
    state.status = "error";
    log("error", "No se pudo actualizar desde el Google Sheet. " + diagnose(err.notJson ? null : err, res, body), body ? body.slice(0, 300) : err);
  } finally {
    clearTimeout(timer);
    renderDebug();
  }
}

/* ------------------------------------------------------------------ recuadro de diagnóstico (?debug=1) */
let box;
function renderDebug() {
  if (!DEBUG || !document.body) return;
  if (!box) {
    box = document.createElement("aside");
    box.setAttribute("aria-label", "Diagnóstico del Panel web");
    box.style.cssText = "position:fixed;z-index:9999;left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));width:min(92vw,30rem);max-height:45vh;overflow:auto;background:#2b2140;color:#efe7fb;border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.35);font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;padding:12px 14px";
    document.body.appendChild(box);
  }
  const color = { conectado: "#5fcf8a", error: "#ff8cab", conectando: "#ffc93c" }[state.status] || "#b9abd0";
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  box.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px"><b style="font-size:13px">Panel web · ${esc(VERSION)}</b><span style="color:${color};font-weight:700">● ${esc(state.status)}</span></div>
    <div style="opacity:.8;word-break:break-all">API: ${esc(state.api)}</div>
    <div style="opacity:.8">Backend: ${esc(state.backend ? `${state.backend.version} · ${state.backend.origen} · generado ${state.backend.generado}` : "—")} · Fuente: ${esc(state.source)}</div>
    <hr style="border:0;border-top:1px solid rgba(255,255,255,.12);margin:8px 0">
    ${state.log.slice(-12).map((l) => `<div style="color:${{ ok: "#5fcf8a", warn: "#ffc93c", error: "#ff8cab" }[l.level] || "#efe7fb"}">${esc(l.time)} · ${esc(l.msg)}</div>`).join("")}
    <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><button type="button" data-ms="refresh" style="cursor:pointer;border:0;border-radius:99px;padding:5px 12px;background:#ffc93c;color:#2b2140;font:inherit;font-weight:700">Reintentar</button><button type="button" data-ms="clear" style="cursor:pointer;border:0;border-radius:99px;padding:5px 12px;background:#efe7fb;color:#2b2140;font:inherit;font-weight:700">Borrar copia guardada</button></div>`;
  box.querySelector('[data-ms="refresh"]').onclick = () => sync("reintento manual");
  box.querySelector('[data-ms="clear"]').onclick = () => { window.MS_SITE.clearCache(); location.reload(); };
}

/* ------------------------------------------------------------------ inicio */
export function initSiteData() {
  window.MS_SITE = {
    get status() { return { ...state, log: undefined, data: { ...siteData } }; },
    get log() { return state.log; },
    refresh: () => sync("MS_SITE.refresh()"),
    clearCache: () => { try { localStorage.removeItem(CACHE_KEY); localStorage.removeItem("ms-site-data-v1"); } catch { /* */ } log("info", "Copia guardada borrada."); },
  };
  log("info", `${VERSION} · API: ${SHEET_API_URL || "(sin configurar)"}${DEBUG ? " · modo diagnóstico" : ""}`);
  try { localStorage.removeItem("ms-site-data-v1"); } catch { /* copia de la versión anterior */ }

  const cached = readCache();
  if (cached && cached.data) {
    const min = Math.round((Date.now() - (cached.at || 0)) / 60000);
    log("info", `Aplicando copia guardada en este navegador (hace ${min} min) mientras llegan los datos frescos.`);
    apply(cached.data, "copia guardada");
  }
  sync();
  // Si la pestaña vuelve a estar visible después de un rato, refresca los datos
  let hidden = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hidden = Date.now();
    else if (hidden && Date.now() - hidden > 60000) sync("regreso a la pestaña");
  });
}
