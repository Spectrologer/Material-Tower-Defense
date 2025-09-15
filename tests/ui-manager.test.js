import assert from 'assert';
import { gameState, resetGameState } from '../js/game-state.js';
import { uiElements, showWave16PowerChoice } from '../js/ui-manager.js';

// Helper to simulate a button click and wait for the promise to resolve
async function simulatePowerUpChoice(buttonId) {
    // The showWave16PowerChoice function returns a promise that resolves when a choice is made.
    const choicePromise = showWave16PowerChoice();

    // Find the button and simulate a click
    const button = document.getElementById(buttonId);
    assert.ok(button, `Button with id ${buttonId} should exist`);
    button.click();

    // Wait for the promise to resolve, which happens after the click handler runs
    await choicePromise;
}

test('showWave16PowerChoice should show the modal', () => {
    resetGameState();
    uiElements.wave16PowerChoiceModal.classList.add('hidden');

    showWave16PowerChoice();

    assert.strictEqual(uiElements.wave16PowerChoiceModal.classList.contains('hidden'), false, 'Modal should be visible');
});

test('Choosing "DELETE" power-up should update game state correctly', async () => {
    resetGameState();
    assert.strictEqual(gameState.hasDelete, false, 'Initial state should not have delete power');
    assert.strictEqual(gameState.wave16PowerChosen, false, 'Initial state should not have power chosen');

    await simulatePowerUpChoice('delete-power-btn');

    assert.strictEqual(gameState.hasDelete, true, 'hasDelete should be true after choosing delete power');
    assert.strictEqual(gameState.wave16PowerChosen, true, 'wave16PowerChosen should be true');
    assert.strictEqual(uiElements.wave16PowerChoiceModal.classList.contains('hidden'), true, 'Modal should be hidden after choice');
});

test('Choosing "CLOUD" power-up should update game state correctly', async () => {
    resetGameState();
    const initialGold = gameState.gold;
    assert.strictEqual(gameState.hasPermanentCloud, false, 'Initial state should not have permanent cloud');
    assert.strictEqual(gameState.wave16PowerChosen, false, 'Initial state should not have power chosen');

    await simulatePowerUpChoice('cloud-power-btn');

    assert.strictEqual(gameState.hasPermanentCloud, true, 'hasPermanentCloud should be true after choosing cloud power');
    assert.strictEqual(gameState.isCloudUnlocked, true, 'isCloudUnlocked should be true after choosing cloud power');
    assert.strictEqual(gameState.gold, initialGold + 125, 'Gold should be increased by 125');
    assert.strictEqual(gameState.wave16PowerChosen, true, 'wave16PowerChosen should be true');
    assert.strictEqual(uiElements.wave16PowerChoiceModal.classList.contains('hidden'), true, 'Modal should be hidden after choice');
});

test('Choosing "+20 LIVES" power-up should update game state correctly', async () => {
    resetGameState();
    const initialLives = gameState.lives;
    assert.strictEqual(gameState.wave16PowerChosen, false, 'Initial state should not have power chosen');

    await simulatePowerUpChoice('lives-power-btn');

    assert.strictEqual(gameState.lives, initialLives + 20, 'Lives should be increased by 20');
    assert.strictEqual(gameState.wave16PowerChosen, true, 'wave16PowerChosen should be true');
    assert.strictEqual(uiElements.wave16PowerChoiceModal.classList.contains('hidden'), true, 'Modal should be hidden after choice');
});