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
    // Test database connection first
    testDatabaseConnection();
    
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
    
    // Set up content refresh mechanism
    setupContentRefresh();
});

// Set up content refresh to ensure we always have the latest content from Supabase
function setupContentRefresh() {
    // Refresh content when page becomes visible (user switches back to tab)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !isAdminLoggedIn) {
            console.log('Page became visible, refreshing content from database...');
            loadContentFromDatabase();
        }
    });
    
    // Refresh content every 30 seconds if not in admin mode
    setInterval(() => {
        if (!isAdminLoggedIn) {
            console.log('Periodic content refresh from database...');
            loadContentFromDatabase();
        }
    }, 30000); // 30 seconds
}

// Test database connection
async function testDatabaseConnection() {
    try {
        console.log('Testing database connection...');
        
        // Try to get a simple count from the admin_users table
        const { data, error } = await dbService.supabase
            .from('admin_users')
            .select('count', { count: 'exact', head: true });
            
        if (error) {
            console.error('Database connection test failed:', error);
            alert('Warning: Database connection failed. Admin features may not work properly.');
        } else {
            console.log('Database connection test successful');
            
            // Test admin login
            await testAdminLogin();
        }
    } catch (error) {
        console.error('Database connection test error:', error);
        alert('Warning: Database connection failed. Admin features may not work properly.');
    }
}

// Test admin login
async function testAdminLogin() {
    try {
        console.log('Testing admin login...');
        
        // Try to get admin user data
        const { data, error } = await dbService.supabase
            .from('admin_users')
            .select('*')
            .eq('is_active', true)
            .limit(1);
            
        if (error) {
            console.error('Admin login test failed:', error);
        } else if (data && data.length > 0) {
            console.log('Admin login test successful. Found admin user:', data[0].email);
        } else {
            console.warn('No active admin users found in database');
        }
    } catch (error) {
        console.error('Admin login test error:', error);
    }
}

// Database Functions
async function loadContentFromDatabase() {
    try {
        console.log('🔄 Loading content from Supabase database...');
        
        // Get content from database
        const { data: contentData, error } = await dbService.supabase
            .from('website_content')
            .select('*')
            .eq('page_name', currentPage)
            .eq('is_active', true)
            .order('updated_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error loading content:', error);
            return;
        }
        
        if (!contentData || contentData.length === 0) {
            console.log('📄 No content found in database for this page');
            return;
        }
        
        console.log(`📚 Found ${contentData.length} content items in database:`, contentData);
        
        // Clear existing data attributes to allow fresh matching
        document.querySelectorAll('[data-editable-id]').forEach(el => {
            el.removeAttribute('data-editable-id');
        });
        
        // Group content by element_id to get the latest version
        const latestContent = {};
        contentData.forEach(item => {
            const existing = latestContent[item.element_id];
            if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
                latestContent[item.element_id] = item;
            }
        });
        
        console.log(`🎯 Processing ${Object.keys(latestContent).length} unique content items...`);
        
        let appliedCount = 0;
        Object.values(latestContent).forEach(contentItem => {
            const elementId = contentItem.element_id;
            const newContent = contentItem.content_text;
            
            // Find the matching element
            const element = findElementByContent(newContent, elementId);
            
            if (element) {
                // Apply the content
                element.textContent = newContent;
                
                // Set the data attribute for future reference
                element.setAttribute('data-editable-id', elementId);
                
                // Store for editing system
                originalContent[elementId] = newContent;
                
                appliedCount++;
                console.log(`✅ Applied: ${elementId} -> "${newContent}" to:`, element.tagName + (element.className ? '.' + element.className.split(' ').join('.') : ''));
            } else {
                console.warn(`⚠️ Could not find element for: ${elementId} -> "${newContent}"`);
            }
        });
        
        console.log(`🎉 Content loading complete! Applied ${appliedCount} out of ${Object.keys(latestContent).length} items.`);
        
        // Load media content (unchanged)
        const { data: mediaData, error: mediaError } = await dbService.supabase
            .from('media_content')
            .select('*')
            .eq('page_name', currentPage)
            .eq('is_active', true);
        
        if (mediaError) {
            console.error('Error loading media:', mediaError);
        } else if (mediaData && mediaData.length > 0) {
            console.log('🖼️ Media loaded from database:', mediaData);
            
            // Apply media content to the page
            mediaData.forEach(mediaItem => {
                const elementId = mediaItem.element_id;
                const mediaInfo = {
                    url: mediaItem.file_url,
                    alt: mediaItem.alt_text,
                    type: mediaItem.file_type
                };
                
                // Handle different types of media elements
                if (elementId === 'wolf-logo') {
                    const logoElement = document.querySelector('.logo-img');
                    if (logoElement) {
                        logoElement.src = mediaInfo.url;
                        logoElement.alt = mediaInfo.alt;
                        console.log(`✅ Applied logo: ${mediaInfo.url}`);
                    }
                } else if (elementId.includes('hero-background')) {
                    const heroElement = document.querySelector('.hero');
                    if (heroElement) {
                        heroElement.style.backgroundImage = `url('${mediaInfo.url}')`;
                        console.log(`✅ Applied hero background: ${mediaInfo.url}`);
                    }
                }
            });
        }
        
        console.log('✅ Content and media loaded successfully from database');
    } catch (error) {
        console.error('💥 Error loading content from database:', error);
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

// Legacy findElementsByContent function removed - replaced with improved findElementByContent

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
    
    // Add refresh content button
    const refreshButton = document.createElement('button');
    refreshButton.id = 'refresh-content-btn';
    refreshButton.className = 'refresh-content-btn';
    refreshButton.textContent = 'Refresh from Database';
    refreshButton.addEventListener('click', async () => {
        refreshButton.textContent = 'Refreshing...';
        refreshButton.disabled = true;
        
        try {
            await loadContentFromDatabase();
            await loadVersionHistoryFromDatabase();
            
            // Reset original content
            document.querySelectorAll('.editable-text').forEach(element => {
                const elementId = element.getAttribute('data-editable-id');
                if (elementId) {
                    originalContent[elementId] = element.textContent;
                }
            });
            
            hasUnsavedChanges = false;
            updateSaveStatus();
            
            alert('Content refreshed from database successfully!');
        } catch (error) {
            alert(`Refresh failed: ${error.message}`);
        } finally {
            refreshButton.textContent = 'Refresh from Database';
            refreshButton.disabled = false;
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
    adminControls.appendChild(refreshButton);
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
    // Skip if already editable
    if (element.classList.contains('editable-text')) return;
    
    // Generate or use existing element ID
    let elementId = element.getAttribute('data-editable-id');
    if (!elementId) {
        elementId = generateElementId(element);
        element.setAttribute('data-editable-id', elementId);
    }
    
    // Store original content
    originalContent[elementId] = element.textContent.trim();
    
    // Add editable class
    element.classList.add('editable-text');
    
    // Add click event for editing
    element.addEventListener('click', handleElementClick);
    
    console.log(`🎯 Made element editable: ${elementId} -> "${element.textContent.trim().substring(0, 30)}..."`);
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
    const trimmedNewText = newText.trim();
    const originalText = originalContent[elementId] || '';
    
    if (trimmedNewText !== originalText) {
        // Update the element content
        element.textContent = trimmedNewText;
        
        // Mark as having unsaved changes
        hasUnsavedChanges = true;
        updateSaveStatus();
        
        console.log(`📝 Content changed: ${elementId} -> "${trimmedNewText}"`);
    } else {
        // Revert to original content
        element.textContent = originalText;
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
    // Create a more reliable ID based on text content + position
    const text = element.textContent.trim().substring(0, 20).toLowerCase();
    const tagName = element.tagName.toLowerCase();
    const classList = Array.from(element.classList).join('-');
    
    // Create a unique signature
    let signature = `${tagName}`;
    if (classList) signature += `-${classList}`;
    if (text) signature += `-${text.replace(/[^a-zA-Z0-9]/g, '')}`;
    
    // Add position info for uniqueness
    const parent = element.parentElement;
    if (parent) {
        const siblings = Array.from(parent.children).filter(child => 
            child.tagName === element.tagName && 
            child.classList.toString() === element.classList.toString()
        );
        const index = siblings.indexOf(element);
        if (index > 0) signature += `-${index}`;
    }
    
    return `editable-${signature}`.replace(/[^a-zA-Z0-9-]/g, '');
}

function findElementByContent(content, elementId) {
    console.log(`🔍 Looking for element: ${elementId} with content: "${content}"`);
    
    // First try to find by existing data attribute
    let element = document.querySelector(`[data-editable-id="${elementId}"]`);
    if (element) {
        console.log(`✅ Found by data attribute:`, element);
        return element;
    }
    
    // Extract the text signature from elementId
    const textSignature = elementId.split('-').pop();
    const cleanContent = content.trim().toLowerCase();
    
    // Define selectors in order of specificity
    const selectors = [
        // Hero section
        '.hero h1',
        '.hero h2', 
        '.hero p',
        '.hero-content h1',
        '.hero-content h2',
        '.hero-content p',
        
        // Main sections
        '.find-your-edge h2',
        '.find-your-edge p',
        '.neighborhood-spotlights h2',
        '.services h2',
        '.service-categories h2',
        
        // Spotlight cards
        '.spotlight h3',
        '.spotlight h4',
        
        // Service cards
        '.service-card h3',
        '.service-card p',
        
        // Category cards
        '.category-card h3',
        '.category-features li',
        
        // Footer
        '.footer-info h3',
        '.footer-info p',
        
        // About page specific
        '.about-hero h1',
        '.about-hero .hero-subtitle',
        '.about-company h2',
        '.about-content p',
        '.value-card h3',
        '.value-card p',
        '.team-member-info h3',
        '.team-member-info .position',
        '.team-member-bio p',
        '.stats-section h3',
        '.stats-section p',
        '.cta-section h2',
        '.cta-section p',
        
        // Generic selectors
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'span'
    ];
    
    // Try each selector and find the best match
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        
        for (const el of elements) {
            const elText = el.textContent.trim().toLowerCase();
            
            // Skip if already has a data attribute (already processed)
            if (el.hasAttribute('data-editable-id')) continue;
            
            // Exact content match
            if (elText === cleanContent) {
                console.log(`✅ Found by exact content match (${selector}):`, el);
                return el;
            }
            
            // Content contains signature
            if (textSignature && textSignature.length > 3 && elText.includes(textSignature)) {
                console.log(`✅ Found by text signature match (${selector}):`, el);
                return el;
            }
            
            // Partial content match for longer texts
            if (cleanContent.length > 10 && elText.length > 10) {
                const similarity = calculateTextSimilarity(cleanContent, elText);
                if (similarity > 0.8) {
                    console.log(`✅ Found by similarity match (${similarity.toFixed(2)}, ${selector}):`, el);
                    return el;
                }
            }
        }
    }
    
    console.warn(`⚠️ No element found for: ${elementId} -> "${content}"`);
    return null;
}

function calculateTextSimilarity(text1, text2) {
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

function showSaveModal() {
    document.getElementById('save-modal').style.display = 'block';
}

async function saveChanges() {
    console.log('🔄 Starting save process...');
    
    // Collect all changes from current editable elements
    const changes = {};
    let changeCount = 0;
    
    // Collect the new changes
    document.querySelectorAll('.editable-text').forEach(element => {
        const elementId = element.getAttribute('data-editable-id');
        if (elementId) {
            const currentText = element.textContent.trim();
            const originalText = originalContent[elementId] || '';
            
            // Only include if content has actually changed
            if (currentText !== originalText) {
                changes[elementId] = currentText;
                changeCount++;
                console.log(`📝 Change detected: ${elementId} -> "${currentText}"`);
            }
        }
    });
    
    console.log(`📊 Total changes to save: ${changeCount}`);
    
    if (changeCount === 0) {
        alert('No changes to save.');
        return;
    }
    
    // Show loading state
    const saveButton = document.getElementById('save-changes-btn');
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;
    
    try {
        console.log('💾 Saving changes to Supabase:', changes);
        
        // Step 1: Get current version number
        console.log('🔢 Getting current version number...');
        const { data: versionData, error: versionQueryError } = await dbService.supabase
            .from('version_history')
            .select('version_number')
            .eq('page_name', currentPage)
            .order('version_number', { ascending: false })
            .limit(1);

        if (versionQueryError) {
            console.error('❌ Version query error:', versionQueryError);
            throw new Error(`Could not get version number: ${versionQueryError.message}`);
        }

        const nextVersion = versionData && versionData.length > 0 ? versionData[0].version_number + 1 : 1;
        console.log(`📈 Next version will be: ${nextVersion}`);
        
        // Step 2: Save content to database
        console.log('📚 Saving content items to database...');
        let successCount = 0;
        
        for (const [elementId, contentText] of Object.entries(changes)) {
            const contentData = {
                page_name: currentPage,
                element_id: elementId,
                content_text: contentText,
                content_type: 'text',
                version: nextVersion,
                is_active: true,
                updated_at: new Date().toISOString()
            };
            
            console.log(`💾 Saving: ${elementId}...`);
            
            const { data: insertData, error: insertError } = await dbService.supabase
                .from('website_content')
                .upsert(contentData)
                .select();
                
            if (insertError) {
                console.error(`❌ Failed to save ${elementId}:`, insertError);
                throw new Error(`Failed to save ${elementId}: ${insertError.message}`);
            }
            
            console.log(`✅ Saved ${elementId} successfully:`, insertData);
            successCount++;
        }
        
        console.log(`✅ All ${successCount} content items saved successfully`);
        
        // Step 3: Save version history
        console.log('📜 Saving version history...');
        const versionHistoryData = {
            version_number: nextVersion,
            description: `Manual save - ${new Date().toLocaleString()} (${successCount} changes)`,
            changes: changes,
            page_name: currentPage,
            created_by: dbService.currentUser?.id || null
        };
        
        const { data: versionInsertData, error: versionError } = await dbService.supabase
            .from('version_history')
            .insert(versionHistoryData)
            .select();

        if (versionError) {
            console.error('❌ Version history save error:', versionError);
            throw new Error(`Could not save version history: ${versionError.message}`);
        }
        
        console.log('✅ Version history saved:', versionInsertData);
        
        // Step 4: Verify the save by reloading content
        console.log('🔄 Verifying save by reloading content...');
        await loadContentFromDatabase();
        
        // Step 5: Update local state
        console.log('🔄 Updating local state...');
        Object.keys(changes).forEach(elementId => {
            const element = document.querySelector(`[data-editable-id="${elementId}"]`);
            if (element) {
                originalContent[elementId] = element.textContent.trim();
            }
        });
        
        // Reload version history
        await loadVersionHistoryFromDatabase();
        
        hasUnsavedChanges = false;
        updateSaveStatus();
        
        console.log('🎉 Save completed successfully!');
        alert(`✅ Changes saved successfully as version ${nextVersion}!\n\n${successCount} items updated.\nChanges are now permanent and visible to all users.`);
        
    } catch (error) {
        console.error('💥 Save failed:', error);
        alert(`❌ Save failed: ${error.message}\n\nPlease check the browser console for details.`);
    } finally {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
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
            console.log(`✅ Applied change to DOM: ${elementId} -> "${changes[elementId]}"`);
        }
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
            
            console.log(`Restored to version ${versionNumber} in database`);
            
            // Reload content from database to show the restored version
            await loadContentFromDatabase();
            
            // Reload version history
            await loadVersionHistoryFromDatabase();
            
            // Reset the original content to match what's now in the database
            document.querySelectorAll('.editable-text').forEach(element => {
                const elementId = element.getAttribute('data-editable-id');
                if (elementId) {
                    originalContent[elementId] = element.textContent;
                }
            });
            
            // Mark as having no unsaved changes since we just restored
            hasUnsavedChanges = false;
            updateSaveStatus();
            
            console.log(`Restored to version ${versionNumber}`);
            alert(`Successfully restored to version ${versionNumber}!\n\nThe restored content is now live and visible to all users.`);
            
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

async function clearVersionHistory() {
    const warningMessage = `⚠️ WARNING: This action cannot be undone!\n\n` +
                          `You are about to clear ALL version history (${versionHistory.length} versions).\n\n` +
                          `This will:\n` +
                          `• Delete all saved versions from the database\n` +
                          `• Remove the ability to revert to previous states\n` +
                          `• Keep your current changes intact\n\n` +
                          `Are you absolutely sure you want to clear the version history?`;
    
    if (confirm(warningMessage)) {
        // Double confirmation for safety
        if (confirm('FINAL WARNING: This will permanently delete all version history from the database.\n\nType "YES" to confirm, or click Cancel to abort.')) {
            try {
                // Clear version history from Supabase
                const { error } = await dbService.clearVersionHistory(currentPage);
                
                if (error) {
                    alert(`Failed to clear version history: ${error}`);
                    return;
                }
                
                // Clear local version history
                versionHistory = [];
                currentVersion = 0;
                
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
                
                console.log('Version history cleared from database');
                alert('Version history has been cleared successfully from the database.\n\nNote: Your current changes remain intact.');
                
            } catch (error) {
                alert(`Error clearing version history: ${error.message}`);
            }
        }
    }
}