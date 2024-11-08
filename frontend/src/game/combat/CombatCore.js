// src/game/combat/CombatCore.js

// Configuration object for particle and visual effects
export const EFFECTS_CONFIG = {
    energyTrail: {
      baseColor: '#00ffff',
      density: 3,
      fadeRate: 0.05,
      lifetime: 300
    },
    weakPoint: {
      highlightColor: '#ff0000',
      pulseRate: 0.5,
      size: 8
    },
    damageNumbers: {
      fontSize: 16,
      floatSpeed: 1,
      lifetime: 1000
    }
  };
  
  export class CombatSystem {
    constructor() {
      // Standard attack configurations
      this.attacks = {
        light: {
          damage: 15,
          energy: 15,
          cooldown: 300,
          range: 1.0,
          knockback: { x: 3, y: -2 },
          animation: {
            frames: 4,
            duration: 4,
            loop: false,
            spriteKey: 'attack-light'
          },
          particleConfig: {
            color: '#00ffff',
            count: 3,
            spread: 0.8,
            lifetime: 300,
            trail: true
          }
        },
        heavy: {
          damage: 30,
          energy: 25,
          cooldown: 600,
          range: 1.2,
          knockback: { x: 5, y: -3 },
          animation: {
            frames: 5,
            duration: 6,
            loop: false,
            spriteKey: 'attack-heavy'
          },
          particleConfig: {
            color: '#ff3333',
            count: 5,
            spread: 1.0,
            lifetime: 400,
            trail: true
          }
        },
        special: {
          damage: 40,
          energy: 40,
          cooldown: 800,
          range: 1.5,
          knockback: { x: 7, y: -4 },
          animation: {
            frames: 6,
            duration: 8,
            loop: false,
            spriteKey: 'attack-special'
          },
          particleConfig: {
            color: '#ffff00',
            count: 7,
            spread: 1.2,
            lifetime: 500,
            trail: true
          }
        }
      };
  
      // Enhanced combo system
      this.combos = {
        'light-light': {
          damage: 1.3,
          particleColor: '#00ffaa',
          energyTrail: true,
          animation: {
            frames: 5,
            duration: 5,
            spriteKey: 'combo-light-light'
          }
        },
        'light-heavy': {
          damage: 1.5,
          particleColor: '#ff00aa',
          energyTrail: true,
          animation: {
            frames: 6,
            duration: 6,
            spriteKey: 'combo-light-heavy'
          }
        },
        'heavy-heavy': {
          damage: 1.8,
          particleColor: '#ff3333',
          energyTrail: true,
          animation: {
            frames: 7,
            duration: 7,
            spriteKey: 'combo-heavy-heavy'
          }
        },
        'light-light-heavy': {
          damage: 2.0,
          particleColor: '#ffff00',
          energyTrail: true,
          animation: {
            frames: 8,
            duration: 8,
            spriteKey: 'combo-light-light-heavy'
          }
        },
        'light-heavy-special': {
          damage: 2.5,
          particleColor: '#ffffff',
          energyTrail: true,
          animation: {
            frames: 10,
            duration: 10,
            spriteKey: 'combo-light-heavy-special'
          }
        }
      };
    }
  
    getComboMultiplier(comboString) {
      return this.combos[comboString]?.damage || 1.0;
    }
  
    getComboParticleColor(comboString) {
      return this.combos[comboString]?.particleColor || '#ffffff';
    }
  
    getAttackConfig(type, comboCount = 0, currentCombo = '') {
      const base = this.attacks[type];
      if (!base) return null;
  
      const comboMultiplier = this.getComboMultiplier(currentCombo);
      
      return {
        ...base,
        damage: base.damage * comboMultiplier * (1 + (comboCount * 0.1)),
        range: base.range * (1 + (comboCount * 0.05)),
        knockback: {
          x: base.knockback.x * (1 + (comboCount * 0.1)),
          y: base.knockback.y
        },
        particleConfig: {
          ...base.particleConfig,
          color: this.getComboParticleColor(currentCombo) || base.particleConfig.color,
          count: base.particleConfig.count + comboCount
        }
      };
    }
  
    isValidCombo(currentCombo) {
      return Boolean(this.combos[currentCombo]);
    }
  
    getNextComboWindow(attackType, currentCombo = '') {
      const possibleCombos = Object.keys(this.combos).filter(combo => 
        combo.startsWith(currentCombo ? `${currentCombo}-${attackType}` : attackType)
      );
      
      return possibleCombos.length > 0 ? 800 : 500;
    }
  }