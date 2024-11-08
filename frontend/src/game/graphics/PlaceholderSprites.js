// src/game/graphics/PlaceholderSprites.js
export default class PlaceholderSprites {
    static colors = {
      body: '#393945',
      armor: '#2b4366',
      eyes: '#ff3333',
      energy: '#00ffff',
      scarf: '#004455'
    };
  
    static drawPlayer(ctx, x, y, width, height, state, direction) {
      ctx.save();
      
      // If facing left, flip the context
      if (direction === -1) {
        ctx.translate(x + width, y);
        ctx.scale(-1, 1);
        x = 0;
        y = 0;
      }
  
      // Base body
      ctx.fillStyle = this.colors.body;
      ctx.fillRect(x, y, width, height);
  
      // Armor plate
      ctx.fillStyle = this.colors.armor;
      ctx.fillRect(x + width * 0.2, y + height * 0.1, width * 0.6, height * 0.4);
  
      // Eyes
      ctx.fillStyle = this.colors.eyes;
      const eyeWidth = width * 0.15;
      const eyeHeight = height * 0.1;
      ctx.fillRect(x + width * 0.3, y + height * 0.2, eyeWidth, eyeHeight);
      ctx.fillRect(x + width * 0.55, y + height * 0.2, eyeWidth, eyeHeight);
  
      // Energy core
      ctx.fillStyle = this.colors.energy;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(x + width * 0.4, y + height * 0.3, width * 0.2, height * 0.15);
      ctx.globalAlpha = 1;
  
      // State-specific effects
      switch (state) {
        case 'jumping':
          // Jump effect
          ctx.fillStyle = this.colors.energy;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(x, y + height * 0.9, width, height * 0.1);
          break;
        case 'attacking':
          // Attack effect
          ctx.fillStyle = this.colors.eyes;
          ctx.globalAlpha = 0.6;
          const attackWidth = width * 0.4;
          ctx.fillRect(x + width * 0.8, y + height * 0.3, attackWidth, height * 0.2);
          break;
        case 'hit':
          // Hit effect
          ctx.fillStyle = '#ff0000';
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x, y, width, height);
          break;
      }
  
      ctx.restore();
    }
  
    static drawEnemy(ctx, x, y, width, height, type) {
      ctx.save();
      
      switch (type) {
        case 'drone':
          // Drone Squirrel
          ctx.fillStyle = '#663366';
          ctx.fillRect(x, y, width, height);
          // Eyes
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(x + width * 0.3, y + height * 0.2, width * 0.1, height * 0.1);
          ctx.fillRect(x + width * 0.6, y + height * 0.2, width * 0.1, height * 0.1);
          break;
        
        case 'heavy':
          // Cyber Wolf
          ctx.fillStyle = '#666666';
          ctx.fillRect(x, y, width * 1.2, height * 1.2);
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(x + width * 0.4, y + height * 0.2, width * 0.15, height * 0.1);
          break;
          
        default:
          // Basic enemy
          ctx.fillStyle = '#553333';
          ctx.fillRect(x, y, width, height);
      }
  
      ctx.restore();
    }
  
    static drawEffect(ctx, type, x, y, size, progress) {
      ctx.save();
      
      switch (type) {
        case 'explosion':
          ctx.fillStyle = this.colors.energy;
          ctx.globalAlpha = 1 - progress;
          ctx.beginPath();
          ctx.arc(x, y, size * progress, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'trail':
          ctx.fillStyle = this.colors.eyes;
          ctx.globalAlpha = 0.3 * (1 - progress);
          ctx.fillRect(x, y, size * 0.2, size * 0.2);
          break;
      }
  
      ctx.restore();
    }
  }