// This file defines the "classes" or blueprints for all the things that move and interact in the game.

// Imports: We need some of the game's basic settings, like the size of the grid tiles.
import { TILE_SIZE, TOWER_TYPES } from './constants.js';

// This is the blueprint for an enemy.
class Enemy {
    constructor(type, path) {
        this.path = path; // The path the enemy will follow.
        this.x = this.path[0].x - TILE_SIZE; // Starting position off-screen.
        this.y = this.path[0].y;
        this.pathIndex = 0; // Which part of the path it's currently heading towards.
        this.type = type; // The whole configuration object for this enemy (speed, health, icon, etc.).
        this.speed = type.speed;
        this.health = type.health;
        this.maxHealth = type.health;
        this.color = type.color;
        this.size = type.size;
        this.gold = type.gold;
        this.hitTimer = 0; // Used for the white flash effect when hit.
        this.burns = []; // For storing damage-over-time effects.
        this.slowMultiplier = 1; // New property to store the slowing effect.
    }
    
    // Applies a burn effect to the enemy.
    applyBurn(dps, durationInSeconds) {
        // Checks if a stronger burn is already active. If so, it just refreshes the timer.
        const existingBurn = this.burns.find(b => b.dps >= dps);
        if (existingBurn) {
            existingBurn.ticksLeft = Math.max(existingBurn.ticksLeft, durationInSeconds * 60);
        } else {
            // Otherwise, it adds the new burn effect.
            this.burns = [{ dps, ticksLeft: durationInSeconds * 60 }];
        }
    }

    // This function draws the enemy on the screen.
    draw(ctx) {
        // It uses the icon defined in the constants file.
        ctx.font = `${this.size * 2}px ${this.type.iconFamily || 'Material Icons'}`;
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.icon, this.x, this.y);

        // This part draws the health bar above the enemy.
        const healthBarWidth = this.size * 2;
        const healthBarHeight = 5;
        const healthPercentage = this.health / this.maxHealth;
        ctx.fillStyle = '#333'; // The background of the health bar.
        ctx.fillRect(this.x - this.size, this.y - this.size - 10, healthBarWidth, healthBarHeight);
        ctx.fillStyle = 'green'; // The actual health.
        ctx.fillRect(this.x - this.size, this.y - this.size - 10, healthBarWidth * healthPercentage, healthBarHeight);

        // Creates a white flash when the enemy is hit.
        if (this.hitTimer > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillText(this.type.icon, this.x, this.y);
            this.hitTimer--;
        }

        // Creates a fiery visual effect if the enemy is burning.
        if (this.burns.length > 0) {
            ctx.globalAlpha = 0.5;
            ctx.font = `${this.size * 2.5}px 'Material Symbols Outlined'`;
            ctx.fillStyle = `rgba(255, 100, 0, ${0.5 + Math.sin(Date.now() / 100) * 0.2})`;
            ctx.fillText('local_fire_department', this.x, this.y);
            ctx.globalAlpha = 1.0;
        }
    }

    // This function updates the enemy's state every frame (like moving it).
    update(onFinish, onDeath) {
        // Applies damage over time from any active burn effects.
        if (this.burns.length > 0) {
            const burn = this.burns[0];
            this.health -= burn.dps / 60; // Damage is per second, so we divide by 60 frames.
            burn.ticksLeft--;
            if (burn.ticksLeft <= 0) {
                this.burns.shift(); // Remove the burn if its time is up.
            }
        }
        // If the enemy has no health, it should be removed from the game.
        if(this.health <= 0) {
            onDeath();
            return false;
        }

        // This section handles moving the enemy along the path.
        if (this.pathIndex >= this.path.length - 1) {
            onFinish(); // The enemy has reached the end of the path.
            return false; // Tells the main loop to remove this enemy.
        }
        const target = this.path[this.pathIndex + 1];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < this.speed * this.slowMultiplier) {
            this.pathIndex++; // Move to the next point in the path.
        } else {
            // Move towards the target.
            this.x += (dx / distance) * this.speed * this.slowMultiplier;
            this.y += (dy / distance) * this.speed * this.slowMultiplier;
        }
        return true; // Tells the main loop to keep this enemy in the game.
    }

    // This function is called when a projectile hits the enemy.
    takeDamage(amount) {
        this.health -= amount;
        this.hitTimer = 5; // Activates the 5-frame flash effect.
        return this.health <= 0; // Returns true if the enemy is defeated.
    }
}

// This is the blueprint for a tower.
class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.id = crypto.randomUUID(); // Assign a unique ID to each tower
        this.level = 1;
        this.damageLevel = 1; // Separate level for damage calculation
        this.mode = 'boost'; // 'boost' or 'slow'
        this.damageMultiplier = 1; // New property to handle non-stacking damage boosts.
        this.projectileCount = 1;
        this.damageMultiplierFromMerge = 1; // Handles damage buffs from merges.
        this.goldBonusMultiplier = 1; // For CAT tower aura

        // Initialize stats that are modified by merges directly.
        // This prevents updateStats() from resetting them.
        const baseStats = TOWER_TYPES[type];
        this.splashRadius = baseStats.splashRadius;
        if (type === 'FIREPLACE') {
            this.burnDps = baseStats.burnDps;
            this.burnDuration = baseStats.burnDuration;
        }

        this.updateStats(); // Set initial stats based on its type.
        this.cooldown = 0; // Timer for when it can shoot next.
        this.target = null; // The enemy it's currently aiming at.
        
        if (type === 'ORBIT') {
            this.orbitMode = 'far';
            // Create two persistent projectiles (orbiters)
            this.orbiters = [
                new Projectile(this, null, 0),
                new Projectile(this, null, Math.PI) // 180 degrees apart
            ];
        }
    }
    // Updates the tower's stats when it's created, leveled up, or merged.
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
        
        // Fireplace tower's direct damage does not increase with upgrades.
        if (this.type === 'FIREPLACE') {
            this.damage = baseStats.damage;
        } else {
            this.damage = baseStats.damage * (1 + (damageLevelForCalc - 1) * 0.5) * this.damageMultiplierFromMerge;
        }

        this.permFireRate = baseStats.fireRate * Math.pow(0.9, levelForCalc - 1);
        this.fireRate = this.permFireRate;
        this.color = this.color || baseStats.color; // Preserve blended color
        this.projectileSpeed = baseStats.projectileSpeed;
        // Only reset projectileSize if it hasn't been custom set by an upgrade
        if (!this.projectileSize) {
            this.projectileSize = baseStats.projectileSize;
        }
        this.projectileColor = baseStats.projectileColor;

        if (this.type === 'SUPPORT') {
            this.attackSpeedBoost = baseStats.attackSpeedBoost * Math.pow(0.95, levelForCalc - 1);
        }
    }
    // Draws the tower on the screen.
    draw(ctx) {
        // Make the tower grow visually with each level, including MAX LEVEL
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
                icon = '\uf6be'; // Unicode for 'cat'
                iconFamily = '"Font Awesome 6 Free"';
                fontWeight = '900'; // For solid icons
                iconSize *= TOWER_TYPES.CAT.iconSize; // Makes the cat tower slightly smaller
                if (this.mode === 'boost') {
                    ctx.fillStyle = '#65a30d'; // Green for boost
                } else {
                    ctx.fillStyle = '#0891b2'; // Blue for slow
                }
                break;
        }
        
        ctx.font = `${fontWeight} ${iconSize}px ${iconFamily}`;
        
        // This makes the tower rotate to face its target.
        const angle = this.target ? Math.atan2(this.target.y - this.y, this.target.x - this.x) : 0;
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.type === 'NAT') {
            // Quivering animation just before firing
            if (this.target && this.cooldown > 0 && this.cooldown < 20) {
                const quiverAmount = this.level > 5 ? 2.5 : 1.5;
                ctx.translate((Math.random() - 0.5) * quiverAmount, (Math.random() - 0.5) * quiverAmount);
            }
            ctx.rotate(angle); // Rotate to face the target
        } else if (this.type === 'PIN' || this.type === 'PIN_HEART') {
            ctx.rotate(angle - Math.PI / 2);
        }
        
        ctx.fillText(icon, 0, 0);
        ctx.restore();

        // Also draw the orbiters if this is an ORBIT tower
        if (this.type === 'ORBIT') {
            this.orbiters.forEach(orbiter => orbiter.draw(ctx));
        }
    }
    // Draws the circle indicating the tower's range when it's selected.
    drawRange(ctx) {
        // Orbit tower does not display a range circle.
        if (this.type === 'ORBIT') return;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
    }
    // Draws the pulsing aura for the Support and Ent towers.
    drawBuffEffect(ctx) {
        const pulseSize = this.range * (0.9 + Math.sin(Date.now() / 400) * 0.1);
        ctx.save();
        ctx.globalAlpha = 0.5;
        // Use the color based on the tower's current mode
        const auraColor = (this.type === 'ENT' && this.mode === 'slow') ? '#0891b2' : ((this.type === 'CAT' && this.mode === 'slow') ? '#0891b2' : this.color);
        ctx.strokeStyle = auraColor;
        ctx.fillStyle = auraColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 10]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseSize, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.1;
        ctx.fill();
        ctx.restore();
    }
    // Finds an enemy to target based on tower type.
    findTarget(enemies) {
        // Sniper logic: Always find the highest health target in range.
        if (this.type === 'NAT') {
            let highestHealthEnemy = null;
            let maxHealth = -1;
            for (const enemy of enemies) {
                if (this.isInRange(enemy) && enemy.health > maxHealth) {
                    highestHealthEnemy = enemy;
                    maxHealth = enemy.health;
                }
            }
            this.target = highestHealthEnemy;
            return; // Exit after sniper logic is complete.
        }

        // Default logic for all other towers (closest enemy).
        // First, check if the current target is still valid to avoid re-targeting every frame.
        if (this.target && this.target.health > 0 && this.isInRange(this.target)) {
            return;
        }

        // If no valid target, find the closest new one.
        this.target = null;
        let closestDist = Infinity;
        for (const enemy of enemies) {
            // Check for tower-specific restrictions against flying units.
            if (enemy.type.isFlying && (this.type === 'CASTLE' || this.type === 'FORT' || this.type === 'ORBIT' || this.type === 'FIREPLACE')) {
                continue; // Skip this enemy.
            }

            const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            if (dist <= this.range && dist < closestDist) {
                this.target = enemy;
                closestDist = dist;
            }
        }
    }
    // Checks if a specific enemy is within the tower's range.
    isInRange(enemy) {
        return Math.hypot(this.x - enemy.x, this.y - enemy.y) <= this.range;
    }
    // Updates the tower's state every frame (like finding a target and shooting).
    update(enemies, projectiles, onEnemyDeath) {
        if (this.type === 'SUPPORT' || this.type === 'ENT' || this.type === 'CAT') {
            return; // Aura towers don't attack.
        }
        
        if (this.type === 'ORBIT') {
            this.orbiters.forEach(orbiter => {
                orbiter.update();
                enemies.forEach(enemy => {
                    // This ground-based projectile cannot hit flying enemies
                    if (enemy.type.isFlying) return;

                    // Use the tower's current projectileSize, not the base one.
                    const dist = Math.hypot(orbiter.x - enemy.x, orbiter.y - enemy.y);
                    if (dist < enemy.size + this.projectileSize) {
                        if (!orbiter.hitEnemies.has(enemy)) {
                            const finalDamage = this.damage * this.damageMultiplier;
                            if (enemy.takeDamage(finalDamage)) {
                                onEnemyDeath(enemy);
                            }
                             orbiter.hitEnemies.add(enemy);
                             orbiter.hitCooldown = 15; // Cooldown before it can hit the same enemy
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
    // Creates a new projectile when the tower shoots.
    shoot(projectiles) {
        if (this.projectileCount > 1 && this.target) {
            const angleToTarget = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            const spreadAngle = Math.PI / 24; // 7.5 degrees

            // Central projectile always aims true
            projectiles.push(new Projectile(this, this.target));

            // Additional projectiles
            for (let i = 1; i < this.projectileCount; i++) {
                const side = (i % 2 === 0) ? -1 : 1;
                const magnitude = Math.ceil(i / 2);
                const offsetAngle = angleToTarget + (spreadAngle * magnitude * side);

                // A fake target to give the projectile a direction
                const fakeTarget = {
                    x: this.x + Math.cos(offsetAngle) * (this.range + 50),
                    y: this.y + Math.sin(offsetAngle) * (this.range + 50),
                    health: Infinity // Make it unkillable
                };
                projectiles.push(new Projectile(this, fakeTarget));
            }
        } else {
            projectiles.push(new Projectile(this, this.target));
        }
    }
}

// This is the blueprint for a projectile (like an arrow or cannonball).
class Projectile {
    constructor(owner, target, startAngle = 0) {
        this.owner = owner; // The tower that shot it.
        this.x = owner.x;
        this.y = owner.y;
        this.target = target; // The enemy it's flying towards.
        
        // This set is now initialized for all projectiles to prevent the error.
        this.hitEnemies = new Set();
        this.hitCooldown = 0;

        if (this.owner.type === 'ORBIT') {
            this.angle = startAngle;
            this.orbitRadius = this.owner.orbitMode === 'near' ? 40 : 60;
        }
    }
    // Draws the projectile on the screen.
    draw(ctx) {
        let iconFamily = 'Material Icons';
        let icon;
        let rotation = 0;
        
        // Target might be null, so check before using.
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const angle = Math.atan2(dy, dx);
            rotation = angle;
        }

        if (this.owner.type === 'PIN') {
            icon = 'chevron_right';
        } else if (this.owner.type === 'PIN_HEART') {
            icon = 'arrow_shape_up_stack_2';
            iconFamily = "'Material Symbols Outlined'";
            rotation += Math.PI / 2;
        } else if (this.owner.type === 'NAT') {
            icon = 'arrow_forward'; // Use an icon that points right by default
            iconFamily = "'Material Symbols Outlined'";
        } else if (this.owner.type === 'ORBIT') {
            icon = 'circle';
            iconFamily = "'Material Symbols Outlined'";
        }
        
        if (icon) {
            // Draws projectiles that are icons.
            let fontSize = 24;
            if (this.owner.type === 'ORBIT') {
                 // Use the tower's current projectileSize, not the base one.
                fontSize = this.owner.projectileSize * 3;
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
            // Draws projectiles that are simple circles.
            ctx.fillStyle = this.owner.projectileColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.owner.projectileSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // Updates the projectile's state every frame (moving it).
    update(onHit, enemies) {
        if (this.owner.type === 'ORBIT') {
            // Update angle for orbital movement.
            this.angle += this.owner.projectileSpeed / 30; 
            
            // Adjust orbit radius based on tower's current mode
            this.orbitRadius = this.owner.orbitMode === 'near' ? 40 : 60;
            
            // Recalculate position based on the owner's center and the orbit.
            this.x = this.owner.x + Math.cos(this.angle) * this.orbitRadius;
            this.y = this.owner.y + Math.sin(this.angle) * this.orbitRadius;

            // Cooldown logic for hitting enemies
            if (this.hitCooldown > 0) {
                this.hitCooldown--;
            } else {
                this.hitEnemies.clear();
            }
            
            return true; // Orbiters are persistent and managed by the tower.
        }

        // For projectiles with "fake" targets (like spreadshots), we do a collision check.
        if (this.target && typeof this.target.takeDamage !== 'function') {
            for (const enemy of enemies) {
                // Specific tower types cannot hit flying enemies
                if (enemy.type.isFlying && (this.owner.type === 'CASTLE' || this.owner.type === 'FORT' || this.owner.type === 'FIREPLACE')) {
                    continue; 
                }

                const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                if (dist < enemy.size) {
                    onHit(this, enemy); // We hit a real enemy, pass it to the handler
                    return false; // Remove the projectile
                }
            }
        }
        
        // If the target is gone, and this is a PIN_HEART projectile, find a new target.
        if ((!this.target || this.target.health <= 0) && this.owner.type === 'PIN_HEART') {
            let closestEnemy = null;
            let minDistance = Infinity;

            for (const enemy of enemies) {
                // Check if the enemy is within the original tower's range.
                const distToTower = Math.hypot(this.owner.x - enemy.x, this.owner.y - enemy.y);
                if (distToTower <= this.owner.range) {
                    const distToProjectile = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                    if (distToProjectile < minDistance) {
                        minDistance = distToProjectile;
                        closestEnemy = enemy;
                    }
                }
            }
            this.target = closestEnemy; // Assign the new target, or null if none found.
        }

        if (!this.target || this.target.health <= 0) return false; // Remove if target is still gone.
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance < this.owner.projectileSpeed) {
            onHit(this); // It has hit the target.
            return false; // Tell the main loop to remove it.
        } else {
            // Move towards the target.
            this.x += (dx / distance) * this.owner.projectileSpeed;
            this.y += (dy / distance) * this.owner.projectileSpeed;
        }
        return true; // Keep the projectile in the game.
    }
}

// This is the blueprint for visual effects, like explosions.
class Effect {
    constructor(x, y, icon, size, color, duration) {
        this.x = x; this.y = y; this.icon = icon; this.size = size; this.color = color; this.life = duration; this.maxLife = duration;
    }
    // Counts down the effect's lifespan.
    update() {
        this.life--;
        return this.life > 0; // Returns false when its life is over.
    }
    // Draws the effect, making it grow and fade out.
    draw(ctx) {
        // Updated logic to make money icons larger and fade slower.
        let progress = 1 - (this.life / this.maxLife);
        let currentSize = this.size * progress;
        let opacity = 1 - progress;
        
        // This is the new logic for the money effect.
        if (this.icon === 'attach_money') {
            currentSize = this.size + (5 * progress); // Makes the icon grow bigger.
            opacity = 1 - progress * 0.5; // Makes it fade out more slowly.
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

// This is the new blueprint for the text announcements that appear at the top of the screen.
class TextAnnouncement {
    constructor(text, x, y, duration, color = '#00ff88', maxWidth = Infinity) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.life = duration; // How long the announcement stays on screen (in frames).
        this.maxLife = duration;
        this.color = color;
        this.maxWidth = maxWidth;
    }

    // Updates the announcement's state each frame.
    update() {
        this.life--;
        return this.life > 0; // Tells the main loop to remove it when its life is over.
    }

    // Draws the announcement text on the screen.
    draw(ctx) {
        // The message is visible for a bit, then fades out gradually.
        const fadeStartTime = this.maxLife * 0.75; // Start fading when 75% of its life is left.
        
        let opacity = 1.0;
        if (this.life < fadeStartTime) {
            opacity = this.life / fadeStartTime; // Calculate opacity for the fade-out period.
        }

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = this.color;
        
        let fontSize = 16;
        ctx.font = `${fontSize}px 'Press Start 2P'`;

        const lines = this.text.split('\n');
        
        let longestLine = '';
        let maxLineWidth = 0;

        // Find the longest line so we can scale the font if needed.
        for (const line of lines) {
            const currentLineWidth = ctx.measureText(line).width;
            if (currentLineWidth > maxLineWidth) {
                maxLineWidth = currentLineWidth;
                longestLine = line;
            }
        }

        const safeMaxWidth = this.maxWidth * 0.9; // Use 90% of the canvas width for a safe margin.
        
        // If the longest line is wider than our safe area, we scale the font size down.
        if (maxLineWidth > safeMaxWidth) {
            const ratio = safeMaxWidth / maxLineWidth;
            fontSize *= ratio;
            ctx.font = `${fontSize}px 'Press Start 2P'`;
        }
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // A little shadow makes the text easier to read.
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 5;
        
        const lineHeight = fontSize * 1.25; // Line height should be relative to the new font size.
        const startY = this.y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
            ctx.fillText(line, this.x, startY + (index * lineHeight));
        });
        
        ctx.restore();
    }
}

// This line makes all the classes in this file available to other files that need them.
export { Enemy, Tower, Projectile, Effect, TextAnnouncement };
