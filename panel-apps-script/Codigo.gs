/**
 * ============================================================================
 *  PANEL WEB · Dra. Martha Sánchez — Pediatra
 *  Backend (Google Apps Script) — Codigo.gs
 *  ----------------------------------------------------------------------------
 *  • Google Sheet = base de datos (pestañas Config, Usuarios, Bitacora).
 *  • doGet()            → sirve el panel (Index.html) con login.
 *  • doGet(?api=config) → API pública JSON que lee la página web.
 *  • Funciones públicas (google.script.run): login, logout, obtenerPanel,
 *    guardarCambios, restaurarCampo, obtenerBitacora, cambiarContrasena,
 *    listarUsuarios, crearUsuario, actualizarUsuario, restablecerContrasena.
 *  • Funciones que terminan en "_" son PRIVADAS (no se pueden llamar desde el navegador).
 *  Diseñado por SPONDYLUS Soluciones Digitales.
 * ============================================================================
 */

/* ---------------------------------------------------------------------------
 * 1. CONFIGURACIÓN GENERAL
 * ------------------------------------------------------------------------- */
const APP = {
  nombre: 'Panel web · Dra. Martha Sánchez',
  sitioWeb: 'https://msaenzy.github.io/dra-martha-sanchez/',
  favicon: 'https://msaenzy.github.io/dra-martha-sanchez/assets/icons/favicon-32.png',
  zonaHoraria: 'America/Guayaquil',
  sesionSegundos: 6 * 60 * 60,          // 6 horas (máximo permitido por CacheService)
  maxIntentos: 5,                        // intentos fallidos antes de bloquear
  bloqueoSegundos: 15 * 60,              // 15 minutos de bloqueo
  iteracionesHash: 400,
  cacheApiSegundos: 300,                 // la API pública se cachea 5 minutos
  usuarioInicial: 'admin',
  contrasenaInicial: 'Pediatria2026!'    // se obliga a cambiarla en el primer ingreso
};

const HOJAS = {
  config:   { nombre: 'Config',   columnas: ['Clave', 'Valor', 'Etiqueta', 'Grupo', 'Tipo', 'Requerido', 'Publico', 'Ayuda', 'PorDefecto', 'Orden', 'Actualizado', 'ActualizadoPor'] },
  usuarios: { nombre: 'Usuarios', columnas: ['Usuario', 'Nombre', 'Rol', 'Activo', 'Hash', 'Salt', 'DebeCambiar', 'UltimoAcceso', 'Creado'] },
  bitacora: { nombre: 'Bitacora', columnas: ['Fecha', 'Usuario', 'Accion', 'Clave', 'ValorAnterior', 'ValorNuevo'] }
};

/** Datos iniciales de la web (coinciden con lo que hoy muestra la página). */
const CONFIG_INICIAL = [
  // clave, valor, etiqueta, grupo, tipo, requerido, publico, ayuda, orden
  ['telefono',           '593979530787',                    'Teléfono / WhatsApp de citas',  'Contacto',  'telefono', 'SI', 'SI', 'Un solo número para todo: WhatsApp, llamadas y el que se muestra en la web. Escríbelo como quieras: 0979530787 o +593 97 953 0787.', 10],
  ['lugar_nombre',       'Edificio Ágora Medical Center',   'Lugar de atención (completo)',  'Ubicación', 'texto',    'SI', 'SI', 'Nombre completo del consultorio o edificio.', 40],
  ['lugar_corto',        'Ágora Medical Center',            'Lugar de atención (corto)',     'Ubicación', 'texto',    'SI', 'SI', 'Versión corta para botones y etiquetas.', 50],
  ['direccion_detalle',  '',                                'Dirección / piso / consultorio','Ubicación', 'texto',    'NO', 'SI', 'Opcional. Ej.: Av. Juan Tanca Marengo, piso 3, consultorio 305.', 60],
  ['ciudad',             'Guayaquil',                       'Ciudad',                        'Ubicación', 'texto',    'SI', 'SI', 'Ciudad donde atiende.', 70],
  ['provincia',          'Guayas',                          'Provincia',                     'Ubicación', 'texto',    'NO', 'SI', 'Se usa para Google (datos estructurados).', 80],
  ['pais',               'Ecuador',                         'País',                          'Ubicación', 'texto',    'SI', 'SI', 'País donde atiende.', 90],
  ['maps_url',           '',                                'Enlace de Google Maps',         'Ubicación', 'url',      'NO', 'SI', 'Opcional. Pega el enlace de "Compartir" de Google Maps. Si lo dejas vacío, se busca por el nombre del lugar.', 100],
  ['dias_atencion',      'lunes a sábado',                  'Días de atención',              'Horario',   'texto',    'SI', 'SI', 'En minúsculas. Ej.: lunes a sábado', 110],
  ['horario_manana',     '8:00 a 13:00',                    'Horario de la mañana',          'Horario',   'hora',     'SI', 'SI', 'Formato: 8:00 a 13:00', 120],
  ['horario_tarde',      '14:00 a 18:00',                   'Horario de la tarde',           'Horario',   'hora',     'SI', 'SI', 'Formato: 14:00 a 18:00', 130],
  ['instagram_usuario',  'dra_marthasanchez',               'Usuario de Instagram',          'Redes',     'usuario',  'SI', 'SI', 'Sin @. Ej.: dra_marthasanchez', 140],
  ['facebook_url',       '',                                'Página de Facebook',            'Redes',     'url',      'NO', 'SI', 'Opcional. Si lo llenas, aparece el ícono en el pie de la web.', 150],
  ['tiktok_url',         '',                                'Perfil de TikTok',              'Redes',     'url',      'NO', 'SI', 'Opcional. Si lo llenas, aparece el ícono en el pie de la web.', 160]
];

/** Claves de versiones anteriores que ya no se usan (se migran y se eliminan). */
const CLAVES_OBSOLETAS = { whatsapp: 'telefono', telefono_visible: null, telefono_llamadas: null };

/* ---------------------------------------------------------------------------
 * 2. PUNTOS DE ENTRADA
 * ------------------------------------------------------------------------- */
function doGet(e) {
  inicializarHoja_();
  const p = (e && e.parameter) || {};

  // API pública para la página web: .../exec?api=config
  if (p.api === 'config') return respuestaJson_(apiConfigPublica_());

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(APP.nombre)
    .setFaviconUrl(APP.favicon)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/** Menú dentro del Google Sheet. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🩺 Panel web')
    .addItem('Inicializar / reparar hojas', 'menuInicializar')
    .addItem('Ver enlaces del panel y de la API', 'menuVerEnlaces')
    .addToUi();
}

function menuInicializar() {
  PropertiesService.getScriptProperties().deleteProperty('INIT_V2'); // fuerza la verificación completa
  inicializarHoja_();
  SpreadsheetApp.getUi().alert('Listo ✅\n\nHojas verificadas.\nUsuario inicial: ' + APP.usuarioInicial + '\nContraseña inicial: ' + APP.contrasenaInicial + '\n(se pedirá cambiarla en el primer ingreso).');
}

function menuVerEnlaces() {
  const url = ScriptApp.getService().getUrl();
  const msg = url
    ? 'Panel: ' + url + '\n\nAPI para la web:\n' + url + '?api=config'
    : 'Todavía no has implementado la Aplicación web.\nVe a Implementar → Nueva implementación → Aplicación web.';
  SpreadsheetApp.getUi().alert(msg);
}

/* ---------------------------------------------------------------------------
 * 3. AUTENTICACIÓN
 * ------------------------------------------------------------------------- */
function login(usuario, contrasena) {
  try {
    inicializarHoja_();
    usuario = String(usuario || '').trim().toLowerCase();
    contrasena = String(contrasena || '');
    if (!usuario || !contrasena) return fallo_('Escribe tu usuario y contraseña.');

    const cache = CacheService.getScriptCache();
    const claveIntentos = 'intentos_' + usuario;
    const intentos = Number(cache.get(claveIntentos) || 0);
    if (intentos >= APP.maxIntentos) return fallo_('Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.');

    const u = buscarUsuario_(usuario);
    if (!u || !esVerdadero_(u.datos.Activo) || hash_(contrasena, u.datos.Salt) !== u.datos.Hash) {
      cache.put(claveIntentos, String(intentos + 1), APP.bloqueoSegundos);
      Utilities.sleep(400); // frena ataques de fuerza bruta
      return fallo_('Usuario o contraseña incorrectos.');
    }

    cache.remove(claveIntentos);
    const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
    const sesion = { usuario: u.datos.Usuario, nombre: u.datos.Nombre, rol: u.datos.Rol };
    cache.put('sesion_' + token, JSON.stringify(sesion), APP.sesionSegundos);

    u.hoja.getRange(u.fila, columna_(HOJAS.usuarios, 'UltimoAcceso')).setValue(ahora_());
    registrar_(sesion.usuario, 'Inicio de sesión', '', '', '');

    return ok_({ token: token, usuario: sesion, debeCambiar: esVerdadero_(u.datos.DebeCambiar) });
  } catch (err) {
    return error_(err);
  }
}

function logout(token) {
  try {
    if (token) CacheService.getScriptCache().remove('sesion_' + token);
    return ok_({});
  } catch (err) {
    return error_(err);
  }
}

function cambiarContrasena(token, actual, nueva) {
  try {
    const s = validarSesion_(token);
    const u = buscarUsuario_(s.usuario);
    if (!u) return fallo_('Usuario no encontrado.');
    if (hash_(String(actual || ''), u.datos.Salt) !== u.datos.Hash) return fallo_('La contraseña actual no es correcta.');
    const problema = validarContrasena_(nueva);
    if (problema) return fallo_(problema);

    const salt = Utilities.getUuid();
    const fila = u.fila, h = u.hoja;
    h.getRange(fila, columna_(HOJAS.usuarios, 'Hash')).setValue(hash_(nueva, salt));
    h.getRange(fila, columna_(HOJAS.usuarios, 'Salt')).setValue(salt);
    h.getRange(fila, columna_(HOJAS.usuarios, 'DebeCambiar')).setValue('NO');
    registrar_(s.usuario, 'Cambió su contraseña', '', '', '');
    return ok_({ mensaje: 'Contraseña actualizada.' });
  } catch (err) {
    return error_(err);
  }
}

/* ---------------------------------------------------------------------------
 * 4. PANEL: LEER Y GUARDAR LA INFORMACIÓN DE LA WEB
 * ------------------------------------------------------------------------- */
function obtenerPanel(token) {
  try {
    const s = validarSesion_(token);
    const campos = leerConfig_();
    const fechas = campos.map(c => c.actualizado).filter(Boolean).sort();
    const apiBase = ScriptApp.getService().getUrl();
    return ok_({
      usuario: s,
      campos: campos,
      grupos: ['Contacto', 'Ubicación', 'Horario', 'Redes'],
      ultimaActualizacion: fechas.length ? fechas[fechas.length - 1] : '',
      sitioWeb: APP.sitioWeb,
      apiUrl: apiBase ? apiBase + '?api=config' : ''
    });
  } catch (err) {
    return error_(err);
  }
}

/**
 * Guarda varios cambios a la vez.
 * @param {string} token
 * @param {{clave:string, valor:string}[]} cambios
 */
function guardarCambios(token, cambios) {
  const lock = LockService.getScriptLock();
  try {
    const s = validarSesion_(token);
    if (!Array.isArray(cambios) || !cambios.length) return fallo_('No hay cambios para guardar.');
    lock.waitLock(10000);

    const hoja = hoja_(HOJAS.config);
    const datos = hoja.getDataRange().getValues();
    const col = nombre => HOJAS.config.columnas.indexOf(nombre);
    const filaPorClave = {};
    for (let i = 1; i < datos.length; i++) filaPorClave[datos[i][col('Clave')]] = i;

    // 1) Validar TODO antes de escribir nada
    const errores = [];
    const listos = [];
    cambios.forEach(c => {
      const i = filaPorClave[c.clave];
      if (i === undefined) { errores.push({ clave: c.clave, mensaje: 'Campo desconocido.' }); return; }
      const def = filaAObjeto_(HOJAS.config, datos[i]);
      const res = normalizarYValidar_(def, c.valor);
      if (res.error) errores.push({ clave: c.clave, mensaje: res.error });
      else if (String(res.valor) !== String(def.Valor)) listos.push({ i: i, clave: c.clave, anterior: def.Valor, valor: res.valor });
    });
    if (errores.length) return { success: false, message: 'Revisa los campos marcados.', errores: errores };
    if (!listos.length) return ok_({ guardados: 0, campos: leerConfig_(), mensaje: 'No había cambios reales.' });

    // 2) Escribir
    const fecha = ahora_();
    listos.forEach(c => {
      const fila = c.i + 1;
      hoja.getRange(fila, col('Valor') + 1).setValue(c.valor);
      hoja.getRange(fila, col('Actualizado') + 1).setValue(fecha);
      hoja.getRange(fila, col('ActualizadoPor') + 1).setValue(s.usuario);
      registrar_(s.usuario, 'Editó', c.clave, c.anterior, c.valor);
    });
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove('api_config');

    return ok_({ guardados: listos.length, campos: leerConfig_(), ultimaActualizacion: fecha });
  } catch (err) {
    return error_(err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/** Devuelve un campo a su valor original. */
function restaurarCampo(token, clave) {
  try {
    validarSesion_(token);
    const campo = leerConfig_().filter(c => c.clave === clave)[0];
    if (!campo) return fallo_('Campo desconocido.');
    return guardarCambios(token, [{ clave: clave, valor: campo.porDefecto }]);
  } catch (err) {
    return error_(err);
  }
}

function obtenerBitacora(token, limite) {
  try {
    validarSesion_(token);
    const hoja = hoja_(HOJAS.bitacora);
    const n = hoja.getLastRow() - 1;
    if (n < 1) return ok_({ registros: [] });
    const cantidad = Math.min(Number(limite) || 40, n);
    const valores = hoja.getRange(hoja.getLastRow() - cantidad + 1, 1, cantidad, HOJAS.bitacora.columnas.length).getDisplayValues();
    const etiquetas = {};
    leerConfig_().forEach(c => (etiquetas[c.clave] = c.etiqueta));
    const registros = valores.reverse().map(r => ({
      fecha: r[0], usuario: r[1], accion: r[2], clave: r[3], campo: etiquetas[r[3]] || r[3], anterior: r[4], nuevo: r[5]
    }));
    return ok_({ registros: registros });
  } catch (err) {
    return error_(err);
  }
}

/* ---------------------------------------------------------------------------
 * 5. USUARIOS (solo rol "admin")
 * ------------------------------------------------------------------------- */
function listarUsuarios(token) {
  try {
    validarSesion_(token, 'admin');
    const hoja = hoja_(HOJAS.usuarios);
    const filas = hoja.getDataRange().getDisplayValues().slice(1);
    return ok_({
      usuarios: filas.filter(r => r[0]).map(r => ({
        usuario: r[0], nombre: r[1], rol: r[2], activo: esVerdadero_(r[3]), ultimoAcceso: r[7]
      }))
    });
  } catch (err) {
    return error_(err);
  }
}

function crearUsuario(token, datos) {
  try {
    const s = validarSesion_(token, 'admin');
    datos = datos || {};
    const usuario = String(datos.usuario || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) return fallo_('El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion.');
    if (buscarUsuario_(usuario)) return fallo_('Ese usuario ya existe.');
    const problema = validarContrasena_(datos.contrasena);
    if (problema) return fallo_(problema);
    const rol = datos.rol === 'admin' ? 'admin' : 'editor';
    const salt = Utilities.getUuid();
    hoja_(HOJAS.usuarios).appendRow([usuario, String(datos.nombre || usuario).trim(), rol, 'SI', hash_(datos.contrasena, salt), salt, 'SI', '', ahora_()]);
    registrar_(s.usuario, 'Creó usuario', usuario, '', rol);
    return listarUsuarios(token);
  } catch (err) {
    return error_(err);
  }
}

function actualizarUsuario(token, datos) {
  try {
    const s = validarSesion_(token, 'admin');
    const u = buscarUsuario_(datos && datos.usuario);
    if (!u) return fallo_('Usuario no encontrado.');
    if (u.datos.Usuario === s.usuario && (datos.activo === false || datos.rol === 'editor')) {
      return fallo_('No puedes desactivarte ni quitarte el rol de administrador a ti misma/o.');
    }
    if (typeof datos.activo === 'boolean') u.hoja.getRange(u.fila, columna_(HOJAS.usuarios, 'Activo')).setValue(datos.activo ? 'SI' : 'NO');
    if (datos.rol === 'admin' || datos.rol === 'editor') u.hoja.getRange(u.fila, columna_(HOJAS.usuarios, 'Rol')).setValue(datos.rol);
    if (datos.nombre) u.hoja.getRange(u.fila, columna_(HOJAS.usuarios, 'Nombre')).setValue(String(datos.nombre).trim());
    registrar_(s.usuario, 'Actualizó usuario', u.datos.Usuario, '', JSON.stringify({ activo: datos.activo, rol: datos.rol }));
    return listarUsuarios(token);
  } catch (err) {
    return error_(err);
  }
}

function restablecerContrasena(token, usuario, nueva) {
  try {
    const s = validarSesion_(token, 'admin');
    const u = buscarUsuario_(usuario);
    if (!u) return fallo_('Usuario no encontrado.');
    const problema = validarContrasena_(nueva);
    if (problema) return fallo_(problema);
    const salt = Utilities.getUuid();
    u.hoja.getRange(u.fila, columna_(HOJAS.usuarios, 'Hash')).setValue(hash_(nueva, salt));
    u.hoja.getRange(u.fila, columna_(HOJAS.usuarios, 'Salt')).setValue(salt);
    u.hoja.getRange(u.fila, columna_(HOJAS.usuarios, 'DebeCambiar')).setValue('SI');
    registrar_(s.usuario, 'Restableció contraseña', u.datos.Usuario, '', '');
    return ok_({ mensaje: 'Contraseña restablecida. Se pedirá cambiarla al ingresar.' });
  } catch (err) {
    return error_(err);
  }
}

/* ---------------------------------------------------------------------------
 * 6. API PÚBLICA PARA LA WEB
 * ------------------------------------------------------------------------- */
function apiConfigPublica_() {
  try {
    const cache = CacheService.getScriptCache();
    const enCache = cache.get('api_config');
    if (enCache) return JSON.parse(enCache);

    const data = {};
    let actualizado = '';
    leerConfig_().forEach(c => {
      if (!c.publico) return;
      data[c.clave] = c.valor;
      if (c.actualizado > actualizado) actualizado = c.actualizado;
    });
    if (data.telefono) {                       // derivados listos para usar (una sola fuente: "telefono")
      data.telefono_visible = telefonoVisible_(data.telefono);
      data.whatsapp_url = 'https://wa.me/' + data.telefono;
      data.tel_url = 'tel:+' + data.telefono;
    }
    const respuesta = { ok: true, data: data, actualizado: actualizado };
    cache.put('api_config', JSON.stringify(respuesta), APP.cacheApiSegundos);
    return respuesta;
  } catch (err) {
    return { ok: false, error: 'No se pudo leer la configuración.' };
  }
}

function respuestaJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------------------
 * 7. INICIALIZACIÓN DE LA HOJA (crea pestañas, encabezados y datos si faltan)
 * ------------------------------------------------------------------------- */
function inicializarHoja_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('INIT_V2') === 'OK' && hojasExisten_()) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.setSpreadsheetTimeZone(APP.zonaHoraria);

    Object.keys(HOJAS).forEach(k => {
      const def = HOJAS[k];
      let h = ss.getSheetByName(def.nombre);
      if (!h) h = ss.insertSheet(def.nombre);
      const actuales = h.getLastColumn() ? h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0] : [];
      if (actuales.join('|').indexOf(def.columnas.join('|')) !== 0) {
        h.getRange(1, 1, 1, def.columnas.length).setValues([def.columnas]);
      }
      h.setFrozenRows(1);
      h.getRange(1, 1, 1, def.columnas.length)
        .setFontWeight('bold').setFontColor('#ffffff').setBackground('#7b4fc0');
    });

    // Config: agrega las claves que falten (no pisa valores existentes)
    const hc = ss.getSheetByName(HOJAS.config.nombre);
    ['B:B', 'I:I', 'K:K'].forEach(a => hc.getRange(a).setNumberFormat('@')); // texto plano: no pierde ceros ni convierte fechas
    migrarClavesObsoletas_(hc);
    const existentes = hc.getLastRow() > 1 ? hc.getRange(2, 1, hc.getLastRow() - 1, 1).getValues().map(r => r[0]) : [];
    const nuevas = CONFIG_INICIAL.filter(r => existentes.indexOf(r[0]) === -1)
      .map(r => [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[1], r[8], '', '']);
    if (nuevas.length) hc.getRange(hc.getLastRow() + 1, 1, nuevas.length, HOJAS.config.columnas.length).setValues(nuevas);

    // Usuarios: crea el administrador inicial si no hay ninguno
    const hu = ss.getSheetByName(HOJAS.usuarios.nombre);
    hu.getRange('E:F').setNumberFormat('@'); // Hash y Salt como texto (evita que Sheets los convierta a número)
    hu.getRange('H:I').setNumberFormat('@');
    ss.getSheetByName(HOJAS.bitacora.nombre).getRange('A:F').setNumberFormat('@');
    if (hu.getLastRow() < 2) {
      const salt = Utilities.getUuid();
      hu.appendRow([APP.usuarioInicial, 'Administración', 'admin', 'SI', hash_(APP.contrasenaInicial, salt), salt, 'SI', '', ahora_()]);
    }
    hu.hideColumns(columna_(HOJAS.usuarios, 'Hash'), 2); // oculta Hash y Salt

    const sobrante = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
    if (sobrante && ss.getSheets().length > 3 && sobrante.getLastRow() === 0) ss.deleteSheet(sobrante);

    props.setProperty('INIT_V2', 'OK');
  } finally {
    lock.releaseLock();
  }
}

/** Pasa el valor de claves antiguas a las nuevas (ej. whatsapp → telefono) y borra las filas viejas. */
function migrarClavesObsoletas_(hc) {
  if (hc.getLastRow() < 2) return;
  const datos = hc.getRange(2, 1, hc.getLastRow() - 1, 2).getDisplayValues();
  const claves = datos.map(r => r[0]);
  Object.keys(CLAVES_OBSOLETAS).forEach(vieja => {
    const nueva = CLAVES_OBSOLETAS[vieja];
    const i = claves.indexOf(vieja);
    if (i === -1) return;
    if (nueva && claves.indexOf(nueva) === -1) {
      hc.getRange(i + 2, 1).setValue(nueva);               // renombra la fila conservando el valor
      claves[i] = nueva;
      const def = CONFIG_INICIAL.filter(r => r[0] === nueva)[0];
      if (def) hc.getRange(i + 2, 3, 1, 6).setValues([[def[2], def[3], def[4], def[5], def[6], def[7]]]);
    }
  });
  for (let i = claves.length - 1; i >= 0; i--) {
    if (Object.prototype.hasOwnProperty.call(CLAVES_OBSOLETAS, claves[i])) hc.deleteRow(i + 2);
  }
}

function hojasExisten_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return Object.keys(HOJAS).every(k => ss.getSheetByName(HOJAS[k].nombre));
}

/* ---------------------------------------------------------------------------
 * 8. VALIDACIÓN DE CAMPOS
 * ------------------------------------------------------------------------- */
function normalizarYValidar_(def, valorCrudo) {
  let v = String(valorCrudo == null ? '' : valorCrudo).trim().replace(/\s+/g, ' ');
  const requerido = esVerdadero_(def.Requerido);
  if (!v) return requerido ? { error: 'Este campo es obligatorio.' } : { valor: '' };
  if (v.length > 160) return { error: 'Máximo 160 caracteres.' };
  if (/[<>]/.test(v)) return { error: 'No uses los caracteres < o >.' };

  switch (String(def.Tipo)) {
    case 'telefono': {
      const d = normalizarTelefono_(v);
      if (!d) return { error: 'Número no válido. Ej.: 0979530787 o +593 97 953 0787' };
      return { valor: d };
    }
    case 'hora': {
      const m = v.replace(/[–—-]/g, ' a ').replace(/\s+/g, ' ').match(/^(\d{1,2})[:.](\d{2}) a (\d{1,2})[:.](\d{2})$/);
      if (!m) return { error: 'Usa el formato 8:00 a 13:00' };
      const h1 = Number(m[1]), m1 = Number(m[2]), h2 = Number(m[3]), m2 = Number(m[4]);
      if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59) return { error: 'Hora no válida.' };
      if (h2 * 60 + m2 <= h1 * 60 + m1) return { error: 'La hora final debe ser mayor que la inicial.' };
      return { valor: h1 + ':' + m[2] + ' a ' + h2 + ':' + m[4] };
    }
    case 'usuario': {
      const u = v.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '');
      if (!/^[A-Za-z0-9._]{1,30}$/.test(u)) return { error: 'Usuario no válido. Solo letras, números, punto y guion bajo.' };
      return { valor: u };
    }
    case 'url': {
      const url = /^https?:\/\//i.test(v) ? v : 'https://' + v;
      if (!/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) return { error: 'Enlace no válido.' };
      return { valor: url };
    }
    default:
      return { valor: v };
  }
}

/** Cualquier formato → dígitos internacionales. 0979530787 → 593979530787 · 042123456 → 59342123456 */
function normalizarTelefono_(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (/^00\d+/.test(d)) d = d.slice(2);
  if (/^0\d{8,9}$/.test(d)) d = '593' + d.slice(1);
  if (/^9\d{8}$/.test(d)) d = '593' + d;                 // 979530787 (sin el 0)
  return /^\d{10,15}$/.test(d) ? d : '';
}

/** Dígitos internacionales → como se lee en la web. 593979530787 → 097 953 0787 */
function telefonoVisible_(d) {
  d = String(d || '');
  let m;
  if ((m = d.match(/^593(9\d)(\d{3})(\d{4})$/))) return '0' + m[1] + ' ' + m[2] + ' ' + m[3];
  if ((m = d.match(/^593(\d)(\d{3})(\d{4})$/))) return '0' + m[1] + ' ' + m[2] + ' ' + m[3];
  return d ? '+' + d : '';
}

function validarContrasena_(c) {
  c = String(c || '');
  if (c.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Za-z]/.test(c) || !/\d/.test(c)) return 'La contraseña debe combinar letras y números.';
  return '';
}

/* ---------------------------------------------------------------------------
 * 9. UTILIDADES PRIVADAS
 * ------------------------------------------------------------------------- */
function validarSesion_(token, rolRequerido) {
  const raw = token ? CacheService.getScriptCache().get('sesion_' + token) : null;
  if (!raw) { const e = new Error('Tu sesión expiró. Vuelve a ingresar.'); e.codigo = 'SESION'; throw e; }
  const s = JSON.parse(raw);
  if (rolRequerido && s.rol !== rolRequerido) { const e = new Error('No tienes permisos para esta acción.'); e.codigo = 'PERMISO'; throw e; }
  CacheService.getScriptCache().put('sesion_' + token, raw, APP.sesionSegundos); // renueva la sesión
  return s;
}

function leerConfig_() {
  const hoja = hoja_(HOJAS.config);
  if (hoja.getLastRow() < 2) return [];
  const filas = hoja.getRange(2, 1, hoja.getLastRow() - 1, HOJAS.config.columnas.length).getDisplayValues();
  return filas.filter(r => r[0]).map(r => {
    const o = filaAObjeto_(HOJAS.config, r);
    return {
      clave: o.Clave, valor: o.Valor, etiqueta: o.Etiqueta, grupo: o.Grupo, tipo: o.Tipo,
      requerido: esVerdadero_(o.Requerido), publico: esVerdadero_(o.Publico), ayuda: o.Ayuda,
      porDefecto: o.PorDefecto, orden: Number(o.Orden) || 999, actualizado: o.Actualizado, actualizadoPor: o.ActualizadoPor
    };
  }).sort((a, b) => a.orden - b.orden);
}

function buscarUsuario_(usuario) {
  usuario = String(usuario || '').trim().toLowerCase();
  if (!usuario) return null;
  const hoja = hoja_(HOJAS.usuarios);
  const filas = hoja.getDataRange().getValues();
  for (let i = 1; i < filas.length; i++) {
    if (String(filas[i][0]).trim().toLowerCase() === usuario) {
      return { hoja: hoja, fila: i + 1, datos: filaAObjeto_(HOJAS.usuarios, filas[i]) };
    }
  }
  return null;
}

function registrar_(usuario, accion, clave, anterior, nuevo) {
  try {
    hoja_(HOJAS.bitacora).appendRow([ahora_(), usuario, accion, clave, String(anterior), String(nuevo)]);
  } catch (e) { /* la bitácora nunca debe romper la operación principal */ }
}

function hash_(texto, salt) {
  let h = String(salt) + '::' + String(texto);
  for (let i = 0; i < APP.iteracionesHash; i++) {
    h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + String(salt), Utilities.Charset.UTF_8)
      .map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
  }
  return h;
}

function hoja_(def) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(def.nombre);
}

function columna_(def, nombre) {
  return def.columnas.indexOf(nombre) + 1;
}

function filaAObjeto_(def, fila) {
  const o = {};
  def.columnas.forEach((c, i) => (o[c] = fila[i]));
  return o;
}

function esVerdadero_(v) {
  return v === true || /^(si|sí|true|1|x)$/i.test(String(v).trim());
}

function ahora_() {
  return Utilities.formatDate(new Date(), APP.zonaHoraria, 'yyyy-MM-dd HH:mm:ss');
}

function ok_(datos) {
  return Object.assign({ success: true }, datos || {});
}

function fallo_(mensaje) {
  return { success: false, message: mensaje };
}

function error_(err) {
  console.error(err && err.stack ? err.stack : err);
  return { success: false, message: (err && err.message) || 'Ocurrió un error inesperado.', codigo: (err && err.codigo) || 'ERROR' };
}
