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

    // Admin System Initialization
    initializeAdminSystem();
});

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
    
    // Reset changes
    hasUnsavedChanges = false;
    originalContent = {};
    
    console.log('Admin logged out');
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

function saveChanges() {
    // In a real application, this would send data to a server
    const changes = {};
    
    document.querySelectorAll('.editable-text').forEach(element => {
        const elementId = element.getAttribute('data-editable-id');
        if (elementId && element.textContent !== originalContent[elementId]) {
            changes[elementId] = {
                original: originalContent[elementId],
                new: element.textContent
            };
        }
    });
    
    // Store changes in localStorage for demo purposes
    localStorage.setItem('websiteChanges', JSON.stringify(changes));
    
    // Update original content
    Object.keys(changes).forEach(elementId => {
        const element = document.querySelector(`[data-editable-id="${elementId}"]`);
        if (element) {
            originalContent[elementId] = element.textContent;
        }
    });
    
    hasUnsavedChanges = false;
    updateSaveStatus();
    
    console.log('Changes saved:', changes);
    alert('Changes saved successfully!');
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
    if (hasUnsavedChanges) {
        adminControls.textContent = 'You have unsaved changes. Click on any text to edit. Press Enter to save or Escape to cancel.';
        adminControls.style.color = '#e74c3c';
    } else {
        adminControls.textContent = 'Click on any text to edit. Press Enter to save or Escape to cancel.';
        adminControls.style.color = 'rgba(255, 255, 255, 0.9)';
    }
} 