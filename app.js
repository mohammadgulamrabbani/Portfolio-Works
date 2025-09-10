// Future Tech - Advanced 3D Web Application
// Copyright 2025 - Cutting-edge WebGL and Three.js Implementation

'use strict';

// Global variables and configuration
const CONFIG = {
    particles: {
        count: 150,
        speed: 0.5,
        size: 2,
        opacity: 0.7,
        connections: true,
        connectionDistance: 100
    },
    animations: {
        duration: 1000,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        stagger: 100
    },
    performance: {
        targetFPS: 60,
        adaptiveQuality: true,
        enableStats: false
    },
    breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
    }
};

// Application state management
class AppState {
    constructor() {
        this.isLoaded = false;
        this.currentSection = 'home';
        this.isScrolling = false;
        this.mousePosition = { x: 0, y: 0 };
        this.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.isMobile = window.innerWidth < CONFIG.breakpoints.mobile;
        this.scenes = new Map();
        this.animationFrameId = null;
        this.loadingProgress = 0;
    }

    updateMousePosition(x, y) {
        this.mousePosition.x = x;
        this.mousePosition.y = y;
    }

    setCurrentSection(section) {
        this.currentSection = section;
    }

    addScene(id, scene) {
        this.scenes.set(id, scene);
    }

    getScene(id) {
        return this.scenes.get(id);
    }
}

// Initialize application state
const appState = new AppState();

// Utility functions
const Utils = {
    // Linear interpolation
    lerp: (start, end, factor) => start + (end - start) * factor,

    // Map value from one range to another
    map: (value, inMin, inMax, outMin, outMax) => {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },

    // Clamp value between min and max
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),

    // Random number between min and max
    random: (min, max) => Math.random() * (max - min) + min,

    // Random integer between min and max
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

    // Convert degrees to radians
    degToRad: (degrees) => degrees * (Math.PI / 180),

    // Convert radians to degrees
    radToDeg: (radians) => radians * (180 / Math.PI),

    // Smooth step function
    smoothStep: (edge0, edge1, x) => {
        const t = Utils.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    },

    // Easing functions
    easing: {
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeOutElastic: t => Math.sin(-13 * (t + 1) * Math.PI / 2) * Math.pow(2, -10 * t) + 1,
        easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t
    },

    // Throttle function
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Check if element is in viewport
    isInViewport: (element, threshold = 0) => {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        return (
            rect.top <= windowHeight - threshold &&
            rect.bottom >= threshold &&
            rect.left <= windowWidth - threshold &&
            rect.right >= threshold
        );
    },

    // Get element offset
    getOffset: (element) => {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset
        };
    }
};

// Performance monitor
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.fps = 60;
        this.lastTime = performance.now();
        this.fpsArray = [];
        this.qualityLevel = 1;
    }

    update() {
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime >= this.lastTime + 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.fpsArray.push(this.fps);
            
            if (this.fpsArray.length > 10) {
                this.fpsArray.shift();
            }
            
            this.adjustQuality();
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }

    adjustQuality() {
        if (!CONFIG.performance.adaptiveQuality) return;
        
        const averageFPS = this.fpsArray.reduce((a, b) => a + b, 0) / this.fpsArray.length;
        
        if (averageFPS < 30 && this.qualityLevel > 0.5) {
            this.qualityLevel -= 0.1;
        } else if (averageFPS > 50 && this.qualityLevel < 1) {
            this.qualityLevel += 0.1;
        }
        
        this.qualityLevel = Utils.clamp(this.qualityLevel, 0.3, 1);
    }

    getQualityLevel() {
        return this.qualityLevel;
    }

    getFPS() {
        return this.fps;
    }
}

const performanceMonitor = new PerformanceMonitor();

// Loading screen manager
class LoadingManager {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBar = document.querySelector('.loading-progress');
        this.percentageText = document.querySelector('.loading-percentage');
        this.loadingParticles = document.querySelector('.loading-particles');
        this.progress = 0;
        this.isComplete = false;
        
        this.initParticles();
    }

    initParticles() {
        if (appState.isReducedMotion || !this.loadingParticles) return;
        
        const particleCount = appState.isMobile ? 30 : 60;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'loading-particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Utils.random(2, 6)}px;
                height: ${Utils.random(2, 6)}px;
                background: rgba(50, 184, 198, ${Utils.random(0.3, 0.8)});
                border-radius: 50%;
                left: ${Utils.random(0, 100)}%;
                top: ${Utils.random(0, 100)}%;
                animation: particleFloat ${Utils.random(3, 8)}s ease-in-out infinite;
                animation-delay: ${Utils.random(0, 2)}s;
                box-shadow: 0 0 10px rgba(50, 184, 198, 0.5);
            `;
            this.loadingParticles.appendChild(particle);
        }
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes particleFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
                50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    updateProgress(targetProgress) {
        this.progress = Math.min(targetProgress, 100);
        
        if (this.progressBar) {
            this.progressBar.style.width = `${this.progress}%`;
        }
        
        if (this.percentageText) {
            this.percentageText.textContent = `${Math.round(this.progress)}%`;
        }
        
        if (this.progress >= 100 && !this.isComplete) {
            this.complete();
        }
    }

    complete() {
        this.isComplete = true;
        
        setTimeout(() => {
            if (this.loadingScreen) {
                this.loadingScreen.classList.add('loaded');
                appState.isLoaded = true;
                
                setTimeout(() => {
                    this.loadingScreen.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    
                    // Initialize main application
                    App.init();
                }, 1000);
            }
        }, 500);
    }
}

const loadingManager = new LoadingManager();

// Simplified 3D Scene base class that works without Three.js dependency
class Scene3D {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = null;
        this.isRunning = false;
        this.animationId = null;
        
        if (this.canvas) {
            this.init();
        }
    }

    init() {
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) return;
        
        this.setupCanvas();
        this.start();
    }

    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    start() {
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    animate() {
        if (!this.isRunning) return;
        
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        this.update();
        this.render();
    }

    update() {
        // Override in subclasses
    }

    render() {
        if (!this.ctx) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        
        // Default rendering - draw animated geometric shape
        this.renderDefault();
    }

    renderDefault() {
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const time = Date.now() * 0.001;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(time);
        
        // Draw animated wireframe cube
        const size = 30;
        this.ctx.strokeStyle = '#32b8c6';
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = '#32b8c6';
        this.ctx.shadowBlur = 10;
        
        this.ctx.strokeRect(-size, -size, size * 2, size * 2);
        
        // Draw inner rotation
        this.ctx.rotate(-time * 2);
        this.ctx.strokeStyle = 'rgba(50, 184, 198, 0.5)';
        this.ctx.strokeRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
        
        this.ctx.restore();
    }

    dispose() {
        this.stop();
    }
}

// Hero section scene
class HeroScene extends Scene3D {
    constructor(canvas) {
        super(canvas);
        this.particles = [];
        this.shapes = [];
        this.initializeElements();
    }

    initializeElements() {
        // Create particles
        const particleCount = appState.isMobile ? 50 : 100;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * (this.canvas?.clientWidth || 800),
                y: Math.random() * (this.canvas?.clientHeight || 600),
                size: Math.random() * 3 + 1,
                speed: Math.random() * 0.5 + 0.1,
                angle: Math.random() * Math.PI * 2,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
        
        // Create geometric shapes
        for (let i = 0; i < 5; i++) {
            this.shapes.push({
                x: Math.random() * (this.canvas?.clientWidth || 800),
                y: Math.random() * (this.canvas?.clientHeight || 600),
                size: Math.random() * 40 + 20,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                type: Math.floor(Math.random() * 3) // 0: cube, 1: circle, 2: triangle
            });
        }
    }

    update() {
        if (!this.canvas) return;
        
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        // Update particles
        this.particles.forEach(particle => {
            particle.x += Math.cos(particle.angle) * particle.speed;
            particle.y += Math.sin(particle.angle) * particle.speed;
            
            if (particle.x < 0 || particle.x > width) particle.angle = Math.PI - particle.angle;
            if (particle.y < 0 || particle.y > height) particle.angle = -particle.angle;
            
            particle.x = Math.max(0, Math.min(width, particle.x));
            particle.y = Math.max(0, Math.min(height, particle.y));
        });
        
        // Update shapes
        this.shapes.forEach(shape => {
            shape.rotation += shape.rotationSpeed;
        });
    }

    render() {
        if (!this.ctx) return;
        
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.ctx.clearRect(0, 0, width, height);
        
        // Render particles
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fillStyle = '#32b8c6';
            this.ctx.shadowColor = '#32b8c6';
            this.ctx.shadowBlur = 5;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Render shapes
        this.shapes.forEach(shape => {
            this.ctx.save();
            this.ctx.translate(shape.x, shape.y);
            this.ctx.rotate(shape.rotation);
            this.ctx.strokeStyle = '#32b8c6';
            this.ctx.lineWidth = 2;
            this.ctx.shadowColor = '#32b8c6';
            this.ctx.shadowBlur = 10;
            this.ctx.globalAlpha = 0.7;
            
            const size = shape.size;
            
            switch (shape.type) {
                case 0: // cube
                    this.ctx.strokeRect(-size/2, -size/2, size, size);
                    break;
                case 1: // circle
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, size/2, 0, Math.PI * 2);
                    this.ctx.stroke();
                    break;
                case 2: // triangle
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -size/2);
                    this.ctx.lineTo(-size/2, size/2);
                    this.ctx.lineTo(size/2, size/2);
                    this.ctx.closePath();
                    this.ctx.stroke();
                    break;
            }
            
            this.ctx.restore();
        });
    }
}

// Simple canvas scene for other sections
class CanvasScene extends Scene3D {
    constructor(canvas, type = 'default') {
        super(canvas);
        this.type = type;
        this.time = 0;
    }

    update() {
        this.time += 0.01;
    }

    render() {
        if (!this.ctx) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        this.ctx.clearRect(0, 0, width, height);
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        
        switch (this.type) {
            case 'hologram':
                this.renderHologram();
                break;
            case 'network':
                this.renderNetwork();
                break;
            case 'particle':
                this.renderParticleSystem();
                break;
            default:
                this.renderDefault();
                break;
        }
        
        this.ctx.restore();
    }

    renderHologram() {
        this.ctx.strokeStyle = '#32b8c6';
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = '#32b8c6';
        this.ctx.shadowBlur = 15;
        
        for (let i = 0; i < 3; i++) {
            this.ctx.save();
            this.ctx.rotate(this.time + i * Math.PI / 3);
            this.ctx.globalAlpha = 0.7 - i * 0.2;
            
            const size = 40 + i * 20;
            this.ctx.strokeRect(-size, -size, size * 2, size * 2);
            
            this.ctx.restore();
        }
    }

    renderNetwork() {
        const nodes = 8;
        const radius = 60;
        
        this.ctx.strokeStyle = '#32b8c6';
        this.ctx.fillStyle = '#32b8c6';
        this.ctx.lineWidth = 1;
        this.ctx.shadowColor = '#32b8c6';
        this.ctx.shadowBlur = 5;
        
        const positions = [];
        
        // Draw nodes
        for (let i = 0; i < nodes; i++) {
            const angle = (i / nodes) * Math.PI * 2 + this.time;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            positions.push({x, y});
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw connections
        this.ctx.globalAlpha = 0.3;
        positions.forEach((pos1, i) => {
            positions.forEach((pos2, j) => {
                if (i !== j && Math.random() > 0.7) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(pos1.x, pos1.y);
                    this.ctx.lineTo(pos2.x, pos2.y);
                    this.ctx.stroke();
                }
            });
        });
    }

    renderParticleSystem() {
        const particles = 20;
        
        this.ctx.fillStyle = '#32b8c6';
        this.ctx.shadowColor = '#32b8c6';
        this.ctx.shadowBlur = 8;
        
        for (let i = 0; i < particles; i++) {
            const angle = (i / particles) * Math.PI * 2 + this.time;
            const distance = 30 + Math.sin(this.time * 2 + i) * 20;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const size = 2 + Math.sin(this.time * 3 + i) * 1;
            
            this.ctx.globalAlpha = 0.5 + Math.sin(this.time * 2 + i) * 0.3;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}

// Cursor effect manager
class CursorManager {
    constructor() {
        this.cursor = document.getElementById('cursor');
        this.cursorInner = this.cursor?.querySelector('.cursor-inner');
        this.cursorOuter = this.cursor?.querySelector('.cursor-outer');
        this.isVisible = false;
        
        if (this.cursor) {
            this.init();
        }
    }

    init() {
        if (appState.isMobile) {
            this.cursor.style.display = 'none';
            return;
        }
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseenter', this.show.bind(this));
        document.addEventListener('mouseleave', this.hide.bind(this));
        
        // Add hover effects for interactive elements
        const interactiveElements = document.querySelectorAll('a, button, .service-card, .project-card, .member-card');
        
        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', () => this.cursor?.classList.add('hover'));
            element.addEventListener('mouseleave', () => this.cursor?.classList.remove('hover'));
        });
    }

    onMouseMove(e) {
        if (!this.isVisible) this.show();
        
        const x = e.clientX;
        const y = e.clientY;
        
        appState.updateMousePosition(x, y);
        
        requestAnimationFrame(() => {
            if (this.cursorInner) {
                this.cursorInner.style.transform = `translate(${x}px, ${y}px)`;
            }
            if (this.cursorOuter) {
                this.cursorOuter.style.transform = `translate(${x}px, ${y}px)`;
            }
        });
    }

    show() {
        this.isVisible = true;
        if (this.cursor) {
            this.cursor.style.opacity = '1';
        }
    }

    hide() {
        this.isVisible = false;
        if (this.cursor) {
            this.cursor.style.opacity = '0';
        }
    }
}

// Navigation manager
class NavigationManager {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.navToggle = document.querySelector('.nav-toggle');
        this.sections = document.querySelectorAll('.section, .hero');
        this.currentSection = 'home';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateActiveLink();
    }

    setupEventListeners() {
        // Smooth scrolling for navigation links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.scrollToSection(targetId);
            });
        });

        // Scroll event for navbar styling and active link updates
        window.addEventListener('scroll', Utils.throttle(() => {
            this.updateNavbarStyle();
            this.updateActiveLink();
        }, 100));
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const offsetTop = section.offsetTop - 80; // Account for fixed navbar
            
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
            
            appState.setCurrentSection(sectionId);
        }
    }

    updateNavbarStyle() {
        const scrollY = window.scrollY;
        
        if (scrollY > 100) {
            this.navbar?.classList.add('scrolled');
        } else {
            this.navbar?.classList.remove('scrolled');
        }
    }

    updateActiveLink() {
        let currentSection = 'home';
        
        this.sections.forEach(section => {
            const sectionTop = section.offsetTop - 150;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            if (window.scrollY >= sectionTop && window.scrollY < sectionBottom) {
                currentSection = section.id;
            }
        });
        
        if (currentSection !== this.currentSection) {
            this.currentSection = currentSection;
            appState.setCurrentSection(currentSection);
            
            this.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${currentSection}`) {
                    link.classList.add('active');
                }
            });
        }
    }
}

// Animation manager using Intersection Observer
class AnimationManager {
    constructor() {
        this.observers = new Map();
        this.init();
    }

    init() {
        if (appState.isReducedMotion) return;
        
        this.setupScrollAnimations();
        this.setupCounterAnimations();
        this.setupProgressBarAnimations();
    }

    setupScrollAnimations() {
        const animatedElements = document.querySelectorAll(
            '.service-card, .tech-item, .project-card, .member-card, .info-item'
        );
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in-up');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '-50px'
        });
        
        animatedElements.forEach(element => {
            observer.observe(element);
        });
        
        this.observers.set('scroll', observer);
    }

    setupCounterAnimations() {
        const counters = document.querySelectorAll('.stat-number[data-target]');
        
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.5
        });
        
        counters.forEach(counter => {
            counterObserver.observe(counter);
        });
        
        this.observers.set('counter', counterObserver);
    }

    setupProgressBarAnimations() {
        const progressBars = document.querySelectorAll('.tech-progress[data-width]');
        
        const progressObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const width = entry.target.getAttribute('data-width');
                    setTimeout(() => {
                        entry.target.style.width = `${width}%`;
                    }, 300);
                    progressObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.5
        });
        
        progressBars.forEach(bar => {
            progressObserver.observe(bar);
        });
        
        this.observers.set('progress', progressObserver);
    }

    animateCounter(element) {
        const target = parseInt(element.getAttribute('data-target'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    }

    dispose() {
        this.observers.forEach(observer => observer.disconnect());
    }
}

// Form manager for contact form
class FormManager {
    constructor() {
        this.form = document.getElementById('contact-form');
        this.inputs = this.form?.querySelectorAll('.form-control');
        
        if (this.form) {
            this.init();
        }
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
        }
        
        if (this.inputs) {
            this.inputs.forEach(input => {
                input.addEventListener('focus', this.handleFocus.bind(this));
                input.addEventListener('blur', this.handleBlur.bind(this));
                input.addEventListener('input', this.handleInput.bind(this));
            });
        }
    }

    handleFocus(e) {
        const formGroup = e.target.closest('.form-group');
        formGroup?.classList.add('focused');
    }

    handleBlur(e) {
        const formGroup = e.target.closest('.form-group');
        if (!e.target.value) {
            formGroup?.classList.remove('focused');
        }
    }

    handleInput(e) {
        const formGroup = e.target.closest('.form-group');
        if (e.target.value) {
            formGroup?.classList.add('has-value');
        } else {
            formGroup?.classList.remove('has-value');
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = this.form.querySelector('.form-submit');
        const originalText = submitBtn?.querySelector('.btn-text')?.textContent || 'Send Message';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            const btnText = submitBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = 'Sending...';
            }
        }
        
        // Simulate form submission
        setTimeout(() => {
            if (submitBtn) {
                submitBtn.disabled = false;
                const btnText = submitBtn.querySelector('.btn-text');
                if (btnText) {
                    btnText.textContent = originalText;
                }
            }
            
            this.showSuccessMessage();
            this.form.reset();
        }, 2000);
    }

    showSuccessMessage() {
        // Create and show success message
        const message = document.createElement('div');
        message.className = 'success-message';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(50, 184, 198, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        message.textContent = 'Message sent successfully! We\'ll get back to you soon.';
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
}

// Main application class
class App {
    constructor() {
        this.scenes = new Map();
        this.managers = new Map();
        this.isInitialized = false;
    }

    static async init() {
        const app = new App();
        await app.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;
        
        console.log('Initializing Future Tech Application...');
        
        // Initialize managers
        this.initializeManagers();
        
        // Initialize scenes
        this.initializeScenes();
        
        // Setup global event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('Future Tech Application initialized successfully!');
    }

    initializeManagers() {
        this.managers.set('cursor', new CursorManager());
        this.managers.set('navigation', new NavigationManager());
        this.managers.set('animation', new AnimationManager());
        this.managers.set('form', new FormManager());
    }

    initializeScenes() {
        // Hero scene
        const heroCanvas = document.getElementById('hero-canvas');
        if (heroCanvas) {
            const heroScene = new HeroScene(heroCanvas);
            this.scenes.set('hero', heroScene);
        }

        // Initialize other canvas scenes
        const canvasElements = [
            { id: 'about-canvas', type: 'hologram' },
            { id: 'tech-canvas', type: 'network' },
            { id: 'footer-canvas', type: 'network' }
        ];

        canvasElements.forEach(({ id, type }) => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const scene = new CanvasScene(canvas, type);
                this.scenes.set(id, scene);
            }
        });

        // Service canvases
        document.querySelectorAll('.service-canvas').forEach((canvas, index) => {
            const scene = new CanvasScene(canvas, 'particle');
            this.scenes.set(`service-${index}`, scene);
        });

        // Project canvases
        document.querySelectorAll('.project-canvas').forEach((canvas, index) => {
            const scene = new CanvasScene(canvas, 'hologram');
            this.scenes.set(`project-${index}`, scene);
        });

        // Avatar canvases
        document.querySelectorAll('.avatar-canvas').forEach((canvas, index) => {
            const scene = new CanvasScene(canvas, 'particle');
            this.scenes.set(`avatar-${index}`, scene);
        });

        // Icon canvases
        document.querySelectorAll('.icon-canvas').forEach((canvas, index) => {
            const scene = new CanvasScene(canvas, 'default');
            this.scenes.set(`icon-${index}`, scene);
        });
    }

    setupEventListeners() {
        // Window resize handler
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 300));

        // Visibility change handler
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAnimations();
            } else {
                this.resumeAnimations();
            }
        });
    }

    handleResize() {
        appState.isMobile = window.innerWidth < CONFIG.breakpoints.mobile;
        
        // Update all scenes
        this.scenes.forEach(scene => {
            if (scene.setupCanvas) {
                scene.setupCanvas();
            }
        });
    }

    pauseAnimations() {
        this.scenes.forEach(scene => {
            if (scene.stop) {
                scene.stop();
            }
        });
    }

    resumeAnimations() {
        this.scenes.forEach(scene => {
            if (scene.start) {
                scene.start();
            }
        });
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting application...');
    
    // Prevent scrolling during loading
    document.body.style.overflow = 'hidden';
    
    // Start loading simulation with proper timing
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15 + 5; // Random increment between 5-20
        loadingManager.updateProgress(Math.min(progress, 100));
        
        if (progress >= 100) {
            clearInterval(loadingInterval);
        }
    }, 200); // Update every 200ms
});

// Error handling
window.addEventListener('error', (e) => {
    console.error('Application Error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled Promise Rejection:', e.reason);
});

// Performance monitoring
if (CONFIG.performance.enableStats && window.location.hostname === 'localhost') {
    setInterval(() => {
        console.log(`FPS: ${performanceMonitor.getFPS()}, Quality: ${performanceMonitor.getQualityLevel().toFixed(2)}`);
    }, 5000);
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App, Utils, CONFIG };
}