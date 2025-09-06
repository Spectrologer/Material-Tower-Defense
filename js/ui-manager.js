import { TOWER_TYPES } from './constants.js';
import { getTowerIconInfo } from './drawing-function.js';

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
    sellTowerBtn: document.getElementById('sell-tower-btn'),
    moveToCloudBtn: document.getElementById('move-to-cloud-btn'),
    toggleModeBtn: document.getElementById('toggle-mode'),
    toggleTargetingBtn: document.getElementById('toggle-targeting'),
    speedToggleBtn: document.getElementById('speed-toggle'),
    selectedTowerInfoEl: document.getElementById('selected-tower-info'),
    soundToggleBtn: document.getElementById('sound-toggle-btn'),
    towerButtons: document.getElementById('tower-buttons'),
    gameControls: document.getElementById('game-controls'),
    towersTitle: document.getElementById('towers-title'),
    cloudButton: document.getElementById('cloud-button'),
    cloudIcon: document.getElementById('cloud-icon'),
    cloudText: document.getElementById('cloud-text'),
    cloudInventoryPanel: document.getElementById('cloud-inventory-panel'),
    cloudInventorySlots: document.getElementById('cloud-inventory-slots'),
    cloudTooltipContainer: document.getElementById('cloud-tooltip-container'),
    mergeConfirmModal: document.getElementById('merge-confirm-modal'),
    mergeFromTowerIconContainer: document.getElementById('merge-from-tower-icon-container'),
    mergeFromTowerName: document.getElementById('merge-from-tower-name'),
    mergeToTowerIconContainer: document.getElementById('merge-to-tower-icon-container'),
    mergeToTowerName: document.getElementById('merge-to-tower-name'),
    mergeResultTowerIconContainer: document.getElementById('merge-result-tower-icon-container'),
    mergeResultTowerName: document.getElementById('merge-result-tower-name'),
    mergeCostInfo: document.getElementById('merge-cost-info'),
    confirmMergeBtn: document.getElementById('confirm-merge-btn'),
    cancelMergeBtn: document.getElementById('cancel-merge-btn'),
};

export function updateUI(state) {
    uiElements.livesEl.textContent = state.lives;
    uiElements.goldEl.textContent = state.gold;
    uiElements.waveEl.textContent = state.wave;
    uiElements.buyPinBtn.disabled = state.gold < TOWER_TYPES.PIN.cost;
    uiElements.buyCastleBtn.disabled = state.gold < TOWER_TYPES.CASTLE.cost;
    uiElements.buySupportBtn.disabled = state.gold < TOWER_TYPES.SUPPORT.cost;

    if (state.isCloudUnlocked) {
        uiElements.cloudButton.disabled = false;
        uiElements.cloudIcon.textContent = 'cloud_done';
        uiElements.cloudText.classList.add('hidden');
    } else {
        uiElements.cloudButton.disabled = state.gold < 100;
        uiElements.cloudIcon.textContent = 'cloud_download';
        uiElements.cloudText.classList.remove('hidden');
    }
}

export function updateSellPanel(selectedTower, isCloudUnlocked) {
    if (selectedTower) {
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
        if (isCloudUnlocked) {
            uiElements.moveToCloudBtn.classList.remove('hidden');
            uiElements.sellTowerBtn.classList.remove('col-span-2');
        } else {
            uiElements.moveToCloudBtn.classList.add('hidden');
            uiElements.sellTowerBtn.classList.add('col-span-2');
        }
        uiElements.toggleModeBtn.classList.add('hidden');
        uiElements.toggleTargetingBtn.classList.add('hidden');
        if (['ENT', 'ORBIT', 'CAT'].includes(selectedTower.type)) {
            uiElements.toggleModeBtn.classList.remove('hidden');
            if (selectedTower.type === 'ENT' || selectedTower.type === 'CAT') {
                uiElements.toggleModeBtn.textContent = `MODE: ${selectedTower.mode.toUpperCase()}`;
            } else if (selectedTower.type === 'ORBIT') {
                uiElements.toggleModeBtn.textContent = `ORBIT: ${selectedTower.orbitMode.toUpperCase()}`;
            }
        }
        if (selectedTower.type !== 'SUPPORT' && selectedTower.type !== 'ENT' && selectedTower.type !== 'CAT') {
            uiElements.toggleTargetingBtn.classList.remove('hidden');
            uiElements.toggleTargetingBtn.textContent = `TARGET: ${selectedTower.targetingMode.toUpperCase()}`;
            uiElements.toggleTargetingBtn.classList.remove('bg-red-800', 'bg-yellow-400', 'bg-blue-800', 'border-red-400', 'border-yellow-300', 'border-blue-400', 'text-black', 'text-yellow-300', 'text-cyan-300');
            switch (selectedTower.targetingMode) {
                case 'strongest':
                    uiElements.toggleTargetingBtn.classList.add('bg-red-800', 'border-red-400', 'text-yellow-300');
                    break;
                case 'weakest':
                    uiElements.toggleTargetingBtn.classList.add('bg-yellow-400', 'border-yellow-300', 'text-black');
                    break;
                case 'furthest':
                    uiElements.toggleTargetingBtn.classList.add('bg-blue-800', 'border-blue-400', 'text-cyan-300');
                    break;
            }
        }
        document.getElementById('stat-damage-p').classList.add('hidden');
        document.getElementById('stat-speed-p').classList.add('hidden');
        document.getElementById('stat-splash-p').classList.add('hidden');
        document.getElementById('stat-boost-p').classList.add('hidden');
        document.getElementById('stat-slow-p').classList.add('hidden');
        document.getElementById('stat-gold-p').classList.add('hidden');
        document.getElementById('stat-burn-p').classList.add('hidden');
        document.getElementById('stat-special-p').classList.add('hidden');
        document.getElementById('stat-projectiles-p').classList.add('hidden');
        document.getElementById('stat-range-p').classList.add('hidden');
        if (selectedTower.type !== 'ORBIT' && selectedTower.type !== 'ENT' && selectedTower.type !== 'SUPPORT' && selectedTower.type !== 'CAT') {
            document.getElementById('stat-range-p').classList.remove('hidden');
            document.getElementById('stat-range').textContent = Math.round(selectedTower.range);
        }
        const baseStats = TOWER_TYPES[selectedTower.type];
        if (baseStats.special) {
            document.getElementById('stat-special-p').classList.remove('hidden');
            document.getElementById('stat-special').textContent = baseStats.special;
        }
        if (selectedTower.type === 'NAT') {
            document.getElementById('stat-projectiles-p').classList.remove('hidden');
            document.getElementById('stat-projectiles').textContent = selectedTower.projectileCount || 1;
        }
        if (selectedTower.type === 'ENT' || selectedTower.type === 'SUPPORT' || selectedTower.type === 'CAT') {
            if (selectedTower.type === 'CAT') {
                document.getElementById('stat-gold-p').classList.remove('hidden');
                const goldPercent = ((selectedTower.goldBonus - 1) * 100).toFixed(0);
                document.getElementById('stat-gold').textContent = `${goldPercent}%`;
            }
            if (selectedTower.type === 'ENT' || selectedTower.type === 'CAT') {
                if (selectedTower.mode === 'boost') {
                    document.getElementById('stat-boost-p').classList.remove('hidden');
                    const boostPercent = ((1 - selectedTower.attackSpeedBoost) * 100).toFixed(0);
                    document.getElementById('stat-boost').textContent = `${boostPercent}% Spd & ${((selectedTower.damageBoost - 1) * 100).toFixed(0)}% Dmg`;
                } else {
                    document.getElementById('stat-slow-p').classList.remove('hidden');
                    const slowPercent = ((1 - selectedTower.enemySlow) * 100).toFixed(0);
                    document.getElementById('stat-slow').textContent = `${slowPercent}%`;
                }
            } else {
                document.getElementById('stat-boost-p').classList.remove('hidden');
                const boostPercent = ((1 - selectedTower.attackSpeedBoost) * 100).toFixed(0);
                document.getElementById('stat-boost').textContent = `${boostPercent}%`;
            }
        } else {
            document.getElementById('stat-damage-p').classList.remove('hidden');
            document.getElementById('stat-speed-p').classList.remove('hidden');
            const finalDamage = (selectedTower.damage * selectedTower.damageMultiplier).toFixed(1);
            document.getElementById('stat-damage').textContent = finalDamage;
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
        uiElements.towerButtons.classList.remove('hidden');
        uiElements.gameControls.classList.remove('hidden');
        uiElements.towersTitle.classList.remove('hidden');
        uiElements.sellPanel.classList.add('hidden');
        uiElements.selectedTowerInfoEl.textContent = '';
    }
}

function createAndAppendIcon(container, type) {
    const iconInfo = getTowerIconInfo(type);
    let iconEl;
    if (iconInfo.className.startsWith('fa-')) {
        iconEl = document.createElement('i');
        iconEl.className = `${iconInfo.className} fa-${iconInfo.icon}`;
    } else {
        iconEl = document.createElement('span');
        iconEl.className = iconInfo.className;
        iconEl.textContent = iconInfo.icon;
    }
    const color = TOWER_TYPES[type]?.color || '#FFFFFF';
    iconEl.style.color = color;
    iconEl.style.fontSize = '2.5rem';
    container.innerHTML = '';
    container.appendChild(iconEl);
}

export function showMergeConfirmation(mergeState) {
    createAndAppendIcon(uiElements.mergeFromTowerIconContainer, mergeState.existingTower.type);
    uiElements.mergeFromTowerName.textContent = mergeState.existingTower.type.replace('_', ' ');
    createAndAppendIcon(uiElements.mergeToTowerIconContainer, mergeState.placingTowerType);
    uiElements.mergeToTowerName.textContent = mergeState.placingTowerType.replace('_', ' ');
    createAndAppendIcon(uiElements.mergeResultTowerIconContainer, mergeState.mergeInfo.resultType);
    const resultName = mergeState.mergeInfo.text.replace('LVL ', 'LVL-').replace('_', ' ');
    uiElements.mergeResultTowerName.textContent = resultName;
    let cost = TOWER_TYPES[mergeState.placingTowerType].cost;
    if (mergeState.placingFromCloud || mergeState.draggedCanvasTower) {
        cost = mergeState.placingFromCloud?.cost || mergeState.draggedCanvasTower.cost;
    }
    uiElements.mergeCostInfo.textContent = `Cost: ${cost}G`;
    uiElements.mergeConfirmModal.classList.remove('hidden');
}

export function triggerGameOver(isWin, wave) {
    uiElements.gameOverModal.classList.remove('hidden');
    if (isWin) {
        uiElements.gameOverTitle.textContent = "YOU WIN!";
        uiElements.gameOverMessage.textContent = `You conquered all ${wave} waves!`;
    } else {
        uiElements.gameOverTitle.textContent = "GAME OVER";
        uiElements.gameOverMessage.textContent = `You survived ${wave} waves.`;
    }
}
