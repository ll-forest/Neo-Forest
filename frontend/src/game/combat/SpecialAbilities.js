// src/game/combat/SpecialAbilities.js

export class SpecialAbilitiesSystem {
    constructor() {
        this.abilities = {
            furySurge: {
                energyCost: 50,
                duration: 5000,
                cooldown: 15000,
                effects: {
                    damageMultiplier: 1.5,
                    speedMultiplier: 1.3,
                    energyDrainRate: 10, // per second
                    particleColor: '#ff3300'
                },
                animation: {
                    frames: 6,
                    duration: 6,
                    spriteKey: 'fury-surge'
                },
                audio: {
                    start: 'fury-surge-start',
                    loop: 'fury-surge-loop',
                    end: 'fury-surge-end'
                }
            },
            tunnelDrive: {
                energyCost: 35,
                duration: 2000,
                cooldown: 8000,
                effects: {
                    speed: 8,
                    damageOnEmerge: 30,
                    areaOfEffect: 100,
                    particleColor: '#8B4513',
                    immunityFrames: 30
                },
                animation: {
                    frames: 8,
                    duration: 8,
                    spriteKey: 'tunnel-drive'
                },
                audio: {
                    start: 'tunnel-drive-start',
                    loop: 'tunnel-drive-loop',
                    emerge: 'tunnel-drive-emerge'
                }
            },
            shieldStrike: {
                energyCost: 40,
                duration: 3000,
                cooldown: 10000,
                effects: {
                    barrierHealth: 100,
                    reflectDamage: 1.5,
                    bashDamage: 25,
                    areaOfEffect: 80,
                    particleColor: '#4169E1'
                },
                animation: {
                    frames: 6,
                    duration: 6,
                    spriteKey: 'shield-strike'
                },
                audio: {
                    activate: 'shield-strike-activate',
                    reflect: 'shield-strike-reflect',
                    bash: 'shield-strike-bash'
                }
            }
        };
    }

    getAbilityConfig(abilityName) {
        return this.abilities[abilityName];
    }
}

export class SpecialAbilitiesState {
    constructor(entity, abilitiesSystem) {
        this.entity = entity;
        this.abilitiesSystem = abilitiesSystem;
        
        this.state = {
            furySurge: {
                active: false,
                remainingDuration: 0,
                lastUsed: 0,
                currentMultiplier: 1,
                audioInstance: null
            },
            tunnelDrive: {
                active: false,
                remainingDuration: 0,
                lastUsed: 0,
                currentDepth: 0,
                immunityFrames: 0,
                originalPosition: null
            },
            shieldStrike: {
                active: false,
                remainingDuration: 0,
                lastUsed: 0,
                barrierHealth: 0,
                reflectedDamage: 0,
                bashReady: false
            }
        };

        this.activeEffects = new Set();
    }

    // Fury Surge Methods
    activateFurySurge() {
        const config = this.abilitiesSystem.getAbilityConfig('furySurge');
        if (!this.canActivateAbility('furySurge', config)) return false;

        this.state.furySurge.active = true;
        this.state.furySurge.remainingDuration = config.duration;
        this.state.furySurge.lastUsed = Date.now();
        this.state.furySurge.currentMultiplier = config.effects.damageMultiplier;

        this.consumeEnergy(config.energyCost);
        this.addFurySurgeEffect();
        this.playAbilitySound('furySurge', 'start');
        
        return true;
    }

    deactivateFurySurge() {
        this.state.furySurge.active = false;
        this.state.furySurge.remainingDuration = 0;
        this.state.furySurge.currentMultiplier = 1;
        this.playAbilitySound('furySurge', 'end');
    }

    // Tunnel Drive Methods
    activateTunnelDrive() {
        const config = this.abilitiesSystem.getAbilityConfig('tunnelDrive');
        if (!this.canActivateAbility('tunnelDrive', config)) return false;

        this.state.tunnelDrive.active = true;
        this.state.tunnelDrive.remainingDuration = config.duration;
        this.state.tunnelDrive.lastUsed = Date.now();
        this.state.tunnelDrive.immunityFrames = config.effects.immunityFrames;
        this.state.tunnelDrive.originalPosition = {
            x: this.entity.x,
            y: this.entity.y
        };

        this.consumeEnergy(config.energyCost);
        this.addTunnelDriveEffect();
        this.playAbilitySound('tunnelDrive', 'start');
        
        return true;
    }

    emergeTunnelDrive() {
        const config = this.abilitiesSystem.getAbilityConfig('tunnelDrive');
        if (!this.state.tunnelDrive.active) return;

        this.createAreaEffect({
            x: this.entity.x + (this.entity.width / 2),
            y: this.entity.y + this.entity.height,
            radius: config.effects.areaOfEffect,
            damage: config.effects.damageOnEmerge,
            color: config.effects.particleColor,
            duration: 500
        });

        this.state.tunnelDrive.active = false;
        this.state.tunnelDrive.remainingDuration = 0;
        this.playAbilitySound('tunnelDrive', 'emerge');
    }

    // Shield Strike Methods
    activateShieldStrike() {
        const config = this.abilitiesSystem.getAbilityConfig('shieldStrike');
        if (!this.canActivateAbility('shieldStrike', config)) return false;

        this.state.shieldStrike.active = true;
        this.state.shieldStrike.remainingDuration = config.duration;
        this.state.shieldStrike.lastUsed = Date.now();
        this.state.shieldStrike.barrierHealth = config.effects.barrierHealth;
        this.state.shieldStrike.bashReady = true;

        this.consumeEnergy(config.energyCost);
        this.addShieldEffect();
        this.playAbilitySound('shieldStrike', 'activate');
        
        return true;
    }

    performShieldBash() {
        if (!this.state.shieldStrike.active || !this.state.shieldStrike.bashReady) return false;

        const config = this.abilitiesSystem.getAbilityConfig('shieldStrike');
        this.createAreaEffect({
            x: this.entity.x + (this.entity.width / 2),
            y: this.entity.y + (this.entity.height / 2),
            radius: config.effects.areaOfEffect,
            damage: config.effects.bashDamage,
            color: config.effects.particleColor,
            duration: 300
        });

        this.state.shieldStrike.bashReady = false;
        this.playAbilitySound('shieldStrike', 'bash');
        return true;
    }

    deactivateShieldStrike() {
        this.state.shieldStrike.active = false;
        this.state.shieldStrike.remainingDuration = 0;
        this.state.shieldStrike.barrierHealth = 0;
    }

    // Effect Methods
    addFurySurgeEffect() {
        const config = this.abilitiesSystem.getAbilityConfig('furySurge');
        this.addEffect({
            type: 'fury',
            duration: config.duration,
            render: (ctx) => this.renderFurySurgeEffect(ctx, config.effects)
        });
    }

    addTunnelDriveEffect() {
        const config = this.abilitiesSystem.getAbilityConfig('tunnelDrive');
        this.addEffect({
            type: 'tunnel',
            duration: config.duration,
            render: (ctx) => this.renderTunnelDriveEffect(ctx, config.effects)
        });
    }

    addShieldEffect() {
        const config = this.abilitiesSystem.getAbilityConfig('shieldStrike');
        this.addEffect({
            type: 'shield',
            duration: config.duration,
            render: (ctx) => this.renderShieldEffect(ctx, config.effects)
        });
    }

    // Render Methods
    renderFurySurgeEffect(ctx, config) {
        const x = this.entity.x + this.entity.width / 2;
        const y = this.entity.y + this.entity.height / 2;
        const radius = this.entity.width * 0.8;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `${config.particleColor}33`;
        ctx.fill();
        ctx.strokeStyle = config.particleColor;
        ctx.stroke();
        ctx.restore();
    }

    renderTunnelDriveEffect(ctx, config) {
        if (!this.state.tunnelDrive.active) return;

        const x = this.entity.x + this.entity.width / 2;
        const y = this.entity.y + this.entity.height;
        
        ctx.save();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5;
            const particleX = x + Math.cos(angle) * 20;
            const particleY = y + Math.sin(angle) * 20;
            
            ctx.beginPath();
            ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
            ctx.fillStyle = config.particleColor;
            ctx.fill();
        }
        ctx.restore();
    }

    renderShieldEffect(ctx, config) {
        const x = this.entity.x + this.entity.width / 2;
        const y = this.entity.y + this.entity.height / 2;
        
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, y, this.entity.width * 0.8, this.entity.height * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = `${config.particleColor}22`;
        ctx.fill();
        ctx.strokeStyle = config.particleColor;
        ctx.stroke();
        ctx.restore();
    }

    // Update Methods
    update(deltaTime) {
        this.updateFurySurge(deltaTime);
        this.updateTunnelDrive(deltaTime);
        this.updateShieldStrike(deltaTime);
        this.updateEffects(deltaTime);
    }

    updateFurySurge(deltaTime) {
        if (!this.state.furySurge.active) return;

        this.state.furySurge.remainingDuration -= deltaTime;
        const config = this.abilitiesSystem.getAbilityConfig('furySurge');
        
        const energyDrain = (config.effects.energyDrainRate * deltaTime) / 1000;
        if (!this.consumeEnergy(energyDrain) || this.state.furySurge.remainingDuration <= 0) {
            this.deactivateFurySurge();
        }
    }

    updateTunnelDrive(deltaTime) {
        if (!this.state.tunnelDrive.active) return;

        this.state.tunnelDrive.remainingDuration -= deltaTime;
        if (this.state.tunnelDrive.remainingDuration <= 0) {
            this.emergeTunnelDrive();
        }
    }

    updateShieldStrike(deltaTime) {
        if (!this.state.shieldStrike.active) return;

        this.state.shieldStrike.remainingDuration -= deltaTime;
        if (this.state.shieldStrike.remainingDuration <= 0) {
            this.deactivateShieldStrike();
        }
    }

    updateEffects(deltaTime) {
        const now = Date.now();
        this.activeEffects.forEach(effect => {
            if (now - effect.createdAt > effect.duration) {
                this.activeEffects.delete(effect);
            }
        });
    }

    // Utility Methods
    canActivateAbility(abilityName, config) {
        if (!config) return false;

        const state = this.state[abilityName];
        const now = Date.now();

        return !state.active && 
               now - state.lastUsed >= config.cooldown &&
               this.hasEnoughEnergy(config.energyCost);
    }

    hasEnoughEnergy(cost) {
        return this.entity.energy >= cost;
    }

    consumeEnergy(amount) {
        if (!this.hasEnoughEnergy(amount)) return false;
        
        this.entity.energy -= amount;
        if (this.entity.onEnergyChange) {
            this.entity.onEnergyChange(this.entity.energy);
        }
        return true;
    }

    createAreaEffect(config) {
        this.addEffect({
            type: 'area',
            duration: config.duration,
            config: config,
            render: (ctx) => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(config.x, config.y, config.radius, 0, Math.PI * 2);
                ctx.fillStyle = `${config.color}33`;
                ctx.fill();
                ctx.strokeStyle = config.color;
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    addEffect(effect) {
        effect.createdAt = Date.now();
        this.activeEffects.add(effect);
    }

    playAbilitySound(ability, type) {
        const config = this.abilitiesSystem.getAbilityConfig(ability);
        const audioKey = config.audio[type];
        
        if (this.entity.audioManager && audioKey) {
            this.entity.audioManager.play(audioKey);
        }
    }

    cleanup() {
        if (this.state.furySurge.active) this.deactivateFurySurge();
        if (this.state.tunnelDrive.active) this.emergeTunnelDrive();
        if (this.state.shieldStrike.active) this.deactivateShieldStrike();
        
        this.activeEffects.clear();
    }
}