// src/game/enemies/Cyborg.js
import { Enemy } from './Enemy';
import { Animation } from '../systems/AnimationSystem';

export class Cyborg extends Enemy {
    constructor(config) {
        super({
            ...config,
            type: 'cyborg',
            health: 100,
            damage: 20
        });
        
        // Behavior parameters
        this.behavior = config.behavior || 'patrol'; // 'patrol' or 'chase'
        this.patrolDistance = config.patrolDistance || 200;
        this.startX = config.x;
        this.attackRange = 100;
        this.detectionRange = 250;
        this.chaseSpeed = 3;
        this.patrolSpeed = Math.abs(config.velocityX) || 2;
        
        // Combat parameters
        this.attackCooldown = 1000;
        this.lastAttackTime = 0;

        // Physics parameters
        this.gravity = 0.5;
        this.maxFallSpeed = 10;
        this.groundY = config.groundY || config.y;
        this.isGrounded = false;
        this.lastGroundY = this.y;
        this.platformCheckDistance = 20; // Distance to check for platforms below
    }

    update(deltaTime, player) {
        if (this.isDead) return;

        // Store previous position for platform edge detection
        const prevX = this.x;
        const prevY = this.y;

        if (player && !player.isDead) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (this.behavior === 'chase' && distance < this.detectionRange) {
                // Chase player
                const direction = dx > 0 ? 1 : -1;
                this.velocityX = direction * this.chaseSpeed;
                this.direction = direction;
                this.currentState = 'walking';

                if (distance < this.attackRange) {
                    this.currentState = 'attack';
                    // Slow down when in attack range
                    this.velocityX *= 0.5;
                }
            } else {
                // Patrol behavior
                this.patrolMovement();
            }
        } else {
            this.patrolMovement();
        }

        // Apply gravity if not grounded
        if (!this.isGrounded) {
            this.velocityY = Math.min(this.velocityY + this.gravity, this.maxFallSpeed);
        }

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Platform edge detection
        if (this.isGrounded) {
            // Check if we're about to walk off a platform
            const willFallOff = !this.checkGroundAhead();
            if (willFallOff) {
                // Reverse direction if we would fall
                this.x = prevX;
                this.velocityX = -this.velocityX;
                this.direction = this.velocityX > 0 ? 1 : -1;
            }
        }

        // Ground collision
        if (this.y > this.groundY) {
            this.y = this.groundY;
            this.velocityY = 0;
            this.isGrounded = true;
        }

        // Store last ground position
        if (this.isGrounded) {
            this.lastGroundY = this.y;
        }

        // Boundary checks
        if (this.x < 0) {
            this.x = 0;
            this.velocityX = Math.abs(this.velocityX);
            this.direction = 1;
        }

        // Don't let enemy fall through the bottom of the screen
        const maxY = this.groundY;
        if (this.y > maxY) {
            this.y = maxY;
            this.velocityY = 0;
            this.isGrounded = true;
        }

        super.update(deltaTime, player);
    }

    checkGroundAhead() {
        // Check for ground in the direction we're moving
        const checkX = this.x + (this.direction * this.width);
        const checkY = this.y + this.height + this.platformCheckDistance;
        
        // This should be replaced with actual platform collision detection
        // For now, just check if we're at the base ground level
        return checkY >= this.groundY;
    }

    patrolMovement() {
        if (Math.abs(this.x - this.startX) > this.patrolDistance) {
            this.velocityX = -this.velocityX;
            this.direction = this.velocityX > 0 ? 1 : -1;
        }
        if (this.velocityX === 0) {
            this.velocityX = this.patrolSpeed * (Math.random() > 0.5 ? 1 : -1);
        }
        this.currentState = Math.abs(this.velocityX) > 0 ? 'walking' : 'idle';
    }

    handlePlatformCollision(platform) {
        // Called when colliding with a platform
        if (this.velocityY > 0) { // Only handle landing, not hitting head
            this.y = platform.y - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
            this.groundY = platform.y - this.height;
        }
    }

    render(ctx) {
        if (this.isDead) return;
        
        // Debug visualization for ground detection
        if (process.env.NODE_ENV === 'development') {
            ctx.save();
            ctx.strokeStyle = '#00ff00';
            ctx.beginPath();
            ctx.moveTo(this.x, this.groundY);
            ctx.lineTo(this.x + this.width, this.groundY);
            ctx.stroke();
            ctx.restore();
        }
        
        super.render(ctx);
        
        // Save context for hit flash effect
        ctx.save();
        if (this.isHit) {
            ctx.globalAlpha = 0.7;
        }
        
        // Body
        ctx.fillStyle = this.isHit ? '#996666' : '#663333';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Cyber parts
        ctx.fillStyle = this.currentState === 'attack' ? '#ff0000' : '#00ffff';
        
        // Eye with animation
        const eyeX = this.direction > 0 ? this.x + this.width * 0.7 : this.x + this.width * 0.3;
        const eyePulse = Math.sin(Date.now() * 0.01) * 2;
        ctx.fillRect(eyeX - 5, this.y + this.height * 0.3, 10 + eyePulse, 3);
        
        // Arm cannon
        const armX = this.direction > 0 ? this.x + this.width * 0.8 : this.x + this.width * 0.2;
        ctx.fillRect(
            armX - 5,
            this.y + this.height * 0.6,
            10,
            this.height * 0.2
        );
        
        // Energy flow effect
        const energyOffset = Date.now() * 0.005;
        ctx.strokeStyle = this.currentState === 'attack' ? '#ff0000' : '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const y = this.y + (energyOffset + i * 20) % this.height;
            ctx.moveTo(this.x, y);
            ctx.lineTo(this.x + this.width, y);
        }
        ctx.stroke();

        // Attack indicator
        if (this.currentState === 'attack') {
            ctx.strokeStyle = '#ff3333';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y + this.height/2);
            const targetX = this.direction > 0 ? this.x + this.width + 30 : this.x - 30;
            ctx.lineTo(targetX, this.y + this.height/2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }
}