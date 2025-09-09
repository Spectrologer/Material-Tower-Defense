// holds all the core numbers and settings for the game.
// central place to easily tweak the game's balance and layout.

// Sets up the size of the game grid.
export const GRID_COLS = 11;
export const GRID_ROWS = 18;
export const TILE_SIZE = 40; // The size of each square in pixels.

// These are used to mark what's on each grid square.
export const GRID_EMPTY = 0; // An empty spot where you can build.
export const GRID_PATH = 1;  // Part of the enemy path.
export const GRID_TOWER = 2; // A spot where a tower is already built.

// All the stats for each type of tower you can build.
export const TOWER_TYPES = {
    PIN: { cost: 25, range: 150, damage: 1.2, fireRate: 22, color: '#ffffffff', projectileSpeed: 7, projectileSize: 3, projectileColor: '#ffffffff', splashRadius: 0 },
    CASTLE: { cost: 75, range: 100, damage: 6, fireRate: 60, color: '#525252ff', projectileSpeed: 5, projectileSize: 6, projectileColor: '#ff9900', splashRadius: 50, },
    FORT: { cost: 100, range: 200, damage: 12, fireRate: 180, color: '#878787ff', projectileSpeed: 4, projectileSize: 8, projectileColor: '#717171ff', splashRadius: 80, special: 'Mortar Strike' },
    SUPPORT: { cost: 60, range: 100, damage: 0, fireRate: 0, color: '#f870ffff', attackSpeedBoost: 0.85, special: 'Non-Stacking Speed Aura' },
    PIN_HEART: { cost: 85, range: 250, damage: 0.8, fireRate: 10, color: '#ff69b4', projectileSpeed: 5, projectileSize: 3, projectileColor: '#ff69b4', splashRadius: 0, special: 'Loyal Projectiles' },
    FIREPLACE: { cost: 135, range: 50, damage: 0.1, fireRate: 2, color: '#e11d48', projectileSpeed: 3, projectileSize: 8, projectileColor: '#ff6600', splashRadius: 45, burnDps: 2, burnDuration: 10, special: 'Lingering Burn' },
    NAT: { cost: 50, range: 300, damage: 8, fireRate: 120, color: '#DEB887', projectileSpeed: 12, projectileSize: 5, projectileColor: '#DEB887', splashRadius: 0, special: 'Sniper' },
    ENT: { cost: 120, range: 120, damage: 0, fireRate: 0, color: '#618effff', attackSpeedBoost: 0.75, damageBoost: 1.25, enemySlow: 0.6, special: 'Aura: Boost/Slow' },
    ORBIT: { cost: 150, range: 9999, damage: 5, fireRate: 0, color: '#0891b2', projectileSpeed: 1, projectileSize: 4, projectileColor: '#0891b2', splashRadius: 0, special: 'Orbiters' },
    CAT: { cost: 180, range: 120, damage: 0, fireRate: 0, color: '#f59e0b', attackSpeedBoost: 0.75, damageBoost: 1.25, enemySlow: 0.6, goldBonus: 1, special: 'Aura + Greed', iconSize: 0.9 },
    NINE_PIN: { cost: 119, range: 249, damage: 4.9, fireRate: 69, color: '#FFFFFF', projectileSpeed: 6, projectileSize: 39, projectileColor: '#ffffffff', splashRadius: 0, special: 'Piercing Shot', unmergeable: true },
    ANTI_AIR: { cost: 110, range: 350, damage: 50, fireRate: 180, color: '#a9a9a9', projectileSpeed: .1, projectileSize: 24, projectileColor: '#cccccc', special: 'Air units only' },
};

// All the stats for each type of enemy that can spawn.
export const ENEMY_TYPES = {
    NORMAL: { speed: 1.5, health: 10, color: '#ae2f2fff', size: 16, gold: 1, icon: 'person', iconFamily: "'Material Symbols Outlined'", damagesLives: true },
    FAST: { speed: 2.5, health: 8, color: '#ffb84d', size: 14, gold: 1, icon: 'pest_control_rodent', iconFamily: 'Material Icons', damagesLives: true },
    HEAVY: { speed: 1.1, health: 35, color: '#3446ceff', size: 20, gold: 3, icon: 'guardian', iconFamily: 'Material Symbols Outlined', damagesLives: true },
    SWARM: { speed: 3.0, health: 4, color: '#00e6e6', size: 10, gold: 1, icon: 'bug_report', iconFamily: 'Material Icons', damagesLives: true },
    FLYING: { speed: 2.0, health: 15, color: '#5e359fff', size: 16, gold: 2, icon: 'helicopter', iconFamily: "'Material Symbols Outlined'", isFlying: true, splashImmune: true, damagesLives: true },
    BITCOIN: { speed: 2.0, health: 20, color: '#F7931A', size: 15, gold: 0, icon: 'currency_bitcoin', iconFamily: 'Material Symbols Outlined', isFlying: false, splashImmune: false, damagesLives: false },
    BOSS: { speed: 1.2, health: 4400, color: '#f589ffff', size: 28, gold: 50, icon: 'flutter_dash', iconFamily: 'Material Icons', isFlying: true, damagesLives: false, laysEggs: true, layEggInterval: 5, eggLayStopTime: 1.5, wiggleTime: 1, splashImmune: true },
    EGG: { speed: 0, health: 200, color: '#ffedceff', size: 12, gold: 0, icon: 'egg', iconFamily: 'Material Symbols Outlined', damagesLives: false, hatchTime: 5, hatchesTo: 'HATCHED', isStationary: true },
    HATCHED: { speed: 2.5, health: 200, color: '#90CAF9', size: 14, gold: 0, icon: 'boy', iconFamily: 'Material Symbols Outlined', damagesLives: true }
};
