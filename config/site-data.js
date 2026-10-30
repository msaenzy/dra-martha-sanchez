// config/site-data.js — conexión con el Panel web (Google Sheets + Apps Script).
// 1) Implementa el Apps Script como Aplicación web y pega aquí la URL que termina en /exec.
// 2) Deja "" para desactivar la conexión: la web muestra los datos escritos en index.html.
export const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzCUOwqyuiVlI-Xn1mvPnW7Gki-fEo9QOMrJmehuutePge6NbvEBnrYrYD6Y-NsiNto/exec";

// Valores que hoy están escritos en index.html. NO los cambies aquí:
// sirven para encontrar y reemplazar el texto por lo que diga el Google Sheet.
export const DEFAULTS = {
  telefono: "593979530787",   // UNA sola variable: WhatsApp, llamadas y el número que se muestra (097 953 0787)
  lugar_nombre: "Edificio Ágora Medical Center",
  lugar_corto: "Ágora Medical Center",
  direccion_detalle: "",
  ciudad: "Guayaquil",
  provincia: "Guayas",
  pais: "Ecuador",
  maps_url: "",
  dias_atencion: "lunes a sábado",
  horario_manana: "8:00 a 13:00",
  horario_tarde: "14:00 a 18:00",
  instagram_usuario: "dra_marthasanchez",
  facebook_url: "",
  tiktok_url: "",
};
