console.log('Script loaded'); 

// Admin credentials (in a real app, this would be server-side)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// Global variables
let isAdminLoggedIn = false;
let hasUnsavedChanges = false;
let originalContent = {};
let currentVersion = 0;
let versionHistory = [];
const MAX_VERSIONS = 10;

// Version management
const VERSION_STORAGE_KEY = 'wolf_pm_versions';
const CHANGES_STORAGE_KEY = 'wolf_pm_changes';
const CURRENT_VERSION_KEY = 'wolf_pm_current_version';

document.addEventListener('DOMContentLoaded', () => {
    // Header scroll effect
    const header = document.querySelector('header');
    const scrollThreshold = 50;

    function handleHeaderScroll() {
        if (window.scrollY > scrollThreshold) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', () => {
        requestAnimationFrame(handleHeaderScroll);
    });

    handleHeaderScroll();

    // Scroll animations
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const intersectionCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    };

    const observer = new IntersectionObserver(intersectionCallback, observerOptions);

    animatedElements.forEach(element => {
        observer.observe(element);
    });

    // Load version history
    loadVersionHistory();
    
    // Apply saved changes on page load
    applySavedChanges();

    // Admin System Initialization
    initializeAdminSystem();
});

// Version Management Functions
function loadVersionHistory() {
    try {
        const savedVersions = localStorage.getItem(VERSION_STORAGE_KEY);
        const savedCurrentVersion = localStorage.getItem(CURRENT_VERSION_KEY);
        
        if (savedVersions) {
            versionHistory = JSON.parse(savedVersions);
        }
        
        if (savedCurrentVersion) {
            currentVersion = parseInt(savedCurrentVersion);
        }
        
        console.log('Version history loaded:', versionHistory.length, 'versions');
    } catch (error) {
        console.error('Error loading version history:', error);
        versionHistory = [];
        currentVersion = 0;
    }
}

function saveVersionHistory() {
    try {
        localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versionHistory));
        localStorage.setItem(CURRENT_VERSION_KEY, currentVersion.toString());
    } catch (error) {
        console.error('Error saving version history:', error);
    }
}

function createNewVersion(changes, description = '') {
    const timestamp = new Date().toISOString();
    const version = {
        id: currentVersion + 1,
        timestamp: timestamp,
        changes: changes,
        description: description || `Version ${currentVersion + 1} - ${new Date().toLocaleString()}`,
        page: window.location.pathname
    };
    
    // Add to history
    versionHistory.push(version);
    
    // Keep only the latest MAX_VERSIONS
    if (versionHistory.length > MAX_VERSIONS) {
        versionHistory = versionHistory.slice(-MAX_VERSIONS);
    }
    
    currentVersion = version.id;
    
    // Save to localStorage
    saveVersionHistory();
    
    // Update admin controls
    updateVersionDisplay();
    
    return version;
}

function applySavedChanges() {
    try {
        const savedChanges = localStorage.getItem(CHANGES_STORAGE_KEY);
        if (savedChanges) {
            const changes = JSON.parse(savedChanges);
            
            Object.keys(changes).forEach(elementId => {
                const element = document.querySelector(`[data-editable-id="${elementId}"]`);
                if (element) {
                    element.innerHTML = changes[elementId];
                    // Update original content to reflect applied changes
                    originalContent[elementId] = changes[elementId];
                }
            });
            
            console.log('Applied saved changes');
        }
    } catch (error) {
        console.error('Error applying saved changes:', error);
    }
}

function updateVersionDisplay() {
    const versionInfo = document.querySelector('.version-info');
    if (versionInfo) {
        versionInfo.innerHTML = `
            <span>Current Version: ${currentVersion}</span>
            <span>Total Versions: ${versionHistory.length}</span>
        `;
    }
}

// Admin System Functions
function initializeAdminSystem() {
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminClose = document.querySelector('.admin-close');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLogoutBtn = document.getElementById('admin-logout');
    const saveModal = document.getElementById('save-modal');
    const saveConfirm = document.getElementById('save-confirm');
    const saveCancel = document.getElementById('save-cancel');

    // Check if admin is already logged in
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        loginAdmin();
    }

    // Admin login button click
    adminLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        adminModal.style.display = 'block';
    });

    // Close modal
    adminClose.addEventListener('click', () => {
        adminModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            adminModal.style.display = 'none';
        }
    });

    // Admin login form submission
    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            loginAdmin();
            adminModal.style.display = 'none';
            adminLoginForm.reset();
        } else {
            alert('Invalid credentials. Please try again.');
        }
    });

    // Admin logout
    adminLogoutBtn.addEventListener('click', () => {
        if (hasUnsavedChanges) {
            showSaveModal();
        } else {
            logoutAdmin();
        }
    });

    // Save modal handlers
    saveConfirm.addEventListener('click', () => {
        saveChanges();
        logoutAdmin();
        saveModal.style.display = 'none';
    });

    saveCancel.addEventListener('click', () => {
        revertChanges();
        logoutAdmin();
        saveModal.style.display = 'none';
    });

    // Close save modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === saveModal) {
            saveModal.style.display = 'none';
        }
    });

    // Warn before leaving page with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

function loginAdmin() {
    isAdminLoggedIn = true;
    localStorage.setItem('adminLoggedIn', 'true');
    
    // Show admin controls
    document.getElementById('admin-controls').style.display = 'block';
    document.body.classList.add('admin-mode');
    
    // Make text content editable
    makeContentEditable();
    
    // Add version controls
    addVersionControls();
    
    console.log('Admin logged in successfully');
}

function logoutAdmin() {
    isAdminLoggedIn = false;
    localStorage.removeItem('adminLoggedIn');
    
    // Hide admin controls
    document.getElementById('admin-controls').style.display = 'none';
    document.body.classList.remove('admin-mode');
    
    // Remove editable functionality
    removeEditableContent();
    
    // Remove version controls
    removeVersionControls();
    
    // Reset changes
    hasUnsavedChanges = false;
    originalContent = {};
    
    console.log('Admin logged out');
}

function addVersionControls() {
    const adminControls = document.querySelector('.admin-controls-content');
    
    // Add version info
    const versionInfo = document.createElement('div');
    versionInfo.className = 'version-info';
    versionInfo.innerHTML = `
        <span>Current Version: ${currentVersion}</span>
        <span>Total Versions: ${versionHistory.length}</span>
    `;
    
    // Add version controls
    const versionControls = document.createElement('div');
    versionControls.className = 'version-controls';
    versionControls.innerHTML = `
        <button id="version-history-btn" class="version-btn">Version History</button>
        <button id="export-changes-btn" class="version-btn">Export Changes</button>
        <button id="import-changes-btn" class="version-btn">Import Changes</button>
    `;
    
    adminControls.appendChild(versionInfo);
    adminControls.appendChild(versionControls);
    
    // Add event listeners
    document.getElementById('version-history-btn').addEventListener('click', showVersionHistory);
    document.getElementById('export-changes-btn').addEventListener('click', exportChanges);
    document.getElementById('import-changes-btn').addEventListener('click', importChanges);
}

function removeVersionControls() {
    const versionInfo = document.querySelector('.version-info');
    const versionControls = document.querySelector('.version-controls');
    
    if (versionInfo) versionInfo.remove();
    if (versionControls) versionControls.remove();
}

function makeContentEditable() {
    // Select text elements that should be editable
    const editableSelectors = [
        '.hero h1',
        '.hero h2', 
        '.hero p',
        '.find-your-edge p',
        '.neighborhood-spotlights h2',
        '.spotlight h3',
        '.spotlight h4',
        '.services h2',
        '.service-card h3',
        '.service-card p',
        '.service-categories h2',
        '.category-card h3',
        '.category-features li',
        '.footer-info h3',
        '.footer-info p',
        // About page selectors
        '.about-hero h1',
        '.about-hero .hero-subtitle',
        '.about-company h2',
        '.about-content p',
        '.value-card h3',
        '.value-card p',
        '.team-members h2',
        '.team-member-info h3',
        '.team-member-info .position',
        '.team-member-bio p',
        '.stats-section h3',
        '.stats-section p',
        '.cta-section h2',
        '.cta-section p'
    ];

    editableSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (element.textContent.trim()) {
                makeElementEditable(element);
            }
        });
    });
}

function makeElementEditable(element) {
    // Store original content
    const elementId = generateElementId(element);
    originalContent[elementId] = element.innerHTML;
    
    // Add editable class
    element.classList.add('editable-text');
    
    // Add click event for editing
    element.addEventListener('click', handleElementClick);
    
    // Add data attribute for identification
    element.setAttribute('data-editable-id', elementId);
}

function handleElementClick(e) {
    if (!isAdminLoggedIn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const element = e.target;
    if (!element.classList.contains('editable-text')) return;
    
    startEditing(element);
}

function startEditing(element) {
    const originalText = element.textContent;
    const elementId = element.getAttribute('data-editable-id');
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'inline-edit-input';
    input.style.cssText = `
        width: 100%;
        padding: 4px 8px;
        border: 2px solid var(--accent-color);
        border-radius: 4px;
        font-size: inherit;
        font-family: inherit;
        background-color: var(--white);
        color: var(--text-color);
        outline: none;
    `;
    
    // Replace element content with input
    element.innerHTML = '';
    element.appendChild(input);
    element.classList.add('editing');
    
    // Focus input
    input.focus();
    input.select();
    
    // Handle input events
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveEdit(element, input.value, elementId);
        } else if (e.key === 'Escape') {
            cancelEdit(element, originalText, elementId);
        }
    });
    
    input.addEventListener('blur', () => {
        saveEdit(element, input.value, elementId);
    });
}

function saveEdit(element, newText, elementId) {
    if (newText.trim() !== originalContent[elementId]) {
        element.textContent = newText;
        
        // Immediately save to localStorage for permanent storage
        const currentChanges = JSON.parse(localStorage.getItem(CHANGES_STORAGE_KEY) || '{}');
        currentChanges[elementId] = newText;
        localStorage.setItem(CHANGES_STORAGE_KEY, JSON.stringify(currentChanges));
        
        // Update original content to reflect the saved state
        originalContent[elementId] = newText;
        
        hasUnsavedChanges = false;
        updateSaveStatus();
        
        console.log('Change saved permanently:', elementId, newText);
    } else {
        element.innerHTML = originalContent[elementId];
    }
    
    element.classList.remove('editing');
}

function cancelEdit(element, originalText, elementId) {
    element.innerHTML = originalContent[elementId];
    element.classList.remove('editing');
}

function removeEditableContent() {
    const editableElements = document.querySelectorAll('.editable-text');
    editableElements.forEach(element => {
        element.classList.remove('editable-text', 'editing');
        element.removeEventListener('click', handleElementClick);
        element.removeAttribute('data-editable-id');
    });
}

function generateElementId(element) {
    // Generate a unique ID based on element position and content
    const path = getElementPath(element);
    return `editable-${path.replace(/[^a-zA-Z0-9]/g, '-')}`;
}

function getElementPath(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
            selector += `#${current.id}`;
        } else if (current.className) {
            selector += `.${current.className.split(' ').join('.')}`;
        }
        path.unshift(selector);
        current = current.parentElement;
    }
    
    return path.join(' > ');
}

function showSaveModal() {
    document.getElementById('save-modal').style.display = 'block';
}

function saveChanges() {
    // Collect all current changes from localStorage
    const currentChanges = JSON.parse(localStorage.getItem(CHANGES_STORAGE_KEY) || '{}');
    
    if (Object.keys(currentChanges).length > 0) {
        // Create new version from all saved changes
        const version = createNewVersion(currentChanges, 'Manual save from admin interface');
        
        hasUnsavedChanges = false;
        updateSaveStatus();
        
        console.log('All changes saved as version:', version.id);
        alert(`All changes saved successfully as version ${version.id}!`);
    } else {
        alert('No changes to save. All changes are already permanent.');
    }
}

function revertChanges() {
    // Clear all saved changes from localStorage
    localStorage.removeItem(CHANGES_STORAGE_KEY);
    
    // Revert all changes to original content
    Object.keys(originalContent).forEach(elementId => {
        const element = document.querySelector(`[data-editable-id="${elementId}"]`);
        if (element) {
            element.innerHTML = originalContent[elementId];
        }
    });
    
    hasUnsavedChanges = false;
    updateSaveStatus();
    
    console.log('All changes reverted and cleared from storage');
}

function updateSaveStatus() {
    const adminControls = document.querySelector('.admin-controls-content p');
    const currentChanges = JSON.parse(localStorage.getItem(CHANGES_STORAGE_KEY) || '{}');
    const hasChanges = Object.keys(currentChanges).length > 0;
    
    if (hasChanges) {
        adminControls.textContent = `You have ${Object.keys(currentChanges).length} permanent changes. Click "Save Changes" to create a version.`;
        adminControls.style.color = '#27ae60';
    } else {
        adminControls.textContent = 'Click on any text to edit. Press Enter to save permanently or Escape to cancel.';
        adminControls.style.color = 'rgba(255, 255, 255, 0.9)';
    }
}

// Version History Functions
function showVersionHistory() {
    const modal = document.createElement('div');
    modal.className = 'version-history-modal';
    modal.innerHTML = `
        <div class="version-history-content">
            <span class="version-close">&times;</span>
            <h3>Version History</h3>
            <div class="version-list">
                ${versionHistory.map(version => `
                    <div class="version-item">
                        <div class="version-header">
                            <span class="version-number">Version ${version.id}</span>
                            <span class="version-date">${new Date(version.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="version-description">${version.description}</div>
                        <div class="version-actions">
                            <button class="version-restore-btn" data-version="${version.id}">Restore</button>
                            <button class="version-export-btn" data-version="${version.id}">Export</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.version-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    // Restore version
    modal.querySelectorAll('.version-restore-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const versionId = parseInt(btn.getAttribute('data-version'));
            restoreVersion(versionId);
            modal.remove();
        });
    });
    
    // Export version
    modal.querySelectorAll('.version-export-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const versionId = parseInt(btn.getAttribute('data-version'));
            exportVersion(versionId);
        });
    });
}

function restoreVersion(versionId) {
    const version = versionHistory.find(v => v.id === versionId);
    if (!version) return;
    
    if (confirm(`Are you sure you want to restore to version ${versionId}? This will overwrite current changes.`)) {
        // Apply version changes
        Object.keys(version.changes).forEach(elementId => {
            const element = document.querySelector(`[data-editable-id="${elementId}"]`);
            if (element) {
                element.innerHTML = version.changes[elementId];
                originalContent[elementId] = version.changes[elementId];
            }
        });
        
        // Update current version
        currentVersion = versionId;
        saveVersionHistory();
        updateVersionDisplay();
        
        alert(`Restored to version ${versionId}`);
    }
}

function exportChanges() {
    const changes = {};
    document.querySelectorAll('.editable-text').forEach(element => {
        const elementId = element.getAttribute('data-editable-id');
        if (elementId) {
            changes[elementId] = element.textContent;
        }
    });
    
    const exportData = {
        changes: changes,
        version: currentVersion,
        timestamp: new Date().toISOString(),
        page: window.location.pathname
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wolf-pm-changes-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportVersion(versionId) {
    const version = versionHistory.find(v => v.id === versionId);
    if (!version) return;
    
    const blob = new Blob([JSON.stringify(version, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wolf-pm-version-${versionId}-${new Date(version.timestamp).toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importChanges() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.changes) {
                    if (confirm('Import these changes? This will overwrite current content.')) {
                        // Apply imported changes
                        Object.keys(data.changes).forEach(elementId => {
                            const element = document.querySelector(`[data-editable-id="${elementId}"]`);
                            if (element) {
                                element.innerHTML = data.changes[elementId];
                                originalContent[elementId] = data.changes[elementId];
                            }
                        });
                        
                        // Create new version from import
                        createNewVersion(data.changes, `Imported from ${data.timestamp || 'unknown'}`);
                        
                        alert('Changes imported successfully!');
                    }
                } else {
                    alert('Invalid import file format.');
                }
            } catch (error) {
                alert('Error reading import file: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    });
    
    input.click();
} 