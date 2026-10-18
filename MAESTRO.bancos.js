/**
 * ==============================================================================
 * MAESTRO.bancos.js - Movimientos de tarjetas y cuentas leídos desde Gmail
 * Proyecto: Finanzas
 * ==============================================================================
 * 1. Sesión de Google en el navegador (Google Identity Services, solo lectura de Gmail).
 * 2. Lectura de los correos con etiquetas BANCOS/* (APAP, POPULAR, PAYPAL, QIK).
 * 3. Lectores por banco: convierten cada correo en un movimiento
 *    { fecha, tarjeta, comercio, monto, moneda, tipo, estado }.
 * 4. Categorías por comercio (palabras clave + reglas que el usuario corrige).
 * 5. Guardado local y en Google Sheets (acciones txLoad/txSave del Apps Script,
 *    que verifican que la sesión de Google sea la del dueño de la hoja).
 * No guarda el token de Google: vive solo en memoria y vence en ~1 hora.
 */

(function (window) {
  'use strict';

  // --- 1. CONFIGURACIÓN ---
  // El Client ID de OAuth es público por diseño (no da acceso sin el login del usuario).
  const GOOGLE_CLIENT_ID = '536695694569-19dads7fe5t6vfpr55l0t7gl7b9ihdaq.apps.googleusercontent.com';
  const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly openid email';
  const STORAGE_KEY = 'card_movements_v1';
  const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
  const FETCH_CONCURRENCY = 6;

  // Solo los correos que traen movimientos (evita descargar publicidad y estados de cuenta)
  const GMAIL_QUERY = [
    '(label:bancos-apap (subject:notificaciones OR subject:transferencia))',
    '(label:bancos-popular (subject:consumo OR subject:retiro OR subject:"pagos al instante" OR subject:"transf recibida"))',
    '(label:bancos-paypal (subject:pago OR subject:recibo))'
  ].join(' OR ');

  // --- 2. CATEGORÍAS ---
  const CATEGORIES = [
    { id: 'supermercado', label: 'Supermercado', color: '#0f6b52', match: /\b(SIRENA|SUPERMERCADO|SUPERM|NACIONAL|JUMBO|BRAVO|PLAZA LAMA|CARREFOUR|OLE|POLA|PRICESMART|MERCADO|COLMADO|MINIMARKET|HIPER)\b/ },
    { id: 'comida', label: 'Restaurantes y comida', color: '#c48528', match: /\b(REST|RESTAURANT|RESTAURANTE|CAFE|CAFETERIA|COFFEE|PIZZA|PIZZERIA|BURGER|MCDONALD|MCDONALDS|KFC|WENDY|WENDYS|STARBUCKS|DOMINO|DOMINOS|PEDIDOSYA|UBER ?EATS|HELADO|HELADERIA|SUSHI|POLLO|GRILL|BAKERY|PANADERIA|REPOSTERIA|DELI|TACO|FOOD|BAR|LOUNGE|CHEF|COMEDOR)\b/ },
    { id: 'transporte', label: 'Transporte', color: '#2e6c9e', match: /\b(UBER|CABIFY|INDRIVE|DIDI|PARQUEO|PARKING|PEAJE|TOLL|METRO|TAXI|APOLO)\b/ },
    { id: 'combustible', label: 'Combustible', color: '#768c34', match: /\b(SHELL|TEXACO|ESSO|TOTAL|SUNIX|PUMA|BOMBA|ESTACION|GASOLINERA|GAS STATION|V ENERGY|COASTAL)\b/ },
    { id: 'suscripciones', label: 'Suscripciones y apps', color: '#7a5ca8', match: /\b(NETFLIX|SPOTIFY|APPLE|ITUNES|GOOGLE|YOUTUBE|DISNEY|HBO|MAX|PRIME VIDEO|ANTHROPIC|CLAUDE|OPENAI|CHATGPT|MICROSOFT|ADOBE|PLAYSTATION|STEAM|XBOX|NINTENDO|ICLOUD|DROPBOX|CANVA|PARAMOUNT|CRUNCHYROLL)\b/ },
    { id: 'compras-linea', label: 'Compras en línea', color: '#b05a82', match: /\b(AMAZON|AMZN|SHEIN|ASOS|TEMU|ALIEXPRESS|EBAY|PAYPAL|GYMSHARK|ETSY|WALMART|BEST BUY|MERCADOLIBRE)\b/ },
    { id: 'salud', label: 'Salud y farmacia', color: '#be5648', match: /\b(FARM|FARMACIA|FARMACIAS|CAROL|MEDICO|MEDICA|CLINICA|HOSPITAL|LABORATORIO|LAB|OPTICA|DENTAL|DENT|SALUD|CENTRO MEDICO)\b/ },
    { id: 'ropa-tiendas', label: 'Ropa y tiendas', color: '#a0662b', match: /\b(ZARA|NIKE|ADIDAS|TIENDA|TIENDAS|BLUEMALL|AGORA|MEGACENTRO|SAMBIL|GALERIA|BERSHKA|PULL|FOREVER|IKEA|CUESTA|LIBRERIA|OPTICA)\b/ },
    { id: 'servicios', label: 'Servicios y hogar', color: '#2a8f8c', match: /\b(CLARO|ALTICE|VIVA|EDESUR|EDENORTE|EDEESTE|CAASD|CORAASAN|INTERNET|SEGURO|SEGUROS|LAVANDERIA|FERRETERIA|CONDOMINIO)\b/ },
    { id: 'viajes', label: 'Viajes', color: '#3b7f9e', match: /\b(JETBLUE|AIRBNB|HOTEL|HOTELS|BOOKING|EXPEDIA|ARAJET|DELTA|AMERICAN AIR|AVIANCA|COPA|SPIRIT|UNITED|AIRLINE|AIRLINES|AEROPUERTO|DUTY FREE)\b/ },
    { id: 'ocio', label: 'Entretenimiento', color: '#8a5ca0', match: /\b(CINE|CINEMA|CINEMAS|PALACIO DEL CINE|TICKET|TICKETS|BOLETO|BOLETOS|UEPA|CONCIERTO|BOWLING)\b/ },
    { id: 'deporte', label: 'Gimnasio y deporte', color: '#4d7a3a', match: /\b(GYM|SMART ?FIT|BODY SHOP|FITNESS|CROSSFIT|DEPORTE|DEPORTES|DECATHLON)\b/ },
    { id: 'efectivo', label: 'Retiros de efectivo', color: '#66716b', match: null },
    { id: 'transferencias', label: 'Transferencias', color: '#5d6b8a', match: null },
    { id: 'pagos', label: 'Pagos a la tarjeta', color: '#12744a', match: null },
    { id: 'ingresos', label: 'Ingresos', color: '#12744a', match: null },
    { id: 'otros', label: 'Otros', color: '#9aa39d', match: null }
  ];
  const CATEGORY_BY_ID = CATEGORIES.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

  // Tipos de movimiento: los que salen de la tarjeta/cuenta y los que entran
  const OUTFLOW_TYPES = ['consumo', 'retiro', 'transferencia'];
  const TYPE_LABELS = {
    consumo: 'Consumo',
    retiro: 'Retiro',
    transferencia: 'Transferencia enviada',
    pago: 'Pago a la tarjeta',
    ingreso: 'Transferencia recibida'
  };

  // --- 3. UTILIDADES DE TEXTO ---
  function flatten(text) {
    return String(text || '')
      .replace(/[|­​‌͏ \t*]/g, ' ')
      .replace(/-{3,}/g, ' ') // separadores de tablas en texto plano
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseAmount(str) {
    return parseFloat(String(str || '').replace(/[^\d.]/g, '')) || 0;
  }

  function dmyToIso(dmy) {
    const m = String(dmy || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return null;
    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }

  const MONTHS_ES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
  function esDateToIso(day, monthName, year) {
    const mm = MONTHS_ES[String(monthName || '').toLowerCase().slice(0, 3)];
    if (!mm) return null;
    return `${year}-${String(mm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function currencyFrom(str) {
    return /US|D[OÓ]LAR/i.test(str || '') ? 'USD' : (/EUR/i.test(str || '') ? 'EUR' : 'DOP');
  }

  function titleCase(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/(^|[\s/-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase())
      .replace(/\b(Apap|Qr|Atm)\b/g, s => s.toUpperCase());
  }

  // Clave estable de un comercio: dos primeras palabras sin números ni signos
  function merchantKey(merchant) {
    const words = String(merchant || '').toUpperCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Z ]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2);
    return words.slice(0, 2).join(' ');
  }

  function statusFrom(str) {
    return /declin|rechaz|deneg|anulad|revers/i.test(str || '') ? 'declinada' : 'aprobada';
  }

  // --- 4. LECTORES POR BANCO ---
  // Cada lector recibe el texto aplanado del correo y su asunto; devuelve un
  // movimiento parcial o null si el correo no describe un movimiento.

  function parseApap(t, subject) {
    if (/no procesada/i.test(subject)) return null;

    let m = t.match(/tarjeta de Cr[eé]dito (.+?) terminada en (\d{4}) presenta una transacci[oó]n/i);
    if (m) {
      return {
        bank: 'apap',
        cardName: titleCase(m[1].replace(/^titular-?/i, '').replace(/\bAPAP\b/i, '').trim()) || 'Tarjeta APAP',
        cardKind: 'credito',
        last4: m[2],
        type: 'consumo',
        date: dmyToIso((t.match(/Fecha:\s*(\d{1,2}\/\d{1,2}\/\d{4})/) || [])[1]),
        time: (t.match(/Hora:\s*(\d{1,2}:\d{2})/) || [])[1] || '',
        currency: currencyFrom((t.match(/Moneda:\s*(\S+)/) || [])[1]),
        amount: parseAmount((t.match(/Monto:\s*(?:US\$|RD\$)?\s*([\d,]+(?:\.\d+)?)/) || [])[1]),
        merchant: ((t.match(/Comercio:\s*(.+?)\s+Estado:/) || [])[1] || '').trim(),
        status: statusFrom((t.match(/Estado:\s*(\S+)/) || [])[1])
      };
    }

    m = t.match(/titular (.+?) terminada en (\d{4}) ha recibido un pago/i);
    if (m) {
      return {
        bank: 'apap',
        cardName: titleCase(m[1].replace(/\bAPAP\b/i, '').trim()) || 'Tarjeta APAP',
        cardKind: 'credito',
        last4: m[2],
        type: 'pago',
        date: dmyToIso((t.match(/Fecha:\s*(\d{1,2}\/\d{1,2}\/\d{4})/) || [])[1]),
        time: (t.match(/Hora:\s*(\d{1,2}:\d{2})/) || [])[1] || '',
        currency: currencyFrom((t.match(/Moneda:\s*(\S+)/) || [])[1]),
        amount: parseAmount((t.match(/Monto:\s*(?:US\$|RD\$)?\s*([\d,]+(?:\.\d+)?)/) || [])[1]),
        merchant: 'Pago recibido',
        status: statusFrom((t.match(/Estado:\s*(.+?)\s+Balance/) || [])[1])
      };
    }

    m = t.match(/Cuenta de Ahorros? APAP terminada en (\d{4}),? presenta (?:una|un) (Transferencia ACH|Pago al Instante BCRD entrante)/i);
    if (m) {
      const incoming = /entrante/i.test(m[2]);
      return {
        bank: 'apap',
        cardName: 'Cuenta de ahorros APAP',
        cardKind: 'cuenta',
        last4: m[1],
        type: incoming ? 'ingreso' : 'transferencia',
        date: dmyToIso((t.match(/Fecha:\s*(\d{1,2}\/\d{1,2}\/\d{4})/) || [])[1]),
        time: (t.match(/Hora:\s*(\d{1,2}:\d{2})/) || [])[1] || '',
        currency: 'DOP',
        amount: parseAmount((t.match(/Monto RD\$:\s*([\d,]+(?:\.\d+)?)/) || [])[1]),
        merchant: incoming
          ? 'Pago al instante recibido'
          : ((t.match(/Beneficiario:\s*(.+?)\s+Cuenta Destino/) || [])[1] || 'Transferencia ACH').trim(),
        status: 'aprobada'
      };
    }
    return null;
  }

  function parsePopular(t, subject) {
    let m;

    // Retiro con Código Cash (sale de la cuenta, no de una tarjeta)
    if (/C[oó]digo Cash/i.test(subject) || /C[oó]digo Cash generado/i.test(t)) {
      m = t.match(/Monto Fecha Estatus RD\$?\s?([\d,]+(?:\.\d+)?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\S+)/i);
      if (!m) return null;
      return {
        bank: 'popular', cardName: 'Cuenta Popular', cardKind: 'cuenta', last4: '',
        type: 'retiro', date: dmyToIso(m[2]), time: '', currency: 'DOP',
        amount: parseAmount(m[1]), merchant: 'Retiro con Código Cash', status: statusFrom(m[3])
      };
    }

    // Transferencia recibida por app / internet banking
    m = t.match(/transferencia recibida en su cuenta terminada en (\d{4})\s*:?\s*Monto Fecha Canal RD\$?\s?([\d,]+(?:\.\d+)?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)(?:\s+Si necesita|$)/i);
    if (m) {
      return {
        bank: 'popular', cardName: 'Cuenta Popular', cardKind: 'cuenta', last4: '',
        type: 'ingreso', date: dmyToIso(m[3]), time: '', currency: 'DOP',
        amount: parseAmount(m[2]), merchant: `Transferencia recibida (${titleCase(m[4].trim())})`, status: 'aprobada'
      };
    }

    // Pago al instante enviado
    m = t.match(/Beneficiario:\s*(.+?)\s+Cuenta o Producto:\s*\S+\s+Monto:\s*RD\$\s?([\d,]+(?:\.\d+)?)\s+Fecha:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (m) {
      return {
        bank: 'popular', cardName: 'Cuenta Popular', cardKind: 'cuenta', last4: '',
        type: 'transferencia', date: dmyToIso(m[3]), time: '', currency: 'DOP',
        amount: parseAmount(m[2]), merchant: titleCase(m[1].trim()), status: 'aprobada'
      };
    }

    // Consumo o retiro con tarjeta
    const card = t.match(/utilizar su (?:Tarjeta )?(.+?),? terminada en (\d{4})/i);
    const row = t.match(/(RD|US)\$\s?([\d,]+(?:\.\d+)?)\s+(?:(?:Peso dominicano|D[oó]lar estadounidense|Euro)\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+(Aprobada|Declinada|Rechazada|Reversada|Anulada)\b/i);
    if (card && row) {
      const cardName = titleCase(card[1].trim());
      const isRetiro = /retiro/i.test(subject) || /Cajero Autom/i.test(t);
      return {
        bank: 'popular',
        cardName,
        cardKind: /d[eé]bito/i.test(cardName) ? 'debito' : 'credito',
        last4: card[2],
        type: isRetiro ? 'retiro' : 'consumo',
        date: dmyToIso(row[3]),
        time: '',
        currency: row[1].toUpperCase() === 'US' ? 'USD' : 'DOP',
        amount: parseAmount(row[2]),
        merchant: isRetiro ? `Cajero ${titleCase(row[4].trim())}` : row[4].trim(),
        status: statusFrom(row[5])
      };
    }
    return null;
  }

  // PayPal no se suma por su cuenta: el cargo llega también por el banco.
  // Se guarda aparte y se usa para ponerle nombre al cargo "PAYPAL *…" del banco.
  function parsePaypal(t) {
    const m = t.match(/Ha (?:pagado|autorizado un pago de) \$([\d,]+(?:\.\d+)?) (USD|EUR|DOP) a (.+?)(?:\s+\(|\s+Ver o administrar)/i);
    if (!m) return null;
    const id = (t.match(/Id\. de transacci[oó]n ([A-Z0-9]{10,20})/) || [])[1];
    const d = t.match(/Fecha de la transacci[oó]n (\d{1,2}) (\p{L}{3})\p{L}* (\d{4})/u);
    const funding = t.match(/(Mastercard|Visa|American Express|Amex|Discover)-(\d{4})\s+\$([\d,]+(?:\.\d+)?)\s+(DOP|USD|EUR)/i);
    return {
      paypalId: id || null,
      merchant: m[3].replace(/\.\.\.$/, '').trim(),
      amount: parseAmount(m[1]),
      currency: m[2].toUpperCase(),
      date: d ? esDateToIso(d[1], d[2], d[3]) : null,
      fundingLast4: funding ? funding[2] : '',
      fundingAmount: funding ? parseAmount(funding[3]) : 0,
      fundingCurrency: funding ? funding[4].toUpperCase() : ''
    };
  }

  // Punto de entrada: decide el lector por remitente
  function parseEmail({ from, subject, text }) {
    const t = flatten(text);
    const sender = String(from || '').toLowerCase();
    if (sender.includes('apap.com.do')) return { kind: 'bank', data: parseApap(t, subject || '') };
    if (sender.includes('popularenlinea.com')) return { kind: 'bank', data: parsePopular(t, subject || '') };
    if (sender.includes('paypal')) return { kind: 'paypal', data: parsePaypal(t) };
    return { kind: 'none', data: null };
  }

  // --- 5. ALMACÉN LOCAL ---
  function emptyStore() {
    return { version: 1, tx: {}, paypal: {}, seen: {}, rules: {}, cards: {}, lastSync: 0, updatedAt: 0 };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyStore();
      return { ...emptyStore(), ...JSON.parse(raw) };
    } catch (e) {
      console.warn('No se pudo leer el historial de movimientos:', e);
      return emptyStore();
    }
  }

  function saveStore(store) {
    store.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('No se pudo guardar el historial de movimientos:', e);
    }
    return store;
  }

  function clearStore() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* sin acceso a storage */ }
    return emptyStore();
  }

  // Une dos almacenes (nube + local). En reglas y nombres de tarjeta gana el más reciente.
  function mergeStores(a, b) {
    const base = { ...emptyStore(), ...a };
    const other = { ...emptyStore(), ...b };
    const newer = (other.updatedAt || 0) > (base.updatedAt || 0) ? other : base;
    const older = newer === other ? base : other;
    return {
      ...emptyStore(),
      tx: { ...older.tx, ...newer.tx },
      paypal: { ...older.paypal, ...newer.paypal },
      seen: { ...older.seen, ...newer.seen },
      rules: { ...older.rules, ...newer.rules },
      cards: { ...older.cards, ...newer.cards },
      lastSync: Math.max(base.lastSync || 0, other.lastSync || 0),
      updatedAt: Math.max(base.updatedAt || 0, other.updatedAt || 0)
    };
  }

  // Agrega el resultado de un correo al almacén
  function ingestParsed(store, msg, parsed) {
    store.seen[msg.id] = 1;
    if (!parsed || !parsed.data) return null;

    if (parsed.kind === 'paypal') {
      const key = parsed.data.paypalId || msg.id;
      store.paypal[key] = { ...parsed.data, date: parsed.data.date || msg.date, msgId: msg.id };
      return null;
    }

    const d = parsed.data;
    if (!d.amount) return null;
    const cardId = `${d.bank}-${d.cardKind === 'cuenta' ? 'cuenta' : d.last4}`;
    if (!store.cards[cardId]) {
      store.cards[cardId] = { id: cardId, bank: d.bank, name: d.cardName, kind: d.cardKind, last4: d.last4 };
    }
    const tx = {
      id: msg.id,
      cardId,
      date: d.date || msg.date,
      time: d.time || '',
      merchant: d.merchant || '',
      amount: d.amount,
      currency: d.currency || 'DOP',
      type: d.type,
      status: d.status || 'aprobada'
    };
    store.tx[msg.id] = tx;
    return tx;
  }

  // --- 6. CATEGORÍAS Y VISTAS ---
  function autoCategory(tx) {
    if (tx.type === 'retiro') return 'efectivo';
    if (tx.type === 'transferencia') return 'transferencias';
    if (tx.type === 'pago') return 'pagos';
    if (tx.type === 'ingreso') return 'ingresos';
    const name = ` ${String(tx.merchantDetail || tx.merchant || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9 ]/g, ' ')} `;
    const hit = CATEGORIES.find(c => c.match && c.match.test(name));
    return hit ? hit.id : 'otros';
  }

  function categoryFor(tx, rules) {
    if (tx.type === 'consumo') {
      const rule = (rules || {})[merchantKey(tx.merchantDetail || tx.merchant)];
      if (rule && CATEGORY_BY_ID[rule]) return rule;
    }
    return autoCategory(tx);
  }

  function daysBetween(isoA, isoB) {
    return Math.abs((new Date(isoA) - new Date(isoB)) / 86400000);
  }

  // Lista de movimientos lista para mostrar: categorías aplicadas y cargos de PayPal con nombre
  function getMovements(store) {
    const list = Object.values(store.tx || {}).map(tx => ({ ...tx }));
    const cardsByLast4 = {};
    Object.values(store.cards || {}).forEach(c => { if (c.last4) cardsByLast4[c.last4] = c.id; });

    Object.values(store.paypal || {}).forEach(pp => {
      if (!pp.fundingLast4) return;
      const cardId = cardsByLast4[pp.fundingLast4];
      if (!cardId) return;
      const match = list.find(tx =>
        tx.cardId === cardId &&
        !tx.merchantDetail &&
        /PAYPAL/i.test(tx.merchant) &&
        tx.currency === pp.fundingCurrency &&
        Math.abs(tx.amount - pp.fundingAmount) <= Math.max(1, pp.fundingAmount * 0.03) &&
        pp.date && tx.date && daysBetween(tx.date, pp.date) <= 5
      );
      if (match) match.merchantDetail = `${pp.merchant} (PayPal)`;
    });

    list.forEach(tx => {
      tx.category = categoryFor(tx, store.rules);
      tx.isOutflow = OUTFLOW_TYPES.includes(tx.type);
    });

    return list.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }

  function getCards(store) {
    const order = { credito: 0, debito: 1, cuenta: 2 };
    return Object.values(store.cards || {}).sort((a, b) =>
      (order[a.kind] - order[b.kind]) || a.name.localeCompare(b.name));
  }

  // Totales por moneda (sin declinadas) y desglose de gasto por categoría
  function summarize(movements) {
    const totals = { out: { DOP: 0, USD: 0, EUR: 0 }, in: { DOP: 0, USD: 0, EUR: 0 }, count: 0 };
    const byCategory = {};
    movements.forEach(tx => {
      if (tx.status === 'declinada') return;
      totals.count++;
      const bucket = tx.isOutflow ? totals.out : totals.in;
      bucket[tx.currency] = (bucket[tx.currency] || 0) + tx.amount;
      if (tx.isOutflow) {
        const c = byCategory[tx.category] || (byCategory[tx.category] = { id: tx.category, DOP: 0, USD: 0, EUR: 0, count: 0 });
        c[tx.currency] = (c[tx.currency] || 0) + tx.amount;
        c.count++;
      }
    });
    // Orden por pesos y, en empate (p. ej. solo dólares), por dólares; no se convierte moneda
    const categories = Object.values(byCategory).sort((a, b) => (b.DOP - a.DOP) || (b.USD - a.USD));
    return { totals, categories };
  }

  // --- 7. SESIÓN DE GOOGLE (GIS) ---
  let tokenClient = null;
  let session = null; // { token, expiresAt }

  function waitForGis(timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) return resolve();
        if (Date.now() - start > timeoutMs) return reject(new Error('No cargó el inicio de sesión de Google. Revisa tu conexión.'));
        setTimeout(check, 100);
      })();
    });
  }

  function hasSession() {
    return !!(session && session.expiresAt > Date.now() + 30000);
  }

  async function signIn() {
    if (hasSession()) return session.token;
    await waitForGis();
    return new Promise((resolve, reject) => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: (resp) => {
          if (resp.error) return reject(new Error(resp.error_description || resp.error));
          session = { token: resp.access_token, expiresAt: Date.now() + (Number(resp.expires_in) || 3600) * 1000 };
          resolve(session.token);
        },
        error_callback: (err) => reject(new Error(err && err.type === 'popup_closed' ? 'Cerraste la ventana de Google antes de terminar.' : 'No se pudo iniciar sesión con Google.'))
      });
      tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  function signOut() {
    if (session && window.google && window.google.accounts && window.google.accounts.oauth2) {
      window.google.accounts.oauth2.revoke(session.token, () => {});
    }
    session = null;
  }

  // --- 8. GMAIL API ---
  async function gmailGet(path) {
    if (!hasSession()) throw new Error('La sesión de Google venció. Vuelve a conectar Gmail.');
    const res = await fetch(`${GMAIL_API}${path}`, { headers: { Authorization: `Bearer ${session.token}` } });
    if (res.status === 401) {
      session = null;
      throw new Error('La sesión de Google venció. Vuelve a conectar Gmail.');
    }
    if (res.status === 403) throw new Error('Google rechazó el acceso a Gmail. Revisa que la API de Gmail esté habilitada en el proyecto.');
    if (!res.ok) throw new Error(`Gmail respondió con error ${res.status}.`);
    return res.json();
  }

  async function listMessageIds(sinceIso) {
    const after = sinceIso ? ` after:${sinceIso.replace(/-/g, '/')}` : '';
    const q = encodeURIComponent(`(${GMAIL_QUERY})${after}`);
    const ids = [];
    let pageToken = '';
    do {
      const page = await gmailGet(`/messages?q=${q}&maxResults=500${pageToken ? `&pageToken=${pageToken}` : ''}`);
      (page.messages || []).forEach(m => ids.push(m.id));
      pageToken = page.nextPageToken || '';
    } while (pageToken);
    return ids;
  }

  function decodeBase64Url(data, charset) {
    const b64 = String(data || '').replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    try {
      return new TextDecoder(charset || 'utf-8').decode(bytes);
    } catch (e) {
      return new TextDecoder('utf-8').decode(bytes);
    }
  }

  function findPart(part, mime) {
    if (!part) return null;
    if (part.mimeType === mime && part.body && part.body.data) return part;
    for (const child of part.parts || []) {
      const hit = findPart(child, mime);
      if (hit) return hit;
    }
    return null;
  }

  function partCharset(part) {
    const ct = ((part.headers || []).find(h => h.name.toLowerCase() === 'content-type') || {}).value || '';
    return (ct.match(/charset="?([\w-]+)"?/i) || [])[1];
  }

  // HTML → texto con separadores entre celdas (las tablas de los bancos pegan las celdas)
  function htmlToText(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('style, script, head').forEach(el => el.remove());
    doc.querySelectorAll('td, th, br, p, div, tr, li, h1, h2, h3, h4, span, b, strong').forEach(el => el.append(' '));
    return doc.body ? doc.body.textContent : '';
  }

  async function fetchMessage(id) {
    const msg = await gmailGet(`/messages/${id}?format=full`);
    const headers = (msg.payload && msg.payload.headers) || [];
    const header = (name) => ((headers.find(h => h.name.toLowerCase() === name) || {}).value || '');
    const plain = findPart(msg.payload, 'text/plain');
    const html = findPart(msg.payload, 'text/html');
    let text = '';
    if (html) text = htmlToText(decodeBase64Url(html.body.data, partCharset(html)));
    if (plain && flatten(text).length < 40) text = decodeBase64Url(plain.body.data, partCharset(plain));
    const date = new Date(Number(msg.internalDate) || Date.now());
    return {
      id,
      from: header('from'),
      subject: header('subject'),
      text,
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    };
  }

  // Lee los correos nuevos desde una fecha y los agrega al almacén
  async function syncFromGmail(store, { sinceIso, onProgress } = {}) {
    const ids = await listMessageIds(sinceIso);
    const pending = ids.filter(id => !store.seen[id]);
    let done = 0;
    let added = 0;
    let unreadable = 0;
    onProgress && onProgress({ done, total: pending.length });

    const queue = pending.slice();
    async function worker() {
      while (queue.length) {
        const id = queue.shift();
        try {
          const msg = await fetchMessage(id);
          const parsed = parseEmail(msg);
          if (parsed.kind === 'bank' && !parsed.data) unreadable++;
          if (ingestParsed(store, msg, parsed)) added++;
        } catch (err) {
          if (/venci|rechaz/i.test(err.message)) throw err;
          console.warn('No se pudo leer el correo', id, err);
        }
        done++;
        onProgress && onProgress({ done, total: pending.length });
      }
    }
    await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, pending.length) }, worker));

    store.lastSync = Date.now();
    saveStore(store);
    return { found: ids.length, read: pending.length, added, unreadable };
  }

  // --- 9. GUARDADO EN GOOGLE SHEETS (Apps Script) ---
  async function callScript(gasUrl, payload) {
    if (!gasUrl) throw new Error('No hay URL de Apps Script configurada.');
    if (!hasSession()) throw new Error('Conecta Gmail para guardar en la hoja.');
    // text/plain evita la verificación previa CORS; Apps Script responde con JSON legible
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, token: session.token })
    });
    const data = await res.json().catch(() => null);
    if (!data || typeof data.ok !== 'boolean') {
      throw new Error('El Apps Script no reconoce los movimientos: actualiza gas_backend.gs y vuelve a implementarlo.');
    }
    if (!data.ok) throw new Error(data.error || 'El Apps Script rechazó la petición.');
    return data;
  }

  async function cloudLoad(gasUrl) {
    const data = await callScript(gasUrl, { action: 'txLoad' });
    return data.store || null;
  }

  async function cloudSave(gasUrl, store) {
    await callScript(gasUrl, { action: 'txSave', store });
    return true;
  }

  // --- EXPOSICIÓN GLOBAL ---
  window.FinanzasBancos = {
    CATEGORIES,
    CATEGORY_BY_ID,
    TYPE_LABELS,
    flatten,
    parseEmail,
    merchantKey,
    emptyStore,
    loadStore,
    saveStore,
    clearStore,
    mergeStores,
    ingestParsed,
    getMovements,
    getCards,
    summarize,
    hasSession,
    signIn,
    signOut,
    syncFromGmail,
    cloudLoad,
    cloudSave
  };

})(window);
