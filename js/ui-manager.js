import { TOWER_TYPES } from './constants.js';

export const uiElements = {
    livesEl: document.getElementById('lives'),
    goldEl: document.getElementById('gold'),
    waveEl: document.getElementById('wave'),
    startWaveBtn: document.getElementById('start-wave'),
    buyPinBtn: document.getElementById('buy-pin'),
    buyCastleBtn: document.getElementById('buy-castle'),
    buySupportBtn: document.getElementById('buy-support'),
    gameOverModal: document.getElementById('game-over-modal'),
    gameOverTitle: document.getElementById('game-over-title'),
    gameOverMessage: document.getElementById('game-over-message'),
    restartGameBtn: document.getElementById('restart-game'),
    sellPanel: document.getElementById('sell-panel'),
    sellTowerBtn: document.getElementById('sell-tower'),
    toggleModeBtn: document.getElementById('toggle-mode'),
    speedToggleBtn: document.getElementById('speed-toggle'),
    selectedTowerInfoEl: document.getElementById('selected-tower-info')
};

export function updateUI(state) {
    uiElements.livesEl.textContent = state.lives;
    uiElements.goldEl.textContent = state.gold;
    uiElements.waveEl.textContent = state.wave;
    uiElements.buyPinBtn.disabled = state.gold < TOWER_TYPES.PIN.cost;
    uiElements.buyCastleBtn.disabled = state.gold < TOWER_TYPES.CASTLE.cost;
    uiElements.buySupportBtn.disabled = state.gold < TOWER_TYPES.SUPPORT.cost;
}

export function updateSellPanel(selectedTower) {
    if (selectedTower) {
        const sellValue = Math.floor(selectedTower.cost * 0.5);
        uiElements.selectedTowerInfoEl.textContent = `${selectedTower.type.replace('_', ' ')} LVL ${selectedTower.level}`;
        uiElements.sellTowerBtn.textContent = `SELL FOR ${sellValue}G`;

        const baseStats = TOWER_TYPES[selectedTower.type];
        const isAuraTower = selectedTower.type === 'SUPPORT' || selectedTower.type === 'ENT';

        // Hide all optional stats by default
        document.getElementById('stat-damage-p').classList.add('hidden');
        document.getElementById('stat-speed-p').classList.add('hidden');
        document.getElementById('stat-splash-p').classList.add('hidden');
        document.getElementById('stat-boost-p').classList.add('hidden');
        document.getElementById('stat-slow-p').classList.add('hidden');
        document.getElementById('stat-burn-p').classList.add('hidden');
        document.getElementById('stat-special-p').classList.add('hidden');
        uiElements.toggleModeBtn.classList.add('hidden');

        // Show common stats
        document.getElementById('stat-range-p').classList.remove('hidden');
        document.getElementById('stat-range').textContent = Math.round(selectedTower.range);

        // Show special if it exists
        if (baseStats.special) {
            document.getElementById('stat-special-p').classList.remove('hidden');
            document.getElementById('stat-special').textContent = baseStats.special;
        }

        // Show stats based on tower type
        if (isAuraTower) {
            if (selectedTower.type === 'ENT') {
                 uiElements.toggleModeBtn.classList.remove('hidden');
                 uiElements.toggleModeBtn.textContent = `MODE: ${selectedTower.mode.toUpperCase()}`;
                 if (selectedTower.mode === 'boost') {
                    document.getElementById('stat-boost-p').classList.remove('hidden');
                    const boostPercent = ((1 - selectedTower.attackSpeedBoost) * 100).toFixed(0);
                    document.getElementById('stat-boost').textContent = `${boostPercent}% Spd & ${((selectedTower.damageBoost-1)*100).toFixed(0)}% Dmg`;
                 } else { // slow mode
                    document.getElementById('stat-slow-p').classList.remove('hidden');
                    const slowPercent = ((1 - selectedTower.enemySlow) * 100).toFixed(0);
                    document.getElementById('stat-slow').textContent = `${slowPercent}%`;
                 }
            } else { // Support Tower
                document.getElementById('stat-boost-p').classList.remove('hidden');
                const boostPercent = ((1 - selectedTower.attackSpeedBoost) * 100).toFixed(0);
                document.getElementById('stat-boost').textContent = `${boostPercent}%`;
            }
        } else { // Attacking towers
            document.getElementById('stat-damage-p').classList.remove('hidden');
            document.getElementById('stat-speed-p').classList.remove('hidden');
            document.getElementById('stat-damage').textContent = selectedTower.damage.toFixed(1);
            document.getElementById('stat-speed').textContent = (60 / selectedTower.fireRate).toFixed(2);
            
            if (selectedTower.splashRadius > 0) {
                document.getElementById('stat-splash-p').classList.remove('hidden');
                document.getElementById('stat-splash').textContent = Math.round(selectedTower.splashRadius);
            }
            if (selectedTower.type === 'FIREPLACE') {
                document.getElementById('stat-burn-p').classList.remove('hidden');
                document.getElementById('stat-burn').textContent = `${selectedTower.burnDps.toFixed(1)}/s for ${selectedTower.burnDuration}s`;
            }
        }

        uiElements.sellPanel.classList.remove('hidden');
    } else {
        uiElements.selectedTowerInfoEl.textContent = '';
        uiElements.sellPanel.classList.add('hidden');
    }
}

export function triggerGameOver(isWin, wave) {
    uiElements.gameOverModal.classList.remove('hidden');
    if (isWin) {
        uiElements.gameOverTitle.textContent = "YOU WIN!";
        uiElements.gameOverMessage.textContent = `You conquered all ${wave} waves!`;
    } else {
        uiElements.gameOverTitle.textContent = "GAME OVER";
        uiElements.gameOverMessage.textContent = `You survived ${wave -1} waves.`;
    }
}