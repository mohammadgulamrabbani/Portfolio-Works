// Future AI Tech - Advanced Interactive Web Application
// Copyright 2025 - Mohammad Gulam Rabbani

'use strict';

// Global configuration and state management
const CONFIG = {
    particles: {
        count: 120,
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
    lerp: (start, end, factor) => start + (end - start) * factor,
    map: (value, inMin, inMax, outMin, outMax) => {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    random: (min, max) => Math.random() * (max - min) + min,
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    degToRad: (degrees) => degrees * (Math.PI / 180),
    radToDeg: (radians) => radians * (180 / Math.PI),
    smoothStep: (edge0, edge1, x) => {
        const t = Utils.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    },
    easing: {
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeOutElastic: t => Math.sin(-13 * (t + 1) * Math.PI / 2) * Math.pow(2, -10 * t) + 1,
        easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t
    },
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
    getOffset: (element) => {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.pageYOffset,
            left: rect.left + window.pageXOffset
        };
    }
};

// Global scroll function for navigation
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const offsetTop = section.offsetTop - 80; // Account for fixed navbar
        
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
        
        appState.setCurrentSection(sectionId);
        
        // Close mobile menu if open
        const navMenu = document.getElementById('nav-menu');
        const navToggle = document.getElementById('nav-toggle');
        if (navMenu && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            navToggle?.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }
}

// Make scrollToSection globally available
window.scrollToSection = scrollToSection;

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
                    App.init();
                }, 1000);
            }
        }, 500);
    }
}

const loadingManager = new LoadingManager();

// Enhanced 3D Scene base class
class Scene3D {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = null;
        this.isRunning = false;
        this.animationId = null;
        this.time = 0;
        this.options = {
            particleCount: options.particleCount || 50,
            type: options.type || 'default',
            ...options
        };
        
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
        this.time += 0.016;
        this.update();
        this.render();
        performanceMonitor.update();
    }

    update() {
        // Override in subclasses
    }

    render() {
        if (!this.ctx) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        
        this.renderDefault();
    }

    renderDefault() {
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.time);
        
        const size = 30;
        this.ctx.strokeStyle = '#32b8c6';
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = '#32b8c6';
        this.ctx.shadowBlur = 10;
        
        this.ctx.strokeRect(-size, -size, size * 2, size * 2);
        
        this.ctx.rotate(-this.time * 2);
        this.ctx.strokeStyle = 'rgba(50, 184, 198, 0.5)';
        this.ctx.strokeRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
        
        this.ctx.restore();
    }

    dispose() {
        this.stop();
    }
}

// Enhanced Hero scene with advanced particle system
class HeroScene extends Scene3D {
    constructor(canvas) {
        super(canvas, { particleCount: appState.isMobile ? 80 : 150 });
        this.particles = [];
        this.shapes = [];
        this.connections = [];
        this.initializeElements();
    }

    initializeElements() {
        const rect = this.canvas?.getBoundingClientRect() || { width: 800, height: 600 };
        
        // Create enhanced particles
        for (let i = 0; i < this.options.particleCount; i++) {
            this.particles.push({
                x: Math.random() * rect.width,
                y: Math.random() * rect.height,
                z: Math.random() * 100,
                size: Math.random() * 3 + 1,
                speed: Math.random() * 0.5 + 0.1,
                angle: Math.random() * Math.PI * 2,
                opacity: Math.random() * 0.5 + 0.3,
                pulsePhase: Math.random() * Math.PI * 2,
                connections: []
            });
        }
        
        // Create geometric shapes
        for (let i = 0; i < 8; i++) {
            this.shapes.push({
                x: Math.random() * rect.width,
                y: Math.random() * rect.height,
                size: Math.random() * 60 + 30,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                type: Math.floor(Math.random() * 4),
                pulse: Math.random() * Math.PI * 2,
                opacity: Math.random() * 0.4 + 0.3
            });
        }
    }

    update() {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = appState.mousePosition.x - rect.left;
        const mouseY = appState.mousePosition.y - rect.top;
        
        // Update particles with mouse interaction
        this.particles.forEach((particle, i) => {
            const mouseDistance = Math.sqrt(
                Math.pow(mouseX - particle.x, 2) + 
                Math.pow(mouseY - particle.y, 2)
            );
            
            if (mouseDistance < 100) {
                const mouseForce = (100 - mouseDistance) / 100;
                const angle = Math.atan2(particle.y - mouseY, particle.x - mouseX);
                particle.x += Math.cos(angle) * mouseForce * 2;
                particle.y += Math.sin(angle) * mouseForce * 2;
            }
            
            particle.x += Math.cos(particle.angle) * particle.speed;
            particle.y += Math.sin(particle.angle) * particle.speed;
            particle.pulsePhase += 0.05;
            
            if (particle.x < 0 || particle.x > rect.width) particle.angle = Math.PI - particle.angle;
            if (particle.y < 0 || particle.y > rect.height) particle.angle = -particle.angle;
            
            particle.x = Math.max(0, Math.min(rect.width, particle.x));
            particle.y = Math.max(0, Math.min(rect.height, particle.y));
            
            // Update connections
            particle.connections = [];
            for (let j = i + 1; j < this.particles.length; j++) {
                const other = this.particles[j];
                const distance = Math.sqrt(
                    Math.pow(particle.x - other.x, 2) + 
                    Math.pow(particle.y - other.y, 2)
                );
                
                if (distance < 120) {
                    particle.connections.push({
                        particle: other,
                        opacity: (120 - distance) / 120
                    });
                }
            }
        });
        
        // Update shapes
        this.shapes.forEach(shape => {
            shape.rotation += shape.rotationSpeed;
            shape.pulse += 0.03;
        });
    }

    render() {
        if (!this.ctx) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        
        // Render connections
        this.particles.forEach(particle => {
            particle.connections.forEach(connection => {
                this.ctx.save();
                this.ctx.globalAlpha = connection.opacity * 0.3;
                this.ctx.strokeStyle = '#32b8c6';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(particle.x, particle.y);
                this.ctx.lineTo(connection.particle.x, connection.particle.y);
                this.ctx.stroke();
                this.ctx.restore();
            });
        });
        
        // Render particles
        this.particles.forEach(particle => {
            this.ctx.save();
            const pulse = Math.sin(particle.pulsePhase) * 0.3 + 0.7;
            this.ctx.globalAlpha = particle.opacity * pulse;
            this.ctx.fillStyle = '#32b8c6';
            this.ctx.shadowColor = '#32b8c6';
            this.ctx.shadowBlur = 8;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * pulse, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Render shapes
        this.shapes.forEach(shape => {
            this.ctx.save();
            this.ctx.translate(shape.x, shape.y);
            this.ctx.rotate(shape.rotation);
            
            const pulse = Math.sin(shape.pulse) * 0.2 + 0.8;
            this.ctx.globalAlpha = shape.opacity * pulse;
            this.ctx.strokeStyle = '#32b8c6';
            this.ctx.lineWidth = 2;
            this.ctx.shadowColor = '#32b8c6';
            this.ctx.shadowBlur = 15;
            
            const size = shape.size * pulse;
            
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
                case 3: // diamond
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -size/2);
                    this.ctx.lineTo(size/2, 0);
                    this.ctx.lineTo(0, size/2);
                    this.ctx.lineTo(-size/2, 0);
                    this.ctx.closePath();
                    this.ctx.stroke();
                    break;
            }
            
            this.ctx.restore();
        });
    }
}

// Advanced canvas scene for various effects
class CanvasScene extends Scene3D {
    constructor(canvas, type = 'default') {
        super(canvas, { type });
        this.elements = [];
        this.initElements();
    }

    initElements() {
        const elementCount = appState.isMobile ? 15 : 25;
        
        for (let i = 0; i < elementCount; i++) {
            this.elements.push({
                x: Math.random() * 200 - 100,
                y: Math.random() * 200 - 100,
                size: Math.random() * 20 + 5,
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.02 + 0.01,
                opacity: Math.random() * 0.5 + 0.3,
                type: Math.floor(Math.random() * 3)
            });
        }
    }

    render() {
        if (!this.ctx) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        
        switch (this.options.type) {
            case 'hologram':
                this.renderHologram();
                break;
            case 'network':
                this.renderNetwork();
                break;
            case 'particle':
                this.renderParticleSystem();
                break;
            case 'neural':
                this.renderNeuralNetwork();
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
            this.ctx.globalAlpha = 0.8 - i * 0.2;
            
            const size = 40 + i * 20;
            this.ctx.strokeRect(-size, -size, size * 2, size * 2);
            
            // Add inner details
            this.ctx.strokeRect(-size * 0.6, -size * 0.6, size * 1.2, size * 1.2);
            
            this.ctx.restore();
        }
        
        // Add scanning lines
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = '#32b8c6';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < 8; i++) {
            const y = -60 + (i * 15) + (this.time * 20) % 120;
            this.ctx.beginPath();
            this.ctx.moveTo(-60, y);
            this.ctx.lineTo(60, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    renderNetwork() {
        const nodes = 12;
        const radius = 80;
        
        this.ctx.strokeStyle = '#32b8c6';
        this.ctx.fillStyle = '#32b8c6';
        this.ctx.lineWidth = 1;
        this.ctx.shadowColor = '#32b8c6';
        this.ctx.shadowBlur = 8;
        
        const positions = [];
        
        // Draw nodes
        for (let i = 0; i < nodes; i++) {
            const angle = (i / nodes) * Math.PI * 2 + this.time * 0.5;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            positions.push({x, y});
            
            const pulse = Math.sin(this.time * 2 + i) * 0.5 + 1;
            this.ctx.save();
            this.ctx.globalAlpha = 0.8;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4 * pulse, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        
        // Draw connections
        this.ctx.globalAlpha = 0.4;
        positions.forEach((pos1, i) => {
            positions.forEach((pos2, j) => {
                if (i !== j) {
                    const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
                    if (distance < radius * 1.2) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(pos1.x, pos1.y);
                        this.ctx.lineTo(pos2.x, pos2.y);
                        this.ctx.stroke();
                    }
                }
            });
        });
        
        // Add central core
        this.ctx.save();
        this.ctx.globalAlpha = 0.6;
        this.ctx.fillStyle = '#32b8c6';
        this.ctx.shadowBlur = 20;
        const coreSize = 8 + Math.sin(this.time * 3) * 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    renderParticleSystem() {
        this.elements.forEach((element, i) => {
            element.angle += element.speed;
            
            const distance = 40 + Math.sin(this.time * 2 + i) * 25;
            const x = Math.cos(element.angle) * distance;
            const y = Math.sin(element.angle) * distance;
            const size = element.size * (0.8 + Math.sin(this.time * 3 + i) * 0.4);
            
            this.ctx.save();
            this.ctx.globalAlpha = element.opacity;
            this.ctx.fillStyle = '#32b8c6';
            this.ctx.shadowColor = '#32b8c6';
            this.ctx.shadowBlur = 10;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
        
        // Add energy waves
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = '#32b8c6';
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < 3; i++) {
            const radius = 30 + i * 20 + (this.time * 30) % 60;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    renderNeuralNetwork() {
        // Create a more complex neural network visualization
        const layers = [6, 8, 6, 4];
        const layerSpacing = 120;
        const nodeSpacing = 30;
        
        this.ctx.strokeStyle = '#32b8c6';
        this.ctx.fillStyle = '#32b8c6';
        this.ctx.lineWidth = 1;
        this.ctx.shadowColor = '#32b8c6';
        this.ctx.shadowBlur = 5;
        
        const allNodes = [];
        
        // Draw layers and nodes
        layers.forEach((nodeCount, layerIndex) => {
            const layerNodes = [];
            const startY = -(nodeCount - 1) * nodeSpacing / 2;
            const x = -layerSpacing * (layers.length - 1) / 2 + layerIndex * layerSpacing;
            
            for (let i = 0; i < nodeCount; i++) {
                const y = startY + i * nodeSpacing;
                const activation = Math.sin(this.time * 2 + layerIndex + i) * 0.5 + 0.5;
                
                layerNodes.push({x, y, activation});
                
                this.ctx.save();
                this.ctx.globalAlpha = 0.3 + activation * 0.7;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 6, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
            
            allNodes.push(layerNodes);
        });
        
        // Draw connections
        this.ctx.globalAlpha = 0.2;
        for (let i = 0; i < allNodes.length - 1; i++) {
            allNodes[i].forEach(node1 => {
                allNodes[i + 1].forEach(node2 => {
                    const strength = (node1.activation + node2.activation) / 2;
                    this.ctx.save();
                    this.ctx.globalAlpha = 0.1 + strength * 0.3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(node1.x, node1.y);
                    this.ctx.lineTo(node2.x, node2.y);
                    this.ctx.stroke();
                    this.ctx.restore();
                });
            });
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
        
        if (this.cursor && !appState.isMobile) {
            this.init();
        }
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseenter', this.show.bind(this));
        document.addEventListener('mouseleave', this.hide.bind(this));
        
        const interactiveElements = document.querySelectorAll('a, button, .service-card, .project-card, .member-card, .nav-link');
        
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

// Enhanced Navigation manager
class NavigationManager {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.navToggle = document.getElementById('nav-toggle');
        this.navMenu = document.getElementById('nav-menu');
        this.sections = document.querySelectorAll('.section, .hero');
        this.backToTop = document.getElementById('back-to-top');
        this.currentSection = 'home';
        this.isMenuOpen = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateActiveLink();
        this.setupSocialLinks();
    }

    setupEventListeners() {
        // Smooth scrolling for navigation links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.scrollToSection(targetId);
                this.closeMenu();
            });
        });

        // Mobile menu toggle
        if (this.navToggle) {
            this.navToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMenu();
            });
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && !this.navbar.contains(e.target)) {
                this.closeMenu();
            }
        });

        // Scroll events
        window.addEventListener('scroll', Utils.throttle(() => {
            this.updateNavbarStyle();
            this.updateActiveLink();
            this.updateBackToTop();
        }, 100));

        // Back to top button
        if (this.backToTop) {
            this.backToTop.addEventListener('click', (e) => {
                e.preventDefault();
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }

        // Footer links
        document.querySelectorAll('.footer-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    this.scrollToSection(targetId);
                }
            });
        });
    }

    setupSocialLinks() {
        // Setup all social media links to open in new tabs
        const socialLinks = document.querySelectorAll('a[href*="linkedin.com"], a[href*="github.com"], a[href*="mohammadgulamrabbani.github.io"]');
        
        socialLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = link.getAttribute('href');
                if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            });
        });
    }

    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        
        if (this.navMenu) {
            this.navMenu.classList.toggle('active');
        }
        
        if (this.navToggle) {
            this.navToggle.classList.toggle('active');
        }
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = this.isMenuOpen ? 'hidden' : 'auto';
    }

    closeMenu() {
        this.isMenuOpen = false;
        
        if (this.navMenu) {
            this.navMenu.classList.remove('active');
        }
        
        if (this.navToggle) {
            this.navToggle.classList.remove('active');
        }
        
        document.body.style.overflow = 'auto';
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const offsetTop = section.offsetTop - 80;
            
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

    updateBackToTop() {
        const scrollY = window.scrollY;
        
        if (scrollY > 500) {
            this.backToTop?.classList.remove('hidden');
        } else {
            this.backToTop?.classList.add('hidden');
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

// Enhanced Animation manager
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
        this.setupParallaxEffect();
    }

    setupScrollAnimations() {
        const animatedElements = document.querySelectorAll(
            '.service-card, .tech-item, .project-card, .member-card, .info-item, .stat-card'
        );
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('animate-fade-in-up');
                    }, index * 100);
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

    setupParallaxEffect() {
        const parallaxElements = document.querySelectorAll('.hero-canvas, .section');
        
        window.addEventListener('scroll', Utils.throttle(() => {
            const scrolled = window.pageYOffset;
            
            parallaxElements.forEach(element => {
                const rate = scrolled * -0.5;
                if (element.classList.contains('hero-canvas')) {
                    element.style.transform = `translateY(${rate}px)`;
                }
            });
        }, 16));
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

// Enhanced Form manager
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
            
            // Remove focused states
            this.inputs?.forEach(input => {
                const formGroup = input.closest('.form-group');
                formGroup?.classList.remove('focused', 'has-value');
            });
        }, 2000);
    }

    showSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'success-message';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, rgba(50, 184, 198, 0.95), rgba(50, 184, 198, 0.8));
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            z-index: 10000;
            font-family: 'Rajdhani', sans-serif;
            font-size: 16px;
            font-weight: 500;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(50, 184, 198, 0.5);
            box-shadow: 0 8px 32px rgba(50, 184, 198, 0.3);
            animation: slideInSuccess 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            max-width: 300px;
        `;
        message.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 20px;">✅</div>
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">Message Sent!</div>
                    <div style="font-size: 14px; opacity: 0.9;">I'll get back to you soon.</div>
                </div>
            </div>
        `;
        
        // Add animation styles if not already present
        if (!document.getElementById('success-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'success-animation-styles';
            style.textContent = `
                @keyframes slideInSuccess {
                    from { 
                        transform: translateX(100%) translateY(-20px); 
                        opacity: 0;
                        scale: 0.8;
                    }
                    to { 
                        transform: translateX(0) translateY(0); 
                        opacity: 1;
                        scale: 1;
                    }
                }
                @keyframes slideOutSuccess {
                    from { 
                        transform: translateX(0) translateY(0); 
                        opacity: 1;
                        scale: 1;
                    }
                    to { 
                        transform: translateX(100%) translateY(-20px); 
                        opacity: 0;
                        scale: 0.8;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'slideOutSuccess 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            setTimeout(() => {
                message.remove();
            }, 500);
        }, 4000);
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
        
        console.log('Initializing Future AI Tech Application...');
        
        this.initializeManagers();
        this.initializeScenes();
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('Future AI Tech Application initialized successfully!');
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

        // About hologram scene
        const aboutCanvas = document.getElementById('about-canvas');
        if (aboutCanvas) {
            const aboutScene = new CanvasScene(aboutCanvas, 'hologram');
            this.scenes.set('about', aboutScene);
        }

        // Tech network scene
        const techCanvas = document.getElementById('tech-canvas');
        if (techCanvas) {
            const techScene = new CanvasScene(techCanvas, 'network');
            this.scenes.set('tech', techScene);
        }

        // Footer network scene
        const footerCanvas = document.getElementById('footer-canvas');
        if (footerCanvas) {
            const footerScene = new CanvasScene(footerCanvas, 'neural');
            this.scenes.set('footer', footerScene);
        }

        // Service canvases
        document.querySelectorAll('.service-canvas').forEach((canvas, index) => {
            const types = ['particle', 'hologram', 'network', 'neural'];
            const scene = new CanvasScene(canvas, types[index] || 'particle');
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
            const scene = new CanvasScene(canvas, 'network');
            this.scenes.set(`icon-${index}`, scene);
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 300));

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAnimations();
            } else {
                this.resumeAnimations();
            }
        });

        // Enhanced keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.managers.get('navigation')?.closeMenu();
            }
        });
    }

    handleResize() {
        appState.isMobile = window.innerWidth < CONFIG.breakpoints.mobile;
        
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
    console.log('DOM loaded, starting Future AI Tech application...');
    
    document.body.style.overflow = 'hidden';
    
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        loadingManager.updateProgress(Math.min(progress, 100));
        
        if (progress >= 100) {
            clearInterval(loadingInterval);
        }
    }, 200);
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