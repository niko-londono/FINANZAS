document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Sidebar Drawer Logic
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && sidebarOverlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active');
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }

    // 2. Sidebar & Bottom Navigation Active Tab Styling
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');

    const mainLayout = document.querySelector('.dashboard-layout');
    const summaryPage = document.getElementById('summaryPage');
    const distribucionPage = document.getElementById('distribucionPage');
    const tarjetasPage = document.getElementById('tarjetasPage');
    const notesPage = document.getElementById('notesPage');

    const TAB_PAGES = {
        summary: summaryPage,
        distribucion: distribucionPage,
        tarjetas: tarjetasPage,
        notes: notesPage,
    };

    function setActiveTab(tabName) {
        sidebarItems.forEach(i => {
            i.classList.toggle('active', i.getAttribute('data-tab') === tabName);
        });
        bottomNavItems.forEach(i => {
            i.classList.toggle('active', i.getAttribute('data-tab') === tabName);
        });

        // Show/hide main layout vs tab pages
        const isTabPage = TAB_PAGES.hasOwnProperty(tabName);
        if (mainLayout) mainLayout.style.display = isTabPage ? 'none' : '';
        Object.entries(TAB_PAGES).forEach(([key, el]) => {
            if (el) el.style.display = (isTabPage && key === tabName) ? '' : 'none';
        });

        console.log(`Navigating to tab: ${tabName}`);
    }

    // Status toggle (Pendiente ↔ Done) — works for both old .pendiente-toggle and new .status-toggle
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.pendiente-toggle, .status-toggle');
        if (!btn) return;
        const isDone = btn.getAttribute('data-done') === 'true';
        if (isDone) {
            btn.setAttribute('data-done', 'false');
            if (btn.classList.contains('pendiente-toggle')) {
                btn.textContent = 'PENDIENTE';
                btn.classList.remove('done');
                btn.classList.add('pendiente');
            } else {
                btn.querySelector('.status-label').textContent = 'PENDIENTE';
            }
        } else {
            btn.setAttribute('data-done', 'true');
            if (btn.classList.contains('pendiente-toggle')) {
                btn.textContent = 'DONE';
                btn.classList.remove('pendiente');
                btn.classList.add('done');
            } else {
                btn.querySelector('.status-label').textContent = 'DONE';
            }
        }

        // Persist if this toggle belongs to a Distribución card
        const distCard = btn.closest('.dist-card[data-dist-key]');
        if (distCard) persistDistCardToggle(distCard);
    });

    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.getAttribute('data-tab');
            setActiveTab(tabName);
        });
    });

    bottomNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.getAttribute('data-tab');
            setActiveTab(tabName);
        });
    });

    // 3. Dynamic Budget Dashboard Logic
    const DEFAULT_CATEGORIES = [
        { id: 'sueldo', name: 'Sueldo', budgeted: 0, parentId: null, canDelete: false },
        { id: 'carro', name: 'Carro(seguro, prest, mant)', budgeted: 0, parentId: null, canDelete: false },
        { id: 'carro-seguro', name: 'Carro(seguro)', budgeted: 0, parentId: 'carro', canDelete: true },
        { id: 'carro-prest-mant', name: 'Prests, mant', budgeted: 0, parentId: 'carro', canDelete: true },
        { id: 'viajes', name: 'Viajes/Vacaciones', budgeted: 0, parentId: null, canDelete: true },
        { id: 'gastos-m', name: 'Gastos M', budgeted: 0, parentId: null, canDelete: true },
        { id: 'casa-inversion', name: 'Casa(inversion)', budgeted: 0, parentId: null, canDelete: true }
    ];

    // Safe localStorage wrapper — prevents storage errors (privacy mode, file://, etc.)
    // from halting the entire script execution.
    const safeStorage = {
        get(key) {
            try { return localStorage.getItem(key); } catch (e) { console.warn('localStorage.getItem failed:', e); return null; }
        },
        set(key, value) {
            try { localStorage.setItem(key, value); } catch (e) { console.warn('localStorage.setItem failed:', e); }
        }
    };

    let categories = JSON.parse(safeStorage.get('budget_categories')) || DEFAULT_CATEGORIES;
    let collapsedCategories = new Set(JSON.parse(safeStorage.get('collapsed_categories')) || []);
    const tbody = document.getElementById('budgetTableBody');

    // ── Extended app data: Summary tables, Distribución composition, Tarjetas notas/status ──
    const DEFAULT_SUMMARY_ROWS = [
        { category: 'BONO VACA', amount: 34990, destino: 'GASTOS PENDIENTES' },
        { category: 'DOBLE', amount: 91567, destino: 'bolsa' },
        { category: 'NAVIDAD', amount: 128820, destino: 'deuda carro' },
        { category: 'BONO VACA', amount: 34908, destino: 'AHORRADO' },
    ];

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

    const DEFAULT_APP_EXTRA = {
        summaryTables: [
            { id: 'summary-main', title: 'Year-End Summary 2025', editable: false, rows: DEFAULT_SUMMARY_ROWS }
        ],
        distribucion: {
            qik:           { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] },
            'gastos-m-p2': { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] },
            apap:          { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] },
            'gastos-m-p1': { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] },
        },
        tarjetas: {
            'tc-contigo':  { usdDone: false, dopDone: false },
            'tc-jetblue':  { usdDone: false, dopDone: false },
            'tc-apap':     { usdDone: false, dopDone: false },
        },
        notes: DEFAULT_NOTES
    };

    let appExtra = JSON.parse(safeStorage.get('app_extra_data')) || JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA));
    // Fill in any missing keys (in case of partial old data)
    if (!appExtra.summaryTables) appExtra.summaryTables = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.summaryTables));
    if (!appExtra.distribucion) appExtra.distribucion = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.distribucion));
    if (!appExtra.tarjetas) appExtra.tarjetas = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.tarjetas));
    if (!appExtra.notes) appExtra.notes = JSON.parse(JSON.stringify(DEFAULT_APP_EXTRA.notes));

    // Migration: the original (non-editable) summary table used to default to the
    // title "Year-End Summary" — rename it to "Year-End Summary 2025" if still default.
    const mainSummaryTable = appExtra.summaryTables.find(t => t.id === 'summary-main');
    if (mainSummaryTable && mainSummaryTable.title === 'Year-End Summary') {
        mainSummaryTable.title = 'Year-End Summary 2025';
    }

    // Migration: distribucion used to store plain arrays per key; now it's {pendingDone, rows}.
    if (appExtra.distribucion) {
        Object.keys(appExtra.distribucion).forEach(key => {
            const val = appExtra.distribucion[key];
            if (Array.isArray(val)) {
                appExtra.distribucion[key] = { pendingDone: false, rows: val };
            } else if (val && typeof val === 'object' && !Array.isArray(val.rows)) {
                val.rows = val.rows || [{ catId: '', subId: '', amount: 0 }];
                val.pendingDone = val.pendingDone || false;
            }
        });
    }

    // Persist current appExtra to localStorage immediately on startup
    // so it's always available on page reload, even before GAS responds.
    safeStorage.set('app_extra_data', JSON.stringify(appExtra));

    function saveAppExtra() {
        appExtra.lastSaved = Date.now();
        safeStorage.set('app_extra_data', JSON.stringify(appExtra));
        saveExtraToGAS();
    }

    // Google Apps Script integration state
    let gasApiUrl = safeStorage.get('gas_api_url');
    if (gasApiUrl === null) {
        gasApiUrl = 'https://script.google.com/macros/s/AKfycbzkqT6M_wM2b8ZTAua5O-DvS6nOs5MeKy-9qdUcNBWrJVh8si8VyVE2fUl6YSWomPnRCw/exec';
        safeStorage.set('gas_api_url', gasApiUrl);
    }

    function saveCategories() {
        safeStorage.set('budget_categories', JSON.stringify(categories));
        saveToGAS();
    }

    function updateDbStatus(status) {
        const btns = document.querySelectorAll('.db-status-btn');
        btns.forEach(btn => {
            // Remove previous statuses
            btn.classList.remove('offline', 'connected', 'syncing', 'error');
            btn.classList.add(status);
            
            if (status === 'connected') {
                btn.title = 'Conectado a Google Sheets';
            } else if (status === 'offline') {
                btn.title = 'Modo Local (Sin base de datos)';
            } else if (status === 'syncing') {
                btn.title = 'Sincronizando con Google Sheets...';
            } else if (status === 'error') {
                btn.title = 'Error de conexión con Apps Script';
            }
        });
    }

    async function loadFromGAS() {
        if (!gasApiUrl) {
            updateDbStatus('offline');
            return;
        }
        updateDbStatus('syncing');
        try {
            const response = await fetch(gasApiUrl);
            if (!response.ok) throw new Error('Response status ' + response.status);
            const data = await response.json();

            // Support both legacy format (array of categories) and new combined format
            let loadedCategories = null;
            let loadedExtra = null;
            if (Array.isArray(data)) {
                loadedCategories = data;
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data.categories)) loadedCategories = data.categories;
                if (data.extra && typeof data.extra === 'object') loadedExtra = data.extra;
            }

            if (loadedCategories && loadedCategories.length > 0) {
                categories = loadedCategories;
                safeStorage.set('budget_categories', JSON.stringify(categories));
            }
            if (loadedExtra) {
                // Only replace local appExtra with GAS version if GAS is newer,
                // so local changes made since last sync aren't lost on page reload.
                const localTimestamp = appExtra.lastSaved || 0;
                const gasTimestamp = loadedExtra.lastSaved || 0;
                if (gasTimestamp >= localTimestamp) {
                    appExtra = loadedExtra;
                    safeStorage.set('app_extra_data', JSON.stringify(appExtra));
                }
                // If local is newer, GAS is stale — push local version up to GAS
                if (localTimestamp > gasTimestamp) {
                    saveToGAS();
                }
            }

            if (loadedCategories || loadedExtra) {
                updateDbStatus('connected');
                // Re-render table and metrics inline
                if (tbody) tbody.innerHTML = generateTableRowsHTML();
                updateMetrics();
                populateParentSelect();
                populateCompositionDropdowns();
                renderSummaryTablesFromData();
                renderDistribucionFromData();
                renderTarjetasFromData();
                renderNotes();
                renderTimeline();
            } else {
                updateDbStatus('connected');
                saveToGAS(); // upload current localStorage defaults if cloud is empty
            }
        } catch (err) {
            console.error('Failed to load from Apps Script:', err);
            updateDbStatus('error');
        }
    }

    async function saveToGAS() {
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
    }

    // Save just the extra data (debounced lightly by reusing saveToGAS's combined payload)
    let extraSaveTimeout = null;
    function saveExtraToGAS() {
        clearTimeout(extraSaveTimeout);
        extraSaveTimeout = setTimeout(() => {
            saveToGAS();
        }, 400);
    }

    // Pastel color palette for top-level categories
    const CATEGORY_COLORS = [
        { parent: 'rgba(99, 179, 237, 0.18)',  child: 'rgba(99, 179, 237, 0.07)'  },  // blue
        { parent: 'rgba(104, 211, 145, 0.18)', child: 'rgba(104, 211, 145, 0.07)' },  // green
        { parent: 'rgba(246, 173, 85, 0.18)',  child: 'rgba(246, 173, 85, 0.07)'  },  // amber
        { parent: 'rgba(183, 148, 244, 0.18)', child: 'rgba(183, 148, 244, 0.07)' },  // purple
        { parent: 'rgba(252, 129, 129, 0.18)', child: 'rgba(252, 129, 129, 0.07)' },  // red-pink
        { parent: 'rgba(99, 218, 211, 0.18)',  child: 'rgba(99, 218, 211, 0.07)'  },  // teal
        { parent: 'rgba(246, 135, 179, 0.18)', child: 'rgba(246, 135, 179, 0.07)' },  // pink
        { parent: 'rgba(154, 205, 116, 0.18)', child: 'rgba(154, 205, 116, 0.07)' },  // lime
    ];

    // Build a stable color index map keyed by root category id
    let colorMap = {};
    function rebuildColorMap() {
        colorMap = {};
        const topLevel = categories.filter(c => c.parentId === null);
        topLevel.forEach((cat, idx) => {
            colorMap[cat.id] = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
        });
    }

    // Get the color for a given category (finds its root ancestor)
    function getCategoryColor(cat, isChild) {
        let rootId = cat.id;
        let current = cat;
        while (current.parentId) {
            rootId = current.parentId;
            current = categories.find(c => c.id === current.parentId) || current;
        }
        // Sueldo root itself: no background (stays white)
        if (rootId === 'sueldo' && !isChild) return null;
        const colors = colorMap[rootId];
        if (!colors) return null;
        return isChild ? colors.child : colors.parent;
    }

    function formatCurrency(val) {
        return Number(val).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Parse a formatted string like "12,853.50" back to a number
    function parseCurrency(str) {
        if (typeof str === 'number') return str;
        if (!str) return 0;
        // Remove everything except digits, dots, and minus signs
        const cleaned = String(str).replace(/[^0-9.\-]/g, '');
        return parseFloat(cleaned) || 0;
    }

    // Get the sum of all direct children's budgeted values (recursively for nested children)
    function getChildrenSum(catId) {
        const children = categories.filter(c => c.parentId === catId);
        return children.reduce((sum, child) => {
            return sum + (child.budgeted || 0);
        }, 0);
    }

    // Build virtual "Difference" subcategories for every parent category that has children.
    // These represent (parent.budgeted - sum of children) and behave like a real subcategory
    // so they can be selected in Distribución → Composición, but they are never written
    // back into `categories` (they're purely derived/read-only).
    function getVirtualCategories() {
        const virtuals = [];
        categories.forEach(cat => {
            const hasChildren = categories.some(c => c.parentId === cat.id);
            if (hasChildren) {
                const childrenSum = getChildrenSum(cat.id);
                const diff = (cat.budgeted || 0) - childrenSum;
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

    // categories + virtual Difference entries, used anywhere a full selectable list is needed
    function getCategoriesWithVirtuals() {
        return categories.concat(getVirtualCategories());
    }

    function renderCategoryRow(cat, depth) {
        const isParent = categories.some(c => c.parentId === cat.id);
        const isCollapsed = collapsedCategories.has(cat.id);
        
        // Check if any ancestor is collapsed to hide this row
        let isHidden = false;
        let currentParentId = cat.parentId;
        while (currentParentId) {
            if (collapsedCategories.has(currentParentId)) {
                isHidden = true;
                break;
            }
            const parent = categories.find(c => c.id === currentParentId);
            currentParentId = parent ? parent.parentId : null;
        }
        
        const rowClass = `depth-${depth} ${isParent ? 'parent-row' : 'child-row'} ${isHidden ? 'collapsed-row' : ''}`;
        
        // Row background color
        const isChild = depth > 0 || cat.parentId !== null;
        const bgColor = getCategoryColor(cat, isChild);
        const rowStyle = bgColor ? `style="background-color: ${bgColor};"` : '';
        
        // Toggle arrow HTML
        let toggleArrowHTML = '';
        if (isParent) {
            const expandedClass = isCollapsed ? '' : 'expanded';
            toggleArrowHTML = `
                <button class="toggle-arrow ${expandedClass}" aria-label="Toggle ${cat.name}" data-toggle-id="${cat.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            `;
        } else {
            toggleArrowHTML = `
                <button class="toggle-arrow" disabled style="opacity: 0; pointer-events: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            `;
        }
        
        // Delete button HTML
        let deleteBtnHTML = '';
        if (cat.canDelete && cat.id !== 'sueldo') {
            deleteBtnHTML = `
                <button class="delete-category-btn" title="Eliminar Categoría" data-delete-id="${cat.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
        }

        // Category name as editable input (except Sueldo Cuadre which is rendered separately)
        const nameHTML = `<input type="text" class="category-name-input" value="${cat.name}" data-name-id="${cat.id}" autocomplete="off">`;
        
        // Budget cell HTML - ALL categories (parent or child) get editable inputs
        const budgetCellHTML = `
            <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; margin-right: 2px;">$</span>
                <input type="text" class="budget-input" value="${formatCurrency(cat.budgeted || 0)}" data-input-id="${cat.id}" inputmode="decimal">
            </div>
        `;
        
        // Difference cell content
        let differenceCellHTML = '';
        if (isParent) {
            // Parent: Difference = Parent Budget - Sum of Children
            const childrenSum = getChildrenSum(cat.id);
            const diff = (cat.budgeted || 0) - childrenSum;
            let diffStyle = '';
            if (diff >= 0) {
                diffStyle = 'color: var(--color-success); font-weight: 700;';
            } else {
                diffStyle = 'color: var(--color-danger); font-weight: 700;';
            }
            const formattedDiff = diff >= 0 ? `$${formatCurrency(diff)}` : `-$${formatCurrency(Math.abs(diff))}`;
            differenceCellHTML = `<span class="value-amount" style="${diffStyle}">${formattedDiff}</span>`;
        } else {
            // Leaf categories: show dash
            differenceCellHTML = '<span style="color: var(--color-text-light);">-</span>';
        }
        
        return `
            <tr class="${rowClass}" data-row-id="${cat.id}" ${rowStyle}>
                <td>
                    <div class="cat-cell">
                        ${toggleArrowHTML}
                        ${nameHTML}
                        ${deleteBtnHTML}
                    </div>
                </td>
                <td>
                    <div class="value-container">
                        ${budgetCellHTML}
                    </div>
                </td>
                <td>
                    <div class="value-container">
                        ${differenceCellHTML}
                    </div>
                </td>
            </tr>
        `;
    }

    function renderSueldoCuadreRow() {
        const sueldoCat = categories.find(c => c.id === 'sueldo');
        const totalIncome = sueldoCat ? sueldoCat.budgeted : 0;
        
        // Budgeted(Sueldo Cuadre) = Sum of all other top-level categories' budgets
        const otherCategories = categories.filter(c => c.id !== 'sueldo' && c.parentId === null);
        const budgetedExpenses = otherCategories.reduce((sum, cat) => sum + (cat.budgeted || 0), 0);
        
        const difference = totalIncome - budgetedExpenses;
        
        let diffStyle = '';
        if (difference > 0) diffStyle = 'color: var(--color-success); font-weight: 700;';
        else if (difference < 0) diffStyle = 'color: var(--color-danger); font-weight: 700;';
        else diffStyle = 'color: var(--color-success); font-weight: 700;';
        
        const formattedDiff = difference >= 0 ? `$${formatCurrency(difference)}` : `-$${formatCurrency(Math.abs(difference))}`;
        
        return `
            <tr class="depth-0 parent-row" data-row-id="sueldo-cuadre">
                <td>
                    <div class="cat-cell" style="font-weight: 600;">
                        <!-- No toggle arrow -->
                        <span style="padding-left: 24px;">Sueldo Cuadre</span>
                    </div>
                </td>
                <td>
                    <div class="value-container">
                        <span class="value-amount" style="font-weight: 600;">$${formatCurrency(budgetedExpenses)}</span>
                    </div>
                </td>
                <td>
                    <div class="value-container">
                        <span class="value-amount" style="${diffStyle}">${formattedDiff}</span>
                    </div>
                </td>
            </tr>
        `;
    }

    function generateTableRowsHTML() {
        let html = '';
        
        // Rebuild color map so colors are stable by root category order
        rebuildColorMap();
        
        // Find top-level items
        const topLevel = categories.filter(c => c.parentId === null);
        
        function renderTree(list, depth) {
            list.forEach(cat => {
                if (cat.id === 'sueldo-cuadre') return;
                
                html += renderCategoryRow(cat, depth);
                
                const children = categories.filter(c => c.parentId === cat.id);
                if (children.length > 0) {
                    renderTree(children, depth + 1);
                }
            });
        }
        
        // Income (Sueldo) always at the top, with its children
        const sueldoCat = categories.find(c => c.id === 'sueldo');
        if (sueldoCat) {
            html += renderCategoryRow(sueldoCat, 0);
            const sueldoChildren = categories.filter(c => c.parentId === 'sueldo');
            if (sueldoChildren.length > 0) {
                renderTree(sueldoChildren, 1);
            }
        }
        
        // Other top-level categories (excluding Sueldo)
        const otherTopLevel = topLevel.filter(c => c.id !== 'sueldo');
        renderTree(otherTopLevel, 0);
        
        // Sueldo Cuadre row at the end
        html += renderSueldoCuadreRow();
        
        return html;
    }

    function updateMetrics() {
        const sueldoCat = categories.find(c => c.id === 'sueldo');
        // Total income = budgeted value of Sueldo (or sum of its children if it has any)
        const sueldoIsParent = categories.some(c => c.parentId === 'sueldo');
        const totalIncome = sueldoCat ? (sueldoIsParent ? getChildrenSum('sueldo') : (sueldoCat.budgeted || 0)) : 0;
        
        const otherCategories = categories.filter(c => c.id !== 'sueldo' && c.parentId === null);
        const totalExpenses = otherCategories.reduce((sum, cat) => sum + (cat.budgeted || 0), 0);
        
        const balance = totalIncome - totalExpenses;
        
        // Update Total Income display (read-only)
        const totalIncomeVal = document.getElementById('totalIncomeVal');
        if (totalIncomeVal) {
            totalIncomeVal.textContent = `$${formatCurrency(totalIncome)}`;
        }
        
        const totalExpensesVal = document.getElementById('totalExpensesVal');
        if (totalExpensesVal) {
            totalExpensesVal.textContent = `$${formatCurrency(totalExpenses)}`;
        }
        
        const remainingBalanceVal = document.getElementById('remainingBalanceVal');
        if (remainingBalanceVal) {
            remainingBalanceVal.textContent = `$${formatCurrency(balance)}`;
            if (balance >= 0) {
                remainingBalanceVal.style.color = 'var(--color-success)';
            } else {
                remainingBalanceVal.style.color = 'var(--color-danger)';
            }
        }
    }

    function updateCalculationsInline() {
        // 1. Update parent difference values in table
        categories.forEach(cat => {
            const isParent = categories.some(c => c.parentId === cat.id);
            if (isParent) {
                const row = document.querySelector(`[data-row-id="${cat.id}"]`);
                if (row) {
                    const diffSpan = row.querySelector('td:nth-child(3) .value-amount');
                    if (diffSpan) {
                        const childrenSum = getChildrenSum(cat.id);
                        const diff = (cat.budgeted || 0) - childrenSum;
                        const formattedDiff = diff >= 0 ? `$${formatCurrency(diff)}` : `-$${formatCurrency(Math.abs(diff))}`;
                        diffSpan.textContent = formattedDiff;
                        if (diff >= 0) {
                            diffSpan.style.color = 'var(--color-success)';
                            diffSpan.style.fontWeight = '700';
                        } else {
                            diffSpan.style.color = 'var(--color-danger)';
                            diffSpan.style.fontWeight = '700';
                        }
                    }
                }
            }
        });
        
        // 2. Update Sueldo Cuadre row
        const sueldoCat = categories.find(c => c.id === 'sueldo');
        const sueldoIsParent = categories.some(c => c.parentId === 'sueldo');
        const totalIncome = sueldoCat ? (sueldoIsParent ? getChildrenSum('sueldo') : (sueldoCat.budgeted || 0)) : 0;
        
        const otherCategories = categories.filter(c => c.id !== 'sueldo' && c.parentId === null);
        const budgetedExpenses = otherCategories.reduce((sum, cat) => sum + (cat.budgeted || 0), 0);
        const difference = totalIncome - budgetedExpenses;
        
        const sueldoCuadreRow = document.querySelector('[data-row-id="sueldo-cuadre"]');
        if (sueldoCuadreRow) {
            const budgetedSpan = sueldoCuadreRow.querySelector('td:nth-child(2) .value-amount');
            const diffSpan = sueldoCuadreRow.querySelector('td:nth-child(3) .value-amount');
            
            if (budgetedSpan) budgetedSpan.textContent = `$${formatCurrency(budgetedExpenses)}`;
            if (diffSpan) {
                const formattedDiff = difference >= 0 ? `$${formatCurrency(difference)}` : `-$${formatCurrency(Math.abs(difference))}`;
                diffSpan.textContent = formattedDiff;
                diffSpan.className = 'value-amount';
                if (difference > 0) {
                    diffSpan.style.color = 'var(--color-success)';
                    diffSpan.style.fontWeight = '700';
                } else if (difference < 0) {
                    diffSpan.style.color = 'var(--color-danger)';
                    diffSpan.style.fontWeight = '700';
                } else {
                    diffSpan.style.color = 'var(--color-success)';
                    diffSpan.style.fontWeight = '700';
                }
            }
        }
        
        // 3. Update top metrics
        updateMetrics();
    }

    let hasLoadedFromCloud = false;

    function init() {
        if (!tbody) return;
        tbody.innerHTML = generateTableRowsHTML();
        updateMetrics();
        populateParentSelect();
        renderNotes();
        renderTimeline();
        
        if (!hasLoadedFromCloud) {
            hasLoadedFromCloud = true;
            loadFromGAS();
        }
    }

    // Event Delegations
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            // Toggle arrow click
            const toggleBtn = e.target.closest('.toggle-arrow');
            if (toggleBtn && !toggleBtn.disabled) {
                const id = toggleBtn.getAttribute('data-toggle-id');
                if (id) {
                    const isCollapsed = collapsedCategories.has(id);
                    if (isCollapsed) {
                        collapsedCategories.delete(id);
                    } else {
                        collapsedCategories.add(id);
                    }
                    safeStorage.set('collapsed_categories', JSON.stringify(Array.from(collapsedCategories)));
                    tbody.innerHTML = generateTableRowsHTML();
                }
            }

            // Delete category click
            const deleteBtn = e.target.closest('.delete-category-btn');
            if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-delete-id');
                if (id && confirm('¿Estás seguro de que deseas eliminar esta categoría y todas sus subcategorías?')) {
                    deleteCategoryAndChildren(id);
                    saveCategories();
                    init();
                }
            }
        });
    }

    function deleteCategoryAndChildren(id) {
        const children = categories.filter(c => c.parentId === id);
        children.forEach(child => {
            deleteCategoryAndChildren(child.id);
        });
        categories = categories.filter(c => c.id !== id);
    }

    document.addEventListener('focus', (e) => {
        // Budget inputs in table: strip formatting on focus
        if (e.target.classList.contains('budget-input')) {
            const id = e.target.getAttribute('data-input-id');
            const cat = categories.find(c => c.id === id);
            if (cat) {
                e.target.value = cat.budgeted || 0;
            }
        }
    }, true);

    document.addEventListener('blur', (e) => {
        // Budget inputs in table: parse, save, re-format on blur
        if (e.target.classList.contains('budget-input')) {
            const id = e.target.getAttribute('data-input-id');
            const val = parseCurrency(e.target.value);
            const cat = categories.find(c => c.id === id);
            if (cat) {
                cat.budgeted = val;
                e.target.value = formatCurrency(val);
                saveCategories();
                updateCalculationsInline();
            }
        }
        // Category name input: save on blur
        if (e.target.classList.contains('category-name-input')) {
            const id = e.target.getAttribute('data-name-id');
            const newName = e.target.value.trim();
            const cat = categories.find(c => c.id === id);
            if (cat && newName && newName !== cat.name) {
                cat.name = newName;
                saveCategories();
                // Update parent select options
                populateParentSelect();
            }
        }
    }, true);

    // Live update calculations while typing in budget fields (for real-time feedback)
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('budget-input')) {
            const id = e.target.getAttribute('data-input-id');
            const val = parseCurrency(e.target.value);
            const cat = categories.find(c => c.id === id);
            if (cat) {
                cat.budgeted = val;
                // Don't save to GAS on every keystroke, but update calculations live
                safeStorage.set('budget_categories', JSON.stringify(categories));
                updateCalculationsInline();
            }
        }
    });

    // Add Category Modal Logic
    const addCategoryModal = document.getElementById('addCategoryModal');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const mobileAddCategoryBtn = document.getElementById('mobileAddCategoryBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const addCategoryForm = document.getElementById('addCategoryForm');
    const newCatParentSelect = document.getElementById('newCatParent');

    function showAddCategoryModal() {
        document.getElementById('newCatName').value = '';
        document.getElementById('newCatBudget').value = '0';
        populateParentSelect();
        addCategoryModal.classList.add('active');
        
        // Focus name input
        setTimeout(() => {
            document.getElementById('newCatName').focus();
        }, 50);
    }

    if (addCategoryBtn && addCategoryModal) {
        addCategoryBtn.addEventListener('click', showAddCategoryModal);
    }
    if (mobileAddCategoryBtn && addCategoryModal) {
        mobileAddCategoryBtn.addEventListener('click', showAddCategoryModal);
    }

    function hideModal() {
        if (addCategoryModal) {
            addCategoryModal.classList.remove('active');
        }
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);
    if (addCategoryModal) {
        addCategoryModal.addEventListener('click', (e) => {
            if (e.target === addCategoryModal) {
                hideModal();
            }
        });
    }

    function populateParentSelect() {
        if (!newCatParentSelect) return;
        const possibleParents = categories.filter(c => c.parentId === null);
        
        let optionsHTML = '<option value="">Ninguna (Nivel Superior)</option>';
        possibleParents.forEach(parent => {
            optionsHTML += `<option value="${parent.id}">${parent.name}</option>`;
        });
        
        newCatParentSelect.innerHTML = optionsHTML;
    }

    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('newCatName').value.trim();
            const budget = parseFloat(document.getElementById('newCatBudget').value) || 0;
            const parentId = newCatParentSelect.value || null;
            
            if (!name) return;
            
            const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
            
            const newCat = {
                id: id,
                name: name,
                budgeted: budget,
                parentId: parentId,
                canDelete: true
            };
            
            categories.push(newCat);
            saveCategories();
            
            hideModal();
            init();
        });
    }

    // Database Config Modal Logic
    const dbConfigModal = document.getElementById('dbConfigModal');
    const cloudSyncBtn = document.getElementById('cloudSyncBtn');
    const mobileCloudSyncBtn = document.getElementById('mobileCloudSyncBtn');
    const closeDbModalBtn = document.getElementById('closeDbModalBtn');
    const cancelDbModalBtn = document.getElementById('cancelDbModalBtn');
    const dbConfigForm = document.getElementById('dbConfigForm');
    const gasUrlInput = document.getElementById('gasUrlInput');

    function showDbModal() {
        if (gasUrlInput) gasUrlInput.value = gasApiUrl;
        if (dbConfigModal) dbConfigModal.classList.add('active');
        setTimeout(() => {
            if (gasUrlInput) gasUrlInput.focus();
        }, 50);
    }

    if (cloudSyncBtn) cloudSyncBtn.addEventListener('click', showDbModal);
    if (mobileCloudSyncBtn) mobileCloudSyncBtn.addEventListener('click', showDbModal);

    function hideDbModal() {
        if (dbConfigModal) dbConfigModal.classList.remove('active');
    }

    if (closeDbModalBtn) closeDbModalBtn.addEventListener('click', hideDbModal);
    if (cancelDbModalBtn) cancelDbModalBtn.addEventListener('click', hideDbModal);
    if (dbConfigModal) {
        dbConfigModal.addEventListener('click', (e) => {
            if (e.target === dbConfigModal) {
                hideDbModal();
            }
        });
    }

    if (dbConfigForm) {
        dbConfigForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newUrl = gasUrlInput.value.trim();
            gasApiUrl = newUrl;
            safeStorage.set('gas_api_url', newUrl);
            
            hideDbModal();
            
            // Clear cloud load lock and fetch new data from the new endpoint
            hasLoadedFromCloud = false;
            init();
        });
    }

    // ══════════════════════════════════════════════════════════════════
    // DISTRIBUCIÓN: Composición rows driven by appExtra.distribucion
    // ══════════════════════════════════════════════════════════════════

    function getCategoryNameById(id) {
        const cat = categories.find(c => c.id === id);
        return cat ? cat.name : '';
    }

    function populateCatSelectOptions(selectEl, selectedValue) {
        selectEl.innerHTML = '<option value="">— Categoría —</option>';
        const topLevel = categories.filter(c => c.parentId === null);
        topLevel.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            selectEl.appendChild(opt);
        });
        selectEl.value = selectedValue || '';
    }

    function populateSubSelectOptions(selectEl, parentId, selectedValue) {
        const children = parentId ? categories.filter(c => c.parentId === parentId) : [];
        const hasDifference = parentId && children.length > 0; // only parents with real children have a Difference
        selectEl.innerHTML = '<option value="">— Subcategoría —</option>';
        if (children.length === 0) {
            selectEl.disabled = true;
        } else {
            selectEl.disabled = false;
            const todaOpt = document.createElement('option');
            todaOpt.value = '__todas__';
            todaOpt.textContent = 'Todas';
            selectEl.appendChild(todaOpt);
            children.forEach(child => {
                const opt = document.createElement('option');
                opt.value = child.id;
                opt.textContent = child.name;
                selectEl.appendChild(opt);
            });
            if (hasDifference) {
                const diffOpt = document.createElement('option');
                diffOpt.value = `${parentId}-difference`;
                diffOpt.textContent = 'Difference';
                selectEl.appendChild(diffOpt);
            }
        }
        selectEl.value = selectedValue || '';
    }

    // Compute the dollar amount represented by a single composition row's
    // selected category/subcategory (using the "budgeted" figures from Budget Overview)
    function computeRowSuggestedAmount(catId, subId) {
        if (!catId) return null;
        if (!subId) {
            const cat = categories.find(c => c.id === catId);
            return cat ? (cat.budgeted || 0) : null;
        }
        if (subId === '__todas__') {
            const children = categories.filter(c => c.parentId === catId);
            return children.reduce((sum, c) => sum + (c.budgeted || 0), 0);
        }
        if (subId === `${catId}-difference`) {
            const cat = categories.find(c => c.id === catId);
            return cat ? ((cat.budgeted || 0) - getChildrenSum(catId)) : null;
        }
        const sub = categories.find(c => c.id === subId);
        return sub ? (sub.budgeted || 0) : null;
    }

    function formatMoney(val) {
        const n = Number(val) || 0;
        return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Re-render every Distribución card's composition rows from appExtra.distribucion
    function renderDistribucionFromData() {
        const cards = document.querySelectorAll('.dist-card[data-dist-key]');
        cards.forEach(card => {
            const key = card.getAttribute('data-dist-key');
            const cardData = (appExtra.distribucion && appExtra.distribucion[key]) || { pendingDone: false, rows: [{ catId: '', subId: '', amount: 0 }] };

            // Restore composition rows
            const container = card.querySelector('.comp-rows-container');
            if (container) {
                container.innerHTML = '';
                const rowsData = cardData.rows || [{ catId: '', subId: '', amount: 0 }];
                rowsData.forEach(rowData => {
                    container.appendChild(buildCompRow(rowData));
                });
            }

            // Restore Pendiente / Done toggle state
            const toggleBtn = card.querySelector('.status-toggle');
            if (toggleBtn) {
                const isDone = !!cardData.pendingDone;
                toggleBtn.setAttribute('data-done', isDone ? 'true' : 'false');
                const label = toggleBtn.querySelector('.status-label');
                if (label) label.textContent = isDone ? 'DONE' : 'PENDIENTE';
            }

            updateDistTotal(card);
        });
    }

    // Build a single composition row element, optionally pre-filled with saved data
    function buildCompRow(rowData) {
        rowData = rowData || { catId: '', subId: '', amount: 0 };
        const row = document.createElement('div');
        row.className = 'composition-row';

        const catSel = document.createElement('select');
        catSel.className = 'comp-select';
        catSel.setAttribute('data-comp-cat', '');
        populateCatSelectOptions(catSel, rowData.catId);

        const subSel = document.createElement('select');
        subSel.className = 'comp-select';
        subSel.setAttribute('data-comp-sub', '');
        populateSubSelectOptions(subSel, rowData.catId, rowData.subId);

        const amountInput = document.createElement('input');
        amountInput.type = 'text';
        amountInput.className = 'comp-amount-input';
        amountInput.setAttribute('data-comp-amount', '');
        amountInput.placeholder = '$0.00';
        amountInput.inputMode = 'decimal';
        amountInput.value = rowData.amount ? formatCurrency(rowData.amount) : '';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'comp-remove-row';
        removeBtn.title = 'Eliminar fila';
        removeBtn.textContent = '×';

        row.appendChild(catSel);
        row.appendChild(subSel);
        row.appendChild(amountInput);
        row.appendChild(removeBtn);
        return row;
    }

    // Read all rows currently in a dist-card and persist them to appExtra
    function persistDistCard(card) {
        const key = card.getAttribute('data-dist-key');
        if (!key) return;
        const rows = card.querySelectorAll('.composition-row');
        const rowsData = Array.from(rows).map(row => {
            const catSel = row.querySelector('[data-comp-cat]');
            const subSel = row.querySelector('[data-comp-sub]');
            const amountInput = row.querySelector('[data-comp-amount]');
            return {
                catId: catSel ? catSel.value : '',
                subId: subSel ? subSel.value : '',
                amount: amountInput ? parseCurrency(amountInput.value) : 0
            };
        });
        if (!appExtra.distribucion) appExtra.distribucion = {};
        const existing = appExtra.distribucion[key] || {};
        appExtra.distribucion[key] = {
            pendingDone: existing.pendingDone || false,
            rows: rowsData
        };
        saveAppExtra();
        updateDistTotal(card);
        renderTimeline();
    }

    // Persist just the toggle state for a dist-card
    function persistDistCardToggle(card) {
        const key = card.getAttribute('data-dist-key');
        if (!key) return;
        const toggleBtn = card.querySelector('.status-toggle');
        const isDone = toggleBtn ? toggleBtn.getAttribute('data-done') === 'true' : false;
        if (!appExtra.distribucion) appExtra.distribucion = {};
        const existing = appExtra.distribucion[key] || { rows: [{ catId: '', subId: '', amount: 0 }] };
        appExtra.distribucion[key] = {
            pendingDone: isDone,
            rows: existing.rows || [{ catId: '', subId: '', amount: 0 }]
        };
        saveAppExtra();
    }

    // Sum all row amounts in a dist-card and update the total display in the top-right
    function updateDistTotal(card) {
        const totalEl = card.querySelector('[data-dist-total]');
        if (!totalEl) return;
        const rows = card.querySelectorAll('.composition-row');
        let total = 0;
        rows.forEach(row => {
            const amountInput = row.querySelector('[data-comp-amount]');
            if (amountInput) total += parseCurrency(amountInput.value);
        });
        totalEl.textContent = formatMoney(total);
    }

    // Legacy wrapper kept for any other call sites
    function populateCompositionDropdowns() {
        renderDistribucionFromData();
    }

    // Delegate: add-category row button (Distribución)
    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.comp-add-row-btn');
        if (addBtn) {
            const card = addBtn.closest('.dist-card');
            const container = card ? card.querySelector('.comp-rows-container') : null;
            if (container) {
                container.appendChild(buildCompRow());
                if (card) persistDistCard(card);
            }
        }

        // Remove a composition row
        const removeBtn = e.target.closest('.comp-remove-row');
        if (removeBtn) {
            const row = removeBtn.closest('.composition-row');
            const card = removeBtn.closest('.dist-card');
            const container = row && row.closest('.comp-rows-container');
            if (container && container.querySelectorAll('.composition-row').length > 1) {
                row.remove();
                if (card) persistDistCard(card);
            }
        }
    });

    // Delegate category select change → populate subcategory + suggest amount, then persist
    document.addEventListener('change', (e) => {
        if (e.target.hasAttribute('data-comp-cat')) {
            const row = e.target.closest('.composition-row');
            if (!row) return;
            const subSel = row.querySelector('[data-comp-sub]');
            const amountInput = row.querySelector('[data-comp-amount]');
            const parentId = e.target.value;
            if (subSel) populateSubSelectOptions(subSel, parentId, '');
            if (amountInput && parentId) {
                const suggested = computeRowSuggestedAmount(parentId, '');
                if (suggested !== null) amountInput.value = formatCurrency(suggested);
            }
            const card = e.target.closest('.dist-card');
            if (card) persistDistCard(card);
        }
        if (e.target.hasAttribute('data-comp-sub')) {
            const row = e.target.closest('.composition-row');
            if (!row) return;
            const catSel = row.querySelector('[data-comp-cat]');
            const amountInput = row.querySelector('[data-comp-amount]');
            if (amountInput && catSel) {
                const suggested = computeRowSuggestedAmount(catSel.value, e.target.value);
                if (suggested !== null) amountInput.value = formatCurrency(suggested);
            }
            const card = e.target.closest('.dist-card');
            if (card) persistDistCard(card);
        }
    });

    // Amount input: live total update + persist on blur
    document.addEventListener('input', (e) => {
        if (e.target.hasAttribute('data-comp-amount')) {
            const card = e.target.closest('.dist-card');
            if (card) updateDistTotal(card);
        }
    });
    document.addEventListener('blur', (e) => {
        if (e.target.hasAttribute('data-comp-amount')) {
            e.target.value = e.target.value ? formatCurrency(parseCurrency(e.target.value)) : '';
            const card = e.target.closest('.dist-card');
            if (card) persistDistCard(card);
        }
    }, true);


    // ══════════════════════════════════════════════════════════════════
    // SUMMARY: tables driven by appExtra.summaryTables (persisted)
    // ══════════════════════════════════════════════════════════════════

    const addSummaryTableBtn = document.getElementById('addSummaryTableBtn');
    const summaryTablesContainer = document.getElementById('summaryTablesContainer');

    function computeSummaryTotal(rows) {
        return rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    }

    function buildSummaryTableSection(tableData) {
        const section = document.createElement('section');
        section.className = 'card summary-table-card';
        section.setAttribute('data-summary-id', tableData.id);
        section.style.marginTop = '1.25rem';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'card-header-flex';

        const titleEl = document.createElement('h2');
        titleEl.className = 'card-title';
        titleEl.textContent = tableData.title;
        titleEl.contentEditable = 'true';
        titleEl.style.cssText = 'outline:none; border-bottom: 1px dashed transparent; min-width:80px;';
        titleEl.addEventListener('focus', () => {
            titleEl.style.borderBottomColor = 'var(--border-color)';
        });
        titleEl.addEventListener('blur', () => {
            tableData.title = titleEl.textContent.trim() || tableData.title;
            titleEl.textContent = tableData.title;
            titleEl.style.borderBottomColor = 'transparent';
            saveAppExtra();
        });
        headerDiv.appendChild(titleEl);

        if (tableData.editable) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-secondary btn-sm';
            removeBtn.style.cssText = 'color:var(--color-danger); border-color:var(--color-danger-bg);';
            removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Eliminar`;
            removeBtn.addEventListener('click', () => {
                appExtra.summaryTables = appExtra.summaryTables.filter(t => t.id !== tableData.id);
                saveAppExtra();
                section.remove();
            });
            headerDiv.appendChild(removeBtn);
        } else {
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'card-options';
            optionsDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>`;
            headerDiv.appendChild(optionsDiv);
        }

        section.appendChild(headerDiv);

        const table = document.createElement('table');
        table.className = 'summary-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Monto $</th>
                    <th>DESTINO</th>
                </tr>
            </thead>
        `;

        const tbodyEl = document.createElement('tbody');

        tableData.rows.forEach((rowData, idx) => {
            const tr = document.createElement('tr');

            const catTd = document.createElement('td');
            if (tableData.editable) {
                catTd.style.color = 'var(--color-text-muted)';
                catTd.textContent = rowData.category;
            } else {
                catTd.textContent = rowData.category;
            }
            tr.appendChild(catTd);

            const amountTd = document.createElement('td');
            if (tableData.editable) {
                const pillWrap = document.createElement('span');
                pillWrap.className = 'pill-amount pill-input-wrap';
                const amountInput = document.createElement('input');
                amountInput.type = 'text';
                amountInput.className = 'pill-input';
                amountInput.placeholder = '$0.00';
                amountInput.inputMode = 'decimal';
                amountInput.value = rowData.amount ? formatCurrency(rowData.amount) : '';
                amountInput.addEventListener('blur', () => {
                    const val = parseCurrency(amountInput.value);
                    rowData.amount = val;
                    amountInput.value = val ? formatCurrency(val) : '';
                    updateSummaryTableTotal(section, tableData);
                    saveAppExtra();
                });
                pillWrap.appendChild(amountInput);
                amountTd.appendChild(pillWrap);
            } else {
                const pill = document.createElement('span');
                pill.className = 'pill-amount';
                pill.textContent = formatMoney(rowData.amount);
                amountTd.appendChild(pill);
            }
            tr.appendChild(amountTd);

            const destTd = document.createElement('td');
            if (tableData.editable) {
                const pillWrap = document.createElement('span');
                pillWrap.className = 'pill-destination pill-input-wrap';
                const destInput = document.createElement('input');
                destInput.type = 'text';
                destInput.className = 'pill-input';
                destInput.placeholder = 'destino...';
                destInput.value = rowData.destino || '';
                destInput.addEventListener('blur', () => {
                    rowData.destino = destInput.value.trim();
                    saveAppExtra();
                });
                pillWrap.appendChild(destInput);
                destTd.appendChild(pillWrap);
            } else {
                const pill = document.createElement('span');
                pill.className = 'pill-destination';
                pill.textContent = rowData.destino || '';
                destTd.appendChild(pill);
            }
            tr.appendChild(destTd);

            tbodyEl.appendChild(tr);
        });

        // Total row — always read-only/calculated
        const totalTr = document.createElement('tr');
        totalTr.className = 'summary-row-total';
        const totalCatTd = document.createElement('td');
        totalCatTd.textContent = 'TOTAL';
        totalTr.appendChild(totalCatTd);

        const totalAmountTd = document.createElement('td');
        const totalPill = document.createElement('span');
        totalPill.className = 'pill-amount';
        totalPill.setAttribute('data-summary-total', '');
        totalPill.textContent = formatMoney(computeSummaryTotal(tableData.rows));
        totalAmountTd.appendChild(totalPill);
        totalTr.appendChild(totalAmountTd);

        totalTr.appendChild(document.createElement('td'));
        tbodyEl.appendChild(totalTr);

        table.appendChild(tbodyEl);
        section.appendChild(table);
        return section;
    }

    function updateSummaryTableTotal(sectionEl, tableData) {
        const totalEl = sectionEl.querySelector('[data-summary-total]');
        if (totalEl) totalEl.textContent = formatMoney(computeSummaryTotal(tableData.rows));
    }

    function renderSummaryTablesFromData() {
        if (!summaryTablesContainer) return;
        summaryTablesContainer.innerHTML = '';
        appExtra.summaryTables.forEach(tableData => {
            summaryTablesContainer.appendChild(buildSummaryTableSection(tableData));
        });
    }

    if (addSummaryTableBtn) {
        addSummaryTableBtn.addEventListener('click', () => {
            const newId = 'summary-' + Date.now();
            const tableCount = appExtra.summaryTables.length + 1;
            // Clone the row structure (categories/destinos) from the original table,
            // but with editable amounts/destinos, per spec: only the category labels carry over.
            const baseRows = (appExtra.summaryTables[0] && appExtra.summaryTables[0].rows) || DEFAULT_SUMMARY_ROWS;
            const newTableData = {
                id: newId,
                title: `Year-End Summary ${tableCount}`,
                editable: true,
                rows: baseRows.map(r => ({ category: r.category, amount: 0, destino: '' }))
            };
            appExtra.summaryTables.push(newTableData);
            saveAppExtra();

            const newSection = buildSummaryTableSection(newTableData);
            summaryTablesContainer.appendChild(newSection);
            if (typeof newSection.scrollIntoView === 'function') {
                newSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }


    // ══════════════════════════════════════════════════════════════════
    // TARJETAS: USD/DOP status toggles + notas, persisted via appExtra.tarjetas
    // ══════════════════════════════════════════════════════════════════

    function renderTarjetasFromData() {
        const rows = document.querySelectorAll('.tc-row[data-card-key]');
        rows.forEach(row => {
            const key = row.getAttribute('data-card-key');
            const cardData = (appExtra.tarjetas && appExtra.tarjetas[key]) || { usdDone: false, dopDone: false };

            const usdBtn = row.querySelector('.status-toggle[data-currency="usd"]');
            const dopBtn = row.querySelector('.status-toggle[data-currency="dop"]');

            if (usdBtn) applyStatusToggleState(usdBtn, !!cardData.usdDone);
            if (dopBtn) applyStatusToggleState(dopBtn, !!cardData.dopDone);
        });
    }

    function applyStatusToggleState(btn, isDone) {
        btn.setAttribute('data-done', isDone ? 'true' : 'false');
        const label = btn.querySelector('.status-label');
        if (label) label.textContent = isDone ? 'DONE' : 'PENDIENTE';
    }

    function persistTarjetaRow(row) {
        const key = row.getAttribute('data-card-key');
        if (!key) return;
        const usdBtn = row.querySelector('.status-toggle[data-currency="usd"]');
        const dopBtn = row.querySelector('.status-toggle[data-currency="dop"]');

        if (!appExtra.tarjetas) appExtra.tarjetas = {};
        appExtra.tarjetas[key] = {
            usdDone: usdBtn ? usdBtn.getAttribute('data-done') === 'true' : false,
            dopDone: dopBtn ? dopBtn.getAttribute('data-done') === 'true' : false
        };
        saveAppExtra();
    }

    // Status toggle persistence (Distribución/Tarjetas .status-toggle clicks already
    // flip the visual state via the listener above; here we additionally persist
    // Tarjetas-specific toggles to appExtra.tarjetas)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.status-toggle[data-currency]');
        if (!btn) return;
        // Let the generic toggle listener flip visuals first, then persist on next tick
        setTimeout(() => {
            const row = btn.closest('.tc-row');
            if (row) persistTarjetaRow(row);
        }, 0);
    });

    // ══════════════════════════════════════════════════════════════════
    // NOTES LAYOUT, RENDERING AND CRUD SYSTEM
    // ══════════════════════════════════════════════════════════════════
    const pinnedNotesGrid = document.getElementById('pinnedNotesGrid');
    const recentNotesGrid = document.getElementById('recentNotesGrid');
    const recentTransactionsTimeline = document.getElementById('recentTransactionsTimeline');
    
    const addNoteFabBtn = document.getElementById('addNoteFabBtn');
    const noteModal = document.getElementById('noteModal');
    const closeNoteModalBtn = document.getElementById('closeNoteModalBtn');
    const cancelNoteModalBtn = document.getElementById('cancelNoteModalBtn');
    const noteForm = document.getElementById('noteForm');
    
    const noteIdInput = document.getElementById('noteIdInput');
    const noteTitleInput = document.getElementById('noteTitleInput');
    const noteTagInput = document.getElementById('noteTagInput');
    const noteDateInput = document.getElementById('noteDateInput');
    const noteContentInput = document.getElementById('noteContentInput');
    const noteDetailsInput = document.getElementById('noteDetailsInput');
    const notePinnedInput = document.getElementById('notePinnedInput');
    const noteModalTitle = document.getElementById('noteModalTitle');

    function renderNotes() {
        if (!pinnedNotesGrid || !recentNotesGrid) return;
        
        pinnedNotesGrid.innerHTML = '';
        recentNotesGrid.innerHTML = '';
        
        const notes = appExtra.notes || [];
        
        const pinned = notes.filter(n => n.pinned);
        const recent = notes.filter(n => !n.pinned);
        
        function parseDateStr(str) {
            if (!str) return new Date(0);
            const parts = str.split('/');
            if (parts.length === 3) {
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
            return new Date(str);
        }
        
        pinned.sort((a, b) => parseDateStr(b.date) - parseDateStr(a.date));
        recent.sort((a, b) => parseDateStr(b.date) - parseDateStr(a.date));
        
        if (pinned.length === 0) {
            pinnedNotesGrid.innerHTML = '<div class="no-notes-msg" style="grid-column: span 2; color: var(--color-text-light); font-size: 0.875rem; font-style: italic; text-align: center; padding: 1.5rem 0;">No hay notas fijadas</div>';
        } else {
            pinned.forEach(note => {
                pinnedNotesGrid.appendChild(createNoteCardEl(note));
            });
        }
        
        if (recent.length === 0) {
            recentNotesGrid.innerHTML = '<div class="no-notes-msg" style="grid-column: span 2; color: var(--color-text-light); font-size: 0.875rem; font-style: italic; text-align: center; padding: 1.5rem 0;">No hay notas recientes</div>';
        } else {
            recent.forEach(note => {
                recentNotesGrid.appendChild(createNoteCardEl(note));
            });
        }
    }

    function createNoteCardEl(note) {
        const card = document.createElement('div');
        card.className = `note-card ${note.pinned ? 'pinned-note' : ''}`;
        card.setAttribute('data-note-id', note.id);
        
        const cleanContent = (note.content || '').replace(/\n/g, '<br>');
        const detailsBoxHTML = note.notes ? `<div class="note-details-box"><strong>Notes:</strong> ${note.notes}</div>` : '';
        
        card.innerHTML = `
            <div class="note-card-header">
                <span class="note-tag tag-${note.tag.toLowerCase()}">${note.tag}</span>
                <div class="note-actions">
                    <button class="note-action-btn pin-toggle-btn" title="${note.pinned ? 'Desfijar' : 'Fijar'}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${note.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </button>
                    <button class="note-action-btn edit-note-btn" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="note-action-btn delete-note-btn" title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
            <h3 class="note-title">${note.title || 'Sin Título'}</h3>
            <span class="note-date">${note.date}</span>
            <div class="note-content">${cleanContent}</div>
            ${detailsBoxHTML}
        `;
        
        card.querySelector('.pin-toggle-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            togglePinNote(note.id);
        });
        card.querySelector('.edit-note-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditNoteModal(note);
        });
        card.querySelector('.delete-note-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(note.id);
        });
        
        return card;
    }

    function togglePinNote(noteId) {
        const note = appExtra.notes.find(n => n.id === noteId);
        if (note) {
            note.pinned = !note.pinned;
            saveAppExtra();
            renderNotes();
        }
    }
    
    function deleteNote(noteId) {
        if (confirm('¿Estás seguro de que deseas eliminar esta nota?')) {
            appExtra.notes = appExtra.notes.filter(n => n.id !== noteId);
            saveAppExtra();
            renderNotes();
        }
    }
    
    function openAddNoteModal() {
        noteModalTitle.textContent = 'Agregar Nota';
        noteIdInput.value = '';
        noteTitleInput.value = '';
        noteTagInput.value = 'STRATEGY';
        
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        noteDateInput.value = `${dd}/${mm}/${yyyy}`;
        
        noteContentInput.value = '';
        noteDetailsInput.value = '';
        notePinnedInput.checked = false;
        
        noteModal.classList.add('active');
        setTimeout(() => noteTitleInput.focus(), 50);
    }
    
    function openEditNoteModal(note) {
        noteModalTitle.textContent = 'Editar Nota';
        noteIdInput.value = note.id;
        noteTitleInput.value = note.title || '';
        noteTagInput.value = note.tag || 'STRATEGY';
        noteDateInput.value = note.date || '';
        noteContentInput.value = note.content || '';
        noteDetailsInput.value = note.notes || '';
        notePinnedInput.checked = !!note.pinned;
        
        noteModal.classList.add('active');
        setTimeout(() => noteTitleInput.focus(), 50);
    }
    
    function hideNoteModal() {
        noteModal.classList.remove('active');
    }

    if (addNoteFabBtn) addNoteFabBtn.addEventListener('click', openAddNoteModal);
    if (closeNoteModalBtn) closeNoteModalBtn.addEventListener('click', hideNoteModal);
    if (cancelNoteModalBtn) cancelNoteModalBtn.addEventListener('click', hideNoteModal);
    
    if (noteModal) {
        noteModal.addEventListener('click', (e) => {
            if (e.target === noteModal) hideNoteModal();
        });
    }
    
    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Capture the existing id FIRST before reading any other field
            const existingId = noteIdInput.value.trim();
            const id = existingId || ('note-' + Date.now());

            const title = noteTitleInput.value.trim();
            const tag = noteTagInput.value;
            const date = noteDateInput.value.trim();
            const content = noteContentInput.value.trim();
            const notesVal = noteDetailsInput.value.trim();
            const pinned = notePinnedInput.checked;
            
            if (!title || !date) return; // content is optional — HTML required handles UX
            
            const newNote = { id, tag, title, date, content, notes: notesVal, pinned };
            
            if (existingId) {
                // Edit existing note
                const idx = appExtra.notes.findIndex(n => n.id === existingId);
                if (idx !== -1) {
                    appExtra.notes[idx] = newNote;
                } else {
                    // Fallback: note not found, push as new
                    appExtra.notes.push(newNote);
                }
            } else {
                // New note
                appExtra.notes.push(newNote);
            }
            
            saveAppExtra();
            renderNotes();
            renderTimeline();
            hideNoteModal();
        });
    }

    function getDistribucionTotal(key) {
        const distData = appExtra.distribucion && appExtra.distribucion[key];
        if (!distData || !Array.isArray(distData.rows)) return 0;
        return distData.rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    }

    function renderTimeline() {
        if (!recentTransactionsTimeline) return;
        
        const txs = [
            { key: 'qik', label: 'QIK', date: '18/06/2026', color: 'orange', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' },
            { key: 'gastos-m-p2', label: 'GASTOS M', date: '18/06/2026', color: 'pink', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>' },
            { key: 'apap', label: 'APAP', date: '17/06/2026', color: 'blue', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="12" y1="4" x2="12" y2="20"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>' },
            { key: 'gastos-m-p1', label: 'GASTOS M', date: '16/06/2026', color: 'pink', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>' }
        ];
        
        recentTransactionsTimeline.innerHTML = '';
        
        txs.forEach(tx => {
            const totalAmount = getDistribucionTotal(tx.key);
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.setAttribute('data-target-dist', tx.key);
            item.innerHTML = `
                <div class="timeline-dot-wrapper">
                    <div class="timeline-dot ${tx.color}">${tx.icon}</div>
                    <div class="timeline-line"></div>
                </div>
                <div class="timeline-content">
                    <div class="timeline-meta">${tx.date} - ${tx.label}</div>
                    <div class="timeline-amount">$${formatCurrency(totalAmount)}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                setActiveTab('distribucion');
                const distCard = document.querySelector(`.dist-card[data-dist-key="${tx.key}"]`);
                if (distCard) {
                    setTimeout(() => {
                        distCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        distCard.style.outline = '3px solid var(--color-info)';
                        distCard.style.transition = 'outline 0.3s';
                        setTimeout(() => {
                            distCard.style.outline = 'none';
                        }, 1500);
                    }, 200);
                }
            });
            
            recentTransactionsTimeline.appendChild(item);
        });
    }

    // Initial render of all persisted sections
    init();
    populateCompositionDropdowns();
    renderSummaryTablesFromData();
    renderTarjetasFromData();
});

