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
        if(this.health <= 0) return false;

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
        this.level = 1;
        this.mode = 'boost'; // 'boost' or 'slow'
        this.damageMultiplier = 1; // New property to handle non-stacking damage boosts.
        this.updateStats(); // Set initial stats based on its type.
        this.cooldown = 0; // Timer for when it can shoot next.
        this.target = null; // The enemy it's currently aiming at.
    }
    // Updates the tower's stats when it's created, leveled up, or merged.
    updateStats() {
        const baseStats = TOWER_TYPES[this.type];
        if (this.type === 'ENT') {
            // Ent has a boost and slow stat, not affected by its level since it can't be leveled up.
            this.level = 'MAX LEVEL';
            this.cost = baseStats.cost;
            this.range = baseStats.range;
            this.attackSpeedBoost = baseStats.attackSpeedBoost;
            this.damageBoost = baseStats.damageBoost;
            this.enemySlow = baseStats.enemySlow;
            return;
        }

        this.cost = baseStats.cost * this.level;
        this.range = baseStats.range * (1 + (this.level - 1) * 0.1);
        this.damage = baseStats.damage * (1 + (this.level - 1) * 0.5);
        this.permFireRate = baseStats.fireRate * Math.pow(0.9, this.level - 1); // The base fire rate.
        this.fireRate = this.permFireRate; // The current fire rate, which can be buffed.
        this.color = baseStats.color;
        this.projectileSpeed = baseStats.projectileSpeed;
        this.projectileSize = baseStats.projectileSize;
        this.projectileColor = baseStats.projectileColor;
        this.splashRadius = baseStats.splashRadius;
        if (this.type === 'SUPPORT') {
            this.attackSpeedBoost = baseStats.attackSpeedBoost * Math.pow(0.95, this.level - 1);
        }
        if (this.type === 'FIREPLACE') {
            this.burnDps = baseStats.burnDps * (1 + (this.level - 1) * 0.5);
            this.burnDuration = baseStats.burnDuration;
        }
    }
    // Draws the tower on the screen.
    draw(ctx) {
        const iconSize = 28 + (this.level === 'MAX LEVEL' ? 4 : this.level * 4);
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon;
        let iconFamily = 'Material Icons';
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
                icon = 'ENT'; // Changed from 'forest' to 'ENT'
                iconFamily = "'Material Symbols Outlined'";
                break;
        }
        
        ctx.font = `${iconSize}px ${iconFamily}`;
        
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
    }
    // Draws the circle indicating the tower's range when it's selected.
    drawRange(ctx) {
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
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 10]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseSize, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.1;
        ctx.fill();
        ctx.restore();
    }
    // Finds the closest enemy to target.
    findTarget(enemies) {
        if (this.target && this.target.health > 0 && this.isInRange(this.target)) return;
        this.target = null;
        let closestDist = Infinity;
        for (const enemy of enemies) {
            // Forts and Castles cannot target flying enemies.
            if (enemy.type.isFlying && (this.type === 'CASTLE' || this.type === 'FORT')) {
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
    update(enemies, projectiles) {
        if (this.type === 'SUPPORT' || this.type === 'ENT') {
            return; // Support and Ent towers don't attack.
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
        projectiles.push(new Projectile(this, this.target));
    }
}

// This is the blueprint for a projectile (like an arrow or cannonball).
class Projectile {
    constructor(owner, target) {
        this.owner = owner; // The tower that shot it.
        this.x = owner.x;
        this.y = owner.y;
        this.target = target; // The enemy it's flying towards.
    }
    // Draws the projectile on the screen.
    draw(ctx) {
        let iconFamily = 'Material Icons';
        let icon;
        let rotation = 0;
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const angle = Math.atan2(dy, dx);

        if (this.owner.type === 'PIN') {
            icon = 'chevron_right';
            rotation = angle;
        } else if (this.owner.type === 'PIN_HEART') {
            icon = 'arrow_shape_up_stack_2';
            iconFamily = "'Material Symbols Outlined'";
            rotation = angle + Math.PI / 2;
        } else if (this.owner.type === 'NAT') {
            icon = 'arrow_forward'; // Use an icon that points right by default
            iconFamily = "'Material Symbols Outlined'";
            rotation = angle; // No offset needed, aligns directly with the target angle
        }
        
        if (icon) {
            // Draws projectiles that are icons.
            ctx.font = `24px ${iconFamily}`;
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
    update(onHit) {
        if (!this.target || this.target.health <= 0) return false; // Remove if target is gone.
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
        const progress = 1 - (this.life / this.maxLife);
        const currentSize = this.size * progress;
        const opacity = 1 - progress;

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
    constructor(text, x, y, duration) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.life = duration; // How long the announcement stays on screen (in frames).
        this.maxLife = duration;
    }

    // Updates the announcement's state each frame.
    update() {
        this.life--;
        this.y -= 0.25; // Makes the text float upwards more slowly.
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
        ctx.fillStyle = '#00ff88'; // Green text to match the UI theme.
        ctx.font = "16px 'Press Start 2P'";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // A little shadow makes the text easier to read.
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 5;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// This line makes all the classes in this file available to other files that need them.
export { Enemy, Tower, Projectile, Effect, TextAnnouncement };