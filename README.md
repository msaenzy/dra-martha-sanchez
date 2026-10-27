# Dra. Martha Sánchez — Pediatra

Sitio estático (HTML + CSS + JavaScript nativo, sin frameworks) de la Dra. Martha Sánchez (pediatra, Guayaquil), con la estética de una referencia de diseño. Mobile-first, accesible, con scroll reveals bidireccionales, carruseles y navegación que se oculta al bajar y reaparece al subir. Se despliega solo en **GitHub Pages** con **GitHub Actions**.

## Estructura

```
index.html                 # página (secciones del diseño)
assets/images|icons|fonts  # imágenes, iconos y fuentes propias
config/assets.js           # ÚNICA fuente de rutas de imágenes
css/variables.css          # design tokens (colores, tipografía, spacing…)
css/reset.css  base.css  components.css  responsive.css  motion.css
js/main.js  navigation.js  animations.js
scripts/sync-assets.mjs    # alinea los src del HTML con config/assets.js
docs/DESIGN-ANALYSIS.md    # análisis del PDF y decisiones
.github/workflows/deploy.yml
```

## Ejecutar en local

Los módulos ES no funcionan con doble clic (`file://`). Usa un servidor local:

```bash
python3 -m http.server 8000      # o: npx serve .
# abre http://localhost:8000
```

## Imágenes

1. Copia tus archivos a `assets/images/` (ver lista de pendientes en `docs/DESIGN-ANALYSIS.md` → *MISSING ASSET*).
2. Edita la ruta en `config/assets.js` (p. ej. `hero: "./assets/images/hero.jpg"`).
3. Ejecuta `node scripts/sync-assets.mjs` (actualiza el `src` del HTML; GitHub Actions también lo hace al desplegar y falla si falta un archivo).

Mantén `width`/`height` reales en cada `<img>` para evitar saltos de layout.

## Textos, colores y fuentes

- **Textos:** directamente en `index.html`.
- **Colores:** `css/variables.css` → `--color-*`. Actualiza también `<meta name="theme-color">`.
- **Fuentes:** `--font-display`, `--font-body`, `--font-mono` en `variables.css`. Con Google Fonts, cambia el `<link>` del `<head>`. Con archivos propios: súbelos a `assets/fonts/` y descomenta/ajusta el bloque `@font-face`.

## Animaciones

- `data-reveal="fade-up|fade-down|fade-left|fade-right|scale|image|image-x|text"` aparece al entrar en el viewport (IntersectionObserver, una sola vez).
- `data-reveal-group="fade-up" data-stagger="80"` en un contenedor anima sus hijos en cascada.
- `data-parallax="0.1"` aplica parallax sutil.
- El header (`[data-header]`) se oculta al bajar y reaparece al subir; con foco de teclado siempre se muestra.
- Duraciones y easing: `--dur-*` y `--ease-*` en `variables.css`.
- Sin JavaScript todo el contenido es visible. Con `prefers-reduced-motion: reduce` no hay animaciones.

## Desplegar en GitHub Pages

1. Crea un repositorio y copia **el contenido de esta carpeta** a su raíz.
2. `git add . && git commit -m "Initial site" && git push origin main`
3. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. El workflow `Deploy to GitHub Pages` corre en cada push a `main`. La URL aparece en el run: `https://USUARIO.github.io/REPOSITORIO/`.
5. Si tienes URL final, rellena `canonical`, `og:url` y `og:image` en `index.html` con URLs absolutas.

Todas las rutas son relativas, así que funciona bajo `/REPOSITORIO/` y con dominio propio.

## Decisiones y pendientes

Ver `docs/DESIGN-ANALYSIS.md` (supuestos, assets y fuentes faltantes).


## Pendientes (ver docs/DESIGN-ANALYSIS.md)
Fotos originales en alta resolución, logo vectorial, dirección exacta y testimonios reales.
