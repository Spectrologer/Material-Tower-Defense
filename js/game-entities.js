import { TOWER_TYPES, ENEMY_TYPES, TILE_SIZE } from './constants.js';

export class Projectile {
    constructor(owner, target, startAngle = 0) {
        this.owner = owner;
        this.x = owner.x;
        this.y = owner.y;
        this.target = target;
        this.hitEnemies = new Set();
        this.hitCooldown = 0;
        this.bounces = owner.fragmentBounces || 0;
        this.damageMultiplier = 1;
        if (this.owner.type === 'ORBIT') {
            this.angle = startAngle;
            this.orbitRadius = this.owner.orbitMode === 'near' ? 40 : 60;
        }
        if (this.owner.type === 'FORT') {
            this.isMortar = true;
            this.startX = owner.x;
            this.startY = owner.y;
            this.targetX = target.x;
            this.targetY = target.y;
            this.totalDist = Math.hypot(this.targetX - this.startX, this.targetY - this.startY);
            this.travelTime = this.totalDist / this.owner.projectileSpeed;
            this.life = this.travelTime;
            this.peakHeight = this.totalDist / 2; // Arc height is half the distance
        }
    }
    draw(ctx) {
        if (this.isMortar) {
            // Draw shadow on the ground
            const shadowSize = this.owner.projectileSize * 0.75;
            const shadowOpacity = 0.4 - (this.z / this.peakHeight) * 0.2;
            ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, shadowSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw projectile "in the air"
            const scale = 1 + (this.z / this.peakHeight) * 0.5;
            ctx.fillStyle = this.owner.projectileColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.z, this.owner.projectileSize * scale, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        let iconFamily = 'Material Icons';
        let icon;
        let rotation = 0;
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const angle = Math.atan2(dy, dx);
            rotation = angle;
        }
        if (this.owner.type === 'PIN' || this.owner.type === 'NINE_PIN') {
            icon = 'chevron_right';
        } else if (this.owner.type === 'PIN_HEART') {
            icon = 'favorite';
            rotation -= Math.PI / 2; // Corrected rotation to point towards the enemy
        } else if (this.owner.type === 'NAT') {
            icon = 'arrow_forward';
            iconFamily = "'Material Symbols Outlined'";
        } else if (this.owner.type === 'ORBIT') {
            icon = 'circle';
            iconFamily = "'Material Symbols Outlined'";
        }
        if (icon) {
            let fontSize = 24;
            if (this.owner.type === 'ORBIT') {
                fontSize = this.owner.projectileSize * 3;
            } else if (this.owner.type === 'NINE_PIN') {
                fontSize = 40;
            } else if (this.owner.type === 'PIN_HEART') {
                fontSize = 16; // Further reduced the size of the heart projectile
            }
            ctx.font = `${fontSize}px ${iconFamily}`;
            ctx.fillStyle = this.owner.projectileColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(rotation);
            ctx.fillText(icon, 0, 0);
            ctx.restore();
        } else {
            ctx.fillStyle = this.owner.projectileColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.owner.projectileSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    update(onHit, enemies, effects) {
        if (this.isMortar) {
            this.life--;
            if (this.life <= 0) {
                // Explode at target location
                onHit(this);
                return false;
            }
            const progress = 1 - (this.life / this.travelTime);
            this.x = this.startX + (this.targetX - this.startX) * progress;
            this.y = this.startY + (this.targetY - this.startY) * progress;
            this.z = Math.sin(progress * Math.PI) * this.peakHeight;
            return true;
        }
        if (this.owner.type === 'ORBIT') {
            this.angle += this.owner.projectileSpeed / 30;
            this.orbitRadius = this.owner.orbitMode === 'near' ? 40 : 60;
            this.x = this.owner.x + Math.cos(this.angle) * this.orbitRadius;
            this.y = this.owner.y + Math.sin(this.angle) * this.orbitRadius;
            if (this.hitCooldown > 0) {
                this.hitCooldown--;
            } else {
                this.hitEnemies.clear();
            }
            return true;
        }

        if ((!this.target || this.target.health <= 0) && (this.owner.type === 'PIN_HEART' || this.bounces > 0)) {
            let closestEnemy = null;
            let minDistance = Infinity;
            for (const enemy of enemies) {
                if (!this.hitEnemies.has(enemy)) {
                    const distToTower = Math.hypot(this.owner.x - enemy.x, this.owner.y - enemy.y);
                    if (distToTower <= this.owner.range) {
                        const distToProjectile = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                        if (distToProjectile < minDistance) {
                            minDistance = distToProjectile;
                            closestEnemy = enemy;
                        }
                    }
                }
            }
            this.target = closestEnemy;
        }

        if (!this.target || this.target.health <= 0) return false;

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (this.owner.type === 'NINE_PIN') {
            for (const enemy of enemies) {
                if (!this.hitEnemies.has(enemy)) {
                    if (Math.hypot(this.x - enemy.x, this.y - enemy.y) < enemy.size) {
                        onHit(this, enemy);
                        this.hitEnemies.add(enemy);
                    }
                }
            }
        }
        
        const hitCondition = distance < this.owner.projectileSpeed || Math.hypot(this.x - this.target.x, this.y - this.target.y) < this.target.size;

        if (hitCondition) {
            onHit(this);
            this.hitEnemies.add(this.target);

            if (this.bounces > 0) {
                // Create a visual effect for the fragmentation
                if (effects) {
                    effects.push(new Effect(this.x, this.y, 'clear_day', 25, this.owner.projectileColor, 20));
                }

                // Logic to find a new target and "bounce"
                this.bounces--;
                this.damageMultiplier *= this.owner.bounceDamageFalloff;
                this.target = null; // Clear target to find a new one
                return true; // Keep the projectile alive to find a new target
            }

            return false; // Destroy projectile if it doesn't fragment
        } else {
            this.x += (dx / distance) * this.owner.projectileSpeed;
            this.y += (dy / distance) * this.owner.projectileSpeed;
        }

        return true;
    }
}

export class Enemy {
    constructor(type, path, typeName) {
        this.path = path;
        this.pathIndex = 0;
        this.direction = 1;
        this.x = this.path[0].x - TILE_SIZE;
        this.y = this.path[0].y;
        this.type = type;
        this.typeName = typeName;
        this.speed = type.speed;
        this.health = type.health;
        this.maxHealth = type.health;
        this.color = type.color;
        this.size = type.size;
        this.gold = type.gold;
        this.hitTimer = 0;
        this.burns = [];
        this.slowMultiplier = 1;

        if (this.type.laysEggs) {
            this.timeUntilLay = this.type.layEggInterval;
            this.isLayingEgg = false;
            this.stopTimer = 0;
            this.wiggleTimer = 0;
        }

        if (this.type.hatchTime) {
            this.hatchTimer = this.type.hatchTime * 60; // seconds to frames
        }
    }
    applyBurn(dps, durationInSeconds) {
        const existingBurn = this.burns.find(b => b.dps >= dps);
        if (existingBurn) {
            existingBurn.ticksLeft = Math.max(existingBurn.ticksLeft, durationInSeconds * 60);
        } else {
            this.burns = [{ dps, ticksLeft: durationInSeconds * 60 }];
        }
    }
    draw(ctx) {
        ctx.save();
        if (this.wiggleTimer > 0) {
            const wiggleAmount = 3;
            const wiggleSpeed = 0.5;
            ctx.translate(this.x + Math.sin(this.wiggleTimer * wiggleSpeed) * wiggleAmount, this.y);
        } else {
            ctx.translate(this.x, this.y);
        }

        ctx.font = `${this.size * 2}px ${this.type.iconFamily || 'Material Icons'}`;
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.icon, 0, 0);
        ctx.restore();

        const healthBarWidth = this.size * 2;
        const healthBarHeight = 5;
        const healthPercentage = this.health / this.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - this.size, this.y - this.size - 10, healthBarWidth, healthBarHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - this.size, this.y - this.size - 10, healthBarWidth * healthPercentage, healthBarHeight);
        if (this.hitTimer > 0) {
            ctx.save();
            ctx.font = `${this.size * 2}px ${this.type.iconFamily || 'Material Icons'}`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.type.icon, this.x, this.y);
            ctx.restore();
            this.hitTimer--;
        }
        if (this.burns.length > 0) {
            ctx.globalAlpha = 0.5;
            ctx.font = `${this.size * 2.5}px 'Material Symbols Outlined'`;
            ctx.fillStyle = `rgba(255, 100, 0, ${0.5 + Math.sin(Date.now() / 100) * 0.2})`;
            ctx.fillText('local_fire_department', this.x, this.y);
            ctx.globalAlpha = 1.0;
        }
    }
    drawSelection(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + 4, 0, Math.PI * 2);
        ctx.stroke();
    }
    update(onFinish, onDeath, allEnemies, playWiggleSound, playCrackSound) {
        // --- Health & Burn Damage ---
        if (this.burns.length > 0) {
            const burn = this.burns[0];
            this.health -= burn.dps / 60;
            burn.ticksLeft--;
            if (burn.ticksLeft <= 0) this.burns.shift();
        }
        if (this.health <= 0) {
            onDeath(this);
            return false; // Remove this enemy
        }

        // --- Special Behaviors ---
        if (this.type.laysEggs && !this.isLayingEgg) {
            this.timeUntilLay--;
            if (this.timeUntilLay <= 0) {
                this.isLayingEgg = true;
                this.stopTimer = this.type.eggLayStopTime;
                this.wiggleTimer = this.type.wiggleTime;
            }
        }

        if (this.isLayingEgg) {
            this.stopTimer--;
            if (this.wiggleTimer > 0) {
                this.wiggleTimer--;
                if (this.wiggleTimer % 20 === 0) { // Play sound less frequently than every frame
                    playWiggleSound();
                }
            }
            if (this.stopTimer <= 0) {
                this.isLayingEgg = false;
                this.timeUntilLay = this.type.layEggInterval;
                const egg = new Enemy(ENEMY_TYPES.EGG, this.path, 'EGG');
                egg.x = this.x;
                egg.y = this.y;
                egg.pathIndex = this.pathIndex;
                allEnemies.push(egg);
            } else {
                return true; // Stop moving while laying egg
            }
        }


        if (this.type.hatchTime) {
            this.hatchTimer--;
            if (this.hatchTimer <= 0) {
                const hatched = new Enemy(ENEMY_TYPES[this.type.hatchesTo], this.path, this.type.hatchesTo);
                hatched.x = this.x;
                hatched.y = this.y;
                hatched.pathIndex = this.pathIndex; // New enemy starts from egg's path index
                allEnemies.push(hatched);
                if (playCrackSound) playCrackSound();
                return false; // Remove the egg
            }
        }

        if (this.type.isStationary) {
            return true; // Don't move
        }

        // --- Movement Logic ---
        let atEnd = this.pathIndex >= this.path.length - 1;
        let atStart = this.pathIndex <= 0;

        if (this.type === ENEMY_TYPES.BOSS) {
            if (atEnd && this.direction === 1) this.direction = -1;
            if (atStart && this.direction === -1) this.direction = 1;
        } else {
            if (atEnd) {
                onFinish(this);
                return false; // Remove this enemy
            }
        }

        const targetIndex = this.pathIndex + this.direction;
        if (targetIndex < 0 || targetIndex >= this.path.length) {
            // This case should primarily be for the boss turning around
            return true;
        }

        const target = this.path[targetIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.hypot(dx, dy);
        const currentSpeed = this.speed * this.slowMultiplier;

        if (distance < currentSpeed) {
            this.pathIndex += this.direction;
        } else {
            this.x += (dx / distance) * currentSpeed;
            this.y += (dy / distance) * currentSpeed;
        }

        return true; // Keep this enemy
    }
    takeDamage(amount) {
        this.health -= amount;
        this.hitTimer = 5;
        return this.health <= 0;
    }
}

export class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.id = crypto.randomUUID();
        this.level = 1;
        this.damageLevel = 1;
        this.mode = 'boost';
        this.targetingMode = 'strongest';
        this.damageMultiplier = 1;
        this.projectileCount = 1;
        this.damageMultiplierFromMerge = 1;
        this.goldBonusMultiplier = 1;
        this.fragmentBounces = 0;
        this.bounceDamageFalloff = 0.5;
        const baseStats = TOWER_TYPES[type];
        this.splashRadius = baseStats.splashRadius;
        if (type === 'FIREPLACE') {
            this.burnDps = baseStats.burnDps;
            this.burnDuration = baseStats.burnDuration;
        }
        this.updateStats();
        this.cooldown = 0;
        this.target = null;
        if (type === 'ORBIT') {
            this.orbitMode = 'far';
            this.orbiters = [
                new Projectile(this, null, 0),
                new Projectile(this, null, Math.PI)
            ];
        }
        if (this.type === 'NINE_PIN') {
            this.level = 'MAX LEVEL';
            this.damageLevel = 'MAX LEVEL';
        }
    }
    updateStats() {
        const baseStats = TOWER_TYPES[this.type];
        const maxLevel = this.type === 'FIREPLACE' ? 3 : 5;
        const levelForCalc = this.level === 'MAX LEVEL' ? maxLevel : this.level;
        const damageLevelForCalc = this.damageLevel === 'MAX LEVEL' ? maxLevel : this.damageLevel;
        if (this.type === 'ENT' || this.type === 'CAT') {
            this.level = 'MAX LEVEL';
            this.cost = baseStats.cost;
            this.range = baseStats.range;
            this.attackSpeedBoost = baseStats.attackSpeedBoost;
            this.damageBoost = baseStats.damageBoost;
            this.enemySlow = baseStats.enemySlow;
            if (this.type === 'CAT') {
                this.goldBonus = baseStats.goldBonus;
            }
            return;
        }
        this.cost = baseStats.cost * levelForCalc;
        this.range = baseStats.range;
        if (this.type === 'FIREPLACE') {
            this.damage = baseStats.damage;
        } else {
            this.damage = baseStats.damage * (1 + (damageLevelForCalc - 1) * 0.5) * this.damageMultiplierFromMerge;
        }
        this.permFireRate = baseStats.fireRate * Math.pow(0.9, levelForCalc - 1);
        this.fireRate = this.permFireRate;
        this.color = this.color || baseStats.color;
        this.projectileSpeed = baseStats.projectileSpeed;
        if (!this.projectileSize) {
            this.projectileSize = baseStats.projectileSize;
        }
        this.projectileColor = baseStats.projectileColor;
        if (this.type === 'SUPPORT') {
            this.attackSpeedBoost = baseStats.attackSpeedBoost * Math.pow(0.95, levelForCalc - 1);
        }
    }
    draw(ctx) {
        if (this.type === 'NINE_PIN') {
            const angle = this.target ? Math.atan2(this.target.y - this.y, this.target.x - this.x) : 0;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.fillStyle = this.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `900 90px 'Material Symbols Outlined'`;
            ctx.fillText('move_item', 0, 0);
            ctx.restore();
            return;
        }
        const visualLevel = this.level === 'MAX LEVEL' ? 6 : this.level;
        let iconSize = 28 + (visualLevel * 2);
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let icon;
        let iconFamily = 'Material Icons';
        let fontWeight = '400';
        switch (this.type) {
            case 'PIN': icon = 'location_pin'; break;
            case 'CASTLE': icon = 'castle'; break;
            case 'FORT': icon = 'fort'; break;
            case 'SUPPORT': icon = 'support_agent'; break;
            case 'PIN_HEART':
                icon = 'map_pin_heart';
                iconFamily = "'Material Symbols Outlined'";
                break;
            case 'FIREPLACE':
                icon = 'fireplace';
                iconFamily = "'Material Symbols Outlined'";
                break;
            case 'NAT':
                icon = 'nat';
                iconFamily = "'Material Symbols Outlined'";
                break;
            case 'ENT':
                icon = 'psychology';
                iconFamily = "'Material Symbols Outlined'";
                if (this.mode === 'boost') {
                    ctx.fillStyle = '#65a30d';
                } else {
                    ctx.fillStyle = '#0891b2';
                }
                break;
            case 'ORBIT':
                icon = 'orbit';
                iconFamily = "'Material Symbols Outlined'";
                break;
            case 'CAT':
                icon = '\uf6be';
                iconFamily = '"Font Awesome 6 Free"';
                fontWeight = '900';
                iconSize *= TOWER_TYPES.CAT.iconSize;
                if (this.mode === 'boost') {
                    ctx.fillStyle = '#65a30d';
                } else {
                    ctx.fillStyle = '#0891b2';
                }
                break;
        }
        ctx.font = `${fontWeight} ${iconSize}px ${iconFamily}`;
        const angle = this.target ? Math.atan2(this.target.y - this.y, this.target.x - this.x) : 0;
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.type === 'NAT') {
            if (this.target && this.cooldown > 0 && this.cooldown < 20) {
                const quiverAmount = this.level > 5 ? 2.5 : 1.5;
                ctx.translate((Math.random() - 0.5) * quiverAmount, (Math.random() - 0.5) * quiverAmount);
            }
            ctx.rotate(angle);
        } else if (this.type === 'PIN' || this.type === 'PIN_HEART') {
            ctx.rotate(angle - Math.PI / 2);
        }
        ctx.fillText(icon, 0, 0);
        ctx.restore();
        if (this.type === 'ORBIT') {
            this.orbiters.forEach(orbiter => orbiter.draw(ctx));
        }
    }
    drawRange(ctx) {
        if (this.type === 'ORBIT' || this.type === 'SUPPORT' || this.type === 'ENT' || this.type === 'CAT') return;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
    }
    drawBuffEffect(ctx) {
        const auraColor = (this.type === 'ENT' && this.mode === 'slow') ? '#0891b2' : ((this.type === 'CAT' && this.mode === 'slow') ? '#0891b2' : this.color);
        const dashLength = 10;
        const spaceLength = 5;
        const totalLength = dashLength + spaceLength;
        const offset = (Date.now() / 50) % totalLength;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = auraColor;
        ctx.fillStyle = auraColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([dashLength, spaceLength]);
        ctx.lineDashOffset = -offset;
        const startX = this.x - TILE_SIZE * 1.5;
        const startY = this.y - TILE_SIZE * 1.5;
        const size = TILE_SIZE * 3;
        ctx.beginPath();
        ctx.rect(startX, startY, size, size);
        ctx.stroke();
        ctx.globalAlpha = 0.1;
        ctx.fillRect(startX, startY, size, size);
        ctx.restore();
    }
    findTarget(enemies) {
        this.target = null;
        let potentialTargets = enemies.filter(enemy => this.isInRange(enemy));
        // Allow NINE_PIN to target flying units
        potentialTargets = potentialTargets.filter(enemy => !(enemy.type.isFlying && (this.type === 'CASTLE' || this.type === 'FORT' || this.type === 'ORBIT' || this.type === 'FIREPLACE')));
        if (potentialTargets.length === 0) return;
        switch (this.targetingMode) {
            case 'strongest':
                let strongestEnemy = null;
                let maxHealth = -1;
                for (const enemy of potentialTargets) {
                    if (enemy.health > maxHealth) {
                        strongestEnemy = enemy;
                        maxHealth = enemy.health;
                    }
                }
                this.target = strongestEnemy;
                break;
            case 'weakest':
                let weakestEnemy = null;
                let minHealth = Infinity;
                for (const enemy of potentialTargets) {
                    if (enemy.health < minHealth) {
                        weakestEnemy = enemy;
                        minHealth = enemy.health;
                    }
                }
                this.target = weakestEnemy;
                break;
            case 'furthest':
                if (this.type === 'FORT') {
                    let bestTarget = null;
                    let maxSurrounding = -1;
                    for (const mainEnemy of potentialTargets) {
                        let surroundingCount = 0;
                        for (const otherEnemy of enemies) {
                            if (mainEnemy !== otherEnemy) {
                                const dist = Math.hypot(mainEnemy.x - otherEnemy.x, mainEnemy.y - otherEnemy.y);
                                if (dist <= this.splashRadius + 10) {
                                    surroundingCount++;
                                }
                            }
                        }
                        if (surroundingCount > maxSurrounding) {
                            maxSurrounding = surroundingCount;
                            bestTarget = mainEnemy;
                        }
                    }
                    this.target = bestTarget;
                } else {
                    let furthestEnemy = null;
                    let maxPathIndex = -1;
                    for (const enemy of potentialTargets) {
                        if (enemy.pathIndex > maxPathIndex) {
                            furthestEnemy = enemy;
                            maxPathIndex = enemy.pathIndex;
                        }
                    }
                    this.target = furthestEnemy;
                }
                break;
            default:
                let closestDist = Infinity;
                for (const enemy of potentialTargets) {
                    const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                    if (dist < closestDist) {
                        this.target = enemy;
                        closestDist = dist;
                    }
                }
                break;
        }
    }
    isInRange(enemy) {
        return Math.hypot(this.x - enemy.x, this.y - enemy.y) <= this.range;
    }
    update(enemies, projectiles, onEnemyDeath) {
        if (this.type === 'SUPPORT' || this.type === 'ENT' || this.type === 'CAT') {
            return;
        }
        if (this.type === 'ORBIT') {
            this.orbiters.forEach(orbiter => {
                orbiter.update();
                enemies.forEach(enemy => {
                    if (enemy.type.isFlying) return;
                    const dist = Math.hypot(orbiter.x - enemy.x, orbiter.y - enemy.y);
                    if (dist < enemy.size + this.projectileSize) {
                        if (!orbiter.hitEnemies.has(enemy)) {
                            const finalDamage = this.damage * this.damageMultiplier;
                            if (enemy.takeDamage(finalDamage)) {
                                onEnemyDeath(enemy);
                            }
                            orbiter.hitEnemies.add(enemy);
                            orbiter.hitCooldown = 15;
                        }
                    }
                });
            });
            return;
        }
        this.findTarget(enemies);
        if (this.cooldown > 0) this.cooldown--;
        if (this.target && this.cooldown <= 0) {
            this.shoot(projectiles);
            this.cooldown = this.fireRate;
        }
    }
    shoot(projectiles) {
        if (!this.target) return;
        if (this.type === 'FORT') {
            // Mortar targets a location, not the enemy object itself.
            const locationTarget = { x: this.target.x, y: this.target.y, health: 1 }; // health > 0 to be valid
            projectiles.push(new Projectile(this, locationTarget));
            return;
        }
        if (this.type === 'NINE_PIN') {
            const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            const fakeTarget = {
                x: this.x + Math.cos(angle) * 2000,
                y: this.y + Math.sin(angle) * 2000,
                health: Infinity,
            };
            projectiles.push(new Projectile(this, fakeTarget));
            return;
        }
        if (this.projectileCount > 1 && this.target) {
            const angleToTarget = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            const spreadAngle = Math.PI / 24;
            projectiles.push(new Projectile(this, this.target));
            for (let i = 1; i < this.projectileCount; i++) {
                const side = (i % 2 === 0) ? -1 : 1;
                const magnitude = Math.ceil(i / 2);
                const offsetAngle = angleToTarget + (spreadAngle * magnitude * side);
                const fakeTarget = {
                    x: this.x + Math.cos(offsetAngle) * (this.range + 50),
                    y: this.y + Math.sin(offsetAngle) * (this.range + 50),
                    health: Infinity
                };
                projectiles.push(new Projectile(this, fakeTarget));
            }
        } else {
            projectiles.push(new Projectile(this, this.target));
        }
    }
}

export class Effect {
    constructor(x, y, icon, size, color, duration) {
        this.x = x; this.y = y; this.icon = icon; this.size = size; this.color = color; this.life = duration; this.maxLife = duration;
    }
    update() {
        this.life--;
        return this.life > 0;
    }
    draw(ctx) {
        let progress = 1 - (this.life / this.maxLife);
        let currentSize = this.size * progress;
        let opacity = 1 - progress;
        if (this.icon === 'attach_money') {
            currentSize = this.size + (5 * progress);
            opacity = 1 - progress * 0.5;
        }
        ctx.font = `${currentSize}px 'Material Symbols Outlined'`;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = opacity;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, this.y);
        ctx.globalAlpha = 1.0;
    }
}

export class TextAnnouncement {
    constructor(text, x, y, duration, color = '#00ff88', maxWidth = Infinity) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.life = duration;
        this.maxLife = duration;
        this.color = color;
        this.maxWidth = maxWidth;
    }
    update() {
        this.life--;
        return this.life > 0;
    }
    draw(ctx) {
        const fadeStartTime = this.maxLife * 0.75;
        let opacity = 1.0;
        if (this.life < fadeStartTime) {
            opacity = this.life / fadeStartTime;
        }
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = this.color;
        let fontSize = 16;
        ctx.font = `${fontSize}px 'Press Start 2P'`;
        const lines = this.text.split('\n');
        let longestLine = '';
        let maxLineWidth = 0;
        for (const line of lines) {
            const currentLineWidth = ctx.measureText(line).width;
            if (currentLineWidth > maxLineWidth) {
                maxLineWidth = currentLineWidth;
                longestLine = line;
            }
        }
        const safeMaxWidth = this.maxWidth * 0.9;
        if (maxLineWidth > safeMaxWidth) {
            const ratio = safeMaxWidth / maxLineWidth;
            fontSize *= ratio;
            ctx.font = `${fontSize}px 'Press Start 2P'`;
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 5;
        const lineHeight = fontSize * 1.25;
        const startY = this.y - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, index) => {
            ctx.fillText(line, this.x, startY + (index * lineHeight));
        });
        ctx.restore();
    }
}





