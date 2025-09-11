import { TOWER_TYPES, ENEMY_TYPES } from './constants.js';
import { getTowerIconInfo } from './drawing-function.js';

/**
 * @param {string} id
 * @returns {HTMLButtonElement}
 */
function getButton(id) {
    return /** @type {HTMLButtonElement} */ (document.getElementById(id));
}

export const uiElements = {
    livesEl: document.getElementById('lives'),
    goldEl: document.getElementById('gold'),
    waveEl: document.getElementById('wave'),
    startWaveBtn: getButton('start-wave'),
    buyPinBtn: getButton('buy-pin'),
    buyCastleBtn: getButton('buy-castle'),
    buySupportBtn: getButton('buy-support'),
    gameOverModal: document.getElementById('game-over-modal'),
    gameOverTitle: document.getElementById('game-over-title'),
    gameOverMessage: document.getElementById('game-over-message'),
    restartGameBtn: getButton('restart-game'),
    sellPanel: document.getElementById('sell-panel'),
    sellTowerBtn: getButton('sell-tower-btn'),
    moveToCloudBtn: getButton('move-to-cloud-btn'),
    toggleModeBtn: getButton('toggle-mode'),
    toggleTargetingBtn: getButton('toggle-targeting'),
    setGroundTargetBtn: getButton('set-ground-target-btn'),
    speedToggleBtn: getButton('speed-toggle'),
    selectedTowerInfoEl: document.getElementById('selected-tower-info'),
    soundToggleBtn: getButton('sound-toggle-btn'),
    musicToggleBtn: getButton('music-toggle-btn'),
    towerButtons: document.getElementById('tower-buttons'),
    gameControls: document.getElementById('game-controls'),
    towersTitle: document.getElementById('towers-title'),
    cloudButton: getButton('cloud-button'),
    cloudIcon: document.getElementById('cloud-icon'),
    cloudText: document.getElementById('cloud-text'),
    cloudInventoryPanel: document.getElementById('cloud-inventory-panel'),
    cloudInventorySlots: document.getElementById('cloud-inventory-slots'),
    mergeConfirmModal: document.getElementById('merge-confirm-modal'),
    mergeFromTowerIconContainer: document.getElementById('merge-from-tower-icon-container'),
    mergeFromTowerName: document.getElementById('merge-from-tower-name'),
    mergeToTowerIconContainer: document.getElementById('merge-to-tower-icon-container'),
    mergeToTowerName: document.getElementById('merge-to-tower-name'),
    mergeResultTowerIconContainer: document.getElementById('merge-result-tower-icon-container'),
    mergeResultTowerName: document.getElementById('merge-result-tower-name'),
    mergeResultBenefitText: document.getElementById('merge-result-benefit-text'),
    mergeCostInfo: document.getElementById('merge-cost-info'),
    confirmMergeBtn: getButton('confirm-merge-btn'),
    cancelMergeBtn: getButton('cancel-merge-btn'),
    onboardingMergeTip: document.getElementById('onboarding-merge-tip'),
    onboardingDismissBtn: getButton('onboarding-dismiss-btn'),
    // New options menu elements
    optionsBtn: getButton('options-btn'),
    optionsMenu: document.getElementById('options-menu'),
    toggleMergeConfirm: /** @type {HTMLInputElement} */ (document.getElementById('toggle-merge-confirm-checkbox')),
    resetGameBtn: getButton('reset-game-btn'),
    libraryBtn: getButton('library-btn'),
    libraryModal: document.getElementById('library-modal'),
    libraryTowersTab: getButton('library-towers-tab'),
    libraryEnemiesTab: getButton('library-enemies-tab'),
    towerLibraryRolodex: document.getElementById('tower-library-rolodex'),
    enemyLibraryRolodex: document.getElementById('enemy-library-rolodex'),
    libraryPrevBtn: getButton('library-prev-btn'),
    libraryNextBtn: getButton('library-next-btn'),
    libraryCounter: document.getElementById('library-counter'),
    libraryCloseBtn: getButton('library-close-btn'),
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
    statSlow: document.getElementById('stat-slow'),
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
    towerKillCount: document.getElementById('tower-kill-count'),
    killCountValue: document.getElementById('kill-count-value'),
};

export function updateUI(state) {
    uiElements.livesEl.textContent = state.lives;
    uiElements.goldEl.textContent = state.gold;
    uiElements.waveEl.textContent = state.wave;
    uiElements.buyPinBtn.disabled = state.gold < TOWER_TYPES.PIN.cost;
    uiElements.buyCastleBtn.disabled = state.gold < TOWER_TYPES.CASTLE.cost;
    uiElements.buySupportBtn.disabled = state.gold < TOWER_TYPES.SUPPORT.cost;

    if (uiElements.onboardingMergeTip) {
        uiElements.onboardingMergeTip.classList.toggle('hidden', state.hasPerformedFirstMerge || state.onboardingTipDismissed);
    }

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

export function updateSellPanel(selectedTower, isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower = null) {
    // Always remove the icon first to handle deselection correctly.
    const existingIndicator = uiElements.sellPanel.querySelector('.detection-indicator-container');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    if (uiElements.setGroundTargetBtn) uiElements.setGroundTargetBtn.classList.add('hidden');

    if (selectedTower) {
        uiElements.towerButtons.classList.add('hidden');
        uiElements.gameControls.classList.add('hidden');
        uiElements.towersTitle.classList.add('hidden');
        uiElements.sellPanel.classList.remove('hidden');

        // Add the detection icon if the tower type is correct.
        if (['SUPPORT', 'ENT', 'CAT'].includes(selectedTower.type)) {
            const detectionRange = TOWER_TYPES[selectedTower.type].stealthDetectionRange;

            const indicatorContainer = document.createElement('div');
            indicatorContainer.className = 'detection-indicator-container absolute top-2 left-2 flex items-center gap-1 text-white';
            indicatorContainer.style.textShadow = '1px 1px 3px #000';

            const eyeIcon = document.createElement('span');
            eyeIcon.className = 'material-icons';
            eyeIcon.textContent = 'visibility';

            const rangeText = document.createElement('span');
            rangeText.className = 'text-sm font-bold';
            rangeText.textContent = `${detectionRange}x${detectionRange}`;

            indicatorContainer.appendChild(eyeIcon);
            indicatorContainer.appendChild(rangeText);

            uiElements.sellPanel.classList.add('relative'); // Ensure positioning context
            uiElements.sellPanel.prepend(indicatorContainer);
        }

        const sellValue = Math.floor(selectedTower.cost * 0.5);

        // Hide the move to cloud button entirely if cloud is not unlocked
        if (isCloudUnlocked) {
            if (uiElements.moveToCloudBtn) uiElements.moveToCloudBtn.style.display = 'flex';
            if (uiElements.sellTowerBtn) uiElements.sellTowerBtn.classList.remove('col-span-2');
        } else {
            if (uiElements.moveToCloudBtn) uiElements.moveToCloudBtn.style.display = 'none';
            if (uiElements.sellTowerBtn) uiElements.sellTowerBtn.classList.add('col-span-2');
        }

        const killCountIcon = /** @type {HTMLElement | null} */ (uiElements.towerKillCount.querySelector('span.material-symbols-outlined'));
        if (selectedTower.type === 'CAT') {
            uiElements.towerKillCount.classList.remove('hidden');
            if (killCountIcon) {
                killCountIcon.textContent = 'paid';
                killCountIcon.style.color = '#facc15'; // Gold
            }
            uiElements.killCountValue.textContent = selectedTower.goldGenerated || 0;
        } else if (selectedTower.type === 'SUPPORT' || selectedTower.type === 'ENT') {
            uiElements.towerKillCount.classList.add('hidden');
        } else {
            uiElements.towerKillCount.classList.remove('hidden');
            if (killCountIcon) {
                killCountIcon.textContent = 'skull';
                killCountIcon.style.color = '#e0e0e0'; // White
            }
            uiElements.killCountValue.textContent = selectedTower.killCount || 0;
        }

        let levelText;
        const maxLevelText = `<span class="material-icons text-yellow-400 align-bottom !text-base">star</span> MAX LEVEL`;
        const towerType = selectedTower.type;
        const maxLevel = TOWER_TYPES[towerType].maxLevel || 5;

        if (selectedTower.level === 'MAX LEVEL') {
            levelText = maxLevelText;
        } else {
            let visualLevel;
            if (towerType === 'ORBIT') {
                visualLevel = (selectedTower.upgradeCount || 0) + 1;
                const ORBIT_MAX_UPGRADES = 4;
                if ((selectedTower.upgradeCount || 0) >= ORBIT_MAX_UPGRADES) {
                    levelText = maxLevelText;
                } else {
                    levelText = `LVL ${visualLevel}`;
                }
            } else if (towerType === 'FORT') {
                visualLevel = selectedTower.stats.levelForCalc + selectedTower.stats.damageLevelForCalc - 1;
                if (visualLevel >= maxLevel) {
                    levelText = maxLevelText;
                } else {
                    levelText = `LVL ${visualLevel}`;
                }
            } else {
                visualLevel = selectedTower.stats.levelForCalc;
                if (visualLevel >= maxLevel) {
                    levelText = maxLevelText;
                } else if (visualLevel === 1 && (towerType === 'PIN' || towerType === 'CASTLE')) {
                    levelText = ''; // Keep original behavior for base towers
                }
                else {
                    levelText = `LVL ${visualLevel}`;
                }
            }
        }

        if (uiElements.selectedTowerInfoEl) uiElements.selectedTowerInfoEl.innerHTML = `${selectedTower.type.replace('_', ' ')} ${levelText}`;


        [
            uiElements.statDamageP, uiElements.statSpeedP, uiElements.statSplashP,
            uiElements.statBoostP, uiElements.statSlowP, uiElements.statGoldP,
            uiElements.statBurnP, uiElements.statSpecialP, uiElements.statProjectilesP,
            uiElements.statRangeP, uiElements.statFragsP, uiElements.statPinsP
        ].forEach(p => {
            if (p) p.classList.add('hidden');
        });

        if (uiElements.sellTowerBtn) {
            if (!isSellConfirmPending) {
                uiElements.sellTowerBtn.textContent = `SELL FOR ${sellValue}G`;
                uiElements.sellTowerBtn.classList.remove('bg-yellow-500', 'text-black', 'border-yellow-600', 'shadow-[0_4px_0_#ca8a04]');
                uiElements.sellTowerBtn.classList.add('bg-red-700', 'text-yellow-300', 'border-yellow-400', 'shadow-[0_4px_0_#9a3412]');
            }
        }

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

        if (selectedTower.type === 'FORT' || selectedTower.type === 'NINE_PIN') {
            if (uiElements.setGroundTargetBtn) {
                uiElements.setGroundTargetBtn.classList.remove('hidden');
                if (settingAttackGroundForTower === selectedTower) {
                    uiElements.setGroundTargetBtn.innerHTML = `<span class="material-symbols-outlined">cancel</span>`;
                    uiElements.setGroundTargetBtn.classList.add('active');
                } else {
                    uiElements.setGroundTargetBtn.innerHTML = `<span class="material-symbols-outlined">gps_fixed</span>`;
                    uiElements.setGroundTargetBtn.classList.remove('active');
                }
            }
            if (uiElements.toggleTargetingBtn) {
                uiElements.toggleTargetingBtn.classList.remove('hidden');
                uiElements.toggleTargetingBtn.classList.remove('bg-red-800', 'border-red-400', 'text-yellow-300', 'bg-yellow-400', 'border-yellow-300', 'text-black', 'bg-blue-800', 'border-blue-400', 'text-cyan-300');

                switch (selectedTower.targetingMode) {
                    case 'ground':
                        uiElements.toggleTargetingBtn.innerHTML = 'TARGET: GROUND';
                        uiElements.toggleTargetingBtn.classList.add('bg-blue-800', 'border-blue-400', 'text-cyan-300');
                        break;
                    case 'strongest':
                        uiElements.toggleTargetingBtn.innerHTML = 'TARGET: STRONGEST';
                        uiElements.toggleTargetingBtn.classList.add('bg-red-800', 'border-red-400', 'text-yellow-300');
                        break;
                    case 'weakest':
                        uiElements.toggleTargetingBtn.innerHTML = 'TARGET: WEAKEST';
                        uiElements.toggleTargetingBtn.classList.add('bg-yellow-400', 'border-yellow-300', 'text-black');
                        break;
                    case 'furthest':
                        uiElements.toggleTargetingBtn.innerHTML = 'TARGET: FURTHEST';
                        uiElements.toggleTargetingBtn.classList.add('bg-blue-800', 'border-blue-400', 'text-cyan-300');
                        break;
                    default:
                        uiElements.toggleTargetingBtn.innerHTML = 'TARGET: FURTHEST';
                        uiElements.toggleTargetingBtn.classList.add('bg-blue-800', 'border-blue-400', 'text-cyan-300');
                        break;
                }
            }
        } else if (selectedTower.type !== 'SUPPORT' && selectedTower.type !== 'ENT' && selectedTower.type !== 'CAT' && selectedTower.type !== 'ORBIT') {
            if (uiElements.toggleTargetingBtn) uiElements.toggleTargetingBtn.classList.remove('hidden');
            let targetingText = selectedTower.targetingMode.toUpperCase();
            let lockIcon = '';
            if (selectedTower.type === 'PIN_HEART') {
                lockIcon = '<span class="material-symbols-outlined !text-base !leading-none">lock</span>';
            }
            if (uiElements.toggleTargetingBtn) uiElements.toggleTargetingBtn.innerHTML = `TARGET: ${targetingText} ${lockIcon}`;
            if (uiElements.toggleTargetingBtn) {
                uiElements.toggleTargetingBtn.classList.remove('bg-red-800', 'bg-yellow-400', 'bg-blue-800', 'border-red-400', 'border-yellow-300', 'border-blue-400', 'text-black', 'text-yellow-300', 'text-cyan-300');
                if (selectedTower.type === 'PIN_HEART') {
                    // Locked to weakest, so apply weakest styling
                    uiElements.toggleTargetingBtn.classList.add('bg-yellow-400', 'border-yellow-300', 'text-black');
                } else {
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
        }

        const baseStats = TOWER_TYPES[selectedTower.type];
        if (baseStats.special) {
            let specialText = baseStats.special;
            if (selectedTower.type === 'FORT' && selectedTower.hasShrapnel) {
                specialText += " + AA Shrapnel";
            }
            if (uiElements.statSpecialP) {
                uiElements.statSpecialP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statSpecialP.querySelector('span'));
                if (icon) icon.style.color = '#facc15'; // Gold for Special
            }
            if (uiElements.statSpecial) uiElements.statSpecial.textContent = specialText;
        }

        if (selectedTower.hasFragmentingShot) {
            if (uiElements.statFragsP) {
                uiElements.statFragsP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statFragsP.querySelector('span'));
                if (icon) icon.style.color = '#f472b6'; // Pink for Fragments
            }
            if (uiElements.statFrags) uiElements.statFrags.textContent = selectedTower.fragmentBounces;
            if (uiElements.statSpecial) uiElements.statSpecial.textContent = 'Fragmenting Shot';
        }

        if (selectedTower.splashRadius > 0) {
            if (uiElements.statSplashP) {
                uiElements.statSplashP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statSplashP.querySelector('span'));
                if (icon) icon.style.color = '#c084fc'; // Purple for Splash
            }
            if (uiElements.statSplash) {
                uiElements.statSplash.textContent = Math.round(selectedTower.splashRadius).toString();
            }
        }

        if (selectedTower.type === 'ENT' || selectedTower.type === 'SUPPORT' || selectedTower.type === 'CAT') {
            if (selectedTower.type === 'CAT') {
                if (uiElements.statGoldP) {
                    uiElements.statGoldP.classList.remove('hidden');
                    const icon = /** @type {HTMLElement | null} */ (uiElements.statGoldP.querySelector('span.material-icons'));
                    if (icon) {
                        const iconHTML = icon.outerHTML;
                        uiElements.statGoldP.innerHTML = `${iconHTML} Gld: +${selectedTower.goldBonus}G`;
                    }
                }
            }
            if (selectedTower.type === 'ENT' || selectedTower.type === 'CAT') {
                if (selectedTower.mode === 'boost') {
                    if (uiElements.statBoostP) {
                        uiElements.statBoostP.classList.remove('hidden');
                        const icon = /** @type {HTMLElement | null} */ (uiElements.statBoostP.querySelector('span'));
                        if (icon) icon.style.color = '#f59e0b'; // Amber
                    }
                    if (uiElements.statBoost) {
                        const boostPercent = ((1 - selectedTower.attackSpeedBoost) * 100).toFixed(0);
                        uiElements.statBoost.textContent = `${boostPercent}% Spd & ${((selectedTower.damageBoost - 1) * 100).toFixed(0)}% Dmg`;
                    }
                } else if (selectedTower.mode === 'slow') {
                    if (uiElements.statSlowP) {
                        uiElements.statSlowP.classList.remove('hidden');
                        const icon = /** @type {HTMLElement | null} */ (uiElements.statSlowP.querySelector('span'));
                        if (icon) icon.style.color = '#38bdf8'; // Sky Blue
                    }
                    if (uiElements.statSlow) {
                        const slowPercent = ((1 - selectedTower.enemySlow) * 100).toFixed(0);
                        uiElements.statSlow.textContent = `${slowPercent}%`;
                    }
                } else { // Diversify
                    if (uiElements.statSpecialP) {
                        uiElements.statSpecialP.classList.remove('hidden');
                        const icon = /** @type {HTMLElement | null} */ (uiElements.statSpecialP.querySelector('span'));
                        if (icon) icon.style.color = '#facc15'; // Gold for Special
                    }
                    if (uiElements.statSpecial) uiElements.statSpecial.textContent = 'Aura: Towers attack different enemies';
                }
            } else { // SUPPORT tower
                if (uiElements.statBoostP) {
                    uiElements.statBoostP.classList.remove('hidden');
                    const icon = /** @type {HTMLElement | null} */ (uiElements.statBoostP.querySelector('span'));
                    if (icon) icon.style.color = '#f59e0b'; // Amber
                }
                if (uiElements.statBoost) {
                    const boostPercent = ((1 - selectedTower.attackSpeedBoost) * 100).toFixed(0);
                    uiElements.statBoost.textContent = `${boostPercent}%`;
                }
            }
        } else { // Attacking towers
            if (uiElements.statDamageP) {
                uiElements.statDamageP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statDamageP.querySelector('span'));
                if (icon) icon.style.color = '#ef4444'; // Red for Damage
            }
            if (uiElements.statDamage) {
                const finalDamage = (selectedTower.damage * selectedTower.damageMultiplier).toFixed(1);
                uiElements.statDamage.textContent = finalDamage;
            }

            if (uiElements.statSpeedP && selectedTower.type !== 'ORBIT') {
                uiElements.statSpeedP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statSpeedP.querySelector('span'));
                if (icon) icon.style.color = '#4ade80'; // Green for Speed
            }
            if (uiElements.statSpeed && selectedTower.type !== 'ORBIT') {
                uiElements.statSpeed.textContent = (60 / selectedTower.fireRate).toFixed(2);
            }

            if (selectedTower.type !== 'ORBIT') {
                if (uiElements.statRangeP) {
                    uiElements.statRangeP.classList.remove('hidden');
                    const icon = /** @type {HTMLElement | null} */ (uiElements.statRangeP.querySelector('span'));
                    if (icon) icon.style.color = '#60a5fa'; // Blue for Range
                }
                if (uiElements.statRange) uiElements.statRange.textContent = Math.round(selectedTower.range).toString();
            }

            if (selectedTower.type === 'FIREPLACE') {
                if (uiElements.statBurnP) {
                    uiElements.statBurnP.classList.remove('hidden');
                    const icon = /** @type {HTMLElement | null} */ (uiElements.statBurnP.querySelector('span'));
                    if (icon) icon.style.color = '#f97316'; // Orange for Burn
                }
                if (uiElements.statBurn) uiElements.statBurn.textContent = `${selectedTower.burnDps.toFixed(1)}/s for ${selectedTower.burnDuration}s`;
            }

            if (selectedTower.type === 'NAT' || selectedTower.type === 'ORBIT') {
                if (uiElements.statProjectilesP) {
                    uiElements.statProjectilesP.classList.remove('hidden');
                    const icon = /** @type {HTMLElement | null} */ (uiElements.statProjectilesP.querySelector('span'));
                    if (icon) icon.style.color = '#e0e0e0'; // White for Projectiles
                }
                if (uiElements.statProjectiles) {
                    uiElements.statProjectiles.textContent = selectedTower.type === 'NAT' ? (selectedTower.projectileCount || 1) : selectedTower.orbiters.length;
                }
            }
        }
    } else {
        if (uiElements.towerButtons) uiElements.towerButtons.classList.remove('hidden');
        if (uiElements.gameControls) uiElements.gameControls.classList.remove('hidden');
        if (uiElements.towersTitle) uiElements.towersTitle.classList.remove('hidden');
        if (uiElements.sellPanel) uiElements.sellPanel.classList.add('hidden');
        if (uiElements.towerKillCount) uiElements.towerKillCount.classList.add('hidden');
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
    const isDiscovered = mergeState.mergeInfo.isDiscovered;

    if (uiElements.mergeFromTowerIconContainer) createAndAppendIcon(uiElements.mergeFromTowerIconContainer, mergeState.existingTower.type);
    if (uiElements.mergeFromTowerName) uiElements.mergeFromTowerName.textContent = mergeState.existingTower.type.replace('_', ' ');
    if (uiElements.mergeToTowerIconContainer) createAndAppendIcon(uiElements.mergeToTowerIconContainer, mergeState.placingTowerType);
    if (uiElements.mergeToTowerName) uiElements.mergeToTowerName.textContent = mergeState.placingTowerType.replace('_', ' ');

    if (isDiscovered) {
        if (uiElements.mergeResultTowerIconContainer) createAndAppendIcon(uiElements.mergeResultTowerIconContainer, mergeState.mergeInfo.resultType);
        let resultName = mergeState.mergeInfo.text.replace('LVL ', 'LVL-').replace('_', ' ');
        if (uiElements.mergeResultBenefitText) uiElements.mergeResultBenefitText.textContent = '';
        if (resultName.toLowerCase() === 'upgrade' && mergeState.mergeInfo.upgrade) {
            resultName = mergeState.mergeInfo.resultType.replace('_', ' ');
            if (uiElements.mergeResultBenefitText) uiElements.mergeResultBenefitText.textContent = mergeState.mergeInfo.upgrade.text;
        }
        if (uiElements.mergeResultTowerName) uiElements.mergeResultTowerName.textContent = resultName;
    } else {
        if (uiElements.mergeResultTowerIconContainer) {
            uiElements.mergeResultTowerIconContainer.innerHTML = `<span class="material-symbols-outlined" style="font-size: 2.5rem; color: #FFFFFF; font-variation-settings: 'FILL' 1;">question_mark</span>`;
        }
        if (uiElements.mergeResultTowerName) uiElements.mergeResultTowerName.textContent = '???';
        if (uiElements.mergeResultBenefitText) uiElements.mergeResultBenefitText.textContent = '';
    }


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

/**
 * Configuration for displaying tower stats in the library.
 * Each key corresponds to a property in the TOWER_TYPES objects.
 * - label: Text to display.
 * - icon: Material Icon name.
 * - family: Icon font family.
 * - color: Color of the icon.
 * - condition: A function that returns true if the stat should be displayed.
 * - formatter: An optional function to format the stat value for display.
 */
const statDisplayConfig = {
    damage: { label: 'Dmg', icon: 'bolt', family: 'material-icons', color: '#ef4444', condition: (s) => s.damage > 0 },
    range: { label: 'Rng', icon: 'radar', family: 'material-icons', color: '#60a5fa', condition: (s) => s.range > 0 },
    fireRate: { label: 'Spd', icon: 'speed', family: 'material-icons', color: '#4ade80', condition: (s) => s.fireRate > 0, formatter: (val) => (60 / val).toFixed(2) },
    splashRadius: { label: 'Spl', icon: 'bubble_chart', family: 'material-icons', color: '#c084fc', condition: (s) => s.splashRadius > 0 },
    attackSpeedBoost: { label: 'Spd Aura', icon: 'electric_bolt', family: 'material-icons', color: '#f59e0b', condition: (s) => s.attackSpeedBoost, formatter: (val) => `+${((1 - val) * 100).toFixed(0)}%` },
    damageBoost: { label: 'Dmg Aura', icon: 'electric_bolt', family: 'material-icons', color: '#f59e0b', condition: (s) => s.damageBoost, formatter: (val) => `+${((val - 1) * 100).toFixed(0)}%` },
    enemySlow: { label: 'Slow Aura', icon: 'hourglass_empty', family: 'material-symbols-outlined', color: '#38bdf8', condition: (s) => s.enemySlow, formatter: (val) => `${((1 - val) * 100).toFixed(0)}%` },
    goldBonus: { label: 'Gold Aura', icon: 'savings', family: 'material-icons', color: '#facc15', condition: (s) => s.goldBonus, formatter: (val) => `+${val}G` },
    burnDps: { label: 'Burn', icon: 'local_fire_department', family: 'material-symbols-outlined', color: '#f97316', condition: (s) => s.burnDps, formatter: (val, stats) => `${val}/s for ${stats.burnDuration}s` },
};


function createTowerCardHTML(type, isDiscovered) {
    const stats = TOWER_TYPES[type];
    if (!stats) return '';

    const iconInfo = getTowerIconInfo(type);

    if (!isDiscovered) {
        return `
            <div class="tower-card absolute inset-0 p-4 flex flex-col items-center justify-center text-center">
                <span class="material-symbols-outlined" style="font-size: 64px; color: #FFFFFF; font-variation-settings: 'FILL' 1;">question_mark</span>
                <h4 class="text-xl mt-2 text-white">???</h4>
                <p class="text-xs text-yellow-400 mt-2 italic">"?????????????"</p>
            </div>
        `;
    }

    const name = iconInfo.icon.replace(/_/g, ' ').toUpperCase();
    let iconStyle = `font-size: 64px; color: ${stats.color};`;
    if (iconInfo.className.includes('material-symbols')) {
        iconStyle += ` font-variation-settings: 'FILL' 0;`;
    }

    const commentHTML = `<p class="text-xs text-yellow-400 mt-2 italic">"${stats.comment || ''}"</p>`;

    // Build stats with icons dynamically from the config
    const statsGridHTML = Object.entries(statDisplayConfig)
        .map(([key, config]) => {
            if (config.condition && config.condition(stats)) {
                const statValue = stats[key];
                const formattedValue = config.formatter ? config.formatter(statValue, stats) : statValue;
                const iconFamily = config.family || 'material-icons';
                return `<p class="flex items-center gap-1"><span class="${iconFamily} text-base align-bottom" style="color:${config.color};">${config.icon}</span>${config.label}: ${formattedValue}</p>`;
            }
            return '';
        })
        .join('');


    return `
        <div class="tower-card absolute inset-0 p-4 flex flex-col items-center justify-around text-center">
            <div>
               <span class="${iconInfo.className}" style="${iconStyle}">${iconInfo.icon}</span>
                <h4 class="text-xl mt-2" style="color: ${stats.color};">${name}</h4>
                <p class="text-xs text-gray-400">(${type})</p>
            </div>
            <div class="text-left text-xs w-full grid grid-cols-2 gap-x-2 gap-y-1 px-2">
                ${statsGridHTML}
            </div>
             ${commentHTML}
        </div>
    `;
}

function createEnemyCardHTML(type, isDiscovered) {
    const stats = ENEMY_TYPES[type];
    if (!stats) return '';

    const iconHTML = `<span style="font-family: ${stats.iconFamily}; font-size: 64px; color: ${stats.color};">${stats.icon}</span>`;

    if (!isDiscovered) {
        return `
            <div class="enemy-card absolute inset-0 p-4 flex flex-col items-center justify-center text-center">
                <span class="material-symbols-outlined" style="font-size: 64px; color: #FFFFFF; font-variation-settings: 'FILL' 1;">question_mark</span>
                <h4 class="text-xl mt-2 text-white">???</h4>
                <p class="text-xs text-yellow-400 mt-2 italic">"?????????????"</p>
            </div>
        `;
    }

    const name = stats.icon.replace(/_/g, ' ').toUpperCase();

    let specialText = '';
    if (stats.isFlying) specialText += 'Flying, ';
    if (stats.splashImmune) specialText += 'Splash Immune, ';
    if (stats.laysEggs) specialText += 'Lays Eggs, ';
    if (specialText) specialText = specialText.slice(0, -2);
    else specialText = 'No special abilities';

    const specialHTML = `<p class="text-xs text-yellow-400 mt-2">${specialText}</p>`;
    const commentHTML = `<p class="text-xs text-yellow-400 mt-2 italic">"${stats.comment || ''}"</p>`;

    let statsGridHTML = '';
    statsGridHTML += `<p class="flex items-center gap-1"><span class="material-symbols-outlined text-base align-bottom" style="color:#ef4444;">favorite</span>Health: ${stats.health}</p>`;
    statsGridHTML += `<p class="flex items-center gap-1"><span class="material-symbols-outlined text-base align-bottom" style="color:#4ade80;">speed</span>Speed: ${stats.speed}</p>`;
    statsGridHTML += `<p class="flex items-center gap-1"><span class="material-symbols-outlined text-base align-bottom" style="color:#facc15;">paid</span>Gold: ${stats.gold}</p>`;


    return `
        <div class="enemy-card absolute inset-0 p-4 flex flex-col items-center justify-around text-center">
            <div>
                ${iconHTML}
                <h4 class="text-xl mt-2" style="color: ${stats.color};">${name}</h4>
                <p class="text-xs text-gray-400">(${type})</p>
            </div>
            <div class="text-left text-xs w-full grid grid-cols-1 gap-y-1 px-4">
                ${statsGridHTML}
            </div>
            <div>
                ${specialHTML}
                ${commentHTML}
            </div>
        </div>
    `;
}

function populateTowerLibrary(gameState) {
    const allTowerTypes = Object.keys(TOWER_TYPES);
    uiElements.towerLibraryRolodex.innerHTML = '';

    allTowerTypes.forEach(type => {
        const isDiscovered = gameState.discoveredTowerTypes.has(type);
        const cardHTML = createTowerCardHTML(type, isDiscovered);
        const cardContainer = document.createElement('div');
        cardContainer.className = 'tower-card-container w-full h-full absolute hidden';
        cardContainer.innerHTML = cardHTML;
        uiElements.towerLibraryRolodex.appendChild(cardContainer);
    });
}

function populateEnemyLibrary(gameState) {
    const allEnemyTypes = Object.keys(ENEMY_TYPES);
    uiElements.enemyLibraryRolodex.innerHTML = '';

    allEnemyTypes.forEach(type => {
        const isDiscovered = gameState.killedEnemies.has(type);
        const cardHTML = createEnemyCardHTML(type, isDiscovered);
        const cardContainer = document.createElement('div');
        cardContainer.className = 'enemy-card-container w-full h-full absolute hidden';
        cardContainer.innerHTML = cardHTML;
        uiElements.enemyLibraryRolodex.appendChild(cardContainer);
    });
}

export function populateLibraries(gameState) {
    populateTowerLibrary(gameState);
    populateEnemyLibrary(gameState);
}

