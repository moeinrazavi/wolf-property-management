console.log('Script loaded'); 

// Import Supabase database service
import dbService from './supabase-client.js';

// Global variables
let isAdminLoggedIn = false;
let hasUnsavedChanges = false;
let originalContent = {};
let currentVersion = 0;
let versionHistory = [];
const MAX_VERSIONS = 10;

// Get current page name
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

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

    // Load content from Supabase
    loadContentFromDatabase();
    
    // Load version history from Supabase
    loadVersionHistoryFromDatabase();

    // Admin System Initialization
    initializeAdminSystem();
});

// Database Functions
async function loadContentFromDatabase() {
    try {
        console.log('Loading content from Supabase...');
        const { content, error } = await dbService.getContent(currentPage);
        
        if (error) {
            console.error('Error loading content:', error);
            return;
        }
        
        // Apply content to the page
        Object.keys(content).forEach(elementId => {
            const contentMapping = dbService.getPageContentMapping(currentPage);
            const elementInfo = contentMapping[elementId];
            
            if (elementInfo) {
                const element = document.querySelector(elementInfo.selector);
                if (element) {
                    element.textContent = content[elementId];
                    console.log(`Applied content: ${elementId} -> "${content[elementId]}"`);
                }
            }
        });
        
        console.log('Content loaded successfully from database');
    } catch (error) {
        console.error('Error loading content from database:', error);
    }
}

async function loadVersionHistoryFromDatabase() {
    try {
        console.log('Loading version history from Supabase...');
        const { versions, error } = await dbService.getVersionHistory(currentPage);
        
        if (error) {
            console.error('Error loading version history:', error);
            versionHistory = [];
            currentVersion = 0;
            return;
        }
        
        versionHistory = versions;
        currentVersion = versions.length > 0 ? versions[0].version_number : 0;
        
        console.log('Version history loaded:', versionHistory.length, 'versions');
    } catch (error) {
        console.error('Error loading version history from database:', error);
        versionHistory = [];
        currentVersion = 0;
    }
}

function saveVersionHistory() {
    // This function is no longer needed with Supabase
    // Version history is stored in the database
    console.log('saveVersionHistory() is deprecated - versions are stored in database');
}

function createNewVersion(changes, description = '') {
    // This function is no longer needed with Supabase
    // Versions are created directly in the database
    console.log('createNewVersion() is deprecated - versions are created in database');
    return null;
}

// This function is no longer needed with Supabase
// All content is loaded directly from the database
function applySavedChanges() {
    console.log('applySavedChanges() is deprecated - content is loaded from database');
}

function findElementsBySelector(elementId) {
    // Try different approaches to find the element
    const selectors = [
        `[data-editable-id="${elementId}"]`,
        `.${elementId.replace('editable-', '').replace(/-/g, '.')}`,
        elementId.replace('editable-', '').replace(/-/g, ' ')
    ];
    
    for (let selector of selectors) {
        try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                return Array.from(elements);
            }
        } catch (e) {
            // Invalid selector, continue
        }
    }
    
    return [];
}

function extractSelectorType(elementId) {
    // Extract the HTML tag type from the element ID
    const parts = elementId.split('-');
    const tagTypes = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'span', 'div'];
    
    for (let part of parts) {
        if (tagTypes.includes(part.toLowerCase())) {
            return part.toLowerCase();
        }
    }
    
    return null;
}

function isContentSimilar(text1, text2) {
    // Check if content is similar (for matching purposes)
    const clean1 = text1.trim().toLowerCase().substring(0, 50);
    const clean2 = text2.trim().toLowerCase().substring(0, 50);
    
    return clean1.includes(clean2.substring(0, 20)) || 
           clean2.includes(clean1.substring(0, 20)) ||
           clean1 === clean2;
}

function findElementsByContent(content, selectorHint) {
    const selectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'span', '.hero-subtitle', '.position'
    ];
    
    const results = [];
    const cleanContent = content.trim().toLowerCase();
    
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            const elementText = element.textContent.trim().toLowerCase();
            
            // Exact match
            if (elementText === cleanContent) {
                results.push(element);
                return;
            }
            
            // Partial match (both directions)
            if (cleanContent.length > 10 && elementText.length > 10) {
                if (elementText.includes(cleanContent.substring(0, 20)) || 
                    cleanContent.includes(elementText.substring(0, 20))) {
                    results.push(element);
                    return;
                }
            }
            
            // Shorter content exact match
            if (cleanContent.length <= 10 && elementText === cleanContent) {
                results.push(element);
            }
        });
    });
    
    return results;
}

function isElementMatch(element, elementId) {
    // Generate current element ID and compare
    const currentId = generateElementId(element);
    return currentId === elementId;
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
    if (dbService.isAuthenticated()) {
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
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Show loading state
        const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;

        try {
            const { user, error } = await dbService.signIn(email, password);
            
            if (error) {
                alert(`Login failed: ${error}`);
            } else {
                loginAdmin();
                adminModal.style.display = 'none';
                adminLoginForm.reset();
            }
        } catch (error) {
            alert(`Login error: ${error.message}`);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Admin logout
    adminLogoutBtn.addEventListener('click', () => {
        if (hasUnsavedChanges) {
            if (confirm('You have unsaved changes. If you logout now, these changes will not be applied.\n\nClick "OK" to logout without saving, or "Cancel" to stay and save your changes.')) {
                logoutAdmin();
            }
        } else {
            logoutAdmin();
        }
    });

    // Note: Save modal is no longer used - replaced with direct save button and logout warning

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
    
    // Show admin controls
    document.getElementById('admin-controls').style.display = 'block';
    document.body.classList.add('admin-mode');
    
    // Make text content editable
    makeContentEditable();
    
    // Add version controls
    addVersionControls();
    
    console.log('Admin logged in successfully');
}

async function logoutAdmin() {
    await dbService.signOut();
    isAdminLoggedIn = false;
    
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
    
    // Add save changes button
    const saveButton = document.createElement('button');
    saveButton.id = 'save-changes-btn';
    saveButton.className = 'save-changes-btn';
    saveButton.disabled = !hasUnsavedChanges;
    saveButton.textContent = hasUnsavedChanges ? 'Save Changes' : 'No Changes to Save';
    saveButton.addEventListener('click', () => {
        if (hasUnsavedChanges) {
            saveChanges();
        } else {
            alert('No changes to save.');
        }
    });
    
    // Add version controls
    const versionControls = document.createElement('div');
    versionControls.className = 'version-controls';
    versionControls.innerHTML = `
        <button id="version-history-btn" class="version-btn">Version History</button>
        <button id="export-changes-btn" class="version-btn">Export Changes</button>
        <button id="import-changes-btn" class="version-btn">Import Changes</button>
        <button id="clear-history-btn" class="version-btn version-btn-danger">Clear History</button>
    `;
    
    adminControls.appendChild(versionInfo);
    adminControls.appendChild(saveButton);
    adminControls.appendChild(versionControls);
    
    // Add event listeners
    document.getElementById('version-history-btn').addEventListener('click', showVersionHistory);
    document.getElementById('export-changes-btn').addEventListener('click', exportChanges);
    document.getElementById('import-changes-btn').addEventListener('click', importChanges);
    document.getElementById('clear-history-btn').addEventListener('click', clearVersionHistory);
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
    
    // Store original content (no longer using localStorage)
    originalContent[elementId] = element.textContent;
    
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
        hasUnsavedChanges = true;
        updateSaveStatus();
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

async function saveChanges() {
    // Collect all changes from current editable elements
    const changes = {};
    
    // Collect the new changes
    document.querySelectorAll('.editable-text').forEach(element => {
        const elementId = element.getAttribute('data-editable-id');
        if (elementId) {
            // Save the new content
            changes[elementId] = element.textContent;
        }
    });
    
    if (Object.keys(changes).length > 0) {
        // Show loading state
        const saveButton = document.getElementById('save-changes-btn');
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saving...';
        saveButton.disabled = true;
        
        try {
            // Save to Supabase
            const { version, error } = await dbService.saveContent(
                currentPage, 
                changes, 
                `Manual save - ${new Date().toLocaleString()}`
            );
            
            if (error) {
                alert(`Save failed: ${error}`);
                return;
            }
            
            // Update original content for all elements
            Object.keys(changes).forEach(elementId => {
                const element = document.querySelector(`[data-editable-id="${elementId}"]`);
                if (element) {
                    originalContent[elementId] = element.textContent;
                }
            });
            
            // Reload version history
            await loadVersionHistoryFromDatabase();
            
            hasUnsavedChanges = false;
            updateSaveStatus();
            
            console.log('Changes saved to database, version:', version);
            alert(`Changes saved successfully as version ${version}!\nChanges are now permanent and visible to all users.`);
            
        } catch (error) {
            alert(`Save error: ${error.message}`);
        } finally {
            saveButton.textContent = originalText;
            saveButton.disabled = false;
        }
    } else {
        alert('No changes to save.');
    }
}

function getCurrentSavedChanges() {
    // This function is no longer needed with Supabase
    // All changes are now stored in the database
    return {};
}

function applyChangesToDOM(changes) {
    // Apply changes to ensure they're visible immediately
    Object.keys(changes).forEach(elementId => {
        const element = document.querySelector(`[data-editable-id="${elementId}"]`);
        if (element && element.textContent !== changes[elementId]) {
            element.textContent = changes[elementId];
        }
        
        // Also apply to non-editable elements that might match
        const selectorPath = elementId.replace('editable-', '').replace(/-/g, ' ');
        const matchingElements = findElementsByContent(changes[elementId], selectorPath);
        matchingElements.forEach(el => {
            if (!el.classList.contains('editable-text')) {
                el.textContent = changes[elementId];
            }
        });
    });
}

function revertChanges() {
    // Revert all changes to original content
    Object.keys(originalContent).forEach(elementId => {
        const element = document.querySelector(`[data-editable-id="${elementId}"]`);
        if (element) {
            element.innerHTML = originalContent[elementId];
        }
    });
    
    hasUnsavedChanges = false;
    updateSaveStatus();
    
    console.log('Changes reverted');
}

function updateSaveStatus() {
    const adminControls = document.querySelector('.admin-controls-content p');
    const saveButton = document.getElementById('save-changes-btn');
    
    if (hasUnsavedChanges) {
        adminControls.textContent = 'You have unsaved changes. Click "Save Changes" to apply them permanently.';
        adminControls.style.color = '#e74c3c';
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
        }
    } else {
        adminControls.textContent = 'Click on any text to edit. Press Enter to save or Escape to cancel.';
        adminControls.style.color = 'rgba(255, 255, 255, 0.9)';
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'No Changes to Save';
        }
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
            <p class="version-info-text">Each version represents the state BEFORE changes were made, allowing you to revert to previous states.</p>
            <div class="version-list">
                ${versionHistory.map(version => `
                    <div class="version-item">
                        <div class="version-header">
                            <span class="version-number">Version ${version.version_number}</span>
                            <span class="version-date">${new Date(version.created_at).toLocaleString()}</span>
                        </div>
                        <div class="version-description">${version.description}</div>
                        <div class="version-details">
                            <span class="version-changes">${Object.keys(version.changes).length} elements</span>
                            <span class="version-page">${version.page_name}</span>
                        </div>
                        <div class="version-actions">
                            <button class="version-restore-btn" data-version="${version.version_number}">Restore to This State</button>
                            <button class="version-export-btn" data-version="${version.version_number}">Export This Version</button>
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
        btn.addEventListener('click', async () => {
            const versionNumber = parseInt(btn.getAttribute('data-version'));
            await restoreVersion(versionNumber);
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

async function restoreVersion(versionNumber) {
    const version = versionHistory.find(v => v.version_number === versionNumber);
    if (!version) return;
    
    if (confirm(`Are you sure you want to restore to version ${versionNumber}? This will overwrite current changes.`)) {
        try {
            // Restore from database
            const { success, error } = await dbService.restoreVersion(currentPage, versionNumber);
            
            if (error) {
                alert(`Restore failed: ${error}`);
                return;
            }
            
            // Reload content from database
            await loadContentFromDatabase();
            
            // Reload version history
            await loadVersionHistoryFromDatabase();
            
            // Mark as having unsaved changes so user can save if they want
            hasUnsavedChanges = true;
            updateSaveStatus();
            
            console.log(`Restored to version ${versionNumber}`);
            alert(`Successfully restored to version ${versionNumber}!\n\nNote: The restored state is now your current state. Click "Save Changes" to make it permanent.`);
            
        } catch (error) {
            alert(`Restore error: ${error.message}`);
        }
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
                        
                        // Mark as having unsaved changes so user can save if they want
                        hasUnsavedChanges = true;
                        updateSaveStatus();
                        
                        alert('Changes imported successfully!\n\nNote: The imported changes are now your current state. Click "Save Changes" to make them permanent.');
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

function clearVersionHistory() {
    const warningMessage = `⚠️ WARNING: This action cannot be undone!\n\n` +
                          `You are about to clear ALL version history (${versionHistory.length} versions).\n\n` +
                          `This will:\n` +
                          `• Delete all saved versions\n` +
                          `• Remove the ability to revert to previous states\n` +
                          `• Keep your current changes intact\n\n` +
                          `Are you absolutely sure you want to clear the version history?`;
    
    if (confirm(warningMessage)) {
        // Double confirmation for safety
        if (confirm('FINAL WARNING: This will permanently delete all version history.\n\nType "YES" to confirm, or click Cancel to abort.')) {
            // Clear version history
            versionHistory = [];
            currentVersion = 0;
            
            // Save empty history
            saveVersionHistory();
            
            // Update display
            updateVersionDisplay();
            
            // Update version controls
            const versionInfo = document.querySelector('.version-info');
            if (versionInfo) {
                versionInfo.innerHTML = `
                    <span>Current Version: ${currentVersion}</span>
                    <span>Total Versions: ${versionHistory.length}</span>
                `;
            }
            
            console.log('Version history cleared');
            alert('Version history has been cleared successfully.\n\nNote: Your current changes remain intact.');
        }
    }
}