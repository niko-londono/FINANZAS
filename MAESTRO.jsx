/**
 * MAESTRO.jsx
 * Componente maestro de React 18 para la visualización del Portafolio HAPI (Bolsa y Crypto).
 * Requiere: React 18, ReactDOM 18 y MAESTRO.js (HapiEngine).
 */

const { useState, useMemo, useEffect, useCallback, useRef } = React;

// --- ICONOS VECTORIALES INTEGRADOS (SVG) ---
const Icons = {
  Sun: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  ),
  Moon: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  Refresh: ({ spinning }) => (
    <svg className={spinning ? 'spin' : ''} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  ),
  TrendingUp: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
      <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
  ),
  Info: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  )
};

// --- UTILIDADES DEL GRÁFICO ---
function niceTicks(min, max, count = 4) {
  const lo = Math.min(min, 0);
  const hi = Math.max(max, 0);
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { ticks, min: start, max: end };
}

const axisLabel = v => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${(a / 1000).toFixed(a % 1000 === 0 ? 0 : 1)}k` : `${a}`;
  return `${v < 0 ? '-' : ''}$${s}`;
};

// --- COMPONENTE: GRÁFICO INTERACTIVO SVG (2 paneles: resultado mensual + acumulado) ---
function InteractiveChart({ monthsData, f, lab }) {
  const [tip, setTip] = useState(null);
  const [width, setWidth] = useState(0);
  const wrapRef = useRef(null);

  // El SVG se dibuja al ancho real del contenedor (texto nítido, sin escalado)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { setTip(null); }, [monthsData]);

  const n = monthsData.length;
  if (!n) return null;

  const W = Math.max(300, width || 900);
  const compact = W < 560;
  const L = compact ? 46 : 58;
  const RP = 14;
  const step = (W - L - RP) / n;
  const bw = Math.min(34, Math.max(6, step * 0.58));
  const TOP = 10;
  const hA = compact ? 150 : 190;
  const GAP = 34;
  const hB = compact ? 120 : 150;
  const BOT = 28;
  const topB = TOP + hA + GAP;
  const H = topB + hB + BOT;

  let cum = 0;
  const cumulative = monthsData.map(r => (cum += r.pl));
  const stacks = monthsData.map(r => {
    let pos = 0;
    let neg = 0;
    return [[r.rl, 'realized'], [r.ur, 'unrealized']].map(([val, kind]) => {
      const y0 = val >= 0 ? pos : neg;
      const y1 = y0 + val;
      if (val >= 0) pos = y1; else neg = y1;
      return { y0, y1, kind };
    });
  });
  const flat = stacks.flat();
  const tA = niceTicks(Math.min(0, ...flat.map(s => Math.min(s.y0, s.y1))), Math.max(0, ...flat.map(s => Math.max(s.y0, s.y1))), compact ? 3 : 4);
  const tB = niceTicks(Math.min(0, ...cumulative), Math.max(0, ...cumulative), 3);
  const yA = v => TOP + hA * (1 - (v - tA.min) / (tA.max - tA.min));
  const yB = v => topB + hB * (1 - (v - tB.min) / (tB.max - tB.min));
  const xC = i => L + step * (i + 0.5);
  const maxDep = Math.max(1, ...monthsData.map(r => r.d));
  const labelEvery = Math.max(1, Math.ceil(46 / step));
  const linePts = cumulative.map((v, i) => `${xC(i)},${yB(v)}`).join(' ');
  const areaPath = `M${xC(0)},${yB(0)} ${cumulative.map((v, i) => `L${xC(i)},${yB(v)}`).join(' ')} L${xC(n - 1)},${yB(0)} Z`;
  const last = cumulative[n - 1];
  const d = tip != null ? monthsData[tip] : null;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">Rendimiento mensual y acumulado</h3>
        <div className="chart-legend">
          <span className="legend-item"><span className="legend-chip realized"></span>Realizada</span>
          <span className="legend-item"><span className="legend-chip unrealized"></span>No realizada</span>
          <span className="legend-item"><span className="legend-chip cumulative"></span>Total acumulado</span>
          <span className="legend-item"><span className="legend-chip deposit"></span>Depósito</span>
        </div>
      </div>

      <div className="svg-chart-wrapper" ref={wrapRef} onMouseLeave={() => setTip(null)}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rendimiento mensual y acumulado">
          {tA.ticks.map(v => (
            <g key={`a${v}`}>
              <line className={v === 0 ? 'chart-zero' : 'chart-grid'} x1={L} x2={W - RP} y1={yA(v)} y2={yA(v)} />
              <text className="chart-axis" x={L - 8} y={yA(v) + 4} textAnchor="end">{axisLabel(v)}</text>
            </g>
          ))}
          {tB.ticks.map(v => (
            <g key={`b${v}`}>
              <line className={v === 0 ? 'chart-zero' : 'chart-grid'} x1={L} x2={W - RP} y1={yB(v)} y2={yB(v)} />
              <text className="chart-axis" x={L - 8} y={yB(v) + 4} textAnchor="end">{axisLabel(v)}</text>
            </g>
          ))}

          {tip != null && <line className="chart-guide" x1={xC(tip)} x2={xC(tip)} y1={TOP} y2={topB + hB} />}

          {stacks.map((segs, i) => segs.map(sg => (
            Math.abs(sg.y1 - sg.y0) < 1e-9 ? null : (
              <rect
                key={`${i}-${sg.kind}`}
                className={`bar-${sg.kind}`}
                x={xC(i) - bw / 2}
                y={Math.min(yA(sg.y0), yA(sg.y1))}
                width={bw}
                height={Math.max(1, Math.abs(yA(sg.y0) - yA(sg.y1)))}
                rx="2"
                opacity={tip == null || tip === i ? 1 : 0.45}
              />
            )
          )))}

          {monthsData.map((r, i) => r.d > 0 && (
            <circle key={`dep${i}`} className="deposit-dot" cx={xC(i)} cy={TOP + hA + GAP / 2} r={3 + 4 * Math.sqrt(r.d / maxDep)}>
              <title>{`Depósito de ${f(r.d)}`}</title>
            </circle>
          ))}

          <path className="area-cum" d={areaPath} />
          <polyline className="line-cum" points={linePts} />
          {cumulative.map((v, i) => (
            <circle key={`pt${i}`} className="dot-cum" cx={xC(i)} cy={yB(v)} r={tip === i ? 5 : 3} />
          ))}
          <text className="chart-value-label" x={xC(n - 1)} y={yB(last) + (last >= 0 ? -10 : 18)} textAnchor="end">{f(last)}</text>

          {monthsData.map((r, i) => (n - 1 - i) % labelEvery === 0 && (
            <text key={`lb${i}`} className="chart-xlabel" x={xC(i)} y={H - 8} textAnchor="middle">{lab(r.m)}</text>
          ))}

          {monthsData.map((r, i) => (
            <rect
              key={`hit${i}`}
              x={L + step * i}
              y={TOP}
              width={step}
              height={topB + hB - TOP}
              fill="transparent"
              onMouseMove={() => setTip(i)}
              onClick={() => setTip(i)}
            />
          ))}
        </svg>

        {d && (
          <div className={`chart-tooltip-floating ${tip > n / 2 ? 'left' : ''}`} style={{ left: xC(tip) + (tip > n / 2 ? -14 : 14) }}>
            <div className="tooltip-header">{lab(d.m)}</div>
            <div className="tooltip-row"><span>Realizada</span><span className={d.rl >= 0 ? 'p' : 'n'}>{f(d.rl)}</span></div>
            <div className="tooltip-row"><span>No realizada</span><span className={d.ur >= 0 ? 'p' : 'n'}>{f(d.ur)}</span></div>
            <div className="tooltip-row"><span>Dividendos y cargos</span><span>{f(d.dv)}</span></div>
            <div className="tooltip-row"><span>Total del mes</span><span className={d.pl >= 0 ? 'p' : 'n'}>{f(d.pl)}</span></div>
            <div className="tooltip-row"><span>Acumulado</span><span className={cumulative[tip] >= 0 ? 'p' : 'n'}>{f(cumulative[tip])}</span></div>
            {d.d > 0 && <div className="tooltip-row"><span>Depósito</span><span>{f(d.d)}</span></div>}
            <div className="tooltip-row"><span>Valor al cierre</span><span>{f(d.v)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL: APP ---
function App() {
  const engine = window.HapiEngine;
  if (!engine) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Error: No se encontró MAESTRO.js cargado.</div>;
  }

  const {
    f,
    sg,
    pc,
    cls,
    lab,
    dt,
    computePortfolioData,
    getPeriodSummary,
    computeCryptoRows,
    fetchBtcData,
    loadBtcStorage,
    saveBtcStorage
  } = engine;

  // Estado del portafolio base
  const portfolioData = useMemo(() => computePortfolioData(), []);

  // Estados de interfaz
  const [activeTab, setActiveTab] = useState('bolsa');
  const [period, setPeriod] = useState('YTD');
  const [theme, setTheme] = useState(() => localStorage.getItem('hapi_theme') || 'dark');
  const [posSearch, setPosSearch] = useState('');
  const [opsSearch, setOpsSearch] = useState('');
  const [opsType, setOpsType] = useState('ALL');

  // Estado de Crypto y BTC
  const [btcStorage, setBtcStorage] = useState(() => loadBtcStorage());
  const [isUpdatingBtc, setIsUpdatingBtc] = useState(false);
  const [btcStatusMsg, setBtcStatusMsg] = useState(
    btcStorage.timestamp ? `Última cotización guardada: ${btcStorage.timestamp}` : ''
  );
  const [manualSpotInput, setManualSpotInput] = useState(
    btcStorage.spot ? btcStorage.spot.toString() : ''
  );

  // Manejador del Tema (Dark / Light)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hapi_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Cálculo del Período seleccionado
  const selectedMonths = useMemo(() => {
    return portfolioData.P[period] || portfolioData.R;
  }, [portfolioData, period]);

  const periodSummary = useMemo(() => {
    return getPeriodSummary(selectedMonths);
  }, [selectedMonths]);

  // Posiciones filtradas
  const filteredPositions = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    if (!q) return portfolioData.positionsRows;
    return portfolioData.positionsRows.filter(
      r => r.y.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
  }, [portfolioData.positionsRows, posSearch]);

  // Operaciones filtradas
  const filteredOperations = useMemo(() => {
    const monthsSet = new Set(selectedMonths.map(r => r.m));
    const term = opsSearch.trim().toLowerCase();

    return portfolioData.T
      .filter(o => monthsSet.has(o.m))
      .filter(o => {
        if (opsType !== 'ALL' && o.t !== opsType) return false;
        if (!term) return true;
        const assetName = (portfolioData.N[o.y] || '').toLowerCase();
        return o.y.toLowerCase().includes(term) || assetName.includes(term);
      })
      .slice()
      .reverse();
  }, [portfolioData.T, portfolioData.N, selectedMonths, opsType, opsSearch]);

  // Cálculo de Crypto
  const cryptoData = useMemo(() => {
    const spot = parseFloat(manualSpotInput) || btcStorage.spot || null;
    return computeCryptoRows(btcStorage.history, spot, btcStorage.overrides);
  }, [btcStorage, manualSpotInput]);

  // Actualización de BTC vía Yahoo Finance
  const handleUpdateBtc = async () => {
    setIsUpdatingBtc(true);
    setBtcStatusMsg('Consultando Yahoo Finance vía proxies CORS...');
    try {
      const res = await fetchBtcData();
      const updatedStorage = {
        ...btcStorage,
        history: res.history,
        spot: res.spot,
        timestamp: res.timestamp
      };
      setBtcStorage(updatedStorage);
      saveBtcStorage(updatedStorage);
      setManualSpotInput(res.spot.toString());
      setBtcStatusMsg(`Actualizado exitosamente: ${res.timestamp}`);
    } catch (err) {
      console.error(err);
      setBtcStatusMsg('No se pudo consultar Yahoo Finance automáticamente. Ingresa el precio de BTC manualmente.');
    } finally {
      setIsUpdatingBtc(false);
    }
  };

  // Cambio de precio manual de BTC en tabla
  const handleTransferPriceChange = (index, value) => {
    const num = parseFloat(value);
    const newOverrides = { ...btcStorage.overrides };
    if (!isNaN(num) && num > 0) {
      newOverrides[index] = num;
    } else {
      delete newOverrides[index];
    }
    const updatedStorage = { ...btcStorage, overrides: newOverrides };
    setBtcStorage(updatedStorage);
    saveBtcStorage(updatedStorage);
  };

  // Cambio de precio spot manual
  const handleSpotPriceChange = e => {
    const val = e.target.value;
    setManualSpotInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const updatedStorage = { ...btcStorage, spot: num };
      setBtcStorage(updatedStorage);
      saveBtcStorage(updatedStorage);
    }
  };

  const periodKeys = ['1M', '3M', '6M', 'YTD', '1A', '2025', '2026', 'ALL'];

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">H</div>
          <div className="brand-text">
            <h1>
              HAPI · Portafolio
              <span className="brand-badge">Apex Clearing</span>
            </h1>
            <div className="brand-sub">
              <span className="dot"></span>
              Historial mensual consolidado · jun 2025 – sep 2026 · USD
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button className="theme-toggle" onClick={toggleTheme} title="Cambiar tema">
            {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
        </div>
      </header>

      {/* PESTAÑAS PRINCIPALES */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'bolsa' ? 'active' : ''}`}
          onClick={() => setActiveTab('bolsa')}
        >
          <span>Bolsa de Valores</span>
          <span className="tab-pill-count">16 meses</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'crypto' ? 'active' : ''}`}
          onClick={() => setActiveTab('crypto')}
        >
          <span>Crypto (Bakkt)</span>
          <span className="tab-pill-count">10 traspasos</span>
        </button>
      </nav>

      {/* VISTA 1: BOLSA */}
      {activeTab === 'bolsa' && (
        <section>
          {/* BARRA DE PERÍODOS */}
          <div className="period-bar-container">
            <div className="period-pills">
              {periodKeys.map(k => (
                <button
                  key={k}
                  className={`period-btn ${period === k ? 'active' : ''}`}
                  onClick={() => setPeriod(k)}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="period-range-label font-heading">
              <b>{lab(periodSummary.firstMonth)}</b> – <b>{lab(periodSummary.lastMonth)}</b>
              <span>({periodSummary.monthsCount} {periodSummary.monthsCount > 1 ? 'meses' : 'mes'})</span>
            </div>
          </div>

          {/* KPIs: tarjeta principal + 4 mosaicos */}
          <div className="cards-grid">
            <div className="card-kpi hero">
              <span className="card-kpi-label">Rendimiento total</span>
              <b className={`card-kpi-val hero-val ${cls(periodSummary.total)}`}>{sg(periodSummary.total)}</b>
              <span className={`pct-pill ${cls(periodSummary.total)}`}>{pc((periodSummary.total / periodSummary.base) * 100)}</span>
              <div className="hero-stats">
                <div className="hero-stat"><span>Depositado</span><b>{f(periodSummary.deposited)}</b></div>
                <div className="hero-stat"><span>Retirado</span><b>{f(periodSummary.withdrawn)}</b></div>
                <div className="hero-stat"><span>Valor al cierre</span><b>{f(periodSummary.closingValue)}</b></div>
              </div>
              <p className="hero-note">Los depósitos no cuentan como ganancia; los % son sobre el capital promedio del periodo.</p>
            </div>
            {[
              ['Realizada', periodSummary.rl],
              ['No realizada', periodSummary.ur],
              ['Realizada + no realizada', periodSummary.capitalGain],
              ['Dividendos netos y cargos', periodSummary.dv]
            ].map(([label, val]) => (
              <div className="card-kpi" key={label}>
                <span className="card-kpi-label">{label}</span>
                <b className={`card-kpi-val ${cls(val)}`}>{sg(val)}</b>
                <span className={`card-kpi-pct ${cls(val)}`}>{pc((val / periodSummary.base) * 100)}</span>
              </div>
            ))}
          </div>

          {/* GRÁFICO INTERACTIVO */}
          <InteractiveChart monthsData={selectedMonths} f={f} lab={lab} />

          {/* TABLA DE POSICIONES Y ACTIVOS */}
          <div className="section-wrapper">
            <div className="section-header">
              <h2 className="section-title">Posiciones y activos <span className="section-sub">precios al 30 sep 2026</span></h2>
              <div className="search-input-wrapper">
                <span className="search-icon"><Icons.Search /></span>
                <input type="search" placeholder="Buscar activo" aria-label="Buscar activo" value={posSearch} onChange={e => setPosSearch(e.target.value)} />
              </div>
            </div>
            <div className="table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Activo</th>
                      <th>Cantidad</th>
                      <th>Costo prom.</th>
                      <th>Precio</th>
                      <th>Valor</th>
                      <th>% cartera</th>
                      <th>No realizada</th>
                      <th>Realizada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPositions.map(r => (
                      <tr key={r.y}>
                        <td>
                          <div className="ticker-cell">
                            <span className="ticker-symbol">{r.y}</span>
                            <span className="ticker-name">{r.name}</span>
                          </div>
                        </td>
                        <td>{r.q > 0 ? r.q.toFixed(5) : '—'}</td>
                        <td>{r.q > 0 ? f(r.avgCost) : '—'}</td>
                        <td>{r.q > 0 ? f(r.price) : '—'}</td>
                        <td>{r.q > 0 ? f(r.v) : '—'}</td>
                        <td>
                          {r.q > 0 ? (
                            <span className="weight-cell">
                              {r.portfolioPct.toFixed(1)}%
                              <span className="portfolio-weight-bar"><span className="weight-fill" style={{ width: `${Math.min(100, r.portfolioPct)}%` }}></span></span>
                            </span>
                          ) : '—'}
                        </td>
                        <td className={r.q > 0 ? cls(r.u) : 'neutral'}>{r.q > 0 ? `${sg(r.u)} (${pc(r.unrealizedPct)})` : '—'}</td>
                        <td className={r.r !== 0 ? cls(r.r) : 'neutral'}>{r.r !== 0 ? sg(r.r) : '—'}</td>
                      </tr>
                    ))}
                    {filteredPositions.length === 0 && (
                      <tr><td colSpan={8} className="empty-row">No hay activos que coincidan con la búsqueda.</td></tr>
                    )}
                    <tr className="row-cash">
                      <td>Efectivo / FDIC</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td>{f(portfolioData.cashFdic)}</td>
                      <td>{portfolioData.cashPct.toFixed(1)}%</td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* TABLA DE RENDIMIENTO MENSUAL */}
          <div className="section-wrapper">
            <div className="section-header">
              <h2 className="section-title">Rendimiento mensual</h2>
            </div>
            <div className="table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Valor cierre</th>
                      <th>Depósitos</th>
                      <th>Retiros</th>
                      <th>Realizada</th>
                      <th>No realizada</th>
                      <th>Dividendos</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMonths.slice().reverse().map(r => (
                      <tr key={r.m}>
                        <td style={{ fontWeight: '500' }}>{lab(r.m)}</td>
                        <td>{f(r.v)}</td>
                        <td>{f(r.d)}</td>
                        <td>{f(r.w)}</td>
                        <td className={cls(r.rl)}>{sg(r.rl)}</td>
                        <td className={cls(r.ur)}>{sg(r.ur)}</td>
                        <td className={cls(r.dv)}>{sg(r.dv)}</td>
                        <td className={cls(r.pl)} style={{ fontWeight: '600' }}>
                          {sg(r.pl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* TABLA DE OPERACIONES */}
          <div className="section-wrapper">
            <div className="section-header">
              <h2 className="section-title">Operaciones del periodo <span className="section-sub">{filteredOperations.length} movimientos</span></h2>
              <div className="section-tools">
                <div className="segmented" role="group" aria-label="Tipo de operación">
                  {[['ALL', 'Todas'], ['B', 'Compras'], ['S', 'Ventas'], ['X', 'Split']].map(([k, l]) => (
                    <button key={k} className={opsType === k ? 'active' : ''} onClick={() => setOpsType(k)}>{l}</button>
                  ))}
                </div>
                <div className="search-input-wrapper">
                  <span className="search-icon"><Icons.Search /></span>
                  <input type="search" placeholder="Buscar activo" aria-label="Buscar operación por activo" value={opsSearch} onChange={e => setOpsSearch(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Operación</th>
                      <th>Activo</th>
                      <th>Cantidad</th>
                      <th>Monto</th>
                      <th>Ganancia realizada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOperations.map((o, idx) => (
                      <tr key={idx}>
                        <td>{dt(o.d)}</td>
                        <td><span className={`badge-op ${o.t === 'B' ? 'buy' : o.t === 'S' ? 'sell' : 'split'}`}>{o.t === 'B' ? 'Compra' : o.t === 'S' ? 'Venta' : 'Split'}</span></td>
                        <td title={portfolioData.N[o.y] || ''}>{o.y}</td>
                        <td>{o.q}</td>
                        <td>{o.a ? f(o.a) : '—'}</td>
                        <td className={o.g == null ? 'neutral' : cls(o.g)}>{o.g == null ? '—' : sg(o.g)}</td>
                      </tr>
                    ))}
                    {filteredOperations.length === 0 && (
                      <tr><td colSpan={6} className="empty-row">No hay operaciones con este filtro en el periodo.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VISTA 2: CRYPTO (BAKKT) */}
      {activeTab === 'crypto' && (
        <section>
          {/* PANEL DE CONTROL DE PRECIO BTC */}
          <div className="crypto-controls-card">
            <div className="crypto-action-group">
              <button
                className="btn-primary"
                onClick={handleUpdateBtc}
                disabled={isUpdatingBtc}
              >
                <Icons.Refresh spinning={isUpdatingBtc} />
                <span>{isUpdatingBtc ? 'Actualizando…' : 'Actualizar precio'}</span>
              </button>
              <div className="crypto-status-text">{btcStatusMsg}</div>
            </div>

            <div className="manual-spot-input-group">
              <span>Precio manual de BTC (si falla la consulta):</span>
              <input
                type="number"
                step="any"
                className="input-styled"
                placeholder="Ej. 65000"
                value={manualSpotInput}
                onChange={handleSpotPriceChange}
              />
            </div>
          </div>

          {/* TARJETAS KPI DE CRYPTO */}
          <div className="cards-grid flat">
            <div className="card-kpi">
              <span className="card-kpi-label">Invertido neto</span>
              <b className="card-kpi-val">{f(cryptoData.totalInvested)}</b>
            </div>

            <div className="card-kpi">
              <span className="card-kpi-label">BTC estimado</span>
              <b className="card-kpi-val" style={{ color: 'var(--amber)' }}>
                {cryptoData.totalBtc.toFixed(6)}
              </b>
            </div>

            <div className="card-kpi">
              <span className="card-kpi-label">Precio promedio</span>
              <b className="card-kpi-val">
                {cryptoData.avgPrice > 0 ? f(cryptoData.avgPrice) : '—'}
              </b>
            </div>

            <div className="card-kpi">
              <span className="card-kpi-label">Precio actual</span>
              <b className="card-kpi-val" style={{ color: 'var(--sky)' }}>
                {btcStorage.spot || manualSpotInput ? f(parseFloat(manualSpotInput) || btcStorage.spot) : '—'}
              </b>
            </div>

            <div className="card-kpi">
              <span className="card-kpi-label">Valor actual</span>
              <b className="card-kpi-val">
                {cryptoData.currentVal != null ? f(cryptoData.currentVal) : '—'}
              </b>
            </div>

            <div className="card-kpi">
              <span className="card-kpi-label">Ganancia / pérdida</span>
              <b className={`card-kpi-val ${cls(cryptoData.profitLoss)}`}>
                {cryptoData.profitLoss != null ? sg(cryptoData.profitLoss) : '—'}
              </b>
              {cryptoData.roiPct != null && (
                <span className={`card-kpi-pct ${cls(cryptoData.profitLoss)}`}>
                  {pc(cryptoData.roiPct)}
                </span>
              )}
            </div>
          </div>

          {/* TABLA DE TRASPASOS A BAKKT */}
          <div className="section-wrapper">
            <div className="section-header">
              <h2 className="section-title">Registro de Traspasos a Bakkt</h2>
            </div>
            <div className="table-card">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha Traspaso</th>
                      <th>Monto Traspasado</th>
                      <th>Precio BTC (USD)</th>
                      <th>BTC Estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cryptoData.rows.map(r => {
                      const isManual = r.manualPrice != null;
                      return (
                        <tr key={r.index}>
                          <td className="font-mono">{r.date}</td>
                          <td className="font-mono" style={{ fontWeight: '600' }}>
                            {f(r.amount)}
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              className={`table-input-price ${isManual ? 'manual-override' : ''}`}
                              defaultValue={r.manualPrice != null ? r.manualPrice : ''}
                              placeholder={r.historicalPrice ? r.historicalPrice.toFixed(0) : '—'}
                              onBlur={e => handleTransferPriceChange(r.index, e.target.value)}
                              title={isManual ? 'Precio editado manualmente' : 'Precio de cierre histórico de Yahoo'}
                            />
                          </td>
                          <td className="font-mono" style={{ color: 'var(--amber)', fontWeight: '600' }}>
                            {r.estimatedBtc > 0 ? r.estimatedBtc.toFixed(6) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="crypto-explainer-card">
              <b>Nota metodológica:</b> El BTC estimado se calcula dividiendo el monto traspasado entre el precio de cierre diario de BTC-USD (Yahoo Finance) en la fecha correspondiente. Si compraste en un día diferente o con comisiones, puedes editar el precio directamente en la celda de la tabla y los totales se actualizarán de inmediato.
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// Montar la aplicación React en el DOM
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}
