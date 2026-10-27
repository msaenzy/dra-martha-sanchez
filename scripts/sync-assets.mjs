#!/usr/bin/env node
// sync-assets.mjs — alinea el atributo src de cada [data-asset] con config/assets.js (fallback sin JS).
// Uso: node scripts/sync-assets.mjs [--check]   (--check no escribe; sale con 1 si hay diferencias)
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const { assets } = await import(pathToFileURL(join(root, "config/assets.js")).href);
const lookup = (key) => key.split(".").reduce((o, k) => (o == null ? o : o[k]), assets);

const pages = [];
if (existsSync(join(root, "index.html"))) pages.push("index.html");
if (existsSync(join(root, "pages"))) for (const f of readdirSync(join(root, "pages"))) if (f.endsWith(".html")) pages.push(join("pages", f));

let problems = 0, changed = 0;
for (const rel of pages) {
  const file = join(root, rel);
  const base = rel.startsWith("pages") ? "../" : "./";
  const html = readFileSync(file, "utf8");
  const out = html.replace(/<(img|source)\b[^>]*\bdata-asset="([^"]+)"[^>]*>/g, (tag, name, key) => {
    const p = lookup(key);
    if (typeof p !== "string") { console.error(`✖ ${rel}: clave inexistente en assets.js → ${key}`); problems++; return tag; }
    const url = base === "./" ? p : p.replace(/^\.\//, base);
    const target = join(root, p.replace(/^\.\//, ""));
    if (!existsSync(target) || !statSync(target).isFile()) { console.error(`✖ ${rel}: el archivo no existe → ${p} (clave ${key})`); problems++; }
    const attr = name === "source" ? "srcset" : "src";
    const re = new RegExp(`\\b${attr}="[^"]*"`);
    const next = re.test(tag) ? tag.replace(re, `${attr}="${url}"`) : tag.replace(/<(img|source)/, `<$1 ${attr}="${url}"`);
    if (next !== tag) changed++;
    return next;
  });
  if (out !== html && !check) writeFileSync(file, out);
}
if (check && changed) { console.error(`✖ ${changed} src desalineados con assets.js (ejecuta: node scripts/sync-assets.mjs)`); process.exit(1); }
if (problems) process.exit(1);
console.log(`✔ assets sincronizados (${pages.length} página(s), ${changed} actualización(es))`);
