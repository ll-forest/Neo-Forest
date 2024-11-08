// src/game/systems/AnimationSystem.js
import { AnimationConfig } from '../configs/AnimationConfig';

export class Animation {
    constructor(config) {
      this.frameWidth = config.frameWidth;
      this.frameHeight = config.frameHeight;
      this.frames = config.frames || 1;
      this.frameDuration = config.frameDuration || 5;
      this.loop = config.loop !== undefined ? config.loop : true;
      this.spriteKey = config.spriteKey;
      this.effects = config.effects || {};
      this.onComplete = config.onComplete;
      
      // Animation state
      this.currentFrame = 0;
      this.frameTimer = 0;
      this.isFinished = false;
      this.activeEffects = new Set();
    }
  
    update(deltaTime) {
      if (this.isFinished && !this.loop) {
        if (this.onComplete) this.onComplete();
        return;
      }
  
      this.frameTimer++;
      if (this.frameTimer >= this.frameDuration) {
        this.frameTimer = 0;
        this.currentFrame = (this.currentFrame + 1) % this.frames;
        
        if (this.currentFrame === 0 && !this.loop) {
          this.isFinished = true;
          if (this.onComplete) this.onComplete();
        }
      }

      // Update effects
      this.activeEffects.forEach(effect => {
        effect.update?.(deltaTime);
        if (effect.isComplete?.()) {
          this.activeEffects.delete(effect);
        }
      });
    }
  
    reset() {
      this.currentFrame = 0;
      this.frameTimer = 0;
      this.isFinished = false;
      this.activeEffects.clear();
    }

    addEffect(effect) {
      this.activeEffects.add(effect);
    }

    renderEffects(ctx, x, y, width, height, direction) {
      this.activeEffects.forEach(effect => {
        effect.render?.(ctx, x, y, width, height, direction);
      });
    }
}

export class AnimationController {
    constructor() {
      this.animations = new Map();
      this.currentAnimation = null;
      this.currentState = 'idle';
      this.effects = new Set();
      this.lastEffectCleanup = 0;
    }
  
    addAnimation(state, animation) {
      this.animations.set(state, animation);
      if (!this.currentAnimation) {
        this.currentAnimation = animation;
      }
    }
  
    setState(newState) {
      if (newState !== this.currentState) {
        const animation = this.animations.get(newState);
        if (animation) {
          this.currentState = newState;
          this.currentAnimation = animation;
          this.currentAnimation.reset();
        }
      }
    }
  
    update(deltaTime) {
      // Update current animation
      if (this.currentAnimation) {
        this.currentAnimation.update(deltaTime);
      }

      // Clean up effects periodically
      const now = Date.now();
      if (now - this.lastEffectCleanup > 1000) {
        this.cleanupEffects();
        this.lastEffectCleanup = now;
      }
    }
  
    getCurrentFrame() {
      return this.currentAnimation ? this.currentAnimation.currentFrame : 0;
    }

    addEffect(effect) {
      this.effects.add(effect);
    }

    cleanupEffects() {
      this.effects.forEach(effect => {
        if (effect.isComplete?.()) {
          this.effects.delete(effect);
        }
      });
    }

    render(ctx, x, y, width, height, direction) {
      // Render current animation's effects
      this.currentAnimation?.renderEffects(ctx, x, y, width, height, direction);

      // Render global effects
      this.effects.forEach(effect => {
        effect.render?.(ctx, x, y, width, height, direction);
      });
    }
}

// Add Neo-Badger specific placeholder shapes
export class PlaceholderShapes {
    // ... (keep existing shape methods)

    static cyberClaws(ctx, x, y, width, height, direction, frame) {
      // Base shape
      PlaceholderShapes.idle(ctx, x, y, width, height, direction);
      
      // Claw effects
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      const clawLength = 15;
      const spacing = 5;
      
      for (let i = 0; i < 3; i++) {
        const startX = direction > 0 ? x + width : x;
        const startY = y + height * 0.3 + (i * spacing);
        const endX = direction > 0 ? startX + clawLength : startX - clawLength;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, startY);
        ctx.stroke();
      }
    }

    static wallClimb(ctx, x, y, width, height, direction, frame) {
      // Stretched body against wall
      ctx.fillStyle = '#393945';
      ctx.fillRect(x, y, width * 0.8, height);
      
      // Claw marks
      ctx.strokeStyle = '#0088ff';
      ctx.lineWidth = 2;
      const markSpacing = height / 3;
      
      for (let i = 0; i < 3; i++) {
        const markY = y + (i * markSpacing);
        ctx.beginPath();
        ctx.moveTo(x, markY);
        ctx.lineTo(x + 10, markY + 10);
        ctx.stroke();
      }
    }

    static furySurge(ctx, x, y, width, height, direction, frame) {
      // Base shape with aura
      PlaceholderShapes.idle(ctx, x, y, width, height, direction);
      
      // Fury aura
      ctx.strokeStyle = '#ff3300';
      ctx.lineWidth = 2;
      const auraSize = Math.sin(frame * 0.2) * 5;
      
      ctx.beginPath();
      ctx.arc(x + width/2, y + height/2, width/2 + auraSize, 0, Math.PI * 2);
      ctx.stroke();
    }

    static tunnelDrive(ctx, x, y, width, height, direction, frame) {
      // Underground shape
      ctx.fillStyle = '#393945';
      ctx.fillRect(x, y + height/2, width, height/2);
      
      // Dirt particles
      ctx.fillStyle = '#8B4513';
      for (let i = 0; i < 5; i++) {
        const particleX = x + (Math.random() * width);
        const particleY = y + height - (Math.random() * height/2);
        ctx.beginPath();
        ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    static shieldStrike(ctx, x, y, width, height, direction, frame) {
      // Base shape
      PlaceholderShapes.idle(ctx, x, y, width, height, direction);
      
      // Shield effect
      ctx.strokeStyle = '#4169E1';
      ctx.lineWidth = 3;
      const shieldWidth = width * 1.5;
      const shieldHeight = height * 1.2;
      
      ctx.beginPath();
      ctx.ellipse(
        x + width/2,
        y + height/2,
        shieldWidth/2,
        shieldHeight/2,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    static neuralVisor(ctx, x, y, width, height, direction, frame) {
      // Base shape
      PlaceholderShapes.idle(ctx, x, y, width, height, direction);
      
      // Visor effect
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 1;
      const scanRadius = 200;
      const scanAngle = (frame * Math.PI / 8) % (Math.PI * 2);
      
      ctx.beginPath();
      ctx.arc(x + width/2, y + height/2, scanRadius, 
              scanAngle, scanAngle + Math.PI/4);
      ctx.stroke();
    }

    static attacking(ctx, x, y, width, height, direction, frame) {
      // Base attack animation
      PlaceholderShapes.attacking(ctx, x, y, width, height, direction, frame);
      
      // Enhanced attack effect for Neo-Badger
      const attackX = direction > 0 ? x + width : x - width/2;
      
      // Energy trail
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      const trailPoints = [
        { x: attackX, y: y + height * 0.2 },
        { x: attackX + (direction > 0 ? width/2 : -width/2), y: y + height * 0.5 },
        { x: attackX, y: y + height * 0.8 }
      ];
      
      ctx.beginPath();
      ctx.moveTo(trailPoints[0].x, trailPoints[0].y);
      trailPoints.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
}