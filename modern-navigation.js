/**
 * Modern Navigation - Enhanced functionality
 * Handles mobile menu, scroll effects, and accessibility
 */

class ModernNavigation {
    constructor() {
        this.header = document.querySelector('.modern-header');
        this.mobileToggle = document.querySelector('.mobile-menu-toggle');
        this.navigation = document.querySelector('.main-navigation');
        this.navLinks = document.querySelectorAll('.nav-link');
        
        this.isMenuOpen = false;
        this.lastScrollY = window.scrollY;
        this.scrollThreshold = 10;
        
        this.init();
    }

    init() {
        if (!this.header) return;
        
        this.setupEventListeners();
        this.handleInitialLoad();
        
        console.log('🧭 Modern Navigation: Initialized successfully');
    }

    setupEventListeners() {
        // Mobile menu toggle
        if (this.mobileToggle) {
            this.mobileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileMenu();
            });
        }

        // Close mobile menu when clicking nav links
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.closeMobileMenu();
                }
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && 
                !this.navigation.contains(e.target) && 
                !this.mobileToggle.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // Handle scroll effects
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isMenuOpen) {
                this.closeMobileMenu();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMobileMenu();
            }
        });

        // Update active nav link based on current page
        this.updateActiveNavLink();
    }

    handleInitialLoad() {
        // Add scrolled class if page is already scrolled
        if (window.scrollY > this.scrollThreshold) {
            this.header.classList.add('scrolled');
        }

        // Smooth entrance animation
        setTimeout(() => {
            this.header.classList.add('loaded');
        }, 100);
    }

    toggleMobileMenu() {
        if (this.isMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        this.isMenuOpen = true;
        this.navigation.classList.add('mobile-open');
        this.mobileToggle.classList.add('active');
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden';
        
        // Focus management
        this.navigation.setAttribute('aria-expanded', 'true');
        
        // Animate menu items
        this.animateMenuItems(true);
    }

    closeMobileMenu() {
        this.isMenuOpen = false;
        this.navigation.classList.remove('mobile-open');
        this.mobileToggle.classList.remove('active');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Focus management
        this.navigation.setAttribute('aria-expanded', 'false');
        
        // Animate menu items
        this.animateMenuItems(false);
    }

    animateMenuItems(opening) {
        const navItems = this.navigation.querySelectorAll('.nav-item');
        
        navItems.forEach((item, index) => {
            if (opening) {
                setTimeout(() => {
                    item.style.transform = 'translateY(0)';
                    item.style.opacity = '1';
                }, index * 50);
            } else {
                item.style.transform = 'translateY(-20px)';
                item.style.opacity = '0';
            }
        });
    }

    handleScroll() {
        const currentScrollY = window.scrollY;
        
        // Add/remove scrolled class
        if (currentScrollY > this.scrollThreshold) {
            this.header.classList.add('scrolled');
        } else {
            this.header.classList.remove('scrolled');
        }

        // Smart navigation hide/show
        if (currentScrollY > this.lastScrollY && currentScrollY > 100) {
            // Scrolling down - hide nav
            this.header.classList.add('hide-nav');
            this.header.classList.remove('show-nav');
        } else {
            // Scrolling up - show nav
            this.header.classList.remove('hide-nav');
            this.header.classList.add('show-nav');
        }

        this.lastScrollY = currentScrollY;
    }

    updateActiveNavLink() {
        const currentPath = window.location.pathname;
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            
            const href = link.getAttribute('href');
            
            // Check for exact match or page match
            if ((currentPath === '/' || currentPath.includes('index.html')) && 
                (href === '#home' || href.includes('index.html'))) {
                link.classList.add('active');
            } else if (currentPath.includes('about.html') && href.includes('about.html')) {
                link.classList.add('active');
            }
        });
    }

    // Public API methods
    setActiveLink(linkElement) {
        this.navLinks.forEach(link => link.classList.remove('active'));
        linkElement.classList.add('active');
    }

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    highlightNavOnScroll() {
        // Add intersection observer for section highlighting
        const sections = document.querySelectorAll('section[id]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const targetLink = document.querySelector(`[href="#${entry.target.id}"]`);
                    if (targetLink) {
                        this.setActiveLink(targetLink);
                    }
                }
            });
        }, {
            threshold: 0.3,
            rootMargin: '-80px 0px -80px 0px'
        });

        sections.forEach(section => observer.observe(section));
    }
}

// Enhanced logo click functionality
function setupLogoInteraction() {
    const logo = document.querySelector('.logo');
    if (!logo) return;

    logo.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Navigate to home if not already there
        if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
            window.location.href = '/';
        } else {
            // Smooth scroll to top with animation
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    });
}

// Search button functionality
function setupSearchButton() {
    const searchBtn = document.querySelector('.search-btn');
    if (!searchBtn) return;

    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Create search overlay or modal
        // For now, just show an alert
        alert('Search functionality coming soon!');
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const navigation = new ModernNavigation();
    setupLogoInteraction();
    setupSearchButton();
    
    // Enable section highlighting on scroll
    navigation.highlightNavOnScroll();
    
    // Expose navigation instance globally for debugging
    window.ModernNavigation = navigation;
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Update active nav link when user returns to tab
        const navigation = window.ModernNavigation;
        if (navigation) {
            navigation.updateActiveNavLink();
        }
    }
});

console.log('🧭 Modern Navigation: Script loaded successfully'); 