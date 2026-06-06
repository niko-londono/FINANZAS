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

    // 2. Sidebar Navigation Active Tab Styling
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Remove active class from all items
            sidebarItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');
            
            // Close mobile menu if open
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            }

            // In a real application, this would switch the view content.
            // We print a message for demonstration.
            const tabName = item.getAttribute('data-tab');
            console.log(`Navigating to tab: ${tabName}`);
        });
    });

    // 3. Tree Table Collapse/Expand Logic
    const parentRows = document.querySelectorAll('.parent-row');
    
    parentRows.forEach(row => {
        const toggleBtn = row.querySelector('.toggle-arrow');
        const parentId = row.getAttribute('data-id');
        
        if (toggleBtn && parentId) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid triggering row clicks
                
                const isExpanded = toggleBtn.classList.contains('expanded');
                
                if (isExpanded) {
                    toggleBtn.classList.remove('expanded');
                    collapseChildren(parentId);
                } else {
                    toggleBtn.classList.add('expanded');
                    expandChildren(parentId);
                }
            });
        }
    });

    function collapseChildren(parentId) {
        const children = document.querySelectorAll(`[data-parent="${parentId}"]`);
        children.forEach(child => {
            child.classList.add('collapsed-row');
            
            // If the child is also a parent, recursively collapse its children
            const childId = child.getAttribute('data-id');
            if (childId) {
                const childToggle = child.querySelector('.toggle-arrow');
                if (childToggle && childToggle.classList.contains('expanded')) {
                    childToggle.classList.remove('expanded');
                    collapseChildren(childId);
                }
            }
        });
    }

    function expandChildren(parentId) {
        const children = document.querySelectorAll(`[data-parent="${parentId}"]`);
        children.forEach(child => {
            child.classList.remove('collapsed-row');
            
            // If the child was previously expanded, recursively show its children too
            const childId = child.getAttribute('data-id');
            if (childId) {
                const childToggle = child.querySelector('.toggle-arrow');
                if (childToggle && childToggle.classList.contains('expanded')) {
                    expandChildren(childId);
                }
            }
        });
    }
});
