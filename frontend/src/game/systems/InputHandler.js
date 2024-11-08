// src/game/systems/InputHandler.js
import { CombatSystem } from '../combat/CombatCore';

export default class InputHandler {
    constructor() {
        // Key states for all controls
        this.keys = {
            movement: {
                left: false,
                right: false,
                up: false,
                down: false,
                jump: false
            },
            combat: {
                lightAttack: false,
                heavyAttack: false,
                specialAttack: false
            },
            abilities: {
                cyberClaws: false,
                wallClimb: false,
                neuralVisor: false,
                furySurge: false,
                tunnelDrive: false,
                shieldStrike: false
            }
        };

        // Key mapping configuration
        this.keyMap = {
            // Movement
            'ArrowLeft': 'movement.left',
            'KeyA': 'movement.left',
            'ArrowRight': 'movement.right',
            'KeyD': 'movement.right',
            'ArrowUp': 'movement.up',
            'KeyW': 'movement.up',
            'Space': 'movement.jump',
            'ArrowDown': 'movement.down',
            'KeyS': 'movement.down',

            // Combat
            'KeyE': 'combat.lightAttack',
            'KeyQ': 'combat.heavyAttack',
            'KeyR': 'combat.specialAttack',

            // Neo-Badger Abilities
            'KeyF': 'abilities.cyberClaws',
            'ShiftLeft': 'abilities.wallClimb',
            'ShiftRight': 'abilities.wallClimb',
            'KeyV': 'abilities.neuralVisor',
            'KeyC': 'abilities.furySurge',
            'KeyX': 'abilities.tunnelDrive',
            'KeyZ': 'abilities.shieldStrike'
        };

        // Ability cooldowns in milliseconds
        this.cooldowns = {
            cyberClaws: 0,
            furySurge: 0,
            tunnelDrive: 0,
            shieldStrike: 0
        };

        // Cooldown durations
        this.cooldownDurations = {
            cyberClaws: 500,    // 0.5 seconds
            furySurge: 15000,   // 15 seconds
            tunnelDrive: 8000,  // 8 seconds
            shieldStrike: 10000 // 10 seconds
        };

        // Audio callback for ability sounds
        this.onAbilityUse = null;
    }

    handleKeyDown(event) {
        const mapping = this.keyMap[event.code];
        if (mapping) {
            this.setNestedValue(this.keys, mapping, true);
            event.preventDefault();
        }
    }

    handleKeyUp(event) {
        const mapping = this.keyMap[event.code];
        if (mapping) {
            this.setNestedValue(this.keys, mapping, false);
            event.preventDefault();
        }
    }

    setNestedValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;
        
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }
        
        current[parts[parts.length - 1]] = value;
    }

    update(deltaTime, player, isPaused) {
        if (!player || player.isDead || isPaused) return;

        // Update cooldowns
        Object.keys(this.cooldowns).forEach(ability => {
            if (this.cooldowns[ability] > 0) {
                this.cooldowns[ability] = Math.max(0, this.cooldowns[ability] - deltaTime);
            }
        });

        // Handle movement
        if (this.keys.movement.left) {
            player.velocityX = -player.maxSpeed;
            player.direction = -1;
        } else if (this.keys.movement.right) {
            player.velocityX = player.maxSpeed;
            player.direction = 1;
        } else if (!player.neoState?.wallClimbing.active) {
            // Only reset velocity if not wall climbing
            player.velocityX = 0;
        }

        // Handle jumping
        if ((this.keys.movement.up || this.keys.movement.jump) && player.isGrounded) {
            player.velocityY = player.jumpForce;
            player.isGrounded = false;
            this.playAbilitySound('jump');
        }

        // Handle combat
        this.handleCombat(player);

        // Handle abilities
        this.handleAbilities(player);
    }

    handleCombat(player) {
        if (this.keys.combat.lightAttack) {
            if (player.attack('light')) {
                this.playAbilitySound('light-attack');
            }
        }
        if (this.keys.combat.heavyAttack) {
            if (player.attack('heavy')) {
                this.playAbilitySound('heavy-attack');
            }
        }
        if (this.keys.combat.specialAttack) {
            if (player.attack('special')) {
                this.playAbilitySound('special-attack');
            }
        }
    }

    handleAbilities(player) {
        // Cyber Claws
        if (this.keys.abilities.cyberClaws && this.cooldowns.cyberClaws <= 0) {
            if (player.activateCyberClaws()) {
                this.cooldowns.cyberClaws = this.cooldownDurations.cyberClaws;
                this.playAbilitySound('cyber-claws');
            }
        }

        // Wall Climb
        if (this.keys.abilities.wallClimb && player.isNextToWall) {
            if (player.startWallClimb()) {
                this.playAbilitySound('wall-climb');
            }
        } else if (!this.keys.abilities.wallClimb && player.neoState?.wallClimbing.active) {
            player.stopWallClimb();
        }

        // Neural Visor
        if (this.keys.abilities.neuralVisor) {
            if (player.toggleNeuralVisor()) {
                this.playAbilitySound('neural-visor');
            }
        }

        // Fury Surge
        if (this.keys.abilities.furySurge && this.cooldowns.furySurge <= 0) {
            if (player.activateFurySurge()) {
                this.cooldowns.furySurge = this.cooldownDurations.furySurge;
                this.playAbilitySound('fury-surge');
            }
        }

        // Tunnel Drive
        if (this.keys.abilities.tunnelDrive && this.cooldowns.tunnelDrive <= 0) {
            if (player.activateTunnelDrive()) {
                this.cooldowns.tunnelDrive = this.cooldownDurations.tunnelDrive;
                this.playAbilitySound('tunnel-drive');
            }
        }

        // Shield Strike
        if (this.keys.abilities.shieldStrike && this.cooldowns.shieldStrike <= 0) {
            if (player.activateShieldStrike()) {
                this.cooldowns.shieldStrike = this.cooldownDurations.shieldStrike;
                this.playAbilitySound('shield-strike');
            }
        }
    }

    playAbilitySound(soundId) {
        if (this.onAbilityUse) {
            this.onAbilityUse(soundId);
        }
    }

    getCooldownPercent(ability) {
        if (!this.cooldowns[ability] || !this.cooldownDurations[ability]) return 0;
        return (this.cooldowns[ability] / this.cooldownDurations[ability]) * 100;
    }

    isAbilityReady(ability) {
        return !this.cooldowns[ability] || this.cooldowns[ability] <= 0;
    }

    resetCooldowns() {
        Object.keys(this.cooldowns).forEach(ability => {
            this.cooldowns[ability] = 0;
        });
    }
}