const fs = require('fs');
const path = require('path');

const APP_JS_PATH = path.join(__dirname, 'src', 'js', 'app.js');
const INDEX_HTML_PATH = path.join(__dirname, 'index.html');
const STYLE_CSS_PATH = path.join(__dirname, 'src', 'css', 'style.css');

function refactorAppJs() {
    let content = fs.readFileSync(APP_JS_PATH, 'utf8');

    // 1. Replace the state initialization
    const old_state_init = `    let categories = JSON.parse(safeStorage.get('budget_categories')) || DEFAULT_CATEGORIES;
    let collapsedCategories = new Set(JSON.parse(safeStorage.get('collapsed_categories')) || []);
    const tbody = document.getElementById('budgetTableBody');`;

    const new_state_init = `    // --- MONTHLY STATE ---
    function getCurrentYYYYMM() {
        const d = new Date();
        return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\`;
    }

    let byMonth = JSON.parse(safeStorage.get('budget_by_month'));
    let currentMonth = getCurrentYYYYMM();
    let categories = [];
    let appExtra = {};
    
    let collapsedCategories = new Set(JSON.parse(safeStorage.get('collapsed_categories')) || []);
    const tbody = document.getElementById('budgetTableBody');

    // Migration from old global state
    const oldCats = safeStorage.get('budget_categories');
    const oldExtra = safeStorage.get('app_extra_data');
    if (!byMonth) {
        byMonth = {};
        if (oldCats || oldExtra) {
            safeStorage.set('budget_categories_backup_v1', oldCats || '[]');
            safeStorage.set('app_extra_data_backup_v1', oldExtra || '{}');
            byMonth[currentMonth] = {
                categories: oldCats ? JSON.parse(oldCats) : JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
                extra: oldExtra ? JSON.parse(oldExtra) : JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA))
            };
        }
    }
    
    function resetStatesForNewMonth(extra) {
        if (extra.tarjetas) {
            Object.keys(extra.tarjetas).forEach(k => {
                extra.tarjetas[k].usdDone = false;
                extra.tarjetas[k].dopDone = false;
            });
        }
        if (extra.distribucion) {
            Object.keys(extra.distribucion).forEach(k => {
                extra.distribucion[k].pendingDone = false;
            });
        }
    }

    function switchMonth(yyyyMM) {
        currentMonth = yyyyMM;
        if (!byMonth[yyyyMM]) {
            // Find nearest previous month
            const existingMonths = Object.keys(byMonth).sort();
            const prevMonths = existingMonths.filter(m => m < yyyyMM);
            if (prevMonths.length > 0) {
                const nearest = prevMonths[prevMonths.length - 1];
                byMonth[yyyyMM] = JSON.parse(JSON.stringify(byMonth[nearest]));
                resetStatesForNewMonth(byMonth[yyyyMM].extra);
            } else {
                byMonth[yyyyMM] = {
                    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
                    extra: JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA))
                };
            }
            saveByMonth();
        }
        categories = byMonth[yyyyMM].categories;
        appExtra = byMonth[yyyyMM].extra;
        
        updateMonthUI();
        init();
    }
    
    function saveByMonth() {
        if (!byMonth[currentMonth]) byMonth[currentMonth] = {};
        byMonth[currentMonth].categories = categories;
        byMonth[currentMonth].extra = appExtra;
        safeStorage.set('budget_by_month', JSON.stringify(byMonth));
        saveToGAS();
    }`;
    content = content.replace(old_state_init, new_state_init);

    // 2. Replace appExtra init
    const old_app_extra_init = `    let appExtra = JSON.parse(safeStorage.get('app_extra_data')) || JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA));
    // Fill in any missing keys (in case of partial old data)
    if (!appExtra.summaryTables) appExtra.summaryTables = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.summaryTables));
    if (!appExtra.distribucion) appExtra.distribucion = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.distribucion));
    if (!appExtra.tarjetas) appExtra.tarjetas = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.tarjetas));
    if (!appExtra.notes) appExtra.notes = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.notes));`;
    
    const new_app_extra_init = `    // Initial load logic moved to init/switchMonth
    function ensureAppExtraDefaults() {
        if (!appExtra) appExtra = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA));
        if (!appExtra.summaryTables) appExtra.summaryTables = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.summaryTables));
        if (!appExtra.distribucion) appExtra.distribucion = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.distribucion));
        if (!appExtra.tarjetas) appExtra.tarjetas = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.tarjetas));
        if (!appExtra.notes) appExtra.notes = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.notes));
    }`;
    content = content.replace(old_app_extra_init, new_app_extra_init);

    // 3. Fix save functions
    content = content.replace(
        "safeStorage.set('app_extra_data', JSON.stringify(appExtra));",
        "saveByMonth();"
    );
    // There are a couple of these, replace all except the very first one which might be appExtra fallback
    // Wait, the first replacement above might catch them all.
    content = content.replace(
        /safeStorage\.set\('app_extra_data', JSON\.stringify\(appExtra\)\);/g,
        "saveByMonth();"
    );
    content = content.replace(
        /safeStorage\.set\('budget_categories', JSON\.stringify\(categories\)\);/g,
        "saveByMonth();"
    );

    // 4. Fix loadFromGAS and saveToGAS
    const old_savetogas = `    async function saveToGAS() {
        if (!gasApiUrl) {
            updateDbStatus('offline');
            return;
        }
        updateDbStatus('syncing');
        try {
            await fetch(gasApiUrl, {
                method: 'POST',
                mode: 'no-cors', // bypass CORS preflight redirect issues in GAS
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: JSON.stringify({ categories: categories, extra: appExtra })
            });
            updateDbStatus('connected');
        } catch (err) {
            console.error('Failed to save to Apps Script:', err);
            updateDbStatus('error');
        }
    }`;
    
    const new_savetogas = `    async function saveToGAS() {
        if (!gasApiUrl) {
            updateDbStatus('offline');
            return;
        }
        updateDbStatus('syncing');
        try {
            await fetch(gasApiUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ byMonth: byMonth })
            });
            updateDbStatus('connected');
        } catch (err) {
            console.error('Failed to save to Apps Script:', err);
            updateDbStatus('error');
        }
    }`;
    content = content.replace(old_savetogas, new_savetogas);

    // Replace loadFromGAS completely
    const loadfromgas_pattern = /async function loadFromGAS\(\) \{[\s\S]*?\} catch \(err\) \{[\s\S]*?\}\n    \}/;
    const new_loadfromgas_full = `async function loadFromGAS() {
        if (!gasApiUrl) {
            updateDbStatus('offline');
            return;
        }
        updateDbStatus('syncing');
        try {
            const response = await fetch(gasApiUrl);
            if (!response.ok) throw new Error('Response status ' + response.status);
            const data = await response.json();

            if (data && data.byMonth) {
                byMonth = data.byMonth;
                safeStorage.set('budget_by_month', JSON.stringify(byMonth));
                switchMonth(currentMonth); // will call init()
                updateDbStatus('connected');
            } else {
                updateDbStatus('connected');
                saveToGAS(); 
            }
        } catch (err) {
            console.error('Failed to load from Apps Script:', err);
            updateDbStatus('error');
        }
    }`;
    content = content.replace(loadfromgas_pattern, new_loadfromgas_full);

    // 5. Add Month UI Logic
    const month_logic = `
    // --- MONTH UI LOGIC ---
    const monthSelect = document.getElementById('globalMonthSelect');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const todayMonthBtn = document.getElementById('todayMonthBtn');
    
    function populateMonthSelect() {
        if (!monthSelect) return;
        monthSelect.innerHTML = '';
        const monthsSet = new Set(Object.keys(byMonth));
        monthsSet.add(currentMonth);
        const sorted = Array.from(monthsSet).sort();
        
        sorted.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            const [yyyy, mm] = m.split('-');
            const date = new Date(yyyy, parseInt(mm)-1, 1);
            const monthName = date.toLocaleString('es-ES', { month: 'long' });
            opt.textContent = \`\${monthName.charAt(0).toUpperCase() + monthName.slice(1)} \${yyyy}\`;
            // Add a dot if the month exists in byMonth and has data
            if (byMonth[m]) {
                opt.textContent += ' •';
            }
            if (m === currentMonth) opt.selected = true;
            monthSelect.appendChild(opt);
        });
    }
    
    function updateMonthUI() {
        populateMonthSelect();
        document.querySelectorAll('.dashboard-subtitle').forEach(el => {
            if (el.textContent.includes('Overview') || el.textContent.includes('Summary') || el.textContent.includes('Monthly') || el.textContent.includes('Estado de pago') || el.textContent.includes('Financial Notes')) {
                const [yyyy, mm] = currentMonth.split('-');
                const date = new Date(yyyy, parseInt(mm)-1, 1);
                const monthName = date.toLocaleString('es-ES', { month: 'long' });
                el.textContent = \`\${monthName.charAt(0).toUpperCase() + monthName.slice(1)} \${yyyy}\`;
            }
        });
    }

    if (monthSelect) {
        monthSelect.addEventListener('change', (e) => {
            switchMonth(e.target.value);
        });
    }
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            let [yyyy, mm] = currentMonth.split('-');
            let d = new Date(yyyy, parseInt(mm)-2, 1);
            switchMonth(\`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2, '0')}\`);
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            let [yyyy, mm] = currentMonth.split('-');
            let d = new Date(yyyy, parseInt(mm), 1);
            switchMonth(\`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2, '0')}\`);
        });
    }
    if (todayMonthBtn) {
        todayMonthBtn.addEventListener('click', () => {
            switchMonth(getCurrentYYYYMM());
        });
    }
    
    const resetMonthBtn = document.getElementById('resetMonthBtn');
    if (resetMonthBtn) {
        resetMonthBtn.addEventListener('click', () => {
            if(confirm('¿Estás seguro de restablecer este mes a la plantilla base? Esto borrará los datos actuales solo de ESTE mes.')) {
                byMonth[currentMonth] = {
                    categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
                    extra: JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA))
                };
                saveByMonth();
                switchMonth(currentMonth);
            }
        });
    }
`;
    content = content.replace("function init() {", month_logic + "\n    function init() {\n        ensureAppExtraDefaults();");
    
    content = content.replace("init();\n    populateCompositionDropdowns();", "switchMonth(currentMonth);\n    // populateCompositionDropdowns();");

    // Add distribucionGraph
    const dist_graph_logic = `
    function renderDistribucionGraph() {
        const graphContainer = document.getElementById('distribucionGraph');
        if (!graphContainer) return;
        graphContainer.innerHTML = '';
        
        const currentYear = currentMonth.split('-')[0];
        const months = Array.from({length: 12}, (_, i) => \`\${currentYear}-\${String(i+1).padStart(2, '0')}\`);
        
        // Find top level categories
        const topLevel = categories.filter(c => c.parentId === null);
        
        let maxTotal = 1; // avoid division by zero
        const monthTotals = months.map(m => {
            const mData = byMonth[m];
            if (!mData || !mData.categories) return 0;
            const inc = mData.categories.find(c => c.id === 'sueldo');
            let income = 0;
            if (inc) {
                const hasChildren = mData.categories.some(c => c.parentId === 'sueldo');
                income = hasChildren ? mData.categories.filter(c => c.parentId === 'sueldo').reduce((sum, c) => sum + (c.budgeted || 0), 0) : (inc.budgeted || 0);
            }
            if (income > maxTotal) maxTotal = income;
            return income;
        });

        const toggleMode = document.getElementById('distGraphToggle') ? document.getElementById('distGraphToggle').checked : false; // false = $, true = %
        
        months.forEach((m, idx) => {
            const col = document.createElement('div');
            col.className = 'dist-graph-col';
            
            const isFuture = m > getCurrentYYYYMM();
            if (isFuture) col.style.opacity = '0.5';
            
            const mData = byMonth[m];
            const barWrap = document.createElement('div');
            barWrap.className = 'dist-bar-wrap';
            
            if (mData && mData.categories) {
                const inc = mData.categories.find(c => c.id === 'sueldo');
                let income = 0;
                if (inc) {
                    const hasChildren = mData.categories.some(c => c.parentId === 'sueldo');
                    income = hasChildren ? mData.categories.filter(c => c.parentId === 'sueldo').reduce((sum, c) => sum + (c.budgeted || 0), 0) : (inc.budgeted || 0);
                }
                
                const expCats = mData.categories.filter(c => c.id !== 'sueldo' && c.parentId === null);
                let currentHeight = 0;
                
                expCats.forEach(cat => {
                    const val = cat.budgeted || 0;
                    if (val > 0) {
                        const segment = document.createElement('div');
                        segment.className = 'dist-bar-segment';
                        // Get color
                        const color = colorMap[cat.id] ? colorMap[cat.id].parent : '#ccc';
                        segment.style.backgroundColor = color;
                        
                        let pct = income > 0 ? (val / income) * 100 : 0;
                        if (toggleMode) {
                            segment.style.height = \`\${pct}%\`;
                        } else {
                            const hPct = (val / maxTotal) * 100;
                            segment.style.height = \`\${hPct}%\`;
                        }
                        segment.title = \`\${cat.name}: $\${formatCurrency(val)}\`;
                        barWrap.appendChild(segment);
                    }
                });
            }
            
            const label = document.createElement('div');
            label.className = 'dist-bar-label';
            const date = new Date(currentYear, idx, 1);
            label.textContent = date.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
            
            col.appendChild(barWrap);
            col.appendChild(label);
            graphContainer.appendChild(col);
        });
    }
`;
    content = content.replace("function renderDistribucionFromData() {", dist_graph_logic + "\n    function renderDistribucionFromData() {\n        renderDistribucionGraph();");
    
    // Wire up the toggle
    content = content.replace("function renderDistribucionFromData() {", "document.getElementById('distGraphToggle')?.addEventListener('change', renderDistribucionGraph);\n    function renderDistribucionFromData() {");


    fs.writeFileSync(APP_JS_PATH, content, 'utf8');
}

function refactorIndexHtml() {
    let html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
    
    const month_sel_html = `
            <div class="month-selector-widget">
                <button id="prevMonthBtn" class="btn btn-sm btn-secondary">&lt;</button>
                <select id="globalMonthSelect" class="form-input" style="padding: 0.2rem; min-width: 130px; border-color: rgba(255,255,255,0.1); font-weight: 600;"></select>
                <button id="nextMonthBtn" class="btn btn-sm btn-secondary">&gt;</button>
                <button id="todayMonthBtn" class="btn btn-sm btn-primary">Hoy</button>
            </div>
    `;
    
    html = html.replace('<div class="mobile-logo"', `${month_sel_html}\n            <div class="mobile-logo"`);
    // Need to hide the month widget for mobile inside the desktop sidebar? No, just place it globally. 
    // Wait, the mobile header is global. But on desktop, the mobile header is hidden.
    // I should put it before dashboard layout.
    // Let's also put it in the main-column for desktop if needed. 
    // Actually, mobile-header IS hidden on desktop. Let's put a copy in dashboard-header of each or just one fixed at the top right of the whole app.
    
    // Instead of replacing mobile-logo, let's inject a global top bar before dashboard-layout.
    const global_bar_html = `
        <div class="global-top-bar" style="position: absolute; top: 10px; right: 20px; z-index: 100;">
${month_sel_html}
        </div>
    `;
    html = html.replace('<main class="dashboard-layout">', `${global_bar_html}\n        <main class="dashboard-layout">`);
    
    const dist_ui = `
                <div class="card" style="margin-bottom: 1rem;">
                    <div class="card-header-flex">
                        <h2 class="card-title">Distribución Anual</h2>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <label style="font-size: 0.8rem; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                                $ Monto 
                                <input type="checkbox" id="distGraphToggle" style="transform: scale(1.2);"> 
                                % Dist
                            </label>
                            <button id="resetMonthBtn" class="btn btn-sm btn-secondary" style="color:var(--color-danger); margin-left: 10px;">Restablecer Mes</button>
                        </div>
                    </div>
                    <div id="distribucionGraph" class="dist-graph-container"></div>
                </div>
    `;
    html = html.replace('<div class="dist-grid">', `${dist_ui}\n                <div class="dist-grid">`);
    
    fs.writeFileSync(INDEX_HTML_PATH, html, 'utf8');
}

function refactorStyleCss() {
    let css = fs.readFileSync(STYLE_CSS_PATH, 'utf8');
    css += `
/* Month Selector */
.month-selector-widget {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--bg-card);
    padding: 0.35rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.month-selector-widget select {
    background: var(--bg-body);
    border: 1px solid var(--border-color);
    color: var(--color-text);
    border-radius: 4px;
    outline: none;
}

/* Distribution Graph */
.dist-graph-container {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    height: 250px;
    padding: 1rem 0;
    gap: 0.5rem;
    border-bottom: 1px solid var(--border-color);
}
.dist-graph-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    height: 100%;
}
.dist-bar-wrap {
    flex: 1;
    width: 100%;
    max-width: 40px;
    background: rgba(255,255,255,0.03);
    border-radius: 4px 4px 0 0;
    display: flex;
    flex-direction: column-reverse;
    overflow: hidden;
    margin-bottom: 0.5rem;
}
.dist-bar-segment {
    width: 100%;
    transition: height 0.3s ease;
}
.dist-bar-segment:hover {
    filter: brightness(1.2);
}
.dist-bar-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-weight: 600;
}
`;
    fs.writeFileSync(STYLE_CSS_PATH, css, 'utf8');
}

refactorAppJs();
refactorIndexHtml();
refactorStyleCss();
console.log('Refactoring JS complete.');
