import { TOWER_TYPES, ENEMY_TYPES, TILE_SIZE } from './constants.js';

/**
 * This is where we define how different projectiles should look and act.
 * It keeps the main Projectile class from becoming a giant mess of `if` statements.
 */
const projectileBehaviors = {
    DEFAULT: {
        // The standard-issue, glowing orb projectile.
        draw: (ctx, projectile) => {
            const gradient = ctx.createRadialGradient(
                projectile.x - 2, projectile.y - 2, 1, // Inner circle (light spot)
                projectile.x, projectile.y, projectile.owner.projectileSize // Outer circle
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)'); // Lighter center
            gradient.addColorStop(0.7, projectile.owner.projectileColor); // Main color
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)'); // Darker edge

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.owner.projectileSize, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    ORBIT: {
        // A special look for the ORBIT tower's projectiles.
        draw: (ctx, projectile) => {
            const gradient = ctx.createRadialGradient(
                projectile.x - 2, projectile.y - 2, 0,
                projectile.x, projectile.y, 8
            );
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(0.5, projectile.owner.projectileColor);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    ICON_BASED: {
        // For projectiles that are actually just icons, like arrows and hearts.
        draw: (ctx, projectile) => {
            let icon;
            let iconFamily;
            let rotation = 0;

            if (projectile.angle !== null) {
                rotation = projectile.angle;
            } else if (projectile.target) {
                const dx = projectile.target.x - projectile.x;
                const dy = projectile.target.y - projectile.y;
                rotation = Math.atan2(dy, dx);
            }

            // Pick the right icon based on the tower that shot it.
            switch (projectile.owner.type) {
                case 'PIN':
                case 'NINE_PIN':
                    icon = 'arrow_upward';
                    iconFamily = "'Material Symbols Outlined'";
                    rotation += Math.PI / 2;
                    break;
                case 'PIN_HEART':
                    icon = 'favorite';
                    iconFamily = 'Material Icons';
                    rotation -= Math.PI / 2;
                    break;
                case 'NAT':
                    icon = 'arrow_forward';
                    iconFamily = "'Material Symbols Outlined'";
                    break;
                case 'ANTI_AIR':
                    icon = 'rocket';
                    iconFamily = "'Material Symbols Outlined'";
                    rotation += Math.PI / 2;
                    break;
            }

            // Some icons need to be bigger or smaller than others.
            let fontSize = 24;
            if (projectile.owner.type === 'NINE_PIN') {
                fontSize = 40;
            } else if (projectile.owner.type === 'PIN_HEART') {
                fontSize = 16;
            } else if (projectile.owner.type === 'ANTI_AIR') {
                const baseFontSize = 32;
                if (projectile.isEmerging) {
                    // Make the rocket grow as it "emerges" from the tower.
                    const emergeProgress = Math.max(0, 1 - (projectile.emergeTimer / projectile.emergeDuration));
                    fontSize = baseFontSize * emergeProgress;
                } else {
                    fontSize = baseFontSize;
                }
            }

            // And now, we draw the icon, rotated to face its target.
            ctx.font = `${fontSize}px ${iconFamily}`;
            ctx.fillStyle = projectile.owner.projectileColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.translate(projectile.x, projectile.y);
            ctx.rotate(rotation);
            ctx.fillText(icon, 0, 0);
            ctx.restore();
        }
    }
};

// A quick lookup to see which tower types use which projectile behavior.
const projectileBehaviorMap = {
    'PIN': 'ICON_BASED',
    'NINE_PIN': 'ICON_BASED',
    'PIN_HEART': 'ICON_BASED',
    'NAT': 'ICON_BASED',
    'ANTI_AIR': 'ICON_BASED',
    'ORBIT': 'ORBIT',
};

// The blueprint for every bullet, rocket, and fireball in the game.
export class Projectile {
    constructor(owner, target, startAngle = null) {
        this.owner = owner;
        this.x = owner.x;
        this.y = owner.y;
        this.target = target;
        this.hitEnemies = new Set();
        this.hitCooldown = 0;
        this.bounces = owner.fragmentBounces || 0;
        this.behavior = projectileBehaviors[projectileBehaviorMap[owner.type] || 'DEFAULT']; // Grab the right drawing logic.
        this.damageMultiplier = 1;
        this.angle = startAngle; // Can be null if we have a target, or an angle for "free-fire".

        // If we're just given an angle, figure out where to go.
        if (this.angle !== null) {
            this.vx = Math.cos(this.angle);
            this.vy = Math.sin(this.angle);
            this.angle = startAngle;
        }

        // Special setup for FORT mortars.
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
            this.z = 0;
        }

        // Special setup for ANTI_AIR rockets.
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

        // Special setup for ORBIT projectiles.
        if (this.owner.type === 'ORBIT' && this.angle !== null) {
            // Put the orbiter in its starting position around the tower.
            const orbitRadius = this.owner.orbitMode === 'far' ? 40 : 60;
            this.x = this.owner.x + Math.cos(this.angle) * orbitRadius;
            this.y = this.owner.y + Math.sin(this.angle) * orbitRadius;
        }
    }
    draw(ctx) {
        this.behavior.draw(ctx, this);

        if (this.isMortar) {
            // Draw the mortar's shadow on the ground.
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.owner.projectileSize / 2, 0, Math.PI * 2);
            ctx.fill();

            // Draw the mortar shell itself, lifted up by its "z" height to look like it's flying.
            ctx.fillStyle = this.owner.projectileColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.z, this.owner.projectileSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    update(onHit, enemies, effects, deltaTime) {
        // For ANTI_AIR rockets, wait until they've "emerged" from the tower.
        if (this.isEmerging) {
            this.emergeTimer -= deltaTime;
            if (this.emergeTimer <= 0) {
                this.isEmerging = false;
            }
            return true; // Don't do anything else until it's fully out.
        }

        // This helps keep movement consistent even if the frame rate changes.
        const dt_scaler = deltaTime * 60;

        // Leave a smoke trail for rockets.
        if (this.isRocket) {
            this.smokeTrailTimer -= deltaTime;
            if (this.smokeTrailTimer <= 0) {
                effects.push(new Effect(this.x, this.y, 'lens', 10, '#808080', 0.5));
                this.smokeTrailTimer = this.smokeTrailCooldown;
            }
        }

        // Handle the arc-like movement of mortar shells.
        if (this.isMortar) {
            this.life -= deltaTime;
            if (this.life <= 0) {
                // Boom! Mortar lands.
                effects.push(new Effect(this.x, this.y, 'explosion', 30, '#FFA500', 0.2));
                onHit(this);
                return false;
            }
            // Move it along its pre-calculated path.
            const progress = 1 - (this.life / this.travelTime);
            this.x = this.startX + (this.targetX - this.startX) * progress;
            this.y = this.startY + (this.targetY - this.startY) * progress;
            // The "z" height follows a sine wave to make a nice arc.
            this.z = Math.sin(progress * Math.PI) * this.peakHeight;
            return true;
        }
        // Handle the circular movement of orbiters.
        if (this.owner.type === 'ORBIT') {
            this.angle += this.owner.orbitDirection * (this.owner.projectileSpeed / 30) * dt_scaler;
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

        // If a projectile was fired with an angle (like from a multi-shot tower), it just flies straight.
        if (this.angle !== null && !this.target) {
            const moveDistance = this.owner.projectileSpeed * dt_scaler;
            this.x += this.vx * moveDistance;
            this.y += this.vy * moveDistance;

            // Check if this free-flying projectile hits anything.
            for (const enemy of enemies) {
                // Can this projectile even hit this type of enemy? (e.g., anti-air vs ground)
                const canHit = (this.owner.type !== 'ANTI_AIR' || enemy.type.isFlying) &&
                    (this.owner.type === 'ANTI_AIR' || !enemy.type.isFlying);

                if (canHit && Math.hypot(this.x - enemy.x, this.y - enemy.y) < enemy.size) {
                    onHit(this, enemy); // Tell the game we hit something.
                    return false; // Projectile's done.
                }
            }
            // If it flies off the screen, it's gone.
            if (this.x < 0 || this.x > 440 || this.y < 0 || this.y > 720) {
                return false;
            }
            return true; // Keep on truckin'.
        } else if ((!this.target || this.target.health <= 0) && ['PIN_HEART', 'NAT', 'ANTI_AIR'].includes(this.owner.type)) {
            // If our target is gone, find a new one. This is for homing projectiles.
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
        // If there's no target, this projectile is a dud.
        if (!this.target || this.target.health <= 0) return false;

        // Standard "move towards the target" logic.
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.hypot(dx, dy);

        // Rockets get faster over time.
        let moveDistance;
        if (this.isRocket) {
            moveDistance = this.currentSpeed * dt_scaler;
            this.currentSpeed += this.acceleration * dt_scaler;
        } else {
            moveDistance = this.owner.projectileSpeed * dt_scaler;
        }

        // NINE_PIN projectiles are special; they can hit multiple enemies as they fly.
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

        // Did we hit our target?
        const hitCondition = distance < moveDistance || Math.hypot(this.x - this.target.x, this.y - this.target.y) < this.target.size;

        if (hitCondition) {
            // Rockets go boom on impact.
            if (this.isRocket) {
                effects.push(new Effect(this.x, this.y, 'explosion', 15, '#FFA500', 0.2));
            }
            onHit(this);
            this.hitEnemies.add(this.target);

            // Some projectiles can bounce to another enemy.
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
                    // Found a new target! Let's go!
                    this.target = nextTarget;
                    this.bounces--;
                    this.damageMultiplier *= this.owner.bounceDamageFalloff;
                    effects.push(new Effect(this.x, this.y, 'gps_fixed', 20, '#ff69b4', 0.25));
                    return true;
                }
            }
            return false;
        } else {
            // Keep moving towards the target.
            this.x += (dx / distance) * moveDistance;
            this.y += (dy / distance) * moveDistance;
        }
        return true;
    }
}

// The blueprint for every baddie that walks, flies, or splits on the path.
export class Enemy {
    constructor(type, path, typeName) {
        this.id = crypto.randomUUID(); // Give each enemy a unique ID so we can track them.
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
        this.damageTakenMultiplier = 1;
        this.damageDebuffTimer = 0;
        this.deathAnimationTimer = 0;
        this.rotation = 0;
        this.stunTimer = 0;
        this.jostleX = 0;
        this.jostleY = 0;
        this.jostleTimer = 0;
        this.progress = 0;
        this.isVisible = !this.type.isInvisible;
        this.isPhasing = false;
        this.facing = 1; // 1 for right, -1 for left

        // Special setup for the BOSS.
        if (this.type.laysEggs) {
            this.timeUntilLay = this.type.layEggInterval;
            this.isLayingEgg = false;
            this.stopTimer = 0;
            this.wiggleTimer = 0;
        }

        // Special setup for EGGs.
        if (this.type.hatchTime) {
            this.hatchTimer = this.type.hatchTime;
        }

        // Special setup for PHANTOMs.
        if (this.type.phaseInterval) {
            this.phaseTimer = this.type.phaseInterval;
            this.phaseDurationTimer = 0;
        }

        // Special setup for SUMMONERs.
        if (this.type.spawnsMinions) {
            this.spawnTimer = this.type.spawnInterval;
            this.spinSpeed = 0.5; // Radians per second
            this.minionsToSpawn = 0;
            this.minionSpawnDelayTimer = 0;
            this.wiggleTimer = 0;
        }

        // Special setup for HEALERs.
        if (this.type.isHealer) {
            this.healTimer = this.type.healInterval;
            this.isHealingPulse = false;
        }
    }
    // Zap! This enemy is stunned for a bit.
    applyStun(duration) {
        // If it's already stunned, we'll just take the longer stun duration.
        this.stunTimer = Math.max(this.stunTimer, duration);
    }
    applyBurn(dps, durationInSeconds, isDamageAmp = false) {
        const existingBurn = this.burns.find(b => b.dps >= dps);
        if (existingBurn) {
            existingBurn.duration = Math.max(existingBurn.duration, durationInSeconds);
            existingBurn.isDamageAmp = existingBurn.isDamageAmp || isDamageAmp; // Keep purple if it was already
        } else {
            this.burns.push({ dps, duration: durationInSeconds, isDamageAmp });
        }
    }
    // Make this enemy take more damage for a short time.
    applyDamageDebuff(multiplier, duration) {
        // Apply the strongest debuff
        this.damageTakenMultiplier = Math.max(this.damageTakenMultiplier, multiplier);
        this.damageDebuffTimer = Math.max(this.damageDebuffTimer, duration);
    }
    draw(ctx) {
        if (!this.isVisible) return;

        if (this.isPhasing) {
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 50) * 0.2;
        }

        // Make the PHANTOM enemy semi-transparent
        if (this.typeName === 'PHANTOM' && !this.isPhasing) {
            ctx.globalAlpha = 0.75;
        }

        // Show the healing pulse effect.
        if (this.isHealingPulse) {
            ctx.save();
            const pulseProgress = 1 - (this.healTimer / 0.5); // 0.5s pulse duration
            const radius = this.type.healRange * pulseProgress;
            const opacity = 1 - pulseProgress;
            ctx.fillStyle = `rgba(79, 195, 247, ${opacity * 0.3})`;
            ctx.fill(new Path2D(`M ${this.x - radius} ${this.y} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0`));
            ctx.restore();
        }

        // Wiggle the enemy when it's doing something special, like laying an egg.
        ctx.save();
        if (this.wiggleTimer > 0) {
            const wiggleAmount = 3; // This was a good idea, but it's not being used.
            const wiggleSpeed = 30; // Radians per second
            ctx.translate(this.x + Math.sin(this.wiggleTimer * wiggleSpeed) * wiggleAmount, this.y);
        } else {
            ctx.translate(this.x + this.jostleX, this.y + this.jostleY);
        }

        // Apply horizontal flip if facing is -1
        if (this.facing === -1) {
            ctx.scale(-1, 1);
        }

        if (this.rotation !== 0) {
            ctx.rotate(this.rotation);
        }

        // Set up the font to draw the icon.
        ctx.font = `${this.size * 2}px ${this.type.iconFamily || 'Material Icons'}`;
        if (this.type.iconFamily === 'Material Symbols Outlined' && this.type.filled) { // This was not here before
            ctx.fontVariationSettings = "'FILL' 1, 'wght' 400";
        }
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw a shadow to give the icon some depth.
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3;
        const shadowIconToDraw = this.isPhasing && this.type.phasingIcon ? this.type.phasingIcon : this.type.icon;
        if (this.type.iconFamily === 'Material Symbols Outlined' && this.type.filled) { // This was not here before
            ctx.fontVariationSettings = "'FILL' 1, 'wght' 400";
        }
        ctx.fillText(shadowIconToDraw, 0, 0); // The shadow is also flipped by the scale
        ctx.restore();

        // Draw the main icon.
        const iconToDraw = this.isPhasing && this.type.phasingIcon ? this.type.phasingIcon : this.type.icon; // This was not here before
        if (this.type.iconFamily === 'Material Symbols Outlined' && this.type.filled) {
            ctx.fontVariationSettings = "'FILL' 1, 'wght' 400";
        }
        ctx.fillText(iconToDraw, 0, 0); // The icon is also flipped
        ctx.fontVariationSettings = "'FILL' 0, 'wght' 400"; // Reset for other elements
        ctx.restore();

        // Draw the health bar above the enemy, but only if it's not in the dying animation.
        if (!this.isDying) {
            const healthBarWidth = this.size * 2;
            const healthBarHeight = 5;
            const healthPercentage = this.health / this.maxHealth;
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - this.size, this.y - this.size - 10, healthBarWidth, healthBarHeight);
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x - this.size, this.y - this.size - 10, healthBarWidth * healthPercentage, healthBarHeight);
        }

        // Flash the enemy white when it gets hit.
        if (this.hitTimer > 0) {
            ctx.save();
            ctx.font = `${this.size * 2}px ${this.type.iconFamily || 'Material Icons'}`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const iconToDraw = this.isPhasing && this.type.phasingIcon ? this.type.phasingIcon : this.type.icon;
            ctx.fillText(iconToDraw, this.x, this.y);
            ctx.restore();
        }

        // Show a little bolt icon when the enemy is stunned.
        if (this.stunTimer > 0) {
            ctx.font = `${this.size * 1.5}px 'Material Symbols Outlined'`;
            ctx.fillStyle = `rgba(254, 240, 138, ${0.5 + Math.sin(Date.now() / 100) * 0.2})`;
            ctx.fillText('bolt', this.x, this.y - this.size);
        }

        // Show a fire icon if the enemy is burning.
        if (this.burns.length > 0) {
            ctx.globalAlpha = 0.5;
            // Check if any burn has the damage amp flag, which makes it purple
            const hasDamageAmpBurn = this.burns.some(b => b.isDamageAmp);
            const burnColor = hasDamageAmpBurn ? '#c084fc' : `rgba(255, 100, 0, 1)`; // Solid orange for default burn
            ctx.font = `${this.size * 2.5}px 'Material Symbols Outlined'`;
            ctx.fillStyle = burnColor;
            ctx.fillText('local_fire_department', this.x, this.y);
            ctx.globalAlpha = 1.0;
        }

        ctx.globalAlpha = 1.0; // Reset alpha after drawing
    }
    // Draw a circle around the enemy when it's selected.
    drawSelection(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + 4, 0, Math.PI * 2);
        ctx.stroke();
    }
    // This is the main update function for the enemy, called every frame.
    update(onFinish, onDeath, allEnemies, playWiggleSound, playCrackSound, deltaTime, playHitSound, effects, newlySpawnedEnemies) {
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

        // If stunned, just sit there and take it.
        if (this.stunTimer > 0) {
            this.stunTimer -= deltaTime;
            return true; // Skip all other updates while stunned
        }

        // If the damage debuff wears off, reset it.
        this.damageDebuffTimer -= deltaTime;
        if (this.damageDebuffTimer <= 0) {
            this.damageTakenMultiplier = 1;
        }

        // If the enemy is dying, play a little animation.
        if (this.isDying) {
            this.deathAnimationTimer -= deltaTime;
            if (this.typeName === 'FAST' && this.deathAnimationTimer > 0) {
                // Skitter and shrink death animation
                this.x += Math.sin(this.deathAnimationTimer * 150) * 8; // Faster horizontal skitter
                const shrinkProgress = 1 - (this.deathAnimationTimer / 0.5); // 0.5 is the original duration
                this.size = this.type.size * (1 - shrinkProgress); // Shrink the enemy
            } else if (this.typeName === 'HEAVY' && this.deathAnimationTimer > 0) {
                // Tilt and shrink death animation
                this.rotation += 5 * deltaTime; // Tilt
                const shrinkProgress = 1 - (this.deathAnimationTimer / 0.5);
                this.size = this.type.size * (1 - shrinkProgress); // Shrink the enemy
            } else if (this.typeName === 'HEALER' && this.deathAnimationTimer > 0) {
                // Explode death animation
                const shrinkProgress = 1 - (this.deathAnimationTimer / 0.5);
                this.size = this.type.size * (1 - shrinkProgress); // Shrink the enemy
            } else if (this.typeName === 'NORMAL' && effects) {
                // Special "soul departs" death animation for the 'person'
                const soulEffect = new Effect(this.x, this.y, 'person', this.size * 1.5, '#FFFFFF', 1.0);
                effects.push(soulEffect);
            }
            if (this.deathAnimationTimer <= 0) {
                onDeath(this, { isAnimatedDeath: false });
                return false;
            }
            return true;
        }

        // Apply damage over time from burns.
        if (this.burns.length > 0) {
            const burn = this.burns[0];
            this.health -= burn.dps * deltaTime;
            burn.duration -= deltaTime;
            if (burn.duration <= 0) this.burns.shift();
        }
        if (this.health <= 0 && !this.isDying) {
            this.takeDamage(0, null, onDeath, newlySpawnedEnemies); // Trigger death logic
        }


        // If it's an egg, tick down the hatch timer.
        if (this.type.hatchTime) {
            this.hatchTimer -= deltaTime;
            if (this.hatchTimer <= 0) {
                const hatched = new Enemy(ENEMY_TYPES[this.type.hatchesTo], this.path, this.type.hatchesTo);
                hatched.x = this.x;
                hatched.y = this.y;
                hatched.pathIndex = this.pathIndex; // New enemy starts from egg's path index
                newlySpawnedEnemies.push(hatched);
                if (playCrackSound) playCrackSound();
                // Register egg as "killed" so it appears in the library.
                onDeath(this, { isAnimatedDeath: false });
                return false; // Remove the egg
            }
        }

        // Summoners just spin around all the time.
        if (this.type.spawnsMinions) {
            this.rotation += this.spinSpeed * deltaTime;
        }

        // Stationary enemies (like eggs) don't move.
        if (this.type.isStationary) {
            // But we still need to calculate their "progress" so towers can target them.
            if (this.path && this.path.length > 1) {
                this.progress = this.pathIndex / (this.path.length - 1);
            }
            return true; // Don't move
        }

        // Phantoms disappear and reappear further down the path.
        if (this.type.phaseInterval) {
            if (this.isPhasing) {
                this.phaseDurationTimer -= deltaTime;
                if (this.phaseDurationTimer <= 0) {
                    this.isPhasing = false;
                    this.isVisible = !this.type.isInvisible; // Become visible again unless stealthed
                    this.phaseTimer = this.type.phaseInterval;
                }
            } else {
                this.phaseTimer -= deltaTime;
                if (this.phaseTimer <= 0) {
                    this.isPhasing = true;
                    this.isVisible = false; // Become untargetable
                    this.phaseDurationTimer = this.type.phaseDuration;

                    // Jump forward a bit.
                    const targetIndex = this.pathIndex + this.direction;
                    if (this.path[targetIndex]) {
                        const target = this.path[targetIndex];
                        const dx = target.x - this.x;
                        const dy = target.y - this.y;
                        const distanceToNextNode = Math.hypot(dx, dy);
                        const moveDistance = Math.min(this.type.phaseDistance, distanceToNextNode);
                        this.x += (dx / distanceToNextNode) * moveDistance;
                        this.y += (dy / distanceToNextNode) * moveDistance;
                    }
                }
            }
        }

        // Summoners spawn little minions every so often.
        if (this.type.spawnsMinions) {
            // Check if it's time to start a new spawn cycle
            if (this.minionsToSpawn <= 0) {
                this.spawnTimer -= deltaTime;
                if (this.spawnTimer <= 0) {
                    this.spawnTimer = this.type.spawnInterval;
                    this.minionsToSpawn = this.type.spawnCount;
                    this.minionSpawnDelayTimer = 0; // Start spawning the first minion immediately
                }
            }

            // If there are minions to spawn, handle the sequential spawning
            if (this.minionsToSpawn > 0) {
                this.minionSpawnDelayTimer -= deltaTime;
                if (this.minionSpawnDelayTimer <= 0) {
                    this.minionSpawnDelayTimer = this.type.spawnDelay;
                    this.minionsToSpawn--;
                    this.wiggleTimer = 0.5; // Wiggle for half a second
                    const minion = new Enemy(ENEMY_TYPES[this.type.minionType], this.path, this.type.minionType);
                    minion.x = this.x + (Math.random() - 0.5) * 10; // Spawn near summoner
                    minion.y = this.y + (Math.random() - 0.5) * 10;
                    minion.pathIndex = this.pathIndex;
                    newlySpawnedEnemies.push(minion);
                }
            }
        }

        // Healers, well, they heal other enemies.
        if (this.type.isHealer) {
            this.healTimer -= deltaTime;
            if (this.isHealingPulse) {
                // In the middle of a pulse animation
                if (this.healTimer <= 0) {
                    this.isHealingPulse = false;
                    this.healTimer = this.type.healInterval;
                }
            } else if (this.healTimer <= 0) {
                // Time to trigger a new heal pulse
                this.isHealingPulse = true;
                this.healTimer = 0.5;
                const healIcons = ['favorite', 'heart_plus', 'heart_check'];
                effects.push(new Effect(this.x, this.y, healIcons, this.type.healRange, '#4fc3f7', 0.5));
                for (const otherEnemy of allEnemies) {
                    if (otherEnemy.id !== this.id && !otherEnemy.isDying && otherEnemy.health < otherEnemy.maxHealth) {
                        if (Math.hypot(this.x - otherEnemy.x, this.y - otherEnemy.y) <= this.type.healRange) {
                            otherEnemy.health = Math.min(otherEnemy.maxHealth, otherEnemy.health + otherEnemy.maxHealth * this.type.healPercent);
                            // Add a small plus icon over the healed enemy
                            effects.push(new Effect(
                                otherEnemy.x + (Math.random() - 0.5) * 10,
                                otherEnemy.y - otherEnemy.size,
                                'add', 20, '#4ade80', 0.75
                            ));
                        }
                    }
                }
            }
        }

        // The BOSS lays eggs that hatch into more enemies.
        if (this.type.laysEggs) {
            if (this.isLayingEgg) {
                // We are currently in the egg-laying state
                this.stopTimer -= deltaTime;
                if (this.wiggleTimer > 0) {
                    this.wiggleTimer -= deltaTime;
                    if (this.wiggleTimer % 0.33 < deltaTime) { // roughly every 20 frames
                        playWiggleSound();
                    }
                    if (this.wiggleTimer <= 0) { // Lay egg when wiggle finishes
                        const egg = new Enemy(ENEMY_TYPES.EGG, this.path, 'EGG');
                        egg.x = this.x;
                        egg.y = this.y;
                        egg.pathIndex = this.pathIndex;
                        newlySpawnedEnemies.push(egg);
                    }
                }
                if (this.stopTimer <= 0) {
                    this.isLayingEgg = false; // Stop the laying state
                    this.timeUntilLay = this.type.layEggInterval; // Reset for next time
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

        // Handle enemies that ignore the path
        if (this.type.ignoresPath) {
            const exitNode = this.path[this.path.length - 1];
            const dx = exitNode.x - this.x;
            const dy = exitNode.y - this.y;
            const distance = Math.hypot(dx, dy);
            const moveDistance = this.speed * this.slowMultiplier * 60 * deltaTime;

            if (distance < moveDistance) {
                onFinish(this);
                return false;
            }
            this.x += (dx / distance) * moveDistance;
            this.y += (dy / distance) * moveDistance;
            return true; // Keep this enemy, and skip the rest of the path-following logic.
        }
        // Time to move!
        let atEnd = this.pathIndex >= this.path.length - 1;
        let atStart = this.pathIndex <= 0;

        // The boss just moves back and forth.
        if (this.typeName === 'BOSS') {
            if (atEnd && this.direction === 1) this.direction = -1;
            if (atStart && this.direction === -1) this.direction = 1;
        } else {
            if (atEnd) {
                onFinish(this);
                return false; // Remove this enemy
            }
        }

        // Don't move if we're busy laying an egg, phasing, or ignoring the path.
        if (!this.isLayingEgg && !this.isPhasing) {
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

        // Calculate how far along the total path this enemy is.
        if (this.path && this.path.length > 1) {
            if (this.direction === 1 && this.pathIndex >= this.path.length - 1) {
                this.progress = 1;
            } else if (this.direction === -1 && this.pathIndex < 0) {
                this.progress = 0;
            } else {
                const currentPathIndex = Math.max(0, this.pathIndex);
                const currentNode = this.path[currentPathIndex];
                const nextNode = this.path[currentPathIndex + this.direction];

                if (nextNode) {
                    const segmentLength = Math.hypot(nextNode.x - currentNode.x, nextNode.y - currentNode.y);
                    const distToNextNode = Math.hypot(this.x - nextNode.x, this.y - nextNode.y);

                    const segmentProgress = segmentLength > 0 ? (1 - (distToNextNode / segmentLength)) : 0;

                    if (this.direction === 1) {
                        this.progress = (currentPathIndex + segmentProgress) / (this.path.length - 1);
                    } else { // direction is -1
                        this.progress = (currentPathIndex + (1 - segmentProgress)) / (this.path.length - 1);
                    }
                }
            }
        } else {
            this.progress = 0;
        }


        return true; // Keep this enemy
    }
    takeDamage(damage, projectile = null, onDeath, newlySpawnedEnemies = []) {
        // Calculate damage after armor reduction.
        const armor = this.type.armor || 0;
        const finalDamage = Math.max(0, damage * this.damageTakenMultiplier - armor);

        // If there's no damage to deal AND the projectile doesn't have special on-hit effects (like burn), and the enemy is already alive, then we can exit.
        const hasOnHitEffect = projectile?.owner.type === 'FIREPLACE'; // Expand this if other towers get non-damage on-hit effects
        if (this.health > 0 && finalDamage <= 0 && !projectile?.isTrueDamage && !hasOnHitEffect) {
            return false;
        }

        this.health -= (projectile?.isTrueDamage ? damage : finalDamage);
        this.hitTimer = 0.1; // Flash for 0.1 seconds
        this.jostleTimer = 0.1;

        // Flip the taunt enemy when it gets hit
        if (this.type.isTaunting) {
            this.facing *= -1;
        }


        // Flip the normal enemy when it gets hit
        if (this.typeName === 'NORMAL') {
            this.facing *= -1;
        }

        if (this.health <= 0 && !this.isDying) {
            this.isDying = true;
            this.deathAnimationTimer = 0.5; // 0.5s death animation
            if (this.type.isFlying) {
                // Make it spin and fall, then explode
                this.rotation = 0; // Reset rotation
                this.update = (onFinish, onDeath, allEnemies, playWiggleSound, playCrackSound, deltaTime, playHitSound, effects, newlySpawnedEnemies, playExplosionSound) => this.dyingFlyingUpdate(deltaTime, onDeath, playExplosionSound);
            }

            if (this.typeName === 'BITCOIN') {
                // Make it shrink and then have a little implosion effect
                this.update = (onFinish, onDeath, allEnemies, playWiggleSound, playCrackSound, deltaTime, playHitSound, effects) => this.dyingBitcoinUpdate(deltaTime, onDeath, effects);
            }

            if (this.typeName === 'PHANTOM') {
                // Make it explode into chaff
                this.update = (onFinish, onDeath, allEnemies, playWiggleSound, playCrackSound, deltaTime, playHitSound, effects) => this.dyingPhantomUpdate(deltaTime, onDeath, effects);
            }

            if (this.type.splitsOnDeath) {
                for (let i = 0; i < this.type.splitCount; i++) {
                    const child = new Enemy(ENEMY_TYPES[this.type.splitInto], this.path, this.type.splitInto);
                    child.x = this.x + (Math.random() - 0.5) * 15;
                    child.y = this.y + (Math.random() - 0.5) * 15;
                    child.pathIndex = this.pathIndex;
                    newlySpawnedEnemies.push(child);
                }
            }

            if (onDeath) {
                onDeath(this);
            }
            return true; // Enemy was killed
        }

        return false; // Enemy was not killed
    }
    dyingPhantomUpdate(deltaTime, onDeath, effects) {
        this.deathAnimationTimer -= deltaTime;
        const progress = 1 - (this.deathAnimationTimer / 0.5);
        this.size = this.type.size * (1 - progress); // Shrink the enemy

        if (this.deathAnimationTimer <= 0) {
            // Create a chaff grenade-like explosion
            for (let i = 0; i < 15; i++) {
                effects.push(new Effect(this.x, this.y, 'lens', 20 + Math.random() * 20, this.color, 1.5 + Math.random() * 0.5));
            }
            onDeath(this, { isAnimatedDeath: false }); // No big explosion, just the chaff
            return false;
        }
        return true;
    }
    dyingBitcoinUpdate(deltaTime, onDeath, effects) {
        this.deathAnimationTimer -= deltaTime;
        if (this.deathAnimationTimer <= 0) {
            onDeath(this, { isAnimatedDeath: false });
            return false;
        }
        return true;
    }
    dyingFlyingUpdate(deltaTime, onDeath, playExplosionSound) { // playExplosionSound is now correctly passed
        this.rotation += 30 * deltaTime;
        this.y += 50 * deltaTime;
        this.deathAnimationTimer -= deltaTime;
        if (this.deathAnimationTimer <= 0) {
            playExplosionSound();
            onDeath(this, { isAnimatedDeath: true });
            return false;
        }
        return true;
    }
}

class TowerStats {
    // This class is a helper to manage all the stat calculations for a tower.
    constructor(tower) {
        this.tower = tower;
    }

    get maxLevel() {
        return TOWER_TYPES[this.tower.type].maxLevel || 5;
    }

    get levelForCalc() {
        return this.tower.level === 'MAX LEVEL' ? this.maxLevel : this.tower.level;
    }

    get damageLevelForCalc() {
        return this.tower.damageLevel === 'MAX LEVEL' ? this.maxLevel : this.tower.damageLevel;
    }

    // This gets called to update all of a tower's stats based on its level, merges, etc.
    update() {
        const tower = this.tower;
        const baseStats = TOWER_TYPES[tower.type];

        // Aura towers are simple, they don't have levels in the same way.
        if (tower.type === 'MIND' || tower.type === 'CAT') {
            tower.level = 'MAX LEVEL';
            tower.cost = baseStats.cost;
            tower.range = baseStats.range;
            tower.attackSpeedBoost = baseStats.attackSpeedBoost;
            tower.damageBoost = baseStats.damageBoost;
            tower.enemySlow = baseStats.enemySlow;
            if (tower.type === 'CAT') {
                tower.goldBonus = baseStats.goldBonus;
            }
            return;
        }

        // Most towers get more expensive as they level up.
        tower.cost = baseStats.cost * this.levelForCalc;
        tower.range = baseStats.range;
        if (tower.type === 'STUN_BOT') {
            // For STUN_BOT, damage is handled entirely by merge logic, so we don't reset it here.
        } else if (tower.type === 'FIREPLACE') {
            // For FIREPLACE, damage and burnDps are managed by merge-logic, so we don't reset them here.
            if (tower.type === 'FIREPLACE') tower.burnDuration = baseStats.burnDuration;
        } else {
            // For all other towers, calculate damage based on level and multipliers.
            tower.damage = baseStats.damage * (1 + (this.damageLevelForCalc - 1) * 0.5) * (tower.damageMultiplierFromMerge || 1);
        }

        if (tower.type === 'ANTI_AIR' && tower.natCastleBonus) {
            tower.splashRadius = 10 * tower.natCastleBonus;
        } else {
            tower.splashRadius = baseStats.splashRadius || 0;
        }

        // Fire rate gets better with each level.
        tower.permFireRate = baseStats.fireRate * Math.pow(0.9, this.levelForCalc - 1);
        tower.fireRate = tower.permFireRate;
        tower.color = tower.color || baseStats.color;
        tower.projectileSpeed = baseStats.projectileSpeed;
        if (!tower.projectileSize) {
            tower.projectileSize = baseStats.projectileSize;
        }
        if (tower.type === 'FIREPLACE' && tower.damageDebuff > 0) {
            // If a FIREPLACE has the damage debuff upgrade, its projectiles turn purple.
            tower.projectileColor = '#c084fc'; // Purple for damage amp
        } else {
            tower.projectileColor = baseStats.projectileColor;
        }
        if (tower.type === 'SUPPORT') {
            tower.attackSpeedBoost = baseStats.attackSpeedBoost * Math.pow(0.95, this.levelForCalc - 1);
        }
    }
}

// This class handles the "brains" of the tower: finding targets and shooting.
class TowerController {
    constructor(tower) {
        this.tower = tower;
    }

    findTarget(enemies, frameTargetedEnemies) {
        // Find all enemies that are in range and not already dead.
        const tower = this.tower;
        tower.target = null;
        let potentialTargets = enemies.filter(enemy => this.isInRange(enemy) && !enemy.isDying && enemy.isVisible && !enemy.isPhasing);

        // New Taunt Logic: Prioritize taunting enemies if they are in range.
        const tauntingEnemies = potentialTargets.filter(enemy => enemy.type.isTaunting);
        if (tauntingEnemies.length > 0) {
            // If there are taunting enemies, all other enemies are ignored for targeting.
            potentialTargets = tauntingEnemies;
        }

        if (tower.isUnderDiversifyAura) {
            potentialTargets = potentialTargets.filter(enemy => !frameTargetedEnemies.has(enemy.id));
        }

        // Filter targets based on tower type (e.g., anti-air).
        if (tower.type === 'ANTI_AIR') {
            potentialTargets = potentialTargets.filter(enemy => enemy.type.isFlying);
        } else {
            const groundOnlyTowers = ['CASTLE', 'FORT', 'ORBIT', 'FIREPLACE'];
            if (groundOnlyTowers.includes(tower.type) || tower.type === 'STUN_BOT') {
                potentialTargets = potentialTargets.filter(enemy => !enemy.type.isFlying);
            }
        }

        if (potentialTargets.length === 0) {
            if (tower.isUnderDiversifyAura) {
                potentialTargets = enemies.filter(enemy => this.isInRange(enemy) && !enemy.isDying && enemy.isVisible && !enemy.isPhasing);
            } else {
                return;
            }
        };

        // Pick the best target based on the tower's targeting mode.
        switch (tower.targetingMode) {
            case 'strongest':
                tower.target = potentialTargets.reduce((a, b) => (a.health > b.health ? a : b), potentialTargets[0]);
                break;
            case 'weakest':
                tower.target = potentialTargets.reduce((a, b) => (a.health < b.health ? a : b), potentialTargets[0]);
                break;
            case 'furthest':
                tower.target = potentialTargets.reduce((a, b) => (a.progress > b.progress ? a : b), potentialTargets[0]);
                break;
            default: // closest
                tower.target = potentialTargets.reduce((a, b) => (Math.hypot(tower.x - a.x, tower.y - a.y) < Math.hypot(tower.x - b.x, tower.y - b.y) ? a : b), potentialTargets[0]);
                break;
        }

        // If this tower is under a "diversify" aura, mark its target so other towers don't pick it.
        if (tower.target && tower.isUnderDiversifyAura) {
            frameTargetedEnemies.add(tower.target.id);
        }
    }

    isInRange(enemy) {
        return Math.hypot(this.tower.x - enemy.x, this.tower.y - enemy.y) <= this.tower.range;
    }

    shoot(projectiles) {
        // Time to fire!
        const tower = this.tower;
        if (!tower.target && !((tower.type === 'FORT' || tower.type === 'NINE_PIN') && tower.attackGroundTarget)) return;

        // Some towers can target a specific spot on the ground.
        if ((tower.type === 'FORT' || tower.type === 'NINE_PIN') && tower.attackGroundTarget) {
            const projectileCount = tower.projectileCount || 1;
            for (let i = 0; i < projectileCount; i++) {
                projectiles.push(new Projectile(tower, tower.attackGroundTarget));
            }
        } else if (tower.target) {
            const count = tower.projectileCount || 1;
            // If it's a single-shot tower, just fire one.
            if (count === 1) {
                projectiles.push(new Projectile(tower, tower.target));
            } else {
                // If it's a multi-shot tower, create a spread of projectiles.
                const baseAngle = Math.atan2(tower.target.y - tower.y, tower.target.x - tower.x);
                const spreadAngle = Math.PI / 18; // 10 degrees total spread
                const angleStep = spreadAngle / (count - 1);
                const startAngle = baseAngle - spreadAngle / 2;

                for (let i = 0; i < count; i++) {
                    const angle = startAngle + i * angleStep;
                    projectiles.push(new Projectile(tower, null, angle));
                }
            }
        }
    }

    // The special attack for the STUN_BOT.
    chainLightning(effects, enemies, onEnemyDeath, playBzztSound) {
        const tower = this.tower;
        if (!tower.target) return;

        let currentTarget = tower.target;
        const hitEnemies = new Set([currentTarget]);
        const chainPositions = [{ x: tower.x, y: tower.y }];

        // Jump from one enemy to the next.
        for (let i = 0; i < tower.chainTargets; i++) {
            if (!currentTarget) break;

            const finalDamage = tower.damage * tower.damageMultiplier;
            if (playBzztSound) playBzztSound();
            if (currentTarget.takeDamage(finalDamage)) {
                tower.killCount++;
                onEnemyDeath(currentTarget);
            }
            if (tower.stunDuration > 0) {
                currentTarget.applyStun(tower.stunDuration);
            }
            chainPositions.push({ x: currentTarget.x, y: currentTarget.y });

            let nextTarget = findNextChainTarget(currentTarget, enemies, hitEnemies, tower.chainRange);
            currentTarget = nextTarget;
        }

        // Draw the lightning bolt effect.
        effects.push(new Effect(0, 0, 'chain', 0, tower.projectileColor, 0.3, { chain: chainPositions }));
    }

    // The main update loop for the tower's controller.
    update(enemies, projectiles, onEnemyDeath, deltaTime, frameTargetedEnemies, path, effects, playBzztSound) {
        const tower = this.tower;

        if (tower.isMobile && path && path.length > tower.pathIndex + 1) {
            // This logic is for mobile towers, but it's not currently used.
            if (tower.pathIndex >= path.length - 1) {
                // Stop at end
            } else {
                const targetNode = path[tower.pathIndex + 1];
                const dx = targetNode.x - tower.x;
                const dy = targetNode.y - tower.y;
                const distance = Math.hypot(dx, dy);
                const moveDistance = tower.speed * 60 * deltaTime;

                tower.rotation = Math.atan2(dy, dx);

                if (distance < moveDistance) {
                    tower.x = targetNode.x;
                    tower.y = targetNode.y;
                    tower.pathIndex++;
                } else {
                    tower.x += (dx / distance) * moveDistance;
                    tower.y += (dy / distance) * moveDistance;
                }
            }
        }


        // Aura towers don't shoot, so we're done here.
        if (tower.type === 'SUPPORT' || tower.type === 'MIND' || tower.type === 'CAT') {
            return;
        }
        if (tower.type === 'ORBIT') {
            // For ORBIT towers, we just update their orbiters and check for collisions.
            tower.orbiters.forEach(orbiter => {
                orbiter.update(null, null, null, deltaTime);
                enemies.forEach(enemy => {
                    if (enemy.type.isFlying) return;
                    const dist = Math.hypot(orbiter.x - enemy.x, orbiter.y - enemy.y);
                    if (dist < enemy.size + tower.projectileSize) {
                        if (!orbiter.hitEnemies.has(enemy)) {
                            const finalDamage = tower.damage * tower.damageMultiplier;
                            if (enemy.takeDamage(finalDamage)) {
                                tower.killCount++;
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

        // Tick down the cooldown.
        if (tower.cooldown > 0) tower.cooldown -= deltaTime;

        // If we're targeting the ground, and we're ready to fire, shoot!
        if ((tower.type === 'FORT' || tower.type === 'NINE_PIN') && tower.targetingMode === 'ground' && tower.attackGroundTarget) {
            tower.target = null; // Ensure no enemy is targeted
            if (tower.cooldown <= 0) {
                this.shoot(projectiles);
                tower.cooldown = tower.fireRate / 60;
            }
        } else {
            // Otherwise, find an enemy to target.
            this.findTarget(enemies, frameTargetedEnemies);
            if (tower.type === 'STUN_BOT' && tower.target && tower.cooldown <= 0) {
                this.chainLightning(effects, enemies, onEnemyDeath, playBzztSound);
                tower.cooldown = tower.fireRate / 60;
                return;
            }
            // If we have a target and we're ready to fire, shoot!
            if (tower.target && tower.cooldown <= 0) {
                this.shoot(projectiles);
                tower.cooldown = tower.fireRate / 60; // Reset cooldown.
            }
        }
    }
}

// This class handles drawing the tower itself.
class TowerRenderer {
    constructor(tower) {
        this.tower = tower;
    }

    draw(ctx) {
        const tower = this.tower;
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        // The NINE_PIN is a big ol' arrow, so it gets special drawing logic.
        if (tower.type === 'NINE_PIN') {
            let targetPoint = tower.target;
            if (tower.targetingMode === 'ground' && tower.attackGroundTarget) {
                targetPoint = tower.attackGroundTarget;
            }
            const angle = targetPoint ? Math.atan2(targetPoint.y - tower.y, targetPoint.x - tower.x) : 0;
            ctx.save();
            ctx.translate(tower.x, tower.y);
            ctx.rotate(angle);
            ctx.fillStyle = tower.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `900 90px 'Material Symbols Outlined'`;
            ctx.fillText('move_item', 0, 0);
            ctx.restore(); // Restore from the initial save() in this method
            return;
        }

        // Most towers just get bigger as they level up.
        const visualLevel = tower.stats.levelForCalc;
        let iconSize = 28 + (visualLevel * 2);
        ctx.fillStyle = tower.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let icon;
        let iconFamily = 'Material Icons';
        let fontWeight = '400';

        // Pick the right icon for the tower type.
        switch (tower.type) {
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
            case 'MIND':
                icon = 'cognition';
                iconFamily = "'Material Symbols Outlined'";
                if (tower.mode === 'boost') {
                    ctx.fillStyle = '#65a30d';
                } else if (tower.mode === 'slow') {
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
                if (tower.mode === 'boost') {
                    ctx.fillStyle = '#65a30d';
                } else if (tower.mode === 'slow') {
                    ctx.fillStyle = '#0891b2';
                } else { // Diversify
                    ctx.fillStyle = '#f5c60bff';
                }
                break;
            case 'ANTI_AIR':
                icon = 'open_jam';
                iconFamily = "'Material Symbols Outlined'";
                break;
            case 'STUN_BOT':
                icon = 'smart_toy';
                iconFamily = "'Material Icons'";
                break;
        }
        ctx.font = `${fontWeight} ${iconSize}px ${iconFamily}`;
        const angle = tower.target ? Math.atan2(tower.target.y - tower.y, tower.target.x - tower.x) : 0;
        ctx.save();
        ctx.translate(tower.x, tower.y);

        // Some towers quiver right before they shoot.
        if (tower.type === 'NAT' || tower.type === 'ANTI_AIR') {
            if (tower.target && tower.cooldown > 0 && tower.cooldown < 0.33) {
                const quiverAmount = tower.stats.levelForCalc > 5 ? 2.5 : 1.5;
                ctx.translate((Math.random() - 0.5) * quiverAmount, (Math.random() - 0.5) * quiverAmount);
            }
        }

        // Rotate the tower to face its target.
        if (tower.isMobile) {
            ctx.rotate(tower.rotation);
        } else if (tower.type === 'NAT') {
            ctx.rotate(angle);
        } else if (tower.type === 'PIN' || tower.type === 'PIN_HEART') {
            ctx.rotate(angle - Math.PI / 2);
        } else if (tower.type === 'ANTI_AIR') {
            ctx.rotate(angle + Math.PI / 2);
        }

        ctx.fillText(icon, 0, 0);
        ctx.restore();

        // Orbiters draw themselves so they don't get rotated with the main tower.
        if (tower.type === 'ORBIT') {
            tower.orbiters.forEach(orbiter => orbiter.draw(ctx));
        }

        ctx.restore();
    }

    // Draw the circle that shows the tower's range.
    drawRange(ctx) {
        const tower = this.tower;
        if (tower.type === 'ORBIT' || tower.type === 'SUPPORT' || tower.type === 'MIND' || tower.type === 'CAT') return;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Draw the square aura effect for buff towers.
    drawBuffEffect(ctx) {
        const tower = this.tower;
        const auraColor = (tower.type === 'MIND' && tower.mode === 'slow') ? '#0891b2' : ((tower.type === 'CAT' && tower.mode === 'slow') ? '#0891b2' : tower.color);
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
        const startX = tower.x - TILE_SIZE * 1.5;
        const startY = tower.y - TILE_SIZE * 1.5;
        const size = TILE_SIZE * 3;
        ctx.beginPath();
        ctx.rect(startX, startY, size, size);
        ctx.stroke();
        ctx.globalAlpha = 0.1;
        ctx.fillRect(startX, startY, size, size);
        ctx.restore();
    }

    // Draw the square that shows a tower's stealth detection range.
    drawStealthRange(ctx) {
        const tower = this.tower;
        const detectionRange = TOWER_TYPES[tower.type].stealthDetectionRange;
        if (!detectionRange) return;

        const auraColor = (tower.type === 'MIND' && tower.mode === 'slow') ? '#0891b2' : ((tower.type === 'CAT' && tower.mode === 'slow') ? '#0891b2' : tower.color);
        const radius = detectionRange * TILE_SIZE;

        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = auraColor;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// A little helper to find the next target for a chain lightning attack.
function findNextChainTarget(currentEnemy, allEnemies, hitEnemies, chainRange) {
    let closestEnemy = null;
    let minDistance = Infinity;

    for (const enemy of allEnemies) {
        if (!hitEnemies.has(enemy) && !enemy.isDying && enemy.isVisible && !enemy.type.isFlying) {
            const dist = Math.hypot(currentEnemy.x - enemy.x, currentEnemy.y - enemy.y);
            if (dist < minDistance && dist <= chainRange) {
                minDistance = dist;
                closestEnemy = enemy;
            }
        }
    }
    if (closestEnemy) {
        hitEnemies.add(closestEnemy);
    }
    return closestEnemy;
}

// The main blueprint for all towers. It brings together the stats, controller, and renderer.
export class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.id = crypto.randomUUID();
        this.level = 1;
        this.damageLevel = 1;
        this.mode = 'boost';
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
        this.natCastleBonus = 0;
        this.burnDps = 0;
        this.burnDuration = 0;
        this.attackSpeedBoost = 1;
        this.damageDebuff = 0;
        this.damageBoost = 1;
        this.enemySlow = 1;
        this.chainTargets = 0;
        this.chainRange = 0;
        this.stunDuration = 0;
        this.rotation = 0;

        // Set some sensible default targeting modes.
        if (type === 'CASTLE' || type === 'FORT') {
            this.targetingMode = 'strongest';
        } else if (type === 'PIN' || type === 'PIN_HEART') {
            this.targetingMode = 'weakest';
        } else {
            // A sensible default for most other offensive towers
            this.targetingMode = 'strongest';
        }


        const baseStats = TOWER_TYPES[this.type];
        if (baseStats.isMobile) {
            this.isMobile = true;
            this.speed = baseStats.speed;
            this.pathIndex = 0;
            this.progress = 0;
        }


        // These properties will be filled in by the TowerStats class.
        this.cost = 0;
        this.range = 0;
        this.damage = 0;
        this.splashRadius = 0;
        this.permFireRate = 0;
        this.fireRate = 0;
        this.color = '';
        this.projectileSpeed = 0;
        this.projectileSize = 0;
        this.projectileColor = '';

        if (this.type === 'CAT') {
            this.goldGenerated = 0;
        }

        this.stats = new TowerStats(this);
        this.controller = new TowerController(this);
        this.renderer = new TowerRenderer(this);

        this.updateStats();
        if (this.type === 'NINE_PIN') {
            this.level = 'MAX LEVEL';
            this.damageLevel = 'MAX LEVEL';
            this.targetingMode = 'strongest';
        }
    }

    // These methods just pass the work off to their respective helper classes.
    updateStats() {
        this.stats.update();
        // Post-stats initialization
        this.cooldown = 0;
        this.target = null;
        if (this.type === 'ORBIT' && !this.orbiters) {
            this.orbitMode = this.orbitMode || 'far';
            this.orbitDirection = this.orbitDirection || 1; // 1 for CW, -1 for CCW
            this.recreateOrbiters();
        }
    }
    draw(ctx) { this.renderer.draw(ctx); }
    drawRange(ctx) { this.renderer.drawRange(ctx); }
    drawBuffEffect(ctx) { this.renderer.drawBuffEffect(ctx); }
    drawStealthRange(ctx) { this.renderer.drawStealthRange(ctx); }
    update(enemies, projectiles, onEnemyDeath, deltaTime, frameTargetedEnemies, path, effects, playBzztSound) {
        this.controller.update(enemies, projectiles, onEnemyDeath, deltaTime, frameTargetedEnemies, path, effects, playBzztSound);
    }
    recreateOrbiters() {
        if (this.type !== 'ORBIT') return;
        const orbiterCount = 2 + (this.stats.levelForCalc - 1);
        const angleStep = (2 * Math.PI) / Math.max(1, orbiterCount);
        this.orbiters = [];
        for (let i = 0; i < orbiterCount; i++) {
            this.orbiters.push(new Projectile(this, null, i * angleStep));
        }
    }


    // This is for saving and loading the game.
    toJSON() {
        const data = {
            x: this.x,
            type: this.type,
            id: this.id,
            level: this.level,
            damageLevel: this.damageLevel,
            mode: this.mode,
            targetingMode: this.targetingMode,
            // ... other properties
            bounceDamageFalloff: this.bounceDamageFalloff,
            hasFragmentingShot: this.hasFragmentingShot,
            goldBonus: this.goldBonus,
            splashRadius: this.splashRadius,
            color: this.color,
            projectileSize: this.projectileSize,
            killCount: this.killCount,
            goldGenerated: this.goldGenerated,
            y: this.y,
            attackGroundTarget: this.attackGroundTarget,
            damageMultiplier: this.damageMultiplier,
            projectileCount: this.projectileCount,
            damageMultiplierFromMerge: this.damageMultiplierFromMerge,
            fragmentBounces: this.fragmentBounces,
            natCastleBonus: this.natCastleBonus,
        };

        if (this.isMobile) {
            data.isMobile = this.isMobile;
            data.speed = this.speed;
            data.pathIndex = this.pathIndex;
            data.progress = this.progress;
            data.rotation = this.rotation;
        }

        if (this.type === 'ORBIT') {
            data.orbitMode = this.orbitMode;
            data.orbitDirection = this.orbitDirection;
            data.orbitersAngles = this.orbiters.map(orbiter => orbiter.angle);
        }
        if (this.type === 'FIREPLACE') {
            data.burnDps = this.burnDps;
            data.burnDuration = this.burnDuration;
            data.damage = this.damage;
            data.damageDebuff = this.damageDebuff;
        }
        if (this.type === 'MIND' || this.type === 'CAT') {
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
        if (this.type === 'STUN_BOT') {
            data.chainTargets = this.chainTargets;
            data.chainRange = this.chainRange;
            data.stunDuration = this.stunDuration;
            data.damage = this.damage; // STUN_BOT damage is managed by merges
        }
        return data;
    }

    static fromJSON(data) {
        const tower = new Tower(data.x, data.y, data.type);
        // Here's a list of all the properties we need to restore from the saved data.
        const fields = [
            "id", "level", "damageLevel", "mode", "targetingMode", "attackGroundTarget",
            "damageMultiplier", "projectileCount", "damageMultiplierFromMerge", "fragmentBounces",
            "bounceDamageFalloff", "hasFragmentingShot", "goldBonus", "splashRadius", "color", "damage",
            "projectileSize", "burnDps", "burnDuration", "damageDebuff", "attackSpeedBoost", "damageBoost",
            "enemySlow", "orbitMode", "killCount", "goldGenerated", "natCastleBonus", "chainTargets", "stunDuration", "chainRange",
            "isMobile", "speed", "pathIndex", "progress", "rotation", "orbitDirection"
        ];

        if (data.type === 'ORBIT') fields.push('orbitersAngles');
        // Go through the list and copy all the saved data to the new tower.
        for (const field of fields) {
            if (field in data) {
                tower[field] = data[field];
            }
        }

        // Now that all the properties are back, we need to recalculate all the derived stats
        // and do any special setup, like recreating orbiters.
        tower.updateStats();

        if (tower.type === 'ORBIT' && data.orbitersAngles) {
            tower.recreateOrbiters(); // Re-create with the correct number first
            tower.orbiters.forEach((orbiter, i) => orbiter.angle = data.orbitersAngles[i]);
        }
        return tower;
    }
}

// The blueprint for all the little visual effects, like explosions and money signs.
export class Effect {
    constructor(x, y, icon, size, color, duration, extraData = {}) {
        this.x = x; this.y = y; this.size = size; this.color = color; this.life = duration; this.maxLife = duration; this.extraData = extraData;

        // If we're given a list of icons, pick one at random.
        if (Array.isArray(icon)) {
            this.icon = icon[Math.floor(Math.random() * icon.length)];
        } else {
            this.icon = icon;
        }
    }
    update(deltaTime) {
        this.life -= deltaTime;
        return this.life > 0;
    }
    draw(ctx, deltaTime = 0) {
        let progress = 1 - (this.life / this.maxLife);
        let currentSize = this.size * progress;
        let opacity = 1 - progress;

        // Special drawing logic for the chain lightning effect.
        if (this.icon === 'chain' && this.extraData.chain) {
            ctx.save();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.globalAlpha = opacity;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(this.extraData.chain[0].x, this.extraData.chain[0].y);
            for (let i = 1; i < this.extraData.chain.length; i++) {
                ctx.lineTo(this.extraData.chain[i].x, this.extraData.chain[i].y);
            }
            ctx.stroke();
            ctx.restore();
            return;
        }

        let iconFamily = '';
        // Updated to handle the new health icons
        if (['explosion', 'gps_fixed', 'attach_money', 'lens', 'add', 'healing', 'health_and_safety', 'volunteer_activism', 'ecg_heart', 'heart_plus', 'heart_check'].includes(this.icon)) {
            iconFamily = 'Material Symbols Outlined';
        } else {
            if (this.icon === 'sparkles') {
                iconFamily = 'Material Symbols Outlined';
            }
            iconFamily = 'Material Icons';
        }

        if (this.icon === 'attach_money') {
            currentSize = this.size + (5 * progress);
            opacity = 1 - progress * 0.5;
        } else if (this.icon === 'person') { // Soul animation
            this.y -= 60 * deltaTime; // Float up
            this.x += Math.sin(this.life * 20) * 1.5; // Wiggle side to side
            currentSize = this.size * (1 - progress); // Shrink
            opacity = 1 - progress;
            iconFamily = 'Material Icons';
        }

        // Some effects are a ring of icons, like the healer's pulse.
        if (Array.isArray(this.icon) || ['favorite', 'health_and_safety', 'volunteer_activism', 'healing', 'ecg_heart', 'heart_plus', 'heart_check'].includes(this.icon)) {
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = this.color;
            ctx.font = `400 ${currentSize * 0.5}px 'Material Symbols Outlined'`;
            const numSparkles = 8;
            for (let i = 0; i < numSparkles; i++) {
                const angle = (i / numSparkles) * Math.PI * 2 + (progress * Math.PI); // Rotate the aura
                ctx.fillText(this.icon, this.x + Math.cos(angle) * (currentSize * 0.75), this.y + Math.sin(angle) * (currentSize * 0.75));
            }
            ctx.restore();
            return;
        }

        // Draw the single icon, fading it out and growing it as it ages.
        ctx.font = `${currentSize}px '${iconFamily}'`;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = opacity;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, this.y);
        ctx.globalAlpha = 1.0;
    }
}

// For the big text announcements that pop up in the middle of the screen.
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

    toJSON() {
        return {
            text: this.text,
            x: this.x,
            y: this.y,
            duration: this.maxLife,
            color: this.color,
            maxWidth: this.maxWidth,
            // We don't need to save life, as it's a transient state
        };
    }

    static fromJSON(data) {
        return new TextAnnouncement(
            data.text, data.x, data.y,
            data.duration, data.color, data.maxWidth
        );
    }

    update(deltaTime) {
        this.life -= deltaTime;
        return this.life > 0;
    }
    draw(ctx) {
        const fadeStartTime = this.maxLife * 0.25; // Start fading out in the last 25% of its life.
        let opacity = 1.0;
        if (this.life < fadeStartTime) {
            opacity = this.life / fadeStartTime;
        }
        ctx.save();
        ctx.globalAlpha = opacity;
        let fontSize = 24;
        ctx.font = `bold ${fontSize}px 'Roboto', sans-serif`;
        const lines = this.text.split('\n');
        let maxLineWidth = 0;
        for (const line of lines) { // Calculate the widest line
            const currentLineWidth = ctx.measureText(line).width;
            if (currentLineWidth > maxLineWidth) {
                maxLineWidth = currentLineWidth;
            }
        }
        const safeMaxWidth = this.maxWidth * 0.9;
        if (maxLineWidth > safeMaxWidth) {
            const ratio = safeMaxWidth / maxLineWidth; // Scale down if too wide
            fontSize *= ratio;
            ctx.font = `bold ${fontSize}px 'Roboto', sans-serif`;
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lineHeight = fontSize * 1.25;
        const startY = this.y - ((lines.length - 1) * lineHeight) / 2;

        // Draw a black outline to make the text pop.
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4; // Adjust outline thickness
        ctx.lineJoin = 'round'; // Makes corners look smoother
        lines.forEach((line, index) => {
            const yPos = startY + (index * lineHeight);
            ctx.strokeText(line, this.x, yPos);
        });

        // Draw the main colored text.
        ctx.fillStyle = this.color;
        lines.forEach((line, index) => {
            const yPos = startY + (index * lineHeight);
            ctx.fillText(line, this.x, yPos);
        });

        ctx.restore();
    }
}
