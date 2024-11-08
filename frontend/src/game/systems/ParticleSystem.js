// src/game/systems/ParticleSystem.js
export default class ParticleSystem {
  constructor() {
      this.ctx = null;
      this.particles = new Set();
      this.effects = new Set();
      this.explosions = new Set();
      this.trails = new Set();
  }

  init(ctx) {
      this.ctx = ctx;
  }

  cleanup() {
      this.particles.clear();
      this.effects.clear();
      this.explosions.clear();
      this.trails.clear();
  }

  createExplosion({ x, y, color, count, spread, lifetime, velocityMultiplier = 1, velocityY = 0 }) {
      const explosion = {
          particles: [],
          createdAt: Date.now(),
          lifetime
      };

      for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          const velocity = (Math.random() + 0.5) * velocityMultiplier;
          
          explosion.particles.push({
              x,
              y,
              velocityX: Math.cos(angle) * velocity,
              velocityY: Math.sin(angle) * velocity + velocityY,
              size: Math.random() * 3 + 2,
              color,
              alpha: 1
          });
      }

      this.explosions.add(explosion);
  }

  createTrail({ x, y, color, width, fadeRate, lifetime }) {
      const trail = {
          points: [{ x, y }],
          color,
          width,
          fadeRate,
          createdAt: Date.now(),
          lifetime
      };

      this.trails.add(trail);
  }

  createEffect(config) {
      const effect = {
          ...config,
          createdAt: Date.now()
      };

      this.effects.add(effect);
  }

  update(deltaTime) {
      const now = Date.now();

      // Update explosions
      this.explosions.forEach(explosion => {
          if (now - explosion.createdAt >= explosion.lifetime) {
              this.explosions.delete(explosion);
              return;
          }

          explosion.particles.forEach(particle => {
              particle.x += particle.velocityX;
              particle.y += particle.velocityY;
              particle.velocityY += 0.1; // gravity
              particle.alpha = 1 - ((now - explosion.createdAt) / explosion.lifetime);
          });
      });

      // Update trails
      this.trails.forEach(trail => {
          if (now - trail.createdAt >= trail.lifetime) {
              this.trails.delete(trail);
              return;
          }

          trail.alpha = 1 - ((now - trail.createdAt) / trail.lifetime);
      });

      // Update effects
      this.effects.forEach(effect => {
          if (now - effect.createdAt >= effect.duration) {
              this.effects.delete(effect);
          }
      });
  }

  render() {
      if (!this.ctx) return;

      // Render explosions
      this.explosions.forEach(explosion => {
          explosion.particles.forEach(particle => {
              this.ctx.save();
              this.ctx.globalAlpha = particle.alpha;
              this.ctx.fillStyle = particle.color;
              this.ctx.beginPath();
              this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
              this.ctx.fill();
              this.ctx.restore();
          });
      });

      // Render trails
      this.trails.forEach(trail => {
          if (trail.points.length < 2) return;

          this.ctx.save();
          this.ctx.globalAlpha = trail.alpha;
          this.ctx.strokeStyle = trail.color;
          this.ctx.lineWidth = trail.width;
          this.ctx.beginPath();
          
          this.ctx.moveTo(trail.points[0].x, trail.points[0].y);
          for (let i = 1; i < trail.points.length; i++) {
              this.ctx.lineTo(trail.points[i].x, trail.points[i].y);
          }
          
          this.ctx.stroke();
          this.ctx.restore();
      });

      // Render effects
      this.effects.forEach(effect => {
          if (effect.render) {
              effect.render(this.ctx);
          }
      });
  }
}