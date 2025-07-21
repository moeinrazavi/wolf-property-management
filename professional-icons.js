/**
 * Professional Icons - React-Style Dynamic Features
 * Adds advanced interactivity and state management to value card icons
 */

class ProfessionalIconManager {
    constructor() {
        this.icons = new Map();
        this.isInitialized = false;
        this.animationQueue = [];
        this.observerOptions = {
            threshold: 0.3,
            rootMargin: '50px'
        };
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupIcons());
        } else {
            this.setupIcons();
        }
        
        this.isInitialized = true;
    }

    setupIcons() {
        const valueCards = document.querySelectorAll('.value-card');
        
        if (valueCards.length === 0) {
            console.log('🎨 Professional icons: No value cards found, retrying...');
            setTimeout(() => this.setupIcons(), 100);
            return;
        }

        console.log(`🎨 Professional icons: Setting up ${valueCards.length} icons with React-style features`);

        valueCards.forEach((card, index) => {
            this.setupIconInteractions(card, index);
        });

        this.setupIntersectionObserver();
        this.setupGlobalEventListeners();
        
        console.log('✅ Professional icons: All React-style features initialized');
    }

    setupIconInteractions(card, index) {
        const icon = card.querySelector('.value-icon');
        const svg = card.querySelector('.icon-svg');
        
        if (!icon || !svg) return;

        // Store icon data
        const iconData = {
            element: icon,
            svg: svg,
            card: card,
            index: index,
            isVisible: false,
            isHovered: false,
            animationState: 'idle'
        };

        this.icons.set(card, iconData);

        // React-style event handlers
        this.setupMouseEvents(iconData);
        this.setupKeyboardEvents(iconData);
        this.setupTouchEvents(iconData);
    }

    setupMouseEvents(iconData) {
        const { card, icon, svg } = iconData;

        // Enhanced hover with state management
        card.addEventListener('mouseenter', (e) => {
            iconData.isHovered = true;
            this.handleIconHover(iconData, true);
        });

        card.addEventListener('mouseleave', (e) => {
            iconData.isHovered = false;
            this.handleIconHover(iconData, false);
        });

        // Interactive icon click with ripple effect
        icon.addEventListener('click', (e) => {
            this.createRippleEffect(e, icon);
            this.triggerIconAnimation(iconData);
        });

        // Smooth mouse tracking
        card.addEventListener('mousemove', (e) => {
            if (iconData.isHovered) {
                this.handleMouseTracking(e, iconData);
            }
        });
    }

    setupKeyboardEvents(iconData) {
        const { card } = iconData;
        
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.triggerIconAnimation(iconData);
            }
        });

        card.addEventListener('focus', () => {
            iconData.card.classList.add('focused');
        });

        card.addEventListener('blur', () => {
            iconData.card.classList.remove('focused');
        });
    }

    setupTouchEvents(iconData) {
        const { card, icon } = iconData;

        card.addEventListener('touchstart', (e) => {
            this.createRippleEffect(e.touches[0], icon);
            iconData.isHovered = true;
            this.handleIconHover(iconData, true);
        });

        card.addEventListener('touchend', () => {
            setTimeout(() => {
                iconData.isHovered = false;
                this.handleIconHover(iconData, false);
            }, 150);
        });
    }

    handleIconHover(iconData, isHovering) {
        const { card, svg, index } = iconData;
        
        if (isHovering) {
            // Add professional hover class
            card.classList.add('icon-hover-active');
            
            // Staggered animation delay
            setTimeout(() => {
                svg.style.transform = this.getHoverTransform(index);
            }, index * 50);
            
            // Dynamic color enhancement
            this.enhanceIconColors(iconData);
            
        } else {
            card.classList.remove('icon-hover-active');
            svg.style.transform = '';
            this.resetIconColors(iconData);
        }
    }

    getHoverTransform(index) {
        const transforms = [
            'scale(1.15) rotate(5deg)',
            'scale(1.15) translateY(-2px)',
            'scale(1.15) rotateY(10deg)'
        ];
        return transforms[index] || transforms[0];
    }

    enhanceIconColors(iconData) {
        const { svg, index } = iconData;
        const colors = [
            '#ffffff',
            '#ffffff', 
            '#ffffff'
        ];
        
        svg.style.color = colors[index] || colors[0];
        svg.style.filter = 'drop-shadow(0 6px 20px rgba(255, 255, 255, 0.3))';
    }

    resetIconColors(iconData) {
        const { svg, index } = iconData;
        const originalColors = [
            '#f59e0b',
            '#3b82f6',
            '#10b981'
        ];
        
        svg.style.color = originalColors[index] || originalColors[0];
        svg.style.filter = 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))';
    }

    createRippleEffect(event, element) {
        const ripple = document.createElement('div');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.className = 'icon-ripple';
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
            border-radius: 50%;
            transform: scale(0);
            animation: rippleEffect 0.6s ease-out;
            pointer-events: none;
            z-index: 10;
        `;

        element.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    triggerIconAnimation(iconData) {
        if (iconData.animationState === 'animating') return;
        
        iconData.animationState = 'animating';
        const { svg, index } = iconData;
        
        // Different animations for each icon type
        const animations = [
            'iconBounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            'iconWobble 0.8s ease-in-out',
            'iconRotate 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        ];
        
        svg.style.animation = animations[index] || animations[0];
        
        setTimeout(() => {
            svg.style.animation = '';
            iconData.animationState = 'idle';
        }, 800);
    }

    handleMouseTracking(event, iconData) {
        const { card, icon } = iconData;
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (event.clientX - centerX) / rect.width;
        const deltaY = (event.clientY - centerY) / rect.height;
        
        // Subtle 3D tilt effect
        const tiltX = deltaY * 10;
        const tiltY = -deltaX * 10;
        
        icon.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const iconData = this.icons.get(entry.target);
                if (!iconData) return;

                if (entry.isIntersecting && !iconData.isVisible) {
                    iconData.isVisible = true;
                    this.animateIconEntrance(iconData);
                }
            });
        }, this.observerOptions);

        this.icons.forEach((iconData) => {
            observer.observe(iconData.card);
        });
    }

    animateIconEntrance(iconData) {
        const { card, icon, index } = iconData;
        
        // Remove any existing entrance animation
        icon.classList.remove('icon-entrance');
        
        // Add entrance animation with stagger
        setTimeout(() => {
            icon.classList.add('icon-entrance');
            card.classList.add('visible');
        }, index * 100);
    }

    setupGlobalEventListeners() {
        // Handle reduced motion preference
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.handleReducedMotion(mediaQuery);
        mediaQuery.addEventListener('change', this.handleReducedMotion.bind(this));

        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 150);
        });
    }

    handleReducedMotion(mediaQuery) {
        const shouldReduceMotion = mediaQuery.matches;
        document.body.classList.toggle('reduce-motion', shouldReduceMotion);
        
        if (shouldReduceMotion) {
            console.log('🎨 Professional icons: Reduced motion enabled');
        }
    }

    handleResize() {
        this.icons.forEach((iconData) => {
            // Reset transforms on resize
            iconData.svg.style.transform = '';
            iconData.icon.style.transform = '';
        });
    }

    // Public API methods
    refreshIcons() {
        this.icons.clear();
        this.setupIcons();
    }

    getIconState(cardElement) {
        return this.icons.get(cardElement);
    }

    triggerIconByIndex(index) {
        const iconData = Array.from(this.icons.values())[index];
        if (iconData) {
            this.triggerIconAnimation(iconData);
        }
    }
}

// CSS for additional animations
const iconAnimationCSS = `
    @keyframes rippleEffect {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }

    @keyframes iconBounce {
        0%, 100% { transform: scale(1.15) translateY(0); }
        50% { transform: scale(1.25) translateY(-10px); }
    }

    @keyframes iconWobble {
        0%, 100% { transform: scale(1.15) rotate(0deg); }
        25% { transform: scale(1.2) rotate(-5deg); }
        75% { transform: scale(1.2) rotate(5deg); }
    }

    @keyframes iconRotate {
        0% { transform: scale(1.15) rotate(0deg); }
        100% { transform: scale(1.15) rotate(360deg); }
    }

    .icon-entrance {
        animation: iconEnter 0.8s cubic-bezier(0.4, 0, 0.2, 1) both !important;
    }

    .value-card.focused .value-icon {
        outline: 3px solid rgba(59, 130, 246, 0.5);
        outline-offset: 4px;
        border-radius: 50%;
    }

    .value-card.icon-hover-active {
        transform: translateY(-16px);
    }

    .reduce-motion .value-icon,
    .reduce-motion .icon-svg {
        animation: none !important;
        transition: none !important;
    }

    .reduce-motion .value-card:hover .value-icon {
        transform: none !important;
    }
`;

// Inject CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = iconAnimationCSS;
document.head.appendChild(styleSheet);

// Initialize the professional icon manager
const professionalIcons = new ProfessionalIconManager();

// Export for global access
window.ProfessionalIcons = professionalIcons;

console.log('🎨 Professional Icons: React-style features loaded successfully'); 