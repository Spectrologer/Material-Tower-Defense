// holds all the core numbers and settings for the game.
// central place to easily tweak the game's balance and layout.

import { SpecialTrack } from './tracks.js';

// Sets up the size of the game grid.
export const GRID_COLS = 11;
export const GRID_ROWS = 18;
export const TILE_SIZE = 40; // The size of each square in pixels.

// These are used to mark what's on each grid square.
export const GRID_EMPTY = 0; // An empty spot where you can build.
export const GRID_PATH = 1;  // Part of the enemy path.
export const GRID_TOWER = 2; // A spot where a tower is already built.

// Gameplay Features
export const CLOUD_STORAGE_COST = 25;

// All the stats for basic towers.

export const TOWER_TYPES = {
    PIN: { cost: 25, range: 150, damage: 2, fireRate: 22, color: '#ffffffff', projectileSpeed: 7, projectileSize: 3, projectileColor: '#ffffffff', splashRadius: 0, comment: "You are here." },
    CASTLE: { cost: 75, range: 100, damage: 7, fireRate: 80, color: '#be724fff', projectileSpeed: 5, projectileSize: 6, projectileColor: '#ff9900', splashRadius: 50, comment: "It's like a house, but harder." },
    SUPPORT: { cost: 50, range: 0, damage: 0, fireRate: 0, color: '#f870ffff', attackSpeedBoost: 0.85, stealthDetectionRange: 2, special: 'Non-Stacking Speed Aura', comment: "Please stay off the line." },

    // All the stats for advanced towers.

    FORT: { cost: 100, range: 200, damage: 12, fireRate: 160, color: '#ac5e5eff', projectileSpeed: 4, projectileSize: 15, projectileColor: '#717171ff', splashRadius: 80, special: 'Mortar Strike', comment: "Holding it down." },
    PIN_HEART: { cost: 85, range: 220, damage: 1.5, fireRate: 15, color: '#ff69b4', projectileSpeed: 5, projectileSize: 3, projectileColor: '#ff69b4', splashRadius: 0, special: 'Loyal Projectiles', armorPenetration: 0.70, comment: "It's a little clingy." },
    FIREPLACE: { cost: 135, range: 50, damage: 0.2, fireRate: 3, color: '#e11d48', projectileSpeed: 10, projectileSize: 8, projectileColor: '#ff6600', splashRadius: 45, burnDps: 1, burnDuration: 10, special: 'Lingering Burn', maxLevel: 5, comment: "It's not fun when it's too hot!" },
    NAT: { cost: 50, range: 300, damage: 12, fireRate: 120, color: '#DEB887', projectileSpeed: 12, projectileSize: 5, projectileColor: '#DEB887', splashRadius: 0, special: 'Sniper', armorPenetration: 0.90, comment: "Hiding its true IP: Intense Pain." },
    MIND: { cost: 120, range: 0, damage: 0, fireRate: 0, color: '#618effff', attackSpeedBoost: 0.75, damageBoost: 1.25, enemySlow: 0.6, stealthDetectionRange: 3, special: 'Aura: Boost/Slow', comment: "A weapon to surpass metal gear." },
    ORBIT: { cost: 150, range: 0, damage: 5, fireRate: 0, color: '#0891b2', projectileSpeed: 0.5, projectileSize: 4, projectileColor: '#0891b2', splashRadius: 0, special: 'Orbiters', comment: "Weeeeeeeee!" },

    // All the stats for hybrid towers.

    CAT: { cost: 180, range: 0, damage: 0, fireRate: 0, color: '#f59e0b', attackSpeedBoost: 0.75, damageBoost: 1.25, enemySlow: 0.6, goldBonus: 1, stealthDetectionRange: 4, special: 'Aura + Greed', iconSize: 0.9, maxLevel: 1, comment: "Meow-ney talks." },
    NINE_PIN: { cost: 119, range: 600, damage: 13, fireRate: 69, color: '#FFFFFF', projectileSpeed: 6, projectileSize: 39, projectileColor: '#ffffffff', splashRadius: 0, special: 'Piercing Shot', unmergeable: true, maxLevel: 1, comment: "You probably did this by accident." },
    ANTI_AIR: { cost: 110, range: 350, damage: 50, fireRate: 180, color: '#a9a9a9', projectileSpeed: .1, projectileSize: 24, projectileColor: '#cccccc', special: 'Air units only', maxLevel: 1, comment: "One job." },
    STUN_BOT: { cost: 150, range: 180, damage: 8, fireRate: 100, color: '#fef08a', projectileSpeed: 0, projectileSize: 0, projectileColor: '#fef08a', special: 'Chain Lightning', chainTargets: 5, chainRange: 100, maxLevel: 5, comment: "Don't taze me bro." },

};

// All the stats for each type of enemy that can spawn.
export const ENEMY_TYPES = {
    NORMAL: { speed: 1.5, health: 12, armor: 0, color: '#dc2626', size: 16, gold: 1, icon: 'person', iconFamily: 'Material Symbols Outlined', damagesLives: true, comment: "Just some guy. Don't feel too bad." },
    FAST: { speed: 2.5, health: 8, armor: 0, color: '#f59e0b', size: 14, gold: 1, icon: 'pest_control_rodent', iconFamily: 'Material Icons', damagesLives: true, comment: "Has places to be.", prefersDetour: true },
    SWARM: { speed: 3.0, health: 4, armor: 0, color: '#14b8a6', size: 10, gold: 1, icon: 'bug_report', iconFamily: 'Material Icons', damagesLives: true, comment: "It's a bug, and a feature.", prefersDetour: true },
    HEAVY: { speed: 1.1, health: 35, armor: 5, color: '#1c5abeff', size: 20, gold: 3, icon: 'guardian', iconFamily: 'Material Symbols Outlined', damagesLives: true, comment: "Slow and steady loses the race." },
    HEALER: { speed: 1.5, health: 20, armor: 3, color: '#0e87beff', size: 18, gold: 5, icon: 'digital_wellbeing', iconFamily: 'Material Symbols Outlined', damagesLives: true, isHealer: true, healInterval: 2.5, healRange: 80, healPercent: 0.10, comment: "Sharing is caring." },
    FLYING: { speed: 2.0, health: 15, armor: 0, color: '#8846c5ff', size: 16, gold: 2, icon: 'helicopter', iconFamily: 'Material Symbols Outlined', isFlying: true, splashImmune: true, damagesLives: true, comment: "Ignores ground rules. And your ground towers." },
    STEALTH: { speed: 2.2, health: 15, armor: 1, color: '#a1a1aa', size: 16, gold: 3, icon: 'settings_accessibility', iconFamily: 'Material Symbols Outlined', damagesLives: true, isInvisible: true, prefersDetour: true, comment: "He's not your a11y." },
    BITCOIN: { speed: 2.0, health: 20, armor: 0, color: '#d8b012ff', size: 15, gold: 0, icon: 'currency_bitcoin', iconFamily: 'Material Symbols Outlined', isFlying: false, splashImmune: false, damagesLives: false, comment: "Volatile. Will drain your assets." },
    BOSS: { speed: 1.2, health: 4400, armor: 10, color: '#f472b6', size: 28, gold: 50, icon: 'flutter_dash', iconFamily: 'Material Icons', isFlying: true, damagesLives: false, laysEggs: true, layEggInterval: 5, eggLayStopTime: 1.5, wiggleTime: 1, splashImmune: true, comment: "Big fan of Birdo.", musicTrack: SpecialTrack.flutterDash },
    EGG: { speed: 0, health: 200, armor: 2, color: '#fbcfe8', size: 12, gold: 0, icon: 'egg', iconFamily: 'Material Symbols Outlined', damagesLives: false, hatchTime: 5, hatchesTo: 'HATCHED', isStationary: true, comment: "Great, another mobile gacha game" },
    HATCHED: { speed: 2.6, health: 200, armor: 0, color: '#93c5fd', size: 14, gold: 0, icon: 'boy', iconFamily: 'Material Symbols Outlined', damagesLives: true, comment: "Why." },
    SUMMONER: { speed: 0.5, health: 200, armor: 10, color: '#3bb367ff', size: 22, gold: 10, icon: 'hub', iconFamily: 'Material Symbols Outlined', damagesLives: true, spawnsMinions: true, spawnInterval: 4, spawnCount: 5, spawnDelay: 1, minionType: 'MINION', comment: "Alienated labor." },
    MINION: { speed: 3.5, health: 10, armor: 0, color: '#86efac', size: 12, gold: 0, icon: 'attribution', iconFamily: 'Material Symbols Outlined', damagesLives: true, comment: "Hey, it's a living." },
    PHANTOM: { speed: 3.8, health: 40, armor: 2, color: '#c084fc', size: 16, gold: 3, icon: 'blur_on', phasingIcon: 'lens_blur', iconFamily: 'Material Symbols Outlined', damagesLives: true, comment: "He's a disruptor.", phaseInterval: 1, phaseDistance: -50, phaseDuration: 1 },
    SPLITTER: { speed: 2.0, health: 25, armor: 2, color: '#84cc16', size: 16, gold: 2, icon: 'coronavirus', iconFamily: 'Material Icons', damagesLives: true, splitsOnDeath: true, splitCount: 2, splitInto: 'SPLITTER_MINI', comment: "What's worse than one? Two. Sometimes." },
    SPLITTER_MINI: { speed: 2.5, health: 10, armor: 0, color: '#85bc2bff', size: 10, gold: 1, icon: 'coronavirus', iconFamily: 'Material Icons', damagesLives: true, splitsOnDeath: true, splitCount: 2, splitInto: 'SPLITTER_MICRO', comment: "It keeps happening!" },
    SPLITTER_MICRO: { speed: 3.0, health: 5, armor: 0, color: '#88ae46ff', size: 6, gold: 0, icon: 'coronavirus', iconFamily: 'Material Icons', damagesLives: true, comment: "This seems derivative." },
};
