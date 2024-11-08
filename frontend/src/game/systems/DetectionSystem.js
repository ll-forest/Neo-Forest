// src/game/systems/DetectionSystem.js
export class DetectionSystem {
    constructor() {
        this.gameObjects = null;
        this.entities = new Set();
        this.spatialGrid = new Map();
        this.gridSize = 200;
        this.isScanning = false;
        this.lastScanTime = 0;
        this.scanInterval = 500; // milliseconds between scans
    }

    init(gameObjects) {
        this.gameObjects = gameObjects;
        this.entities.clear();
        this.spatialGrid.clear();
    }

    addEntity(entity) {
        this.entities.add(entity);
        this.updateEntityGrid(entity);
    }

    removeEntity(entity) {
        this.entities.delete(entity);
    }

    clearEntities() {
        this.entities.clear();
        this.spatialGrid.clear();
    }

    updateEntityGrid(entity) {
        const gridX = Math.floor(entity.x / this.gridSize);
        const gridY = Math.floor(entity.y / this.gridSize);
        const key = `${gridX},${gridY}`;
        
        if (!this.spatialGrid.has(key)) {
            this.spatialGrid.set(key, new Set());
        }
        
        this.spatialGrid.get(key).add(entity);
    }

    getNearbyEntities(x, y, radius) {
        const nearbyEntities = new Set();
        const radiusSquared = radius * radius;
        
        const startGridX = Math.floor((x - radius) / this.gridSize);
        const endGridX = Math.floor((x + radius) / this.gridSize);
        const startGridY = Math.floor((y - radius) / this.gridSize);
        const endGridY = Math.floor((y - radius) / this.gridSize);
        
        for (let gridX = startGridX; gridX <= endGridX; gridX++) {
            for (let gridY = startGridY; gridY <= endGridY; gridY++) {
                const key = `${gridX},${gridY}`;
                const cell = this.spatialGrid.get(key);
                
                if (cell) {
                    cell.forEach(entity => {
                        const dx = entity.x - x;
                        const dy = entity.y - y;
                        const distanceSquared = dx * dx + dy * dy;
                        
                        if (distanceSquared <= radiusSquared) {
                            nearbyEntities.add(entity);
                        }
                    });
                }
            }
        }
        
        return nearbyEntities;
    }

    startScanning() {
        this.isScanning = true;
        this.lastScanTime = Date.now();
    }

    stopScanning() {
        this.isScanning = false;
    }

    update(deltaTime) {
        // Clear and rebuild spatial grid
        this.spatialGrid.clear();
        this.entities.forEach(entity => {
            this.updateEntityGrid(entity);
        });

        // Update scanning
        if (this.isScanning) {
            const now = Date.now();
            if (now - this.lastScanTime >= this.scanInterval) {
                this.performScan();
                this.lastScanTime = now;
            }
        }
    }

    performScan() {
        if (!this.gameObjects?.player) return;
        
        const player = this.gameObjects.player;
        const scanRadius = 200; // Detection radius

        this.entities.forEach(entity => {
            const dx = entity.x - player.x;
            const dy = entity.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            entity.distanceToPlayer = distance;
            
            this.updateThreatLevel(entity);
        });
    }

    updateThreatLevel(entity) {
        entity.threatLevel = this.getEntityThreatLevel(entity);
    }

    getEntityThreatLevel(entity) {
        const baseThreat = entity.damage || 10;
        const healthThreat = (entity.health / entity.maxHealth) * 100;
        const distanceThreat = entity.distanceToPlayer || 100;
        
        const totalThreat = (baseThreat * 0.4) + 
                           (healthThreat * 0.3) + 
                           ((100 - distanceThreat) * 0.3);
        
        if (totalThreat > 70) return 'high';
        if (totalThreat > 30) return 'medium';
        return 'low';
    }

    getThreatColor(threatLevel) {
        switch (threatLevel) {
            case 'high':
                return '#ff0000';
            case 'medium':
                return '#ffff00';
            case 'low':
                return '#00ff00';
            default:
                return '#ffffff';
        }
    }

    getWeakPoints(entity) {
        // Define weak points based on entity type
        if (entity.type === 'drone') {
            return [{
                x: entity.x + entity.width * 0.5,
                y: entity.y + entity.height * 0.3,
                radius: 5,
                damageMultiplier: 1.5
            }];
        } else if (entity.type === 'cyborg') {
            return [{
                x: entity.x + entity.width * 0.6,
                y: entity.y + entity.height * 0.4,
                radius: 6,
                damageMultiplier: 1.8
            }];
        }
        return [];
    }
}