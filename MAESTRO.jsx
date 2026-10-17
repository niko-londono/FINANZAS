/**
 * ==============================================================================
 * MAESTRO.jsx - Aplicación Principal en React 18
 * Proyecto: Financial Budget Dashboard (Finanzas)
 * ==============================================================================
 * Centraliza toda la interfaz interactiva en componentes React limpios:
 * - Selector global de mes (YYYY-MM) con historial e indicador visual de meses con datos
 * - Vistas: Overview, Summary, Distribución, Tarjetas, Notes, Settings
 * - Modales: Agregar Categoría, Configuración Cloud (GAS), Agregar/Editar Nota
 * - Persistencia por mes y sincronización bidireccional con Google Sheets (GAS)
 */

(function () {
  'use strict';

  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const FM = window.FinanzasMaestro;

  if (!FM) {
    console.error('Error: MAESTRO.js debe cargarse antes de MAESTRO.jsx');
    return;
  }

  // --- ICONOS SVG REUTILIZABLES ---
  const Icons = {
    Grid: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    ),
    List: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
      </svg>
    ),
    Pie: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="18" r="3"></circle>
        <circle cx="6" cy="6" r="3"></circle>
        <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
        <line x1="6" y1="9" x2="6" y2="21"></line>
      </svg>
    ),
    Card: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="2" y1="10" x2="22" y2="10"></line>
      </svg>
    ),
    Notes: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
    Settings: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    ),
    Cloud: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
      </svg>
    ),
    Plus: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    ),
    Trash: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    ),
    ChevronRight: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    ),
    Pin: ({ filled }) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    ),
    Edit: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
    ),
    Close: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    )
  };

  // ============================================================================
  // COMPONENTE PRINCIPAL
  // ============================================================================
  function FinancialBudgetDashboard() {
    // 1. Estado Maestro
    const [byMonth, setByMonth] = useState(() => FM.loadInitialByMonthState());
    const [currentMonth, setCurrentMonth] = useState(() => FM.getCurrentYYYYMM());
    const [activeTab, setActiveTab] = useState('overview');
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [modalState, setModalState] = useState({ type: null, data: null }); // 'addCategory' | 'dbConfig' | 'note'
    const [distGraphMode, setDistGraphMode] = useState('amount'); // 'amount' | 'percent'

    const hasLoadedFromCloudRef = useRef(false);
    const saveTimeoutRef = useRef(null);

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

    // Métricas calculadas para Overview
    const metrics = useMemo(() => {
      return FM.computeMetrics(categories);
    }, [categories]);

    // 2. Persistencia en localStorage y Google Apps Script
    const persistState = useCallback((updatedByMonth) => {
      setByMonth(updatedByMonth);
      FM.safeStorage.set(FM.STORAGE_KEY_BY_MONTH, JSON.stringify(updatedByMonth));

      // Sincronización en la nube debounced
      if (gasUrl) {
        setDbStatus('syncing');
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            const currentObj = updatedByMonth[currentMonth] || {};
            await FM.saveToGAS(gasUrl, updatedByMonth, currentObj.categories, currentObj.extra);
            setDbStatus('connected');
          } catch (err) {
            console.error('Error sincronizando con Google Apps Script:', err);
            setDbStatus('error');
          }
        }, 500);
      }
    }, [currentMonth, gasUrl]);

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

    // 3. Carga inicial desde Google Apps Script
    useEffect(() => {
      if (hasLoadedFromCloudRef.current || !gasUrl) return;
      hasLoadedFromCloudRef.current = true;

      async function syncCloud() {
        setDbStatus('syncing');
        try {
          const cloudData = await FM.loadFromGAS(gasUrl);
          let loadedByMonth = cloudData && cloudData.byMonth;

          // Retrocompatibilidad con script antiguo de celda A1
          if (!loadedByMonth && (Array.isArray(cloudData) || (cloudData && (cloudData.categories || cloudData.extra)))) {
            const oldCats = Array.isArray(cloudData) ? cloudData : cloudData.categories;
            const oldExtra = cloudData.extra;
            if (oldCats && oldCats.length > 0) {
              loadedByMonth = {
                [currentMonth]: {
                  categories: oldCats,
                  extra: FM.ensureAppExtraDefaults(oldExtra || FM.DEFAULT_APP_EXTRA)
                }
              };
            }
          }

          if (loadedByMonth && Object.keys(loadedByMonth).length > 0) {
            setByMonth(prev => {
              const merged = { ...prev };
              Object.keys(loadedByMonth).forEach(m => {
                const cloudMonth = loadedByMonth[m];
                const localMonth = merged[m];
                if (localMonth && localMonth.extra && cloudMonth.extra) {
                  const localTs = localMonth.extra.lastSaved || 0;
                  const cloudTs = cloudMonth.extra.lastSaved || 0;
                  if (cloudTs >= localTs) {
                    merged[m] = cloudMonth;
                  }
                } else {
                  merged[m] = cloudMonth;
                }
              });
              FM.safeStorage.set(FM.STORAGE_KEY_BY_MONTH, JSON.stringify(merged));
              return merged;
            });
            setDbStatus('connected');
          } else {
            setDbStatus('connected');
          }
        } catch (err) {
          console.warn('No se pudo conectar a Google Apps Script:', err);
          setDbStatus('error');
        }
      }

      syncCloud();
    }, [gasUrl, currentMonth]);

    // 4. Cambiar mes
    const switchMonth = useCallback((targetMonth) => {
      setCurrentMonth(targetMonth);
      setByMonth(prev => {
        if (!prev[targetMonth]) {
          const sorted = Object.keys(prev).sort();
          const prevMonths = sorted.filter(m => m < targetMonth);
          const next = { ...prev };
          if (prevMonths.length > 0) {
            const nearest = prevMonths[prevMonths.length - 1];
            const cloned = JSON.parse(JSON.stringify(prev[nearest]));
            // Restablecer estados de verificación (PENDIENTE)
            if (cloned.extra && cloned.extra.tarjetas) {
              Object.keys(cloned.extra.tarjetas).forEach(k => {
                cloned.extra.tarjetas[k].usdDone = false;
                cloned.extra.tarjetas[k].dopDone = false;
              });
            }
            if (cloned.extra && cloned.extra.distribucion) {
              Object.keys(cloned.extra.distribucion).forEach(k => {
                cloned.extra.distribucion[k].pendingDone = false;
              });
            }
            next[targetMonth] = cloned;
          } else {
            next[targetMonth] = {
              categories: JSON.parse(JSON.stringify(FM.DEFAULT_CATEGORIES)),
              extra: JSON.parse(JSON.stringify(FM.DEFAULT_APP_EXTRA))
            };
          }
          FM.safeStorage.set(FM.STORAGE_KEY_BY_MONTH, JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }, []);

    // Restablecer mes actual
    const resetCurrentMonth = useCallback(() => {
      if (window.confirm('¿Estás seguro de restablecer este mes a la plantilla base? Esto borrará los datos actuales solo de ESTE mes.')) {
        const nextByMonth = {
          ...byMonth,
          [currentMonth]: {
            categories: JSON.parse(JSON.stringify(FM.DEFAULT_CATEGORIES)),
            extra: JSON.parse(JSON.stringify(FM.DEFAULT_APP_EXTRA))
          }
        };
        persistState(nextByMonth);
      }
    }, [byMonth, currentMonth, persistState]);

    // Alternar colapso de categoría
    const toggleCollapse = useCallback((id) => {
      setCollapsedCategories(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        FM.safeStorage.set(FM.STORAGE_KEY_COLLAPSED, JSON.stringify(Array.from(next)));
        return next;
      });
    }, []);

    // Tooltip de estado en la nube
    const dbStatusTitle = {
      offline: 'Modo Local (Sin base de datos)',
      syncing: 'Sincronizando con Google Sheets...',
      connected: 'Conectado a Google Sheets',
      error: 'Error de conexión con Apps Script'
    }[dbStatus];

    return (
      <div className="app-container">
        {/* Overlay para móviles */}
        <div
          className={`sidebar-overlay ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Sidebar Principal */}
        <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1"></rect>
              <rect x="14" y="3" width="7" height="5" rx="1"></rect>
              <rect x="14" y="12" width="7" height="9" rx="1"></rect>
              <rect x="3" y="16" width="7" height="5" rx="1"></rect>
            </svg>
            <span>FINANZAS</span>
          </div>

          <ul className="sidebar-menu">
            {[
              { tab: 'overview', label: 'Overview', icon: <Icons.Grid /> },
              { tab: 'summary', label: 'Summary', icon: <Icons.List /> },
              { tab: 'distribucion', label: 'Distribución', icon: <Icons.Pie /> },
              { tab: 'tarjetas', label: 'Tarjetas', icon: <Icons.Card /> },
              { tab: 'notes', label: 'Notes', icon: <Icons.Notes /> },
              { tab: 'settings', label: 'Settings', icon: <Icons.Settings /> },
            ].map(item => (
              <li
                key={item.tab}
                className={`sidebar-item ${activeTab === item.tab ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(item.tab);
                  setIsMobileMenuOpen(false);
                }}
              >
                <a href={`#${item.tab}`}>
                  {item.icon}
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Header Móvil */}
        <div className="mobile-header">
          <MonthSelectorWidget
            currentMonth={currentMonth}
            byMonth={byMonth}
            onSelectMonth={switchMonth}
          />

          <div className="mobile-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1"></rect>
              <rect x="14" y="3" width="7" height="5" rx="1"></rect>
              <rect x="14" y="12" width="7" height="9" rx="1"></rect>
              <rect x="3" y="16" width="7" height="5" rx="1"></rect>
            </svg>
            <span>FINANZAS</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className={`btn btn-secondary btn-sm db-status-btn ${dbStatus}`}
              style={{ padding: '0.35rem', borderRadius: '6px' }}
              title={dbStatusTitle}
              onClick={() => setModalState({ type: 'dbConfig' })}
            >
              <Icons.Cloud />
            </button>
            <button
              className="btn btn-primary btn-sm"
              style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', fontWeight: 600, gap: '0.25rem' }}
              onClick={() => setModalState({ type: 'addCategory' })}
            >
              <Icons.Plus />
              <span>Categoría</span>
            </button>
          </div>
        </div>

        {/* Barra superior de mes en escritorio */}
        <div className="global-top-bar" style={{ position: 'absolute', top: 10, right: 20, zIndex: 100 }}>
          <MonthSelectorWidget
            currentMonth={currentMonth}
            byMonth={byMonth}
            onSelectMonth={switchMonth}
          />
        </div>

        {/* Contenido Principal según Tab activa */}
        <main className="dashboard-layout" style={{ display: activeTab === 'overview' ? 'grid' : 'none' }}>
          <TabOverview
            currentMonth={currentMonth}
            categories={categories}
            metrics={metrics}
            collapsedCategories={collapsedCategories}
            onToggleCollapse={toggleCollapse}
            onUpdateCategories={(newCats) => updateCurrentMonthData(newCats, undefined)}
            onOpenAddCategory={() => setModalState({ type: 'addCategory' })}
            onOpenCloudConfig={() => setModalState({ type: 'dbConfig' })}
            dbStatus={dbStatus}
            dbStatusTitle={dbStatusTitle}
          />
        </main>

        <div className="tab-page" style={{ display: activeTab === 'summary' ? 'block' : 'none' }}>
          <TabSummary
            currentMonth={currentMonth}
            summaryTables={appExtra.summaryTables || []}
            onUpdateSummaryTables={(newTables) => {
              updateCurrentMonthData(undefined, { ...appExtra, summaryTables: newTables });
            }}
          />
        </div>

        <div className="tab-page" style={{ display: activeTab === 'distribucion' ? 'block' : 'none' }}>
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
        </div>

        <div className="tab-page" style={{ display: activeTab === 'tarjetas' ? 'block' : 'none' }}>
          <TabTarjetas
            currentMonth={currentMonth}
            tarjetasData={appExtra.tarjetas || {}}
            onUpdateTarjetas={(newTarjetas) => {
              updateCurrentMonthData(undefined, { ...appExtra, tarjetas: newTarjetas });
            }}
          />
        </div>

        <div className="tab-page" style={{ display: activeTab === 'notes' ? 'block' : 'none' }}>
          <TabNotes
            currentMonth={currentMonth}
            notes={appExtra.notes || []}
            distribucionData={appExtra.distribucion || {}}
            onOpenAddNote={() => setModalState({ type: 'note', data: null })}
            onOpenEditNote={(note) => setModalState({ type: 'note', data: note })}
            onUpdateNotes={(newNotes) => {
              updateCurrentMonthData(undefined, { ...appExtra, notes: newNotes });
            }}
            onNavigateToDist={(key) => {
              setActiveTab('distribucion');
              setTimeout(() => {
                const el = document.querySelector(`.dist-card[data-dist-key="${key}"]`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.style.outline = '3px solid var(--color-info)';
                  setTimeout(() => { el.style.outline = 'none'; }, 1500);
                }
              }, 150);
            }}
          />
        </div>

        <div className="tab-page" style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>
          <TabSettings
            gasUrl={gasUrl}
            dbStatus={dbStatus}
            byMonth={byMonth}
            onSaveGasUrl={(url) => {
              setGasUrlState(url);
              FM.setGasUrl(url);
            }}
            onManualSync={() => {
              hasLoadedFromCloudRef.current = false;
              setDbStatus('syncing');
              FM.loadFromGAS(gasUrl).then(data => {
                setDbStatus('connected');
                alert('Sincronización exitosa con Google Apps Script');
              }).catch(err => {
                setDbStatus('error');
                alert('Error al sincronizar: ' + err.message);
              });
            }}
            onExportBackup={() => FM.exportBackupJSON(byMonth)}
            onImportBackup={(importedByMonth) => {
              if (window.confirm('¿Reemplazar todos los datos actuales con este archivo de respaldo?')) {
                persistState(importedByMonth);
              }
            }}
          />
        </div>

        {/* Navegación Inferior Móvil */}
        <nav className="bottom-nav">
          {[
            { tab: 'overview', label: 'Overview', icon: <Icons.Grid /> },
            { tab: 'summary', label: 'Summary', icon: <Icons.List /> },
            { tab: 'distribucion', label: 'Distribución', icon: <Icons.Pie /> },
            { tab: 'tarjetas', label: 'Tarjetas', icon: <Icons.Card /> },
            { tab: 'notes', label: 'Notes', icon: <Icons.Notes /> },
            { tab: 'settings', label: 'Settings', icon: <Icons.Settings /> },
          ].map(item => (
            <div
              key={item.tab}
              className={`bottom-nav-item ${activeTab === item.tab ? 'active' : ''}`}
              onClick={() => setActiveTab(item.tab)}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Modales */}
        {modalState.type === 'addCategory' && (
          <AddCategoryModal
            categories={categories}
            onClose={() => setModalState({ type: null, data: null })}
            onAddCategory={(newCat) => {
              const updated = [...categories, newCat];
              updateCurrentMonthData(updated, undefined);
              setModalState({ type: null, data: null });
            }}
          />
        )}

        {modalState.type === 'dbConfig' && (
          <DbConfigModal
            currentUrl={gasUrl}
            onClose={() => setModalState({ type: null, data: null })}
            onSaveUrl={(newUrl) => {
              setGasUrlState(newUrl);
              FM.setGasUrl(newUrl);
              setModalState({ type: null, data: null });
            }}
          />
        )}

        {modalState.type === 'note' && (
          <NoteModal
            initialNote={modalState.data}
            onClose={() => setModalState({ type: null, data: null })}
            onSaveNote={(noteToSave) => {
              const currentNotes = appExtra.notes || [];
              const exists = currentNotes.some(n => n.id === noteToSave.id);
              let nextNotes;
              if (exists) {
                nextNotes = currentNotes.map(n => n.id === noteToSave.id ? noteToSave : n);
              } else {
                nextNotes = [noteToSave, ...currentNotes];
              }
              updateCurrentMonthData(undefined, { ...appExtra, notes: nextNotes });
              setModalState({ type: null, data: null });
            }}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // WIDGET: SELECTOR DE MES
  // ============================================================================
  function MonthSelectorWidget({ currentMonth, byMonth, onSelectMonth }) {
    const monthKeys = useMemo(() => {
      const set = new Set(Object.keys(byMonth || {}));
      set.add(currentMonth);
      return Array.from(set).sort();
    }, [byMonth, currentMonth]);

    const handlePrev = () => {
      const [yyyy, mm] = currentMonth.split('-');
      const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 2, 1);
      onSelectMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };

    const handleNext = () => {
      const [yyyy, mm] = currentMonth.split('-');
      const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10), 1);
      onSelectMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };

    const handleToday = () => {
      onSelectMonth(FM.getCurrentYYYYMM());
    };

    return (
      <div className="month-selector-widget">
        <button className="btn btn-sm btn-secondary" onClick={handlePrev} title="Mes anterior">&lt;</button>
        <select
          className="form-input"
          value={currentMonth}
          onChange={(e) => onSelectMonth(e.target.value)}
          style={{ padding: '0.2rem', minWidth: '130px', borderColor: 'rgba(255,255,255,0.1)', fontWeight: 600 }}
        >
          {monthKeys.map(m => (
            <option key={m} value={m}>
              {FM.formatMonthLabel(m)} {byMonth[m] ? '•' : ''}
            </option>
          ))}
        </select>
        <button className="btn btn-sm btn-secondary" onClick={handleNext} title="Mes siguiente">&gt;</button>
        <button className="btn btn-sm btn-primary" onClick={handleToday} title="Ir a hoy">Hoy</button>
      </div>
    );
  }

  // ============================================================================
  // TAB 1: OVERVIEW
  // ============================================================================
  function TabOverview({
    currentMonth,
    categories,
    metrics,
    collapsedCategories,
    onToggleCollapse,
    onUpdateCategories,
    onOpenAddCategory,
    onOpenCloudConfig,
    dbStatus,
    dbStatusTitle
  }) {
    const monthLabel = FM.formatMonthLabel(currentMonth);

    // Actualizar nombre o presupuesto inline
    const handleCategoryChange = (id, field, value) => {
      const updated = categories.map(cat => {
        if (cat.id === id) {
          return {
            ...cat,
            [field]: field === 'budgeted' ? FM.parseCurrency(value) : value
          };
        }
        return cat;
      });
      onUpdateCategories(updated);
    };

    // Eliminar categoría y todos sus descendientes
    const handleDeleteCategory = (id) => {
      if (!window.confirm('¿Estás seguro de que deseas eliminar esta categoría y todas sus subcategorías?')) return;
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
      const updated = categories.filter(c => !idsToDelete.has(c.id));
      onUpdateCategories(updated);
    };

    // Construcción de filas de árbol
    const topLevel = useMemo(() => {
      return categories.filter(c => c.parentId === null);
    }, [categories]);

    // Cálculo Sueldo Cuadre
    const budgetedExpenses = useMemo(() => {
      return categories
        .filter(c => c.id !== 'sueldo' && c.parentId === null)
        .reduce((sum, c) => sum + (Number(c.budgeted) || 0), 0);
    }, [categories]);

    const sueldoCuadreDiff = metrics.totalIncome - budgetedExpenses;

    return (
      <div className="main-column">
        <header className="dashboard-header">
          <h1 className="dashboard-title">Financial Budget Dashboard</h1>
          <span className="dashboard-subtitle">{monthLabel || 'Overview'}</span>
        </header>

        {/* Tarjetas de Métricas Principales */}
        <section className="metrics-grid">
          <div className="metric-card income">
            <div className="metric-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">Total Income</span>
              <span className="metric-value">{FM.formatMoney(metrics.totalIncome)}</span>
              <span className="metric-period">Monthly</span>
            </div>
          </div>

          <div className="metric-card expenses">
            <div className="metric-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">Total Expenses</span>
              <span className="metric-value">{FM.formatMoney(metrics.totalExpenses)}</span>
              <span className="metric-period">Monthly</span>
            </div>
          </div>

          <div className="metric-card balance">
            <div className="metric-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                <line x1="12" y1="4" x2="12" y2="20"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
              </svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">Remaining Balance</span>
              <span
                className="metric-value"
                style={{ color: metrics.remainingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
              >
                {FM.formatMoney(metrics.remainingBalance)}
              </span>
              <span className="metric-period">Monthly</span>
            </div>
          </div>
        </section>

        {/* Tabla General de Presupuesto */}
        <section className="card">
          <div className="card-header-flex">
            <h2 className="card-title">Budget Overview</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button className="btn btn-primary btn-sm" onClick={onOpenAddCategory}>
                <Icons.Plus />
                Agregar Categoría
              </button>
              <button
                className={`btn btn-secondary btn-sm db-status-btn ${dbStatus}`}
                style={{ color: 'var(--color-text-light)' }}
                title={dbStatusTitle}
                onClick={onOpenCloudConfig}
              >
                <Icons.Cloud />
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="budget-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Budgeted</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Sueldo al inicio */}
                {topLevel.filter(c => c.id === 'sueldo').map(cat => (
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

                {/* 2. Demás categorías raíz */}
                {topLevel.filter(c => c.id !== 'sueldo').map(cat => (
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

                {/* 3. Fila de Sueldo Cuadre */}
                <tr className="depth-0 parent-row" data-row-id="sueldo-cuadre">
                  <td>
                    <div className="cat-cell" style={{ fontWeight: 600 }}>
                      <span style={{ paddingLeft: '24px' }}>Sueldo Cuadre</span>
                    </div>
                  </td>
                  <td>
                    <div className="value-container">
                      <span className="value-amount" style={{ fontWeight: 600 }}>
                        {FM.formatMoney(budgetedExpenses)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="value-container">
                      <span
                        className="value-amount"
                        style={{
                          color: sueldoCuadreDiff >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                          fontWeight: 700
                        }}
                      >
                        {FM.formatMoney(sueldoCuadreDiff)}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  // Fila recursiva de Categoría
  function CategoryTreeRow({
    category,
    depth,
    allCategories,
    collapsedCategories,
    onToggleCollapse,
    onChange,
    onDelete
  }) {
    const children = allCategories.filter(c => c.parentId === category.id);
    const isParent = children.length > 0;
    const isCollapsed = collapsedCategories.has(category.id);

    // Calcular Diferencia
    let diffDisplay = '-';
    let diffStyle = {};
    if (isParent) {
      const childSum = FM.getChildrenSum(allCategories, category.id);
      const diff = (Number(category.budgeted) || 0) - childSum;
      diffDisplay = diff >= 0 ? FM.formatMoney(diff) : `-$${FM.formatCurrency(Math.abs(diff))}`;
      diffStyle = { color: diff >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700 };
    }

    const bgColor = FM.getCategoryColor(category, depth > 0, allCategories);

    return (
      <React.Fragment>
        <tr
          className={`depth-${depth} ${isParent ? 'parent-row' : 'child-row'}`}
          style={bgColor ? { backgroundColor: bgColor } : {}}
        >
          <td>
            <div className="cat-cell" style={{ paddingLeft: `${depth * 18}px` }}>
              {isParent ? (
                <button
                  className={`toggle-arrow ${isCollapsed ? '' : 'expanded'}`}
                  onClick={() => onToggleCollapse(category.id)}
                  title={isCollapsed ? 'Expandir' : 'Colapsar'}
                >
                  <Icons.ChevronRight />
                </button>
              ) : (
                <span className="toggle-arrow" style={{ opacity: 0, pointerEvents: 'none' }}>
                  <Icons.ChevronRight />
                </span>
              )}

              <input
                type="text"
                className="category-name-input"
                value={category.name}
                onChange={(e) => onChange(category.id, 'name', e.target.value)}
                autoComplete="off"
              />

              {category.canDelete && category.id !== 'sueldo' && (
                <button
                  className="delete-category-btn"
                  onClick={() => onDelete(category.id)}
                  title="Eliminar Categoría"
                >
                  <Icons.Trash />
                </button>
              )}
            </div>
          </td>
          <td>
            <div className="value-container">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, marginRight: '2px' }}>$</span>
                <input
                  type="text"
                  className="budget-input"
                  defaultValue={FM.formatCurrency(category.budgeted || 0)}
                  key={`${category.id}-${category.budgeted}`}
                  onBlur={(e) => onChange(category.id, 'budgeted', e.target.value)}
                  inputMode="decimal"
                />
              </div>
            </div>
          </td>
          <td>
            <div className="value-container">
              <span className="value-amount" style={diffStyle}>
                {diffDisplay}
              </span>
            </div>
          </td>
        </tr>

        {/* Renderizar hijos si no está colapsado */}
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
  // TAB 2: SUMMARY
  // ============================================================================
  function TabSummary({ currentMonth, summaryTables, onUpdateSummaryTables }) {
    const monthLabel = FM.formatMonthLabel(currentMonth);

    const handleTitleChange = (tableId, newTitle) => {
      onUpdateSummaryTables(summaryTables.map(t => t.id === tableId ? { ...t, title: newTitle } : t));
    };

    const handleRowChange = (tableId, rowIndex, field, value) => {
      onUpdateSummaryTables(summaryTables.map(t => {
        if (t.id === tableId) {
          const nextRows = [...t.rows];
          nextRows[rowIndex] = {
            ...nextRows[rowIndex],
            [field]: field === 'amount' ? FM.parseCurrency(value) : value
          };
          return { ...t, rows: nextRows };
        }
        return t;
      }));
    };

    const handleAddRow = (tableId) => {
      onUpdateSummaryTables(summaryTables.map(t => {
        if (t.id === tableId) {
          return {
            ...t,
            rows: [...t.rows, { category: '', amount: 0, destino: '' }]
          };
        }
        return t;
      }));
    };

    const handleDeleteTable = (tableId) => {
      if (window.confirm('¿Eliminar esta tabla de resumen?')) {
        onUpdateSummaryTables(summaryTables.filter(t => t.id !== tableId));
      }
    };

    const handleAddTable = () => {
      const newId = 'summary-' + Date.now();
      const baseRows = (summaryTables[0] && summaryTables[0].rows) || FM.DEFAULT_SUMMARY_ROWS;
      const newTable = {
        id: newId,
        title: `Year-End Summary ${summaryTables.length + 1}`,
        editable: true,
        rows: baseRows.map(r => ({ category: r.category, amount: 0, destino: '' }))
      };
      onUpdateSummaryTables([...summaryTables, newTable]);
    };

    return (
      <div className="main-column" style={{ maxWidth: '100%' }}>
        <header className="dashboard-header">
          <h1 className="dashboard-title">Summary</h1>
          <span className="dashboard-subtitle">{monthLabel || 'Year-End Overview'}</span>
        </header>

        {summaryTables.map(table => {
          const total = FM.computeSummaryTotal(table.rows);
          return (
            <section key={table.id} className="card summary-table-card" style={{ marginTop: '1.25rem' }}>
              <div className="card-header-flex">
                <input
                  type="text"
                  className="card-title"
                  value={table.title}
                  onChange={(e) => handleTitleChange(table.id, e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', fontWeight: 700, width: 'auto' }}
                />
                {table.editable && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger-bg)' }}
                    onClick={() => handleDeleteTable(table.id)}
                  >
                    <Icons.Trash /> Eliminar
                  </button>
                )}
              </div>

              <div className="table-responsive">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Monto $</th>
                      <th>DESTINO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className="summary-editable-input summary-cat-input"
                            value={row.category || ''}
                            placeholder="Categoría..."
                            onChange={(e) => handleRowChange(table.id, idx, 'category', e.target.value)}
                          />
                        </td>
                        <td>
                          <span className="pill-amount pill-input-wrap">
                            <input
                              type="text"
                              className="pill-input"
                              placeholder="$0.00"
                              defaultValue={row.amount ? FM.formatCurrency(row.amount) : ''}
                              key={`${row.amount}-${idx}`}
                              onBlur={(e) => handleRowChange(table.id, idx, 'amount', e.target.value)}
                              inputMode="decimal"
                            />
                          </span>
                        </td>
                        <td>
                          <span className="pill-destination pill-input-wrap">
                            <input
                              type="text"
                              className="pill-input"
                              placeholder="destino..."
                              value={row.destino || ''}
                              onChange={(e) => handleRowChange(table.id, idx, 'destino', e.target.value)}
                            />
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="summary-row-total">
                      <td>TOTAL</td>
                      <td>
                        <span className="pill-amount">
                          {FM.formatMoney(total)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleAddRow(table.id)}
                        >
                          + Agregar fila
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
          <button
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
            onClick={handleAddTable}
          >
            <Icons.Plus /> Agregar otra tabla
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // TAB 3: DISTRIBUCIÓN
  // ============================================================================
  function TabDistribucion({
    currentMonth,
    byMonth,
    categories,
    distribucionData,
    distGraphMode,
    onChangeGraphMode,
    onResetMonth,
    onUpdateDistribucion
  }) {
    const monthLabel = FM.formatMonthLabel(currentMonth);
    const currentYear = currentMonth.split('-')[0];

    // Datos del gráfico anual
    const annualData = useMemo(() => {
      return FM.computeAnnualDistribucionData(byMonth, currentYear);
    }, [byMonth, currentYear]);

    // Manejar cambio en filas de composición
    const handleCardRowChange = (cardKey, rowIndex, field, value) => {
      const card = distribucionData[cardKey] || { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] };
      const nextRows = [...(card.rows || [])];

      if (field === 'catId') {
        const suggested = FM.computeDistribucionSuggested(categories, value, '');
        nextRows[rowIndex] = { catId: value, subId: '', amount: suggested };
      } else if (field === 'subId') {
        const catId = nextRows[rowIndex].catId;
        const suggested = FM.computeDistribucionSuggested(categories, catId, value);
        nextRows[rowIndex] = { ...nextRows[rowIndex], subId: value, amount: suggested };
      } else if (field === 'amount') {
        nextRows[rowIndex] = { ...nextRows[rowIndex], amount: FM.parseCurrency(value) };
      }

      onUpdateDistribucion({
        ...distribucionData,
        [cardKey]: { ...card, rows: nextRows }
      });
    };

    const handleAddRow = (cardKey) => {
      const card = distribucionData[cardKey] || { pendingDone: false, rows: [] };
      onUpdateDistribucion({
        ...distribucionData,
        [cardKey]: { ...card, rows: [...(card.rows || []), { catId: '', subId: '', amount: 0 }] }
      });
    };

    const handleRemoveRow = (cardKey, rowIndex) => {
      const card = distribucionData[cardKey] || { pendingDone: false, rows: [] };
      if ((card.rows || []).length <= 1) return;
      onUpdateDistribucion({
        ...distribucionData,
        [cardKey]: { ...card, rows: card.rows.filter((_, i) => i !== rowIndex) }
      });
    };

    const handleToggleCardStatus = (cardKey) => {
      const card = distribucionData[cardKey] || { pendingDone: false, rows: [] };
      onUpdateDistribucion({
        ...distribucionData,
        [cardKey]: { ...card, pendingDone: !card.pendingDone }
      });
    };

    const distCardsMeta = [
      { key: 'qik', title: 'QIK', type: 'salida' },
      { key: 'gastos-m-p2', title: 'GASTOS M parte 2 a Cuenta Corriente popular', type: 'entrada' },
      { key: 'apap', title: 'APAP', type: 'salida' },
      { key: 'gastos-m-p1', title: 'GASTOS M parte 1 a Cuenta Corriente popular', type: 'entrada' },
    ];

    return (
      <div className="dist-layout">
        <header className="dashboard-header">
          <h1 className="dashboard-title">Distribución</h1>
          <span className="dashboard-subtitle">{monthLabel || 'Monthly Summary'}</span>
        </header>

        {/* Gráfico Anual */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header-flex">
            <h2 className="card-title">Distribución Anual {currentYear}</h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                $ Monto
                <input
                  type="checkbox"
                  checked={distGraphMode === 'percent'}
                  onChange={(e) => onChangeGraphMode(e.target.checked ? 'percent' : 'amount')}
                  style={{ transform: 'scale(1.2)' }}
                />
                % Dist
              </label>
              <button
                className="btn btn-sm btn-secondary"
                style={{ color: 'var(--color-danger)' }}
                onClick={onResetMonth}
              >
                Restablecer Mes
              </button>
            </div>
          </div>

          <div className="dist-graph-container">
            {annualData.monthlyBreakdown.map((col, idx) => (
              <div key={col.monthKey} className="dist-graph-col" style={{ opacity: col.isFuture ? 0.45 : 1 }}>
                <div className="dist-bar-wrap">
                  {col.segments.map(seg => {
                    const color = FM.getCategoryColor({ id: seg.id, parentId: null }, false, categories) || '#38bdf8';
                    let heightStyle = '0%';
                    if (distGraphMode === 'percent') {
                      heightStyle = col.income > 0 ? `${(seg.amount / col.income) * 100}%` : '0%';
                    } else {
                      heightStyle = `${(seg.amount / annualData.maxIncome) * 100}%`;
                    }
                    return (
                      <div
                        key={seg.id}
                        className="dist-bar-segment"
                        style={{ backgroundColor: color, height: heightStyle }}
                        title={`${col.label} · ${seg.name}: ${FM.formatMoney(seg.amount)}`}
                      />
                    );
                  })}
                </div>
                <div className="dist-bar-label">{col.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid de Tarjetas de Distribución */}
        <div className="dist-grid">
          {distCardsMeta.map(meta => {
            const cardData = distribucionData[meta.key] || { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] };
            const cardTotal = FM.computeDistribucionCardTotal(cardData);

            return (
              <div key={meta.key} className="tarjeta-card dist-card" data-dist-key={meta.key}>
                <div className="tarjeta-top">
                  <div className="tarjeta-meta">
                    <span className={`badge ${meta.type}`}>{meta.type}</span>
                    <span className="tarjeta-desc">{meta.title}</span>
                  </div>
                  <span className="tarjeta-amount">{FM.formatMoney(cardTotal)}</span>
                </div>

                <div className="tarjeta-bottom">
                  <button
                    className="status-toggle"
                    data-done={cardData.pendingDone ? 'true' : 'false'}
                    onClick={() => handleToggleCardStatus(meta.key)}
                  >
                    <span className="status-dot"></span>
                    <span className="status-label">{cardData.pendingDone ? 'DONE' : 'PENDIENTE'}</span>
                  </button>
                </div>

                <div className="tarjeta-composition">
                  <div className="composition-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                    </svg>
                    Composición
                  </div>

                  <div className="comp-rows-container">
                    {(cardData.rows || []).map((row, rIdx) => {
                      const rootCats = categories.filter(c => c.parentId === null);
                      const subCats = row.catId ? categories.filter(c => c.parentId === row.catId) : [];
                      const hasDiff = row.catId && subCats.length > 0;

                      return (
                        <div key={rIdx} className="composition-row">
                          <select
                            className="comp-select"
                            value={row.catId || ''}
                            onChange={(e) => handleCardRowChange(meta.key, rIdx, 'catId', e.target.value)}
                          >
                            <option value="">— Categoría —</option>
                            {rootCats.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>

                          <select
                            className="comp-select"
                            disabled={subCats.length === 0}
                            value={row.subId || ''}
                            onChange={(e) => handleCardRowChange(meta.key, rIdx, 'subId', e.target.value)}
                          >
                            <option value="">— Subcategoría —</option>
                            {subCats.length > 0 && <option value="__todas__">Todas</option>}
                            {subCats.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                            {hasDiff && (
                              <option value={`${row.catId}-difference`}>Difference</option>
                            )}
                          </select>

                          <input
                            type="text"
                            className="comp-amount-input"
                            placeholder="$0.00"
                            inputMode="decimal"
                            defaultValue={row.amount ? FM.formatCurrency(row.amount) : ''}
                            key={`${row.amount}-${rIdx}`}
                            onBlur={(e) => handleCardRowChange(meta.key, rIdx, 'amount', e.target.value)}
                          />

                          <button
                            className="comp-remove-row"
                            title="Eliminar fila"
                            onClick={() => handleRemoveRow(meta.key, rIdx)}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button className="comp-add-row-btn" onClick={() => handleAddRow(meta.key)}>
                    <Icons.Plus /> Agregar categoría
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // TAB 4: TARJETAS
  // ============================================================================
  function TabTarjetas({ currentMonth, tarjetasData, onUpdateTarjetas }) {
    const monthLabel = FM.formatMonthLabel(currentMonth);

    const toggleCurrency = (cardKey, currency) => {
      const card = tarjetasData[cardKey] || { usdDone: false, dopDone: false };
      const field = currency === 'usd' ? 'usdDone' : 'dopDone';
      onUpdateTarjetas({
        ...tarjetasData,
        [cardKey]: { ...card, [field]: !card[field] }
      });
    };

    const cards = [
      { key: 'tc-contigo', name: 'TC CONTIGO' },
      { key: 'tc-jetblue', name: 'TC JET BLUE' },
      { key: 'tc-apap', name: 'TC APAP' },
    ];

    return (
      <div className="main-column" style={{ maxWidth: '100%' }}>
        <header className="dashboard-header">
          <h1 className="dashboard-title">Tarjetas</h1>
          <span className="dashboard-subtitle">{monthLabel || 'Estado de pago por moneda'}</span>
        </header>

        <section className="card">
          <div className="card-header-flex">
            <h2 className="card-title">Composición de Tarjetas</h2>
          </div>
          <div className="tc-table-wrapper">
            <table className="tc-table">
              <thead>
                <tr>
                  <th className="tc-th-card">TARJETA C</th>
                  <th className="tc-th-currency">USD</th>
                  <th className="tc-th-currency">DOP</th>
                </tr>
              </thead>
              <tbody>
                {cards.map(c => {
                  const state = tarjetasData[c.key] || { usdDone: false, dopDone: false };
                  return (
                    <tr key={c.key} className="tc-row" data-card-key={c.key}>
                      <td className="tc-name">{c.name}</td>
                      <td className="tc-status-cell">
                        <button
                          className="status-toggle"
                          data-done={state.usdDone ? 'true' : 'false'}
                          onClick={() => toggleCurrency(c.key, 'usd')}
                        >
                          <span className="status-dot"></span>
                          <span className="status-label">{state.usdDone ? 'DONE' : 'PENDIENTE'}</span>
                        </button>
                      </td>
                      <td className="tc-status-cell">
                        <button
                          className="status-toggle"
                          data-done={state.dopDone ? 'true' : 'false'}
                          onClick={() => toggleCurrency(c.key, 'dop')}
                        >
                          <span className="status-dot"></span>
                          <span className="status-label">{state.dopDone ? 'DONE' : 'PENDIENTE'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  // ============================================================================
  // TAB 5: NOTES
  // ============================================================================
  function TabNotes({
    currentMonth,
    notes,
    distribucionData,
    onOpenAddNote,
    onOpenEditNote,
    onUpdateNotes,
    onNavigateToDist
  }) {
    const monthLabel = FM.formatMonthLabel(currentMonth);

    const togglePin = (noteId) => {
      onUpdateNotes(notes.map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n));
    };

    const deleteNote = (noteId) => {
      if (window.confirm('¿Estás seguro de que deseas eliminar esta nota?')) {
        onUpdateNotes(notes.filter(n => n.id !== noteId));
      }
    };

    const parseDate = (str) => {
      if (!str) return new Date(0);
      const parts = str.split('/');
      if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
      return new Date(str);
    };

    const pinnedNotes = useMemo(() => {
      return notes.filter(n => n.pinned).sort((a, b) => parseDate(b.date) - parseDate(a.date));
    }, [notes]);

    const recentNotes = useMemo(() => {
      return notes.filter(n => !n.pinned).sort((a, b) => parseDate(b.date) - parseDate(a.date));
    }, [notes]);

    const timelineItems = [
      { key: 'qik', label: 'QIK', color: 'orange' },
      { key: 'gastos-m-p2', label: 'GASTOS M P2', color: 'pink' },
      { key: 'apap', label: 'APAP', color: 'blue' },
      { key: 'gastos-m-p1', label: 'GASTOS M P1', color: 'pink' }
    ];

    return (
      <div className="notes-layout">
        <div className="notes-main-content">
          <header className="dashboard-header">
            <h1 className="dashboard-title">Financial</h1>
            <span className="dashboard-subtitle">{monthLabel || 'Financial Notes and Annotations Journal'}</span>
          </header>

          {/* Pinned Notes */}
          <div className="notes-section">
            <h2 className="notes-section-title">Pinned Notes</h2>
            <div className="notes-grid">
              {pinnedNotes.length === 0 ? (
                <div className="no-notes-msg" style={{ gridColumn: 'span 2', color: 'var(--color-text-light)', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem 0' }}>
                  No hay notas fijadas
                </div>
              ) : (
                pinnedNotes.map(n => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    onTogglePin={togglePin}
                    onEdit={onOpenEditNote}
                    onDelete={deleteNote}
                  />
                ))
              )}
            </div>
          </div>

          {/* Recent Notes */}
          <div className="notes-section" style={{ marginTop: '2rem' }}>
            <h2 className="notes-section-title">Recent Notes</h2>
            <div className="notes-grid">
              {recentNotes.length === 0 ? (
                <div className="no-notes-msg" style={{ gridColumn: 'span 2', color: 'var(--color-text-light)', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem 0' }}>
                  No hay notas recientes
                </div>
              ) : (
                recentNotes.map(n => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    onTogglePin={togglePin}
                    onEdit={onOpenEditNote}
                    onDelete={deleteNote}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar de Timeline de Transacciones */}
        <div className="notes-sidebar-column">
          <h2 className="notes-section-title">Quick Links to Recent Transactions</h2>
          <div className="transaction-timeline">
            {timelineItems.map(item => {
              const cardData = distribucionData[item.key];
              const total = FM.computeDistribucionCardTotal(cardData);
              return (
                <div
                  key={item.key}
                  className="timeline-item"
                  onClick={() => onNavigateToDist(item.key)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="timeline-dot-wrapper">
                    <div className={`timeline-dot ${item.color}`}>
                      <Icons.Grid />
                    </div>
                    <div className="timeline-line"></div>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-meta">{item.label}</div>
                    <div className="timeline-amount">{FM.formatMoney(total)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Botón Flotante para agregar nota */}
        <button className="fab-btn" onClick={onOpenAddNote} title="Agregar Nueva Nota">
          <Icons.Plus />
          <span>Add New Note</span>
        </button>
      </div>
    );
  }

  function NoteCard({ note, onTogglePin, onEdit, onDelete }) {
    const tag = note.tag || 'STRATEGY';
    return (
      <div className={`note-card ${note.pinned ? 'pinned-note' : ''}`}>
        <div className="note-card-header">
          <span className={`note-tag tag-${tag.toLowerCase()}`}>{tag}</span>
          <div className="note-actions">
            <button className="note-action-btn pin-toggle-btn" onClick={() => onTogglePin(note.id)} title={note.pinned ? 'Desfijar' : 'Fijar'}>
              <Icons.Pin filled={note.pinned} />
            </button>
            <button className="note-action-btn edit-note-btn" onClick={() => onEdit(note)} title="Editar">
              <Icons.Edit />
            </button>
            <button className="note-action-btn delete-note-btn" onClick={() => onDelete(note.id)} title="Eliminar">
              <Icons.Trash />
            </button>
          </div>
        </div>
        <h3 className="note-title">{note.title || 'Sin Título'}</h3>
        <span className="note-date">{note.date}</span>
        <div className="note-content" style={{ whiteSpace: 'pre-line' }}>{note.content}</div>
        {note.notes && (
          <div className="note-details-box">
            <strong>Notes:</strong> {note.notes}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // TAB 6: SETTINGS
  // ============================================================================
  function TabSettings({ gasUrl, dbStatus, byMonth, onSaveGasUrl, onManualSync, onExportBackup, onImportBackup }) {
    const [urlInput, setUrlInput] = useState(gasUrl || '');
    const fileInputRef = useRef(null);

    const handleFileImport = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (typeof parsed === 'object') {
            onImportBackup(parsed);
          } else {
            alert('El archivo no tiene un formato válido.');
          }
        } catch (err) {
          alert('Error leyendo el archivo JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    };

    return (
      <div className="main-column" style={{ maxWidth: '100%' }}>
        <header className="dashboard-header">
          <h1 className="dashboard-title">Settings</h1>
          <span className="dashboard-subtitle">Configuración y Respaldos</span>
        </header>

        <div className="settings-layout">
          {/* Card: Google Apps Script Backend */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <Icons.Cloud />
                <span>Base de Datos Google Sheets (Apps Script)</span>
              </div>
              <span className={`settings-badge ${dbStatus}`}>
                {dbStatus}
              </span>
            </div>

            <p className="settings-description">
              Sincroniza tu presupuesto en la nube directamente con una hoja de cálculo en Google Sheets utilizando una Google Apps Script Web App.
            </p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>URL de Apps Script Web App</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onSaveGasUrl(urlInput.trim());
                  alert('URL guardada correctamente.');
                }}
              >
                Guardar URL
              </button>
              <button className="btn btn-secondary btn-sm" onClick={onManualSync}>
                Sincronizar Ahora
              </button>
            </div>
          </div>

          {/* Card: Respaldos Locales JSON */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <Icons.List />
                <span>Respaldos e Importación</span>
              </div>
            </div>

            <p className="settings-description">
              Exporta un respaldo completo de todos tus presupuestos mensuales en un archivo <code>.json</code> o restaura una copia de seguridad previamente guardada.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={onExportBackup}>
                Descargar Respaldo JSON
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                Restaurar Respaldo JSON
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleFileImport}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODALES
  // ============================================================================

  // Modal: Agregar Categoría
  function AddCategoryModal({ categories, onClose, onAddCategory }) {
    const [name, setName] = useState('');
    const [budget, setBudget] = useState(0);
    const [parentId, setParentId] = useState('');

    const rootCategories = categories.filter(c => c.parentId === null);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!name.trim()) return;

      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
      onAddCategory({
        id,
        name: name.trim(),
        budgeted: Number(budget) || 0,
        parentId: parentId || null,
        canDelete: true
      });
    };

    return (
      <div className="modal-overlay active" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
        <div className="modal-card">
          <div className="modal-header">
            <h3>Agregar Categoría</h3>
            <button className="modal-close" onClick={onClose} aria-label="Cerrar modal">
              <Icons.Close />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre de la Categoría</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Comida, Gimnasio"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Presupuesto Inicial ($)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  step="any"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Categoría Padre (Opcional)</label>
                <select
                  className="form-input"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">Ninguna (Nivel Superior)</option>
                  {rootCategories.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Modal: Configuración Cloud (GAS)
  function DbConfigModal({ currentUrl, onClose, onSaveUrl }) {
    const [url, setUrl] = useState(currentUrl || '');

    const handleSubmit = (e) => {
      e.preventDefault();
      onSaveUrl(url.trim());
    };

    return (
      <div className="modal-overlay active" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
        <div className="modal-card">
          <div className="modal-header">
            <h3>Base de Datos Cloud</h3>
            <button className="modal-close" onClick={onClose} aria-label="Cerrar modal">
              <Icons.Close />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                Configura un backend en la nube con Google Apps Script para guardar tu presupuesto en Google Sheets.
              </p>
              <div className="form-group">
                <label>URL de Google Apps Script Web App</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--color-text-light)' }}>
                Deje este campo vacío para usar únicamente el almacenamiento local del navegador (localStorage).
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Conectar y Guardar</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Modal: Agregar / Editar Nota
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

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!title.trim() || !date.trim()) return;

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
      <div className="modal-overlay active" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
        <div className="modal-card">
          <div className="modal-header">
            <h3>{initialNote ? 'Editar Nota' : 'Agregar Nota'}</h3>
            <button className="modal-close" onClick={onClose} aria-label="Cerrar modal">
              <Icons.Close />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Título</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Estrategia de Inversión"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Tag / Tipo</label>
                  <select className="form-input" value={tag} onChange={(e) => setTag(e.target.value)}>
                    <option value="STRATEGY">STRATEGY</option>
                    <option value="GOAL">GOAL</option>
                    <option value="REMINDER">REMINDER</option>
                    <option value="IDEA">IDEA</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Fecha</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="DD/MM/YYYY"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Contenido</label>
                <textarea
                  className="form-input"
                  placeholder="Escribe el contenido de la nota aquí..."
                  rows="4"
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.5rem' }}
                />
              </div>

              <div className="form-group">
                <label>Detalles adicionales / Notas (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Reunión con asesor, tasa actual 5.5%..."
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="notePinnedCheck"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="notePinnedCheck" style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Fijar nota (Pinned)
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MONTAJE DE LA APLICACIÓN REACT EN EL DOM
  // ============================================================================
  const rootEl = document.getElementById('root');
  if (rootEl) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(<FinancialBudgetDashboard />);
  } else {
    console.error('No se encontró el elemento #root para montar la aplicación React.');
  }

})();
