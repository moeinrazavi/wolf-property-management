console.log('Script loaded'); 

// Import Supabase database service
import dbService from './supabase-client.js';

// Import new version control system
import adminVersionControlUI from './admin-version-control-ui.js';

// Make objects globally available for debugging
window.adminVersionControlUI = adminVersionControlUI;
window.dbService = dbService;

// Global variables
let isAdminLoggedIn = false;
let hasUnsavedChanges = false;
let originalContent = {};
let pendingLogoChange = null; // Track pending logo changes

// Make logo functions globally available
window.saveLogoChanges = saveLogoChanges;
window.hasPendingLogoChanges = () => pendingLogoChange !== null;

// Get current page name
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

document.addEventListener('DOMContentLoaded', () => {
    // Test database connection in background (non-blocking)
    setTimeout(() => testDatabaseConnection(), 100);
    
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

// Test database connection (non-blocking background test)
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
        
        // Load all media content including logo
        const { data: mediaData, error: mediaError } = await dbService.supabase
            .from('media_content')
            .select('*')
            .or(`page_name.eq.${currentPage},page_name.eq.global`)
            .eq('is_active', true);
        
        if (mediaError) {
            console.error('Error loading media:', mediaError);
        } else if (mediaData && mediaData.length > 0) {
            console.log('🖼️ Media loaded from database:', mediaData);
            
            // Apply media content to the page
            for (const mediaItem of mediaData) {
                const elementId = mediaItem.element_id;
                const mediaInfo = {
                    url: mediaItem.file_url,
                    alt: mediaItem.alt_text,
                    type: mediaItem.file_type,
                    fileName: mediaItem.file_name
                };
                
                // Handle different types of media elements
                if (elementId === 'wolf-logo') {
                    const logoElement = document.querySelector('.logo-img');
                    if (logoElement && mediaInfo.fileName) {
                        try {
                            // Generate fresh signed URL for logo
                            const signedUrl = await dbService.getFileUrl('wolf-property-images', mediaInfo.fileName, true);
                            if (signedUrl) {
                                logoElement.src = signedUrl;
                                logoElement.alt = mediaInfo.alt;
                                console.log(`✅ Applied logo with signed URL: ${mediaInfo.fileName}`);
                            } else {
                                logoElement.src = mediaInfo.url;
                                logoElement.alt = mediaInfo.alt;
                                console.log(`✅ Applied logo with fallback URL: ${mediaInfo.url}`);
                            }
                        } catch (error) {
                            console.warn('⚠️ Error generating signed URL for logo, using fallback:', error);
                            logoElement.src = mediaInfo.url;
                            logoElement.alt = mediaInfo.alt;
                        }
                    }
                } else if (elementId.includes('hero-background')) {
                    const heroElement = document.querySelector('.hero');
                    if (heroElement) {
                        heroElement.style.backgroundImage = `url('${mediaInfo.url}')`;
                        console.log(`✅ Applied hero background: ${mediaInfo.url}`);
                    }
                }
            }
        }
        
        console.log('✅ Content and media loaded successfully from database');
    } catch (error) {
        console.error('💥 Error loading content from database:', error);
    }
}

// Version control functions removed - replaced by new VersionControlManager

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

// updateVersionDisplay function removed - replaced by new VersionControlManager

// Admin System Functions
async function initializeAdminSession() {
    try {
        const isRestored = await dbService.restoreSession();
        if (isRestored) {
            loginAdmin();
        }
    } catch (error) {
        console.warn('Could not restore admin session:', error);
    }
}

function initializeAdminSystem() {
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminClose = document.querySelector('.admin-close');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLogoutBtn = document.getElementById('admin-logout');
    // Old save modal elements removed - now using professional version control panel

    // Check if admin is already logged in and restore session
    initializeAdminSession();

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

async function loginAdmin() {
    isAdminLoggedIn = true;
    
    // Show admin controls
    document.getElementById('admin-controls').style.display = 'block';
    document.body.classList.add('admin-mode');
    
    // Initialize optimized version control system
    try {
        await adminVersionControlUI.initialize();
        console.log('✅ Optimized version control system initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize optimized version control:', error);
        alert('Warning: Version control system failed to initialize. Some features may not work properly.');
    }
    
    // Make text content editable
    makeContentEditable();
    
    // Make logo editable
    makeLogoEditable();
    
    console.log('Admin logged in successfully');
}

async function logoutAdmin() {
    // Check for unsaved changes
    if (adminVersionControlUI.isReady() && adminVersionControlUI.getVersionManager().hasChanges()) {
        const hasChanges = window.confirm(
            'You have unsaved changes that will be lost if you logout.\n\n' +
            'Click "OK" to logout without saving, or "Cancel" to stay and save your changes.'
        );
        if (!hasChanges) {
            return; // Cancel logout
        }
    }
    
    await dbService.signOut();
    isAdminLoggedIn = false;
    
    // Clean up version control system
    if (adminVersionControlUI.isReady()) {
        adminVersionControlUI.cleanup();
    }
    
    // Hide admin controls
    document.getElementById('admin-controls').style.display = 'none';
    document.body.classList.remove('admin-mode');
    
    // Remove editable functionality
    removeEditableContent();
    
    // Reset changes
    hasUnsavedChanges = false;
    originalContent = {};
    
    console.log('Admin logged out');
}

// Version control UI functions removed - replaced by new VersionControlManager

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
        
        // Track modification in optimized version control system
        if (adminVersionControlUI.isReady()) {
            adminVersionControlUI.trackContentChange(
                elementId, 
                originalText, 
                trimmedNewText,
                {
                    page: currentPage,
                    elementType: element.tagName.toLowerCase(),
                    contentType: 'text'
                }
            );
        }
        
        // Mark as having unsaved changes (legacy)
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
    
    // Define selectors in order of specificity - EXCLUDE navigation elements
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
        '.cta-section p'
        
        // NOTE: Removed generic selectors that could match navigation
        // 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'span'
    ];
    
    // Try each selector and find the best match
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        
        for (const el of elements) {
            // EXCLUDE navigation elements explicitly
            if (el.closest('.nav-menu') || el.closest('.main-navigation') || el.closest('nav')) {
                continue; // Skip navigation elements
            }
            
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

// Old showSaveModal function removed - now using professional version control panel

// saveChanges function removed - replaced by new VersionControlManager

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
    
    // Check for any type of unsaved changes including logo changes
    const hasAnyUnsavedChanges = hasUnsavedChanges || pendingLogoChange !== null;
    
    if (hasAnyUnsavedChanges) {
        let changeTypes = [];
        if (hasUnsavedChanges) changeTypes.push('text content');
        if (pendingLogoChange) changeTypes.push('logo');
        
        adminControls.textContent = `You have unsaved ${changeTypes.join(' and ')} changes. Click "Save Changes" to apply them permanently.`;
        adminControls.style.color = '#e74c3c';
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
        }
    } else {
        adminControls.textContent = 'Click on any text to edit or logo to change image. Press Enter to save or Escape to cancel.';
        adminControls.style.color = 'rgba(255, 255, 255, 0.9)';
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'No Changes to Save';
        }
    }
}

// All version history functions removed - replaced by new VersionControlManager

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

// clearVersionHistory function removed - replaced by new VersionControlManager

/**
 * Make the website logo editable in admin mode
 */
function makeLogoEditable() {
    const logo = document.querySelector('.logo');
    const logoImg = document.querySelector('.logo-img');
    
    if (!logo || !logoImg) {
        console.warn('⚠️ Logo elements not found');
        return;
    }
    
    console.log('🖼️ Making logo editable...');
    
    // Add click event to logo
    logo.addEventListener('click', handleLogoClick);
    
    console.log('✅ Logo is now editable in admin mode');
}

/**
 * Handle logo click in admin mode
 */
function handleLogoClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAdminLoggedIn) return;
    
    console.log('📷 Logo clicked - opening image browser...');
    
    // Use the global admin image manager to open the image browser
    if (window.adminImageManager) {
        window.adminImageManager.showImageBrowser((imageData) => {
            // Handle both object format and individual parameters
            if (typeof imageData === 'object' && imageData.publicUrl) {
                assignLogoImage(imageData.publicUrl, imageData.signedUrl, imageData.filename);
            } else {
                // Legacy format - assume individual parameters
                assignLogoImage(imageData, arguments[1], arguments[2]);
            }
        });
    } else {
        console.error('❌ Admin image manager not available');
        alert('Image manager not available. Please try again.');
    }
}

/**
 * Assign a new image to the logo
 */
async function assignLogoImage(publicUrl, signedUrl, filename) {
    console.log('🖼️ ASSIGNING LOGO IMAGE...');
    console.log(`  - Raw parameters:`, { publicUrl, signedUrl, filename });
    
    // Handle if publicUrl is accidentally an object
    if (typeof publicUrl === 'object') {
        console.error('❌ Error: publicUrl is an object, not a string:', publicUrl);
        alert('Invalid image data received. Please try selecting the image again.');
        return;
    }
    
    console.log(`  - Filename: ${filename}`);
    console.log(`  - Permanent URL (to save): ${publicUrl}`);
    console.log(`  - Temporary URL (for display): ${signedUrl}`);
    
    try {
        const logoImg = document.querySelector('.logo-img');
        const logo = document.querySelector('.logo');
        
        if (!logoImg || !logo) {
            console.error('❌ Logo elements not found');
            return;
        }
        
        // Validate URLs
        if (!publicUrl || !signedUrl) {
            console.error('❌ Missing URL data:', { publicUrl, signedUrl });
            alert('Missing image URL data. Please try again.');
            return;
        }
        
        // Extract the bucket path from the public URL
        const urlParts = new URL(publicUrl);
        const bucketPath = urlParts.pathname.split('/wolf-property-images/')[1];
        
        console.log(`  - Extracted Bucket Path (to save): ${bucketPath}`);
        
        // Store the pending change
        pendingLogoChange = {
            file_url: publicUrl,
            file_name: bucketPath,
            alt_text: 'Wolf Property Management Logo',
            file_type: filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
        };
        
        // Update the UI immediately with the temporary signed URL
        logoImg.src = signedUrl;
        logo.classList.add('pending-change');
        
        // Track the change in version control system
        if (adminVersionControlUI.isReady()) {
            adminVersionControlUI.trackModification(
                'media',
                'wolf-logo',
                logoImg.src, // old value
                publicUrl,   // new value
                {
                    page: 'global',
                    elementType: 'logo',
                    filename: bucketPath,
                    timestamp: new Date().toISOString()
                }
            );
        }
        
        // Mark as having unsaved changes
        hasUnsavedChanges = true;
        updateSaveStatus();
        
        // Visual feedback
        logoImg.style.border = '3px solid #f39c12';
        setTimeout(() => {
            if (logoImg) {
                logoImg.style.border = '';
            }
        }, 2000);
        
        console.log('✅ Logo change tracked as pending');
        
    } catch (error) {
        console.error('❌ Error during logo assignment:', error);
        alert(`Error assigning logo: ${error.message}`);
    }
}

/**
 * Save logo changes to database
 */
async function saveLogoChanges() {
    if (!pendingLogoChange) {
        console.log('📷 No pending logo changes to save');
        return true;
    }
    
    console.log('💾 Saving logo changes to database...');
    console.log('📋 Logo change data:', pendingLogoChange);
    
    try {
        // First, check if a logo record exists and what page_name it uses
        const { data: existingLogo, error: selectError } = await dbService.supabase
            .from('media_content')
            .select('*')
            .eq('element_id', 'wolf-logo')
            .eq('is_active', true);
        
        if (selectError) {
            console.error('❌ Error checking existing logo:', selectError);
            throw selectError;
        }
        
        console.log('🔍 Existing logo records found:', existingLogo);
        
        let saveResult;
        if (existingLogo && existingLogo.length > 0) {
            // Update existing record using its current page_name
            const currentRecord = existingLogo[0];
            console.log(`📝 Updating existing logo record with page_name: ${currentRecord.page_name}`);
            
            saveResult = await dbService.supabase
                .from('media_content')
                .update({
                    file_name: pendingLogoChange.file_name,
                    file_url: pendingLogoChange.file_url,
                    file_type: pendingLogoChange.file_type,
                    alt_text: pendingLogoChange.alt_text,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentRecord.id);
        } else {
            // Insert new record with 'global' page_name
            console.log('➕ Creating new logo record with page_name: global');
            
            saveResult = await dbService.supabase
                .from('media_content')
                .insert({
                    page_name: 'global',
                    element_id: 'wolf-logo',
                    file_name: pendingLogoChange.file_name,
                    file_url: pendingLogoChange.file_url,
                    file_type: pendingLogoChange.file_type,
                    alt_text: pendingLogoChange.alt_text,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
        }
        
        if (saveResult.error) {
            console.error('❌ Error saving logo to database:', saveResult.error);
            throw saveResult.error;
        }
        
        console.log('✅ Logo saved to database successfully');
        
        // Clear pending change
        pendingLogoChange = null;
        
        // Remove pending indicator
        const logo = document.querySelector('.logo');
        if (logo) {
            logo.classList.remove('pending-change');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Failed to save logo changes:', error);
        return false;
    }
}

