# Dra. Martha Sánchez — análisis y decisiones (v2)

## Dirección
Pastel lúdico tipo sitio de la Dra. Monique Vasconcelos (endocrinología pediátrica), con la paleta real de la marca de la doctora: morado, rosa, turquesa, coral y el amarillo/turquesa del logo MS. Se descartó la v1 (crema + rosa empolvado + tipografía manuscrita) por verse genérica.

## Sistema
- **Tipografía (autoalojada, sin Google Fonts):** Fredoka (títulos, redondeada) + Nunito (texto). Archivos en `assets/fonts/`.
- **Color:** morado #7B4FC0 (títulos/paneles), rosa #FF6FA6 (énfasis), turquesa #34B6B4, coral #FF8A68, amarillo #FFC93C, verde WhatsApp en botones.
- **Stickers originales en SVG:** estrella rosa/naranja con aros, chispa, flores, corazones, nube y sol con carita, espiral y ola.
- **Movimiento:** reveals que se repiten al bajar y al subir (entran desde el lado por donde llegas), titular del hero palabra por palabra, parallax de stickers, barra de progreso, header que se oculta al bajar y reaparece al subir. Carruseles con arrastre, flechas, puntos, teclado y autoplay con pausa. `prefers-reduced-motion` lo desactiva todo.

## Secciones
Inicio · Dudas (panel morado) · Servicios (carrusel, 7) · Cómo agendar (4 pasos) · Instagram (panel coral + carrusel de temas reales) · Sobre la doctora · Preguntas · Atención (presencial / teleconsulta) · Agenda (formulario → WhatsApp) · Footer.

## ASSUMPTIONS
- Horario: lunes a sábado 8:00–13:00 y 14:00–18:00, previa cita (una pieza de Instagram dice sábado 8am–4pm: confirmar).
- WhatsApp 0979530787 → wa.me/593979530787.
- Mapa por búsqueda "Edificio Ágora Medical Center Guayaquil" (sin calle/piso exactos).
- Marca "MS" recreada con tipografía; no es el logo original.
- Sin testimonios inventados: la sección de reseñas de la referencia se sustituyó por los temas reales de sus videos de Instagram.
- Los chips de "dudas" y las descripciones de servicios se redactaron a partir de los servicios que ella ofrece, sin añadir credenciales ni promesas clínicas.

## MISSING ASSET
- Fotos en alta resolución (las actuales son fotogramas de sus videos de Instagram: `martha-escritorio.jpg`, `martha-recien-nacido.jpg`, `martha-rostro.jpg`, y recortes de sus flyers).
- Logo vectorial original (MS con el bebé).
- Piso/consultorio exacto y enlace de Google Business.
- Testimonios reales (con permiso) y formación/credenciales (universidad, residencia) para una sección tipo "Formaciones".
- Enlaces directos a los reels de Instagram (hoy cada tarjeta lleva al perfil).
