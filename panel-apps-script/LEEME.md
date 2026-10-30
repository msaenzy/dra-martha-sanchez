# Panel web · Dra. Martha Sánchez (Google Sheets + Apps Script)

Tablero privado con usuario y contraseña para editar los datos de contacto, ubicación, horario y redes
de la web https://msaenzy.github.io/dra-martha-sanchez/. El Google Sheet es la base de datos.

## Archivos
- `Codigo.gs` — backend (login, sesiones, validación, bitácora, usuarios, API pública JSON).
- `Index.html` — interfaz del panel (un solo archivo).
- `Panel-Dra-Martha-Sanchez-BD.xlsx` — plantilla de la base de datos (opcional: el script crea todo solo).

## Instalación (10 minutos)
1. Crea un Google Sheet nuevo (o importa el .xlsx: Archivo → Importar → Reemplazar hoja de cálculo).
2. En el Sheet: Extensiones → Apps Script. Pega `Codigo.gs`. Crea un archivo HTML llamado exactamente `Index` y pega `Index.html`. Guarda.
3. Implementar → Nueva implementación → tipo Aplicación web:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona** (la web necesita leer la API; el panel se protege con su propio login).
   Autoriza los permisos.
4. Copia la URL que termina en `/exec`:
   - Esa URL es el **panel** (ábrela y entra con `admin` / `Pediatria2026!`; te pedirá cambiarla).
   - En el repo de la web, abre `config/site-data.js` y pega esa misma URL en `SHEET_API_URL`. Haz push.
5. Listo: lo que se guarde en el panel aparece en la web en máx. ~5 minutos (caché de la API).

## Teléfono: una sola variable
`telefono` alimenta WhatsApp, llamadas y el número que se muestra en la web. Se puede escribir en cualquier formato
(0979530787, 097 953 0787, +593 97 953 0787): se guarda como 593979530787 y la web lo muestra como 097 953 0787.
Si vienes de la versión anterior (whatsapp / telefono_visible / telefono_llamadas), el script las migra solo a `telefono`.

## Cuando cambies el código
Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva → Implementar. Así la URL `/exec` no cambia.

## Seguridad
- Contraseñas con sal + SHA-256 iterado; columnas Hash/Salt ocultas en la hoja.
- 5 intentos fallidos bloquean ese usuario 15 minutos. Sesiones de 6 h (se renuevan con el uso).
- La API pública solo expone las filas de `Config` con `Publico = SI`. No guardes datos privados ahí.
- Roles: `admin` (edita y gestiona usuarios) y `editor` (solo edita la información).
