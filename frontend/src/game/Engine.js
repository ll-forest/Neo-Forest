// src/game/Engine.js
import Player from './Player';
import { Drone } from './enemies/Drone';
import { Cyborg } from './enemies/Cyborg';
import CollisionSystem from './systems/CollisionSystem';
import ParticleSystem from './systems/ParticleSystem';
import { DetectionSystem } from './systems/DetectionSystem';
import audioSystem from './Audio';

export default class GameEngine {
    constructor(canvas) {
        // First initialize class properties
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isRunning = false;
        this.lastTimestamp = 0;
        
        // Define handler methods as arrow functions to maintain binding
        this.handleEnemyHit = (enemy) => {
            if (audioSystem.getIsInitialized()) {
                audioSystem.playSound('combat-hit');
            }

            this.particleSystem.createExplosion({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                color: enemy.type === 'drone' ? '#00ffff' : '#ff3333',
                count: 5,
                spread: 1.0,
                lifetime: 500
            });

            const player = this.gameObjects.player;
            if (player?.cyberState?.state.neuralVisor.active) {
                this.highlightWeakPoint(enemy);
            }

            this.startCameraShake(3, 100);
        };

        this.handleEnemyDeath = (enemy) => {
            if (enemy.isDeathHandled) return;
            enemy.isDeathHandled = true;

            this.particleSystem.createExplosion({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                color: enemy.type === 'drone' ? '#00ffff' : '#ff3333',
                count: 15,
                spread: 1.5,
                lifetime: 1000
            });

            if (this.onScoreChange) {
                const score = enemy.type === 'drone' ? 100 : 150;
                this.onScoreChange(score);
            }

            if (audioSystem.getIsInitialized()) {
                audioSystem.playSound('combat-hit');
            }

            this.startCameraShake(5, 200);
            this.gameObjects.enemies.delete(enemy);
            this.detectionSystem.removeEntity(enemy);
            this.currentWaveEnemies--;

            if (this.currentWaveEnemies <= 0) {
                this.waveComplete = true;
                if (this.onLevelComplete) {
                    this.onLevelComplete();
                }
                setTimeout(() => {
                    if (!this.gameObjects.player?.isDead) {
                        const nextWaveNumber = this.generateNextWaveNumber();
                        this.startWave(nextWaveNumber);
                    }
                }, 2000);
            }
        };

        this.handleGameRestart = () => {
            if (this.gameObjects.player) {
                this.gameObjects.player.x = this.playerSpawnX;
                this.gameObjects.player.y = this.playerSpawnY;
                this.gameObjects.player.velocityX = 0;
                this.gameObjects.player.velocityY = 0;
                this.gameObjects.player.health = this.gameObjects.player.maxHealth;
                this.gameObjects.player.isInvulnerable = true;
                
                setTimeout(() => {
                    if (this.gameObjects.player) {
                        this.gameObjects.player.isInvulnerable = false;
                    }
                }, 1500);
            }

            this.gameObjects.particles.clear();
            this.camera.x = 0;
            this.camera.y = 0;
            this.camera.shake = { intensity: 0, duration: 0, startTime: 0 };

            if (this.gameObjects.player && this.particleSystem) {
                this.particleSystem.createExplosion({
                    x: this.gameObjects.player.x + this.gameObjects.player.width / 2,
                    y: this.gameObjects.player.y + this.gameObjects.player.height / 2,
                    color: '#00ffff',
                    count: 20,
                    spread: 1.5,
                    lifetime: 1000
                });
            }

            if (audioSystem.getIsInitialized()) {
                audioSystem.playSound('player-respawn');
            }
        };

        this.handlePlayerHit = (player) => {
            if (audioSystem.getIsInitialized()) {
                audioSystem.playSound('player-hit');
            }
            this.startCameraShake(5, 200);
        };

        // Initialize game objects
        this.gameObjects = {
            player: null,
            enemies: new Set(),
            platforms: new Set(),
            particles: new Set(),
            canvas: canvas,
            particleSystem: null,
            onEnemyHit: this.handleEnemyHit,
            onEnemyDeath: this.handleEnemyDeath,
            onGameRestart: this.handleGameRestart,
            onPlayerHit: this.handlePlayerHit
        };

        // Systems initialization
        this.inputHandler = null;
        this.collisionSystem = new CollisionSystem();
        this.particleSystem = new ParticleSystem();
        this.detectionSystem = new DetectionSystem();
        
        // Camera initialization
        this.camera = {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
            targetX: 0,
            targetY: 0,
            shake: {
                intensity: 0,
                duration: 0,
                startTime: 0
            }
        };

        // Event callbacks
        this.onScoreChange = null;
        this.onHealthChange = null;
        this.onLevelChange = null;
        this.onLevelComplete = null;
        this.onGameOver = null;

        // Store initial spawn position for player
        this.playerSpawnX = canvas.width / 2 - 32;
        this.playerSpawnY = canvas.height / 2 - 32;
        
        // Wave state initialization
        this.currentWaveEnemies = 0;
        this.waveComplete = false;
        this.initializeWaveConfig();
        
        // Initialize environmental effects
        this.initializeEnvironmentalEffects();
    }
    initializeWaveConfig() {
        this.waveConfig = {
            1: [
                { type: 'drone', count: 1, position: { x: 0.75, y: 0.4 }, behavior: 'patrol' },
                { type: 'cyborg', count: 1, position: { x: 0.25, y: 0.8 }, behavior: 'patrol' }
            ],
            2: [
                { type: 'drone', count: 1, position: { x: 0.75, y: 0.4 }, behavior: 'follow' },
                { type: 'drone', count: 1, position: { x: 0.25, y: 0.3 }, behavior: 'patrol' },
                { type: 'cyborg', count: 1, position: { x: 0.25, y: 0.8 }, behavior: 'chase' }
            ],
            3: [
                { type: 'drone', count: 2, position: { x: 0.75, y: 0.4 }, behavior: 'follow' },
                { type: 'cyborg', count: 2, position: { x: 0.25, y: 0.8 }, behavior: 'chase' }
            ]
        };
    }

    initializeEnvironmentalEffects() {
        this.environmentalEffects = {
            background: {
                particles: [],
                maxParticles: 50,
                spawnRate: 0.1
            },
            lighting: {
                ambient: 0.8,
                flicker: 0.1,
                lastUpdate: 0
            }
        };
    }

    init() {
        // Initialize player
        this.spawnPlayer();
        if (this.gameObjects.player) {
            this.gameObjects.player.jumpForce = -15;
        }

        // Initialize platforms
        this.initializePlatforms();

        // Set up particle system reference
        this.gameObjects.particleSystem = this.particleSystem;

        // Initialize systems
        this.collisionSystem.init(this.gameObjects);
        this.particleSystem.init(this.ctx);
        this.detectionSystem.init(this.gameObjects);

        // Reset states
        this.waveComplete = false;
        this.camera.shake = { intensity: 0, duration: 0, startTime: 0 };
        this.environmentalEffects.background.particles = [];
    }

    spawnPlayer() {
        this.gameObjects.player = new Player({
            x: this.playerSpawnX,
            y: this.playerSpawnY,
            onHealthChange: (health) => {
                if (this.onHealthChange && !this.gameObjects.player?.isDead) {
                    this.onHealthChange(health);
                }
            },
            onEnergyChange: (energy) => {
                // Handle energy changes if needed
            },
            onAbilityUse: (abilityName) => {
                this.handleAbilityUse(abilityName);
            }
        });
    }

    spawnEnemy(type, x, y, config = {}) {
        const enemyConfig = {
            x,
            y,
            velocityX: config.velocityX || (type === 'drone' ? -2 : 2),
            patrolDistance: config.patrolDistance || (type === 'cyborg' ? 300 : 200),
            behavior: config.behavior || 'patrol',
            health: config.health || (type === 'cyborg' ? 100 : 60),
            damage: config.damage || (type === 'cyborg' ? 20 : 15)
        };
    
        let enemy;
        switch (type) {
            case 'drone':
                enemy = new Drone(enemyConfig);
                break;
            case 'cyborg':
                enemy = new Cyborg(enemyConfig);
                break;
            default:
                console.warn('Unknown enemy type:', type);
                return;
        }
    
        enemy.type = type;
        this.gameObjects.enemies.add(enemy);
        this.detectionSystem.addEntity(enemy);
        return enemy;
    }

    initializePlatforms() {
        const platforms = [
            // Ground platform
            {
                x: 0,
                y: this.canvas.height - 100,
                width: this.canvas.width,
                height: 20,
                color: '#2b4366',
                isWallClimbable: false
            },
            // Left side platforms
            {
                x: 100,
                y: this.canvas.height - 220,
                width: 120,
                height: 20,
                color: '#2b4366',
                isWallClimbable: true
            },
            {
                x: 300,
                y: this.canvas.height - 340,
                width: 120,
                height: 20,
                color: '#2b4366',
                isWallClimbable: true
            },
            // Right side platforms
            {
                x: this.canvas.width - 220,
                y: this.canvas.height - 220,
                width: 120,
                height: 20,
                color: '#2b4366',
                isWallClimbable: true
            },
            {
                x: this.canvas.width - 420,
                y: this.canvas.height - 340,
                width: 120,
                height: 20,
                color: '#2b4366',
                isWallClimbable: true
            },
            // Middle platform
            {
                x: (this.canvas.width / 2) - 60,
                y: this.canvas.height - 280,
                width: 120,
                height: 20,
                color: '#2b4366',
                isWallClimbable: true
            },
            // Vertical walls for wall climbing
            {
                x: 50,
                y: this.canvas.height - 400,
                width: 20,
                height: 300,
                color: '#2b4366',
                isWallClimbable: true
            },
            {
                x: this.canvas.width - 70,
                y: this.canvas.height - 400,
                width: 20,
                height: 300,
                color: '#2b4366',
                isWallClimbable: true
            }
        ];

        platforms.forEach(platform => {
            this.gameObjects.platforms.add(platform);
        });
    }

    handleResize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.camera.width = width;
        this.camera.height = height;

        // Update spawn positions based on new dimensions
        this.playerSpawnX = width / 2 - 32;
        this.playerSpawnY = height / 2 - 32;

        // Reinitialize platforms for new dimensions
        this.gameObjects.platforms.clear();
        this.initializePlatforms();
    }
    // Core game loop methods
    start() {
        this.isRunning = true;
        this.lastTimestamp = performance.now();
        this.waveComplete = false;
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    pause() {
        this.isRunning = false;
    }

    resume() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTimestamp = performance.now();
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = (timestamp - this.lastTimestamp) / 16.67; // Normalize to ~60fps
        this.lastTimestamp = timestamp;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        if (!this.isRunning) return;

        const player = this.gameObjects.player;
        if (!player) return;

        // Handle input
        if (this.inputHandler) {
            this.inputHandler.update(deltaTime, player, false);
        }
        
        // Update player
        player.update(deltaTime);

        // Check if player is dead
        if (player.isDead) {
            if (this.onGameOver) {
                this.onGameOver(true);
            }
            return;
        }

        // Update enemies
        this.gameObjects.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                enemy.update(deltaTime, player);
                
                if (player.cyberState?.state.neuralVisor.active) {
                    this.detectionSystem.updateThreatLevel(enemy);
                }
            }
        });

        // Update systems
        this.collisionSystem.checkCollisions(deltaTime);
        this.particleSystem.update(deltaTime);
        this.detectionSystem.update(deltaTime);
        this.updateCamera(deltaTime);
        this.updateEnvironmentalEffects(deltaTime);

        // Update wave state
        this.updateWaveState();
    }

    updateCamera(deltaTime) {
        const player = this.gameObjects.player;
        if (!player) return;
        
        // Calculate target camera position (centered on player)
        this.camera.targetX = player.x + player.width / 2 - this.camera.width / 2;
        this.camera.targetY = player.y + player.height / 2 - this.camera.height / 2;

        // Smooth camera movement
        this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;

        // Apply camera shake
        if (this.camera.shake.duration > 0) {
            const elapsed = Date.now() - this.camera.shake.startTime;
            if (elapsed < this.camera.shake.duration) {
                const intensity = this.camera.shake.intensity * 
                                (1 - elapsed / this.camera.shake.duration);
                this.camera.x += (Math.random() - 0.5) * intensity;
                this.camera.y += (Math.random() - 0.5) * intensity;
            } else {
                this.camera.shake.duration = 0;
            }
        }

        // Apply camera bounds
        this.camera.x = Math.max(0, Math.min(this.camera.x, 
                                this.canvas.width - this.camera.width));
        this.camera.y = Math.max(0, Math.min(this.camera.y, 
                                this.canvas.height - this.camera.height));
    }

    updateEnvironmentalEffects(deltaTime) {
        // Update background particles
        this.environmentalEffects.background.particles = 
            this.environmentalEffects.background.particles.filter(particle => {
                particle.life -= deltaTime;
                return particle.life > 0;
            });

        // Spawn new particles
        if (Math.random() < this.environmentalEffects.spawnRate) {
            this.environmentalEffects.background.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                life: 1000,
                color: '#ffffff33'
            });
        }

        // Update lighting
        const now = Date.now();
        if (now - this.environmentalEffects.lighting.lastUpdate > 100) {
            this.environmentalEffects.lighting.ambient = 
                0.8 + Math.sin(now * 0.001) * this.environmentalEffects.lighting.flicker;
            this.environmentalEffects.lighting.lastUpdate = now;
        }
    }

    updateWaveState() {
        if (this.currentWaveEnemies <= 0 && !this.waveComplete) {
            this.waveComplete = true;
            if (this.onLevelComplete) {
                this.onLevelComplete();
            }
        }
    }

    startWave(waveNumber) {
        this.waveComplete = false;
        this.gameObjects.enemies.clear();
        this.detectionSystem.clearEntities();
        
        const waveConfig = this.waveConfig[waveNumber];
        if (!waveConfig) return false;

        this.currentWaveEnemies = waveConfig.reduce((total, config) => total + config.count, 0);

        waveConfig.forEach(config => {
            for (let i = 0; i < config.count; i++) {
                const xOffset = i * 100;
                const x = (config.position.x * this.canvas.width) + xOffset;
                const y = config.position.y * this.canvas.height;
                
                this.spawnEnemy(config.type, x, y, {
                    behavior: config.behavior,
                    health: config.health,
                    damage: config.damage,
                    velocityX: config.type === 'drone' ? -2 : 2,
                    patrolDistance: config.type === 'cyborg' ? 300 : 200
                });
            }
        });

        return true;
    }

    generateNextWaveNumber() {
        const currentWaves = Object.keys(this.waveConfig).map(Number);
        const nextWaveNumber = Math.max(...currentWaves) + 1;

        if (!this.waveConfig[nextWaveNumber]) {
            this.waveConfig[nextWaveNumber] = this.generateWaveConfig(nextWaveNumber);
        }

        return nextWaveNumber;
    }

    generateWaveConfig(waveNumber) {
        const baseEnemyCount = 2;
        const additionalEnemies = Math.floor((waveNumber - 1) / 2);
        const totalEnemies = Math.min(baseEnemyCount + additionalEnemies, 8);

        const droneCount = Math.ceil(totalEnemies / 2);
        const cyborgCount = Math.floor(totalEnemies / 2);

        const wave = [];

        if (droneCount > 0) {
            wave.push({
                type: 'drone',
                count: droneCount,
                position: { x: 0.75, y: 0.4 },
                behavior: waveNumber > 3 ? 'follow' : 'patrol',
                velocityX: -2 * (1 + waveNumber * 0.1),
                health: 60 + (waveNumber * 10),
                damage: 15 + (waveNumber * 2)
            });
        }

        if (cyborgCount > 0) {
            wave.push({
                type: 'cyborg',
                count: cyborgCount,
                position: { x: 0.25, y: 0.8 },
                behavior: waveNumber > 4 ? 'chase' : 'patrol',
                velocityX: 2 * (1 + waveNumber * 0.1),
                health: 100 + (waveNumber * 20),
                damage: 20 + (waveNumber * 3)
            });
        }

        return wave;
    }
    handleAbilityUse(abilityName) {
        const player = this.gameObjects.player;
        if (!player) return;

        switch (abilityName) {
            case 'fury-surge':
                this.startCameraShake(10, 500);
                this.createFurySurgeEffect(player);
                if (audioSystem.getIsInitialized()) {
                    audioSystem.playSound('ability-use');
                }
                break;

            case 'tunnel-drive':
                this.startCameraShake(5, 300);
                this.createTunnelDriveEffect(player);
                if (audioSystem.getIsInitialized()) {
                    audioSystem.playSound('ability-use');
                }
                break;

            case 'shield-strike':
                this.startCameraShake(7, 400);
                this.createShieldStrikeEffect(player);
                if (audioSystem.getIsInitialized()) {
                    audioSystem.playSound('ability-use');
                }
                break;

            case 'cyber-claws':
                this.createClawsEffect(player);
                break;

            case 'neural-visor':
                this.toggleNeuralVisorEffect(player);
                break;

            default:
                console.warn(`Unknown ability: ${abilityName}`);
                break;
        }
    }

    createFurySurgeEffect(player) {
        if (!player.specialState?.state.furySurge.active) return;

        const config = player.specialAbilitiesSystem.abilities.furySurge.effects;
        this.particleSystem.createExplosion({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            color: config.particleColor,
            count: 20,
            spread: 2.0,
            lifetime: 1000,
            velocityMultiplier: 2
        });
    }

    createTunnelDriveEffect(player) {
        if (!player.specialState?.state.tunnelDrive.active) return;

        const config = player.specialAbilitiesSystem.abilities.tunnelDrive.effects;
        // Create dirt trail effect
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                if (player && !player.isDead) {
                    this.particleSystem.createExplosion({
                        x: player.x + player.width / 2,
                        y: player.y + player.height,
                        color: config.particleColor,
                        count: 5,
                        spread: 0.5,
                        lifetime: 500,
                        velocityY: -2
                    });
                }
            }, i * 50);
        }
    }

    createShieldStrikeEffect(player) {
        if (!player.specialState?.state.shieldStrike.active) return;

        const config = player.specialAbilitiesSystem.abilities.shieldStrike.effects;
        this.particleSystem.createExplosion({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            color: config.particleColor,
            count: 15,
            spread: 1.5,
            lifetime: 800,
            ringEffect: true
        });
    }

    createClawsEffect(player) {
        if (!player.cyberState?.state.claws.active) return;

        const config = player.cyberEnhancementsSystem.enhancements.cyberClaws;
        this.particleSystem.createTrail({
            x: player.x + (player.direction > 0 ? player.width : 0),
            y: player.y + player.height * 0.4,
            color: config.energyTrail.color,
            width: 2,
            fadeRate: 0.1,
            lifetime: 300
        });
    }

    toggleNeuralVisorEffect(player) {
        if (!player.cyberState) return;

        if (player.cyberState.state.neuralVisor.active) {
            this.detectionSystem.startScanning();
            this.particleSystem.createEffect({
                type: 'scanline',
                x: player.x,
                y: player.y,
                width: player.width,
                height: player.height,
                color: '#00ffff',
                duration: 500
            });
        } else {
            this.detectionSystem.stopScanning();
        }
    }

    highlightWeakPoint(enemy) {
        const player = this.gameObjects.player;
        if (!player?.cyberState) return;

        const weakPoints = this.detectionSystem.getWeakPoints(enemy);
        weakPoints.forEach(point => {
            this.particleSystem.createEffect({
                type: 'highlight',
                x: point.x,
                y: point.y,
                color: '#ff0000',
                radius: point.radius,
                duration: 500,
                pulse: true
            });
        });
    }

    startCameraShake(intensity, duration) {
        this.camera.shake = {
            intensity,
            duration,
            startTime: Date.now()
        };
    }

    // Combat utility methods
    isOnScreen(entity) {
        return !(entity.x + entity.width < this.camera.x ||
                entity.x > this.camera.x + this.camera.width ||
                entity.y + entity.height < this.camera.y ||
                entity.y > this.camera.y + this.camera.height);
    }

    getEntitiesInRange(point, range) {
        const entities = [];
        this.gameObjects.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                const distance = Math.hypot(
                    enemy.x + enemy.width / 2 - point.x,
                    enemy.y + enemy.height / 2 - point.y
                );
                if (distance <= range) {
                    entities.push({ entity: enemy, distance });
                }
            }
        });
        return entities.sort((a, b) => a.distance - b.distance);
    }

    checkOutOfBounds(entity) {
        const buffer = 100;
        const maxY = this.gameObjects.canvas.height + buffer;
        
        if (entity.y > maxY) {
            if (entity === this.gameObjects.player) {
                if (this.gameObjects.onGameRestart) {
                    this.gameObjects.onGameRestart();
                }
            } else {
                entity.isDead = true;
                this.handleEnemyDeath(entity);
            }
        }
    }
    render() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Render order: background -> platforms -> effects -> entities
        this.renderEnvironmentalEffects();
        this.renderPlatforms();
        this.renderEntities();
        this.renderParticles();

        this.ctx.restore();

        // Render HUD effects (not affected by camera)
        this.renderHUDEffects();
    }

    renderEnvironmentalEffects() {
        // Background particles
        this.environmentalEffects.background.particles.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Ambient lighting
        this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.environmentalEffects.lighting.ambient})`;
        this.ctx.fillRect(
            this.camera.x,
            this.camera.y,
            this.camera.width,
            this.camera.height
        );
    }

    renderPlatforms() {
        this.gameObjects.platforms.forEach(platform => {
            // Base platform
            this.ctx.fillStyle = platform.color;
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Platform highlight
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fillRect(platform.x, platform.y, platform.width, 2);

            if (platform.isWallClimbable) {
                this.renderWallClimbIndicator(platform);
            }
        });
    }

    renderWallClimbIndicator(platform) {
        this.ctx.strokeStyle = '#00ffff33';
        this.ctx.lineWidth = 2;
        
        const gripCount = Math.floor(platform.height / 20);
        for (let i = 0; i < gripCount; i++) {
            const y = platform.y + (i * 20) + 10;
            this.ctx.beginPath();
            this.ctx.moveTo(platform.x, y);
            this.ctx.lineTo(platform.x + platform.width, y);
            this.ctx.stroke();
        }
    }

    renderEntities() {
        // Render enemies
        this.gameObjects.enemies.forEach(enemy => {
            if (!enemy.isDead) {
                enemy.render(this.ctx);
                
                const player = this.gameObjects.player;
                if (player?.cyberState?.state.neuralVisor.active) {
                    this.renderNeuralVisorEffects(enemy);
                }
            }
        });

        // Render player
        if (this.gameObjects.player) {
            this.gameObjects.player.render(this.ctx);
        }
    }

    renderNeuralVisorEffects(enemy) {
        const threatLevel = this.detectionSystem.getThreatLevel(enemy);
        const threatColor = this.detectionSystem.getThreatColor(threatLevel);
        
        // Enemy outline
        this.ctx.strokeStyle = threatColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            enemy.x - 2,
            enemy.y - 2,
            enemy.width + 4,
            enemy.height + 4
        );

        // Weak points
        const weakPoints = this.detectionSystem.getWeakPoints(enemy);
        weakPoints.forEach(point => {
            const pulseIntensity = (Math.sin(Date.now() * 0.01) + 1) / 2;
            
            this.ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + pulseIntensity * 0.4})`;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    renderParticles() {
        if (this.particleSystem) {
            this.particleSystem.render(this.ctx);
        }
    }

    renderHUDEffects() {
        const player = this.gameObjects.player;
        if (!player) return;

        // Neural Visor overlay
        if (player.cyberState?.state.neuralVisor.active) {
            this.renderNeuralVisorOverlay();
        }

        // Ability effects
        if (player.specialState?.state.furySurge.active) {
            this.renderScreenEffect('rgba(255, 51, 0, 0.2)', 'rage');
        }
        if (player.specialState?.state.tunnelDrive.active) {
            this.renderScreenEffect('rgba(139, 69, 19, 0.3)', 'tunnel');
        }
        if (player.specialState?.state.shieldStrike.active) {
            this.renderScreenEffect('rgba(65, 105, 225, 0.2)', 'shield');
        }
    }

    renderNeuralVisorOverlay() {
        // Visor tint
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Scan line effect
        const scanLineY = (Date.now() % 1000) / 1000 * this.canvas.height;
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        this.ctx.fillRect(0, scanLineY, this.canvas.width, 2);
    }

    renderScreenEffect(color, type) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        switch (type) {
            case 'rage': {
                const gradient = this.ctx.createRadialGradient(
                    this.canvas.width / 2,
                    this.canvas.height / 2,
                    0,
                    this.canvas.width / 2,
                    this.canvas.height / 2,
                    this.canvas.width
                );
                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                break;
            }
            case 'tunnel': {
                const tunnelSize = this.canvas.height / 3;
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.beginPath();
                this.ctx.ellipse(
                    this.canvas.width / 2,
                    this.canvas.height / 2,
                    tunnelSize * 2,
                    tunnelSize,
                    0,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
                this.ctx.globalCompositeOperation = 'source-over';
                break;
            }
            case 'shield': {
                const time = Date.now() * 0.001;
                const rippleCount = 3;
                for (let i = 0; i < rippleCount; i++) {
                    const progress = (time + i / rippleCount) % 1;
                    this.ctx.strokeStyle = `rgba(65, 105, 225, ${0.5 * (1 - progress)})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        this.canvas.width / 2,
                        this.canvas.height / 2,
                        progress * Math.max(this.canvas.width, this.canvas.height),
                        0,
                        Math.PI * 2
                    );
                    this.ctx.stroke();
                }
                break;
            }
        }
    }

    destroy() {
        this.isRunning = false;
        this.gameObjects.enemies.clear();
        this.gameObjects.platforms.clear();
        this.gameObjects.particles.clear();
        this.gameObjects.player = null;
        
        if (this.detectionSystem) {
            this.detectionSystem.clearEntities();
        }
        
        if (this.particleSystem) {
            this.particleSystem.cleanup();
        }
        
        this.environmentalEffects.background.particles = [];
        this.camera.shake = { intensity: 0, duration: 0, startTime: 0 };
    }
}