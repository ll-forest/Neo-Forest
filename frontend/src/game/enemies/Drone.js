// src/game/enemies/Drone.js
import { Enemy } from './Enemy';
import { Animation } from '../systems/AnimationSystem';

export class Drone extends Enemy {
    constructor(config) {
        super({
            ...config,
            type: 'drone',
            health: 60,
            damage: 15
        });
        
        // Hover parameters
        this.hoverHeight = config.y;
        this.hoverOffset = Math.random() * Math.PI * 2; // Random start phase
        this.hoverSpeed = 0.03;
        this.hoverRange = 80; // Increased range for more visible movement
        
        // Behavior parameters
        this.behavior = config.behavior || 'patrol'; // 'patrol' or 'follow'
        this.attackRange = 200;
        this.followSpeed = 3;
        this.detectionRange = 300;
        this.patrolSpeed = config.velocityX || 2;
        this.startX = config.x;
        this.patrolDistance = config.patrolDistance || 200;
    }

    update(deltaTime, player) {
        if (this.isDead) return;

        // Update hover motion
        this.hoverOffset += this.hoverSpeed;
        const hoverY = Math.sin(this.hoverOffset) * this.hoverRange;
        this.y = this.hoverHeight + hoverY;

        if (player && !player.isDead) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (this.behavior === 'follow' && distance < this.detectionRange) {
                // Follow player behavior
                const angle = Math.atan2(dy, dx);
                this.velocityX = Math.cos(angle) * this.followSpeed;
                const targetY = player.y - this.height;
                this.y += (targetY - this.y) * 0.02;
                this.direction = this.velocityX > 0 ? 1 : -1;
                
                if (distance < this.attackRange) {
                    this.currentState = 'attack';
                } else {
                    this.currentState = 'idle';
                }
            } else {
                // Patrol behavior
                this.patrolMovement();
            }
        } else {
            this.patrolMovement();
        }

        super.update(deltaTime, player);
    }

    patrolMovement() {
        // Patrol back and forth
        if (Math.abs(this.x - this.startX) > this.patrolDistance) {
            this.velocityX = -this.velocityX;
            this.direction = this.velocityX > 0 ? 1 : -1;
        }
        if (this.velocityX === 0) {
            this.velocityX = this.patrolSpeed;
        }
        this.currentState = 'idle';
    }

    render(ctx) {
        if (this.isDead) return;
        
        super.render(ctx);
        
        // Save context for hit flash effect
        ctx.save();
        if (this.isHit) {
            ctx.globalAlpha = 0.7;
        }
        
        // Drone body
        ctx.fillStyle = this.isHit ? '#ff6666' : '#ff0000';
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.width/2,
            this.y + this.height/2,
            this.width/3,
            this.height/4,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Propellers with dynamic rotation
        ctx.fillStyle = '#666';
        const propellerSpin = Date.now() * 0.02; // Faster spin
        for (let i = 0; i < 4; i++) {
            const angle = (propellerSpin + i * Math.PI/2) % (Math.PI * 2);
            const propX = this.x + this.width/2 + Math.cos(angle) * this.width/3;
            const propY = this.y + this.height/2 + Math.sin(angle) * this.height/4;
            ctx.fillRect(propX - 4, propY - 4, 8, 8);
        }
        
        // Energy core with pulsing effect
        ctx.fillStyle = '#00ffff';
        const pulseSize = 5 + Math.sin(Date.now() * 0.01) * 2;
        ctx.beginPath();
        ctx.arc(
            this.x + this.width/2,
            this.y + this.height/2,
            pulseSize,
            0, Math.PI * 2
        );
        ctx.fill();

        // Attack indicator
        if (this.currentState === 'attack') {
            ctx.strokeStyle = '#ff3333';
            ctx.lineWidth = 2;
            const pulseRadius = this.width/2 + Math.sin(Date.now() * 0.01) * 5;
            ctx.beginPath();
            ctx.arc(
                this.x + this.width/2,
                this.y + this.height/2,
                pulseRadius,
                0, Math.PI * 2
            );
            ctx.stroke();
        }

        ctx.restore();
    }
}