/**
 * ==============================================================================
 * MAESTRO.js - Motor de Datos, Cálculos y Caché Local (la nube vive en MAESTRO.supabase.js)
 * Proyecto: Financial Budget Dashboard (Finanzas)
 * ==============================================================================
 * Este archivo centraliza:
 * 1. Definición de modelos de datos predeterminados (Categorías, Resumen, Tarjetas, Notas, Distribución).
 * 2. Persistencia: caché en localStorage y mezcla con la nube (Supabase) con resolución de conflictos por timestamp.
 * 3. Cálculos financieros: Total Income, Total Expenses, Remaining Balance, Sueldo Cuadre,
 *    categorías virtuales (Difference / Prests, mant), totales de distribución y anuales.
 * 4. Utilidades de formateo y validación monetaria.
 */

(function (window) {
  'use strict';

  // --- 1. CONFIGURACIÓN Y CONSTANTES ---
  const STORAGE_KEY_BY_MONTH = 'budget_by_month';
  const STORAGE_KEY_COLLAPSED = 'collapsed_categories';
  const STORAGE_KEY_SHARED = 'finanzas_shared';

  // Categorías base predeterminadas
  const DEFAULT_CATEGORIES = [
    { id: 'sueldo', name: 'Sueldo', budgeted: 0, parentId: null, canDelete: false },
    { id: 'carro', name: 'Carro(seguro, prest, mant)', budgeted: 0, parentId: null, canDelete: false },
    { id: 'carro-seguro', name: 'Carro(seguro)', budgeted: 0, parentId: 'carro', canDelete: true },
    { id: 'carro-prest-mant', name: 'Prests, mant', budgeted: 0, parentId: 'carro', canDelete: true },
    { id: 'viajes', name: 'Viajes/Vacaciones', budgeted: 0, parentId: null, canDelete: true },
    { id: 'gastos-m', name: 'Gastos M', budgeted: 0, parentId: null, canDelete: true },
    { id: 'casa-inversion', name: 'Casa(inversion)', budgeted: 0, parentId: null, canDelete: true }
  ];

  // Resumen inicial de fin de año
  const DEFAULT_SUMMARY_ROWS = [
    { category: 'BONO VACA', amount: 34990, destino: 'GASTOS PENDIENTES' },
    { category: 'DOBLE', amount: 91567, destino: 'bolsa' },
    { category: 'NAVIDAD', amount: 128820, destino: 'deuda carro' },
    { category: 'BONO VACA', amount: 34908, destino: 'AHORRADO' }
  ];

  // Notas iniciales de plantilla
  const DEFAULT_NOTES = [
    {
      id: 'note-1',
      tag: 'STRATEGY',
      title: 'Q3 Investment Strategy - June 2026',
      date: '18/06/2026',
      content: 'Review portfolio performance.\nConsider increasing exposure to renewable energy sector.\nAnalyze emerging market trends and adjust bond allocation.',
      notes: 'Met with advisor, suggested looking into green bonds.',
      pinned: true
    },
    {
      id: 'note-2',
      tag: 'GOAL',
      title: 'Vacation Planning - Europe',
      date: '15/06/2026',
      content: 'Budget: $8,000.\nAccommodations: Booked flights and hotels.\nActivities: Researching museums and tours.\nCurrency exchange rates are favorable.',
      notes: '',
      pinned: true
    },
    {
      id: 'note-3',
      tag: 'REMINDER',
      title: 'Car Loan Strategy',
      date: '10/06/2026',
      content: 'Contact bank for refinancing options.\nCompare interest rates.\nCalculate potential savings.',
      notes: 'Current rate: 5.5%.',
      pinned: false
    },
    {
      id: 'note-4',
      tag: 'IDEA',
      title: 'Side Hustle Income',
      date: '05/06/2026',
      content: 'Explore freelance opportunities.\nSet up online profile.\nResearch pricing and competition.',
      notes: '',
      pinned: false
    }
  ];

  // Estructura complementaria mensual (Distribución, Tarjetas, Tablas de Resumen, Notas)
  const DEFAULT_APP_EXTRA = {
    summaryTables: [
      { id: 'summary-main', title: 'Year-End Summary 2025', editable: false, rows: DEFAULT_SUMMARY_ROWS }
    ],
    distribucion: {
      qik: { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] },
      'gastos-m-p2': { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] },
      apap: { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] },
      'gastos-m-p1': { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] }
    },
    tarjetas: {
      'tc-contigo': { usdDone: false, dopDone: false },
      'tc-jetblue': { usdDone: false, dopDone: false },
      'tc-apap': { usdDone: false, dopDone: false }
    },
    notes: DEFAULT_NOTES,
    // 0 = plantilla sin editar: cualquier versión guardada en la nube tiene prioridad
    lastSaved: 0
  };

  // Paleta de categorías (tonos sobrios, distinguibles entre sí). La primera raíz es Sueldo.
  const CATEGORY_COLORS = [
    { parent: 'rgba(15, 107, 82, 0.14)', child: 'rgba(15, 107, 82, 0.06)', solid: '#0f6b52' },   // Verde (sueldo)
    { parent: 'rgba(46, 108, 158, 0.14)', child: 'rgba(46, 108, 158, 0.06)', solid: '#2e6c9e' },  // Azul
    { parent: 'rgba(196, 133, 40, 0.14)', child: 'rgba(196, 133, 40, 0.06)', solid: '#c48528' },  // Ámbar
    { parent: 'rgba(122, 92, 168, 0.14)', child: 'rgba(122, 92, 168, 0.06)', solid: '#7a5ca8' },  // Violeta
    { parent: 'rgba(190, 86, 72, 0.14)', child: 'rgba(190, 86, 72, 0.06)', solid: '#be5648' },    // Teja
    { parent: 'rgba(42, 143, 140, 0.14)', child: 'rgba(42, 143, 140, 0.06)', solid: '#2a8f8c' },  // Turquesa
    { parent: 'rgba(176, 90, 130, 0.14)', child: 'rgba(176, 90, 130, 0.06)', solid: '#b05a82' },  // Ciruela
    { parent: 'rgba(118, 140, 52, 0.14)', child: 'rgba(118, 140, 52, 0.06)', solid: '#768c34' }   // Oliva
  ];

  // --- 2. LOCALSTORAGE SEGURO ---
  const safeStorage = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('safeStorage.get error:', e);
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('safeStorage.set error:', e);
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('safeStorage.remove error:', e);
      }
    }
  };

  // --- 3. UTILIDADES DE TIEMPO Y FORMATEO ---
  function getCurrentYYYYMM() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function formatMonthLabel(yyyyMM) {
    if (!yyyyMM || !yyyyMM.includes('-')) return '';
    const [yyyy, mm] = yyyyMM.split('-');
    const date = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, 1);
    const monthName = date.toLocaleString('es-ES', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${yyyy}`;
  }

  function formatCurrency(val) {
    const num = Number(val) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatMoney(val) {
    const num = Number(val) || 0;
    return num < 0 ? `-$${formatCurrency(Math.abs(num))}` : `$${formatCurrency(num)}`;
  }

  function parseCurrency(str) {
    if (typeof str === 'number') return isNaN(str) ? 0 : str;
    if (!str) return 0;
    const cleaned = String(str).replace(/[^0-9.\-]/g, '');
    return parseFloat(cleaned) || 0;
  }

  // --- 4. MOTOR DE CÁLCULO FINANCIERO ---

  // Suma de hijos directos de una categoría
  function getChildrenSum(categories, catId) {
    if (!Array.isArray(categories)) return 0;
    const children = categories.filter(c => c.parentId === catId);
    return children.reduce((sum, c) => sum + (Number(c.budgeted) || 0), 0);
  }

  // Categorías virtuales "Difference" (Diferencia entre presupuesto del padre y la suma de sus hijos)
  function getVirtualCategories(categories) {
    if (!Array.isArray(categories)) return [];
    const virtuals = [];
    categories.forEach(cat => {
      const hasChildren = categories.some(c => c.parentId === cat.id);
      if (hasChildren) {
        const childrenSum = getChildrenSum(categories, cat.id);
        const diff = (Number(cat.budgeted) || 0) - childrenSum;
        virtuals.push({
          id: `${cat.id}-difference`,
          parentId: cat.id,
          name: 'Difference',
          budgeted: diff,
          isVirtual: true
        });
      }
    });
    return virtuals;
  }

  function getCategoriesWithVirtuals(categories) {
    return (categories || []).concat(getVirtualCategories(categories));
  }

  // Métricas principales (Total Income, Total Expenses, Remaining Balance)
  function computeMetrics(categories) {
    if (!Array.isArray(categories)) {
      return { totalIncome: 0, totalExpenses: 0, remainingBalance: 0 };
    }
    const sueldoCat = categories.find(c => c.id === 'sueldo');
    const sueldoHasChildren = categories.some(c => c.parentId === 'sueldo');
    const totalIncome = sueldoCat ? (sueldoHasChildren ? getChildrenSum(categories, 'sueldo') : (Number(sueldoCat.budgeted) || 0)) : 0;

    const otherRoot = categories.filter(c => c.id !== 'sueldo' && c.parentId === null);
    const totalExpenses = otherRoot.reduce((sum, c) => sum + (Number(c.budgeted) || 0), 0);
    const remainingBalance = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, remainingBalance };
  }

  // Sugerencia de monto en Distribución basado en categoría o subcategoría seleccionada
  function computeDistribucionSuggested(categories, catId, subId) {
    if (!catId || !Array.isArray(categories)) return 0;
    if (!subId) {
      const cat = categories.find(c => c.id === catId);
      return cat ? (Number(cat.budgeted) || 0) : 0;
    }
    if (subId === '__todas__') {
      const cat = categories.find(c => c.id === catId);
      return cat ? (Number(cat.budgeted) || 0) : 0;
    }
    if (subId.endsWith('-difference')) {
      const parentId = subId.replace('-difference', '');
      const parent = categories.find(c => c.id === parentId);
      if (!parent) return 0;
      return (Number(parent.budgeted) || 0) - getChildrenSum(categories, parentId);
    }
    const sub = categories.find(c => c.id === subId);
    return sub ? (Number(sub.budgeted) || 0) : 0;
  }

  // Total de una tarjeta de distribución
  function computeDistribucionCardTotal(distCardData) {
    if (!distCardData || !Array.isArray(distCardData.rows)) return 0;
    return distCardData.rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }

  // Total de una tabla de resumen
  function computeSummaryTotal(rows) {
    if (!Array.isArray(rows)) return 0;
    return rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }

  // Datos para gráfico anual de Distribución
  function computeAnnualDistribucionData(byMonth, currentYear) {
    const months = Array.from({ length: 12 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`);
    let maxIncome = 1;

    const monthlyBreakdown = months.map((m, idx) => {
      const mData = byMonth ? byMonth[m] : null;
      const cats = mData && Array.isArray(mData.categories) ? mData.categories : [];
      const sueldoCat = cats.find(c => c.id === 'sueldo');
      const hasChildren = cats.some(c => c.parentId === 'sueldo');
      const income = sueldoCat ? (hasChildren ? getChildrenSum(cats, 'sueldo') : (Number(sueldoCat.budgeted) || 0)) : 0;
      if (income > maxIncome) maxIncome = income;

      const expCats = cats.filter(c => c.id !== 'sueldo' && c.parentId === null);
      const segments = expCats.map(cat => ({
        id: cat.id,
        name: cat.name,
        amount: Number(cat.budgeted) || 0
      })).filter(s => s.amount > 0);
      // La escala cubre también los meses en que los gastos superan al ingreso
      const expenses = segments.reduce((sum, s) => sum + s.amount, 0);
      if (expenses > maxIncome) maxIncome = expenses;

      const d = new Date(parseInt(currentYear, 10), idx, 1);
      const label = d.toLocaleString('es-ES', { month: 'short' }).toUpperCase();

      return {
        monthKey: m,
        label,
        income,
        expenses,
        segments,
        isFuture: m > getCurrentYYYYMM()
      };
    });

    return { monthlyBreakdown, maxIncome };
  }

  // Asignador de colores estables por categoría
  function getCategoryColor(cat, isChild, allCategories) {
    if (!cat) return null;
    let rootId = cat.parentId === null ? cat.id : cat.parentId;
    let current = cat;
    while (current && current.parentId !== null) {
      const p = (allCategories || []).find(c => c.id === current.parentId);
      if (p) {
        rootId = p.id;
        current = p;
      } else {
        break;
      }
    }
    const topLevel = (allCategories || []).filter(c => c.parentId === null);
    const index = topLevel.findIndex(c => c.id === rootId);
    if (index === -1) return null;
    const palette = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    return isChild ? palette.child : palette.parent;
  }

  // Color sólido de la categoría raíz (puntos, barras y leyendas)
  function getCategoryAccent(cat, allCategories) {
    if (!cat) return null;
    const all = allCategories || [];
    let current = cat;
    while (current && current.parentId !== null) {
      const p = all.find(c => c.id === current.parentId);
      if (!p) break;
      current = p;
    }
    const index = all.filter(c => c.parentId === null).findIndex(c => c.id === current.id);
    if (index === -1) return null;
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length].solid;
  }

  // --- 5. GESTOR DE DATOS MENSUALES Y MIGRACIÓN ---

  function ensureAppExtraDefaults(extra) {
    const copy = extra && typeof extra === 'object' ? JSON.parse(JSON.stringify(extra)) : {};
    if (!copy.summaryTables || !Array.isArray(copy.summaryTables)) {
      copy.summaryTables = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.summaryTables));
    }
    if (!copy.distribucion || typeof copy.distribucion !== 'object') {
      copy.distribucion = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.distribucion));
    }
    if (!copy.tarjetas || typeof copy.tarjetas !== 'object') {
      copy.tarjetas = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.tarjetas));
    }
    if (!copy.notes || !Array.isArray(copy.notes)) {
      copy.notes = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.notes));
    }

    // Normalizar filas de distribución { pendingDone, rows }
    Object.keys(copy.distribucion).forEach(k => {
      const val = copy.distribucion[k];
      if (Array.isArray(val)) {
        copy.distribucion[k] = { pendingDone: false, rows: val };
      } else if (val && typeof val === 'object' && !Array.isArray(val.rows)) {
        val.rows = val.rows || [{ catId: '', subId: '', amount: 0 }];
        val.pendingDone = !!val.pendingDone;
      }
    });

    // Migración nombre de tabla de resumen principal
    const mainSummary = copy.summaryTables.find(t => t.id === 'summary-main');
    if (mainSummary && mainSummary.title === 'Year-End Summary') {
      mainSummary.title = 'Year-End Summary 2025';
    }

    return copy;
  }

  // Copia un mes como base de otro: reinicia los estados PENDIENTE y marca la copia
  // como no editada (lastSaved 0) para que una versión real en la nube tenga prioridad.
  function cloneMonthAsTemplate(monthData) {
    const cloned = JSON.parse(JSON.stringify(monthData));
    cloned.extra = ensureAppExtraDefaults(cloned.extra);
    Object.keys(cloned.extra.tarjetas).forEach(k => {
      cloned.extra.tarjetas[k].usdDone = false;
      cloned.extra.tarjetas[k].dopDone = false;
    });
    Object.keys(cloned.extra.distribucion).forEach(k => {
      cloned.extra.distribucion[k].pendingDone = false;
    });
    cloned.extra.lastSaved = 0;
    return cloned;
  }

  function createMonthFrom(byMonth, targetMonth) {
    const prevMonths = Object.keys(byMonth || {}).sort().filter(m => m < targetMonth);
    if (prevMonths.length > 0) {
      return cloneMonthAsTemplate(byMonth[prevMonths[prevMonths.length - 1]]);
    }
    return {
      categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
      extra: JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA))
    };
  }

  // Valida la forma { "YYYY-MM": { categories: [...] } } (nube y respaldos importados)
  function isValidByMonth(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    return Object.keys(obj).every(k => /^\d{4}-\d{2}$/.test(k) && obj[k] && Array.isArray(obj[k].categories));
  }

  function monthLastSaved(month) {
    return (month && month.extra && month.extra.lastSaved) || 0;
  }

  // Une los meses de la nube con los locales: por mes gana la versión con lastSaved más reciente
  // (la nube gana en empate). Devuelve null si la respuesta no trae meses válidos.
  function mergeCloudByMonth(localByMonth, cloudData) {
    const loaded = cloudData && cloudData.byMonth;
    if (!isValidByMonth(loaded) || Object.keys(loaded).length === 0) return null;

    const merged = { ...localByMonth };
    Object.keys(loaded).forEach(m => {
      const cloudMonth = loaded[m];
      const localMonth = merged[m];
      if (!localMonth || monthLastSaved(cloudMonth) >= monthLastSaved(localMonth)) merged[m] = cloudMonth;
    });
    return merged;
  }

  // --- 5b. DATOS COMPARTIDOS ENTRE MESES ---
  // Las notas y los pagos de tarjeta marcados a mano no dependen del mes que se está viendo:
  // { notes: [...], cardPayments: { [tarjeta]: { [mes de vencimiento]: { DOP, USD } } }, lastSaved }

  function normalizeShared(shared) {
    if (!shared || typeof shared !== 'object' || !Array.isArray(shared.notes)) return null;
    return {
      notes: shared.notes,
      cardPayments: shared.cardPayments && typeof shared.cardPayments === 'object' ? shared.cardPayments : {},
      lastSaved: Number(shared.lastSaved) || 0
    };
  }

  function loadStoredShared() {
    const raw = safeStorage.get(STORAGE_KEY_SHARED);
    if (!raw) return null;
    try {
      return normalizeShared(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function storeShared(shared) {
    safeStorage.set(STORAGE_KEY_SHARED, JSON.stringify(shared));
  }

  // Antes se guardaban dentro de cada mes: notas del mes editado más recientemente
  // y marcas de pago de todos los meses. lastSaved 0 para que la nube tenga prioridad.
  function deriveSharedFromMonths(byMonth) {
    const months = Object.keys(byMonth || {})
      .sort((a, b) => monthLastSaved(byMonth[a]) - monthLastSaved(byMonth[b]) || a.localeCompare(b));
    let notes = null;
    const cardPayments = {};
    months.forEach(m => {
      const extra = (byMonth[m] && byMonth[m].extra) || {};
      if (Array.isArray(extra.notes) && (extra.lastSaved || 0) > 0) notes = extra.notes;
      Object.keys(extra.tarjetas || {}).forEach(card => {
        const manual = extra.tarjetas[card] && extra.tarjetas[card].manual;
        if (manual && typeof manual === 'object') cardPayments[card] = { ...(cardPayments[card] || {}), ...manual };
      });
    });
    if (!notes) {
      const current = byMonth && byMonth[getCurrentYYYYMM()];
      notes = (current && current.extra && Array.isArray(current.extra.notes))
        ? current.extra.notes
        : JSON.parse(JSON.stringify(DEFAULT_NOTES));
    }
    return { notes, cardPayments, lastSaved: 0 };
  }

  // Devuelve la versión de la nube si es igual o más reciente que la local; si no, la local
  function mergeCloudShared(localShared, cloudShared) {
    const cloud = normalizeShared(cloudShared);
    if (!cloud) return localShared;
    if (localShared && localShared.lastSaved > cloud.lastSaved) return localShared;
    return cloud;
  }

  function loadInitialByMonthState() {
    const raw = safeStorage.get(STORAGE_KEY_BY_MONTH);
    let byMonth = null;
    if (raw) {
      try {
        byMonth = JSON.parse(raw);
      } catch (e) {
        console.error('Error parseando budget_by_month de localStorage:', e);
      }
    }

    const currentMonth = getCurrentYYYYMM();

    if (!byMonth || typeof byMonth !== 'object') {
      byMonth = {};
      // Migración desde el antiguo almacenamiento global si existe
      const oldCats = safeStorage.get('budget_categories');
      const oldExtra = safeStorage.get('app_extra_data');
      if (oldCats || oldExtra) {
        safeStorage.set('budget_categories_backup_v1', oldCats || '[]');
        safeStorage.set('app_extra_data_backup_v1', oldExtra || '{}');
        byMonth[currentMonth] = {
          categories: oldCats ? JSON.parse(oldCats) : JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
          extra: ensureAppExtraDefaults(oldExtra ? JSON.parse(oldExtra) : DEFAULT_APP_EXTRA)
        };
      } else {
        byMonth[currentMonth] = {
          categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
          extra: JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA))
        };
      }
      safeStorage.set(STORAGE_KEY_BY_MONTH, JSON.stringify(byMonth));
    }

    // Asegurar que el mes actual existe (copia del mes anterior más cercano)
    if (!byMonth[currentMonth]) {
      byMonth[currentMonth] = createMonthFrom(byMonth, currentMonth);
      safeStorage.set(STORAGE_KEY_BY_MONTH, JSON.stringify(byMonth));
    }

    return byMonth;
  }

  // --- 6. CACHÉ LOCAL TRAS CERRAR SESIÓN ---
  // La nube es Supabase (MAESTRO.supabase.js). Al cerrar sesión se borra la copia local para que
  // el siguiente usuario del navegador no vea estos datos.
  function clearLocalData() {
    [STORAGE_KEY_BY_MONTH, STORAGE_KEY_SHARED, STORAGE_KEY_COLLAPSED, 'usd_rate', 'card_movements_v1',
      'budget_categories_backup_v1', 'app_extra_data_backup_v1'].forEach(key => safeStorage.remove(key));
  }

  // --- TASA DEL DÓLAR ---
  // Se consulta en cada carga de la página. Fuente principal: Banco Central (función "tasa" de
  // Supabase, porque el Excel del BCRD no permite leerlo desde el navegador). Si falla se usa
  // open.er-api.com. La última tasa queda guardada por si no hay internet.
  const STORAGE_KEY_USD_RATE = 'usd_rate';
  const FALLBACK_RATE_URL = 'https://open.er-api.com/v6/latest/USD';

  function loadStoredUsdRate() {
    try {
      const rate = JSON.parse(safeStorage.get(STORAGE_KEY_USD_RATE) || 'null');
      return rate && rate.venta > 0 ? { ...rate, stale: true } : null;
    } catch (e) {
      return null;
    }
  }

  async function fetchUsdRate() {
    let rate = null;
    let bcrdError = null;

    const SB = window.FinanzasSupabase;
    if (SB) {
      try {
        const data = await SB.fetchTasa();
        if (data && data.ok && Number(data.venta) > 0) {
          rate = { fuente: 'BCRD', fecha: data.fecha, compra: Number(data.compra), venta: Number(data.venta) };
        } else {
          bcrdError = (data && data.error) || 'La función de la tasa no devolvió datos.';
        }
      } catch (err) {
        bcrdError = err.message;
      }
    }

    if (!rate) {
      const res = await fetch(FALLBACK_RATE_URL, { cache: 'no-store' });
      const data = await res.json();
      const dop = data && data.rates && Number(data.rates.DOP);
      if (!(dop > 0)) throw new Error('No se pudo obtener la tasa del dólar.');
      const fecha = data.time_last_update_unix ? new Date(data.time_last_update_unix * 1000).toISOString().slice(0, 10) : '';
      rate = { fuente: 'open.er-api.com', fecha, compra: dop, venta: dop, bcrdError };
    }

    rate.leido = Date.now();
    safeStorage.set(STORAGE_KEY_USD_RATE, JSON.stringify(rate));
    return rate;
  }

  // --- 7. EXPORTACIÓN E IMPORTACIÓN DE RESPALDOS JSON ---
  function exportBackupJSON(byMonth) {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(byMonth, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `finanzas_backup_${getCurrentYYYYMM()}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // --- EXPOSICIÓN GLOBAL ---
  window.FinanzasMaestro = {
    DEFAULT_CATEGORIES,
    DEFAULT_APP_EXTRA,
    DEFAULT_SUMMARY_ROWS,
    DEFAULT_NOTES,
    CATEGORY_COLORS,
    STORAGE_KEY_BY_MONTH,
    STORAGE_KEY_COLLAPSED,
    safeStorage,
    getCurrentYYYYMM,
    formatMonthLabel,
    formatCurrency,
    formatMoney,
    parseCurrency,
    getChildrenSum,
    getVirtualCategories,
    getCategoriesWithVirtuals,
    computeMetrics,
    computeDistribucionSuggested,
    computeDistribucionCardTotal,
    computeSummaryTotal,
    computeAnnualDistribucionData,
    getCategoryColor,
    getCategoryAccent,
    ensureAppExtraDefaults,
    cloneMonthAsTemplate,
    createMonthFrom,
    isValidByMonth,
    mergeCloudByMonth,
    loadStoredShared,
    storeShared,
    deriveSharedFromMonths,
    mergeCloudShared,
    loadInitialByMonthState,
    clearLocalData,
    loadStoredUsdRate,
    fetchUsdRate,
    exportBackupJSON
  };

})(window);
