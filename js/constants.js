export const TILE_SIZE = 40;
export const GRID_EMPTY = 0;
export const GRID_PATH = 1;
export const GRID_TOWER = 2;

// Tower Configuration
export const TOWER_TYPES = {
    PIN: { cost: 25, range: 150, damage: 1.2, fireRate: 22, color: '#00ff88', projectileSpeed: 7, projectileSize: 3, projectileColor: '#00ff88', splashRadius: 0 },
    CASTLE: { cost: 75, range: 180, damage: 5, fireRate: 60, color: '#ff9900', projectileSpeed: 5, projectileSize: 6, projectileColor: '#ff9900', splashRadius: 50,},
    FORT: { cost: 100, range: 160, damage: 3, fireRate: 25, color: '#da70d6', projectileSpeed: 6, projectileSize: 5, projectileColor: '#da70d6', splashRadius: 60, },
    SUPPORT: { cost: 60, range: 100, damage: 0, fireRate: 0, color: '#4d94ff', attackSpeedBoost: 0.85, special: 'Speed Aura' },
    PIN_HEART: { cost: 85, range: 250, damage: 3, fireRate: 40, color: '#ff69b4', projectileSpeed: 4, projectileSize: 3, projectileColor: '#ff69b4', splashRadius: 0, special: 'Homing Projectiles' },
    FIREPLACE: { cost: 135, range: 170, damage: 2, fireRate: 30, color: '#ff6600', projectileSpeed: 6, projectileSize: 5, projectileColor: '#ff6600', splashRadius: 45, burnDps: 2, burnDuration: 3, special: 'Lingering Burn' },
    NAT: { cost: 50, range: 300, damage: 15, fireRate: 120, color: '#DEB887', projectileSpeed: 12, projectileSize: 5, projectileColor: '#DEB887', splashRadius: 0, special: 'Sniper' },
    ENT: { cost: 120, range: 120, damage: 0, fireRate: 0, color: '#2E8B57', attackSpeedBoost: 0.85, damageBoost: 1.15, enemySlow: 0.6, special: 'Toggle Aura: Boost/Slow' }
};

// Enemy Configuration
export const ENEMY_TYPES = {
    NORMAL: { speed: 1.5, health: 10, color: '#ff4d4d', size: 16, gold: 1, icon: 'person', iconFamily: "'Material Symbols Outlined'" },
    FAST: { speed: 2.5, health: 8, color: '#ffb84d', size: 14, gold: 1, icon: 'pest_control_rodent', iconFamily: 'Material Icons' },
    HEAVY: { speed: 1, health: 30, color: '#0018ccff', size: 20, gold: 3, icon: 'guardian', iconFamily: 'Material Symbols Outlined' },
    SWARM: { speed: 3.0, health: 4, color: '#00e6e6', size: 10, gold: 1, icon: 'bug_report', iconFamily: 'Material Icons' },
    FLYING: { speed: 2.0, health: 15, color: '#9a67ea', size: 16, gold: 2, icon: 'rocket', iconFamily: "'Material Symbols Outlined'", isFlying: false }
};
