// src/game/Player.js
import { Animation, AnimationController, PlaceholderShapes } from './systems/AnimationSystem';
import { CombatSystem } from './combat/CombatCore';
import { CombatState } from './combat/CombatState';
import { CyberEnhancementsSystem, CyberState } from './combat/CyberEnhancements';
import { SpecialAbilitiesSystem, SpecialAbilitiesState } from './combat/SpecialAbilities';
import { AnimationConfig } from './configs/AnimationConfig';

export default class Player {
    constructor(config) {
        // Position and dimensions
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.width = 64;
        this.height = 64;
        
        // Physics
        this.velocityX = 0;
        this.velocityY = 0;
        this.maxSpeed = 5;
        this.jumpForce = -12;
        this.isGrounded = false;
        
        // Combat stats
        this.health = 120;
        this.energy = 100;
        this.maxHealth = 120;
        this.maxEnergy = 100;
        this.invulnerabilityDuration = 1000;
        this.lastDamageTime = 0;
        
        // Initialize all combat systems first
        this.initializeCombatSystems();
        
        // Animation system
        this.animator = new AnimationController();
        this.setupAnimations();
        
        // State tracking
        this.direction = 1; // 1 for right, -1 for left
        this.currentState = 'idle';
        this.isInvulnerable = false;
        this.isDead = false;
        this.isHit = false;
        this.respawnTimer = 0;
        this.respawnDelay = 1000;
        
        // Position tracking
        this.initialSpawnPosition = { x: this.x, y: this.y };
        this.lastGroundedPosition = { x: this.x, y: this.y };
        this.lastSafePosition = { x: this.x, y: this.y };
        this.updateSafePositionInterval = 100;
        this.lastSafePositionUpdate = 0;
        
        // Combat effects
        this.hitEffects = new Set();
        this.lastHitEffectCleanup = 0;
        
        // Callbacks
        this.onHealthChange = config.onHealthChange;
        this.onEnergyChange = config.onEnergyChange;
        this.onRespawn = config.onRespawn;
    }

    initializeCombatSystems() {
        // Initialize core combat
        this.combatSystem = new CombatSystem();
        this.combatState = new CombatState(this, this.combatSystem);

        // Initialize cyber enhancements
        this.cyberEnhancementsSystem = new CyberEnhancementsSystem();
        this.cyberState = new CyberState(this, this.cyberEnhancementsSystem);

        // Initialize special abilities
        this.specialAbilitiesSystem = new SpecialAbilitiesSystem();
        this.specialState = new SpecialAbilitiesState(this, this.specialAbilitiesSystem);
    }

    setupAnimations() {
        // Base movement animations
        Object.entries(AnimationConfig.BASE_ANIMATIONS).forEach(([state, config]) => {
            this.animator.addAnimation(state, new Animation(config));
        });

        // Combat animations
        Object.entries(AnimationConfig.COMBAT_ANIMATIONS).forEach(([state, config]) => {
            this.animator.addAnimation(state, new Animation(config));
        });

        // Cyber ability animations
        Object.entries(AnimationConfig.CYBER_ANIMATIONS).forEach(([state, config]) => {
            this.animator.addAnimation(state, new Animation(config));
        });

        // Special ability animations
        Object.entries(AnimationConfig.ABILITY_ANIMATIONS).forEach(([state, config]) => {
            this.animator.addAnimation(state, new Animation(config));
        });
    }
    // Main update loop
    update(deltaTime) {
      if (this.isDead) {
          this.handleDeath(deltaTime);
          return;
      }

      // Update all combat systems
      this.combatState.update(deltaTime);
      this.cyberState.update(deltaTime);
      this.specialState.update(deltaTime);

      // Update other systems
      this.updatePosition(deltaTime);
      this.updateState();
      this.updateAnimations(deltaTime);
      this.updateEffects();
      this.updateEnergyRegeneration(deltaTime);
  }

  updatePosition(deltaTime) {
      // Update safe position tracking
      const now = Date.now();
      if (this.isGrounded && !this.isHit && !this.combatState.isAttacking && 
          now - this.lastSafePositionUpdate > this.updateSafePositionInterval) {
          this.lastSafePosition = { x: this.x, y: this.y };
          this.lastSafePositionUpdate = now;
      }

      // Handle different movement states
      if (this.cyberState.state.wallClimb.active) {
          // Wall climbing physics
          this.velocityY = this.cyberEnhancementsSystem.enhancements.cyberClaws.wallClimb.slideSpeed;
      } else if (this.specialState.state.tunnelDrive.active) {
          // Tunnel Drive movement
          this.velocityX = this.direction * this.specialAbilitiesSystem.abilities.tunnelDrive.effects.speed;
          this.velocityY = 0;
      } else {
          // Normal movement physics
          this.x += this.velocityX;
          this.y += this.velocityY;

          if (!this.isGrounded) {
              this.velocityY += 0.5; // Gravity
          }
      }

      // Apply velocity decay
      this.applyVelocityDecay();
  }

  updateState() {
      // Priority-based state management
      if (this.combatState.isAttacking) {
          this.currentState = `attack_${this.combatState.getCurrentAttack()}`;
          return;
      }

      if (this.specialState.state.furySurge.active) {
          this.currentState = 'fury-surge';
          return;
      }

      if (this.specialState.state.tunnelDrive.active) {
          this.currentState = 'tunnel-drive';
          return;
      }

      if (this.specialState.state.shieldStrike.active) {
          this.currentState = 'shield-strike';
          return;
      }

      if (this.cyberState.state.claws.active) {
          this.currentState = 'cyber-claws';
          return;
      }

      if (this.cyberState.state.wallClimb.active) {
          this.currentState = 'wall-climb';
          return;
      }

      if (this.isHit) {
          this.currentState = 'hit';
          return;
      }

      // Base movement states
      if (this.isGrounded) {
          this.currentState = Math.abs(this.velocityX) > 0.1 ? 'walking' : 'idle';
      } else {
          this.currentState = this.velocityY < 0 ? 'jumping' : 'falling';
      }
  }

  updateAnimations(deltaTime) {
      this.animator.setState(this.currentState);
      this.animator.update(deltaTime);
  }

  updateEffects() {
      const now = Date.now();
      
      // Cleanup hit effects
      if (now - this.lastHitEffectCleanup > 1000) {
          this.hitEffects.clear();
          this.lastHitEffectCleanup = now;
      }

      // Update invulnerability
      if (this.isInvulnerable && now - this.lastDamageTime > this.invulnerabilityDuration) {
          this.isInvulnerable = false;
          this.isHit = false;
      }
  }

  updateEnergyRegeneration(deltaTime) {
      if (this.isDead || this.energy >= this.maxEnergy) return;

      let regenRate = 0.1;
      
      // Enhanced regeneration if exoskeleton is active
      if (this.cyberState.state.exoskeleton?.boostActive) {
          regenRate *= this.cyberEnhancementsSystem.enhancements.exoskeleton.energyRegenBoost;
      }

      // Reduced regeneration during Fury Surge
      if (this.specialState.state.furySurge.active) {
          regenRate *= 0.5;
      }
      
      this.energy = Math.min(this.maxEnergy, this.energy + regenRate * deltaTime);
      
      if (this.onEnergyChange) {
          this.onEnergyChange(this.energy);
      }
  }

  applyVelocityDecay() {
      if (this.isHit) {
          this.velocityX *= 0.9; // Stronger air resistance when hit
      } else if (!this.isGrounded) {
          this.velocityX *= 0.95; // Normal air resistance
      } else {
          this.velocityX *= 0.8; // Ground friction
      }
  }

  handleDeath(deltaTime) {
      this.respawnTimer += deltaTime * 16.67;
      if (this.respawnTimer >= this.respawnDelay) {
          this.reset(this.lastSafePosition.x, this.lastSafePosition.y);
          this.isDead = false;
          this.respawnTimer = 0;
      }
  }
  // Core Combat Methods
  attack(type = 'light') {
    if (this.isDead || this.isHit || !this.combatState) return false;
    return this.combatState.attack(type);
}

takeDamage(amount, knockbackX = 0, knockbackY = -4) {
    if (this.isDead || this.isInvulnerable) return false;

    // Apply damage modifiers from active abilities
    if (this.specialState.state.shieldStrike.active) {
        amount *= (1 - this.specialAbilitiesSystem.abilities.shieldStrike.effects.damageReduction);
    }

    if (this.cyberState.state.exoskeleton.boostActive) {
        amount *= (1 - this.cyberEnhancementsSystem.enhancements.exoskeleton.damageReduction);
    }

    this.health = Math.max(0, this.health - amount);
    this.isInvulnerable = true;
    this.isHit = true;
    this.lastDamageTime = Date.now();
    
    // Apply knockback
    this.velocityX = knockbackX * (this.cyberState.state.exoskeleton.boostActive ? 0.7 : 1);
    this.velocityY = knockbackY * (this.cyberState.state.exoskeleton.boostActive ? 0.7 : 1);
    
    // Handle death
    if (this.health <= 0) {
        this.isDead = true;
        this.currentState = 'death';
        this.respawnTimer = 0;
    }
    
    if (this.onHealthChange) {
        this.onHealthChange(this.health);
    }

    return this.isDead;
}

// Cyber Enhancement Methods
activateCyberClaws() {
    if (this.isDead || this.isHit) return false;
    return this.cyberState.activateCyberClaws();
}

startWallClimb() {
    if (!this.cyberState.state.claws.active || !this.isNextToWall) return false;
    return this.cyberState.startWallClimb();
}

stopWallClimb() {
    if (!this.cyberState.state.wallClimb.active) return;
    this.cyberState.stopWallClimb();
}

toggleNeuralVisor() {
    if (this.isDead) return false;
    return this.cyberState.toggleNeuralVisor();
}

performVisorScan() {
    if (!this.cyberState.state.neuralVisor.active) return;

    const nearbyEnemies = this.getNearbyEnemies?.() || [];
    this.cyberState.performThreatScan(nearbyEnemies);
}

activateExoskeletonBoost() {
    if (this.isDead || this.isHit) return false;
    return this.cyberState.activateExoskeletonBoost();
}

// Special Ability Methods
activateFurySurge() {
    if (this.isDead || this.isHit || this.specialState.state.furySurge.active) return false;
    
    const success = this.specialState.activateFurySurge();
    if (success) {
        // Apply fury surge effects
        this.maxSpeed *= this.specialAbilitiesSystem.abilities.furySurge.effects.speedMultiplier;
        this.animator.addEffect({
            type: 'fury',
            duration: this.specialAbilitiesSystem.abilities.furySurge.duration,
            render: (ctx) => this.renderFurySurgeEffect(ctx)
        });
    }
    return success;
}

activateTunnelDrive() {
    if (this.isDead || this.isHit || this.specialState.state.tunnelDrive.active) return false;
    
    const success = this.specialState.activateTunnelDrive();
    if (success) {
        // Store original position for emergence
        this.specialState.state.tunnelDrive.originalPosition = {
            x: this.x,
            y: this.y
        };
        
        // Make invulnerable during tunnel drive
        this.isInvulnerable = true;
    }
    return success;
}

emergeTunnelDrive() {
    if (!this.specialState.state.tunnelDrive.active) return;
    
    this.specialState.emergeTunnelDrive();
    this.isInvulnerable = false;

    // Apply emergence damage to nearby enemies
    const nearbyEnemies = this.getNearbyEnemies?.() || [];
    nearbyEnemies.forEach(enemy => {
        const distance = Math.hypot(
            enemy.x - this.x,
            enemy.y - this.y
        );
        
        if (distance <= this.specialAbilitiesSystem.abilities.tunnelDrive.effects.areaOfEffect) {
            enemy.takeDamage?.(
                this.specialAbilitiesSystem.abilities.tunnelDrive.effects.damageOnEmerge
            );
        }
    });
}

activateShieldStrike() {
    if (this.isDead || this.isHit || this.specialState.state.shieldStrike.active) return false;
    
    const success = this.specialState.activateShieldStrike();
    if (success) {
        // Add shield visual effect
        this.animator.addEffect({
            type: 'shield',
            duration: this.specialAbilitiesSystem.abilities.shieldStrike.duration,
            render: (ctx) => this.renderShieldEffect(ctx)
        });
    }
    return success;
}

performShieldBash() {
    if (!this.specialState.state.shieldStrike.active ||
        !this.specialState.state.shieldStrike.bashReady) return false;

    const success = this.specialState.performShieldBash();
    if (success) {
        // Apply bash damage to nearby enemies
        const nearbyEnemies = this.getNearbyEnemies?.() || [];
        nearbyEnemies.forEach(enemy => {
            const distance = Math.hypot(
                enemy.x - this.x,
                enemy.y - this.y
            );
            
            if (distance <= this.specialAbilitiesSystem.abilities.shieldStrike.effects.areaOfEffect) {
                enemy.takeDamage?.(
                    this.specialAbilitiesSystem.abilities.shieldStrike.effects.bashDamage
                );
            }
        });
    }
    return success;
}

// Ability Helper Methods
hasEnoughEnergy(cost) {
    return this.energy >= cost;
}

consumeEnergy(amount) {
    if (!this.hasEnoughEnergy(amount)) return false;
    
    this.energy = Math.max(0, this.energy - amount);
    if (this.onEnergyChange) {
        this.onEnergyChange(this.energy);
    }
    return true;
}

getAttackBox() {
    return this.combatState.getAttackBox();
}

isAbilityReady(abilityName) {
    switch (abilityName) {
        case 'cyberClaws':
            return this.cyberState.canActivateCyberClaws();
        case 'furySurge':
            return this.specialState.canActivateAbility('furySurge');
        case 'tunnelDrive':
            return this.specialState.canActivateAbility('tunnelDrive');
        case 'shieldStrike':
            return this.specialState.canActivateAbility('shieldStrike');
        default:
            return false;
    }
}

getAbilityCooldown(abilityName) {
    switch (abilityName) {
        case 'furySurge':
        case 'tunnelDrive':
        case 'shieldStrike':
            return this.specialState.getAbilityCooldown(abilityName);
        default:
            return 0;
    }
}
// Main Render Method
render(ctx) {
  if (this.isDead && this.respawnTimer < this.respawnDelay) return;

  ctx.save();

  // Invulnerability flash effect
  if (this.isInvulnerable) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
  }

  // Base character rendering
  this.renderBase(ctx);

  // Ability overlays and effects
  this.renderAbilityEffects(ctx);

  // Combat effects
  this.renderCombatEffects(ctx);

  // Status bars and indicators
  this.renderStatusBars(ctx);

  ctx.restore();
}

renderBase(ctx) {
  // Basic shape rendering
  ctx.fillStyle = '#393945';
  ctx.fillRect(this.x, this.y, this.width, this.height);

  // Direction indicator
  ctx.fillStyle = '#ff3333';
  const eyeOffset = this.direction > 0 ? this.width * 0.25 : this.width * 0.6;
  ctx.fillRect(
      this.x + eyeOffset,
      this.y + this.height * 0.25,
      this.width * 0.15,
      this.height * 0.1
  );

  // Animation state-specific rendering
  switch (this.currentState) {
      case 'walking':
          const bounce = Math.sin(Date.now() * 0.01) * 2;
          ctx.translate(0, bounce);
          break;
      case 'jumping':
          this.renderJumpEffect(ctx);
          break;
      case 'attacking':
          this.renderAttackEffect(ctx);
          break;
  }
}

renderAbilityEffects(ctx) {
  // Cyber Enhancement Effects
  if (this.cyberState.state.claws.active) {
      this.renderClawEffects(ctx);
  }

  if (this.cyberState.state.wallClimb.active) {
      this.renderWallClimbEffects(ctx);
  }

  if (this.cyberState.state.neuralVisor.active) {
      this.renderVisorOverlay(ctx);
  }

  // Special Ability Effects
  if (this.specialState.state.furySurge.active) {
      this.renderFurySurgeEffect(ctx);
  }

  if (this.specialState.state.tunnelDrive.active) {
      this.renderTunnelDriveEffect(ctx);
  }

  if (this.specialState.state.shieldStrike.active) {
      this.renderShieldEffect(ctx);
  }
}

renderJumpEffect(ctx) {
  ctx.strokeStyle = '#2b4366';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
      const offset = i * 5;
      ctx.beginPath();
      ctx.moveTo(this.x + this.width * 0.2, this.y + this.height + offset);
      ctx.lineTo(this.x + this.width * 0.8, this.y + this.height + offset);
      ctx.stroke();
  }
}

renderAttackEffect(ctx) {
  const attackX = this.direction > 0 ? this.x + this.width : this.x - this.width/2;
  ctx.fillStyle = '#ff3333';
  ctx.globalAlpha = 0.5;
  ctx.fillRect(attackX, this.y + 8, this.width/2, this.height - 16);
  ctx.globalAlpha = 1;
}

renderClawEffects(ctx) {
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;
  const clawLength = 15;
  const spacing = 5;

  for (let i = 0; i < 3; i++) {
      const startX = this.direction > 0 ? this.x + this.width : this.x;
      const startY = this.y + this.height * 0.3 + (i * spacing);
      const endX = this.direction > 0 ? startX + clawLength : startX - clawLength;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, startY);
      ctx.stroke();
  }
}

renderWallClimbEffects(ctx) {
  ctx.strokeStyle = '#0088ff';
  ctx.lineWidth = 2;
  const particleCount = 5;

  for (let i = 0; i < particleCount; i++) {
      const y = this.y + (this.height * (i / particleCount));
      ctx.beginPath();
      ctx.arc(
          this.x + (this.direction > 0 ? this.width : 0),
          y,
          2,
          0,
          Math.PI * 2
      );
      ctx.stroke();
  }
}

renderVisorOverlay(ctx) {
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 1;

  // Scan effect
  const scanRadius = this.cyberEnhancementsSystem.enhancements.neuralVisor.scanRadius;
  const scanAngle = (Date.now() / 500) % (Math.PI * 2);
  
  ctx.beginPath();
  ctx.arc(
      this.x + this.width/2,
      this.y + this.height/2,
      scanRadius,
      scanAngle,
      scanAngle + Math.PI/4
  );
  ctx.stroke();

  // Visor overlay
  ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
  ctx.fillRect(
      this.x - scanRadius,
      this.y - scanRadius,
      scanRadius * 2,
      scanRadius * 2
  );
}

renderFurySurgeEffect(ctx) {
  const config = this.specialAbilitiesSystem.abilities.furySurge.effects;
  const radius = this.width * 1.2;
  const intensity = (1 + Math.sin(Date.now() * 0.01)) * 0.5;

  ctx.beginPath();
  ctx.arc(
      this.x + this.width/2,
      this.y + this.height/2,
      radius,
      0,
      Math.PI * 2
  );
  ctx.fillStyle = `${config.particleColor}${Math.floor(intensity * 33).toString(16)}`;
  ctx.fill();
}

renderTunnelDriveEffect(ctx) {
  const config = this.specialAbilitiesSystem.abilities.tunnelDrive.effects;
  
  // Ground distortion
  ctx.fillStyle = config.particleColor;
  for (let i = 0; i < 10; i++) {
      const x = this.x + (Math.random() * this.width);
      const y = this.y + this.height + (Math.random() * 10);
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
  }
}

renderShieldEffect(ctx) {
  const config = this.specialAbilitiesSystem.abilities.shieldStrike.effects;
  const radius = this.width * 1.5;
  
  ctx.beginPath();
  ctx.arc(
      this.x + this.width/2,
      this.y + this.height/2,
      radius,
      0,
      Math.PI * 2
  );
  ctx.strokeStyle = config.particleColor;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = `${config.particleColor}22`;
  ctx.fill();
}

renderStatusBars(ctx) {
  if (this.isDead) return;

  const barWidth = 50;
  const barHeight = 5;
  const barX = this.x + this.width/2 - barWidth/2;
  const barY = this.y - 20;

  // Health bar
  this.renderBar(ctx, barX, barY, barWidth, barHeight, 
      this.health / this.maxHealth, '#ff0000');

  // Energy bar
  this.renderBar(ctx, barX, barY - 7, barWidth, barHeight, 
      this.energy / this.maxEnergy, '#00ffff');

  // Ability indicators
  this.renderAbilityIndicators(ctx, barX, barY - 15);
}

renderBar(ctx, x, y, width, height, fillPercent, color) {
  // Bar background
  ctx.fillStyle = '#333333';
  ctx.fillRect(x, y, width, height);

  // Bar fill
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * fillPercent, height);

  // Bar border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}

renderAbilityIndicators(ctx, x, y) {
  ctx.font = '10px Arial';
  ctx.textAlign = 'left';
  
  let indicators = [];

  // Combo counter
  if (this.combatState.comboCount > 0) {
      indicators.push(`${this.combatState.comboCount}x`);
  }

  // Active abilities
  if (this.cyberState.state.claws.active) indicators.push('CLAWS');
  if (this.cyberState.state.neuralVisor.active) indicators.push('VISOR');
  if (this.specialState.state.furySurge.active) indicators.push('FURY');
  if (this.specialState.state.shieldStrike.active) indicators.push('SHIELD');

  // Render indicators
  if (indicators.length > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(indicators.join(' | '), x, y);
  }
}

renderCombatEffects(ctx) {
  // Render all active combat effects
  this.hitEffects.forEach(effect => {
      effect.render(ctx);
  });

  // Render combo effects
  if (this.combatState.isAttacking) {
      this.combatState.renderAttackEffects(ctx);
  }
}
// Reset and Cleanup Methods
reset(x, y) {
  // Position reset
  this.initialSpawnPosition = { x, y };
  this.x = x;
  this.y = y;
  this.velocityX = 0;
  this.velocityY = 0;
  
  // Safe positions
  this.lastGroundedPosition = { x, y };
  this.lastSafePosition = { x, y };
  
  // Stats reset
  this.health = this.maxHealth;
  this.energy = this.maxEnergy;
  
  // State reset
  this.isDead = false;
  this.isHit = false;
  this.isInvulnerable = false;
  this.isGrounded = false;
  this.direction = 1;
  this.currentState = 'idle';
  this.respawnTimer = 0;
  
  // Combat systems reset
  this.combatState.cleanup();
  this.cyberState.cleanup();
  this.specialState.cleanup();
  
  // Effect cleanup
  this.hitEffects.clear();
  this.animator.effects.clear();
  
  // Notify of changes
  if (this.onHealthChange) {
      this.onHealthChange(this.health);
  }
  if (this.onEnergyChange) {
      this.onEnergyChange(this.energy);
  }
  if (this.onRespawn) {
      this.onRespawn();
  }
}

// Collision and Hit Detection Methods
getHitbox() {
  return {
      x: this.x + this.width * 0.2,
      y: this.y,
      width: this.width * 0.6,
      height: this.height
  };
}

checkCollision(other) {
  const hitbox = this.getHitbox();
  return !(hitbox.x + hitbox.width < other.x ||
          hitbox.x > other.x + other.width ||
          hitbox.y + hitbox.height < other.y ||
          hitbox.y > other.y + other.height);
}

handleCollision(other, direction) {
  if (this.specialState.state.tunnelDrive.active) return;

  switch (direction) {
      case 'top':
          this.y = other.y - this.height;
          this.velocityY = 0;
          this.isGrounded = true;
          break;
      case 'bottom':
          this.y = other.y + other.height;
          this.velocityY = 0;
          break;
      case 'left':
          this.x = other.x - this.width;
          this.velocityX = 0;
          break;
      case 'right':
          this.x = other.x + other.width;
          this.velocityX = 0;
          break;
  }
}

// State Check Methods
get isMoving() {
  return Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1;
}

get isNextToWall() {
  // This should be implemented based on your collision system
  // For now, returning a placeholder
  return false;
}

get isAttacking() {
  return this.combatState.isAttacking;
}

get canMove() {
  return !this.isDead && 
         !this.isHit && 
         !this.isAttacking && 
         !this.specialState.state.shieldStrike.active;
}

// Effect and Animation Helper Methods
addHitEffect(effect) {
  effect.createdAt = Date.now();
  this.hitEffects.add(effect);
}

addAnimationEffect(effect) {
  this.animator.addEffect(effect);
}

// Enemy Detection Methods
getNearbyEnemies(radius = 200) {
  // This should be implemented by the game engine
  // and passed to the player instance
  return [];
}

getClosestEnemy() {
  const enemies = this.getNearbyEnemies();
  if (enemies.length === 0) return null;

  let closest = null;
  let closestDistance = Infinity;

  enemies.forEach(enemy => {
      const distance = Math.hypot(
          enemy.x - this.x,
          enemy.y - this.y
      );
      if (distance < closestDistance) {
          closest = enemy;
          closestDistance = distance;
      }
  });

  return closest;
}

// Position and Movement Helpers
setPosition(x, y) {
  this.x = x;
  this.y = y;
  this.updateSafePosition();
}

updateSafePosition() {
  if (this.isGrounded && !this.isHit && !this.isAttacking) {
      this.lastSafePosition = { x: this.x, y: this.y };
      this.lastSafePositionUpdate = Date.now();
  }
}

respawnAtLastSafePosition() {
  this.setPosition(this.lastSafePosition.x, this.lastSafePosition.y);
}

// Status Check Methods
getAbilityStatus(abilityName) {
  const status = {
      isReady: this.isAbilityReady(abilityName),
      cooldownPercent: this.getAbilityCooldown(abilityName),
      energyCost: this.getAbilityEnergyCost(abilityName),
      isActive: false
  };

  switch (abilityName) {
      case 'cyberClaws':
          status.isActive = this.cyberState.state.claws.active;
          break;
      case 'neuralVisor':
          status.isActive = this.cyberState.state.neuralVisor.active;
          break;
      case 'furySurge':
          status.isActive = this.specialState.state.furySurge.active;
          break;
      case 'tunnelDrive':
          status.isActive = this.specialState.state.tunnelDrive.active;
          break;
      case 'shieldStrike':
          status.isActive = this.specialState.state.shieldStrike.active;
          break;
  }

  return status;
}

getAbilityEnergyCost(abilityName) {
  switch (abilityName) {
      case 'cyberClaws':
          return this.cyberEnhancementsSystem.enhancements.cyberClaws.base.energyCost;
      case 'furySurge':
          return this.specialAbilitiesSystem.abilities.furySurge.energyCost;
      case 'tunnelDrive':
          return this.specialAbilitiesSystem.abilities.tunnelDrive.energyCost;
      case 'shieldStrike':
          return this.specialAbilitiesSystem.abilities.shieldStrike.energyCost;
      default:
          return 0;
  }
}

// Debug Methods
getDebugInfo() {
  return {
      position: { x: this.x, y: this.y },
      velocity: { x: this.velocityX, y: this.velocityY },
      state: this.currentState,
      health: this.health,
      energy: this.energy,
      isGrounded: this.isGrounded,
      isAttacking: this.isAttacking,
      combo: this.combatState.currentCombo,
      activeAbilities: {
          cyberClaws: this.cyberState.state.claws.active,
          wallClimb: this.cyberState.state.wallClimb.active,
          neuralVisor: this.cyberState.state.neuralVisor.active,
          furySurge: this.specialState.state.furySurge.active,
          tunnelDrive: this.specialState.state.tunnelDrive.active,
          shieldStrike: this.specialState.state.shieldStrike.active
      }
  };
}
}