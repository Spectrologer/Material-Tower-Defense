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
export let gameState;

// Wipes the slate clean and starts a brand new game, but keeps persistent data.
export function resetGameState() {
    // Get the current persistent settings before wiping the state
    const discoveredMerges = gameState ? gameState.discoveredMerges : new Set();
    const onboardingTipDismissed = gameState ? gameState.onboardingTipDismissed : false;

    // This just removes the 'gameState' item from local storage
    clearGameStateFromStorage();

    // This creates a fresh game object with default values
    const newGameState = getInitialGameState();

    // Now, apply the persistent settings to the fresh object
    newGameState.discoveredMerges = discoveredMerges;
    newGameState.onboardingTipDismissed = onboardingTipDismissed;

    // Set the module's gameState to the newly prepared state
    gameState = newGameState;

    // Immediately save this reset state so that the subsequent `init` call in main.js loads it correctly
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

function clearGameStateFromStorage() {
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
        introducedEnemies: new Set(),
        hasPlacedFirstSupport: false,
        hasPerformedFirstMerge: false,
        onboardingTipDismissed: false,
        discoveredMerges: new Set(),
        waveInProgress: false,
        spawningEnemies: false,
        gameOver: false,
        isCloudUnlocked: false,
        cloudInventory: [],
        path: pathData.path,
        placementGrid: pathData.placementGrid,
    };
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
        path: gameState.path,
        placementGrid: gameState.placementGrid,
        towers: gameState.towers.map((t) => t.toJSON()),
        cloudInventory: gameState.cloudInventory.map((t) => t.toJSON()),
        introducedEnemies: Array.from(gameState.introducedEnemies),
        discoveredMerges: Array.from(gameState.discoveredMerges),
    });
}

// Takes a saved game string and turns it back into a usable game state object.
function deserializeGameState(serializedGameState) {
    try {
        const { towers, cloudInventory, introducedEnemies, discoveredMerges, ...basicData } = JSON.parse(serializedGameState);

        return {
            ...getInitialGameState(),
            ...basicData,
            cloudInventory: cloudInventory.map((data) => Tower.fromJSON(data)),
            towers: towers.map((data) => Tower.fromJSON(data)),
            introducedEnemies: new Set(introducedEnemies),
            onboardingTipDismissed: basicData.onboardingTipDismissed || false,
            discoveredMerges: new Set(discoveredMerges || []),
        };
    } catch (e) {
        console.error("Failed to load saved game state:", e);
        return getInitialGameState();
    }
}

