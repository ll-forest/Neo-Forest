// src/game/enemies/Enemy.js
import { Animation, AnimationController } from '../systems/AnimationSystem';

export class Enemy {
    constructor(config) {
        // Position and dimensions
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.width = 64;
        this.height = 64;
        
        // Physics
        this.velocityX = config.velocityX || 0;
        this.velocityY = 0;
        this.isGrounded = false;
        this.maxVelocityY = 10;
        
        // Combat stats
        this.health = config.health || 100;
        this.maxHealth = config.health || 100;
        this.damage = config.damage || 10;
        this.isHit = false;
        this.hitCooldown = 500;
        this.lastHitTime = 0;
        this.knockbackForce = config.knockbackForce || 5;
        this.deathAnimationDuration = 500; // ms
        this.deathAnimationStartTime = 0;
        
        // State
        this.type = config.type;
        this.direction = this.velocityX >= 0 ? 1 : -1;
        this.currentState = 'idle';
        this.isDead = false;
        this.isDeathAnimationComplete = false;
        this.lastHitSource = 0;
        
        // Behavior
        this.behavior = config.behavior || 'patrol';
        this.patrolDistance = config.patrolDistance || 200;
        this.startX = config.x;
        this.detectionRange = config.detectionRange || 250;
        this.attackRange = config.attackRange || 100;
        
        // Animation
        this.animator = new AnimationController();
        this.setupAnimations();
        
        // Visual effects
        this.hitFlashIntensity = 1;
        this.deathParticles = [];
    }

    setupAnimations() {
        this.animator.addAnimation('idle', new Animation({
            frameWidth: this.width,
            frameHeight: this.height,
            frames: 4,
            frameDuration: 8
        }));

        this.animator.addAnimation('hit', new Animation({
            frameWidth: this.width,
            frameHeight: this.height,
            frames: 2,
            frameDuration: 4,
            loop: false,
            onComplete: () => {
                if (this.currentState === 'hit') {
                    this.currentState = 'idle';
                }
            }
        }));

        this.animator.addAnimation('death', new Animation({
            frameWidth: this.width,
            frameHeight: this.height,
            frames: 4,
            frameDuration: 6,
            loop: false,
            onComplete: () => {
                this.isDeathAnimationComplete = true;
            }
        }));
    }

    update(deltaTime, player) {
        // Don't update if death animation is complete
        if (this.isDeathAnimationComplete) return;

        // Handle death animation
        if (this.isDead) {
            if (this.deathAnimationStartTime === 0) {
                this.deathAnimationStartTime = Date.now();
                this.currentState = 'death';
            }
            
            const deathProgress = (Date.now() - this.deathAnimationStartTime) / this.deathAnimationDuration;
            if (deathProgress >= 1) {
                this.isDeathAnimationComplete = true;
            }
            
            // Update death particles
            this.deathParticles = this.deathParticles.filter(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.2; // gravity
                particle.life -= deltaTime;
                return particle.life > 0;
            });

            // Only update animation during death
            this.animator.update(deltaTime);
            return;
        }

        // Store player position for knockback direction
        if (player) {
            this.lastHitSource = player.x;
        }

        // Update direction based on movement
        if (this.velocityX !== 0) {
            this.direction = this.velocityX > 0 ? 1 : -1;
        }

        // Apply knockback decay
        if (this.isHit) {
            this.velocityX *= 0.9;
        }

        // Apply gravity if not grounded
        if (!this.isGrounded) {
            this.velocityY = Math.min(this.velocityY + 0.5, this.maxVelocityY);
        }

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Update hit state
        if (this.isHit && Date.now() - this.lastHitTime > this.hitCooldown) {
            this.isHit = false;
            this.hitFlashIntensity = 1;
        }

        // Decrease hit flash intensity
        if (this.isHit) {
            this.hitFlashIntensity = Math.max(0, this.hitFlashIntensity - 0.1);
        }

        // Update animation state
        this.animator.setState(this.currentState);
        this.animator.update(deltaTime);
    }

    render(ctx) {
        // Don't render if death animation is complete
        if (this.isDeathAnimationComplete) return;

        ctx.save();

        // Death animation effect
        if (this.isDead) {
            const progress = (Date.now() - this.deathAnimationStartTime) / this.deathAnimationDuration;
            ctx.globalAlpha = 1 - progress;
            
            // Render death particles
            this.deathParticles.forEach(particle => {
                ctx.fillStyle = particle.color;
                ctx.globalAlpha = particle.life / particle.maxLife;
                ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
            });
        }

        // Hit flash effect
        if (this.isHit) {
            ctx.globalAlpha = 0.5 + (Math.sin(Date.now() * 0.02) * 0.5 * this.hitFlashIntensity);
        }

        // Render health bar if damaged and not dead
        if (!this.isDead && this.health < this.maxHealth) {
            const healthBarWidth = 50;
            const healthBarHeight = 4;
            // Health bar background
            ctx.fillStyle = '#660000';
            ctx.fillRect(
                this.x + this.width/2 - healthBarWidth/2,
                this.y - 10,
                healthBarWidth,
                healthBarHeight
            );
            // Health bar foreground
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(
                this.x + this.width/2 - healthBarWidth/2,
                this.y - 10,
                (this.health / this.maxHealth) * healthBarWidth,
                healthBarHeight
            );
        }

        // Attack range indicator (when in range of player)
        if (this.currentState === 'attack') {
            ctx.strokeStyle = '#ff000066';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(
                this.x + this.width/2,
                this.y + this.height/2,
                this.attackRange,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }

        ctx.restore();
    }

    takeDamage(amount) {
        if (this.isDead || (this.isHit && Date.now() - this.lastHitTime < this.hitCooldown)) {
            return false;
        }

        this.health = Math.max(0, this.health - amount);
        this.isHit = true;
        this.lastHitTime = Date.now();
        this.hitFlashIntensity = 1;
        this.currentState = 'hit';
        
        // Add knockback effect
        const knockbackDirection = this.x < this.lastHitSource ? -1 : 1;
        this.velocityX = this.knockbackForce * knockbackDirection;
        
        // Create hit particles
        for (let i = 0; i < 5; i++) {
            this.deathParticles.push({
                x: this.x + this.width/2,
                y: this.y + this.height/2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5 - 2,
                size: Math.random() * 4 + 2,
                color: this.type === 'drone' ? '#00ffff' : '#ff0000',
                life: 500,
                maxLife: 500
            });
        }

        if (this.health <= 0) {
            this.isDead = true;
            this.deathAnimationStartTime = Date.now();
            this.currentState = 'death';
            
            // Create death particles
            for (let i = 0; i < 15; i++) {
                this.deathParticles.push({
                    x: this.x + Math.random() * this.width,
                    y: this.y + Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8 - 2,
                    size: Math.random() * 6 + 3,
                    color: this.type === 'drone' ? '#00ffff' : '#ff0000',
                    life: 1000,
                    maxLife: 1000
                });
            }
        }
        
        return this.isDead;
    }

    getHitbox() {
        return {
            x: this.x + this.width * 0.2, // Smaller hitbox than visual size
            y: this.y + this.height * 0.1,
            width: this.width * 0.6,
            height: this.height * 0.8
        };
    }

    isInRange(player, range) {
        if (!player) return false;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= range;
    }
}