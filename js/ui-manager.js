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
    sellTowerBtn: document.getElementById('sell-tower-btn'),
    moveToCloudBtn: document.getElementById('move-to-cloud-btn'),
    toggleModeBtn: document.getElementById('toggle-mode'),
    speedToggleBtn: document.getElementById('speed-toggle'),
    selectedTowerInfoEl: document.getElementById('selected-tower-info'),
    soundToggleBtn: document.getElementById('sound-toggle-btn'),
    // New elements for showing/hiding UI sections
    towerButtons: document.getElementById('tower-buttons'),
    gameControls: document.getElementById('game-controls'),
    towersTitle: document.getElementById('towers-title'),
    // Cloud inventory elements
    cloudButton: document.getElementById('cloud-button'),
    cloudIcon: document.getElementById('cloud-icon'),
    cloudText: document.getElementById('cloud-text'),
    cloudInventoryPanel: document.getElementById('cloud-inventory-panel'),
    cloudInventorySlots: document.getElementById('cloud-inventory-slots'),
    cloudTooltipContainer: document.getElementById('cloud-tooltip-container'),
    // New merge confirmation elements
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

    // Handle the cloud button state
    if(state.isCloudUnlocked) {
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
        
        // Update sell button text
        uiElements.sellTowerBtn.textContent = `SELL FOR ${sellValue}G`;

        // Handle visibility of sell/cloud buttons based on cloud status
        if(isCloudUnlocked) {
            uiElements.moveToCloudBtn.classList.remove('hidden');
            uiElements.sellTowerBtn.classList.remove('col-span-2');
        } else {
            uiElements.moveToCloudBtn.classList.add('hidden');
            uiElements.sellTowerBtn.classList.add('col-span-2');
        }


        // Hide toggle button by default, show it for specific towers
        uiElements.toggleModeBtn.classList.add('hidden');
        if (['ENT', 'ORBIT', 'CAT'].includes(selectedTower.type)) {
            uiElements.toggleModeBtn.classList.remove('hidden');
            if (selectedTower.type === 'ENT' || selectedTower.type === 'CAT') {
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
        document.getElementById('stat-gold-p').classList.add('hidden');
        document.getElementById('stat-burn-p').classList.add('hidden');
        document.getElementById('stat-special-p').classList.add('hidden');
        document.getElementById('stat-projectiles-p').classList.add('hidden');

        // Show common stats, but hide range for ORBIT tower
        if (selectedTower.type !== 'ORBIT') {
            document.getElementById('stat-range-p').classList.remove('hidden');
            document.getElementById('stat-range').textContent = Math.round(selectedTower.range);
        } else {
            document.getElementById('stat-range-p').classList.add('hidden');
        }

        // Show special if it exists
        const baseStats = TOWER_TYPES[selectedTower.type];
        if (baseStats.special) {
            document.getElementById('stat-special-p').classList.remove('hidden');
            document.getElementById('stat-special').textContent = baseStats.special;
        }

        // Show stats based on tower type
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

/**
 * Gets the correct icon string and the class needed to display it.
 * This function is local to main.js, so we'll re-implement it here to keep this file self-contained.
 * @param {string} type - The tower type (e.g., 'PIN').
 * @returns {{icon: string, className: string}}
 */
function getTowerIconInfo(type) {
    let icon;
    let className = 'material-icons'; // Default to the standard icon set
    switch (type) {
        case 'PIN': icon = 'location_pin'; break;
        case 'CASTLE': icon = 'castle'; break;
        case 'FORT': icon = 'fort'; break;
        case 'SUPPORT': icon = 'support_agent'; break;
        case 'PIN_HEART': 
            icon = 'map_pin_heart'; 
            className = "material-symbols-outlined";
            break;
        case 'FIREPLACE':
            icon = 'fireplace';
            className = "material-symbols-outlined";
            break;
        case 'NAT':
            icon = 'nat';
            className = "material-symbols-outlined";
            break;
        case 'ENT':
            icon = 'psychology';
            className = "material-symbols-outlined";
            break;
        case 'ORBIT':
            icon = 'orbit';
            className = "material-symbols-outlined";
            break;
        case 'CAT':
            icon = 'cat';
            className = "fa-solid";
            break;
        default:
            icon = 'help'; // Default icon for unknown types
            break;
    }
    return { icon, className };
}

/**
 * Creates and appends an icon element to a container.
 * @param {HTMLElement} container - The container to append the icon to.
 * @param {string} type - The tower type to get icon info for.
 */
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

/**
 * Fills the merge confirmation modal with the correct info and shows it.
 * @param {object} mergeState - The object holding merge info (existingTower, placingTowerType, mergeInfo).
 */
export function showMergeConfirmation(mergeState) {
    // Populate modal content
    createAndAppendIcon(uiElements.mergeFromTowerIconContainer, mergeState.existingTower.type);
    uiElements.mergeFromTowerName.textContent = mergeState.existingTower.type.replace('_', ' ');

    createAndAppendIcon(uiElements.mergeToTowerIconContainer, mergeState.placingTowerType);
    uiElements.mergeToTowerName.textContent = mergeState.placingTowerType.replace('_', ' ');

    createAndAppendIcon(uiElements.mergeResultTowerIconContainer, mergeState.mergeInfo.resultType);
    const resultName = mergeState.mergeInfo.text.replace('LVL ', 'LVL-').replace('_', ' ');
    uiElements.mergeResultTowerName.textContent = resultName;
    
    // Calculate cost based on where the tower is coming from
    let cost = TOWER_TYPES[mergeState.placingTowerType].cost;
    if (mergeState.placingFromCloud || mergeState.draggedCanvasTower) {
        cost = mergeState.placingFromCloud?.cost || mergeState.draggedCanvasTower.cost;
    }
    
    uiElements.mergeCostInfo.textContent = `Cost: ${cost}G`;

    // Show the modal
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
