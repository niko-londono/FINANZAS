import os
import re

APP_JS_PATH = r"d:\NIKO\PROYECTOS-WEB-APP\REPOS\FINANZAS\src\js\app.js"
INDEX_HTML_PATH = r"d:\NIKO\PROYECTOS-WEB-APP\REPOS\FINANZAS\index.html"
STYLE_CSS_PATH = r"d:\NIKO\PROYECTOS-WEB-APP\REPOS\FINANZAS\src\css\style.css"

def refactor_app_js():
    with open(APP_JS_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Replace the state initialization
    old_state_init = """    let categories = JSON.parse(safeStorage.get('budget_categories')) || DEFAULT_CATEGORIES;
    let collapsedCategories = new Set(JSON.parse(safeStorage.get('collapsed_categories')) || []);
    const tbody = document.getElementById('budgetTableBody');"""

    new_state_init = """    // --- MONTHLY STATE ---
    function getCurrentYYYYMM() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
    }
"""
    content = content.replace(old_state_init, new_state_init)

    # 2. Replace appExtra init
    old_app_extra_init = """    let appExtra = JSON.parse(safeStorage.get('app_extra_data')) || JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA));
    // Fill in any missing keys (in case of partial old data)
    if (!appExtra.summaryTables) appExtra.summaryTables = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.summaryTables));
    if (!appExtra.distribucion) appExtra.distribucion = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.distribucion));
    if (!appExtra.tarjetas) appExtra.tarjetas = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.tarjetas));
    if (!appExtra.notes) appExtra.notes = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.notes));"""
    
    new_app_extra_init = """    // Initial load logic moved to init/switchMonth
    function ensureAppExtraDefaults() {
        if (!appExtra) appExtra = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA));
        if (!appExtra.summaryTables) appExtra.summaryTables = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.summaryTables));
        if (!appExtra.distribucion) appExtra.distribucion = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.distribucion));
        if (!appExtra.tarjetas) appExtra.tarjetas = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.tarjetas));
        if (!appExtra.notes) appExtra.notes = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.notes));
    }
"""
    content = content.replace(old_app_extra_init, new_app_extra_init)

    # 3. Fix save functions
    content = content.replace(
        "safeStorage.set('app_extra_data', JSON.stringify(appExtra));",
        "saveByMonth();"
    )
    content = content.replace(
        "safeStorage.set('budget_categories', JSON.stringify(categories));",
        "saveByMonth();"
    )

    # 4. Fix loadFromGAS and saveToGAS
    old_savetogas = """    async function saveToGAS() {
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
    }"""
    
    new_savetogas = """    async function saveToGAS() {
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
    }"""
    content = content.replace(old_savetogas, new_savetogas)

    old_loadfromgas_logic = """            // Support both legacy format (array of categories) and new combined format
            let loadedCategories = null;
            let loadedExtra = null;
            if (Array.isArray(data)) {
                loadedCategories = data;
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data.categories)) loadedCategories = data.categories;
                if (data.extra && typeof data.extra === 'object') loadedExtra = data.extra;
            }"""
            
    new_loadfromgas_logic = """            let loadedByMonth = data.byMonth;
            if (loadedByMonth) {
                // Merge logic could be complex, for now we assume cloud is truth if it has data
                byMonth = loadedByMonth;
                safeStorage.set('budget_by_month', JSON.stringify(byMonth));
                switchMonth(currentMonth);
                updateDbStatus('connected');
                return;
            }"""
    content = content.replace(old_loadfromgas_logic, new_loadfromgas_logic)

    # Fix the rest of loadFromGAS that relies on loadedCategories
    # A bit hacky, we will just completely rewrite loadFromGAS if needed.
    # Actually it's easier to regex replace loadFromGAS entirely.
    
    loadfromgas_pattern = re.compile(r"async function loadFromGAS\(\) \{.*?\}\s*\} catch \(err\) \{.*?\}\s*\}", re.DOTALL)
    new_loadfromgas_full = """async function loadFromGAS() {
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
    }"""
    content = loadfromgas_pattern.sub(new_loadfromgas_full, content)

    # 5. Add Month UI Logic
    month_logic = """
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
            opt.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${yyyy}`;
            if (m === currentMonth) opt.selected = true;
            monthSelect.appendChild(opt);
        });
    }
    
    function updateMonthUI() {
        populateMonthSelect();
        document.querySelectorAll('.dashboard-subtitle').forEach(el => {
            if (el.textContent.includes('Overview') || el.textContent.includes('Summary') || el.textContent.includes('Monthly')) {
                const [yyyy, mm] = currentMonth.split('-');
                const date = new Date(yyyy, parseInt(mm)-1, 1);
                const monthName = date.toLocaleString('es-ES', { month: 'long' });
                el.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${yyyy}`;
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
            switchMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`);
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            let [yyyy, mm] = currentMonth.split('-');
            let d = new Date(yyyy, parseInt(mm), 1);
            switchMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`);
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
"""
    content = content.replace("function init() {", month_logic + "\n    function init() {\n        ensureAppExtraDefaults();")

    # Change the initial call to switchMonth instead of just init
    content = content.replace("init();\n    populateCompositionDropdowns();", "switchMonth(currentMonth);\n    // populateCompositionDropdowns();")

    # Re-write the Distribución Graph Logic (add a canvas/div renderer for 12 months)
    dist_graph_logic = """
    function renderDistribucionGraph() {
        const graphContainer = document.getElementById('distribucionGraph');
        if (!graphContainer) return;
        graphContainer.innerHTML = '';
        
        const currentYear = currentMonth.split('-')[0];
        const months = Array.from({length: 12}, (_, i) => `${currentYear}-${String(i+1).padStart(2, '0')}`);
        
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
                            segment.style.height = `${pct}%`;
                        } else {
                            const hPct = (val / maxTotal) * 100;
                            segment.style.height = `${hPct}%`;
                        }
                        segment.title = `${cat.name}: $${formatCurrency(val)}`;
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
"""
    content = content.replace("function renderDistribucionFromData() {", dist_graph_logic + "\n    function renderDistribucionFromData() {\n        renderDistribucionGraph();")

    with open(APP_JS_PATH, "w", encoding="utf-8") as f:
        f.write(content)


def refactor_index_html():
    with open(INDEX_HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()
    
    # 1. Add month selector to mobile header
    month_sel_html = """
            <div class="month-selector-widget">
                <button id="prevMonthBtn" class="btn btn-sm btn-secondary">&lt;</button>
                <select id="globalMonthSelect" class="form-input" style="padding: 0.2rem; min-width: 130px;"></select>
                <button id="nextMonthBtn" class="btn btn-sm btn-secondary">&gt;</button>
                <button id="todayMonthBtn" class="btn btn-sm btn-primary">Hoy</button>
            </div>
    """
    
    html = html.replace('<div class="mobile-logo"', f'{month_sel_html}\n            <div class="mobile-logo"')

    # 2. Add Distribucion Graph UI
    dist_ui = """
                <div class="card" style="margin-bottom: 1rem;">
                    <div class="card-header-flex">
                        <h2 class="card-title">Distribución Anual</h2>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <label style="font-size: 0.8rem; font-weight: bold;">
                                $ Monto 
                                <input type="checkbox" id="distGraphToggle"> 
                                % Dist
                            </label>
                            <button id="resetMonthBtn" class="btn btn-sm btn-secondary" style="color:var(--color-danger)">Restablecer Mes</button>
                        </div>
                    </div>
                    <div id="distribucionGraph" class="dist-graph-container"></div>
                </div>
    """
    html = html.replace('<div class="dist-grid">', f'{dist_ui}\n                <div class="dist-grid">')

    with open(INDEX_HTML_PATH, "w", encoding="utf-8") as f:
        f.write(html)

def refactor_style_css():
    with open(STYLE_CSS_PATH, "a", encoding="utf-8") as f:
        f.write('''
/* Month Selector */
.month-selector-widget {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--bg-card);
    padding: 0.25rem;
    border-radius: 8px;
    margin-right: 1rem;
}
.month-selector-widget select {
    background: var(--bg-body);
    border: 1px solid var(--border-color);
    color: var(--color-text);
    border-radius: 4px;
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
''')

if __name__ == "__main__":
    refactor_app_js()
    refactor_index_html()
    refactor_style_css()
    print("Refactoring complete.")
