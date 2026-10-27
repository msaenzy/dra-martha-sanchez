# Dra. Martha Sánchez — análisis y decisiones

## Referencia visual
Landing de la Dra. Helena Alencar (pediatra infantil) por Bianca Bozzi: rosa empolvado (#D4A5A5), crema, formas orgánicas con contornos blancos, garabatos (arcoíris, corazón, estrellas, línea punteada), tarjetas redondeadas con borde fino y una tarjeta de énfasis rellena.

## Sistema
- **Color:** crema #FBF6F3, blush #F8E6E3, rosa empolvado #D4A5A5 (paneles), rosa profundo #A95F69 (botones, AA con blanco), tinta #4A2E35. Acento único: amarillo del logo MS #F2B544 (estrellas y marca). El azul del logo (#55B7C9) solo aparece en la marca.
- **Tipografía:** Bricolage Grotesque (títulos, opsz alto) + Figtree (texto) + Caveat solo para la nota manuscrita del hero ("Cuidando la salud de su mayor tesoro", frase de su bio de Instagram).
- **Formas:** fotos en blob orgánico + contorno blanco/rosa detrás (referencia). Iconos lineales propios (mismo trazo 1.75).
- **Movimiento:** reveals sobrios (fade-up, scale, fade lateral, stagger en grids); header que se oculta al bajar y reaparece al subir; respeta prefers-reduced-motion.

## Section map (una sola página)
Inicio · Sobre la doctora · Servicios (6 + modalidades) · Cómo agendar (3 pasos reales) · Instagram (temas reales de sus videos) · Preguntas · Ubicación y horario (mapa) · Agenda por WhatsApp (formulario) · Footer.

## ASSUMPTIONS
- Horario según lo indicado por la usuaria: lunes a sábado 8:00–13:00 y 14:00–18:00, previa cita. (Una pieza de Instagram dice sábado 8am–4pm: confirmar con la doctora.)
- WhatsApp: 0979530787 → wa.me/593979530787 (prefijo de Ecuador).
- Mapa por búsqueda "Edificio Ágora Medical Center Guayaquil" (sin calle/piso exactos).
- Marca "MS" recreada con tipografía (colores del logo); no es el logo original.
- No hay testimonios: no se inventaron. Sustituidos por la sección de Instagram.

## MISSING ASSET
- Fotos en alta resolución de la doctora (las actuales son recortes de capturas de Instagram, escaladas 2x). Reemplazar en `assets/images/` conservando nombres o editando `config/assets.js`.
- Logo vectorial original (MS con el bebé).
- Piso/consultorio exacto y enlace de Google Business (para mapa y JSON-LD).
- Testimonios reales (con permiso) para añadir una sección de reseñas.

## MISSING FONT
Ninguna (todas por Google Fonts). Las capturas de auditoría usan fuente de respaldo por el sandbox.
