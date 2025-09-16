import assert from 'assert';
import { gameState, resetGameState } from '../js/game-state.js';
import { onEndWave } from '../js/main.js';
import { uiElements, showWave16PowerChoice } from '../js/ui-manager.js';


// Helper to simulate a button click and wait for the promise to resolve
async function simulatePowerUpChoice(buttonId, continueCallback) {
    // The showWave16PowerChoice function now takes a callback
    showWave16PowerChoice(continueCallback);

    // Find the button and simulate a click
    const button = document.getElementById(buttonId);
    assert.ok(button, `Button with id ${buttonId} should exist`);
    button.click();
}

test('After wave 15, power-up modal appears and allows proceeding to wave 16', async () => {
    resetGameState();
    gameState.wave = 15; // Set the game to be at the end of wave 15
    gameState.waveInProgress = false;
    gameState.enemies = [];
    gameState.spawningEnemies = false;

    // This will trigger the power-up choice
    await onEndWave();

    assert.strictEqual(uiElements.wave16PowerChoiceModal.classList.contains('hidden'), false, 'Power-up modal should be visible after wave 15 ends.');
    assert.strictEqual(gameState.wave, 15, 'Wave should still be 15 before a choice is made.');

    // Simulate choosing the "DELETE" power-up
    // The click handler will call `continueToNextWave` which is passed into `showWave16PowerChoice`
    await simulatePowerUpChoice('delete-power-btn', () => {
        // This is a simplified version of continueToNextWave for the test
        gameState.wave++;
    });

    assert.strictEqual(gameState.wave, 16, 'Wave should advance to 16 after power-up is chosen.');
    assert.strictEqual(gameState.wave16PowerChosen, true, 'wave16PowerChosen flag should be set.');
    assert.strictEqual(uiElements.wave16PowerChoiceModal.classList.contains('hidden'), true, 'Modal should be hidden after choice.');
});