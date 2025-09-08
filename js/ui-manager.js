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
    mergeResultBenefitText: document.getElementById('merge-result-benefit-text'),
    mergeCostInfo: document.getElementById('merge-cost-info'),
    confirmMergeBtn: document.getElementById('confirm-merge-btn'),
    cancelMergeBtn: document.getElementById('cancel-merge-btn'),
    // New options menu elements
    optionsBtn: document.getElementById('options-btn'),
    optionsMenu: document.getElementById('options-menu'),
    closeOptionsBtn: document.getElementById('close-options-btn'),
    toggleMergeConfirm: document.getElementById('toggle-merge-confirm-checkbox'),
    // Cached stat elements
    statDamageP: document.getElementById('stat-damage-p'),
    statDamage: document.getElementById('stat-damage'),
    statRangeP: document.getElementById('stat-range-p'),
    statRange: document.getElementById('stat-range'),
    statSpeedP: document.getElementById('stat-speed-p'),
    statSpeed: document.getElementById('stat-speed'),
    statSplashP: document.getElementById('stat-splash-p'),
    statSplash: document.getElementById('stat-splash'),
    statProjectilesP: document.getElementById('stat-projectiles-p'),
    statProjectiles: document.getElementById('stat-projectiles'),
    statBoostP: document.getElementById('stat-boost-p'),
    statBoost: document.getElementById('stat-boost'), // FIX: Added the missing element
    statSlowP: document.getElementById('stat-slow-p'),
    statGoldP: document.getElementById('stat-gold-p'),
    statGold: document.getElementById('stat-gold'),
    statBurnP: document.getElementById('stat-burn-p'),
    statBurn: document.getElementById('stat-burn'),
    statSpecialP: document.getElementById('stat-special-p'),
    statSpecial: document.getElementById('stat-special'),
    statFragsP: document.getElementById('stat-frags-p'),
    statFrags: document.getElementById('stat-frags'),
    statPinsP: document.getElementById('stat-pins-p'),
    statPins: document.getElementById('stat-pins'),
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

        // Hide the move to cloud button entirely if cloud is not unlocked
        if (isCloudUnlocked) {
            if (uiElements.moveToCloudBtn) uiElements.moveToCloudBtn.style.display = 'flex';
            if (uiElements.sellTowerBtn) uiElements.sellTowerBtn.classList.remove('col-span-2');
        } else {
            if (uiElements.moveToCloudBtn) uiElements.moveToCloudBtn.style.display = 'none';
            if (uiElements.sellTowerBtn) uiElements.sellTowerBtn.classList.add('col-span-2');
        }
        
        let levelText;
        if (selectedTower.type === 'ORBIT') {
            const totalUpgrades = selectedTower.upgradeCount;
            if (totalUpgrades >= 4) {
                levelText = '<span class="material-icons">star</span> MAX LEVEL';
            } else {
                levelText = `LVL ${totalUpgrades + 1}`;
            }

            // Display stats specific to ORBIT tower
            if (uiElements.statDamageP) uiElements.statDamageP.classList.remove('hidden');
            if (uiElements.statDamage) uiElements.statDamage.textContent = (selectedTower.damage * selectedTower.damageMultiplier).toFixed(1);

            if (uiElements.statProjectilesP) uiElements.statProjectilesP.classList.remove('hidden');
            if (uiElements.statProjectiles) uiElements.statProjectiles.textContent = selectedTower.orbiters.length;

            if (uiElements.statRangeP) uiElements.statRangeP.classList.add('hidden');
            if (uiElements.statSpeedP) uiElements.statSpeedP.classList.add('hidden');
            if (uiElements.statSplashP) uiElements.statSplashP.classList.add('hidden');
            if (uiElements.statBoostP) uiElements.statBoostP.classList.add('hidden');
            if (uiElements.statSlowP) uiElements.statSlowP.classList.add('hidden');
            if (uiElements.statGoldP) uiElements.statGoldP.classList.add('hidden');
            if (uiElements.statBurnP) uiElements.statBurnP.classList.add('hidden');
            if (uiElements.statFragsP) uiElements.statFragsP.classList.add('hidden');
            if (uiElements.statPinsP) uiElements.statPinsP.classList.add('hidden');
        } else if (selectedTower.level === 'MAX LEVEL') {
            levelText = '<span class="material-icons">star</span> MAX LEVEL';
        } else if (selectedTower.level === 1 && (selectedTower.type === 'PIN' || selectedTower.type === 'CASTLE')) {
            levelText = '';
        } else {
            // FIX: Use the main level counter for display, as it is incremented on all tower upgrades,
            // unlike damageLevel which is specific to certain merges.
            const visualLevel = selectedTower.level;
            levelText = `LVL ${visualLevel}`;
        }
        
        // Fort-specific level display logic
        if (selectedTower.type === 'FORT') {
            if (selectedTower.level === 'MAX LEVEL') {
                levelText = '<span class="material-icons">star</span> MAX LEVEL';
            } else {
                const visualLevel = (typeof selectedTower.level === 'string' && selectedTower.level === 'MAX LEVEL') ? 5 : (selectedTower.level + selectedTower.damageLevel - 1);
                levelText = `LVL ${visualLevel}`;
            }
        }
        
        // Hide all stat paragraphs by default
        [
            uiElements.statDamageP, uiElements.statSpeedP, uiElements.statSplashP,
            uiElements.statBoostP, uiElements.statSlowP, uiElements.statGoldP,
            uiElements.statBurnP, uiElements.statSpecialP, uiElements.statProjectilesP,
            uiElements.statRangeP, uiElements.statFragsP, uiElements.statPinsP
        ].forEach(p => {
            if (p) p.classList.add('hidden');
        });

        if (uiElements.selectedTowerInfoEl) uiElements.selectedTowerInfoEl.innerHTML = `${selectedTower.type.replace('_', ' ')} ${levelText}`;
        if (uiElements.sellTowerBtn) uiElements.sellTowerBtn.textContent = `SELL FOR ${sellValue}G`;
        if (isCloudUnlocked) {
            if (uiElements.moveToCloudBtn) uiElements.moveToCloudBtn.style.display = 'flex';
            if (uiElements.sellTowerBtn) uiElements.sellTowerBtn.classList.remove('col-span-2');
        } else {
            if (uiElements.moveToCloudBtn) uiElements.moveToCloudBtn.style.display = 'none';
            if (uiElements.sellTowerBtn) uiElements.sellTowerBtn.classList.add('col-span-2');
        }
        if (uiElements.toggleModeBtn) uiElements.toggleModeBtn.classList.add('hidden');
        if (uiElements.toggleTargetingBtn) uiElements.toggleTargetingBtn.classList.add('hidden');
        if (['ENT', 'ORBIT', 'CAT'].includes(selectedTower.type)) {
            if (uiElements.toggleModeBtn) uiElements.toggleModeBtn.classList.remove('hidden');
            if (selectedTower.type === 'ENT' || selectedTower.type === 'CAT') {
                if (uiElements.toggleModeBtn) uiElements.toggleModeBtn.textContent = `MODE: ${selectedTower.mode.toUpperCase()}`;
            } else if (selectedTower.type === 'ORBIT') {
                if (uiElements.toggleModeBtn) uiElements.toggleModeBtn.textContent = `ORBIT: ${selectedTower.orbitMode.toUpperCase()}`;
            }
        }
        if (selectedTower.type !== 'SUPPORT' && selectedTower.type !== 'ENT' && selectedTower.type !== 'CAT' && selectedTower.type !== 'ORBIT') {
            if (uiElements.toggleTargetingBtn) uiElements.toggleTargetingBtn.classList.remove('hidden');
            if (uiElements.toggleTargetingBtn) uiElements.toggleTargetingBtn.textContent = `TARGET: ${selectedTower.targetingMode.toUpperCase()}`;
            if (uiElements.toggleTargetingBtn) {
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
        }
        
        // Display stats based on tower type
        if (selectedTower.type !== 'ORBIT' && selectedTower.type !== 'ENT' && selectedTower.type !== 'SUPPORT' && selectedTower.type !== 'CAT') {
            if (uiElements.statRangeP) uiElements.statRangeP.classList.remove('hidden');
            if (uiElements.statRange) uiElements.statRange.textContent = Math.round(selectedTower.range);
        }
        const baseStats = TOWER_TYPES[selectedTower.type];
        if (baseStats.special) {
            if (uiElements.statSpecialP) uiElements.statSpecialP.classList.remove('hidden');
            if (uiElements.statSpecial) uiElements.statSpecial.textContent = baseStats.special;
        }

        if (selectedTower.hasFragmentingShot) {
            if (uiElements.statFragsP) uiElements.statFragsP.classList.remove('hidden');
            if (uiElements.statFrags) uiElements.statFrags.textContent = selectedTower.fragmentBounces;
            if (uiElements.statSpecial) uiElements.statSpecial.textContent = 'Fragmenting Shot';
        }

        if (selectedTower.type === 'NAT') {
            if (uiElements.statProjectilesP) uiElements.statProjectilesP.classList.remove('hidden');
            if (uiElements.statProjectiles) uiElements.statProjectiles.textContent = selectedTower.projectileCount || 1;
        }
        if (selectedTower.type === 'ORBIT') {
            if (uiElements.statDamageP) uiElements.statDamageP.classList.remove('hidden');
            if (uiElements.statDamage) uiElements.statDamage.textContent = (selectedTower.damage * selectedTower.damageMultiplier).toFixed(1);

            if (uiElements.statProjectilesP) uiElements.statProjectilesP.classList.remove('hidden');
            if (uiElements.statProjectiles) uiElements.statProjectiles.textContent = selectedTower.orbiters.length;
            
            if (uiElements.statRangeP) uiElements.statRangeP.classList.add('hidden');
            if (uiElements.statSpeedP) uiElements.statSpeedP.classList.add('hidden');
        }
     // The core logic fix for the splash stat display.
     if (selectedTower.splashRadius > 0) {
        if (uiElements.statSplashP) uiElements.statSplashP.classList.remove('hidden');
        if (uiElements.statSplash) {
            uiElements.statSplash.textContent = Math.round(selectedTower.splashRadius);
        }
    }


        if (selectedTower.type === 'ENT' || selectedTower.type === 'SUPPORT' || selectedTower.type === 'CAT') {
            if (selectedTower.type === 'CAT') {
                if (uiElements.statGoldP) uiElements.statGoldP.classList.remove('hidden');
                if (uiElements.statGold) {
                    const goldPercent = ((selectedTower.goldBonus - 1) * 100).toFixed(0);
                    uiElements.statGold.textContent = `${goldPercent}%`;
                }
            }
            if (selectedTower.type === 'ENT' || selectedTower.type === 'CAT') {
                if (selectedTower.mode === 'boost') {
                    // Corrected line to access the correct UI elements.
                    if (uiElements.statBoostP) uiElements.statBoostP.classList.remove('hidden');
                    if (uiElements.statBoost) {
                        const boostPercent = ((1 - selectedTower.attackSpeedBoost) * 100).toFixed(0);
                        uiElements.statBoost.textContent = `${boostPercent}% Spd & ${((selectedTower.damageBoost - 1) * 100).toFixed(0)}% Dmg`;
                    }
                    if (uiElements.statSlowP) uiElements.statSlowP.classList.add('hidden');
                } else {
                    if (uiElements.statSlowP) uiElements.statSlowP.classList.remove('hidden');
                    if (uiElements.statSlow) {
                        const slowPercent = ((1 - selectedTower.enemySlow) * 100).toFixed(0);
                        uiElements.statSlow.textContent = `${slowPercent}%`;
                    }
                    if (uiElements.statBoostP) uiElements.statBoostP.classList.add('hidden');
                }
            } else {
                if (uiElements.statBoostP) uiElements.statBoostP.classList.remove('hidden');
                if (uiElements.statBoost) {
                    const boostPercent = ((1 - selectedTower.attackSpeedBoost) * 100).toFixed(0);
                    uiElements.statBoost.textContent = `${boostPercent}%`;
                }
            }
        } else {
            if (uiElements.statDamageP) uiElements.statDamageP.classList.remove('hidden');
            if (uiElements.statSpeedP) uiElements.statSpeedP.classList.remove('hidden');
            if (uiElements.statDamage) {
                const finalDamage = (selectedTower.damage * selectedTower.damageMultiplier).toFixed(1);
                uiElements.statDamage.textContent = finalDamage;
            }
            if (selectedTower.type !== 'ORBIT') {
                if (uiElements.statSpeed) uiElements.statSpeed.textContent = (60 / selectedTower.fireRate).toFixed(2);
            } else {
                if (uiElements.statSpeedP) uiElements.statSpeedP.classList.add('hidden');
            }
            
            if (selectedTower.type === 'FIREPLACE') {
                if (uiElements.statBurnP) uiElements.statBurnP.classList.remove('hidden');
                if (uiElements.statBurn) uiElements.statBurn.textContent = `${selectedTower.burnDps.toFixed(1)}/s for ${selectedTower.burnDuration}s`;
            }
        }
    } else {
        if (uiElements.towerButtons) uiElements.towerButtons.classList.remove('hidden');
        if (uiElements.gameControls) uiElements.gameControls.classList.remove('hidden');
        if (uiElements.towersTitle) uiElements.towersTitle.classList.remove('hidden');
        if (uiElements.sellPanel) uiElements.sellPanel.classList.add('hidden');
        if (uiElements.selectedTowerInfoEl) uiElements.selectedTowerInfoEl.textContent = '';
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
    if (container) {
        container.innerHTML = '';
        container.appendChild(iconEl);
    }
}

export function showMergeConfirmation(mergeState) {
    if (uiElements.mergeFromTowerIconContainer) createAndAppendIcon(uiElements.mergeFromTowerIconContainer, mergeState.existingTower.type);
    if (uiElements.mergeFromTowerName) uiElements.mergeFromTowerName.textContent = mergeState.existingTower.type.replace('_', ' ');
    if (uiElements.mergeToTowerIconContainer) createAndAppendIcon(uiElements.mergeToTowerIconContainer, mergeState.placingTowerType);
    if (uiElements.mergeToTowerName) uiElements.mergeToTowerName.textContent = mergeState.placingTowerType.replace('_', ' ');
    if (uiElements.mergeResultTowerIconContainer) createAndAppendIcon(uiElements.mergeResultTowerIconContainer, mergeState.mergeInfo.resultType);

    let resultName = mergeState.mergeInfo.text.replace('LVL ', 'LVL-').replace('_', ' ');
    if (uiElements.mergeResultBenefitText) uiElements.mergeResultBenefitText.textContent = '';
    if (resultName.toLowerCase() === 'upgrade' && mergeState.mergeInfo.upgrade) {
        resultName = mergeState.mergeInfo.resultType.replace('_', ' ');
        if (uiElements.mergeResultBenefitText) uiElements.mergeResultBenefitText.textContent = mergeState.mergeInfo.upgrade.text;
    }

    if (uiElements.mergeResultTowerName) uiElements.mergeResultTowerName.textContent = resultName;

    let cost = TOWER_TYPES[mergeState.placingTowerType].cost;
    if (mergeState.placingFromCloud || mergeState.mergingFromCanvas) {
        cost = mergeState.mergingTower.cost;
    }
    if (uiElements.mergeCostInfo) uiElements.mergeCostInfo.textContent = `Cost: ${cost}G`;
    if (uiElements.mergeConfirmModal) uiElements.mergeConfirmModal.classList.remove('hidden');
}

export function triggerGameOver(isWin, wave) {
    if (uiElements.gameOverModal) uiElements.gameOverModal.classList.remove('hidden');
    if (isWin) {
        if (uiElements.gameOverTitle) uiElements.gameOverTitle.textContent = "YOU WIN!";
        if (uiElements.gameOverMessage) uiElements.gameOverMessage.textContent = `You conquered all ${wave} waves!`;
    } else {
        if (uiElements.gameOverTitle) uiElements.gameOverTitle.textContent = "GAME OVER";
        if (uiElements.gameOverMessage) uiElements.gameOverMessage.textContent = `You survived ${wave} waves.`;
    }
}