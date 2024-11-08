// src/game/configs/AnimationConfig.js

const ANIMATION_TYPES = {
    ATTACK: 'attack',
    ABILITY: 'ability',
    EFFECT: 'effect',
    CYBER: 'cyber',
    MOVEMENT: 'movement'
  };
  
  // Base player movement animations
  const BASE_ANIMATIONS = {
    idle: {
      frameWidth: 64,
      frameHeight: 64,
      frames: 4,
      frameDuration: 10,
      loop: true,
      spriteKey: 'idle'
    },
    walking: {
      frameWidth: 64,
      frameHeight: 64,
      frames: 6,
      frameDuration: 6,
      loop: true,
      spriteKey: 'walk'
    },
    jumping: {
      frameWidth: 64,
      frameHeight: 64,
      frames: 4,
      frameDuration: 8,
      loop: false,
      spriteKey: 'jump'
    },
    falling: {
      frameWidth: 64,
      frameHeight: 64,
      frames: 2,
      frameDuration: 10,
      loop: true,
      spriteKey: 'fall'
    }
  };
  
  // Combat animations
  const COMBAT_ANIMATIONS = {
    // Basic attacks
    'attack-light': {
      type: ANIMATION_TYPES.ATTACK,
      frameWidth: 96,  // Wider frame for attack reach
      frameHeight: 64,
      frames: 4,
      frameDuration: 4,
      loop: false,
      spriteKey: 'attack-light',
      effects: {
        trail: {
          color: '#00ffff',
          width: 2,
          fadeRate: 0.1,
          segments: 4
        }
      }
    },
    'attack-heavy': {
      type: ANIMATION_TYPES.ATTACK,
      frameWidth: 96,
      frameHeight: 64,
      frames: 6,
      frameDuration: 5,
      loop: false,
      spriteKey: 'attack-heavy',
      effects: {
        trail: {
          color: '#ff3333',
          width: 3,
          fadeRate: 0.15,
          segments: 6
        }
      }
    },
    'attack-special': {
      type: ANIMATION_TYPES.ATTACK,
      frameWidth: 96,
      frameHeight: 64,
      frames: 8,
      frameDuration: 6,
      loop: false,
      spriteKey: 'attack-special',
      effects: {
        trail: {
          color: '#ffff00',
          width: 4,
          fadeRate: 0.2,
          segments: 8
        }
      }
    }
  };
  
  // Combo animations
  const COMBO_ANIMATIONS = {
    'combo-light-light': {
      type: ANIMATION_TYPES.ATTACK,
      frameWidth: 96,
      frameHeight: 64,
      frames: 6,
      frameDuration: 4,
      loop: false,
      spriteKey: 'combo-light-light',
      effects: {
        trail: {
          color: '#00ffaa',
          width: 2,
          fadeRate: 0.12,
          segments: 6
        },
        impact: {
          particles: 6,
          spread: 0.3,
          speed: 2
        }
      }
    },
    'combo-light-heavy': {
      type: ANIMATION_TYPES.ATTACK,
      frameWidth: 96,
      frameHeight: 64,
      frames: 7,
      frameDuration: 5,
      loop: false,
      spriteKey: 'combo-light-heavy',
      effects: {
        trail: {
          color: '#ff00aa',
          width: 3,
          fadeRate: 0.15,
          segments: 7
        },
        impact: {
          particles: 8,
          spread: 0.4,
          speed: 3
        }
      }
    },
    'combo-heavy-heavy': {
      type: ANIMATION_TYPES.ATTACK,
      frameWidth: 96,
      frameHeight: 64,
      frames: 8,
      frameDuration: 6,
      loop: false,
      spriteKey: 'combo-heavy-heavy',
      effects: {
        trail: {
          color: '#ff3333',
          width: 4,
          fadeRate: 0.18,
          segments: 8
        },
        impact: {
          particles: 10,
          spread: 0.5,
          speed: 4
        }
      }
    }
  };
  
  // Cybernetic enhancement animations
  const CYBER_ANIMATIONS = {
    'cyber-claws': {
      type: ANIMATION_TYPES.CYBER,
      frameWidth: 64,
      frameHeight: 64,
      frames: 4,
      frameDuration: 4,
      loop: false,
      spriteKey: 'cyber-claws',
      effects: {
        glow: {
          color: '#00ffff',
          radius: 20,
          intensity: 0.7
        },
        trail: {
          color: '#00ffff',
          width: 2,
          fadeRate: 0.1
        }
      }
    },
    'wall-climb': {
      type: ANIMATION_TYPES.CYBER,
      frameWidth: 64,
      frameHeight: 64,
      frames: 4,
      frameDuration: 6,
      loop: true,
      spriteKey: 'wall-climb',
      effects: {
        particles: {
          color: '#0088ff',
          count: 3,
          spread: 0.2,
          speed: 1
        }
      }
    },
    'neural-visor': {
      type: ANIMATION_TYPES.CYBER,
      frameWidth: 64,
      frameHeight: 64,
      frames: 2,
      frameDuration: 10,
      loop: true,
      spriteKey: 'neural-visor',
      effects: {
        scan: {
          color: '#ff0000',
          radius: 200,
          pulseRate: 0.5
        },
        highlight: {
          color: '#ff0000',
          opacity: 0.3,
          pulseRate: 1
        }
      }
    },
    'exo-boost': {
      type: ANIMATION_TYPES.CYBER,
      frameWidth: 64,
      frameHeight: 64,
      frames: 3,
      frameDuration: 8,
      loop: false,
      spriteKey: 'exo-boost',
      effects: {
        particles: {
          color: '#4444ff',
          count: 5,
          spread: 0.3,
          speed: 2
        }
      }
    }
  };
  
  // Special ability animations
  const ABILITY_ANIMATIONS = {
    'fury-surge': {
      type: ANIMATION_TYPES.ABILITY,
      frameWidth: 96,
      frameHeight: 96, // Larger frame for the effect
      frames: 8,
      frameDuration: 5,
      loop: true,
      spriteKey: 'fury-surge',
      effects: {
        aura: {
          color: '#ff3300',
          radius: 40,
          pulseRate: 0.8,
          particles: {
            count: 12,
            spread: 0.6,
            speed: 3
          }
        }
      }
    },
    'tunnel-drive': {
      type: ANIMATION_TYPES.ABILITY,
      frameWidth: 64,
      frameHeight: 64,
      frames: 6,
      frameDuration: 4,
      loop: true,
      spriteKey: 'tunnel-drive',
      effects: {
        ground: {
          color: '#8B4513',
          width: 40,
          particles: {
            count: 8,
            spread: 0.4,
            speed: 2
          }
        },
        emerge: {
          radius: 60,
          particles: {
            count: 15,
            spread: 1,
            speed: 4
          }
        }
      }
    },
    'shield-strike': {
      type: ANIMATION_TYPES.ABILITY,
      frameWidth: 96,
      frameHeight: 96,
      frames: 6,
      frameDuration: 6,
      loop: false,
      spriteKey: 'shield-strike',
      effects: {
        barrier: {
          color: '#4169E1',
          opacity: 0.3,
          pulseRate: 0.5,
          radius: 50
        },
        reflect: {
          color: '#ffffff',
          width: 3,
          fadeRate: 0.2
        },
        bash: {
          particles: {
            count: 10,
            spread: 0.8,
            speed: 3
          }
        }
      }
    }
  };
  
  // Helper class for managing animation states
  export class AnimationState {
    constructor(config) {
      this.currentFrame = 0;
      this.frameTimer = 0;
      this.config = config;
      this.finished = false;
      this.effects = new Set();
    }
  
    update(deltaTime) {
      this.frameTimer += deltaTime;
      if (this.frameTimer >= this.config.frameDuration) {
        this.frameTimer = 0;
        this.currentFrame++;
        
        if (this.currentFrame >= this.config.frames) {
          if (this.config.loop) {
            this.currentFrame = 0;
          } else {
            this.currentFrame = this.config.frames - 1;
            this.finished = true;
          }
        }
      }
    }
  
    isComplete() {
      return this.finished;
    }
  
    reset() {
      this.currentFrame = 0;
      this.frameTimer = 0;
      this.finished = false;
      this.effects.clear();
    }
  }
  
  export const AnimationConfig = {
    ANIMATION_TYPES,
    BASE_ANIMATIONS,
    COMBAT_ANIMATIONS,
    COMBO_ANIMATIONS,
    CYBER_ANIMATIONS,
    ABILITY_ANIMATIONS,
    
    // Helper method to get animation config by key
    getAnimation(key) {
      return {
        ...BASE_ANIMATIONS[key] ||
           COMBAT_ANIMATIONS[key] ||
           COMBO_ANIMATIONS[key] ||
           CYBER_ANIMATIONS[key] ||
           ABILITY_ANIMATIONS[key]
      };
    }
  };
  
  export default AnimationConfig;