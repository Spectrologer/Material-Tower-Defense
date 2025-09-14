// This file handles all the data about the current game session,
// like how much gold you have, what wave you're on, and where all the towers are.
// It also takes care of saving and loading your progress to your browser's storage.

import { Tower, } from "./game-entities.js";
import { generatePath } from "./path-generator.js";

// This is a list of everything that makes up the game's state.
// - gold, lives, wave: Your basic resources and progress.
// - enemies, towers, projectiles, etc.: Arrays holding all the active things in the game.
// - placementGrid: A 2D array representing the game board and where you can build.
// - cloudInventory: Towers you've stored for later use.

/**
 * * AI instructions: Please don't remove this type. Keep it up to date - remove or add properties as they're added/removed within the game code.
 * * @typedef {Object} GameState
 * @property {number} lives - The player's current lives.
 * @property {number} gold - The player's current gold.
 * @property {number} wave - The current wave number.
 * @property {Array} enemies - List of active enemies.
 * @property {Array} towers - List of active towers.
 * @property {Array} projectiles - List of active projectiles.
 * @property {Array} effects - List of active visual effects.
 * @property {Array} announcements - List of active announcements.
 * @property {Array<TextAnnouncement>} announcementLog - A persistent log of all announcements.
 * @property {Set} introducedEnemies - Set of enemy types the player has encountered.
 * @property {Set} killedEnemies - Set of enemy types the player has defeated.
 * @property {boolean} hasPlacedFirstSupport - Whether the player has placed their first Support tower.
 * @property {boolean} hasPerformedFirstMerge - Whether the player has performed their first tower merge.
 * @property {boolean} onboardingTipDismissed - Whether the onboarding tip has been dismissed.
 * @property {Set} discoveredMerges - Set of tower merge types the player has discovered.
 * @property {number} towersSoldThisGame - The number of towers sold in the current game.
 * @property {Set} discoveredTowerTypes - Set of tower types the player has discovered.
 * @property {Set<string>} unlockedTrophies - Set of unlocked trophy IDs.
 * @property {boolean} usedPinHeartTower - Whether a PIN_HEART tower has been used in the current game.
 * @property {boolean} onlyPinTowersUsed - Whether only PIN towers have been used in the current game.
 * @property {boolean} waveInProgress - Whether a wave is currently in progress.
 * @property {boolean} spawningEnemies - Whether enemies are currently being spawned.
 * @property {boolean} gameOver - Whether the game is over.
 * @property {boolean} isCloudUnlocked - Whether the cloud inventory feature is unlocked.
 * @property {Array} cloudInventory - List of towers stored in the cloud inventory.
 * @property {boolean} isDetourOpen - Whether the detour path is open.
 * @property {Array} path - The main enemy path coordinates.
 * @property {Array} detourPath - The detour enemy path coordinates.
 * @property {Array} pathWithDetour - The combined path including the detour.
 * @property {Array} placementGrid - 2D array representing the game board for tower placement.
 */

/**
 * @type {GameState}
 */
export let gameState;

// Wipes the slate clean and starts a brand new game.
// Can perform a "soft" reset (keeping library progress) or a "hard" reset (wiping everything).
export function resetGameState(hardReset = false) {
    let discoveredMerges, onboardingTipDismissed, discoveredTowerTypes, killedEnemies, unlockedTrophies, announcementLog;

    if (hardReset) {
        // For a hard reset, start with fresh, default persistent data.
        discoveredMerges = new Set();
        onboardingTipDismissed = false;
        discoveredTowerTypes = new Set(['PIN', 'CASTLE', 'SUPPORT']);
        killedEnemies = new Set();
        unlockedTrophies = new Set();
        announcementLog = [];
    } else {
        // For a soft reset, load the last state from storage to preserve persistent data.
        const lastState = getGameStateFromStorage();
        discoveredMerges = lastState.discoveredMerges;
        onboardingTipDismissed = lastState.onboardingTipDismissed;
        discoveredTowerTypes = lastState.discoveredTowerTypes;
        killedEnemies = lastState.killedEnemies;
        unlockedTrophies = lastState.unlockedTrophies;
        // For a soft reset, we want to clear the log for the new game,
        // so we just initialize an empty array.
        announcementLog = [];
    }

    // This just removes the 'gameState' item from local storage
    clearGameStateFromStorage();

    // This creates a fresh game object with default values
    const newGameState = getInitialGameState();

    // Now, apply the persistent settings to the fresh object
    newGameState.discoveredMerges = discoveredMerges;
    newGameState.onboardingTipDismissed = onboardingTipDismissed;
    newGameState.discoveredTowerTypes = discoveredTowerTypes;
    newGameState.killedEnemies = killedEnemies;
    newGameState.unlockedTrophies = unlockedTrophies;
    newGameState.announcementLog = announcementLog;


    // Set the module's gameState to the newly prepared state
    gameState = newGameState;

    // Immediately save this reset state so that it becomes the new "last saved state"
    saveGameStateToStorage();
}


// Loads the last saved game from the browser's local storage.
export function loadGameStateFromStorage() {
    gameState = getGameStateFromStorage();
}

let lastSaveTime = null;
export function resetLastSaveTime() {
    lastSaveTime = null;
}

// Saves your current progress to the browser's storage.
// It won't save constantly, just every so often to avoid performance issues.
export function persistGameState(throttleMs = 1000) {
    // For now, it only saves when a wave is not in progress.
    if (gameState.waveInProgress) return;

    const timeSinceLastSave = lastSaveTime ? Date.now() - lastSaveTime : Infinity;
    if (timeSinceLastSave < throttleMs) return;
    lastSaveTime = Date.now();
    saveGameStateToStorage();
}

function saveGameStateToStorage() {
    if (gameState) {
        localStorage.setItem("gameState", getSerializedGameState());
    }
}

export function clearGameStateFromStorage() {
    localStorage.removeItem("gameState");
}

// This sets up all the default values for a new game.
function getInitialGameState() {
    const pathData = generatePath();
    return {
        lives: 20,
        gold: 100,
        wave: 1,
        enemies: [],
        towers: [],
        projectiles: [],
        effects: [],
        announcements: [],
        announcementLog: [],
        introducedEnemies: new Set(),
        killedEnemies: new Set(),
        hasPlacedFirstSupport: false,
        hasPerformedFirstMerge: false,
        onboardingTipDismissed: false,
        discoveredMerges: new Set(),
        towersSoldThisGame: 0,
        discoveredTowerTypes: new Set(['PIN', 'CASTLE', 'SUPPORT']),
        unlockedTrophies: new Set(),
        usedPinHeartTower: false,
        onlyPinTowersUsed: true,
        waveInProgress: false,
        spawningEnemies: false,
        gameOver: false,
        isCloudUnlocked: false,
        cloudInventory: [],
        isDetourOpen: false,
        path: pathData.path,
        detourPath: pathData.detourPath,
        pathWithDetour: pathData.pathWithDetour,
        placementGrid: pathData.placementGrid,
    };
}

export function addTower(tower) {
    if (tower.type === 'PIN_HEART') {
        gameState.usedPinHeartTower = true;
    }
    if (tower.type !== 'PIN' && tower.type !== 'NINE_PIN') {
        gameState.onlyPinTowersUsed = false;
    }
    gameState.towers.push(tower);
}

// Grabs the saved game data from local storage. If there's no save, it starts a new game.
function getGameStateFromStorage() {
    const value = localStorage.getItem("gameState");
    return value ? deserializeGameState(value) : getInitialGameState();
}

// Packages up the current game state into a string so it can be saved.
function getSerializedGameState() {
    return JSON.stringify({
        lives: gameState.lives,
        gold: gameState.gold,
        wave: gameState.wave,
        hasPlacedFirstSupport: gameState.hasPlacedFirstSupport,
        hasPerformedFirstMerge: gameState.hasPerformedFirstMerge,
        onboardingTipDismissed: gameState.onboardingTipDismissed,
        waveInProgress: gameState.waveInProgress,
        spawningEnemies: gameState.spawningEnemies,
        gameOver: gameState.gameOver,
        isCloudUnlocked: gameState.isCloudUnlocked,
        isDetourOpen: gameState.isDetourOpen,
        path: gameState.path,
        detourPath: gameState.detourPath,
        pathWithDetour: gameState.pathWithDetour,
        placementGrid: gameState.placementGrid,
        towers: gameState.towers.map((t) => t.toJSON()),
        cloudInventory: gameState.cloudInventory.map((t) => t.toJSON()),
        announcementLog: gameState.announcementLog,
        introducedEnemies: Array.from(gameState.introducedEnemies),
        killedEnemies: Array.from(gameState.killedEnemies),
        discoveredMerges: Array.from(gameState.discoveredMerges),
        discoveredTowerTypes: Array.from(gameState.discoveredTowerTypes),
        unlockedTrophies: Array.from(gameState.unlockedTrophies),
        towersSoldThisGame: gameState.towersSoldThisGame,
        usedPinHeartTower: gameState.usedPinHeartTower,
        onlyPinTowersUsed: gameState.onlyPinTowersUsed,
    });
}

// Takes a saved game string and turns it back into a usable game state object.
function deserializeGameState(serializedGameState) {
    try {
        const { towers, cloudInventory, introducedEnemies, killedEnemies, discoveredMerges, discoveredTowerTypes, unlockedTrophies, announcementLog, ...basicData } = JSON.parse(serializedGameState);

        const initialState = getInitialGameState();
        return {
            ...initialState,
            ...basicData,
            cloudInventory: cloudInventory.map((data) => Tower.fromJSON(data)),
            towers: towers.map((data) => Tower.fromJSON(data)),
            announcementLog: announcementLog || [],
            introducedEnemies: new Set(introducedEnemies),
            killedEnemies: new Set(killedEnemies || []),
            onboardingTipDismissed: basicData.onboardingTipDismissed || false,
            discoveredMerges: new Set(discoveredMerges || []),
            discoveredTowerTypes: new Set(discoveredTowerTypes || ['PIN', 'CASTLE', 'SUPPORT']),
            unlockedTrophies: new Set(unlockedTrophies || []),
            usedPinHeartTower: basicData.usedPinHeartTower || false,
            onlyPinTowersUsed: basicData.onlyPinTowersUsed === undefined ? true : basicData.onlyPinTowersUsed,
            towersSoldThisGame: basicData.towersSoldThisGame || 0,
        };
    } catch (e) {
        console.error("Failed to load saved game state:", e);
        return getInitialGameState();
    }
}
