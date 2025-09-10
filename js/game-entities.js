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
            this.startX = this.owner.x;
            this.startY = this.owner.y;
            this.targetX = target.x;
            this.targetY = target.y;
            this.totalDist = Math.hypot(this.targetX - this.startX, this.targetY - this.startY);
            this.travelTime = this.totalDist / (this.owner.projectileSpeed * 60); // In seconds
            this.life = this.travelTime;
            this.peakHeight = this.totalDist / 2;
        }
        if (this.owner.type === 'ANTI_AIR') {
            this.isRocket = true;
            this.currentSpeed = this.owner.projectileSpeed;
            this.acceleration = 0.1;
            this.smokeTrailCooldown = 0.05; // seconds
            this.smokeTrailTimer = 0;
            this.isEmerging = true;
            this.emergeDuration = 0.2;
            this.emergeTimer = this.emergeDuration;
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
            const gradient = ctx.createRadialGradient(
                this.x, this.y - this.z, 0,
                this.x, this.y - this.z, this.owner.projectileSize * scale
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.5, this.owner.projectileColor);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');

            ctx.fillStyle = gradient;
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
            icon = 'arrow_upward';
            iconFamily = "'Material Symbols Outlined'";
            rotation += Math.PI / 2;
        } else if (this.owner.type === 'PIN_HEART') {
            icon = 'favorite';
            rotation -= Math.PI / 2;
        }
        else if (this.owner.type === 'NAT') {
            icon = 'arrow_forward';
            iconFamily = "'Material Symbols Outlined'";
        } else if (this.owner.type === 'ANTI_AIR') {
            icon = 'rocket';
            iconFamily = "'Material Symbols Outlined'";
            rotation += Math.PI / 2;
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
                fontSize = 16;
            } else if (this.owner.type === 'ANTI_AIR') {
                const baseFontSize = 32;
                if (this.isEmerging) {
                    const emergeProgress = Math.max(0, 1 - (this.emergeTimer / this.emergeDuration));
                    fontSize = baseFontSize * emergeProgress;
                } else {
                    fontSize = baseFontSize;
                }
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
    update(onHit, enemies, effects, deltaTime) {
        if (this.isEmerging) {
            this.emergeTimer -= deltaTime;
            if (this.emergeTimer <= 0) {
                this.isEmerging = false;
            }
            return true; // Wait until fully emerged to do anything else
        }

        const dt_scaler = deltaTime * 60;

        if (this.isRocket) {
            this.smokeTrailTimer -= deltaTime;
            if (this.smokeTrailTimer <= 0) {
                effects.push(new Effect(this.x, this.y, 'lens', 10, '#808080', 0.5));
                this.smokeTrailTimer = this.smokeTrailCooldown;
            }
        }

        if (this.isMortar) {
            this.life -= deltaTime;
            if (this.life <= 0) {
                // Mortar explosion occurs when it lands
                effects.push(new Effect(this.x, this.y, 'explosion', 30, '#FFA500', 0.2));
                onHit(this);
                return false;
            }
            const progress = 1 - (this.life / this.travelTime);
            this.x = this.startX + (this.targetX - this.startX) * progress;
            this.y = this.startY + (this.targetY - this.startY) * progress; // FIX: Corrected y-axis calculation
            this.z = Math.sin(progress * Math.PI) * this.peakHeight;
            return true;
        }
        if (this.owner.type === 'ORBIT') {
            this.angle += (this.owner.projectileSpeed / 30) * dt_scaler;
            this.orbitRadius = this.owner.orbitMode === 'far' ? 40 : 60;
            this.x = this.owner.x + Math.cos(this.angle) * this.orbitRadius;
            this.y = this.owner.y + Math.sin(this.angle) * this.orbitRadius;
            if (this.hitCooldown > 0) {
                this.hitCooldown -= deltaTime;
            } else {
                this.hitEnemies.clear();
            }
            return true;
        }

        if ((!this.target || this.target.health <= 0) && (this.owner.type === 'PIN_HEART' || this.owner.type === 'NAT' || this.owner.type === 'ANTI_AIR')) {
            let closestEnemy = null;
            let minDistance = Infinity;
            for (const enemy of enemies) {
                if (!this.hitEnemies.has(enemy) && (this.owner.type !== 'ANTI_AIR' || enemy.type.isFlying)) {
                    const distToProjectile = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                    if (distToProjectile < minDistance) {
                        minDistance = distToProjectile;
                        closestEnemy = enemy;
                    }
                }
            }
            this.target = closestEnemy;
        }
        if (!this.target || this.target.health <= 0) return false;

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.hypot(dx, dy);

        let moveDistance;
        if (this.isRocket) {
            moveDistance = this.currentSpeed * dt_scaler;
            this.currentSpeed += this.acceleration * dt_scaler;
        } else {
            moveDistance = this.owner.projectileSpeed * dt_scaler;
        }

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
        const hitCondition = distance < moveDistance || Math.hypot(this.x - this.target.x, this.y - this.target.y) < this.target.size;

        if (hitCondition) {
            // Check if it is a rocket BEFORE onHit and removal.
            if (this.isRocket) {
                // Use a smaller size for the rocket explosion
                effects.push(new Effect(this.x, this.y, 'explosion', 15, '#FFA500', 0.2));
            }
            onHit(this);
            this.hitEnemies.add(this.target);

            if (this.owner.hasFragmentingShot && this.bounces > 0) {
                let nextTarget = null;
                let minDistance = Infinity;
                for (const enemy of enemies) {
                    if (!this.hitEnemies.has(enemy) && enemy.health > 0) {
                        const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                        if (dist < minDistance && dist <= this.owner.range / 2) {
                            minDistance = dist;
                            nextTarget = enemy;
                        }
                    }
                }
                if (nextTarget) {
                    this.target = nextTarget;
                    this.bounces--;
                    this.damageMultiplier *= this.owner.bounceDamageFalloff;
                    effects.push(new Effect(this.x, this.y, 'gps_fixed', 20, '#ff69b4', 0.25));
                    return true;
                }
            }
            return false;
        } else {
            this.x += (dx / distance) * moveDistance;
            this.y += (dy / distance) * moveDistance;
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
        this.isDying = false;
        this.deathAnimationTimer = 0;
        this.rotation = 0;
        this.jostleX = 0;
        this.jostleY = 0;
        this.jostleTimer = 0;
        this.progress = 0;
        this.isVisible = !this.type.isInvisible;

        if (this.type.laysEggs) {
            this.timeUntilLay = this.type.layEggInterval;
            this.isLayingEgg = false;
            this.stopTimer = 0;
            this.wiggleTimer = 0;
        }

        if (this.type.hatchTime) {
            this.hatchTimer = this.type.hatchTime;
        }
    }
    applyBurn(dps, durationInSeconds) {
        const existingBurn = this.burns.find(b => b.dps >= dps);
        if (existingBurn) {
            existingBurn.duration = Math.max(existingBurn.duration, durationInSeconds);
        } else {
            this.burns.push({ dps, duration: durationInSeconds });
        }
    }
    draw(ctx) {
        if (!this.isVisible) return;
        ctx.save();
        if (this.wiggleTimer > 0) {
            const wiggleAmount = 3;
            const wiggleSpeed = 30; // Radians per second
            ctx.translate(this.x + Math.sin(this.wiggleTimer * wiggleSpeed) * wiggleAmount, this.y);
        } else {
            ctx.translate(this.x + this.jostleX, this.y + this.jostleY);
        }

        if (this.rotation) {
            ctx.rotate(this.rotation);
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
    update(onFinish, onDeath, allEnemies, playWiggleSound, playCrackSound, deltaTime) {
        if (this.hitTimer > 0) {
            this.hitTimer -= deltaTime;
        }
        if (this.jostleTimer > 0) {
            this.jostleTimer -= deltaTime;
            const progress = this.jostleTimer / 0.1; // 0.1 is the duration of the jostle
            this.jostleX = Math.sin(progress * Math.PI * 4) * 2 * progress; // Sin wave for back and forth
            this.jostleY = Math.cos(progress * Math.PI * 4) * 2 * progress;
        } else {
            this.jostleX = 0;
            this.jostleY = 0;
        }

        // --- Death Animation ---
        if (this.isDying) {
            this.deathAnimationTimer -= deltaTime;
            if (this.type.isFlying) {
                this.rotation += 30 * deltaTime;
                this.y += 50 * deltaTime;
            }
            if (this.deathAnimationTimer <= 0) {
                onDeath(this, { isAnimatedDeath: true });
                return false;
            }
            return true;
        }

        // --- Health & Burn Damage ---
        if (this.burns.length > 0) {
            const burn = this.burns[0];
            this.health -= burn.dps * deltaTime;
            burn.duration -= deltaTime;
            if (burn.duration <= 0) this.burns.shift();
        }
        if (this.health <= 0) {
            if (this.type.isFlying) { // Trigger death animation for flying units
                this.isDying = true;
                this.deathAnimationTimer = 0.5; // seconds
                return true; // Keep the enemy for animation
            } else {
                onDeath(this);
                return false; // Remove this enemy immediately
            }
        }

        // --- Special Behaviors ---
        if (this.type.hatchTime) {
            this.hatchTimer -= deltaTime;
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

        // Consolidate the egg-laying logic into a single block.
        if (this.type.laysEggs) {
            if (this.isLayingEgg) {
                // We are currently in the egg-laying state
                this.stopTimer -= deltaTime;
                if (this.wiggleTimer > 0) {
                    this.wiggleTimer -= deltaTime;
                    if (this.wiggleTimer % 0.33 < deltaTime) { // roughly every 20 frames
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
                }
            } else {
                // We are moving, but checking to start the egg-laying state
                this.timeUntilLay -= deltaTime;
                if (this.timeUntilLay <= 0) {
                    this.isLayingEgg = true;
                    this.stopTimer = this.type.eggLayStopTime;
                    this.wiggleTimer = this.type.wiggleTime;
                }
            }
        }

        // --- Movement Logic ---
        let atEnd = this.pathIndex >= this.path.length - 1;
        let atStart = this.pathIndex <= 0;

        if (this.typeName === 'BOSS') {
            if (atEnd && this.direction === 1) this.direction = -1;
            if (atStart && this.direction === -1) this.direction = 1;
        } else {
            if (atEnd) {
                onFinish(this);
                return false; // Remove this enemy
            }
        }

        // Only update movement if we are NOT laying an egg.
        if (!this.isLayingEgg) {
            const targetIndex = this.pathIndex + this.direction;
            if (targetIndex < 0 || targetIndex >= this.path.length) {
                // This case should primarily be for the boss turning around
                return true;
            }

            const target = this.path[targetIndex];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.hypot(dx, dy);
            const moveDistance = this.speed * this.slowMultiplier * 60 * deltaTime;

            if (distance < moveDistance) {
                this.pathIndex += this.direction;
            } else {
                this.x += (dx / distance) * moveDistance;
                this.y += (dy / distance) * moveDistance;
            }
        }

        if (this.path && this.path.length > 1) {
            this.progress = this.pathIndex / (this.path.length - 1);
        }

        return true; // Keep this enemy
    }
    takeDamage(amount) {
        this.health -= amount;
        this.hitTimer = 0.08; // seconds
        this.jostleTimer = 0.1;
        return this.health <= 0;
    }
}

export class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.id = crypto.randomUUID();
        /** @type {"MAX LEVEL" | number} */
        this.level = 1;
        /** @type {"MAX LEVEL" | number} */
        this.damageLevel = 1;
        this.mode = 'boost';
        this.targetingMode = (type === 'PIN_HEART') ? 'weakest' : (type === 'FORT' ? 'furthest' : 'strongest');
        this.attackGroundTarget = null;
        this.damageMultiplier = 1;
        this.projectileCount = 1;
        this.damageMultiplierFromMerge = 1;
        this.goldBonus = 0;
        this.fragmentBounces = 0;
        this.bounceDamageFalloff = 0.5;
        this.hasFragmentingShot = false;
        this.killCount = 0;
        this.isUnderDiversifyAura = false;
        // Add new properties here to prevent TypeScript errors
        this.natCastleBonus = 0;
        this.burnDps = 0;
        this.burnDuration = 0;
        this.attackSpeedBoost = 1;
        this.damageBoost = 1;
        this.enemySlow = 1;
        if (this.type === 'CAT') {
            this.goldGenerated = 0;
        }
        const baseStats = TOWER_TYPES[type];
        this.splashRadius = baseStats.splashRadius || 0; // Ensure splashRadius is always a number
        if (type === 'FIREPLACE') {
            this.burnDps = baseStats.burnDps;
            this.burnDuration = baseStats.burnDuration;
        }
        this.updateStats();
        this.cooldown = 0;
        this.target = null;
        if (type === 'ORBIT') {
            this.upgradeCount = 0; // NEW: Track total upgrades for the Orbit tower
            this.orbitMode = 'far';
            this.orbiters = [
                new Projectile(this, null, 0),
                new Projectile(this, null, Math.PI)
            ];
        }
        if (this.type === 'NINE_PIN') {
            this.level = 'MAX LEVEL';
            this.damageLevel = 'MAX LEVEL';
            this.targetingMode = 'strongest';
        }
    }
    get maxLevel() {
        return TOWER_TYPES[this.type].maxLevel || 5;
    }
    get levelForCalc() {
        return this.level === 'MAX LEVEL' ? this.maxLevel : this.level;
    }
    get damageLevelForCalc() {
        return this.damageLevel === 'MAX LEVEL' ? this.maxLevel : this.damageLevel;
    }
    updateStats() {
        const baseStats = TOWER_TYPES[this.type];
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
        this.cost = baseStats.cost * this.levelForCalc;
        this.range = baseStats.range;
        if (this.type === 'FIREPLACE') {
            this.damage = baseStats.damage;
        } else {
            this.damage = baseStats.damage * (1 + (this.damageLevelForCalc - 1) * 0.5) * (this.damageMultiplierFromMerge || 1);
        }

        if (this.type === 'ANTI_AIR' && this.natCastleBonus) {
            this.splashRadius = 10 * this.natCastleBonus;
        } else {
            this.splashRadius = baseStats.splashRadius || 0;
        }

        this.permFireRate = baseStats.fireRate * Math.pow(0.9, this.levelForCalc - 1);
        this.fireRate = this.permFireRate;
        this.color = this.color || baseStats.color;
        this.projectileSpeed = baseStats.projectileSpeed;
        if (!this.projectileSize) {
            this.projectileSize = baseStats.projectileSize;
        }
        this.projectileColor = baseStats.projectileColor;
        if (this.type === 'SUPPORT') {
            this.attackSpeedBoost = baseStats.attackSpeedBoost * Math.pow(0.95, this.levelForCalc - 1);
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        if (this.type === 'NINE_PIN') {
            let targetPoint = this.target;
            if (this.targetingMode === 'ground' && this.attackGroundTarget) {
                targetPoint = this.attackGroundTarget;
            }
            const angle = targetPoint ? Math.atan2(targetPoint.y - this.y, targetPoint.x - this.x) : 0;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.fillStyle = this.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `900 90px 'Material Symbols Outlined'`;
            ctx.fillText('move_item', 0, 0);
            ctx.restore();
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
                icon = 'ent';
                iconFamily = "'Material Symbols Outlined'";
                if (this.mode === 'boost') {
                    ctx.fillStyle = '#65a30d';
                } else if (this.mode === 'slow') {
                    ctx.fillStyle = '#0891b2';
                } else { // Diversify
                    ctx.fillStyle = '#f5c60bff';
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
                } else if (this.mode === 'slow') {
                    ctx.fillStyle = '#0891b2';
                } else { // Diversify
                    ctx.fillStyle = '#f5c60bff';
                }
                break;
            case 'ANTI_AIR':
                icon = 'open_jam';
                iconFamily = "'Material Symbols Outlined'";
                break;
        }
        ctx.font = `${fontWeight} ${iconSize}px ${iconFamily}`;
        const angle = this.target ? Math.atan2(this.target.y - this.y, this.target.x - this.x) : 0;
        ctx.save();
        ctx.translate(this.x, this.y);

        // Quiver effect for certain towers
        if (this.type === 'NAT' || this.type === 'ANTI_AIR') {
            if (this.target && this.cooldown > 0 && this.cooldown < 0.33) {
                const quiverAmount = this.levelForCalc > 5 ? 2.5 : 1.5;
                ctx.translate((Math.random() - 0.5) * quiverAmount, (Math.random() - 0.5) * quiverAmount);
            }
        }

        // Rotation logic
        if (this.type === 'NAT') {
            ctx.rotate(angle);
        } else if (this.type === 'PIN' || this.type === 'PIN_HEART') {
            ctx.rotate(angle - Math.PI / 2);
        } else if (this.type === 'ANTI_AIR') {
            ctx.rotate(angle + Math.PI / 2);
        }

        ctx.fillText(icon, 0, 0);
        ctx.restore();
        if (this.type === 'ORBIT') {
            this.orbiters.forEach(orbiter => orbiter.draw(ctx));
        }
        ctx.restore();
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
    findTarget(enemies, frameTargetedEnemies) {
        this.target = null;
        let potentialTargets = enemies.filter(enemy => this.isInRange(enemy) && !enemy.isDying && enemy.isVisible);

        if (this.isUnderDiversifyAura) {
            potentialTargets = potentialTargets.filter(enemy => !frameTargetedEnemies.has(enemy.id));
        }

        // Special targeting rules
        if (this.type === 'ANTI_AIR') {
            potentialTargets = potentialTargets.filter(enemy => enemy.type.isFlying);
        } else {
            const groundOnlyTowers = ['CASTLE', 'FORT', 'ORBIT', 'FIREPLACE'];
            if (groundOnlyTowers.includes(this.type)) {
                potentialTargets = potentialTargets.filter(enemy => !enemy.type.isFlying);
            }
        }

        if (potentialTargets.length === 0) {
            if (this.isUnderDiversifyAura) { // Fallback for diversify
                potentialTargets = enemies.filter(enemy => this.isInRange(enemy) && !enemy.isDying && enemy.isVisible);
            } else {
                return;
            }
        };

        switch (this.targetingMode) {
            case 'strongest':
                this.target = potentialTargets.reduce((a, b) => (a.health > b.health ? a : b), potentialTargets[0]);
                break;
            case 'weakest':
                this.target = potentialTargets.reduce((a, b) => (a.health < b.health ? a : b), potentialTargets[0]);
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
                    this.target = potentialTargets.reduce((a, b) => (a.progress > b.progress ? a : b), potentialTargets[0]);
                }
                break;
            default: // closest
                this.target = potentialTargets.reduce((a, b) => (Math.hypot(this.x - a.x, this.y - a.y) < Math.hypot(this.x - b.x, this.y - b.y) ? a : b), potentialTargets[0]);
                break;
        }

        if (this.target && this.isUnderDiversifyAura) {
            frameTargetedEnemies.add(this.target.id);
        }
    }
    isInRange(enemy) {
        return Math.hypot(this.x - enemy.x, this.y - enemy.y) <= this.range;
    }
    update(enemies, projectiles, onEnemyDeath, deltaTime, frameTargetedEnemies) {
        if (this.type === 'SUPPORT' || this.type === 'ENT' || this.type === 'CAT') {
            return;
        }
        if (this.type === 'ORBIT') {
            this.orbiters.forEach(orbiter => {
                orbiter.update(null, null, null, deltaTime);
                enemies.forEach(enemy => {
                    if (enemy.type.isFlying) return;
                    const dist = Math.hypot(orbiter.x - enemy.x, orbiter.y - enemy.y);
                    if (dist < enemy.size + this.projectileSize) {
                        if (!orbiter.hitEnemies.has(enemy)) {
                            const finalDamage = this.damage * this.damageMultiplier;
                            if (enemy.takeDamage(finalDamage)) {
                                this.killCount++;
                                onEnemyDeath(enemy);
                            }
                            orbiter.hitEnemies.add(enemy);
                            orbiter.hitCooldown = 0.25; // seconds
                        }
                    }
                });
            });
            return;
        }

        if (this.cooldown > 0) this.cooldown -= deltaTime;

        if ((this.type === 'FORT' || this.type === 'NINE_PIN') && this.targetingMode === 'ground' && this.attackGroundTarget) {
            this.target = null; // Ensure no enemy is targeted
            if (this.cooldown <= 0) {
                this.shoot(projectiles);
                this.cooldown = this.fireRate / 60;
            }
        } else {
            this.findTarget(enemies, frameTargetedEnemies);
            if (this.target && this.cooldown <= 0) {
                this.shoot(projectiles);
                this.cooldown = this.fireRate / 60; // Cooldown in seconds
            }
        }
    }
    shoot(projectiles) {
        if (!this.target && !((this.type === 'FORT' || this.type === 'NINE_PIN') && this.targetingMode === 'ground' && this.attackGroundTarget)) return;

        if (this.type === 'FORT') {
            // Mortar targets a location, not the enemy object itself.
            const locationTarget = (this.targetingMode === 'ground' && this.attackGroundTarget)
                ? { x: this.attackGroundTarget.x, y: this.attackGroundTarget.y, health: 1 }
                : { x: this.target.x, y: this.target.y, health: 1 }; // health > 0 to be valid
            projectiles.push(new Projectile(this, locationTarget));
            return;
        }
        if (this.type === 'NINE_PIN') {
            const targetPoint = (this.targetingMode === 'ground' && this.attackGroundTarget)
                ? this.attackGroundTarget
                : this.target;

            if (!targetPoint) return;

            const angle = Math.atan2(targetPoint.y - this.y, targetPoint.x - this.x);
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
    toJSON() {
        const data = {
            x: this.x,
            y: this.y,
            type: this.type,
            id: this.id,
            level: this.level,
            damageLevel: this.damageLevel,
            mode: this.mode,
            targetingMode: this.targetingMode,
            attackGroundTarget: this.attackGroundTarget,
            damageMultiplier: this.damageMultiplier,
            projectileCount: this.projectileCount,
            damageMultiplierFromMerge: this.damageMultiplierFromMerge,
            fragmentBounces: this.fragmentBounces,
            bounceDamageFalloff: this.bounceDamageFalloff,
            hasFragmentingShot: this.hasFragmentingShot,
            goldBonus: this.goldBonus,
            splashRadius: this.splashRadius,
            color: this.color,
            projectileSize: this.projectileSize,
            killCount: this.killCount,
            goldGenerated: this.goldGenerated,
            natCastleBonus: this.natCastleBonus,
        };

        // Add tower-type specific properties
        if (this.type === 'ORBIT') {
            data.orbitMode = this.orbitMode;
        }
        if (this.type === 'FIREPLACE') {
            data.burnDps = this.burnDps;
            data.burnDuration = this.burnDuration;
        }
        if (this.type === 'ENT' || this.type === 'CAT') {
            data.attackSpeedBoost = this.attackSpeedBoost;
            data.damageBoost = this.damageBoost;
            data.enemySlow = this.enemySlow;
        }
        if (this.type === 'CAT') {
            data.goldBonus = this.goldBonus;
        }
        if (this.type === 'SUPPORT') {
            data.attackSpeedBoost = this.attackSpeedBoost;
        }

        return data;
    }
    static fromJSON(data) {
        const tower = new Tower(data.x, data.y, data.type);

        const fields = [
            "id",
            "level",
            "damageLevel",
            "mode",
            "targetingMode",
            "attackGroundTarget",
            "damageMultiplier",
            "projectileCount",
            "damageMultiplierFromMerge",
            "fragmentBounces",
            "bounceDamageFalloff",
            "hasFragmentingShot",
            "goldBonus",
            "splashRadius",
            "color",
            "projectileSize",
            "burnDps",
            "burnDuration",
            "attackSpeedBoost",
            "damageBoost",
            "enemySlow",
            "goldBonus",
            "orbitMode",
            "killCount",
            "goldGenerated",
            "natCastleBonus",
        ];

        for (const field of fields) {
            if (field in data) {
                tower[field] = data[field];
            }
        }

        // Restore tower-type specific properties
        if (data.type === 'ORBIT') {
            // Recreate orbiters
            tower.orbiters = [
                new Projectile(tower, null, 0),
                new Projectile(tower, null, Math.PI)
            ];
        }

        // Recalculate stats to ensure everything is properly set up
        tower.updateStats();

        return tower;
    }
}

export class Effect {
    constructor(x, y, icon, size, color, duration) {
        this.x = x; this.y = y; this.icon = icon; this.size = size; this.color = color; this.life = duration; this.maxLife = duration;
    }
    update(deltaTime) {
        this.life -= deltaTime;
        return this.life > 0;
    }
    draw(ctx) {
        let progress = 1 - (this.life / this.maxLife);
        let currentSize = this.size * progress;
        let opacity = 1 - progress;

        let iconFamily = '';
        if (['explosion', 'gps_fixed'].includes(this.icon) || this.icon === 'attach_money' || this.icon === 'lens') {
            iconFamily = 'Material Symbols Outlined';
        } else {
            iconFamily = 'Material Icons';
        }

        if (this.icon === 'attach_money') {
            currentSize = this.size + (5 * progress);
            opacity = 1 - progress * 0.5;
        }

        ctx.font = `${currentSize}px '${iconFamily}'`;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = opacity;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, this.y);
        ctx.globalAlpha = 1.0;
    }
}

export class TextAnnouncement {
    constructor(text = '', x, y, duration, color = '#00ff88', maxWidth = Infinity) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.life = duration;
        this.maxLife = duration;
        this.color = color;
        this.maxWidth = maxWidth;
    }
    update(deltaTime) {
        this.life -= deltaTime;
        this.y -= (deltaTime * 5); // Drift upwards slowly
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
        let fontSize = 16;
        ctx.font = `${fontSize}px 'Press Start 2P'`;
        const lines = this.text.split('\n');
        let maxLineWidth = 0;
        for (const line of lines) {
            const currentLineWidth = ctx.measureText(line).width;
            if (currentLineWidth > maxLineWidth) {
                maxLineWidth = currentLineWidth;
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
        const lineHeight = fontSize * 1.25;
        const startY = this.y - ((lines.length - 1) * lineHeight) / 2;

        // --- Drop Shadow ---
        const shadowOffsetX = 2;
        const shadowOffsetY = 2;
        ctx.fillStyle = 'black';
        lines.forEach((line, index) => {
            const yPos = startY + (index * lineHeight);
            ctx.fillText(line, this.x + shadowOffsetX, yPos + shadowOffsetY);
        });

        // --- Main Text ---
        ctx.fillStyle = this.color;
        lines.forEach((line, index) => {
            const yPos = startY + (index * lineHeight);
            ctx.fillText(line, this.x, yPos);
        });

        ctx.restore();
    }
}
