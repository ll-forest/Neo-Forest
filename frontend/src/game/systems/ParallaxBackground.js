// src/game/systems/ParallaxBackground.js
export default class ParallaxBackground {
    constructor(engine) {
        this.engine = engine;
        this.particles = [];
        this.initialized = false;
        
        // Layer configurations
        this.layers = [
            {
                // Grid background
                render: (ctx, offset) => {
                    const width = this.engine.canvas.width;
                    const height = this.engine.canvas.height;
                    
                    // Black background
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, width, height);

                    // Grid lines
                    ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)'; // cyan-500 with opacity
                    ctx.lineWidth = 1;
                    
                    const gridSize = 80; // Match menu's baseGridSize
                    const offsetX = offset * 0.1;

                    // Vertical lines
                    for (let x = offsetX % gridSize; x < width; x += gridSize) {
                        ctx.beginPath();
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x, height);
                        ctx.stroke();
                    }

                    // Horizontal lines
                    for (let y = 0; y < height; y += gridSize) {
                        ctx.beginPath();
                        ctx.moveTo(0, y);
                        ctx.lineTo(width, y);
                        ctx.stroke();
                    }
                },
                scrollSpeed: 0.1
            },
            {
                // Background trees
                render: (ctx, offset) => {
                    const width = this.engine.canvas.width;
                    const spacing = 160;
                    const treeCount = Math.ceil(width / spacing) + 1;
                    
                    ctx.save();
                    ctx.translate(-offset * 0.2, 0);
                    
                    for (let i = 0; i < treeCount; i++) {
                        const x = 100 + i * spacing;
                        this.drawPixelTree(ctx, x, 500, '#0ff3');
                    }
                    
                    ctx.restore();
                },
                scrollSpeed: 0.2
            },
            {
                // Middle layer trees
                render: (ctx, offset) => {
                    const width = this.engine.canvas.width;
                    const spacing = 180;
                    const treeCount = Math.ceil(width / spacing) + 1;
                    
                    ctx.save();
                    ctx.translate(-offset * 0.4, 0);
                    
                    for (let i = 0; i < treeCount; i++) {
                        const x = 180 + i * spacing;
                        this.drawPixelTree(ctx, x, 550, '#0ff5');
                    }
                    
                    ctx.restore();
                },
                scrollSpeed: 0.4
            },
            {
                // Front layer trees
                render: (ctx, offset) => {
                    const width = this.engine.canvas.width;
                    const spacing = 200;
                    const treeCount = Math.ceil(width / spacing) + 1;
                    
                    ctx.save();
                    ctx.translate(-offset * 0.6, 0);
                    
                    for (let i = 0; i < treeCount; i++) {
                        const x = 220 + i * spacing;
                        this.drawPixelTree(ctx, x, 600, '#0ff7');
                    }
                    
                    ctx.restore();
                },
                scrollSpeed: 0.6
            }
        ];
    }

    drawPixelTree(ctx, x, height, glowColor) {
        // Tree trunk (match menu's pixel tree)
        ctx.fillStyle = '#1f2937'; // gray-800
        ctx.fillRect(x - 4, height - 40, 8, 40);

        // Tree triangles (match menu's polygon style)
        ctx.fillStyle = '#111827'; // gray-900
        
        // Draw each triangle layer with glow
        [0, -20, -40].forEach((yOffset, i) => {
            // Create triangle path
            ctx.beginPath();
            ctx.moveTo(x, height + yOffset - 60);
            ctx.lineTo(x + 30, height + yOffset);
            ctx.lineTo(x - 30, height + yOffset);
            ctx.closePath();

            // Add glow effect
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 2 + i;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Fill triangle
            ctx.fill();

            // Reset shadow for next shape
            ctx.shadowBlur = 0;
        });
    }

    init() {
        if (!this.initialized && this.engine.canvas) {
            // Initialize particles to match menu's floating particles
            const particleCount = Math.ceil(this.engine.canvas.width / 96); // Adjust based on screen width
            for (let i = 0; i < particleCount; i++) {
                this.particles.push(this.createParticle());
            }
            this.initialized = true;
        }
    }

    createParticle() {
        return {
            x: Math.random() * this.engine.canvas.width,
            y: Math.random() * this.engine.canvas.height,
            size: 2, // Match menu's particle size
            speed: 0.5 + Math.random() * 0.5,
            opacity: 0.5,
            animationOffset: Math.random() * 5000 // For floating animation
        };
    }

    update(deltaTime) {
        if (!this.initialized) {
            this.init();
        }

        // Update particles with floating animation
        this.particles.forEach(particle => {
            // Vertical floating movement
            particle.y -= particle.speed * deltaTime;
            
            // Reset position when off screen
            if (particle.y < 0) {
                particle.y = this.engine.canvas.height;
                particle.x = Math.random() * this.engine.canvas.width;
            }

            // Update opacity for pulsing effect
            particle.opacity = 0.3 + Math.sin((Date.now() + particle.animationOffset) * 0.001) * 0.2;
        });
    }

    render(ctx) {
        if (!this.initialized) {
            this.init();
        }

        const cameraOffset = this.engine.camera ? this.engine.camera.x : 0;
        
        // Render background layers
        this.layers.forEach(layer => {
            layer.render(ctx, cameraOffset * layer.scrollSpeed);
        });

        // Add dark overlay at the bottom
        const height = this.engine.canvas.height;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 600, this.engine.canvas.width, 200);

        // Render particles
        ctx.fillStyle = '#22d3ee'; // cyan-400
        this.particles.forEach(particle => {
            ctx.globalAlpha = particle.opacity;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
}