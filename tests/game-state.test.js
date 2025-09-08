import assert from 'assert';
import {
    gameState,
    resetGameState,
    persistGameState,
    resetLastSaveTime,
} from '../js/game-state.js';

test('resetGameState should initialize with default values', () => {
    resetGameState();
    assert.equal(gameState.lives, 20);
    assert.equal(gameState.gold, 100);
    assert.equal(gameState.wave, 0);
    assert.equal(gameState.enemies.length, 0);
});

test('persistGameState should throttle saves and not save if wave is running', () => {
    localStorage.clear();
    resetLastSaveTime();
    
    let saveCount = 0;
    let currentTime = 1000;
    
    // Mock Date.now
    const originalDateNow = Date.now;
    Date.now = () => currentTime;
    
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        saveCount++;
        originalSetItem.call(this, key, value);
    };
    
    persistGameState(100); // First save at time 1000
    assert.equal(saveCount, 1, "Should save the first time");
    
    currentTime = 1050; // 50ms later
    persistGameState(100); // Should be throttled
    assert.equal(saveCount, 1, "Should not save again during throttle period");

    currentTime = 1150; // 150ms after first save
    persistGameState(100); // Should save again
    assert.equal(saveCount, 2, "Should save again after throttle period");

    // no time passed
    persistGameState(0);
    assert.equal(saveCount, 3, "Should save if throttle is 0");

    gameState.waveInProgress = true;
    persistGameState(0);
    assert.equal(saveCount, 3, "Should not save if wave is in progress");

    // Restore
    Date.now = originalDateNow;
    localStorage.setItem = originalSetItem;
});

test('gameState should serialize and deserialize correctly', () => {
    resetGameState();
    gameState.gold = 500;
    gameState.wave = 5;
    
    persistGameState(0); // Force immediate save
    
    // Simulate page reload by clearing and reloading
    const savedData = localStorage.getItem('gameState');
    assert.ok(savedData, 'Game state should be saved');
    
    const parsed = JSON.parse(savedData);
    assert.equal(parsed.gold, 500);
    assert.equal(parsed.wave, 5);
});
