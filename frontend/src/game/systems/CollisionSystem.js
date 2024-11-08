// src/game/systems/CollisionSystem.js
export default class CollisionSystem {
    constructor() {
        this.gameObjects = null;
        this.knockbackConfig = {
            playerForce: 3,          // Reduced for better control
            enemyForce: 1.5,         // Reduced for more grounded combat
            cyborgForce: 0.3,        // Minimal knockback for tough enemies
            duration: 200,           // Knockback duration
            verticalForce: -0.7,     // Reduced bounce
            cyborgVerticalForce: 0,  // No bounce for cyborgs
            recoveryTime: 400        // Recovery time after knockback
        };

        this.collisionDamageConfig = {
            player: {
                baseDamage: 10,
                cyborgCollision: 12,  // Reduced from 15
                droneCollision: 4     // Reduced from 5
            },
            enemy: {
                cyborg: {
                    collisionDamage: 3,     // Reduced from 5
                    healthPercentCap: 0.03   // Reduced from 0.05
                },
                drone: {
                    collisionDamage: 10      // Reduced from 15
                }
            },
            invulnerabilityTime: 1000
        };
    }

    init(gameObjects) {
        this.gameObjects = gameObjects;
    }

    checkCollisions(deltaTime) {
        if (!this.gameObjects || !this.gameObjects.player) return;

        this.checkPlatformCollisions(this.gameObjects.player);
        this.gameObjects.enemies.forEach(enemy => {
            this.checkPlatformCollisions(enemy);
        });

        this.checkEnemyCollisions(this.gameObjects.player, deltaTime);

        if (this.gameObjects.powerups) {
            this.checkPowerupCollisions(this.gameObjects.player);
        }
    }

    checkPlatformCollisions(entity) {
        let isGrounded = false;
        let groundY = Infinity;
        let currentPlatform = null;

        this.gameObjects.platforms.forEach(platform => {
            if (this.checkBoxCollision(entity, platform)) {
                this.resolvePlatformCollision(entity, platform);
                if (entity.velocityY >= 0 && entity.y + entity.height === platform.y) {
                    isGrounded = true;
                    groundY = Math.min(groundY, platform.y - entity.height);
                    currentPlatform = platform;
                }
            }
        });

        entity.isGrounded = isGrounded;
        
        // Keep enemies on platforms
        if (isGrounded && entity.type !== 'player' && currentPlatform) {
            if (entity.x < currentPlatform.x) {
                entity.x = currentPlatform.x;
                entity.velocityX = 0;
            } else if (entity.x + entity.width > currentPlatform.x + currentPlatform.width) {
                entity.x = currentPlatform.x + currentPlatform.width - entity.width;
                entity.velocityX = 0;
            }
        }

        if (entity.type === 'cyborg') {
            entity.groundY = groundY;
        }

        if (isGrounded && entity === this.gameObjects.player && !entity.isHit && !entity.isDead) {
            entity.lastGroundedPosition = {
                x: entity.x,
                y: entity.y
            };
        }
    }

    checkEnemyCollisions(player, deltaTime) {
        this.gameObjects.enemies.forEach(enemy => {
            if (enemy.isDead) return;

            if (player.isAttacking && !enemy.isHit) {
                const attackBox = player.getAttackBox();
                if (attackBox && this.checkBoxCollision(attackBox, enemy.getHitbox())) {
                    this.resolveAttackCollision(player, enemy);
                }
            }

            if (!player.isInvulnerable && !player.isInKnockback && !enemy.isInKnockback) {
                const collision = this.getCollisionType(player.getHitbox(), enemy.getHitbox());
                
                if (collision.collided) {
                    if (collision.type === 'top') {
                        this.resolveTopCollision(player, enemy);
                    } else if (collision.type === 'side') {
                        this.resolveSideCollision(player, enemy);
                    }
                }
            }
        });
    }

    getCurrentPlatform(entity) {
        if (!this.gameObjects.platforms) return null;
        
        for (const platform of this.gameObjects.platforms) {
            if (entity.y + entity.height === platform.y && 
                entity.x + entity.width > platform.x && 
                entity.x < platform.x + platform.width) {
                return platform;
            }
        }
        return null;
    }

    checkBoxCollision(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    getCollisionType(a, b) {
        if (!this.checkBoxCollision(a, b)) {
            return { collided: false, type: null };
        }

        const isTopCollision = (
            a.y + a.height >= b.y &&
            a.y + a.height <= b.y + b.height/2 &&
            a.velocityY > 0
        );

        return {
            collided: true,
            type: isTopCollision ? 'top' : 'side'
        };
    }

    resolvePlatformCollision(entity, platform) {
        const overlapX = Math.min(
            entity.x + entity.width - platform.x,
            platform.x + platform.width - entity.x
        );
        const overlapY = Math.min(
            entity.y + entity.height - platform.y,
            platform.y + platform.height - entity.y
        );

        if (overlapX <= 0 || overlapY <= 0) return;
        if (entity.isInKnockback) return;

        if (overlapX < overlapY) {
            if (entity.x < platform.x) {
                entity.x = platform.x - entity.width;
            } else {
                entity.x = platform.x + platform.width;
            }
            entity.velocityX = 0;
        } else {
            if (entity.velocityY >= 0 && entity.y < platform.y) {
                entity.y = platform.y - entity.height;
                entity.velocityY = 0;
                entity.isGrounded = true;
                
                if (entity.type === 'cyborg') {
                    entity.groundY = platform.y - entity.height;
                }
            } else if (entity.velocityY < 0) {
                entity.y = platform.y + platform.height;
                entity.velocityY = 0;
            }
        }

        if (entity.handlePlatformCollision) {
            entity.handlePlatformCollision(platform);
        }
    }

    resolveAttackCollision(player, enemy) {
        const attackConfig = player.combatState.getCurrentAttack();
        if (!attackConfig) return;

        let damage = attackConfig.damage;
        
        if (enemy.type === 'cyborg') {
            damage = Math.min(damage, enemy.health * 0.1);
        }
        
        if (enemy.takeDamage(damage)) {
            if (this.gameObjects.onEnemyDeath) {
                this.gameObjects.onEnemyDeath(enemy);
            }
        } else if (this.gameObjects.onEnemyHit) {
            this.gameObjects.onEnemyHit(enemy);
        }
    }

    resolveTopCollision(player, enemy) {
        player.velocityY = -8;
        
        let STOMP_DAMAGE = 50;
        if (enemy.type === 'cyborg') {
            STOMP_DAMAGE = Math.min(STOMP_DAMAGE, enemy.health * 0.15);
        }

        if (enemy.takeDamage(STOMP_DAMAGE)) {
            if (this.gameObjects.onEnemyDeath) {
                this.gameObjects.onEnemyDeath(enemy);
            }
        } else if (this.gameObjects.onEnemyHit) {
            this.gameObjects.onEnemyHit(enemy);
        }
    }

    resolveSideCollision(player, enemy) {
        if (player.isInvulnerable || enemy.isHit) return;

        const playerCenter = player.x + (player.width / 2);
        const enemyCenter = enemy.x + (enemy.width / 2);
        const knockbackDirection = playerCenter < enemyCenter ? -1 : 1;

        this.applyKnockback(player, knockbackDirection, true);
        this.applyKnockback(enemy, -knockbackDirection, false);

        if (enemy.type === 'cyborg') {
            const playerDamage = this.collisionDamageConfig.player.cyborgCollision;
            player.takeDamage(playerDamage);

            const cyborgConfig = this.collisionDamageConfig.enemy.cyborg;
            const cyborgDamage = Math.min(
                cyborgConfig.collisionDamage,
                enemy.health * cyborgConfig.healthPercentCap
            );
            enemy.takeDamage(cyborgDamage);
        } else if (enemy.type === 'drone') {
            const playerDamage = this.collisionDamageConfig.player.droneCollision;
            player.takeDamage(playerDamage);

            const droneDamage = this.collisionDamageConfig.enemy.drone.collisionDamage;
            enemy.takeDamage(droneDamage);
        }

        this.createCollisionEffects(player, enemy);

        if (this.gameObjects.onPlayerHit) {
            this.gameObjects.onPlayerHit(player);
        }
        if (this.gameObjects.onEnemyHit) {
            this.gameObjects.onEnemyHit(enemy);
        }
    }

    applyKnockback(entity, direction, isPlayer) {
        entity.isInKnockback = true;
        entity.isInvulnerable = true;
        
        let knockbackForce;
        let verticalForce;

        if (entity.type === 'cyborg') {
            knockbackForce = this.knockbackConfig.cyborgForce;
            verticalForce = 0;
        } else if (entity.type === 'drone') {
            knockbackForce = this.knockbackConfig.enemyForce;
            verticalForce = -0.5;
        } else if (isPlayer) {
            knockbackForce = this.knockbackConfig.playerForce;
            verticalForce = this.knockbackConfig.verticalForce;
        }

        // Platform edge detection and position correction
        const currentPlatform = this.getCurrentPlatform(entity);
        if (currentPlatform && entity.type !== 'player') {
            const potentialNewX = entity.x + (direction * knockbackForce);
            
            // Check platform bounds
            if (potentialNewX < currentPlatform.x) {
                entity.x = currentPlatform.x;
                entity.velocityX = 0;
                return;
            } else if (potentialNewX + entity.width > currentPlatform.x + currentPlatform.width) {
                entity.x = currentPlatform.x + currentPlatform.width - entity.width;
                entity.velocityX = 0;
                return;
            }

            // Reduce knockback near edges
            const edgeThreshold = 20;
            const leftDist = potentialNewX - currentPlatform.x;
            const rightDist = (currentPlatform.x + currentPlatform.width) - (potentialNewX + entity.width);
            
            if (leftDist < edgeThreshold || rightDist < edgeThreshold) {
                knockbackForce *= 0.3;
            }
        }

        const maxVelocity = entity.type === 'cyborg' ? 3 : 5;
        const baseVelocity = direction * knockbackForce;
        entity.velocityX = Math.max(Math.min(baseVelocity, maxVelocity), -maxVelocity);
        
        if (entity.isGrounded) {
            entity.velocityY = verticalForce;
        }

        // Ground check during knockback
        const checkGrounding = () => {
            if (entity && !entity.isDead) {
                const platform = this.getCurrentPlatform(entity);
                if (platform) {
                    entity.y = platform.y - entity.height;
                    entity.isGrounded = true;
                }
            }
        };

        const knockbackDuration = this.knockbackConfig.duration;
        const checkInterval = 50;
        const intervalId = setInterval(checkGrounding, checkInterval);
        
        setTimeout(() => {
            if (entity && !entity.isDead) {
                entity.isInKnockback = false;
                entity.velocityX = 0;
                clearInterval(intervalId);
                checkGrounding();
            }
        }, knockbackDuration);

        setTimeout(() => {
            if (entity && !entity.isDead) {
                entity.isInvulnerable = false;
            }
        }, this.knockbackConfig.recoveryTime);
    }

    createCollisionEffects(player, enemy) {
        if (!this.gameObjects.particleSystem) return;

        const collisionPoint = {
            x: (player.x + player.width/2 + enemy.x + enemy.width/2) / 2,
            y: (player.y + player.height/2 + enemy.y + enemy.height/2) / 2
        };

        this.gameObjects.particleSystem.createEffect({
            x: collisionPoint.x,
            y: collisionPoint.y,
            color: enemy.type === 'cyborg' ? '#ff4444' : '#ffaa00',
            count: enemy.type === 'cyborg' ? 8 : 5,
            spread: 0.8,
            lifetime: 300,
            speed: 2
        });
    }

    checkPowerupCollisions(player) {
        if (!this.gameObjects.powerups) return;
        this.gameObjects.powerups.forEach(powerup => {
            if (this.checkBoxCollision(player, powerup)) {
                powerup.apply(player);
                this.gameObjects.powerups.delete(powerup);
            }
        });
    }
}