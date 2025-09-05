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
    selectedTowerInfoEl: document.getElementById('selected-tower-info'),
    soundToggleBtn: document.getElementById('sound-toggle-btn'),
    upgradeTowerBtn: document.getElementById('upgrade-tower'),
    // New elements for showing/hiding UI sections
    towerButtons: document.getElementById('tower-buttons'),
    gameControls: document.getElementById('game-controls'),
    towersTitle: document.getElementById('towers-title')
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
        // Hide general controls and show sell panel
        uiElements.towerButtons.classList.add('hidden');
        uiElements.gameControls.classList.add('hidden');
        uiElements.towersTitle.classList.add('hidden');
        uiElements.sellPanel.classList.remove('hidden');

        const sellValue = Math.floor(selectedTower.cost * 0.5);
        
        let levelText;
        if (selectedTower.level === 'MAX LEVEL') {
            levelText = '<span class="material-icons">star</span> MAX LEVEL';
        } else {
            levelText = `LVL ${selectedTower.level}`;
        }

        uiElements.selectedTowerInfoEl.innerHTML = `${selectedTower.type.replace('_', ' ')} ${levelText}`;
        uiElements.sellTowerBtn.textContent = `SELL FOR ${sellValue}G`;

        // Check if the tower can be upgraded
        const baseStats = TOWER_TYPES[selectedTower.type];
        const canUpgrade = ['PIN', 'CASTLE'].includes(selectedTower.type);
        const isMaxLevel = selectedTower.level === 5 || selectedTower.level === 'MAX LEVEL';
        const upgradeCost = baseStats.cost;

        if (canUpgrade && !isMaxLevel) {
            uiElements.upgradeTowerBtn.classList.remove('hidden');
            uiElements.upgradeTowerBtn.textContent = `UPGRADE FOR ${upgradeCost}G`;
            uiElements.upgradeTowerBtn.disabled = window.gold < upgradeCost;
        } else {
            uiElements.upgradeTowerBtn.classList.add('hidden');
        }

        // Hide toggle button by default, show it for specific towers
        uiElements.toggleModeBtn.classList.add('hidden');
        if (['ENT', 'ORBIT'].includes(selectedTower.type)) {
            uiElements.toggleModeBtn.classList.remove('hidden');
            if (selectedTower.type === 'ENT') {
                uiElements.toggleModeBtn.textContent = `MODE: ${selectedTower.mode.toUpperCase()}`;
            } else if (selectedTower.type === 'ORBIT') {
                uiElements.toggleModeBtn.textContent = `ORBIT: ${selectedTower.orbitMode.toUpperCase()}`;
            }
        }

        // Hide all optional stats by default
        document.getElementById('stat-damage-p').classList.add('hidden');
        document.getElementById('stat-speed-p').classList.add('hidden');
        document.getElementById('stat-splash-p').classList.add('hidden');
        document.getElementById('stat-boost-p').classList.add('hidden');
        document.getElementById('stat-slow-p').classList.add('hidden');
        document.getElementById('stat-burn-p').classList.add('hidden');
        document.getElementById('stat-special-p').classList.add('hidden');

        // Show common stats, but hide range for ORBIT tower
        if (selectedTower.type !== 'ORBIT') {
            document.getElementById('stat-range-p').classList.remove('hidden');
            document.getElementById('stat-range').textContent = Math.round(selectedTower.range);
        } else {
            document.getElementById('stat-range-p').classList.add('hidden');
        }

        // Show special if it exists
        if (baseStats.special) {
            document.getElementById('stat-special-p').classList.remove('hidden');
            document.getElementById('stat-special').textContent = baseStats.special;
        }

        // Show stats based on tower type
        if (selectedTower.type === 'ENT' || selectedTower.type === 'SUPPORT') {
            if (selectedTower.type === 'ENT') {
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
            document.getElementById('stat-damage').textContent = (selectedTower.damage * selectedTower.damageMultiplier).toFixed(1);
            // For ORBIT tower, fire rate isn't applicable, so we hide it.
            if (selectedTower.type !== 'ORBIT') {
                document.getElementById('stat-speed').textContent = (60 / selectedTower.fireRate).toFixed(2);
            } else {
                 document.getElementById('stat-speed-p').classList.add('hidden');
            }
            
            if (selectedTower.splashRadius > 0) {
                document.getElementById('stat-splash-p').classList.remove('hidden');
                document.getElementById('stat-splash').textContent = Math.round(selectedTower.splashRadius);
            }
            if (selectedTower.type === 'FIREPLACE') {
                document.getElementById('stat-burn-p').classList.remove('hidden');
                document.getElementById('stat-burn').textContent = `${selectedTower.burnDps.toFixed(1)}/s for ${selectedTower.burnDuration}s`;
            }
        }

    } else {
        // Show general controls and hide sell panel
        uiElements.towerButtons.classList.remove('hidden');
        uiElements.gameControls.classList.remove('hidden');
        uiElements.towersTitle.classList.remove('hidden');
        uiElements.sellPanel.classList.add('hidden');
        uiElements.selectedTowerInfoEl.textContent = '';
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
