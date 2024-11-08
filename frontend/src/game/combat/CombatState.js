// src/game/combat/CombatState.js

export class CombatState {
    constructor(entity, combatSystem) {
        if (!entity || !combatSystem) {
            throw new Error('CombatState requires both entity and combatSystem parameters');
        }

        this.entity = entity;
        this.combatSystem = combatSystem;
        
        // Base combat state
        this.isAttacking = false;
        this.currentCombo = '';
        this.comboCount = 0;
        this.lastAttackTime = 0;
        this.comboTimer = null;
        this.activeAnimations = new Set();

        // Event callbacks
        this.onAttackStart = null;
        this.onAttackEnd = null;
        this.onComboUpdate = null;

        // Initialize effects
        this.activeEffects = new Set();
        this.lastEffectCleanup = 0;

        // Initialize hitboxes
        this.hitboxes = new Map();
    }

    // Main attack method
    attack(type) {
        if (!this.canAttack(type)) {
            return false;
        }

        const attackConfig = this.combatSystem.getAttackConfig(
            type,
            this.comboCount,
            this.currentCombo
        );

        if (!attackConfig) {
            return false;
        }

        return this.executeAttack(type, attackConfig);
    }

    canAttack(type) {
        if (!this.combatSystem.attacks[type]) {
            return false;
        }

        if (this.isAttacking || this.entity.isDead) {
            return false;
        }

        const attackConfig = this.combatSystem.attacks[type];
        const now = Date.now();

        if (now - this.lastAttackTime < attackConfig.cooldown) {
            return false;
        }

        if (this.entity.energy < attackConfig.energy) {
            return false;
        }

        return true;
    }

    executeAttack(type, config) {
        this.isAttacking = true;
        this.lastAttackTime = Date.now();
        this.consumeEnergy(config.energy);

        // Update combo state
        this.updateComboState(type);

        // Create attack effects
        this.createAttackEffects(config);

        // Create hitbox
        this.createHitbox(config);

        // Trigger attack start callback
        if (this.onAttackStart) {
            this.onAttackStart(type);
        }

        // Schedule attack completion
        setTimeout(() => {
            this.completeAttack();
        }, config.animation.duration * 100);

        return true;
    }

    completeAttack() {
        this.isAttacking = false;
        if (this.onAttackEnd) {
            this.onAttackEnd();
        }
    }

    updateComboState(attackType) {
        const newCombo = this.currentCombo ? `${this.currentCombo}-${attackType}` : attackType;

        if (this.comboTimer) {
            clearTimeout(this.comboTimer);
        }

        if (this.combatSystem.isValidCombo(newCombo)) {
            this.currentCombo = newCombo;
            this.comboCount++;

            // Set new combo timer
            const window = this.combatSystem.getNextComboWindow(attackType, this.currentCombo);
            this.comboTimer = setTimeout(() => this.resetCombo(), window);

            if (this.onComboUpdate) {
                this.onComboUpdate(this.currentCombo);
            }
        } else {
            this.resetCombo();
            this.currentCombo = attackType;
            this.comboCount = 1;
        }
    }

    resetCombo() {
        this.currentCombo = '';
        this.comboCount = 0;
        if (this.comboTimer) {
            clearTimeout(this.comboTimer);
            this.comboTimer = null;
        }
    }

    createHitbox(config) {
        const direction = this.entity.direction || 1;
        const hitbox = {
            x: this.entity.x + (direction > 0 ? this.entity.width : -config.range),
            y: this.entity.y,
            width: config.range,
            height: this.entity.height,
            damage: config.damage,
            knockback: {
                x: config.knockback.x * direction,
                y: config.knockback.y
            },
            duration: 100,
            createdAt: Date.now()
        };

        this.hitboxes.set(Date.now(), hitbox);
    }

    // Render Methods
    renderAttackEffects(ctx) {
        // Render active attack effects
        if (this.isAttacking) {
            const attackConfig = this.getCurrentAttack();
            if (!attackConfig) return;

            // Render attack trail
            const direction = this.entity.direction || 1;
            const startX = this.entity.x + (direction > 0 ? this.entity.width : 0);
            const startY = this.entity.y + this.entity.height * 0.4;

            ctx.save();
            
            // Attack swing effect
            ctx.strokeStyle = attackConfig.particleConfig.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            const swingAngle = Math.PI / 3; // 60 degrees
            const radius = attackConfig.range;
            
            // Calculate swing progress based on attack animation
            const progress = (Date.now() - this.lastAttackTime) / 
                           (attackConfig.animation.duration * 100);
            
            const startAngle = direction > 0 ? -swingAngle : Math.PI + swingAngle;
            const endAngle = direction > 0 ? swingAngle : Math.PI - swingAngle;
            const currentAngle = startAngle + (endAngle - startAngle) * progress;
            
            // Draw attack arc
            ctx.arc(
                startX,
                startY,
                radius,
                currentAngle - swingAngle/2,
                currentAngle + swingAngle/2
            );
            ctx.stroke();

            // Draw particles
            this.renderAttackParticles(ctx, attackConfig.particleConfig);

            ctx.restore();
        }

        // Render combo effects
        if (this.comboCount > 0) {
            this.renderComboEffect(ctx);
        }
    }

    renderAttackParticles(ctx, config) {
        const direction = this.entity.direction || 1;
        const startX = this.entity.x + this.entity.width / 2;
        const startY = this.entity.y + this.entity.height / 2;

        ctx.save();
        for (let i = 0; i < config.count; i++) {
            const angle = (Math.PI * 2 * i) / config.count;
            const distance = Math.random() * config.spread;
            const particleX = startX + (Math.cos(angle) * distance * direction);
            const particleY = startY + Math.sin(angle) * distance;

            ctx.beginPath();
            ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
            ctx.fillStyle = config.color;
            ctx.fill();
        }
        ctx.restore();
    }

    renderComboEffect(ctx) {
        if (!this.comboCount) return;

        ctx.save();
        
        // Position above the player
        const x = this.entity.x + this.entity.width / 2;
        const y = this.entity.y - 20;

        // Combo counter
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        
        const comboText = `${this.comboCount}x Combo!`;
        ctx.strokeText(comboText, x, y);
        ctx.fillText(comboText, x, y);

        // Combo flash effect
        if (this.comboCount > 1) {
            const flashIntensity = (Math.sin(Date.now() * 0.01) + 1) / 2;
            ctx.fillStyle = `rgba(255, 255, 0, ${flashIntensity * 0.3})`;
            ctx.beginPath();
            ctx.arc(x, y, 20 + (this.comboCount * 2), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Effect Management
    createAttackEffects(config) {
        if (!config.particleConfig) return;

        this.addEffect({
            type: 'attack',
            duration: config.particleConfig.lifetime,
            config: config.particleConfig,
            render: (ctx) => this.renderAttackParticles(ctx, config.particleConfig)
        });
    }

    addEffect(effect) {
        effect.createdAt = Date.now();
        this.activeEffects.add(effect);
    }

    // Update Methods
    update(deltaTime) {
        this.updateHitboxes();
        this.updateEffects(deltaTime);
    }

    updateHitboxes() {
        const now = Date.now();
        this.hitboxes.forEach((hitbox, timestamp) => {
            if (now - timestamp > hitbox.duration) {
                this.hitboxes.delete(timestamp);
            }
        });
    }

    updateEffects(deltaTime) {
        const now = Date.now();
        if (now - this.lastEffectCleanup > 1000) {
            this.cleanupExpiredEffects();
            this.lastEffectCleanup = now;
        }
    }

    // Utility Methods
    getCurrentAttack() {
        const attackType = this.currentCombo.split('-').pop() || 'light';
        return this.combatSystem.attacks[attackType];
    }

    hasEnoughEnergy(amount) {
        return this.entity.energy >= amount;
    }

    consumeEnergy(amount) {
        if (!this.hasEnoughEnergy(amount)) return false;

        this.entity.energy -= amount;
        if (this.entity.onEnergyChange) {
            this.entity.onEnergyChange(this.entity.energy);
        }
        return true;
    }

    getAttackBox() {
        const currentHitbox = Array.from(this.hitboxes.values())[0];
        return currentHitbox || null;
    }

    cleanupExpiredEffects() {
        const now = Date.now();
        this.activeEffects.forEach(effect => {
            if (now - effect.createdAt > effect.duration) {
                this.activeEffects.delete(effect);
            }
        });
    }

    // Cleanup
    cleanup() {
        this.resetCombo();
        this.isAttacking = false;
        this.activeAnimations.clear();
        this.activeEffects.clear();
        this.hitboxes.clear();
    }
}