/**
 * ==============================================================================
 * MAESTRO.jsx - Aplicación Principal en React 18
 * Proyecto: Finanzas (presupuesto mensual)
 * ==============================================================================
 * Interfaz completa en componentes React:
 * - Selector global de mes (YYYY-MM) con indicador de meses con datos
 * - Vistas: Presupuesto, Resumen, Distribución, Tarjetas, Notas, Ajustes
 * - Modales: Agregar categoría, Conexión con la nube (GAS), Agregar/Editar nota
 * - Avisos (toasts) en lugar de alert()
 * - Persistencia por mes y sincronización con Google Sheets (GAS)
 * Depende de window.FinanzasMaestro (MAESTRO.js) para datos y cálculos.
 */

(function () {
  'use strict';

  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const FM = window.FinanzasMaestro;

  if (!FM) {
    console.error('Error: MAESTRO.js debe cargarse antes de MAESTRO.jsx');
    return;
  }

  // --- ICONOS SVG (trazo 1.75, 24x24) ---
  const Svg = ({ size = 20, children, ...rest }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );

  const Icons = {
    Budget: (p) => <Svg {...p}><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></Svg>,
    Summary: (p) => <Svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" /></Svg>,
    Split: (p) => <Svg {...p}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="19" r="2.5" /><path d="M6 8.5v1.5a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8.5" /><path d="M12 13v3.5" /></Svg>,
    Card: (p) => <Svg {...p}><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19" /><path d="M6.5 15h3" /></Svg>,
    Notes: (p) => <Svg {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></Svg>,
    Settings: (p) => <Svg {...p}><path d="M4 7h10" /><path d="M18 7h2" /><circle cx="16" cy="7" r="2" /><path d="M4 17h4" /><path d="M12 17h8" /><circle cx="10" cy="17" r="2" /></Svg>,
    Cloud: (p) => <Svg {...p}><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 1 0 6.5 19z" /></Svg>,
    Plus: (p) => <Svg size={16} {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>,
    Trash: (p) => <Svg size={16} {...p}><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4h6v3" /></Svg>,
    Chevron: (p) => <Svg size={16} {...p}><path d="M9 6l6 6-6 6" /></Svg>,
    ChevronLeft: (p) => <Svg size={18} {...p}><path d="M15 6l-6 6 6 6" /></Svg>,
    ChevronRight: (p) => <Svg size={18} {...p}><path d="M9 6l6 6-6 6" /></Svg>,
    Pin: ({ filled, ...p }) => <Svg size={16} {...p}><path d="M12 17v4" /><path d="M8 4h8l-1 6 3 3v2H6v-2l3-3z" fill={filled ? 'currentColor' : 'none'} /></Svg>,
    Edit: (p) => <Svg size={16} {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></Svg>,
    Close: (p) => <Svg size={18} {...p}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></Svg>,
    Check: (p) => <Svg size={14} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>,
    Arrow: (p) => <Svg size={16} {...p}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></Svg>,
    Download: (p) => <Svg size={16} {...p}><path d="M12 4v11" /><path d="M7 10l5 5 5-5" /><path d="M5 20h14" /></Svg>,
    Upload: (p) => <Svg size={16} {...p}><path d="M12 20V9" /><path d="M7 14l5-5 5 5" /><path d="M5 4h14" /></Svg>,
    Refresh: (p) => <Svg size={16} {...p}><path d="M20 11a8 8 0 0 0-14.9-3.9L4 8.5" /><path d="M4 4v4.5h4.5" /><path d="M4 13a8 8 0 0 0 14.9 3.9L20 15.5" /><path d="M20 20v-4.5h-4.5" /></Svg>
  };

  const NAV_ITEMS = [
    { tab: 'overview', label: 'Presupuesto', Icon: Icons.Budget },
    { tab: 'summary', label: 'Resumen', Icon: Icons.Summary },
    { tab: 'distribucion', label: 'Distribución', Icon: Icons.Split },
    { tab: 'tarjetas', label: 'Tarjetas', Icon: Icons.Card },
    { tab: 'notes', label: 'Notas', Icon: Icons.Notes },
    { tab: 'settings', label: 'Ajustes', Icon: Icons.Settings }
  ];

  const DB_STATUS_TEXT = {
    offline: 'Solo en este navegador',
    syncing: 'Guardando…',
    connected: 'Sincronizado',
    error: 'Sin conexión con la hoja'
  };

  const NOTE_TAGS = {
    STRATEGY: 'Estrategia',
    GOAL: 'Meta',
    REMINDER: 'Recordatorio',
    IDEA: 'Idea'
  };

  // Monto con signo y color semántico
  const Money = ({ value, tone }) => {
    const n = Number(value) || 0;
    const cls = tone === 'auto' ? (n < 0 ? 'neg' : n > 0 ? 'pos' : '') : (tone || '');
    return <span className={`money ${cls}`}>{FM.formatMoney(n)}</span>;
  };

  // Control de estado Pendiente / Hecho
  const StatusToggle = ({ done, onToggle, label }) => (
    <button
      type="button"
      className={`status ${done ? 'is-done' : ''}`}
      aria-pressed={done}
      aria-label={label ? `${label}: ${done ? 'hecho' : 'pendiente'}` : undefined}
      onClick={onToggle}
    >
      <span className="status-mark">{done && <Icons.Check />}</span>
      {done ? 'Hecho' : 'Pendiente'}
    </button>
  );

  // ============================================================================
  // COMPONENTE PRINCIPAL
  // ============================================================================
  function FinancialBudgetDashboard() {
    // 1. Estado Maestro
    const [byMonth, setByMonth] = useState(() => FM.loadInitialByMonthState());
    // Notas y pagos marcados a mano: no dependen del mes. null = aún sin guardar (se derivan de los meses)
    const [storedShared, setStoredShared] = useState(() => FM.loadStoredShared());
    const shared = useMemo(() => storedShared || FM.deriveSharedFromMonths(byMonth), [storedShared, byMonth]);
    const [currentMonth, setCurrentMonth] = useState(() => FM.getCurrentYYYYMM());
    const [activeTab, setActiveTab] = useState(() => {
      const fromHash = (window.location.hash || '').slice(1);
      return NAV_ITEMS.some(i => i.tab === fromHash) ? fromHash : 'overview';
    });
    const [collapsedCategories, setCollapsedCategories] = useState(() => {
      try {
        const raw = FM.safeStorage.get(FM.STORAGE_KEY_COLLAPSED);
        return new Set(raw ? JSON.parse(raw) : []);
      } catch (e) {
        return new Set();
      }
    });

    const [dbStatus, setDbStatus] = useState('offline'); // offline | syncing | connected | error
    const [gasUrl, setGasUrlState] = useState(() => FM.getGasUrl());
    const [modalState, setModalState] = useState({ type: null, data: null }); // 'addCategory' | 'dbConfig' | 'note'
    const [distGraphMode, setDistGraphMode] = useState('amount'); // 'amount' | 'percent'
    const [toast, setToast] = useState(null);

    const hasLoadedFromCloudRef = useRef(false);
    const saveTimeoutRef = useRef(null);
    // Lo último que hay que subir a la nube (el guardado espera 500 ms)
    const byMonthRef = useRef(byMonth);
    const storedSharedRef = useRef(storedShared);
    const currentMonthRef = useRef(currentMonth);
    byMonthRef.current = byMonth;
    storedSharedRef.current = storedShared;
    currentMonthRef.current = currentMonth;
    const toastTimeoutRef = useRef(null);

    const notify = useCallback((message, tone = 'info') => {
      clearTimeout(toastTimeoutRef.current);
      setToast({ message, tone, id: Date.now() });
      toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
    }, []);

    const goToTab = useCallback((tab) => {
      setActiveTab(tab);
      if (window.history && window.history.replaceState) window.history.replaceState(null, '', `#${tab}`);
      window.scrollTo({ top: 0 });
    }, []);

    // Mes activo actual
    const currentMonthData = useMemo(() => {
      if (!byMonth[currentMonth]) {
        return {
          categories: JSON.parse(JSON.stringify(FM.DEFAULT_CATEGORIES)),
          extra: JSON.parse(JSON.stringify(FM.DEFAULT_APP_EXTRA))
        };
      }
      return {
        categories: byMonth[currentMonth].categories || [],
        extra: FM.ensureAppExtraDefaults(byMonth[currentMonth].extra)
      };
    }, [byMonth, currentMonth]);

    const categories = currentMonthData.categories;
    const appExtra = currentMonthData.extra;

    const metrics = useMemo(() => FM.computeMetrics(categories), [categories]);

    // 2. Persistencia en localStorage y Google Apps Script
    const flushCloudSave = useCallback(async () => {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      if (!gasUrl) return;
      try {
        const all = byMonthRef.current;
        const currentObj = all[currentMonthRef.current] || {};
        await FM.saveToGAS(gasUrl, all, currentObj.categories, currentObj.extra, storedSharedRef.current);
        setDbStatus('connected');
      } catch (err) {
        console.error('Error sincronizando con Google Apps Script:', err);
        setDbStatus('error');
      }
    }, [gasUrl]);

    // Sincronización en la nube con espera de 500 ms
    const scheduleCloudSave = useCallback(() => {
      if (!gasUrl) return;
      setDbStatus('syncing');
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(flushCloudSave, 500);
    }, [gasUrl, flushCloudSave]);

    const persistState = useCallback((updatedByMonth) => {
      byMonthRef.current = updatedByMonth;
      setByMonth(updatedByMonth);
      FM.safeStorage.set(FM.STORAGE_KEY_BY_MONTH, JSON.stringify(updatedByMonth));
      scheduleCloudSave();
    }, [scheduleCloudSave]);

    const updateShared = useCallback((changes) => {
      const next = { ...shared, ...changes, lastSaved: Date.now() };
      storedSharedRef.current = next;
      setStoredShared(next);
      FM.storeShared(next);
      scheduleCloudSave();
    }, [shared, scheduleCloudSave]);

    // Actualizador específico para el mes en curso
    const updateCurrentMonthData = useCallback((newCategories, newExtra) => {
      const nextByMonth = {
        ...byMonth,
        [currentMonth]: {
          categories: newCategories !== undefined ? newCategories : categories,
          extra: newExtra !== undefined ? { ...newExtra, lastSaved: Date.now() } : { ...appExtra, lastSaved: Date.now() }
        }
      };
      persistState(nextByMonth);
    }, [byMonth, currentMonth, categories, appExtra, persistState]);

    // 3. Carga desde Google Apps Script (inicial y "Sincronizar ahora")
    const pullFromCloud = useCallback(async () => {
      if (!gasUrl) {
        setDbStatus('offline');
        return false;
      }
      setDbStatus('syncing');
      try {
        const cloudData = await FM.loadFromGAS(gasUrl);
        setByMonth(prev => {
          const merged = FM.mergeCloudByMonth(prev, cloudData, currentMonth);
          if (!merged) return prev;
          FM.safeStorage.set(FM.STORAGE_KEY_BY_MONTH, JSON.stringify(merged));
          return merged;
        });
        setStoredShared(prev => {
          const merged = FM.mergeCloudShared(prev, cloudData && cloudData.shared);
          if (merged && merged !== prev) FM.storeShared(merged);
          return merged;
        });
        setDbStatus('connected');
        return true;
      } catch (err) {
        console.warn('No se pudo conectar a Google Apps Script:', err);
        setDbStatus('error');
        return false;
      }
    }, [gasUrl, currentMonth]);

    // Cambiar la URL del backend vuelve a cargar los datos desde esa hoja
    const applyGasUrl = useCallback((url) => {
      const clean = (url || '').trim();
      hasLoadedFromCloudRef.current = false;
      FM.setGasUrl(clean);
      setGasUrlState(clean);
      if (!clean) setDbStatus('offline');
    }, []);

    useEffect(() => {
      if (hasLoadedFromCloudRef.current || !gasUrl) return;
      hasLoadedFromCloudRef.current = true;
      pullFromCloud();
    }, [gasUrl, pullFromCloud]);

    // El celular deja la app abierta en segundo plano: al volver a ella se relee la nube
    // para ver lo que se cambió en otro dispositivo. Al salir se sube lo pendiente.
    const lastPullRef = useRef(Date.now());
    useEffect(() => {
      if (!gasUrl) return undefined;
      const onVisibility = () => {
        if (document.visibilityState === 'hidden') {
          if (saveTimeoutRef.current) flushCloudSave();
          return;
        }
        if (Date.now() - lastPullRef.current < 15000) return;
        lastPullRef.current = Date.now();
        pullFromCloud();
      };
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('focus', onVisibility);
      return () => {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('focus', onVisibility);
      };
    }, [gasUrl, pullFromCloud, flushCloudSave]);

    // 4. Cambiar mes
    const switchMonth = useCallback((targetMonth) => {
      setCurrentMonth(targetMonth);
      setByMonth(prev => {
        if (prev[targetMonth]) return prev;
        const next = { ...prev, [targetMonth]: FM.createMonthFrom(prev, targetMonth) };
        FM.safeStorage.set(FM.STORAGE_KEY_BY_MONTH, JSON.stringify(next));
        return next;
      });
    }, []);

    // Restablecer mes actual (lleva fecha de guardado para que la nube no lo deshaga)
    const resetCurrentMonth = useCallback(() => {
      if (!window.confirm(`¿Restablecer ${FM.formatMonthLabel(currentMonth)} a la plantilla base? Se borran los datos de este mes únicamente.`)) return;
      const nextByMonth = {
        ...byMonth,
        [currentMonth]: {
          categories: JSON.parse(JSON.stringify(FM.DEFAULT_CATEGORIES)),
          extra: { ...JSON.parse(JSON.stringify(FM.DEFAULT_APP_EXTRA)), lastSaved: Date.now() }
        }
      };
      persistState(nextByMonth);
      notify('Mes restablecido a la plantilla base.');
    }, [byMonth, currentMonth, persistState, notify]);

    const toggleCollapse = useCallback((id) => {
      setCollapsedCategories(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        FM.safeStorage.set(FM.STORAGE_KEY_COLLAPSED, JSON.stringify(Array.from(next)));
        return next;
      });
    }, []);

    const closeModal = () => setModalState({ type: null, data: null });
    const activeItem = NAV_ITEMS.find(i => i.tab === activeTab) || NAV_ITEMS[0];

    const SyncButton = ({ compact }) => (
      <button
        type="button"
        className={`sync sync-${dbStatus} ${compact ? 'sync-compact' : ''}`}
        onClick={() => setModalState({ type: 'dbConfig' })}
        title={DB_STATUS_TEXT[dbStatus]}
        aria-label={`Conexión con la nube: ${DB_STATUS_TEXT[dbStatus]}`}
      >
        <span className="sync-dot" />
        {!compact && <span>{DB_STATUS_TEXT[dbStatus]}</span>}
      </button>
    );

    return (
      <div className="app">
        <a className="skip-link" href="#contenido">Saltar al contenido</a>

        {/* Navegación lateral (escritorio) */}
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">F</span>
            <span className="brand-name">Finanzas</span>
          </div>
          <nav aria-label="Secciones">
            <ul className="side-nav">
              {NAV_ITEMS.map(({ tab, label, Icon }) => (
                <li key={tab}>
                  <a
                    href={`#${tab}`}
                    className={`side-link ${activeTab === tab ? 'is-active' : ''}`}
                    aria-current={activeTab === tab ? 'page' : undefined}
                    onClick={(e) => { e.preventDefault(); goToTab(tab); }}
                  >
                    <Icon />
                    <span>{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="sidebar-foot">
            <SyncButton />
          </div>
        </aside>

        <div className="main">
          {/* Barra superior */}
          <header className="topbar">
            <div className="topbar-title">
              <span className="brand-mark mobile-only" aria-hidden="true">F</span>
              <h1>{activeItem.label}</h1>
            </div>
            <MonthSelectorWidget
              currentMonth={currentMonth}
              byMonth={byMonth}
              onSelectMonth={switchMonth}
            />
            <div className="topbar-actions mobile-only">
              <SyncButton compact />
              <button
                type="button"
                className={`icon-btn ${activeTab === 'settings' ? 'is-active' : ''}`}
                onClick={() => goToTab('settings')}
                aria-label="Ajustes"
              >
                <Icons.Settings />
              </button>
            </div>
          </header>

          <main id="contenido" className="content" tabIndex={-1}>
            {activeTab === 'overview' && (
              <TabOverview
                currentMonth={currentMonth}
                categories={categories}
                metrics={metrics}
                collapsedCategories={collapsedCategories}
                onToggleCollapse={toggleCollapse}
                onUpdateCategories={(newCats) => updateCurrentMonthData(newCats, undefined)}
                onOpenAddCategory={() => setModalState({ type: 'addCategory' })}
              />
            )}

            {activeTab === 'summary' && (
              <TabSummary
                summaryTables={appExtra.summaryTables || []}
                onUpdateSummaryTables={(newTables) => {
                  updateCurrentMonthData(undefined, { ...appExtra, summaryTables: newTables });
                }}
              />
            )}

            {activeTab === 'distribucion' && (
              <TabDistribucion
                currentMonth={currentMonth}
                byMonth={byMonth}
                categories={categories}
                distribucionData={appExtra.distribucion || {}}
                distGraphMode={distGraphMode}
                onChangeGraphMode={setDistGraphMode}
                onResetMonth={resetCurrentMonth}
                onUpdateDistribucion={(newDist) => {
                  updateCurrentMonthData(undefined, { ...appExtra, distribucion: newDist });
                }}
              />
            )}

            {activeTab === 'tarjetas' && (
              <TabTarjetas
                currentMonth={currentMonth}
                gasUrl={gasUrl}
                notify={notify}
                cardPayments={shared.cardPayments}
                onUpdateCardPayments={(cardPayments) => updateShared({ cardPayments })}
              />
            )}

            {activeTab === 'notes' && (
              <TabNotes
                notes={shared.notes}
                distribucionData={appExtra.distribucion || {}}
                onOpenAddNote={() => setModalState({ type: 'note', data: null })}
                onOpenEditNote={(note) => setModalState({ type: 'note', data: note })}
                onUpdateNotes={(notes) => updateShared({ notes })}
                onNavigateToDist={(key) => {
                  goToTab('distribucion');
                  setTimeout(() => {
                    const el = document.querySelector(`[data-dist-key="${key}"]`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('is-highlighted');
                      setTimeout(() => el.classList.remove('is-highlighted'), 1600);
                    }
                  }, 120);
                }}
              />
            )}

            {activeTab === 'settings' && (
              <TabSettings
                gasUrl={gasUrl}
                dbStatus={dbStatus}
                onSaveGasUrl={(url) => {
                  applyGasUrl(url);
                  notify(url.trim() ? 'URL guardada. Cargando datos de la hoja…' : 'Sincronización desactivada: los datos quedan solo en este navegador.');
                }}
                onManualSync={async () => {
                  if (!gasUrl) {
                    notify('No hay URL de Apps Script: los datos solo se guardan en este navegador.', 'warn');
                    return;
                  }
                  const ok = await pullFromCloud();
                  notify(ok ? 'Datos actualizados desde Google Sheets.' : 'No se pudo conectar con la hoja. Revisa la URL e inténtalo de nuevo.', ok ? 'ok' : 'error');
                }}
                onExportBackup={() => FM.exportBackupJSON(byMonth)}
                onImportBackup={(importedByMonth) => {
                  if (!FM.isValidByMonth(importedByMonth)) {
                    notify('Ese archivo no es un respaldo de Finanzas: se esperan meses "AAAA-MM" con categorías.', 'error');
                    return;
                  }
                  if (window.confirm('¿Reemplazar todos los datos actuales con este respaldo?')) {
                    const stamped = {};
                    Object.keys(importedByMonth).forEach(m => {
                      stamped[m] = { ...importedByMonth[m], extra: { ...(importedByMonth[m].extra || {}), lastSaved: Date.now() } };
                    });
                    persistState(stamped);
                    notify('Respaldo restaurado.', 'ok');
                  }
                }}
                onImportError={(msg) => notify(msg, 'error')}
              />
            )}
          </main>
        </div>

        {/* Navegación inferior (celular) */}
        <nav className="bottom-nav" aria-label="Secciones">
          {NAV_ITEMS.filter(i => i.tab !== 'settings').map(({ tab, label, Icon }) => (
            <a
              key={tab}
              href={`#${tab}`}
              className={`bottom-link ${activeTab === tab ? 'is-active' : ''}`}
              aria-current={activeTab === tab ? 'page' : undefined}
              onClick={(e) => { e.preventDefault(); goToTab(tab); }}
            >
              <Icon size={22} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        {/* Modales */}
        {modalState.type === 'addCategory' && (
          <AddCategoryModal
            categories={categories}
            onClose={closeModal}
            onAddCategory={(newCat) => {
              updateCurrentMonthData([...categories, newCat], undefined);
              closeModal();
              notify(`Categoría "${newCat.name}" agregada.`, 'ok');
            }}
          />
        )}

        {modalState.type === 'dbConfig' && (
          <DbConfigModal
            currentUrl={gasUrl}
            dbStatus={dbStatus}
            onClose={closeModal}
            onSaveUrl={(newUrl) => {
              applyGasUrl(newUrl);
              closeModal();
              notify(newUrl.trim() ? 'URL guardada. Cargando datos de la hoja…' : 'Sincronización desactivada.');
            }}
          />
        )}

        {modalState.type === 'note' && (
          <NoteModal
            initialNote={modalState.data}
            onClose={closeModal}
            onSaveNote={(noteToSave) => {
              const currentNotes = shared.notes;
              const exists = currentNotes.some(n => n.id === noteToSave.id);
              const nextNotes = exists
                ? currentNotes.map(n => n.id === noteToSave.id ? noteToSave : n)
                : [noteToSave, ...currentNotes];
              updateShared({ notes: nextNotes });
              closeModal();
            }}
          />
        )}

        <div className="toast-region" role="status" aria-live="polite">
          {toast && (
            <div key={toast.id} className={`toast toast-${toast.tone}`}>
              <span>{toast.message}</span>
              <button type="button" className="toast-close" onClick={() => setToast(null)} aria-label="Cerrar aviso">
                <Icons.Close />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // WIDGET: SELECTOR DE MES
  // ============================================================================
  function shiftMonth(yyyyMM, delta) {
    const [yyyy, mm] = yyyyMM.split('-');
    const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function MonthSelectorWidget({ currentMonth, byMonth, onSelectMonth }) {
    const today = FM.getCurrentYYYYMM();
    const monthKeys = useMemo(() => {
      const set = new Set(Object.keys(byMonth || {}));
      set.add(currentMonth);
      set.add(today);
      return Array.from(set).sort().reverse();
    }, [byMonth, currentMonth, today]);

    return (
      <div className="month-picker">
        <button type="button" className="icon-btn" onClick={() => onSelectMonth(shiftMonth(currentMonth, -1))} aria-label="Mes anterior">
          <Icons.ChevronLeft />
        </button>
        <label className="month-select">
          <span className="sr-only">Mes</span>
          <select value={currentMonth} onChange={(e) => onSelectMonth(e.target.value)}>
            {monthKeys.map(m => (
              <option key={m} value={m}>
                {FM.formatMonthLabel(m)}{byMonth[m] ? '' : ' (vacío)'}
              </option>
            ))}
          </select>
          <span className="month-select-label" aria-hidden="true">{FM.formatMonthLabel(currentMonth)}</span>
        </label>
        <button type="button" className="icon-btn" onClick={() => onSelectMonth(shiftMonth(currentMonth, 1))} aria-label="Mes siguiente">
          <Icons.ChevronRight />
        </button>
        {currentMonth !== today && (
          <button type="button" className="btn btn-ghost btn-sm today-btn" onClick={() => onSelectMonth(today)}>
            Hoy
          </button>
        )}
      </div>
    );
  }

  // Encabezado de sección dentro de una vista
  const SectionHead = ({ title, children, id }) => (
    <div className="section-head">
      <h2 id={id}>{title}</h2>
      {children && <div className="section-actions">{children}</div>}
    </div>
  );

  // ============================================================================
  // VISTA 1: PRESUPUESTO
  // ============================================================================
  function TabOverview({
    currentMonth,
    categories,
    metrics,
    collapsedCategories,
    onToggleCollapse,
    onUpdateCategories,
    onOpenAddCategory
  }) {
    const handleCategoryChange = (id, field, value) => {
      onUpdateCategories(categories.map(cat => cat.id === id
        ? { ...cat, [field]: field === 'budgeted' ? FM.parseCurrency(value) : value }
        : cat));
    };

    // Eliminar categoría y todos sus descendientes
    const handleDeleteCategory = (id) => {
      const target = categories.find(c => c.id === id);
      if (!window.confirm(`¿Eliminar "${target ? target.name : 'esta categoría'}" y sus subcategorías?`)) return;
      const idsToDelete = new Set([id]);
      let added = true;
      while (added) {
        added = false;
        categories.forEach(c => {
          if (c.parentId && idsToDelete.has(c.parentId) && !idsToDelete.has(c.id)) {
            idsToDelete.add(c.id);
            added = true;
          }
        });
      }
      onUpdateCategories(categories.filter(c => !idsToDelete.has(c.id)));
    };

    const topLevel = useMemo(() => categories.filter(c => c.parentId === null), [categories]);
    const sueldo = topLevel.filter(c => c.id === 'sueldo');
    const expenseRoots = topLevel.filter(c => c.id !== 'sueldo');

    // Composición del gasto respecto al ingreso
    const scale = Math.max(metrics.totalIncome, metrics.totalExpenses, 1);
    const composition = expenseRoots
      .map(c => ({ id: c.id, name: c.name, amount: Number(c.budgeted) || 0, color: FM.getCategoryAccent(c, categories) }))
      .filter(s => s.amount > 0);
    const over = metrics.remainingBalance < 0;

    return (
      <div className="view">
        <section className="balance" aria-labelledby="balance-title">
          <h2 id="balance-title" className="sr-only">Balance de {FM.formatMonthLabel(currentMonth)}</h2>
          <dl className="balance-figures">
            <div>
              <dt>Ingresos</dt>
              <dd><Money value={metrics.totalIncome} /></dd>
            </div>
            <div>
              <dt>Presupuestado</dt>
              <dd><Money value={metrics.totalExpenses} /></dd>
            </div>
            <div className="balance-main">
              <dt>{over ? 'Excedido' : 'Disponible'}</dt>
              <dd><Money value={metrics.remainingBalance} tone="auto" /></dd>
            </div>
          </dl>

          <div className="composition">
            <div className={`composition-bar ${composition.length === 0 ? 'is-empty' : ''}`} role="img" aria-label="Distribución del ingreso por categoría">
              {composition.map(s => (
                <span
                  key={s.id}
                  className="composition-seg"
                  style={{ width: `${(s.amount / scale) * 100}%`, background: s.color }}
                  title={`${s.name}: ${FM.formatMoney(s.amount)}`}
                />
              ))}
            </div>
            {composition.length === 0 ? (
              <p className="hint">Escribe el sueldo y los montos de cada categoría para ver cómo se reparte el ingreso.</p>
            ) : (
              <ul className="legend">
                {composition.map(s => (
                  <li key={s.id}>
                    <span className="legend-dot" style={{ background: s.color }} />
                    <span className="legend-name">{s.name}</span>
                    <span className="legend-pct">{metrics.totalIncome > 0 ? `${Math.round((s.amount / metrics.totalIncome) * 100)}%` : '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="budget-title">
          <SectionHead title="Categorías" id="budget-title">
            <button type="button" className="btn btn-primary btn-sm" onClick={onOpenAddCategory}>
              <Icons.Plus /> Categoría
            </button>
          </SectionHead>

          <div className="ledger" role="table" aria-label="Presupuesto por categoría">
            <div className="ledger-head" role="row">
              <span role="columnheader">Categoría</span>
              <span role="columnheader" className="num">Monto</span>
              <span role="columnheader" className="num ledger-diff-col">Por asignar</span>
              <span role="columnheader" className="ledger-action-col"><span className="sr-only">Acciones</span></span>
            </div>

            {[...sueldo, ...expenseRoots].map(cat => (
              <CategoryTreeRow
                key={cat.id}
                category={cat}
                depth={0}
                allCategories={categories}
                collapsedCategories={collapsedCategories}
                onToggleCollapse={onToggleCollapse}
                onChange={handleCategoryChange}
                onDelete={handleDeleteCategory}
              />
            ))}

            <div className="ledger-row ledger-total" role="row">
              <span role="cell" className="ledger-name">Cuadre del sueldo</span>
              <span role="cell" className="num"><Money value={metrics.totalExpenses} /></span>
              <span role="cell" className="num ledger-diff-col"><Money value={metrics.remainingBalance} tone="auto" /></span>
              <span role="cell" className="ledger-action-col" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Fila recursiva de categoría
  function CategoryTreeRow({ category, depth, allCategories, collapsedCategories, onToggleCollapse, onChange, onDelete }) {
    const children = allCategories.filter(c => c.parentId === category.id);
    const isParent = children.length > 0;
    const isCollapsed = collapsedCategories.has(category.id);
    const diff = isParent ? (Number(category.budgeted) || 0) - FM.getChildrenSum(allCategories, category.id) : null;
    const accent = FM.getCategoryAccent(category, allCategories);

    return (
      <React.Fragment>
        <div className={`ledger-row depth-${depth} ${isParent ? 'is-parent' : ''}`} role="row">
          <span role="cell" className="ledger-name">
            {isParent ? (
              <button
                type="button"
                className={`disclosure ${isCollapsed ? '' : 'is-open'}`}
                onClick={() => onToggleCollapse(category.id)}
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? 'Mostrar' : 'Ocultar'} subcategorías de ${category.name}`}
              >
                <Icons.Chevron />
              </button>
            ) : (
              <span className="disclosure-spacer" />
            )}
            {depth === 0 && <span className="cat-dot" style={{ background: accent || 'var(--ink-3)' }} />}
            <input
              type="text"
              className="inline-input"
              value={category.name}
              onChange={(e) => onChange(category.id, 'name', e.target.value)}
              aria-label="Nombre de la categoría"
              autoComplete="off"
            />
          </span>
          <span role="cell" className="num">
            <span className="amount-field">
              <span aria-hidden="true">$</span>
              <input
                type="text"
                className="inline-input amount-input"
                defaultValue={FM.formatCurrency(category.budgeted || 0)}
                key={`${category.id}-${category.budgeted}`}
                onBlur={(e) => onChange(category.id, 'budgeted', e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                inputMode="decimal"
                aria-label={`Monto de ${category.name}`}
              />
            </span>
          </span>
          <span role="cell" className="num ledger-diff-col">
            {isParent ? <Money value={diff} tone="auto" /> : <span className="muted">—</span>}
          </span>
          <span role="cell" className="ledger-action-col">
            {category.canDelete && category.id !== 'sueldo' && (
              <button type="button" className="icon-btn icon-btn-quiet danger" onClick={() => onDelete(category.id)} aria-label={`Eliminar ${category.name}`}>
                <Icons.Trash />
              </button>
            )}
          </span>
          {isParent && (
            <span className="ledger-diff-inline" aria-hidden="true">
              Por asignar <Money value={diff} tone="auto" />
            </span>
          )}
        </div>

        {!isCollapsed && children.map(child => (
          <CategoryTreeRow
            key={child.id}
            category={child}
            depth={depth + 1}
            allCategories={allCategories}
            collapsedCategories={collapsedCategories}
            onToggleCollapse={onToggleCollapse}
            onChange={onChange}
            onDelete={onDelete}
          />
        ))}
      </React.Fragment>
    );
  }

  // ============================================================================
  // VISTA 2: RESUMEN
  // ============================================================================
  function TabSummary({ summaryTables, onUpdateSummaryTables }) {
    const updateTable = (tableId, fn) => onUpdateSummaryTables(summaryTables.map(t => t.id === tableId ? fn(t) : t));

    const handleRowChange = (tableId, rowIndex, field, value) => updateTable(tableId, t => {
      const nextRows = [...t.rows];
      nextRows[rowIndex] = { ...nextRows[rowIndex], [field]: field === 'amount' ? FM.parseCurrency(value) : value };
      return { ...t, rows: nextRows };
    });

    const handleAddRow = (tableId) => updateTable(tableId, t => ({ ...t, rows: [...t.rows, { category: '', amount: 0, destino: '' }] }));

    const handleRemoveRow = (tableId, rowIndex) => updateTable(tableId, t => ({ ...t, rows: t.rows.filter((_, i) => i !== rowIndex) }));

    const handleDeleteTable = (table) => {
      if (window.confirm(`¿Eliminar la tabla "${table.title}"?`)) {
        onUpdateSummaryTables(summaryTables.filter(t => t.id !== table.id));
      }
    };

    const handleAddTable = () => {
      const baseRows = (summaryTables[0] && summaryTables[0].rows) || FM.DEFAULT_SUMMARY_ROWS;
      onUpdateSummaryTables([...summaryTables, {
        id: 'summary-' + Date.now(),
        title: `Resumen ${summaryTables.length + 1}`,
        editable: true,
        rows: baseRows.map(r => ({ category: r.category, amount: 0, destino: '' }))
      }]);
    };

    return (
      <div className="view">
        {summaryTables.length === 0 && (
          <div className="empty">
            <p>Aún no hay tablas de resumen. Úsalas para repartir ingresos extra (bonos, doble sueldo) y anotar su destino.</p>
          </div>
        )}

        {summaryTables.map(table => (
          <section key={table.id} className="panel">
            <div className="section-head">
              <input
                type="text"
                className="inline-input title-input"
                value={table.title}
                onChange={(e) => updateTable(table.id, t => ({ ...t, title: e.target.value }))}
                aria-label="Título de la tabla"
              />
              {table.editable && (
                <div className="section-actions">
                  <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => handleDeleteTable(table)}>
                    <Icons.Trash /> Eliminar
                  </button>
                </div>
              )}
            </div>

            <div className="sheet" role="table" aria-label={table.title}>
              <div className="sheet-row sheet-head" role="row">
                <span role="columnheader">Concepto</span>
                <span role="columnheader" className="num">Monto</span>
                <span role="columnheader">Destino</span>
                <span role="columnheader"><span className="sr-only">Acciones</span></span>
              </div>
              {table.rows.map((row, idx) => (
                <div className="sheet-row" role="row" key={idx}>
                  <span role="cell">
                    <input type="text" className="inline-input" value={row.category || ''} placeholder="Concepto" aria-label="Concepto"
                      onChange={(e) => handleRowChange(table.id, idx, 'category', e.target.value)} />
                  </span>
                  <span role="cell" className="num">
                    <span className="amount-field">
                      <span aria-hidden="true">$</span>
                      <input type="text" className="inline-input amount-input" placeholder="0.00" inputMode="decimal" aria-label="Monto"
                        defaultValue={row.amount ? FM.formatCurrency(row.amount) : ''}
                        key={`${row.amount}-${idx}`}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        onBlur={(e) => handleRowChange(table.id, idx, 'amount', e.target.value)} />
                    </span>
                  </span>
                  <span role="cell">
                    <input type="text" className="inline-input" value={row.destino || ''} placeholder="Destino" aria-label="Destino"
                      onChange={(e) => handleRowChange(table.id, idx, 'destino', e.target.value)} />
                  </span>
                  <span role="cell">
                    <button type="button" className="icon-btn icon-btn-quiet danger" onClick={() => handleRemoveRow(table.id, idx)} aria-label="Eliminar fila">
                      <Icons.Close />
                    </button>
                  </span>
                </div>
              ))}
              <div className="sheet-row sheet-total" role="row">
                <span role="cell">Total</span>
                <span role="cell" className="num"><Money value={FM.computeSummaryTotal(table.rows)} /></span>
                <span role="cell" />
                <span role="cell" />
              </div>
            </div>

            <button type="button" className="btn btn-ghost btn-sm add-row" onClick={() => handleAddRow(table.id)}>
              <Icons.Plus /> Agregar fila
            </button>
          </section>
        ))}

        <button type="button" className="btn btn-secondary" onClick={handleAddTable}>
          <Icons.Plus /> Nueva tabla de resumen
        </button>
      </div>
    );
  }

  // ============================================================================
  // VISTA 3: DISTRIBUCIÓN
  // ============================================================================
  const DIST_CARDS = [
    { key: 'qik', title: 'QIK', type: 'salida' },
    { key: 'gastos-m-p2', title: 'Gastos M parte 2 a cuenta corriente Popular', type: 'entrada' },
    { key: 'apap', title: 'APAP', type: 'salida' },
    { key: 'gastos-m-p1', title: 'Gastos M parte 1 a cuenta corriente Popular', type: 'entrada' }
  ];

  function TabDistribucion({ currentMonth, byMonth, categories, distribucionData, distGraphMode, onChangeGraphMode, onResetMonth, onUpdateDistribucion }) {
    const currentYear = currentMonth.split('-')[0];
    const annualData = useMemo(() => FM.computeAnnualDistribucionData(byMonth, currentYear), [byMonth, currentYear]);
    const rootCats = categories.filter(c => c.parentId === null);

    const emptyCard = { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] };

    const updateCard = (cardKey, fn) => {
      const card = distribucionData[cardKey] || emptyCard;
      onUpdateDistribucion({ ...distribucionData, [cardKey]: fn(card) });
    };

    const handleCardRowChange = (cardKey, rowIndex, field, value) => updateCard(cardKey, card => {
      const nextRows = [...(card.rows || [])];
      if (field === 'catId') {
        nextRows[rowIndex] = { catId: value, subId: '', amount: FM.computeDistribucionSuggested(categories, value, '') };
      } else if (field === 'subId') {
        const catId = nextRows[rowIndex].catId;
        nextRows[rowIndex] = { ...nextRows[rowIndex], subId: value, amount: FM.computeDistribucionSuggested(categories, catId, value) };
      } else if (field === 'amount') {
        nextRows[rowIndex] = { ...nextRows[rowIndex], amount: FM.parseCurrency(value) };
      }
      return { ...card, rows: nextRows };
    });

    const handleAddRow = (cardKey) => updateCard(cardKey, card => ({ ...card, rows: [...(card.rows || []), { catId: '', subId: '', amount: 0 }] }));

    const handleRemoveRow = (cardKey, rowIndex) => updateCard(cardKey, card => (
      (card.rows || []).length <= 1 ? card : { ...card, rows: card.rows.filter((_, i) => i !== rowIndex) }
    ));

    const pendingCount = DIST_CARDS.filter(m => !(distribucionData[m.key] || {}).pendingDone).length;

    return (
      <div className="view">
        <section className="panel" aria-labelledby="annual-title">
          <SectionHead title={`Año ${currentYear}`} id="annual-title">
            <div className="segmented" role="group" aria-label="Escala del gráfico">
              <button type="button" aria-pressed={distGraphMode === 'amount'} onClick={() => onChangeGraphMode('amount')}>Monto</button>
              <button type="button" aria-pressed={distGraphMode === 'percent'} onClick={() => onChangeGraphMode('percent')}>% del ingreso</button>
            </div>
          </SectionHead>

          <div className="year-chart" role="img" aria-label={`Gasto presupuestado por mes en ${currentYear}`}>
            {annualData.monthlyBreakdown.map(col => {
              const isCurrent = col.monthKey === currentMonth;
              return (
                <div key={col.monthKey} className={`year-col ${col.isFuture ? 'is-future' : ''} ${isCurrent ? 'is-current' : ''}`}>
                  <div className="year-bar">
                    {col.segments.map(seg => {
                      const height = distGraphMode === 'percent'
                        ? (col.income > 0 ? (seg.amount / col.income) * 100 : 0)
                        : (seg.amount / annualData.maxIncome) * 100;
                      return (
                        <span
                          key={seg.id}
                          className="year-seg"
                          style={{ height: `${Math.min(height, 100)}%`, background: FM.getCategoryAccent({ id: seg.id, parentId: null }, categories) || 'var(--ink-3)' }}
                          title={`${col.label} · ${seg.name}: ${FM.formatMoney(seg.amount)}`}
                        />
                      );
                    })}
                  </div>
                  <span className="year-label">{col.label.replace('.', '')}</span>
                </div>
              );
            })}
          </div>
        </section>

        <SectionHead title="Transferencias del mes">
          <span className="muted small">{pendingCount === 0 ? 'Todo hecho' : `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`}</span>
        </SectionHead>

        <div className="dist-grid">
          {DIST_CARDS.map(meta => {
            const cardData = distribucionData[meta.key] || emptyCard;
            return (
              <article key={meta.key} className={`panel dist-card ${cardData.pendingDone ? 'is-done' : ''}`} data-dist-key={meta.key}>
                <header className="dist-card-head">
                  <div>
                    <span className={`flow flow-${meta.type}`}>{meta.type === 'salida' ? 'Salida' : 'Entrada'}</span>
                    <h3>{meta.title}</h3>
                  </div>
                  <Money value={FM.computeDistribucionCardTotal(cardData)} />
                </header>

                <div className="dist-rows">
                  {(cardData.rows || []).map((row, rIdx) => {
                    const subCats = row.catId ? categories.filter(c => c.parentId === row.catId) : [];
                    return (
                      <div key={rIdx} className="dist-row">
                        <select className="select" value={row.catId || ''} aria-label="Categoría"
                          onChange={(e) => handleCardRowChange(meta.key, rIdx, 'catId', e.target.value)}>
                          <option value="">Categoría</option>
                          {rootCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select className="select" disabled={subCats.length === 0} value={row.subId || ''} aria-label="Subcategoría"
                          onChange={(e) => handleCardRowChange(meta.key, rIdx, 'subId', e.target.value)}>
                          <option value="">{subCats.length === 0 ? 'Sin subcategorías' : 'Subcategoría'}</option>
                          {subCats.length > 0 && <option value="__todas__">Todas</option>}
                          {subCats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          {subCats.length > 0 && <option value={`${row.catId}-difference`}>Por asignar</option>}
                        </select>
                        <span className="amount-field boxed">
                          <span aria-hidden="true">$</span>
                          <input type="text" className="inline-input amount-input" placeholder="0.00" inputMode="decimal" aria-label="Monto"
                            defaultValue={row.amount ? FM.formatCurrency(row.amount) : ''}
                            key={`${row.amount}-${rIdx}`}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                            onBlur={(e) => handleCardRowChange(meta.key, rIdx, 'amount', e.target.value)} />
                        </span>
                        <button type="button" className="icon-btn icon-btn-quiet danger" title="Eliminar fila" aria-label="Eliminar fila"
                          disabled={(cardData.rows || []).length <= 1}
                          onClick={() => handleRemoveRow(meta.key, rIdx)}>
                          <Icons.Close />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <footer className="dist-card-foot">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleAddRow(meta.key)}>
                    <Icons.Plus /> Agregar fila
                  </button>
                  <StatusToggle
                    done={cardData.pendingDone}
                    label={meta.title}
                    onToggle={() => updateCard(meta.key, card => ({ ...card, pendingDone: !card.pendingDone }))}
                  />
                </footer>
              </article>
            );
          })}
        </div>

        <div className="danger-zone">
          <div>
            <strong>Restablecer {FM.formatMonthLabel(currentMonth)}</strong>
            <p className="muted small">Vuelve este mes a la plantilla base. Los demás meses no cambian.</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm danger" onClick={onResetMonth}>Restablecer mes</button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA 4: TARJETAS
  // ============================================================================
  // Tarjetas de crédito: día de corte, día límite de pago y cómo reconocerlas en el historial de Gmail.
  // autoPay: el banco envía correo cuando recibe el pago (APAP sí; el Popular no).
  const CREDIT_CARDS = [
    { key: 'tc-apap', name: 'Visa Gold', bankLabel: 'APAP', theme: 'apap', network: 'visa', corte: 13, vence: 4, autoPay: true,
      match: (c) => c.bank === 'apap' && c.kind === 'credito' },
    { key: 'tc-jetblue', name: 'JetBlue', bankLabel: 'Popular', theme: 'jetblue', network: 'mastercard', corte: 10, vence: 4, autoPay: false,
      match: (c) => /jetblue/i.test(c.name) },
    { key: 'tc-contigo', name: 'Contigo', bankLabel: 'Popular', theme: 'contigo', network: 'mastercard', corte: 28, vence: 23, autoPay: false,
      match: (c) => /contigo/i.test(c.name) }
  ];

  const DETAIL_KEY = 'mov_detail_open';

  function TabTarjetas({ currentMonth, gasUrl, notify, cardPayments, onUpdateCardPayments }) {
    const [store, setStore] = useState(() => FB.loadStore());
    const [cardFilter, setCardFilter] = useState('all');
    const [detailOpen, setDetailOpenState] = useState(() => FM.safeStorage.get(DETAIL_KEY) === '1');
    const movements = useMemo(() => FB.getMovements(store), [store]);

    const setDetailOpen = useCallback((open) => {
      setDetailOpenState(open);
      FM.safeStorage.set(DETAIL_KEY, open ? '1' : '0');
    }, []);

    // Tocar una tarjeta muestra su historial abajo
    const showCardMovements = (cardId) => {
      setCardFilter(cardId);
      setDetailOpen(true);
      setTimeout(() => {
        const el = document.getElementById('mov-title');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    };

    return (
      <div className="view">
        <CreditCards
          currentMonth={currentMonth}
          store={store}
          movements={movements}
          cardPayments={cardPayments}
          onUpdateCardPayments={onUpdateCardPayments}
          onShowMovements={showCardMovements}
        />
        <CardMovements
          currentMonth={currentMonth}
          gasUrl={gasUrl}
          notify={notify}
          store={store}
          setStore={setStore}
          movements={movements}
          cardFilter={cardFilter}
          setCardFilter={setCardFilter}
          detailOpen={detailOpen}
          setDetailOpen={setDetailOpen}
        />
      </div>
    );
  }

  // --- Movimientos leídos desde Gmail ---
  const FB = window.FinanzasBancos;
  const CURRENCY_PREFIX = { DOP: '$', USD: 'US$', EUR: '€' };
  const CARD_KIND_LABEL = { credito: 'Crédito', debito: 'Débito', cuenta: 'Cuenta' };
  const LIST_PAGE = 120;

  const fmtCurrency = (amount, currency) => {
    const prefix = CURRENCY_PREFIX[currency] || '$';
    return `${amount < 0 ? '-' : ''}${prefix}${FM.formatCurrency(Math.abs(amount))}`;
  };

  // Montos por moneda en una sola línea: "$12,300.00 · US$45.00"
  const MultiCurrency = ({ amounts, className }) => {
    const parts = ['DOP', 'USD', 'EUR'].filter(c => amounts[c]).map(c => fmtCurrency(amounts[c], c));
    return <span className={`money ${className || ''}`}>{parts.length ? parts.join(' · ') : fmtCurrency(0, 'DOP')}</span>;
  };

  function isoMonthsAgo(months) {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString().slice(0, 10);
  }

  function CardMovements({ currentMonth, gasUrl, notify, store, setStore, movements, cardFilter, setCardFilter, detailOpen, setDetailOpen }) {
    const [progress, setProgress] = useState(null); // { done, total } mientras lee Gmail
    const [connected, setConnected] = useState(() => FB.hasSession());
    const [range, setRange] = useState('month'); // 'month' | 'year'
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [sinceMonths, setSinceMonths] = useState('6');
    const [visible, setVisible] = useState(LIST_PAGE);
    const cloudTimerRef = useRef(null);

    const cards = useMemo(() => FB.getCards(store), [store]);
    const hasData = movements.length > 0;

    // Rango: el mes del selector superior o los 12 meses que terminan en él
    const inRange = useMemo(() => {
      if (range === 'month') return movements.filter(tx => (tx.date || '').startsWith(currentMonth));
      const [y, m] = currentMonth.split('-').map(Number);
      const start = new Date(y, m - 12, 1);
      const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      return movements.filter(tx => tx.date && tx.date.slice(0, 7) >= from && tx.date.slice(0, 7) <= currentMonth);
    }, [movements, range, currentMonth]);

    const cardTotals = useMemo(() => {
      const totals = {};
      inRange.forEach(tx => {
        if (tx.status === 'declinada' || !tx.isOutflow) return;
        const t = totals[tx.cardId] || (totals[tx.cardId] = {});
        t[tx.currency] = (t[tx.currency] || 0) + tx.amount;
      });
      return totals;
    }, [inRange]);

    const forCard = useMemo(() => (cardFilter === 'all' ? inRange : inRange.filter(tx => tx.cardId === cardFilter)), [inRange, cardFilter]);
    const summary = useMemo(() => FB.summarize(forCard), [forCard]);
    const listed = useMemo(() => (categoryFilter ? forCard.filter(tx => tx.category === categoryFilter) : forCard), [forCard, categoryFilter]);

    useEffect(() => { setVisible(LIST_PAGE); }, [cardFilter, categoryFilter, range, currentMonth]);

    const scheduleCloudSave = useCallback((nextStore) => {
      if (!gasUrl || !FB.hasSession()) return;
      clearTimeout(cloudTimerRef.current);
      cloudTimerRef.current = setTimeout(() => {
        FB.cloudSave(gasUrl, nextStore).catch(err => notify(`No se guardó en la hoja: ${err.message}`, 'warn'));
      }, 1500);
    }, [gasUrl, notify]);

    const connectAndSync = async () => {
      let cloudError = null;
      try {
        await FB.signIn();
        setConnected(true);
        let working = FB.loadStore();

        if (gasUrl) {
          try {
            const cloud = await FB.cloudLoad(gasUrl);
            if (cloud) working = FB.mergeStores(working, cloud);
          } catch (err) {
            cloudError = err.message;
          }
        }

        // Primera vez: desde la fecha elegida. Después: desde una semana antes de la última lectura.
        const sinceIso = working.lastSync
          ? new Date(working.lastSync - 7 * 86400000).toISOString().slice(0, 10)
          : (sinceMonths === 'all' ? '' : isoMonthsAgo(Number(sinceMonths)));

        setProgress({ done: 0, total: 0 });
        const res = await FB.syncFromGmail(working, { sinceIso, onProgress: setProgress });
        FB.saveStore(working);
        setStore({ ...working });

        if (gasUrl && !cloudError) {
          try { await FB.cloudSave(gasUrl, working); } catch (err) { cloudError = err.message; }
        }

        const base = res.read === 0
          ? 'No hay correos nuevos de los bancos.'
          : `${res.added} movimiento${res.added === 1 ? '' : 's'} nuevo${res.added === 1 ? '' : 's'} de ${res.read} correo${res.read === 1 ? '' : 's'} leído${res.read === 1 ? '' : 's'}.`;
        if (cloudError) notify(`${base} No se guardó en la hoja: ${cloudError}`, 'warn');
        else notify(base, 'ok');
      } catch (err) {
        setConnected(FB.hasSession());
        notify(err.message, 'error');
      } finally {
        setProgress(null);
      }
    };

    const changeCategory = (tx, categoryId) => {
      const next = { ...store, rules: { ...store.rules, [FB.merchantKey(tx.merchantDetail || tx.merchant)]: categoryId } };
      FB.saveStore(next);
      setStore(next);
      scheduleCloudSave(next);
    };

    const disconnect = () => {
      FB.signOut();
      setConnected(false);
      notify('Gmail desconectado. El historial guardado se mantiene.');
    };

    const clearLocal = () => {
      if (!window.confirm('¿Borrar el historial de movimientos de este navegador? Se puede volver a leer desde Gmail (y la copia en Google Sheets no se toca).')) return;
      setStore(FB.clearStore());
      setCardFilter('all');
      setCategoryFilter(null);
    };

    const syncing = !!progress;
    const periodLabel = range === 'month' ? FM.formatMonthLabel(currentMonth) : `12 meses hasta ${FM.formatMonthLabel(currentMonth).toLowerCase()}`;
    const maxCategory = Math.max(1, ...summary.categories.map(c => c.DOP || 0));
    const selectedCard = cards.find(c => c.id === cardFilter);

    // Agrupar la lista por día
    const days = [];
    listed.slice(0, visible).forEach(tx => {
      const last = days[days.length - 1];
      if (last && last.date === tx.date) last.items.push(tx);
      else days.push({ date: tx.date, items: [tx] });
    });
    const dayLabel = (iso) => {
      if (!iso) return 'Sin fecha';
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    return (
      <section className="panel movements" aria-labelledby="mov-title">
        <SectionHead title="Movimientos" id="mov-title">
          {hasData && (
            <button type="button" className="btn btn-primary btn-sm" onClick={connectAndSync} disabled={syncing}>
              <Icons.Refresh /> {syncing ? 'Leyendo…' : 'Actualizar desde Gmail'}
            </button>
          )}
        </SectionHead>

        {syncing && (
          <div className="sync-progress" role="status">
            <span>{progress.total ? `Leyendo correos… ${progress.done} de ${progress.total}` : 'Buscando correos de los bancos…'}</span>
            <div className="progress"><span style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '8%' }} /></div>
          </div>
        )}

        {!hasData && !syncing && (
          <div className="mov-empty">
            <p>
              Conecta tu Gmail para armar el historial de cada tarjeta. Se leen solo los correos de las etiquetas
              <strong> BANCOS/APAP</strong>, <strong>POPULAR</strong> y <strong>PAYPAL</strong> (consumos, retiros, pagos y transferencias) y cada gasto se clasifica por tipo de comercio.
            </p>
            <div className="mov-empty-actions">
              <label className="field inline-field">
                <span className="field-label">Leer desde</span>
                <select className="input" value={sinceMonths} onChange={(e) => setSinceMonths(e.target.value)}>
                  <option value="3">Últimos 3 meses</option>
                  <option value="6">Últimos 6 meses</option>
                  <option value="12">Último año</option>
                  <option value="all">Todo el correo</option>
                </select>
              </label>
              <button type="button" className="btn btn-primary" onClick={connectAndSync}>Conectar Gmail</button>
            </div>
            <p className="muted small">Google pedirá permiso de solo lectura. El acceso dura una hora y no se guarda en el navegador.</p>
          </div>
        )}

        {hasData && (
          <>
            <div className="mov-toolbar">
              <div className="segmented" role="group" aria-label="Periodo">
                <button type="button" aria-pressed={range === 'month'} onClick={() => setRange('month')}>Mes</button>
                <button type="button" aria-pressed={range === 'year'} onClick={() => setRange('year')}>12 meses</button>
              </div>
              <span className="muted small">{periodLabel}</span>
            </div>

            <div className="card-chips" role="group" aria-label="Tarjeta o cuenta">
              <button type="button" className={`card-chip ${cardFilter === 'all' ? 'is-active' : ''}`} aria-pressed={cardFilter === 'all'} onClick={() => setCardFilter('all')}>
                <span className="card-chip-name">Todas</span>
                <MultiCurrency amounts={Object.values(cardTotals).reduce((acc, t) => { Object.keys(t).forEach(c => { acc[c] = (acc[c] || 0) + t[c]; }); return acc; }, {})} />
              </button>
              {cards.map(card => (
                <button key={card.id} type="button" className={`card-chip ${cardFilter === card.id ? 'is-active' : ''}`} aria-pressed={cardFilter === card.id} onClick={() => setCardFilter(card.id)}>
                  <span className="card-chip-name">{card.name}{card.last4 ? <span className="muted"> ··{card.last4}</span> : null}</span>
                  <span className="card-chip-kind">{CARD_KIND_LABEL[card.kind] || ''} · {card.bank === 'apap' ? 'APAP' : 'Popular'}</span>
                  <MultiCurrency amounts={cardTotals[card.id] || {}} />
                </button>
              ))}
            </div>

            <div className="mov-summary">
              <div>
                <span className="mov-summary-label">Gastado{selectedCard ? ` con ${selectedCard.name}` : ''}</span>
                <MultiCurrency amounts={summary.totals.out} className="mov-summary-value" />
              </div>
              <div>
                <span className="mov-summary-label">Pagos y entradas</span>
                <MultiCurrency amounts={summary.totals.in} className="pos" />
              </div>
            </div>

            <button
              type="button"
              className={`detail-toggle ${detailOpen ? 'is-open' : ''}`}
              aria-expanded={detailOpen}
              aria-controls="mov-detail"
              onClick={() => setDetailOpen(!detailOpen)}
            >
              <span>{detailOpen ? 'Ocultar detalle' : `Ver detalle · ${listed.length} movimiento${listed.length === 1 ? '' : 's'}`}</span>
              <Icons.Chevron />
            </button>

            {detailOpen && (
            <div id="mov-detail" className="mov-detail">
            {summary.categories.length > 0 && (
              <ul className="cat-bars" aria-label="Gasto por categoría">
                {summary.categories.map(c => {
                  const meta = FB.CATEGORY_BY_ID[c.id] || FB.CATEGORY_BY_ID.otros;
                  const active = categoryFilter === c.id;
                  return (
                    <li key={c.id}>
                      <button type="button" className={`cat-bar ${active ? 'is-active' : ''}`} aria-pressed={active}
                        onClick={() => setCategoryFilter(active ? null : c.id)}>
                        <span className="cat-bar-label">
                          <span className="legend-dot" style={{ background: meta.color }} />
                          {meta.label}
                          <span className="muted small">{c.count}</span>
                        </span>
                        <MultiCurrency amounts={c} />
                        <span className="cat-bar-track" aria-hidden="true">
                          <span style={{ width: `${((c.DOP || 0) / maxCategory) * 100}%`, background: meta.color }} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {categoryFilter && (
              <div className="filter-note">
                <span>Mostrando solo {(FB.CATEGORY_BY_ID[categoryFilter] || {}).label}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCategoryFilter(null)}>Ver todas</button>
              </div>
            )}

            {listed.length === 0 ? (
              <p className="empty-inline">No hay movimientos en {periodLabel.toLowerCase()}{selectedCard ? ` para ${selectedCard.name}` : ''}.</p>
            ) : (
              <div className="tx-days">
                {days.map(day => (
                  <div key={day.date} className="tx-day">
                    <h3 className="tx-day-label">{dayLabel(day.date)}</h3>
                    <ul className="tx-list">
                      {day.items.map(tx => {
                        const card = store.cards[tx.cardId];
                        const declined = tx.status === 'declinada';
                        return (
                          <li key={tx.id} className={`tx ${declined ? 'is-declined' : ''}`}>
                            <div className="tx-main">
                              <span className="tx-merchant">{tx.merchantDetail || tx.merchant || FB.TYPE_LABELS[tx.type]}</span>
                              <span className="tx-meta">
                                {cardFilter === 'all' && card ? `${card.name}${card.last4 ? ` ··${card.last4}` : ''}` : ''}
                                {tx.type !== 'consumo' ? `${cardFilter === 'all' && card ? ' · ' : ''}${FB.TYPE_LABELS[tx.type]}` : ''}
                                {declined ? <span className="tag tag-declined">Declinada</span> : null}
                              </span>
                            </div>
                            <span className={`money tx-amount ${tx.isOutflow ? '' : 'pos'}`}>
                              {tx.isOutflow ? '' : '+'}{fmtCurrency(tx.amount, tx.currency)}
                            </span>
                            {tx.type === 'consumo' ? (
                              <select className="cat-select" value={tx.category} aria-label={`Categoría de ${tx.merchantDetail || tx.merchant}`}
                                onChange={(e) => changeCategory(tx, e.target.value)}>
                                {FB.CATEGORIES.filter(c => c.match || c.id === 'otros').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                              </select>
                            ) : (
                              <span className="cat-fixed">{(FB.CATEGORY_BY_ID[tx.category] || {}).label}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {listed.length > visible && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVisible(v => v + LIST_PAGE)}>
                    Mostrar más ({listed.length - visible} restantes)
                  </button>
                )}
              </div>
            )}

            </div>
            )}

            <footer className="mov-foot">
              <span className="muted small">
                {store.lastSync ? `Última lectura: ${new Date(store.lastSync).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Sin lecturas de Gmail en este navegador'}
                {' · '}{movements.length} movimientos guardados
              </span>
              <div className="button-row">
                {connected && <button type="button" className="btn btn-ghost btn-sm" onClick={disconnect}>Desconectar Gmail</button>}
                <button type="button" className="btn btn-ghost btn-sm danger" onClick={clearLocal}>Borrar historial local</button>
              </div>
            </footer>
          </>
        )}
      </section>
    );
  }

  // --- Tarjetas de crédito: arte SVG, corte, vencimiento y estado del pago ---
  const PAY_STATUS = {
    pagado: { label: 'Pagado', tone: 'ok' },
    'sin-saldo': { label: 'Sin consumos', tone: 'muted' },
    pendiente: { label: 'Pendiente', tone: 'warn' },
    vencido: { label: 'Vencido', tone: 'bad' },
    'sin-datos': { label: 'Por confirmar', tone: 'open' }
  };

  const shortDate = (d) => d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }).replace('.', '');
  const relDays = (n) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : n > 0 ? `en ${n} días` : n === -1 ? 'ayer' : `hace ${-n} días`);

  // Mastercard: dos círculos con la intersección naranja
  const McLogo = ({ x, y, r = 15, id }) => (
    <g aria-hidden="true">
      <defs><clipPath id={`mc-${id}`}><circle cx={x} cy={y} r={r} /></clipPath></defs>
      <circle cx={x} cy={y} r={r} fill="#eb001b" />
      <circle cx={x + r * 1.25} cy={y} r={r} fill="#f79e1b" />
      <circle cx={x + r * 1.25} cy={y} r={r} fill="#ff5f00" clipPath={`url(#mc-${id})`} />
    </g>
  );

  // Arte de cada tarjeta (aproximación en SVG, 340×214)
  function CardArt({ theme }) {
    if (theme === 'apap') {
      return (
        <svg className="cc-art" viewBox="0 0 340 214" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="apap-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f2d98e" />
              <stop offset="0.5" stopColor="#d7b04c" />
              <stop offset="1" stopColor="#b68a28" />
            </linearGradient>
            <pattern id="apap-hex" width="20.78" height="36" patternUnits="userSpaceOnUse" patternTransform="scale(1.15)">
              <path d="M0 6 L10.39 0 L20.78 6 L20.78 18 L10.39 24 L0 18 Z M10.39 24 L10.39 36" fill="none" stroke="#fff6dc" strokeOpacity="0.35" strokeWidth="1" />
            </pattern>
            <radialGradient id="apap-shine" cx="0.25" cy="0.1" r="0.9">
              <stop offset="0" stopColor="#fffbe8" stopOpacity="0.55" />
              <stop offset="0.6" stopColor="#fffbe8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="340" height="214" fill="url(#apap-bg)" />
          <rect width="340" height="214" fill="url(#apap-hex)" />
          <rect width="340" height="214" fill="url(#apap-shine)" />
          <g transform="translate(18 16)">
            <rect width="34" height="34" rx="3" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="M8 26c2-9 9-15 18-15M10 26c1-5 5-9 11-9M17 8a5 5 0 1 1 0 0.1" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            <text x="42" y="15" fill="#fff" fontSize="12.5" fontWeight="800" letterSpacing="0.2">ASOCIACIÓN POPULAR</text>
            <text x="42" y="27" fill="#fff" fontSize="7.4" fontWeight="600" letterSpacing="0.3">DE AHORROS Y PRÉSTAMOS</text>
          </g>
          <text x="322" y="198" textAnchor="end" fill="#fff" fontSize="27" fontWeight="900" fontStyle="italic" letterSpacing="-1">VISA</text>
        </svg>
      );
    }
    if (theme === 'jetblue') {
      return (
        <svg className="cc-art" viewBox="0 0 340 214" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="jb-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0d1a8f" />
              <stop offset="0.55" stopColor="#1a2bc9" />
              <stop offset="1" stopColor="#0a1166" />
            </linearGradient>
            <pattern id="jb-dots" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.1" fill="#8fb4ff" />
            </pattern>
            <linearGradient id="jb-fade" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="0.55" stopColor="#fff" stopOpacity="0.15" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="jb-mask"><rect width="340" height="214" fill="url(#jb-fade)" /></mask>
            <radialGradient id="jb-glow" cx="0.82" cy="0.05" r="0.45">
              <stop offset="0" stopColor="#7fd3ff" stopOpacity="0.55" />
              <stop offset="1" stopColor="#7fd3ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="340" height="214" fill="url(#jb-bg)" />
          <polygon points="150,0 340,0 340,120" fill="#2c44ff" opacity="0.35" />
          <polygon points="60,214 230,40 300,214" fill="#0a0f5c" opacity="0.35" />
          <polygon points="230,40 340,120 300,214" fill="#3a5bff" opacity="0.2" />
          <rect width="340" height="214" fill="url(#jb-dots)" mask="url(#jb-mask)" opacity="0.7" />
          <rect width="340" height="214" fill="url(#jb-glow)" />
          <text x="20" y="42" fill="#fff" fontSize="25" fontWeight="700" letterSpacing="-0.6">jetBlue</text>
          <McLogo x={286} y={186} r={14} id="jb" />
        </svg>
      );
    }
    // Contigo (Popular)
    return (
      <svg className="cc-art" viewBox="0 0 340 214" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="ct-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f3f1ea" />
            <stop offset="1" stopColor="#e4e0d4" />
          </linearGradient>
        </defs>
        <rect width="340" height="214" fill="url(#ct-bg)" />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M214 92 l14 14 l-14 14" stroke="#ef8a17" strokeWidth="7" opacity="0.9" />
          <path d="M236 74 l30 32 l-30 32" stroke="#3fbfd6" strokeWidth="11" opacity="0.95" />
          <path d="M256 74 l30 32 l-30 32" stroke="#3fbfd6" strokeWidth="11" opacity="0.55" />
          <path d="M300 92 l14 14 l-14 14" stroke="#ef8a17" strokeWidth="7" opacity="0.9" />
        </g>
        <text x="22" y="46" fontSize="23" fontWeight="800" fontStyle="italic" letterSpacing="-0.6">
          <tspan fill="#1d2a5c">Conti</tspan><tspan fill="#3fbfd6">GO</tspan><tspan fill="#ef8a17" dx="2">›</tspan>
        </text>
        <g transform="translate(290 16)">
          <rect width="34" height="34" rx="3" fill="#1d2a5c" />
          <circle cx="17" cy="21" r="10" fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="1.4 1.3" />
          <circle cx="17" cy="21" r="5" fill="#1d2a5c" />
          <circle cx="17" cy="21" r="3" fill="#3fbfd6" />
        </g>
        <McLogo x={286} y={186} r={14} id="ct" />
      </svg>
    );
  }

  const StatusChip = ({ currency, status, manual }) => {
    const meta = PAY_STATUS[status] || PAY_STATUS['sin-datos'];
    return (
      <span className={`cc-chip tone-${meta.tone}`} title={manual ? 'Marcado a mano' : undefined}>
        {status === 'pagado' && <Icons.Check />}
        <b>{currency}</b> {meta.label}{manual ? '*' : ''}
      </span>
    );
  };

  function CreditCards({ currentMonth, store, movements, cardPayments, onUpdateCardPayments, onShowMovements }) {
    const today = new Date();
    const todayMonth = FM.getCurrentYYYYMM();
    const storeCards = FB.getCards(store);

    const items = CREDIT_CARDS.map(cfg => {
      const matched = storeCards.filter(cfg.match);
      const cardIds = matched.map(c => c.id);
      const last4 = (matched.find(c => c.last4) || {}).last4 || '';
      // Mes actual: el próximo pago desde hoy. Otro mes: el pago que vence en ese mes.
      const dueMonth = currentMonth === todayMonth ? FB.nextDueMonth(cfg, today) : currentMonth;
      const cycle = FB.cardCycle(cfg, { movements, cardIds, dueMonth, today, autoPay: cfg.autoPay });

      const manual = (cardPayments[cfg.key] || {})[dueMonth] || {};
      const status = {};
      const manualFlag = {};
      ['DOP', 'USD'].forEach(cur => {
        const auto = cycle.status[cur];
        if (auto === 'pagado' || auto === 'sin-saldo') status[cur] = auto;
        else if (manual[cur]) { status[cur] = 'pagado'; manualFlag[cur] = true; }
        else status[cur] = auto === 'sin-datos' && cycle.overdue ? 'sin-datos' : auto;
      });
      const upToDate = ['DOP', 'USD'].every(cur => status[cur] === 'pagado' || status[cur] === 'sin-saldo');
      return { cfg, cardIds, last4, dueMonth, cycle, status, manualFlag, upToDate, manual };
    });

    const toggleManual = (item, currency) => {
      const forCard = { ...(cardPayments[item.cfg.key] || {}) };
      const forMonth = { ...(forCard[item.dueMonth] || {}) };
      forMonth[currency] = !forMonth[currency];
      forCard[item.dueMonth] = forMonth;
      onUpdateCardPayments({ ...cardPayments, [item.cfg.key]: forCard });
    };

    const upToDateCount = items.filter(i => i.upToDate).length;

    return (
      <section className="panel cc-panel" aria-labelledby="cards-title">
        <SectionHead title="Mis tarjetas" id="cards-title">
          <span className="muted small">{upToDateCount} de {items.length} al día</span>
        </SectionHead>

        <div className="cc-grid">
          {items.map(item => {
            const { cfg, cycle, status, manualFlag } = item;
            const isCurrent = currentMonth === todayMonth;
            const paidAll = item.upToDate;
            const dueLabel = paidAll ? 'Pago del corte al día' : cycle.overdue ? 'Venció el pago' : 'Pagar antes del';
            const hasSpent = cycle.spent.DOP || cycle.spent.USD;
            const hasOpen = cycle.openCycle.DOP || cycle.openCycle.USD;
            return (
              <article key={cfg.key} className={`cc cc-${cfg.theme}`} data-card-key={cfg.key}>
                <div className="cc-face" role="group" aria-label={`${cfg.name} ${cfg.bankLabel}`}>
                  <CardArt theme={cfg.theme} />
                  <div className="cc-content">
                    <div className="cc-due">
                      <span className="cc-label">{dueLabel}</span>
                      <span className="cc-date">{shortDate(cycle.due)}</span>
                      <span className="cc-rel">{relDays(cycle.daysToDue)}</span>
                    </div>
                    <div className="cc-cycle">
                      <span>Corte día {cfg.corte} · Vence día {cfg.vence}</span>
                      {isCurrent && <span>Próximo corte {relDays(cycle.daysToCut)} ({shortDate(cycle.nextCut)})</span>}
                    </div>
                    <div className="cc-bottom">
                      <span className="cc-number">•••• {item.last4 || '····'}</span>
                      <span className="cc-chips">
                        <StatusChip currency="DOP" status={status.DOP} manual={manualFlag.DOP} />
                        <StatusChip currency="USD" status={status.USD} manual={manualFlag.USD} />
                      </span>
                    </div>
                  </div>
                </div>

                <dl className="cc-facts">
                  <div>
                    <dt>Consumido al corte del {shortDate(cycle.cut)}</dt>
                    <dd>{hasSpent ? <MultiCurrency amounts={cycle.spent} /> : <span className="muted">{item.cardIds.length ? 'Sin consumos registrados' : 'Sin historial de Gmail'}</span>}</dd>
                  </div>
                  {isCurrent && (
                    <div>
                      <dt>Desde el último corte</dt>
                      <dd>{hasOpen ? <MultiCurrency amounts={cycle.openCycle} /> : <span className="muted">—</span>}</dd>
                    </div>
                  )}
                  {cycle.payments.length > 0 && (
                    <div>
                      <dt>Pagos recibidos</dt>
                      <dd>{cycle.payments.map(p => <span key={p.id} className="money pos cc-payment">{fmtCurrency(p.amount, p.currency)} · {shortDate(new Date(p.date + 'T12:00'))}</span>)}</dd>
                    </div>
                  )}
                </dl>

                {!cfg.autoPay && (
                  <div className="cc-manual">
                    <span className="muted small">El {cfg.bankLabel} no avisa los pagos por correo. Márcalos tú:</span>
                    <div className="cc-manual-row">
                      {['DOP', 'USD'].map(cur => {
                        const auto = cycle.status[cur];
                        const locked = auto === 'pagado' || auto === 'sin-saldo';
                        return (
                          <label key={cur} className={`cc-check ${locked ? 'is-locked' : ''}`}>
                            <input type="checkbox" checked={locked || !!item.manual[cur]} disabled={locked} onChange={() => toggleManual(item, cur)} />
                            <span>{cur} pagado</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {item.cardIds.length > 0 && (
                  <button type="button" className="btn btn-ghost btn-sm cc-link" onClick={() => onShowMovements(item.cardIds[0])}>
                    Ver movimientos <Icons.Arrow />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  // ============================================================================
  // VISTA 5: NOTAS
  // ============================================================================
  const TIMELINE_ITEMS = [
    { key: 'qik', label: 'QIK' },
    { key: 'gastos-m-p2', label: 'Gastos M parte 2' },
    { key: 'apap', label: 'APAP' },
    { key: 'gastos-m-p1', label: 'Gastos M parte 1' }
  ];

  function parseNoteDate(str) {
    if (!str) return new Date(0);
    const parts = str.split('/');
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
    return new Date(str);
  }

  function TabNotes({ notes, distribucionData, onOpenAddNote, onOpenEditNote, onUpdateNotes, onNavigateToDist }) {
    const togglePin = (noteId) => onUpdateNotes(notes.map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n));

    const deleteNote = (note) => {
      if (window.confirm(`¿Eliminar la nota "${note.title || 'Sin título'}"?`)) {
        onUpdateNotes(notes.filter(n => n.id !== note.id));
      }
    };

    const sorted = useMemo(() => [...notes].sort((a, b) => parseNoteDate(b.date) - parseNoteDate(a.date)), [notes]);
    const pinnedNotes = sorted.filter(n => n.pinned);
    const otherNotes = sorted.filter(n => !n.pinned);

    const renderList = (list) => (
      <div className="notes-grid">
        {list.map(n => <NoteCard key={n.id} note={n} onTogglePin={togglePin} onEdit={onOpenEditNote} onDelete={deleteNote} />)}
      </div>
    );

    return (
      <div className="view notes-layout">
        <div className="notes-main">
          <SectionHead title="Fijadas">
            <button type="button" className="btn btn-primary btn-sm" onClick={onOpenAddNote}>
              <Icons.Plus /> Nota
            </button>
          </SectionHead>
          {pinnedNotes.length === 0
            ? <p className="empty-inline">Fija una nota con el ícono de chincheta para tenerla siempre arriba.</p>
            : renderList(pinnedNotes)}

          <SectionHead title="Todas las demás" />
          {otherNotes.length === 0
            ? <p className="empty-inline">No hay más notas.</p>
            : renderList(otherNotes)}
        </div>

        <aside className="panel notes-aside" aria-labelledby="links-title">
          <SectionHead title="Transferencias del mes" id="links-title" />
          <ul className="link-list">
            {TIMELINE_ITEMS.map(item => {
              const card = distribucionData[item.key];
              return (
                <li key={item.key}>
                  <button type="button" className="link-row" onClick={() => onNavigateToDist(item.key)}>
                    <span className={`link-state ${card && card.pendingDone ? 'is-done' : ''}`} aria-hidden="true" />
                    <span className="link-label">{item.label}</span>
                    <Money value={FM.computeDistribucionCardTotal(card)} />
                    <Icons.Arrow />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    );
  }

  function NoteCard({ note, onTogglePin, onEdit, onDelete }) {
    const tag = note.tag || 'STRATEGY';
    return (
      <article className="note">
        <header className="note-head">
          <span className={`tag tag-${tag.toLowerCase()}`}>{NOTE_TAGS[tag] || tag}</span>
          <time className="note-date">{note.date}</time>
          <div className="note-actions">
            <button type="button" className={`icon-btn icon-btn-quiet ${note.pinned ? 'is-active' : ''}`} onClick={() => onTogglePin(note.id)}
              aria-pressed={!!note.pinned} aria-label={note.pinned ? 'Desfijar nota' : 'Fijar nota'}>
              <Icons.Pin filled={note.pinned} />
            </button>
            <button type="button" className="icon-btn icon-btn-quiet" onClick={() => onEdit(note)} aria-label="Editar nota">
              <Icons.Edit />
            </button>
            <button type="button" className="icon-btn icon-btn-quiet danger" onClick={() => onDelete(note)} aria-label="Eliminar nota">
              <Icons.Trash />
            </button>
          </div>
        </header>
        <h3 className="note-title">{note.title || 'Sin título'}</h3>
        {note.content && <p className="note-body">{note.content}</p>}
        {note.notes && <p className="note-extra">{note.notes}</p>}
      </article>
    );
  }

  // ============================================================================
  // VISTA 6: AJUSTES
  // ============================================================================
  function TabSettings({ gasUrl, dbStatus, onSaveGasUrl, onManualSync, onExportBackup, onImportBackup, onImportError }) {
    const [urlInput, setUrlInput] = useState(gasUrl || '');
    const [syncing, setSyncing] = useState(false);
    const fileInputRef = useRef(null);

    // Mantener el campo al día si la URL cambia desde el modal de la nube
    useEffect(() => { setUrlInput(gasUrl || ''); }, [gasUrl]);

    const handleFileImport = (e) => {
      const file = e.target.files[0];
      e.target.value = ''; // permite volver a elegir el mismo archivo
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          onImportBackup(JSON.parse(event.target.result));
        } catch (err) {
          onImportError('No se pudo leer el archivo: no es un JSON válido.');
        }
      };
      reader.readAsText(file);
    };

    return (
      <div className="view settings">
        <section className="panel" aria-labelledby="cloud-title">
          <SectionHead title="Google Sheets" id="cloud-title">
            <span className={`pill pill-${dbStatus}`}>{DB_STATUS_TEXT[dbStatus]}</span>
          </SectionHead>
          <p className="muted">
            Guarda el presupuesto en una hoja de cálculo mediante una aplicación web de Apps Script. Sin URL, los datos quedan solo en este navegador.
          </p>
          <form className="field-row" onSubmit={(e) => { e.preventDefault(); onSaveGasUrl(urlInput); }}>
            <label className="field">
              <span className="field-label">URL de la aplicación web</span>
              <input type="url" className="input" placeholder="https://script.google.com/macros/s/…/exec"
                value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
            </label>
            <div className="button-row">
              <button type="submit" className="btn btn-primary btn-sm">Guardar URL</button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={syncing}
                onClick={async () => { setSyncing(true); await onManualSync(); setSyncing(false); }}>
                <Icons.Refresh /> {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel" aria-labelledby="backup-title">
          <SectionHead title="Respaldos" id="backup-title" />
          <p className="muted">
            Descarga todos los meses en un archivo <code>.json</code> o restaura uno guardado antes. Restaurar reemplaza los datos actuales.
          </p>
          <div className="button-row">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onExportBackup}>
              <Icons.Download /> Descargar respaldo
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
              <Icons.Upload /> Restaurar respaldo
            </button>
            <input type="file" ref={fileInputRef} hidden accept=".json,application/json" onChange={handleFileImport} />
          </div>
        </section>
      </div>
    );
  }

  // ============================================================================
  // MODALES
  // ============================================================================
  function Modal({ title, onClose, children }) {
    useEffect(() => {
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', onKey);
      document.body.classList.add('has-modal');
      return () => {
        document.removeEventListener('keydown', onKey);
        document.body.classList.remove('has-modal');
      };
    }, [onClose]);

    return (
      <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
          <header className="modal-head">
            <h2>{title}</h2>
            <button type="button" className="icon-btn icon-btn-quiet" onClick={onClose} aria-label="Cerrar">
              <Icons.Close />
            </button>
          </header>
          {children}
        </div>
      </div>
    );
  }

  function AddCategoryModal({ categories, onClose, onAddCategory }) {
    const [name, setName] = useState('');
    const [budget, setBudget] = useState('');
    const [parentId, setParentId] = useState('');
    const rootCategories = categories.filter(c => c.parentId === null);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!name.trim()) return;
      onAddCategory({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
        name: name.trim(),
        budgeted: FM.parseCurrency(budget),
        parentId: parentId || null,
        canDelete: true
      });
    };

    return (
      <Modal title="Nueva categoría" onClose={onClose}>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="field">
              <span className="field-label">Nombre</span>
              <input type="text" className="input" placeholder="Comida, gimnasio…" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Monto inicial</span>
              <input type="text" inputMode="decimal" className="input" placeholder="0.00" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Dentro de</span>
              <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">Ninguna (categoría principal)</option>
                {rootCategories.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <footer className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Agregar categoría</button>
          </footer>
        </form>
      </Modal>
    );
  }

  function DbConfigModal({ currentUrl, dbStatus, onClose, onSaveUrl }) {
    const [url, setUrl] = useState(currentUrl || '');

    return (
      <Modal title="Conexión con Google Sheets" onClose={onClose}>
        <form onSubmit={(e) => { e.preventDefault(); onSaveUrl(url); }}>
          <div className="modal-body">
            <p className="status-line">
              <span className={`pill pill-${dbStatus}`}>{DB_STATUS_TEXT[dbStatus]}</span>
            </p>
            <label className="field">
              <span className="field-label">URL de la aplicación web de Apps Script</span>
              <input type="url" className="input" placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} />
            </label>
            <p className="muted small">Déjala vacía para guardar solo en este navegador.</p>
          </div>
          <footer className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar conexión</button>
          </footer>
        </form>
      </Modal>
    );
  }

  function NoteModal({ initialNote, onClose, onSaveNote }) {
    const [title, setTitle] = useState(initialNote ? initialNote.title : '');
    const [tag, setTag] = useState(initialNote ? initialNote.tag : 'STRATEGY');
    const [date, setDate] = useState(() => {
      if (initialNote && initialNote.date) return initialNote.date;
      const t = new Date();
      return `${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
    });
    const [content, setContent] = useState(initialNote ? initialNote.content : '');
    const [notesVal, setNotesVal] = useState(initialNote ? (initialNote.notes || '') : '');
    const [pinned, setPinned] = useState(initialNote ? !!initialNote.pinned : false);
    const dateValid = /^\d{2}\/\d{2}\/\d{4}$/.test(date.trim());

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!title.trim() || !dateValid) return;
      onSaveNote({
        id: initialNote ? initialNote.id : ('note-' + Date.now()),
        title: title.trim(),
        tag,
        date: date.trim(),
        content: content.trim(),
        notes: notesVal.trim(),
        pinned
      });
    };

    return (
      <Modal title={initialNote ? 'Editar nota' : 'Nueva nota'} onClose={onClose}>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="field">
              <span className="field-label">Título</span>
              <input type="text" className="input" placeholder="Plan de ahorro para el viaje" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <div className="field-pair">
              <label className="field">
                <span className="field-label">Tipo</span>
                <select className="input" value={tag} onChange={(e) => setTag(e.target.value)}>
                  {Object.keys(NOTE_TAGS).map(k => <option key={k} value={k}>{NOTE_TAGS[k]}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Fecha</span>
                <input type="text" className={`input ${!dateValid ? 'is-invalid' : ''}`} placeholder="DD/MM/AAAA" required value={date}
                  aria-invalid={!dateValid} onChange={(e) => setDate(e.target.value)} />
                {!dateValid && <span className="field-error">Usa el formato DD/MM/AAAA.</span>}
              </label>
            </div>
            <label className="field">
              <span className="field-label">Contenido</span>
              <textarea className="input" rows="4" required placeholder="Qué quieres recordar…" value={content} onChange={(e) => setContent(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Detalle adicional (opcional)</span>
              <input type="text" className="input" placeholder="Tasa actual 5.5 %, hablar con el banco…" value={notesVal} onChange={(e) => setNotesVal(e.target.value)} />
            </label>
            <label className="check">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              <span>Fijar arriba</span>
            </label>
          </div>
          <footer className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!dateValid}>Guardar nota</button>
          </footer>
        </form>
      </Modal>
    );
  }

  // ============================================================================
  // MONTAJE DE LA APLICACIÓN REACT EN EL DOM
  // ============================================================================
  const rootEl = document.getElementById('root');
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(<FinancialBudgetDashboard />);
  } else {
    console.error('No se encontró el elemento #root para montar la aplicación React.');
  }

})();
