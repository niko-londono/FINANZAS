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

    function setActiveTab(tabName) {
        sidebarItems.forEach(i => {
            if (i.getAttribute('data-tab') === tabName) {
                i.classList.add('active');
            } else {
                i.classList.remove('active');
            }
        });
        bottomNavItems.forEach(i => {
            if (i.getAttribute('data-tab') === tabName) {
                i.classList.add('active');
            } else {
                i.classList.remove('active');
            }
        });
        console.log(`Navigating to tab: ${tabName}`);
    }

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

    let categories = JSON.parse(localStorage.getItem('budget_categories')) || DEFAULT_CATEGORIES;
    let collapsedCategories = new Set(JSON.parse(localStorage.getItem('collapsed_categories')) || []);
    const tbody = document.getElementById('budgetTableBody');

    // Google Apps Script integration state
    let gasApiUrl = localStorage.getItem('gas_api_url');
    if (gasApiUrl === null) {
        gasApiUrl = 'https://script.google.com/macros/s/AKfycbzkqT6M_wM2b8ZTAua5O-DvS6nOs5MeKy-9qdUcNBWrJVh8si8VyVE2fUl6YSWomPnRCw/exec';
        localStorage.setItem('gas_api_url', gasApiUrl);
    }

    function saveCategories() {
        localStorage.setItem('budget_categories', JSON.stringify(categories));
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
            if (Array.isArray(data) && data.length > 0) {
                categories = data;
                localStorage.setItem('budget_categories', JSON.stringify(categories));
                updateDbStatus('connected');
                
                // Re-render table and metrics inline
                if (tbody) tbody.innerHTML = generateTableRowsHTML();
                updateMetrics();
                populateParentSelect();
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
                body: JSON.stringify(categories)
            });
            updateDbStatus('connected');
        } catch (err) {
            console.error('Failed to save to Apps Script:', err);
            updateDbStatus('error');
        }
    }

    function formatCurrency(val) {
        return Number(val).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function getBudgetedAmount(cat) {
        const children = categories.filter(c => c.parentId === cat.id);
        if (children.length > 0) {
            return children.reduce((sum, child) => sum + getBudgetedAmount(child), 0);
        }
        return cat.budgeted || 0;
    }

    function renderCategoryRow(cat, depth) {
        const isParent = categories.some(c => c.parentId === cat.id);
        const amount = getBudgetedAmount(cat);
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
        
        // Budget cell HTML
        let budgetCellHTML = '';
        if (isParent) {
            budgetCellHTML = `<span class="value-amount">${formatCurrency(amount)}</span>`;
        } else {
            budgetCellHTML = `
                <div style="display: flex; align-items: center;">
                    <span style="font-weight: 600; margin-right: 2px;">$</span>
                    <input type="number" class="budget-input" value="${cat.budgeted}" data-input-id="${cat.id}" step="any">
                </div>
            `;
        }
        
        // Difference cell content (not applicable for normal categories with Actual removed)
        let differenceCellHTML = '<span style="color: var(--color-text-light);">-</span>';
        
        return `
            <tr class="${rowClass}" data-row-id="${cat.id}">
                <td>
                    <div class="cat-cell">
                        ${toggleArrowHTML}
                        <span>${cat.name}</span>
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
        
        // Budgeted(Sueldo Cuadre) = Sum of all other top-level categories
        const otherCategories = categories.filter(c => c.id !== 'sueldo' && c.parentId === null);
        const budgetedExpenses = otherCategories.reduce((sum, cat) => sum + getBudgetedAmount(cat), 0);
        
        const difference = totalIncome - budgetedExpenses;
        
        let diffStyle = '';
        if (difference > 0) diffStyle = 'color: var(--color-success); font-weight: 700;';
        else if (difference < 0) diffStyle = 'color: var(--color-danger); font-weight: 700;';
        
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
        
        // Find top-level items
        const topLevel = categories.filter(c => c.parentId === null);
        
        function renderTree(list, depth) {
            list.forEach(cat => {
                if (cat.id === 'sueldo' || cat.id === 'sueldo-cuadre') return;
                
                html += renderCategoryRow(cat, depth);
                
                const children = categories.filter(c => c.parentId === cat.id);
                if (children.length > 0) {
                    renderTree(children, depth + 1);
                }
            });
        }
        
        // Income (Sueldo) always at the top
        const sueldoCat = categories.find(c => c.id === 'sueldo');
        if (sueldoCat) {
            html += renderCategoryRow(sueldoCat, 0);
        }
        
        // Other categories
        const otherTopLevel = topLevel.filter(c => c.id !== 'sueldo');
        renderTree(otherTopLevel, 0);
        
        // Sueldo Cuadre row at the end
        html += renderSueldoCuadreRow();
        
        return html;
    }

    function updateMetrics() {
        const sueldoCat = categories.find(c => c.id === 'sueldo');
        const totalIncome = sueldoCat ? sueldoCat.budgeted : 0;
        
        const otherCategories = categories.filter(c => c.id !== 'sueldo' && c.parentId === null);
        const totalExpenses = otherCategories.reduce((sum, cat) => sum + getBudgetedAmount(cat), 0);
        
        const balance = totalIncome - totalExpenses;
        
        // Update metric values in DOM
        const totalIncomeInput = document.getElementById('totalIncomeInput');
        if (totalIncomeInput && document.activeElement !== totalIncomeInput) {
            totalIncomeInput.value = totalIncome;
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
        // 1. Update parent values in table
        categories.forEach(cat => {
            const isParent = categories.some(c => c.parentId === cat.id);
            if (isParent) {
                const amount = getBudgetedAmount(cat);
                const row = document.querySelector(`[data-row-id="${cat.id}"]`);
                if (row) {
                    const valueAmountSpan = row.querySelector('.value-amount');
                    if (valueAmountSpan) {
                        valueAmountSpan.textContent = `$${formatCurrency(amount)}`;
                    }
                }
            }
        });
        
        // 2. Update Sueldo Cuadre row
        const sueldoCat = categories.find(c => c.id === 'sueldo');
        const totalIncome = sueldoCat ? sueldoCat.budgeted : 0;
        
        const otherCategories = categories.filter(c => c.id !== 'sueldo' && c.parentId === null);
        const budgetedExpenses = otherCategories.reduce((sum, cat) => sum + getBudgetedAmount(cat), 0);
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
                    diffSpan.style.color = '';
                    diffSpan.style.fontWeight = '';
                }
            }
        }
        
        // 3. Update top metrics
        updateMetrics();
        
        // 4. Update the input in the Sueldo row in case they edited it from the top input
        const sueldoRowInput = document.querySelector('[data-input-id="sueldo"]');
        if (sueldoRowInput && document.activeElement !== sueldoRowInput) {
            sueldoRowInput.value = totalIncome;
        }
    }

    let hasLoadedFromCloud = false;

    function init() {
        if (!tbody) return;
        tbody.innerHTML = generateTableRowsHTML();
        updateMetrics();
        populateParentSelect();
        
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
                    localStorage.setItem('collapsed_categories', JSON.stringify(Array.from(collapsedCategories)));
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

    // Input changes
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('budget-input')) {
            const id = e.target.getAttribute('data-input-id');
            const val = parseFloat(e.target.value) || 0;
            
            const cat = categories.find(c => c.id === id);
            if (cat) {
                cat.budgeted = val;
                saveCategories();
                updateCalculationsInline();
            }
        }
        
        if (e.target.id === 'totalIncomeInput') {
            const val = parseFloat(e.target.value) || 0;
            const sueldoCat = categories.find(c => c.id === 'sueldo');
            if (sueldoCat) {
                sueldoCat.budgeted = val;
                saveCategories();
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
        const possibleParents = categories.filter(c => c.parentId === null && c.id !== 'sueldo');
        
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
                budgeted: parentId ? budget : 0,
                parentId: parentId,
                canDelete: true
            };
            
            if (parentId) {
                const parent = categories.find(c => c.id === parentId);
                if (parent) {
                    parent.budgeted = 0; // Parent sums children, reset manual value
                }
            } else {
                newCat.budgeted = budget;
            }
            
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
            localStorage.setItem('gas_api_url', newUrl);
            
            hideDbModal();
            
            // Clear cloud load lock and fetch new data from the new endpoint
            hasLoadedFromCloud = false;
            init();
        });
    }

    // Initialize layout
    init();
});
