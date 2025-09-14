import { TOWER_TYPES, ENEMY_TYPES, CLOUD_STORAGE_COST } from './constants.js';
import { getTowerIconInfo } from './drawing-function.js';
import { gameState } from './game-state.js';
import { TextAnnouncement, Effect } from './game-entities.js';

/**
 * @param {string} id
 * @returns {HTMLButtonElement}
 */
function getButton(id) { // This is a good helper function!
    return /** @type {HTMLButtonElement} */ (document.getElementById(id));
}

export const uiElements = {
    livesEl: document.getElementById('lives'),
    goldEl: document.getElementById('gold'),
    waveEl: document.getElementById('wave'),
    startWaveBtn: getButton('start-wave'),
    gameTitle: document.getElementById('game-title'),
    buyPinBtn: getButton('buy-pin'),
    buyCastleBtn: getButton('buy-castle'),
    buySupportBtn: getButton('buy-support'),
    gameOverModal: document.getElementById('game-over-modal'),
    gameOverTitle: document.getElementById('game-over-title'),
    gameOverMessage: document.getElementById('game-over-message'),
    restartGameBtn: getButton('restart-game'),
    endlessChoiceModal: document.getElementById('endless-choice-modal'),
    startEndlessBtn: getButton('start-endless-btn'),
    restartEndlessBtn: getButton('restart-endless-btn'),
    wave16PowerChoiceModal: document.getElementById('wave-16-power-choice-modal'),
    deletePowerBtn: getButton('delete-power-btn'),
    cloudPowerBtn: getButton('cloud-power-btn'),
    deleteActivateBtn: getButton('delete-btn'),
    livesPowerBtn: getButton('lives-power-btn'),
    sellPanel: document.getElementById('sell-panel'),
    sellTowerBtn: getButton('sell-tower-btn'),
    moveToCloudBtn: getButton('move-to-cloud-btn'),
    toggleModeBtn: getButton('toggle-mode'),
    toggleTargetingBtn: getButton('toggle-targeting'),
    toggleOrbitDirectionBtn: getButton('toggle-orbit-direction-btn'),
    setGroundTargetBtn: getButton('set-ground-target-btn'),
    speedToggleBtn: getButton('speed-toggle'),
    selectedTowerInfoEl: document.getElementById('selected-tower-info'),
    soundToggleBtn: getButton('sound-toggle-btn'),
    musicToggleBtn: getButton('music-toggle-btn'),
    towerButtons: document.getElementById('tower-buttons'),
    towerButtonsGroup: document.getElementById('tower-buttons-group'),
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
    optionsMenuOverlay: document.getElementById('options-menu-overlay'),
    toggleMergeConfirmBtn: getButton('toggle-merge-confirm-btn'),
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
    trophiesBtn: getButton('trophies-btn'),
    trophiesModal: document.getElementById('trophies-modal'),
    trophiesList: document.getElementById('trophies-list'),
    trophiesCloseBtn: getButton('trophies-close-btn'),
    changelogBtn: getButton('changelog-btn'),
    changelogModal: document.getElementById('changelog-modal'),
    changelogList: document.getElementById('changelog-list'),
    changelogCloseBtn: getButton('changelog-close-btn'),
    changelogIndicator: document.getElementById('changelog-indicator'),
    // Message Log
    logBtn: getButton('log-btn'),
    logModal: document.getElementById('log-modal'),
    logList: document.getElementById('log-list'),
    logCloseBtn: getButton('log-close-btn'),
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
    statJumpsP: document.getElementById('stat-jumps-p'),
    statJumps: document.getElementById('stat-jumps'),
    statStunP: document.getElementById('stat-stun-p'),
    statStun: document.getElementById('stat-stun'),
    statArmorPenP: document.getElementById('stat-armor-pen-p'),
    statArmorPen: document.getElementById('stat-armor-pen'),
    towerKillCount: document.getElementById('tower-kill-count'),
    killCountValue: document.getElementById('kill-count-value'),
};

export function updateUI(state, gameSpeed) {
    uiElements.livesEl.textContent = state.lives;
    uiElements.goldEl.textContent = state.gold;
    uiElements.waveEl.textContent = state.wave;
    uiElements.buyPinBtn.disabled = state.gold < TOWER_TYPES.PIN.cost;
    uiElements.buyCastleBtn.disabled = state.gold < TOWER_TYPES.CASTLE.cost;
    uiElements.buySupportBtn.disabled = state.gold < TOWER_TYPES.SUPPORT.cost;

    if (uiElements.onboardingMergeTip) {
        uiElements.onboardingMergeTip.classList.toggle('hidden', state.hasPerformedFirstMerge || state.onboardingTipDismissed);
    }

    if (state.isCloudUnlocked || state.hasPermanentCloud) {
        uiElements.cloudButton.disabled = state.waveInProgress;
        uiElements.cloudIcon.textContent = 'cloud_done';
        uiElements.cloudButton.classList.add('active');
        uiElements.cloudText.classList.add('hidden');
    } else {
        uiElements.cloudButton.disabled = state.gold < CLOUD_STORAGE_COST;
        uiElements.cloudIcon.textContent = 'cloud_download';
        uiElements.cloudText.classList.remove('hidden');
        uiElements.cloudButton.classList.remove('active');
    }

    uiElements.startWaveBtn.classList.toggle('depressed', state.waveInProgress);
    uiElements.speedToggleBtn.classList.toggle('depressed', gameSpeed > 1);

    // Show or hide the nuke button
    uiElements.deleteActivateBtn.classList.toggle('hidden', !state.hasDelete);
}

export function updateSellPanel(selectedTowers, isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower = null) {
    const selectedTower = selectedTowers.length === 1 ? selectedTowers[0] : null;

    // Always remove the icon first to handle deselection correctly.
    const existingIndicator = uiElements.sellPanel.querySelector('.detection-indicator-container');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    if (uiElements.setGroundTargetBtn) uiElements.setGroundTargetBtn.classList.add('hidden');

    if (selectedTowers.length > 0) {
        if (uiElements.towerButtonsGroup) uiElements.towerButtonsGroup.classList.add('hidden');
        if (uiElements.gameControls) uiElements.gameControls.classList.add('hidden');

        if (settingAttackGroundForTower) {
            uiElements.sellPanel.classList.add('hidden');
        } else {
            uiElements.sellPanel.classList.remove('hidden');
        }

        let totalSellValue = 0;
        selectedTowers.forEach(t => totalSellValue += Math.floor(t.cost * 0.5));

        // Hide move to cloud if more than one tower selected
        const canMoveToCloud = isCloudUnlocked && selectedTowers.length === 1;
        if (canMoveToCloud) {
            if (uiElements.moveToCloudBtn) uiElements.moveToCloudBtn.style.display = 'flex';
            if (uiElements.sellTowerBtn) uiElements.sellTowerBtn.classList.remove('col-span-2');
        } else {
            if (uiElements.moveToCloudBtn) uiElements.moveToCloudBtn.style.display = 'none';
            if (uiElements.sellTowerBtn) uiElements.sellTowerBtn.classList.add('col-span-2');
        }

        [
            uiElements.statDamageP, uiElements.statSpeedP, uiElements.statSplashP,
            uiElements.statBoostP, uiElements.statSlowP, uiElements.statGoldP,
            uiElements.statBurnP, uiElements.statSpecialP, uiElements.statProjectilesP, uiElements.statRangeP, uiElements.statArmorPenP,
            uiElements.statFragsP, uiElements.statPinsP, uiElements.statJumpsP, uiElements.statStunP
        ].forEach(p => {
            if (p) p.classList.add('hidden');
        });

        if (uiElements.sellTowerBtn) {
            if (!isSellConfirmPending) {
                uiElements.sellTowerBtn.textContent = `SELL FOR ${totalSellValue}G`;
                uiElements.sellTowerBtn.style.textShadow = 'none'; // Remove text shadow
                uiElements.sellTowerBtn.classList.remove('bg-yellow-500', 'text-black', 'border-yellow-600', 'shadow-[0_4px_0_#ca8a04]');
                uiElements.sellTowerBtn.classList.add('bg-red-700', 'text-yellow-300', 'border-yellow-400'); // Removed shadow class
            }
        }

        if (uiElements.toggleModeBtn) uiElements.toggleModeBtn.classList.add('hidden');
        if (uiElements.toggleOrbitDirectionBtn) uiElements.toggleOrbitDirectionBtn.classList.add('hidden');
        if (uiElements.toggleTargetingBtn) uiElements.toggleTargetingBtn.classList.add('hidden');

        if (selectedTower) {
            // SINGLE TOWER SELECTED
            if (['SUPPORT', 'MIND', 'CAT'].includes(selectedTower.type)) {
                const indicatorContainer = document.createElement('div');
                indicatorContainer.className = 'detection-indicator-container absolute top-2 left-2 flex items-center text-white';
                indicatorContainer.style.textShadow = '1px 1px 3px #000';
                const eyeIcon = document.createElement('span');
                eyeIcon.className = 'material-symbols-outlined text-white';
                eyeIcon.textContent = 'eye_tracking';
                eyeIcon.style.fontSize = '24px';
                eyeIcon.style.cursor = 'pointer';
                eyeIcon.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent click from bubbling to canvas listener
                    window.toggleStealthRadius?.(selectedTower.id);
                });

                const rangeValue = document.createElement('span');
                rangeValue.className = 'text-lg font-bold ml-1';
                rangeValue.textContent = TOWER_TYPES[selectedTower.type].stealthDetectionRange.toString();
                rangeValue.style.cursor = 'pointer';
                rangeValue.addEventListener('click', (e) => { e.stopPropagation(); window.toggleStealthRadius?.(selectedTower.id); });

                indicatorContainer.appendChild(eyeIcon);
                indicatorContainer.appendChild(rangeValue);
                uiElements.sellPanel.classList.add('relative');
                uiElements.sellPanel.prepend(indicatorContainer);
            }

            const killCountIcon = /** @type {HTMLElement | null} */ (uiElements.towerKillCount.querySelector('span.material-symbols-outlined'));
            if (selectedTower.type === 'CAT') {
                uiElements.towerKillCount.classList.remove('hidden');
                if (killCountIcon) {
                    killCountIcon.textContent = 'paid';
                    killCountIcon.style.color = '#facc15';
                }
                uiElements.killCountValue.textContent = selectedTower.goldGenerated || 0;
            } else if (selectedTower.type === 'SUPPORT' || selectedTower.type === 'MIND') {
                uiElements.towerKillCount.classList.add('hidden');
            } else {
                uiElements.towerKillCount.classList.remove('hidden');
                if (killCountIcon) {
                    killCountIcon.textContent = 'skull';
                    killCountIcon.style.color = '#e0e0e0';
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
                        levelText = '';
                    } else {
                        levelText = `LVL ${visualLevel}`;
                    }
                }
            }
            if (uiElements.selectedTowerInfoEl) uiElements.selectedTowerInfoEl.innerHTML = `${selectedTower.type.replace('_', ' ')} ${levelText}`;

            // Show single tower stats and buttons
            if (['MIND', 'ORBIT', 'CAT'].includes(selectedTower.type)) {
                if (uiElements.toggleModeBtn) uiElements.toggleModeBtn.classList.remove('hidden');
                if (selectedTower.type === 'MIND' || selectedTower.type === 'CAT') {
                    if (uiElements.toggleModeBtn) uiElements.toggleModeBtn.textContent = `MODE: ${selectedTower.mode.toUpperCase()}`;
                } else if (selectedTower.type === 'ORBIT') {
                    if (uiElements.toggleModeBtn) uiElements.toggleModeBtn.textContent = `ORBIT: ${selectedTower.orbitMode.toUpperCase()}`;
                    if (uiElements.toggleOrbitDirectionBtn) {
                        uiElements.toggleOrbitDirectionBtn.classList.remove('hidden');
                        uiElements.toggleOrbitDirectionBtn.textContent = `DIR: ${selectedTower.orbitDirection === 1 ? 'CW' : 'CCW'}`;
                    }
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
            }

            if (selectedTower.type !== 'SUPPORT' && selectedTower.type !== 'MIND' && selectedTower.type !== 'CAT' && selectedTower.type !== 'ORBIT') {
                if (uiElements.toggleTargetingBtn) uiElements.toggleTargetingBtn.classList.remove('hidden');
            }

            updateTargetingButton(selectedTower.targetingMode, selectedTower.type);
            updateStatsDisplay(selectedTower);

        } else {
            // MULTIPLE TOWERS SELECTED
            if (uiElements.selectedTowerInfoEl) uiElements.selectedTowerInfoEl.textContent = `${selectedTowers.length} TOWERS SELECTED`;
            uiElements.towerKillCount.classList.add('hidden');

            const allSameType = selectedTowers.every(t => t.type === selectedTowers[0].type);
            if (allSameType) {
                const type = selectedTowers[0].type;
                if (['MIND', 'CAT', 'ORBIT'].includes(type)) {
                    if (uiElements.toggleModeBtn) uiElements.toggleModeBtn.classList.remove('hidden');
                    if (type === 'ORBIT') {
                        uiElements.toggleModeBtn.textContent = `ORBIT: ${selectedTowers[0].orbitMode.toUpperCase()}`;
                        if (uiElements.toggleOrbitDirectionBtn) {
                            uiElements.toggleOrbitDirectionBtn.classList.remove('hidden');
                            uiElements.toggleOrbitDirectionBtn.textContent = `DIR: ${selectedTowers[0].orbitDirection === 1 ? 'CW' : 'CCW'}`;
                        }
                    } else {
                        uiElements.toggleModeBtn.textContent = `MODE: ${selectedTowers[0].mode.toUpperCase()}`;
                    }
                }
            }

            // Logic for toggleTargetingBtn for multiple towers
            // Get all possible targeting modes for each selected tower
            const allAvailableModes = selectedTowers.map(tower => {
                if (tower.type === 'FORT' || tower.type === 'NINE_PIN') {
                    return ['furthest', 'strongest', 'weakest']; // Exclude 'ground' from cycling
                } else if (tower.type !== 'PIN_HEART') {
                    return ['strongest', 'weakest', 'furthest'];
                }
                return []; // PIN_HEART has no toggleable modes
            });

            // Find common modes among all selected towers
            let commonModes = [];
            if (allAvailableModes.length > 0) {
                commonModes = allAvailableModes[0].filter(mode =>
                    allAvailableModes.every(modes => modes.includes(mode))
                );
            }

            if (commonModes.length > 0) {
                if (uiElements.toggleTargetingBtn) uiElements.toggleTargetingBtn.classList.remove('hidden');

                // Determine the current common mode (if all towers share one)
                let currentCommonMode = null;
                const firstTowerMode = selectedTowers[0].targetingMode;
                if (commonModes.includes(firstTowerMode) && selectedTowers.every(t => t.targetingMode === firstTowerMode)) {
                    currentCommonMode = firstTowerMode;
                }

                // If there's no single common mode, display "MIXED".
                // Otherwise, show the common mode.
                const displayMode = currentCommonMode || 'mixed';

                updateTargetingButton(displayMode, selectedTowers[0].type); // Use the type of the first tower for styling
            }
        }
    } else {
        if (settingAttackGroundForTower) {
            if (uiElements.towerButtonsGroup) uiElements.towerButtonsGroup.classList.add('hidden');
        } else {
            if (uiElements.towerButtonsGroup) uiElements.towerButtonsGroup.classList.remove('hidden');
        }
        if (uiElements.gameControls) uiElements.gameControls.classList.remove('hidden');
        if (uiElements.sellPanel) uiElements.sellPanel.classList.add('hidden');
        if (uiElements.towerKillCount) uiElements.towerKillCount.classList.add('hidden');
        if (uiElements.selectedTowerInfoEl) uiElements.selectedTowerInfoEl.textContent = '';
    }
}


function updateTargetingButton(targetingMode, towerType) {
    if (!uiElements.toggleTargetingBtn) return;
    // If the targeting mode is 'mixed', we want to display it as "MIXED".
    // Otherwise, we show the mode in uppercase as before.
    let targetingText = targetingMode === 'mixed'
        ? 'MIXED'
        : targetingMode.toUpperCase();
    let lockIcon = '';
    if (towerType === 'PIN_HEART') {
        lockIcon = '<span class="material-symbols-outlined !text-base !leading-none">lock</span>';
    }
    uiElements.toggleTargetingBtn.innerHTML = `TARGET: ${targetingText} ${lockIcon}`;

    // Reset all possible color/style classes before applying new ones
    uiElements.toggleTargetingBtn.classList.remove(
        'bg-red-800', 'border-red-400', 'shadow-[0_4px_0_#991b1b]',
        'bg-yellow-400', 'border-yellow-300', 'shadow-[0_4px_0_#ca8a04]', 'text-black',
        'bg-blue-800', 'border-blue-400', 'shadow-[0_4px_0_#1e40af]', 'text-white'
    );

    // If targeting is mixed, or if it's a PIN_HEART, we don't apply a specific color.
    // The button will use its default styling.
    if (targetingMode === 'mixed') {
    } else if (towerType === 'PIN_HEART') {
        // PIN_HEART targeting is locked, so we can disable the button.
        uiElements.toggleTargetingBtn.disabled = true;
    } else {
        uiElements.toggleTargetingBtn.disabled = false;
        // Apply specific styles based on the targeting mode
        switch (targetingMode) {
            case 'strongest':
                uiElements.toggleTargetingBtn.classList.add('bg-red-800', 'border-red-400', 'shadow-[0_4px_0_#991b1b]');
                break;
            case 'weakest':
                uiElements.toggleTargetingBtn.classList.add('bg-yellow-400', 'border-yellow-300', 'shadow-[0_4px_0_#ca8a04]', 'text-black');
                break;
            case 'furthest':
                uiElements.toggleTargetingBtn.classList.add('bg-blue-800', 'border-blue-400', 'shadow-[0_4px_0_#1e40af]', 'text-white');
                break;
        }
    }
}

function updateStatsDisplay(selectedTower) {
    // This function now only handles displaying stats for a single tower.
    const baseStats = TOWER_TYPES[selectedTower.type];
    if (baseStats.special) {
        let specialText = baseStats.special;
        if (selectedTower.type === 'FORT' && selectedTower.hasShrapnel) {
            specialText += " + AA Shrapnel";
        }
        if (uiElements.statSpecialP) {
            uiElements.statSpecialP.classList.remove('hidden');
            const icon = /** @type {HTMLElement | null} */ (uiElements.statSpecialP.querySelector('span'));
            if (icon) icon.style.color = '#facc15';
        }
        if (uiElements.statSpecial) uiElements.statSpecial.textContent = specialText;
    }

    if (selectedTower.hasFragmentingShot) {
        if (uiElements.statFragsP) {
            uiElements.statFragsP.classList.remove('hidden');
            const icon = /** @type {HTMLElement | null} */ (uiElements.statFragsP.querySelector('span'));
            if (icon) icon.style.color = '#f472b6';
        }
        if (uiElements.statFrags) uiElements.statFrags.textContent = selectedTower.fragmentBounces;
        if (uiElements.statSpecial) uiElements.statSpecial.textContent = 'Fragmenting Shot';
    }

    if (selectedTower.splashRadius > 0) {
        if (uiElements.statSplashP) {
            uiElements.statSplashP.classList.remove('hidden');
            const icon = /** @type {HTMLElement | null} */ (uiElements.statSplashP.querySelector('span'));
            if (icon) icon.style.color = '#c084fc';
        }
        if (uiElements.statSplash) {
            uiElements.statSplash.textContent = Math.round(selectedTower.splashRadius).toString();
        }
    }

    if (selectedTower.type === 'MIND' || selectedTower.type === 'SUPPORT' || selectedTower.type === 'CAT') {
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
        if (selectedTower.type === 'MIND' || selectedTower.type === 'CAT') {
            if (selectedTower.mode === 'boost') {
                if (uiElements.statBoostP) {
                    uiElements.statBoostP.classList.remove('hidden');
                    const icon = /** @type {HTMLElement | null} */ (uiElements.statBoostP.querySelector('span'));
                    if (icon) icon.style.color = '#f59e0b';
                }
                if (uiElements.statBoost) {
                    const boostPercent = ((1 - selectedTower.attackSpeedBoost) * 100).toFixed(0);
                    uiElements.statBoost.textContent = `${boostPercent}% Spd & ${((selectedTower.damageBoost - 1) * 100).toFixed(0)}% Dmg`;
                }
            } else if (selectedTower.mode === 'slow') {
                if (uiElements.statSlowP) {
                    uiElements.statSlowP.classList.remove('hidden');
                    const icon = /** @type {HTMLElement | null} */ (uiElements.statSlowP.querySelector('span'));
                    if (icon) icon.style.color = '#38bdf8';
                }
                if (uiElements.statSlow) {
                    const slowPercent = ((1 - selectedTower.enemySlow) * 100).toFixed(0);
                    uiElements.statSlow.textContent = `${slowPercent}%`;
                }
            } else { // Diversify
                if (uiElements.statSpecialP) {
                    uiElements.statSpecialP.classList.remove('hidden');
                    const icon = /** @type {HTMLElement | null} */ (uiElements.statSpecialP.querySelector('span'));
                    if (icon) icon.style.color = '#facc15';
                }
                if (uiElements.statSpecial) uiElements.statSpecial.textContent = 'Aura: Towers attack different enemies';
            }
        } else { // SUPPORT tower
            if (uiElements.statBoostP) {
                uiElements.statBoostP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statBoostP.querySelector('span'));
                if (icon) icon.style.color = '#f59e0b';
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
            if (icon) icon.style.color = '#ef4444';
        }
        if (uiElements.statDamage) {
            const finalDamage = (selectedTower.damage * selectedTower.damageMultiplier).toFixed(1);
            uiElements.statDamage.textContent = finalDamage;
        }
        if (uiElements.statSpeedP && selectedTower.type !== 'ORBIT') {
            uiElements.statSpeedP.classList.remove('hidden');
            const icon = /** @type {HTMLElement | null} */ (uiElements.statSpeedP.querySelector('span'));
            if (icon) icon.style.color = '#4ade80';
        }
        if (uiElements.statSpeed && selectedTower.type !== 'ORBIT') {
            uiElements.statSpeed.textContent = (60 / selectedTower.fireRate).toFixed(2);
        }
        if (selectedTower.type !== 'ORBIT') {
            if (uiElements.statRangeP) {
                uiElements.statRangeP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statRangeP.querySelector('span'));
                if (icon) icon.style.color = '#60a5fa';
            }
            if (uiElements.statRange) uiElements.statRange.textContent = Math.round(selectedTower.range).toString();
        }
        if (selectedTower.type === 'FIREPLACE') {
            if (uiElements.statBurnP) {
                uiElements.statBurnP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statBurnP.querySelector('span'));
                if (icon) icon.style.color = '#f97316';
            }
            if (uiElements.statBurn) uiElements.statBurn.textContent = `${selectedTower.burnDps.toFixed(1)}/s for ${selectedTower.burnDuration}s`;
        }
        if (selectedTower.type === 'NAT' || selectedTower.type === 'ORBIT') {
            if (uiElements.statProjectilesP) {
                uiElements.statProjectilesP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statProjectilesP.querySelector('span'));
                if (icon) icon.style.color = '#e0e0e0';
            }
            if (uiElements.statProjectiles) {
                uiElements.statProjectiles.textContent = selectedTower.type === 'NAT' ? (selectedTower.projectileCount || 1) : selectedTower.orbiters.length;
            }
        }
        if (selectedTower.type === 'STUN_BOT') {
            if (uiElements.statJumpsP) {
                uiElements.statJumpsP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statJumpsP.querySelector('span'));
                if (icon) icon.style.color = '#fef08a';
            }
            if (uiElements.statJumps) uiElements.statJumps.textContent = selectedTower.chainTargets;

            if (selectedTower.stunDuration > 0) {
                if (uiElements.statStunP) uiElements.statStunP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statStunP.querySelector('span'));
                if (icon) icon.style.color = '#fef08a';
                if (uiElements.statStun) uiElements.statStun.textContent = selectedTower.stunDuration;
            }
        }

        if (baseStats.armorPenetration > 0) {
            if (uiElements.statArmorPenP) {
                uiElements.statArmorPenP.classList.remove('hidden');
                const icon = /** @type {HTMLElement | null} */ (uiElements.statArmorPenP.querySelector('span'));
                if (icon) icon.style.color = '#9e9e9e';
            }
            if (uiElements.statArmorPen) uiElements.statArmorPen.textContent = `${(baseStats.armorPenetration * 100).toFixed(0)}%`;
        }
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
    range: { label: 'Rng', icon: 'radar', family: 'material-icons', color: '#60a5fa', condition: (s) => s.range > 0 && !['ORBIT', 'SUPPORT', 'CAT', 'MIND'].includes(s.type) },
    fireRate: { label: 'Spd', icon: 'speed', family: 'material-icons', color: '#4ade80', condition: (s) => s.fireRate > 0, formatter: (val) => (60 / val).toFixed(2) },
    splashRadius: { label: 'Spl', icon: 'bubble_chart', family: 'material-icons', color: '#c084fc', condition: (s) => s.splashRadius > 0 },
    attackSpeedBoost: { label: 'Spd Aura', icon: 'electric_bolt', family: 'material-icons', color: '#f59e0b', condition: (s) => s.attackSpeedBoost, formatter: (val) => `+${((1 - val) * 100).toFixed(0)}%` },
    damageBoost: { label: 'Dmg Aura', icon: 'electric_bolt', family: 'material-icons', color: '#f59e0b', condition: (s) => s.damageBoost, formatter: (val) => `+${((val - 1) * 100).toFixed(0)}%` },
    enemySlow: { label: 'Slow Aura', icon: 'hourglass_empty', family: 'material-symbols-outlined', color: '#38bdf8', condition: (s) => s.enemySlow, formatter: (val) => `${((1 - val) * 100).toFixed(0)}%` },
    goldBonus: { label: 'Gold Aura', icon: 'savings', family: 'material-icons', color: '#facc15', condition: (s) => s.goldBonus, formatter: (val) => `+${val}G` },
    armorPenetration: { label: 'AP', icon: 'shield_moon', family: 'material-symbols-outlined', color: '#9e9e9e', condition: (s) => s.armorPenetration > 0, formatter: (val) => `${(val * 100).toFixed(0)}%` },
    burnDps: { label: 'Burn', icon: 'local_fire_department', family: 'material-symbols-outlined', color: '#f97316', condition: (s) => s.burnDps, formatter: (val, stats) => `${val}/s for ${stats.burnDuration}s` },
    chainTargets: { label: 'Jumps', icon: 'electric_bolt', family: 'material-symbols-outlined', color: '#fef08a', condition: (s) => s.chainTargets > 0 },
    chainRange: { label: 'Jump Range', icon: 'social_distance', family: 'material-symbols-outlined', color: '#fef08a', condition: (s) => s.chainRange > 0 },
    stunDuration: { label: 'Stun', icon: 'bolt', family: 'material-symbols-outlined', color: '#fef08a', condition: (s) => s.stunDuration > 0, formatter: (val) => `${val}s` },
};

const enemyStatDisplayConfig = {
    health: { label: 'Health', icon: 'favorite', family: 'material-symbols-outlined', color: '#ef4444', condition: (s) => s.health > 0 },
    speed: { label: 'Speed', icon: 'speed', family: 'material-symbols-outlined', color: '#4ade80', condition: (s) => s.speed > 0 },
    gold: { label: 'Gold', icon: 'paid', family: 'material-symbols-outlined', color: '#facc15', condition: (s) => s.gold >= 0 },
    armor: { label: 'Armor', icon: 'security', family: 'material-symbols-outlined', color: '#9e9e9e', condition: (s) => s.armor > 0 },
    healInterval: { label: 'Heal Cooldown', icon: 'timer', family: 'material-symbols-outlined', color: '#4fc3f7', condition: (s) => s.isHealer, formatter: (val) => `${val}s` },
    healRange: { label: 'Heal Range', icon: 'social_distance', family: 'material-symbols-outlined', color: '#4fc3f7', condition: (s) => s.isHealer },
    healPercent: { label: 'Heal Amount', icon: 'healing', family: 'material-symbols-outlined', color: '#4fc3f7', condition: (s) => s.isHealer, formatter: (val) => `${(val * 100).toFixed(0)}%` },
};


function createTowerCardHTML(type, isDiscovered) {
    const stats = TOWER_TYPES[type];
    if (!stats) return '';

    const iconInfo = getTowerIconInfo(type);

    if (!isDiscovered) {
        return `
            <div class="tower-card absolute inset-0 p-2 flex flex-col items-center justify-center text-center">
                <span class="material-symbols-outlined" style="font-size: 100px; color: #FFFFFF; font-variation-settings: 'FILL' 1;">question_mark</span>
                <h4 class="text-4xl mt-2 text-white">???</h4>
                <p class="text-sm text-yellow-400 mt-2 italic">"?????????????"</p>
            </div>
        `;
    }

    const name = iconInfo.icon.replace(/_/g, ' ').toUpperCase();

    let iconHTML;
    const iconStyle = `font-size: 100px; color: ${stats.color};`;
    if (iconInfo.className.startsWith('fa-')) {
        iconHTML = `<i class="${iconInfo.className} fa-${iconInfo.icon}" style="${iconStyle}"></i>`;
    } else {
        let style = iconStyle;
        if (iconInfo.className.includes('material-symbols')) {
            style += ` font-variation-settings: 'FILL' 0;`;
        }
        iconHTML = `<span class="${iconInfo.className}" style="${style}">${iconInfo.icon}</span>`;
    }

    const commentHTML = `<p class="text-sm text-yellow-400 mt-2 mb-2 italic whitespace-normal">"${stats.comment || ''}"</p>`;

    // Build stats with icons dynamically from the config
    const statsGridHTML = Object.entries(statDisplayConfig)
        .map(([key, config]) => {
            const statValue = stats[key];
            const shouldDisplay = config.condition && config.condition(stats);
            // Special case: Always show Stun for STUN_BOT, even if the value is 0
            const isStunBotStun = type === 'STUN_BOT' && key === 'stunDuration';

            if (shouldDisplay || isStunBotStun) {
                const formattedValue = config.formatter ? config.formatter(statValue || 0, stats) : (statValue || 0);
                const pClass = `flex items-center gap-1 ${!statValue && isStunBotStun ? 'text-gray-500' : ''}`;
                const iconFamily = config.family || 'material-icons';
                return `<p class="${pClass}"><span class="${iconFamily} text-2xl align-bottom" style="color:${config.color};">${config.icon}</span>${config.label}: ${formattedValue}</p>`;
            }
            return ''; // Don't render the stat if the condition isn't met
        })
        .join('');


    const specialAbilities = [];
    if (stats.special) {
        specialAbilities.push(stats.special);
    }

    return `
        <div class="tower-card absolute inset-0 p-2 flex flex-col items-center text-center">
            <div class="flex-shrink-0">
                ${iconHTML}
                <h4 class="text-3xl mt-2 whitespace-normal" style="color: ${stats.color};">${name}</h4>
                <p class="text-sm text-gray-400">(${type})</p>
            </div>
            <div class="flex-grow overflow-y-auto w-full my-2">
                <div class="text-left text-base w-full grid grid-cols-2 gap-x-2 gap-y-1 px-2">
                    ${statsGridHTML}
                </div>
                ${specialAbilities.length > 0 ? `
                    <div class="text-left text-base w-full mt-4 px-2">
                        <h5 class="text-fuchsia-400">Abilities:</h5>
                        <ul class="list-disc list-inside text-sm">${specialAbilities.map(s => `<li>${s}</li>`).join('')}</ul>
                    </div>` : ''}
            </div>
            <div class="flex-shrink-0">
             ${commentHTML}
            </div>
        </div>
    `;
}

function createEnemyCardHTML(type, isDiscovered) {
    const stats = ENEMY_TYPES[type];
    if (!stats) return '';

    if (!isDiscovered) {
        return `
            <div class="enemy-card absolute inset-0 p-2 flex flex-col items-center justify-center text-center">
                <span class="material-symbols-outlined" style="font-size: 100px; color: #FFFFFF; font-variation-settings: 'FILL' 1;">question_mark</span>
                <h4 class="text-4xl mt-2 text-white">???</h4>
                <p class="text-sm text-yellow-400 mt-2 italic">"?????????????"</p>
            </div>
        `;
    }

    const name = stats.icon.replace(/_/g, ' ').toUpperCase();

    let iconHTML;
    const iconStyle = `font-size: 100px; color: ${stats.color};`;
    // Assuming enemy icons are always material-symbols-outlined or material-icons
    // If there are font-awesome icons for enemies, this logic needs to be extended.
    if (stats.iconFamily && stats.iconFamily.includes('Font Awesome')) { // Check for Font Awesome
        iconHTML = `<i class="fa-solid fa-${stats.icon}" style="${iconStyle}"></i>`;
    } else {
        let style = iconStyle;
        if (stats.iconFamily && stats.iconFamily.includes('Material Symbols Outlined')) {
            style += ` font-variation-settings: 'FILL' 0;`;
        }
        iconHTML = `<span class="${stats.iconFamily === 'Material Symbols Outlined' ? 'material-symbols-outlined' : 'material-icons'}" style="${style}">${stats.icon}</span>`;
    }

    const commentHTML = `<p class="text-sm text-yellow-400 mt-2 mb-2 italic whitespace-normal">"${stats.comment || ''}"</p>`;

    const specialAbilities = [];
    if (stats.isFlying) specialAbilities.push('Flying');
    if (stats.splashImmune) specialAbilities.push('Splash Immune');
    if (stats.laysEggs) specialAbilities.push('Lays Eggs');
    if (stats.isInvisible) specialAbilities.push('Stealth');
    if (stats.prefersDetour) specialAbilities.push('Prefers Detour');
    if (stats.isStationary) specialAbilities.push('Stationary');
    if (stats.isHealer) specialAbilities.push('Heals nearby allies');
    if (stats.spawnsMinions) specialAbilities.push(`Spawns ${stats.spawnCount} ${stats.minionType}s`);
    if (stats.hatchTime) specialAbilities.push(`Hatches into ${stats.hatchesTo}`);
    if (stats.phaseInterval) specialAbilities.push('Phasing');
    if (stats.splitsOnDeath) specialAbilities.push(`Splits into ${stats.splitCount} ${stats.splitInto}s`);

    // Build stats with icons dynamically from the config
    const statsGridHTML = Object.entries(enemyStatDisplayConfig)
        .map(([key, config]) => {
            if (config.condition && config.condition(stats)) {
                const statValue = stats[key];
                const formattedValue = config.formatter ? config.formatter(statValue, stats) : statValue;
                const iconFamily = config.family || 'material-symbols-outlined';
                return `<p class="flex items-center gap-1"><span class="${iconFamily} text-2xl align-bottom" style="color:${config.color};">${config.icon}</span>${config.label}: ${formattedValue}</p>`;
            }
            return '';
        })
        .join('');

    return `
        <div class="enemy-card absolute inset-0 p-2 flex flex-col items-center text-center">
            <div class="flex-shrink-0">
                ${iconHTML}
                <h4 class="text-3xl mt-2 whitespace-normal" style="color: ${stats.color};">${name}</h4>
                <p class="text-sm text-gray-400">(${type})</p>
            </div>
            <div class="flex-grow overflow-y-auto w-full my-2">
                <div class="text-left text-base w-full grid grid-cols-2 gap-x-2 gap-y-1 px-2">
                    ${statsGridHTML}
                </div>
                ${specialAbilities.length > 0 ? `
                    <div class="text-left text-base w-full mt-2 px-2">
                        <h5 class="text-fuchsia-400">Abilities:</h5>
                        <ul class="list-disc list-inside text-sm">${specialAbilities.map(s => `<li>${s}</li>`).join('')}</ul>
                    </div>` : ''}
            </div>
            <div class="flex-shrink-0">
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

export function populateTrophies(gameState, trophiesData) {
    if (!uiElements.trophiesList) return;
    uiElements.trophiesList.innerHTML = '';

    for (const [id, data] of Object.entries(trophiesData)) {
        const isUnlocked = gameState.unlockedTrophies.has(id);
        const trophyElement = document.createElement('div');
        trophyElement.className = `p-4 border-b border-gray-700 flex items-center gap-4 ${isUnlocked ? 'text-white' : 'text-gray-500'}`;

        const icon = isUnlocked ? data.icon : 'lock';
        const name = isUnlocked ? data.name : '???';
        const color = isUnlocked && data.color ? data.color : (isUnlocked ? '#facc15' : '#6b7280');
        const description = isUnlocked ? data.description : '????????????????????????';

        trophyElement.innerHTML = `
            <span class="material-symbols-outlined text-4xl" style="color: ${color};">${icon}</span>
            <div>
                <h4 class="text-lg font-bold" style="color: ${color};">${name}</h4>
                <p class="text-sm">${description}</p>
            </div>
        `;
        uiElements.trophiesList.appendChild(trophyElement);
    }
}

export function populateChangelog(changelogData) {
    if (!uiElements.changelogList) return;
    uiElements.changelogList.innerHTML = '';

    for (const entry of changelogData) {
        const entryElement = document.createElement('div');
        entryElement.className = 'p-4 border-b border-gray-700 text-white';

        const changesList = entry.changes.map(change => `<li class="ml-4 list-disc">${change}</li>`).join('');

        entryElement.innerHTML = `
            <div class="flex justify-between items-baseline">
                <h4 class="text-lg font-bold text-yellow-400">v${entry.version}</h4>
                <p class="text-sm text-gray-400">${entry.date}</p>
            </div>
            <ul class="mt-2 text-sm">
                ${changesList}
            </ul>
        `;
        uiElements.changelogList.appendChild(entryElement);
    }
}

export function populateMessageLog(announcements) {
    if (!uiElements.logList) return;
    uiElements.logList.innerHTML = '';

    // We iterate in reverse to show the newest messages at the bottom,
    // but since the container has `flex-col-reverse`, they appear at the top.
    [...announcements].reverse().forEach(announcement => {
        const logItem = document.createElement('div');
        logItem.className = 'p-2 bg-gray-800/50 rounded-md text-sm';

        const text = announcement.text.replace(/\n/g, ' ');
        const color = announcement.color || '#00ff88';

        logItem.innerHTML = `<p style="color: ${color}; text-shadow: 1px 1px 2px #000;">${text}</p>`;

        uiElements.logList.appendChild(logItem);
    });
}

export function showEndlessChoice() {
    if (uiElements.endlessChoiceModal) uiElements.endlessChoiceModal.classList.remove('hidden');
}

let glitterInterval = null;

function startGlitterAnimation() {
    const panel = uiElements.wave16PowerChoiceModal.querySelector('.game-over-modal');
    if (!panel) return;

    // Stop any existing animation
    if (glitterInterval) clearInterval(glitterInterval);

    /** @type {HTMLElement} */
    const panelEl = /** @type {HTMLElement} */ (panel);

    panelEl.style.position = 'relative'; // Needed for the absolute positioning of the glitter
    panelEl.style.overflow = 'hidden'; // Keep the glitter inside the panel bounds

    glitterInterval = setInterval(() => {
        const glitter = document.createElement('div');
        glitter.className = 'absolute bg-white rounded-full';
        glitter.style.width = '2px';
        glitter.style.height = '2px';
        glitter.style.boxShadow = '0 0 6px 1px #ffffff';
        glitter.style.animation = `glitter-border ${2 + Math.random() * 2}s linear forwards`;
        glitter.style.left = `${Math.random() * 100}%`;
        glitter.style.top = `${Math.random() * 100}%`;
        panel.appendChild(glitter);

        // Clean up the glitter element after animation
        setTimeout(() => glitter.remove(), 4000);
    }, 100);
}

export function showWave16PowerChoice() {
    return new Promise(resolve => {
        if (uiElements.wave16PowerChoiceModal) uiElements.wave16PowerChoiceModal.classList.remove('hidden');
        startGlitterAnimation();

        const createHandler = (handler) => (event) => {
            handler(event);
            resolve(); // Resolve the promise when a choice is made
        };

        // Use .once = true to automatically remove the listener after it's called.
        uiElements.deletePowerBtn.addEventListener('click', createHandler(handleDeletePower), { once: true });
        uiElements.cloudPowerBtn.addEventListener('click', createHandler(handleCloudPower), { once: true });
        uiElements.livesPowerBtn.addEventListener('click', createHandler(handleLivesPower), { once: true });
    });
}

function handleDeletePower() {
    // Grant the player a delete charge
    gameState.hasDelete = true;
    const announcement = new TextAnnouncement("DELETE armed! Press the button to use it.", 400, 300, 3, '#ff0000', 800);
    gameState.announcements.push(announcement);
    gameState.announcementLog.push(announcement);
    hideWave16PowerChoice();
    // Manually trigger the next step in the game loop since we paused it.
    // We need to import the function to call it.
    import('../js/main.js').then(main => {
        // This will increment the wave to 16 and prepare for the next wave.
        main.onEndWave();
    });
}

function handleCloudPower() {
    gameState.hasPermanentCloud = true;
    gameState.isCloudUnlocked = true; // Also unlock it for the current pre-wave phase
    const announcement = new TextAnnouncement("Cloud access permanently granted!", 400, 300, 3, '#00bfff', 800);
    // This is a persistent upgrade, so we should also update the UI to reflect it immediately.
    gameState.announcements.push(announcement);
    gameState.announcementLog.push(announcement);
    hideWave16PowerChoice();
    import('../js/main.js').then(main => {
        // This will increment the wave to 16 and prepare for the next wave.
        main.onEndWave();
    });
}

function handleLivesPower() {
    gameState.lives += 20;
    const announcement = new TextAnnouncement("+20 Lives!", 440 / 2, 720 / 2, 3, '#00ff00', 440);
    gameState.announcements.push(announcement);
    gameState.announcementLog.push(announcement);
    hideWave16PowerChoice();
    import('../js/main.js').then(main => {
        // This will increment the wave to 16 and prepare for the next wave.
        main.onEndWave();
    });
}

function hideWave16PowerChoice() {
    if (uiElements.wave16PowerChoiceModal) uiElements.wave16PowerChoiceModal.classList.add('hidden');
    if (glitterInterval) clearInterval(glitterInterval);
    updateUI(gameState, 1); // Update UI after choice
}

// Event listener for the actual nuke button
uiElements.deleteActivateBtn.addEventListener('click', () => {
    if (!gameState.hasDelete) return;

    // Use the nuke
    let goldFromNuke = 0;
    gameState.enemies.forEach(enemy => {
        goldFromNuke += enemy.gold;
        gameState.effects.push(new Effect(enemy.x, enemy.y, 'delete', enemy.size * 4, '#ff4d4d', 0.5));
    });

    gameState.gold += goldFromNuke;
    gameState.enemies = [];
    gameState.hasDelete = false; // It's a one-time use

    // Update the UI to hide the button
    updateUI(gameState, 1);
});
