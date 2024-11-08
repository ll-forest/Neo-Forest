// src/game/systems/ScoreSystem.js

export default class ScoreSystem {
    constructor() {
        // Core score tracking
        this.score = 0;
        this.multiplier = 1;
        this.maxMultiplier = 8;
        this.comboTimer = 0;
        this.comboTimeout = 5000; // 5 seconds
        this.highScore = this.loadHighScore();
        
        // Score values with cyber-theme bonuses
        this.scoreValues = {
            drone: {
                kill: 100,
                hit: 10,
                perfect: 150,
                hack: 50
            },
            cyborg: {
                kill: 150,
                hit: 15,
                perfect: 225,
                hack: 75
            },
            checkpoint: {
                base: 1000,
                perfect: 500
            },
            wave: {
                start: 500,
                complete: 1000
            },
            bonuses: {
                noHit: 500,
                quickKill: 200,
                stylePoints: 100,
                neuralVisor: 150,
                cyberCombo: 300,
                perfectWave: 1000
            }
        };

        // Achievement tracking
        this.achievements = {
            totalKills: 0,
            perfectKills: 0,
            maxCombo: 0,
            noHitRuns: 0,
            cyberMaster: false,
            neuralAnalyst: 0,
            wavesCompleted: 0,
            highestWave: 0
        };

        // Visual effects queue
        this.worldEffects = [];
        
        // Score display buffer
        this.displayBuffer = {
            score: '0',
            multiplier: '1.0',
            combo: 0
        };

        this.loadAchievements();
    }

    getScoreInfo() {
        return {
            score: this.score,
            highScore: this.highScore,
            multiplier: this.multiplier,
            achievements: { ...this.achievements },
            formattedScore: this.formatNumber(this.score),
            formattedHighScore: this.formatNumber(this.highScore),
            formattedMultiplier: this.multiplier.toFixed(1)
        };
    }

    renderWorldEffects(ctx) {
        ctx.save();
        this.worldEffects = this.worldEffects.filter(effect => {
            if (effect.life <= 0) return false;

            // Update effect properties
            effect.life -= 1;
            effect.y -= effect.speed;
            effect.opacity = Math.max(0, effect.life / effect.maxLife);
            
            // Draw score text
            ctx.globalAlpha = effect.opacity;
            ctx.font = effect.font;
            ctx.textAlign = 'center';

            // Score amount with glow
            ctx.shadowColor = effect.color;
            ctx.shadowBlur = effect.isHighValue ? 15 : 10;
            ctx.fillStyle = effect.color;
            ctx.fillText(
                `+${this.formatNumber(effect.score)}`,
                effect.x,
                effect.y
            );

            // Bonus text
            if (effect.bonusText) {
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 10;
                ctx.font = '14px monospace';
                ctx.fillStyle = '#00ffff';
                ctx.fillText(effect.bonusText, effect.x, effect.y + 20);
            }

            // Reset shadow
            ctx.shadowBlur = 0;

            return true;
        });
        ctx.restore();
    }

    addScorePopup(x, y, score, bonusText = '') {
        const isHighValue = score >= 1000;
        
        this.worldEffects.push({
            x,
            y,
            score,
            bonusText,
            life: 60,
            maxLife: 60,
            speed: isHighValue ? 2 : 1,
            opacity: 1,
            font: `bold ${isHighValue ? 20 : 16}px monospace`,
            color: isHighValue ? '#ffd700' : '#ffffff',
            isHighValue
        });
    }

    calculateBonusScore(amount, type, conditions = {}) {
        let score = amount * this.multiplier;
        const bonuses = [];

        // Base type bonuses
        if (this.scoreValues[type]) {
            if (conditions.perfect && this.scoreValues[type].perfect) {
                score += this.scoreValues[type].perfect;
                bonuses.push('PERFECT');
            }
            if (conditions.hack && this.scoreValues[type].hack) {
                score += this.scoreValues[type].hack;
                bonuses.push('HACK');
            }
        }

        // Special condition bonuses
        if (conditions.noHit) {
            score += this.scoreValues.bonuses.noHit;
            bonuses.push('NO HIT');
        }
        if (conditions.quickKill) {
            score += this.scoreValues.bonuses.quickKill;
            bonuses.push('QUICK');
        }
        if (conditions.stylePoints) {
            score += this.scoreValues.bonuses.stylePoints;
            bonuses.push('STYLE');
        }
        if (conditions.neuralVisor) {
            score += this.scoreValues.bonuses.neuralVisor;
            bonuses.push('NEURAL');
        }
        if (this.multiplier >= 4) {
            score += this.scoreValues.bonuses.cyberCombo;
            bonuses.push('CYBER COMBO');
        }
        if (conditions.perfectWave) {
            score += this.scoreValues.bonuses.perfectWave;
            bonuses.push('PERFECT WAVE');
        }

        return {
            score: Math.round(score),
            bonuses
        };
    }

    addScore(amount, type, conditions = {}) {
        const { score: bonusScore, bonuses } = this.calculateBonusScore(amount, type, conditions);
        
        this.score += bonusScore;
        this.increaseMultiplier();
        this.comboTimer = Date.now();

        // Update achievements
        this.updateAchievements(type, conditions);

        // Create score popup if position is provided
        if (conditions.x !== undefined && conditions.y !== undefined) {
            this.addScorePopup(
                conditions.x,
                conditions.y,
                bonusScore,
                bonuses.join(' ')
            );
        }

        // Update display buffer
        this.updateDisplayBuffer();
        
        return {
            score: bonusScore,
            multiplier: this.multiplier,
            bonuses,
            total: this.score
        };
    }

    updateDisplayBuffer() {
        this.displayBuffer = {
            score: this.formatNumber(this.score),
            multiplier: this.multiplier.toFixed(1),
            combo: Math.floor((this.multiplier - 1) * 2)
        };
    }

    formatNumber(number) {
        return number.toLocaleString('en-US');
    }

    loadHighScore() {
        try {
            const saved = localStorage.getItem('neoforest_highscore');
            return saved ? parseInt(saved, 10) : 0;
        } catch (e) {
            console.warn('Failed to load high score:', e);
            return 0;
        }
    }

    saveHighScore() {
        try {
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('neoforest_highscore', this.score.toString());
                return true;
            }
            return false;
        } catch (e) {
            console.warn('Failed to save high score:', e);
            return false;
        }
    }

    loadAchievements() {
        try {
            const saved = localStorage.getItem('neoforest_achievements');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.achievements = { ...this.achievements, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load achievements:', e);
        }
    }

    saveAchievements() {
        try {
            localStorage.setItem('neoforest_achievements', JSON.stringify(this.achievements));
            return true;
        } catch (e) {
            console.warn('Failed to save achievements:', e);
            return false;
        }
    }

    updateAchievements(type, conditions) {
        if (type === 'checkpoint' || type === 'waveStart') return;

        if (conditions.isKill) {
            this.achievements.totalKills++;
            if (conditions.perfect) {
                this.achievements.perfectKills++;
            }
            if (conditions.neuralVisor) {
                this.achievements.neuralAnalyst++;
            }
        }

        if (conditions.waveComplete) {
            this.achievements.wavesCompleted++;
            this.achievements.highestWave = Math.max(
                this.achievements.highestWave,
                conditions.waveNumber || 0
            );
        }

        // Update max combo achievement
        this.achievements.maxCombo = Math.max(
            this.achievements.maxCombo,
            this.multiplier
        );

        // Track perfect runs
        if (conditions.noHit) {
            this.achievements.noHitRuns++;
        }

        // Check for Cyber Master achievement
        if (this.achievements.perfectKills >= 50 &&
            this.achievements.maxCombo >= 6 &&
            this.achievements.noHitRuns >= 10) {
            this.achievements.cyberMaster = true;
        }

        this.saveAchievements();
    }

    increaseMultiplier() {
        if (this.multiplier < this.maxMultiplier) {
            this.multiplier = Math.min(
                this.maxMultiplier,
                this.multiplier + 0.5
            );
        }
    }

    resetMultiplier() {
        this.multiplier = 1;
        this.updateDisplayBuffer();
    }

    update(deltaTime) {
        // Check combo timeout
        if (Date.now() - this.comboTimer > this.comboTimeout) {
            this.resetMultiplier();
        }

        // Update visual effects
        this.worldEffects.forEach(effect => {
            effect.life -= deltaTime;
        });
    }

    reset() {
        this.saveHighScore();
        this.score = 0;
        this.multiplier = 1;
        this.comboTimer = 0;
        this.worldEffects = [];
        this.updateDisplayBuffer();
    }
}