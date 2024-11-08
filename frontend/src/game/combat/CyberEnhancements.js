// src/game/combat/CyberEnhancements.js
import { EFFECTS_CONFIG } from './CombatCore';


export class CyberEnhancementsSystem {
    constructor() {
        this.enhancements = {
            cyberClaws: {
                base: {
                    damage: 20,
                    energyCost: 5,
                    range: 1.2,
                    animation: {
                        frames: 4,
                        duration: 4,
                        spriteKey: 'cyber-claws'
                    }
                },
                wallClimb: {
                    energyCost: 1, // per frame
                    maxClimbTime: 3000,
                    slideSpeed: 2,
                    particleConfig: {
                        color: '#0088ff',
                        count: 2,
                        spread: 0.3,
                        lifetime: 200
                    }
                },
                energyTrail: {
                    ...EFFECTS_CONFIG.energyTrail,
                    color: '#00ffff'
                }
            },
            neuralVisor: {
                energyCost: 2, // per second
                scanInterval: 500, // ms between scans
                scanRadius: 200,
                weakPointBonus: 1.5,
                animation: {
                    frames: 2,
                    duration: 10,
                    spriteKey: 'neural-visor'
                },
                threatLevels: {
                    low: { color: '#00ff00', threshold: 30 },
                    medium: { color: '#ffff00', threshold: 60 },
                    high: { color: '#ff0000', threshold: 100 }
                }
            },
            exoskeleton: {
                damageReduction: 0.25,
                mobilityBoost: 1.2,
                energyRegenBoost: 1.5,
                servoPowerCost: 1, // per jump
                animation: {
                    frames: 2,
                    duration: 8,
                    spriteKey: 'exo-boost'
                },
                particleConfig: {
                    color: '#4444ff',
                    count: 3,
                    spread: 0.5,
                    lifetime: 300
                }
            }
        };
    }
}

export class CyberState {
    constructor(entity, cyberSystem) {
        this.entity = entity;
        this.cyberSystem = cyberSystem;
        
        // Initialize cyber states
        this.state = {
            claws: {
                active: false,
                energyTrailActive: false,
                lastUseTime: 0
            },
            wallClimb: {
                active: false,
                timeRemaining: this.cyberSystem.enhancements.cyberClaws.wallClimb.maxClimbTime,
                lastWallContact: 0
            },
            neuralVisor: {
                active: false,
                lastScanTime: 0,
                detectedTargets: new Set(),
                weakPoints: new Map(),
                currentScanRadius: 0
            },
            exoskeleton: {
                boostActive: false,
                lastBoostTime: 0,
                currentDamageReduction: 0,
                boostedAttributes: new Set()
            }
        };

        // Effects tracking
        this.activeEffects = new Set();
        this.lastEffectCleanup = 0;
    }

    // Cyber Claws Methods
    activateCyberClaws() {
        if (!this.canActivateCyberClaws()) {
            return false;
        }

        this.state.claws.active = true;
        this.state.claws.lastUseTime = Date.now();
        this.consumeEnergy(this.cyberSystem.enhancements.cyberClaws.base.energyCost);
        this.createClawEffects();
        return true;
    }

    canActivateCyberClaws() {
        return !this.state.claws.active && 
               this.hasEnoughEnergy(this.cyberSystem.enhancements.cyberClaws.base.energyCost);
    }

    deactivateCyberClaws() {
        this.state.claws.active = false;
        this.state.claws.energyTrailActive = false;
    }

    // Wall Climbing Methods
    startWallClimb() {
        if (!this.canWallClimb()) {
            return false;
        }

        this.state.wallClimb.active = true;
        this.state.wallClimb.lastWallContact = Date.now();
        return true;
    }

    canWallClimb() {
        return !this.state.wallClimb.active && 
               this.state.wallClimb.timeRemaining > 0 &&
               this.hasEnoughEnergy(this.cyberSystem.enhancements.cyberClaws.wallClimb.energyCost);
    }

    stopWallClimb() {
        this.state.wallClimb.active = false;
    }

    // Neural Visor Methods
    toggleNeuralVisor() {
        if (this.state.neuralVisor.active) {
            this.deactivateNeuralVisor();
            return false;
        }
        return this.activateNeuralVisor();
    }

    activateNeuralVisor() {
        if (!this.hasEnoughEnergy(this.cyberSystem.enhancements.neuralVisor.energyCost)) {
            return false;
        }

        this.state.neuralVisor.active = true;
        this.state.neuralVisor.lastScanTime = Date.now();
        this.performThreatScan();
        return true;
    }

    deactivateNeuralVisor() {
        this.state.neuralVisor.active = false;
        this.state.neuralVisor.detectedTargets.clear();
        this.state.neuralVisor.weakPoints.clear();
    }

    performThreatScan() {
        this.state.neuralVisor.detectedTargets.clear();
        this.state.neuralVisor.weakPoints.clear();

        const nearbyEntities = this.entity.getNearbyEntities?.(
            this.cyberSystem.enhancements.neuralVisor.scanRadius
        ) || [];

        nearbyEntities.forEach(entity => {
            if (this.isValidTarget(entity)) {
                this.state.neuralVisor.detectedTargets.add(entity);
                const weakPoints = this.calculateWeakPoints(entity);
                if (weakPoints.length > 0) {
                    this.state.neuralVisor.weakPoints.set(entity, weakPoints);
                }
            }
        });
    }

    // Exoskeleton Methods
    toggleExoskeletonBoost() {
        if (this.state.exoskeleton.boostActive) {
            this.deactivateExoskeletonBoost();
            return false;
        }
        return this.activateExoskeletonBoost();
    }

    activateExoskeletonBoost() {
        if (!this.hasEnoughEnergy(this.cyberSystem.enhancements.exoskeleton.servoPowerCost)) {
            return false;
        }

        this.state.exoskeleton.boostActive = true;
        this.state.exoskeleton.lastBoostTime = Date.now();
        this.state.exoskeleton.currentDamageReduction = 
            this.cyberSystem.enhancements.exoskeleton.damageReduction;
        return true;
    }

    deactivateExoskeletonBoost() {
        this.state.exoskeleton.boostActive = false;
        this.state.exoskeleton.currentDamageReduction = 0;
        this.state.exoskeleton.boostedAttributes.clear();
    }

    // Effect Methods
    createClawEffects() {
        const config = this.cyberSystem.enhancements.cyberClaws.energyTrail;
        this.addEffect({
            type: 'claws',
            duration: config.lifetime,
            render: (ctx) => this.renderClawTrail(ctx, config)
        });
    }

    renderClawTrail(ctx, config) {
        if (!this.state.claws.active) return;

        const x = this.entity.x + this.entity.width / 2;
        const y = this.entity.y + this.entity.height / 2;

        ctx.save();
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        // Add trail effect rendering logic
        ctx.stroke();
        ctx.restore();
    }

    // Update Methods
    update(deltaTime) {
        this.updateWallClimb(deltaTime);
        this.updateNeuralVisor(deltaTime);
        this.updateExoskeleton(deltaTime);
        this.updateEffects(deltaTime);
    }

    updateWallClimb(deltaTime) {
        if (!this.state.wallClimb.active) return;

        const energyCost = this.cyberSystem.enhancements.cyberClaws.wallClimb.energyCost * deltaTime;
        if (!this.consumeEnergy(energyCost)) {
            this.stopWallClimb();
            return;
        }

        this.state.wallClimb.timeRemaining -= deltaTime;
        if (this.state.wallClimb.timeRemaining <= 0) {
            this.stopWallClimb();
        }
    }

    updateNeuralVisor(deltaTime) {
        if (!this.state.neuralVisor.active) return;

        const energyCost = this.cyberSystem.enhancements.neuralVisor.energyCost * (deltaTime / 1000);
        if (!this.consumeEnergy(energyCost)) {
            this.deactivateNeuralVisor();
            return;
        }

        const now = Date.now();
        if (now - this.state.neuralVisor.lastScanTime >= 
            this.cyberSystem.enhancements.neuralVisor.scanInterval) {
            this.performThreatScan();
            this.state.neuralVisor.lastScanTime = now;
        }
    }

    updateExoskeleton(deltaTime) {
        if (!this.state.exoskeleton.boostActive) return;

        const energyCost = this.cyberSystem.enhancements.exoskeleton.servoPowerCost * deltaTime;
        if (!this.consumeEnergy(energyCost)) {
            this.deactivateExoskeletonBoost();
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

    isValidTarget(entity) {
        return entity && !entity.isDead && entity.type !== 'player';
    }

    calculateWeakPoints(entity) {
        const weakPoints = [];
        if (!entity) return weakPoints;

        // Different weak points based on enemy type
        if (entity.type === 'drone') {
            weakPoints.push({
                x: entity.x + entity.width * 0.5,
                y: entity.y + entity.height * 0.3,
                radius: 5,
                damageMultiplier: 1.5
            });
        } else if (entity.type === 'cyborg') {
            weakPoints.push({
                x: entity.x + entity.width * 0.6,
                y: entity.y + entity.height * 0.4,
                radius: 6,
                damageMultiplier: 1.8
            });
        }

        return weakPoints;
    }

    addEffect(effect) {
        effect.createdAt = Date.now();
        this.activeEffects.add(effect);
    }

    cleanup() {
        this.deactivateCyberClaws();
        this.stopWallClimb();
        this.deactivateNeuralVisor();
        this.deactivateExoskeletonBoost();
        this.activeEffects.clear();
    }
}
