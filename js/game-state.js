import {
    Enemy,
    Tower,
    Projectile,
    Effect,
    TextAnnouncement,
} from './game-entities.js'; 


/**
 * @typedef {Object} GameState
 * @property {number} gold
 * @property {number} lives
 * @property {number} wave
 * @property {boolean} waveInProgress
 * @property {boolean} spawningEnemies
 * @property {Array<Enemy>} enemies
 * @property {Array<Tower>} towers
 * @property {Array<Projectile>} projectiles
 * @property {Array<Effect>} effects
 * @property {Array<TextAnnouncement>} announcements
 * @property {Array<Array<number>>} placementGrid
 * @property {Array<Tower>} cloudInventory
 * @property {boolean} isCloudUnlocked
 * @property {Set<string>} introducedEnemies
 * @property {Array<{x: number, y: number}>} path
 * @property {boolean} hasPlacedFirstSupport
 * @property {boolean} gameOver
 */
export let gameState = getGameStateFromStorage();

export function resetGameState() {
    clearGameStateFromStorage();
    gameState = getInitialGameState();
}


let lastSaveTime = null;
export function resetLastSaveTime() {
    lastSaveTime = null;
}

/**
 * Saves the current game state to localStorage so that it can be restored later.
 * @param {number} throttleMs - Minimum time in milliseconds since the last save to perform a new save.
 */
export function persistGameState(throttleMs = 1000) {
    const timeSinceLastSave = lastSaveTime ? Date.now() - lastSaveTime : Infinity;
    if (timeSinceLastSave < throttleMs) return;
    lastSaveTime = Date.now();
    saveGameStateToStorage();
}

function saveGameStateToStorage() {
    localStorage.setItem('gameState', serializeGameState(gameState));
}

function clearGameStateFromStorage() {
    localStorage.removeItem('gameState');
}

function getInitialGameState() {
    return {
        lives: 20,
        gold: 100,
        wave: 0,
        enemies: [],
        towers: [],
        projectiles: [],
        effects: [],
        announcements: [],
        introducedEnemies: new Set(),
        hasPlacedFirstSupport: false,
        waveInProgress: false,
        spawningEnemies: false,
        gameOver: false,
        isCloudUnlocked: false,
        cloudInventory: [],
        path: [],
        placementGrid: []
    };
}

function getGameStateFromStorage() {
    const value = localStorage.getItem('gameState');
    return value ? deserializeGameState(value) : getInitialGameState();
}

function serializeGameState() {
    return JSON.stringify({
        lives: gameState.lives,
        gold: gameState.gold,
        wave: gameState.wave,
        hasPlacedFirstSupport: gameState.hasPlacedFirstSupport,
        waveInProgress: gameState.waveInProgress,
        spawningEnemies: gameState.spawningEnemies,
        gameOver: gameState.gameOver,
        isCloudUnlocked: gameState.isCloudUnlocked,
        path: gameState.path,
        placementGrid: gameState.placementGrid,
        
        enemies: gameState.enemies.map(e => e.toJSON()),
        towers: gameState.towers.map(t => t.toJSON()),
        projectiles: gameState.projectiles.map(p => p.toJSON()),
        cloudInventory: gameState.cloudInventory.map(t => t.toJSON()),
        introducedEnemies: Array.from(gameState.introducedEnemies),
    });
}

/**
 * @param {string} serializedGameState 
 * @returns {GameState} 
 */
function deserializeGameState(serializedGameState) {
    try {
        const {
            enemies,
            towers,
            projectiles,
            announcements,
            cloudInventory,
            introducedEnemies,
            ...basicData
        } = JSON.parse(serializedGameState);

        const reconstructedTowers = towers.map(data => Tower.fromJSON(data));
        const reconstructedEnemies = enemies.map(data => Enemy.fromJSON(data, basicData.path));

        return {
            ...basicData,
            effects: [],
            cloudInventory: cloudInventory.map(data => Tower.fromJSON(data)),
            enemies: reconstructedEnemies,
            towers: reconstructedTowers,
            projectiles: projectiles.map(data => Projectile.fromJSON(data, reconstructedTowers, reconstructedEnemies)),
            announcements: [],
            introducedEnemies: new Set(introducedEnemies),
        };
    } catch (e) {
        console.error("Failed to deserialize game state:", e);
        return getInitialGameState();
    }
}
