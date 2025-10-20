// Banking Architecture Presentation JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation toggle
    initializeMobileNavigation();
    
    // Smooth scrolling for anchor links
    initializeSmoothScrolling();
    
    // Interactive architecture diagrams
    initializeArchitectureDiagrams();
    
    // Performance metrics animation
    initializeMetricsAnimation();
    
    // Code syntax highlighting
    initializeCodeHighlighting();
    
    // Interactive tooltips
    initializeTooltips();
    
    // Progress indicator for page sections
    initializeProgressIndicator();
    
    // AWS service hover effects
    initializeAWSServiceInteractions();
});

// Mobile Navigation
function initializeMobileNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

// Smooth Scrolling
function initializeSmoothScrolling() {
    // Page navigation smooth scrolling
    document.querySelectorAll('.page-nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 100; // Account for sticky navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // Update active state
                updateActiveNavLink(targetId);
            }
        });
    });
    
    // Update active nav link on scroll
    window.addEventListener('scroll', throttle(updateActiveNavOnScroll, 100));
}

// Architecture Diagram Interactions
function initializeArchitectureDiagrams() {
    // AWS Service hover effects
    document.querySelectorAll('.aws-service').forEach(service => {
        service.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px) scale(1.02)';
            this.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15)';
            
            // Highlight related services
            highlightRelatedServices(this);
        });
        
        service.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
            
            // Remove highlights
            clearServiceHighlights();
        });
        
        // Add click event for service details
        service.addEventListener('click', function() {
            showServiceDetails(this);
        });
    });
    
    // Interactive architecture layers
    document.querySelectorAll('.layer').forEach(layer => {
        layer.addEventListener('click', function() {
            toggleLayerDetails(this);
        });
    });
}

// Metrics Animation
function initializeMetricsAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateMetrics(entry.target);
            }
        });
    });
    
    document.querySelectorAll('.stat-item, .metric-item').forEach(item => {
        observer.observe(item);
    });
}

function animateMetrics(element) {
    const metricValue = element.querySelector('.stat-number, .metric-value');
    if (!metricValue) return;
    
    const finalValue = metricValue.textContent;
    const numericValue = parseFloat(finalValue.replace(/[^0-9.]/g, ''));
    
    if (isNaN(numericValue)) return;
    
    let current = 0;
    const increment = numericValue / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
            current = numericValue;
            clearInterval(timer);
        }
        
        // Preserve original formatting
        let displayValue = current.toFixed(numericValue % 1 === 0 ? 0 : 1);
        if (finalValue.includes('%')) displayValue += '%';
        if (finalValue.includes('ms')) displayValue += 'ms';
        if (finalValue.includes('x')) displayValue += 'x';
        if (finalValue.includes('$')) displayValue = '$' + displayValue;
        if (finalValue.includes('K')) displayValue += 'K';
        
        metricValue.textContent = displayValue;
    }, 50);
}

// Code Highlighting
function initializeCodeHighlighting() {
    // Ensure Prism.js is loaded
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
        
        // Add copy buttons to code blocks
        document.querySelectorAll('pre code').forEach(codeBlock => {
            const pre = codeBlock.parentElement;
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
            copyButton.title = 'Copy code';
            
            copyButton.addEventListener('click', () => {
                copyToClipboard(codeBlock.textContent);
                copyButton.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            });
            
            pre.style.position = 'relative';
            pre.appendChild(copyButton);
        });
    }
}

// Interactive Tooltips
function initializeTooltips() {
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    document.body.appendChild(tooltip);
    
    // Add tooltips to AWS services
    const tooltipData = {
        'cloudfront': 'Global CDN with 200+ edge locations for fast content delivery',
        'apigateway': 'Fully managed API gateway with authentication and rate limiting',
        'lambda': 'Serverless compute service that runs code without managing servers',
        'ecs': 'Container orchestration service for running Docker containers',
        'rds': 'Managed relational database service with high availability',
        'dynamodb': 'NoSQL database service with single-digit millisecond latency',
        'elasticache': 'In-memory caching service for improved application performance',
        's3': 'Object storage service with 99.999999999% durability',
        'cognito': 'User identity and authentication service',
        'cloudwatch': 'Monitoring and observability service for AWS resources'
    };
    
    document.querySelectorAll('.aws-service').forEach(service => {
        const serviceType = getServiceType(service);
        if (tooltipData[serviceType]) {
            service.addEventListener('mouseenter', (e) => {
                showTooltip(e, tooltipData[serviceType]);
            });
            
            service.addEventListener('mouseleave', hideTooltip);
            service.addEventListener('mousemove', moveTooltip);
        }
    });
}

// Progress Indicator
function initializeProgressIndicator() {
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        
        progressBar.style.width = scrolled + '%';
    });
}

// AWS Service Interactions
function initializeAWSServiceInteractions() {
    // Service relationship mapping
    const serviceRelationships = {
        'cloudfront': ['s3', 'apigateway'],
        'apigateway': ['lambda', 'cognito'],
        'lambda': ['rds', 'dynamodb', 'elasticache'],
        'ecs': ['rds', 'dynamodb', 'elasticache'],
        'rds': ['elasticache'],
        'cognito': ['dynamodb']
    };
    
    document.querySelectorAll('.aws-service').forEach(service => {
        service.addEventListener('click', function(e) {
            e.stopPropagation();
            showServiceModal(this);
        });
    });
}

// Utility Functions
function updateActiveNavLink(targetId) {
    document.querySelectorAll('.page-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === targetId) {
            link.classList.add('active');
        }
    });
}

function updateActiveNavOnScroll() {
    const sections = document.querySelectorAll('.content-section[id]');
    let currentSection = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 150;
        const sectionHeight = section.offsetHeight;
        
        if (window.pageYOffset >= sectionTop && 
            window.pageYOffset < sectionTop + sectionHeight) {
            currentSection = '#' + section.id;
        }
    });
    
    if (currentSection) {
        updateActiveNavLink(currentSection);
    }
}

function highlightRelatedServices(service) {
    const serviceType = getServiceType(service);
    const relationships = {
        'cloudfront': ['s3-origin', 'apigateway-origin'],
        'apigateway': ['lambda-integration', 'cognito-authorizer'],
        'lambda': ['database-connection'],
        'ecs': ['database-connection']
    };
    
    if (relationships[serviceType]) {
        relationships[serviceType].forEach(relatedClass => {
            const relatedElements = document.querySelectorAll(`.${relatedClass}`);
            relatedElements.forEach(el => {
                el.style.borderColor = '#ff9900';
                el.style.boxShadow = '0 0 10px rgba(255, 153, 0, 0.3)';
            });
        });
    }
}

function clearServiceHighlights() {
    document.querySelectorAll('.aws-service').forEach(service => {
        service.style.borderColor = '';
        service.style.boxShadow = '';
    });
}

function getServiceType(serviceElement) {
    const classes = serviceElement.className.split(' ');
    return classes.find(cls => cls !== 'aws-service') || 'unknown';
}

function showServiceDetails(service) {
    const serviceType = getServiceType(service);
    const serviceName = service.querySelector('span').textContent;
    
    const modal = createServiceModal(serviceName, serviceType);
    document.body.appendChild(modal);
    
    // Animate modal appearance
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
    
    // Close modal on escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            closeModal(modal);
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

function createServiceModal(serviceName, serviceType) {
    const modal = document.createElement('div');
    modal.className = 'service-modal';
    
    const serviceDetails = getServiceDetails(serviceType);
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-cloud"></i> ${serviceName}</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="service-info">
                    <h4>Service Overview</h4>
                    <p>${serviceDetails.description}</p>
                    
                    <h4>Key Features</h4>
                    <ul>
                        ${serviceDetails.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                    
                    <h4>Use Cases in Banking Architecture</h4>
                    <ul>
                        ${serviceDetails.useCases.map(useCase => `<li>${useCase}</li>`).join('')}
                    </ul>
                    
                    <div class="service-pricing">
                        <h4>Pricing Model</h4>
                        <p>${serviceDetails.pricing}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        closeModal(modal);
    });
    
    return modal;
}

function getServiceDetails(serviceType) {
    const details = {
        'cloudfront': {
            description: 'Amazon CloudFront is a fast content delivery network (CDN) service that securely delivers data, videos, applications, and APIs to customers globally with low latency and high transfer speeds.',
            features: [
                'Global edge locations network',
                'DDoS protection with AWS Shield',
                'SSL/TLS encryption',
                'Real-time metrics and logging',
                'Lambda@Edge for customization'
            ],
            useCases: [
                'Static asset delivery for micro frontends',
                'API response caching',
                'Security headers injection',
                'Geographic content restriction'
            ],
            pricing: 'Pay-as-you-go based on data transfer and requests'
        },
        'apigateway': {
            description: 'Amazon API Gateway is a fully managed service that makes it easy for developers to create, publish, maintain, monitor, and secure APIs at any scale.',
            features: [
                'RESTful and WebSocket APIs',
                'Built-in authentication and authorization',
                'Request/response transformation',
                'Rate limiting and throttling',
                'Caching capabilities'
            ],
            useCases: [
                'Centralized API management',
                'Microservice API orchestration',
                'Authentication and authorization',
                'Request routing and transformation'
            ],
            pricing: 'Pay per API call plus data transfer charges'
        },
        'lambda': {
            description: 'AWS Lambda is a serverless compute service that lets you run code without provisioning or managing servers.',
            features: [
                'Auto-scaling execution',
                'Built-in fault tolerance',
                'Support for multiple languages',
                'Integration with AWS services',
                'Pay-per-invocation pricing'
            ],
            useCases: [
                'Banking API business logic',
                'Data processing and transformation',
                'Real-time event processing',
                'Authentication and authorization handlers'
            ],
            pricing: 'Pay per request and compute time (GB-seconds)'
        },
        'ecs': {
            description: 'Amazon Elastic Container Service (ECS) is a fully managed container orchestration service that supports Docker containers.',
            features: [
                'Fargate serverless containers',
                'Auto scaling and load balancing',
                'Integration with AWS services',
                'Security and compliance features',
                'Blue/green deployments'
            ],
            useCases: [
                'Micro frontend hosting',
                'Containerized microservices',
                'CI/CD pipeline execution',
                'Development environment isolation'
            ],
            pricing: 'Pay for underlying EC2 instances or Fargate vCPU/memory'
        },
        'rds': {
            description: 'Amazon Relational Database Service (RDS) makes it easy to set up, operate, and scale a relational database in the cloud.',
            features: [
                'Automated backups and snapshots',
                'Multi-AZ deployment for high availability',
                'Read replicas for scaling',
                'Performance monitoring',
                'Security and compliance features'
            ],
            useCases: [
                'Transactional banking data',
                'User account information',
                'Financial transaction records',
                'Audit and compliance data'
            ],
            pricing: 'Pay for instance hours, storage, and data transfer'
        }
    };
    
    return details[serviceType] || {
        description: 'AWS service details not available',
        features: [],
        useCases: [],
        pricing: 'Pricing varies by service'
    };
}

function closeModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

function toggleLayerDetails(layer) {
    const details = layer.querySelector('.layer-details');
    if (details) {
        details.classList.toggle('show');
    } else {
        // Create and show details
        const newDetails = document.createElement('div');
        newDetails.className = 'layer-details';
        newDetails.innerHTML = getLayerDetails(layer);
        layer.appendChild(newDetails);
        
        setTimeout(() => {
            newDetails.classList.add('show');
        }, 10);
    }
}

function getLayerDetails(layer) {
    const layerType = layer.querySelector('h4').textContent;
    
    const details = {
        'CDN Layer (CloudFront)': 'Handles global content delivery, caching, and DDoS protection for optimal performance.',
        'API Gateway Layer': 'Manages authentication, rate limiting, and request routing to backend services.',
        'Application Layer': 'Hosts micro frontends and orchestrates the user interface components.',
        'Microservices Layer': 'Contains business logic services for banking operations.',
        'Data Layer': 'Manages persistent storage, caching, and data processing.'
    };
    
    return `<p>${details[layerType] || 'Layer details not available'}</p>`;
}

function showTooltip(e, text) {
    const tooltip = document.querySelector('.custom-tooltip');
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    
    moveTooltip(e);
}

function moveTooltip(e) {
    const tooltip = document.querySelector('.custom-tooltip');
    tooltip.style.left = e.pageX + 10 + 'px';
    tooltip.style.top = e.pageY + 10 + 'px';
}

function hideTooltip() {
    const tooltip = document.querySelector('.custom-tooltip');
    tooltip.style.display = 'none';
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}

function throttle(func, limit) {
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
}

// Add CSS for dynamic elements
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .reading-progress {
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            z-index: 9999;
            transition: width 0.3s ease;
        }
        
        .custom-tooltip {
            position: absolute;
            background: #1e293b;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            max-width: 250px;
            z-index: 10000;
            display: none;
            pointer-events: none;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .custom-tooltip::before {
            content: '';
            position: absolute;
            top: -4px;
            left: 10px;
            width: 8px;
            height: 8px;
            background: #1e293b;
            transform: rotate(45deg);
        }
        
        .service-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .service-modal.show {
            opacity: 1;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            transform: translateY(20px);
            transition: transform 0.3s ease;
        }
        
        .service-modal.show .modal-content {
            transform: translateY(0);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            border-radius: 12px 12px 0 0;
        }
        
        .modal-header h3 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .close-modal {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: background-color 0.3s ease;
        }
        
        .close-modal:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .modal-body {
            padding: 1.5rem;
        }
        
        .service-info h4 {
            color: #1e3a8a;
            margin: 1rem 0 0.5rem 0;
            font-size: 1.1rem;
        }
        
        .service-info p {
            color: #475569;
            line-height: 1.6;
            margin-bottom: 1rem;
        }
        
        .service-info ul {
            margin-bottom: 1rem;
            padding-left: 1.5rem;
        }
        
        .service-info li {
            color: #475569;
            margin-bottom: 0.25rem;
        }
        
        .service-pricing {
            background: #f8fafc;
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
        }
        
        .copy-button {
            position: absolute;
            top: 8px;
            right: 8px;
            background: #374151;
            color: white;
            border: none;
            padding: 6px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.3s ease;
        }
        
        .copy-button:hover {
            background: #4b5563;
        }
        
        .layer-details {
            margin-top: 1rem;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        }
        
        .layer-details.show {
            opacity: 1;
            transform: translateY(0);
        }
        
        .page-nav a.active {
            background: #1e3a8a;
            color: white;
        }
        
        @media (max-width: 768px) {
            .nav-menu.active {
                display: flex;
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                flex-direction: column;
                background: #1e3a8a;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                padding: 1rem;
            }
            
            .hamburger.active .bar:nth-child(2) {
                opacity: 0;
            }
            
            .hamburger.active .bar:nth-child(1) {
                transform: translateY(8px) rotate(45deg);
            }
            
            .hamburger.active .bar:nth-child(3) {
                transform: translateY(-8px) rotate(-45deg);
            }
            
            .modal-content {
                margin: 1rem;
                max-width: calc(100% - 2rem);
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Initialize dynamic styles
addDynamicStyles();