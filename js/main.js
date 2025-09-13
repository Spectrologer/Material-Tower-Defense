import { TOWER_TYPES, ENEMY_TYPES, TILE_SIZE, GRID_EMPTY, GRID_TOWER, GRID_COLS, GRID_ROWS } from './constants.js';
import { Enemy, Tower, Projectile, Effect, TextAnnouncement } from './game-entities.js';
import { uiElements, updateUI, updateSellPanel, triggerGameOver, showMergeConfirmation, populateLibraries, populateTrophies, populateChangelog, showEndlessChoice } from './ui-manager.js';
import { drawPlacementGrid, drawPath, drawDetourPath, drawMergeTooltip, getTowerIconInfo, drawEnemyInfoPanel, drawSelectionRect } from './drawing-function.js';
import { MergeHandler } from './merge-logic.js';
import { gameState, addTower, resetGameState, persistGameState, loadGameStateFromStorage } from './game-state.js';
import { waveDefinitions, generateWave } from './wave-definitions.js';
import { changelog } from './changelog.js';
import {
    playHitSound, playMoneySound, playExplosionSound, playLifeLostSound,
    playWiggleSound, playCrackSound, playBzztSound, resumeAudioContext, toggleSoundEnabled,
    toggleMusic, setMusicOptions, setMusicTrack, nextMusicTrack, previousMusicTrack,
    SpecialTrack
} from './audio.js';

export const CHANGELOG_VERSION = changelog[0]?.version || '1.0.0';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("gameCanvas"));
const ctx = canvas.getContext('2d');
const mergeHandler = new MergeHandler();
let canvasWidth, canvasHeight;
let isInfiniteGold = false;
let mazeColor = '#818181ff';
let detourMazeColor = 'rgba(102, 102, 102, 0.2)'; // Slightly visible when inactive

const TROPHIES = {
    'NO_HEARTS_15': {
        name: "Heartless",
        description: "Beat wave 15 without building a PIN_HEART tower.",
        icon: 'heart_broken',
        color: '#ff69b4',
    },
    'PIN_15': {
        name: "PIN 15",
        description: "Reach wave 15 using only PIN towers.",
        icon: 'location_pin',
        color: '#FFFFFF',
        filled: true,
        iconClass: 'material-symbols-outlined',
    },
    'LIQUIDATION': {
        name: "Liquidation",
        description: "Sold more than 4 towers before reaching wave 15.",
        icon: 'attach_money',
        color: '#facc15',
        filled: true,
        iconClass: 'material-symbols-outlined',
    }
};

// UI/Interaction State (not part of core game data)
let placingTower = null;
let selectedTowers = [];
let selectedEnemy = null;
let gameSpeed = 1;
let placingFromCloud = null;
let draggedCloudTower = null;
let draggedCanvasTower = null;
let draggedCanvasTowerOriginalGridPos = { x: -1, y: -1 };
let mergeTooltip = { show: false, x: 0, y: 0, info: null };
let mouse = { x: 0, y: 0 };
let animationFrameId;
let lastTime = 0;
let pendingMergeState = null;
let settingAttackGroundForTower = null;
let isMergeConfirmationEnabled = true;
let isSellConfirmPending = false;
let libraryCurrentIndex = 0;
let libraryEnemyCurrentIndex = 0;
let libraryActiveTab = 'towers';
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };
let isDoubleClick = false;

function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    if (!container || !canvas.width || !canvas.height) return;
    const aspectRatio = canvas.width / canvas.height;
    const availableWidth = container.clientWidth;
    const availableHeight = container.clientHeight;
    let newWidth = availableWidth;
    let newHeight = newWidth / aspectRatio;
    if (newHeight > availableHeight) {
        newHeight = availableHeight;
        newWidth = newHeight * aspectRatio;
    }
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
    canvas.style.left = `${(availableWidth - newWidth) / 2}px`;
    canvas.style.top = `${(availableHeight - newHeight) / 2}px`;
}

function renderCloudInventory() {
    uiElements.cloudInventorySlots.innerHTML = '';
    gameState.cloudInventory.forEach(tower => {
        const towerIconInfo = getTowerIconInfo(tower.type);
        const isSelected = placingFromCloud === tower;
        const towerRep = document.createElement('button');
        towerRep.className = `pixel-button p-1 w-full h-14 flex flex-col items-center justify-center relative ${isSelected ? 'selected' : ''}`;
        const towerColor = (tower.type === 'MIND' && tower.mode === 'slow') ? '#0891b2' : ((tower.type === 'CAT' && tower.mode === 'slow') ? '#0891b2' : tower.color);
        towerRep.style.backgroundColor = towerColor;
        towerRep.style.borderColor = towerColor;
        towerRep.draggable = true;
        const levelDisplay = tower.level === 'MAX LEVEL' ? 'MAX' : tower.level;
        let iconEl;
        if (towerIconInfo.className.startsWith('fa-')) {
            iconEl = `<i class="${towerIconInfo.className} fa-${towerIconInfo.icon}" style="font-size: 24px; color: #1a1a1a;"></i>`;
        } else {
            iconEl = `<span class="${towerIconInfo.className}" style="font-size: 28px; color: #1a1a1a; font-variation-settings: 'FILL' 1;">${towerIconInfo.icon}</span>`;
        }
        towerRep.innerHTML = `
            ${iconEl}
            <span class="absolute bottom-0 right-1 text-xs font-bold text-black" style="text-shadow: 0 0 2px white, 0 0 2px white;">${levelDisplay}</span>
        `;
        towerRep.addEventListener('click', () => handleCloudTowerClick(tower));
        towerRep.addEventListener('dragstart', (e) => {
            draggedCloudTower = tower;
            e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'cloud', towerId: tower.id }));
            setTimeout(() => {
                towerRep.classList.add('opacity-50');
            }, 0);
        });
        towerRep.addEventListener('dragend', () => {
            draggedCloudTower = null;
            towerRep.classList.remove('opacity-50');
        });
        uiElements.cloudInventorySlots.appendChild(towerRep);
    });
}

/**
 * Calculates the greatest common divisor of two numbers.
 * @param {number} a
 * @param {number} b
 * @returns {number} The GCD.
 */
function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function checkTrophies() {
    // Trophy: NO_HEARTS_15 (Reach wave 15)
    if (gameState.wave === 15 && !gameState.usedPinHeartTower && !gameState.unlockedTrophies.has('NO_HEARTS_15')) {
        gameState.unlockedTrophies.add('NO_HEARTS_15');
        gameState.announcements.push(new TextAnnouncement("Trophy Unlocked!\nHeartless", canvasWidth / 2, canvasHeight / 2, 5, '#ffd700', canvasWidth));
    }

    // Trophy: PIN_15 (Reach wave 15 using only PIN towers)
    if (gameState.wave === 15 && gameState.onlyPinTowersUsed && !gameState.unlockedTrophies.has('PIN_15')) {
        gameState.unlockedTrophies.add('PIN_15');
        gameState.announcements.push(new TextAnnouncement("Trophy Unlocked!\nPIN 15", canvasWidth / 2, canvasHeight / 2, 5, '#4CAF50', canvasWidth));
    }

    // Trophy: LIQUIDATION (Sold more than 4 towers and reached wave 15)
    if (gameState.towersSoldThisGame > 4 && gameState.wave === 15 && !gameState.unlockedTrophies.has('LIQUIDATION')) {
        gameState.unlockedTrophies.add('LIQUIDATION');
        gameState.announcements.push(new TextAnnouncement("Trophy Unlocked!\nLiquidation", canvasWidth / 2, canvasHeight / 2, 5, '#facc15', canvasWidth));
    }
}


function spawnWave() {
    gameState.waveInProgress = true;
    gameState.spawningEnemies = true;
    updateUI(gameState, gameSpeed);
    uiElements.startWaveBtn.disabled = true;

    checkTrophies();

    const nextWave = gameState.wave;

    let waveDef;
    if (nextWave <= waveDefinitions.length) {
        waveDef = waveDefinitions[nextWave - 1];
    } else {
        waveDef = generateWave(nextWave);
    }

    if (!waveDef) {
        console.log("All waves completed!");
        gameState.spawningEnemies = false;
        triggerGameOver(true, gameState.wave - 1);
        return;
    }

    // New logic: Force detour closed for wave 1
    if (nextWave === 1) {
        gameState.isDetourOpen = false;
    } else {
        gameState.isDetourOpen = (waveDef.detourRatio || 0) > 0;
    }

    if (!waveDef.isBoss) {
        setMusicTrack(1, { bossMode: false });
    }

    const enemiesToSpawn = [];
    waveDef.composition.forEach(comp => {
        for (let i = 0; i < comp.count; i++) {
            enemiesToSpawn.push(comp.type);
        }
    });

    let spawned = 0;
    let detourCounter = 0;
    let detourNumerator = 0;
    let detourDenominator = 1;

    if (waveDef.detourRatio > 0) {
        const ratio = waveDef.detourRatio;
        let denominator = 1;
        while ((ratio * denominator) % 1 !== 0) {
            denominator *= 10;
        }
        let numerator = ratio * denominator;
        const commonDivisor = gcd(numerator, denominator);
        detourNumerator = numerator / commonDivisor;
        detourDenominator = denominator / commonDivisor;
    }


    const spawnNextEnemy = () => {
        if (spawned >= enemiesToSpawn.length) {
            gameState.spawningEnemies = false;
            return;
        }

        const enemyType = enemiesToSpawn[spawned];
        const enemyTypeName = Object.keys(ENEMY_TYPES).find(key => ENEMY_TYPES[key] === enemyType);

        if (enemyTypeName && !gameState.introducedEnemies.has(enemyTypeName)) {
            gameState.introducedEnemies.add(enemyTypeName);
            const displayName = enemyType.icon.replace(/_/g, ' ');
            gameState.announcements.push(new TextAnnouncement(`New Enemy:\n${displayName}`, canvasWidth / 2, 50, 3, undefined, canvasWidth));
        }

        let finalHealth, finalArmor;
        if (waveDef.isBoss) {
            finalHealth = enemyType.health;
            finalArmor = enemyType.armor;
            setMusicTrack(enemyType.musicTrack, { bossMode: true });
        } else {
            finalHealth = (enemyType.health * waveDef.healthMultiplier) + (waveDef.healthBonus || 0);
            finalArmor = (enemyType.armor * waveDef.healthMultiplier) + (waveDef.healthBonus || 0);
        }

        const finalEnemyType = { ...enemyType, health: Math.ceil(finalHealth), armor: Math.ceil(finalArmor), gold: enemyType.gold };

        let useDetour = false;
        if (gameState.isDetourOpen && enemyType.prefersDetour) {
            detourCounter++;
            if (detourCounter <= detourNumerator) {
                useDetour = true;
            }
            if (detourCounter >= detourDenominator) {
                detourCounter = 0;
            }
        }

        const pathForEnemy = useDetour ? gameState.pathWithDetour : gameState.path;
        gameState.enemies.push(new Enemy(finalEnemyType, pathForEnemy, enemyTypeName));
        spawned++;

        // --- Dynamic Spawn Rate Logic ---
        let nextSpawnDelay;
        if (waveDef.isSwarm) {
            nextSpawnDelay = 150;
        } else if (enemyType === ENEMY_TYPES.HEAVY) {
            nextSpawnDelay = 1200; // Increased delay for heavy enemies
        } else {
            nextSpawnDelay = 500; // Standard delay for other enemies
        }

        setTimeout(spawnNextEnemy, nextSpawnDelay / gameSpeed);
    };

    spawnNextEnemy(); // Start the spawning loop
}

function updateStealthVisibility() {
    const supportTowers = gameState.towers.filter(t => ['SUPPORT', 'MIND', 'CAT'].includes(t.type));
    const stealthEnemies = gameState.enemies.filter(e => e.type.isInvisible);

    if (stealthEnemies.length === 0) return;

    if (supportTowers.length === 0) {
        stealthEnemies.forEach(enemy => enemy.isVisible = false);
        return;
    }

    stealthEnemies.forEach(enemy => {
        let isDetected = false;
        const enemyGridX = Math.floor(enemy.x / TILE_SIZE);
        const enemyGridY = Math.floor(enemy.y / TILE_SIZE);

        for (const tower of supportTowers) {
            const towerGridX = Math.floor(tower.x / TILE_SIZE);
            const towerGridY = Math.floor(tower.y / TILE_SIZE);
            const detectionRange = TOWER_TYPES[tower.type].stealthDetectionRange;

            if (detectionRange && Math.abs(towerGridX - enemyGridX) <= detectionRange && Math.abs(towerGridY - enemyGridY) <= detectionRange) {
                isDetected = true;
                break;
            }
        }
        enemy.isVisible = isDetected;
    });
}


function applyAuraEffects() {
    // Reset enemies' slow multiplier first.
    gameState.enemies.forEach(enemy => {
        enemy.slowMultiplier = 1;
    });

    // Handle buff applications to towers by finding the single best buff for each stat.
    gameState.towers.forEach(targetTower => {
        // Reset flags and buffs for this frame
        targetTower.isUnderDiversifyAura = false;

        if (!['SUPPORT', 'MIND', 'CAT'].includes(targetTower.type)) {
            // Reset to base stats before calculating this frame's buffs
            targetTower.fireRate = targetTower.permFireRate;
            targetTower.damageMultiplier = 1;
            targetTower.goldBonus = 0;
            targetTower.goldBuffProviderId = null;

            let bestSpeedBoost = 1;
            let bestDamageBoost = 1;
            let bestGoldBonus = 0;
            let goldProviderId = null;
            let isDiversified = false;

            const targetGridX = Math.floor(targetTower.x / TILE_SIZE);
            const targetGridY = Math.floor(targetTower.y / TILE_SIZE);

            // Find all adjacent aura towers and determine the best buff/flag they offer
            gameState.towers.forEach(auraTower => {
                if (['SUPPORT', 'MIND', 'CAT'].includes(auraTower.type)) {
                    const auraGridX = Math.floor(auraTower.x / TILE_SIZE);
                    const auraGridY = Math.floor(auraTower.y / TILE_SIZE);

                    if (Math.abs(auraGridX - targetGridX) <= 1 && Math.abs(auraGridY - targetGridY) <= 1) {
                        // Check for diversify mode
                        if (auraTower.mode === 'diversify') {
                            isDiversified = true;
                        }

                        // Check for buffs
                        if (auraTower.type === 'SUPPORT') {
                            bestSpeedBoost = Math.min(bestSpeedBoost, auraTower.attackSpeedBoost);
                        } else if (['MIND', 'CAT'].includes(auraTower.type) && auraTower.mode === 'boost') {
                            bestSpeedBoost = Math.min(bestSpeedBoost, auraTower.attackSpeedBoost);
                            bestDamageBoost = Math.max(bestDamageBoost, auraTower.damageBoost);
                        }
                        if (auraTower.type === 'CAT') {
                            if (auraTower.goldBonus > bestGoldBonus) {
                                bestGoldBonus = auraTower.goldBonus;
                                goldProviderId = auraTower.id;
                            }
                        }
                    }
                }
            });

            // Apply the best buffs and flags found
            targetTower.isUnderDiversifyAura = isDiversified;
            targetTower.fireRate *= bestSpeedBoost;
            targetTower.damageMultiplier = bestDamageBoost;
            targetTower.goldBonus = bestGoldBonus;
            targetTower.goldBuffProviderId = goldProviderId;
        }
    });

    // Handle enemy slowing auras separately
    gameState.towers.forEach(auraTower => {
        if (['MIND', 'CAT'].includes(auraTower.type) && auraTower.mode === 'slow') {
            const auraGridX = Math.floor(auraTower.x / TILE_SIZE);
            const auraGridY = Math.floor(auraTower.y / TILE_SIZE);
            gameState.enemies.forEach(enemy => {
                const enemyGridX = Math.floor(enemy.x / TILE_SIZE);
                const enemyGridY = Math.floor(enemy.y / TILE_SIZE);
                if (Math.abs(auraGridX - enemyGridX) <= 1 && Math.abs(auraGridY - enemyGridY) <= 1) {
                    enemy.slowMultiplier = Math.min(enemy.slowMultiplier, auraTower.enemySlow);
                }
            });
        }
    });
}

function handleProjectileHit(projectile, hitEnemy) {
    const targetEnemy = hitEnemy || projectile.target;

    // Create the explosion visual effect for Anti-Air rockets at the exact point of collision.
    if (projectile.owner.type === 'ANTI_AIR') {
        gameState.effects.push(new Effect(projectile.x, projectile.y, 'explosion', 25, '#e2d2b3ff', 0.2));
    }

    const finalDamage = projectile.owner.damage * projectile.owner.damageMultiplier * projectile.damageMultiplier;

    const awardGold = (enemy) => {
        if (enemy.type.icon === ENEMY_TYPES.BITCOIN.icon) return;
        const bonusGold = projectile.owner.goldBonus || 0;
        const goldToGive = enemy.gold + bonusGold;

        if (goldToGive > 0) {
            gameState.gold += goldToGive;
            if (bonusGold > 0 && projectile.owner.goldBuffProviderId) {
                const catTower = gameState.towers.find(t => t.id === projectile.owner.goldBuffProviderId);
                if (catTower) {
                    catTower.goldGenerated = (catTower.goldGenerated || 0) + bonusGold;
                }
            }
            gameState.effects.push(new Effect(enemy.x, enemy.y, 'attach_money', enemy.gold * 5 + 10, '#FFD700', 0.5));
        }
    };

    const splashCenter = projectile.isMortar ? { x: projectile.targetX, y: projectile.targetY } : (targetEnemy ? { x: targetEnemy.x, y: targetEnemy.y } : null);

    // Handle mortar with radial pin upgrade: only fires pins, no splash damage.
    if (projectile.isMortar && projectile.owner.mortarReplacedByPins) {
        gameState.effects.push(new Effect(splashCenter.x, splashCenter.y, 'adjust', projectile.owner.splashRadius * 2, '#FFFFFF', 0.33)); // Visual for pin burst
        if (projectile.owner.radialPinCount > 0) {
            const pinCount = projectile.owner.radialPinCount;
            // Create a temporary "owner" for the pins at the impact location
            const fakePinOwner = {
                x: splashCenter.x,
                y: splashCenter.y,
                type: 'PIN',
                // Pins inherit the FORT's damage and multipliers, but deal half damage
                damage: projectile.owner.damage / 2,
                damageMultiplier: projectile.owner.damageMultiplier,
                goldBonus: projectile.owner.goldBonus,
                goldBuffProviderId: projectile.owner.goldBuffProviderId,
                killCount: 0, // Pins from mortars don't track kills to the main tower
                // Pin-specific properties
                projectileSpeed: 7, // Using standard PIN speed
                projectileSize: 18, // Making them large and visible
                projectileColor: '#FFFFFF',
                splashRadius: 0 // Pins do not have splash damage
            };
            for (let i = 0; i < pinCount; i++) {
                // Fire pins outwards in a circle
                const angle = (2 * Math.PI / pinCount) * i;
                const fakeTarget = {
                    x: splashCenter.x + Math.cos(angle) * 1000,
                    y: splashCenter.y + Math.sin(angle) * 1000,
                    health: Infinity
                };
                const newProjectile = new Projectile(fakePinOwner, fakeTarget);
                gameState.projectiles.push(newProjectile);
            }
        }
        updateUI(gameState, gameSpeed);
        return; // End execution here for this projectile type
    }


    if (!splashCenter) return; // Should not happen if not a mortar

    if (projectile.owner.type === 'FIREPLACE') {
        gameState.effects.push(new Effect(splashCenter.x, splashCenter.y, 'local_fire_department', projectile.owner.splashRadius * 2, projectile.owner.projectileColor, 0.33));
        gameState.enemies.forEach(enemy => {
            if (Math.hypot(splashCenter.x - enemy.x, splashCenter.y - enemy.y) <= projectile.owner.splashRadius) {
                const canHit = (projectile.owner.hasShrapnel && enemy.type.isFlying) || !enemy.type.isFlying;
                if ((enemy === targetEnemy || !enemy.type.splashImmune) && canHit) {
                    projectile.isTrueDamage = (enemy === targetEnemy); // Set flag for main target
                    if (enemy.takeDamage(finalDamage, projectile)) {
                        projectile.owner.killCount++;
                        awardGold(enemy);
                    }
                    playHitSound();
                    enemy.applyBurn(projectile.owner.burnDps, projectile.owner.burnDuration);
                }
            }
        });
    } else if (projectile.owner.splashRadius > 0) {
        // Use the 'explosion' material symbol for Castle and Fort explosions
        gameState.effects.push(new Effect(splashCenter.x, splashCenter.y, 'explosion', projectile.owner.splashRadius * 2, projectile.owner.projectileColor, 0.33));
        gameState.enemies.forEach(enemy => {
            if (Math.hypot(splashCenter.x - enemy.x, splashCenter.y - enemy.y) <= projectile.owner.splashRadius) {
                const canHit = (projectile.owner.hasShrapnel && enemy.type.isFlying) || !enemy.type.isFlying;
                if ((enemy === targetEnemy || !enemy.type.splashImmune) && canHit) {
                    projectile.isTrueDamage = (enemy === targetEnemy); // Set flag for main target
                    if (enemy.takeDamage(finalDamage, projectile)) {
                        projectile.owner.killCount++;
                        awardGold(enemy);
                    }
                    playHitSound();
                }
            }
        });
    } else {
        if (targetEnemy && typeof targetEnemy.takeDamage === 'function') {
            projectile.isTrueDamage = true; // Direct hits are always true damage
            if (targetEnemy.takeDamage(finalDamage, projectile)) {
                projectile.owner.killCount++;
                awardGold(targetEnemy);
            }
            playHitSound();
        }
    }
    updateUI(gameState, gameSpeed);
}

function gameLoop(currentTime) {
    if (!lastTime) {
        lastTime = currentTime;
    }
    const deltaTime = (currentTime - lastTime) / 1000; // Delta time in seconds
    lastTime = currentTime;

    if (gameState.gameOver) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    const effectiveDeltaTime = deltaTime * gameSpeed;
    const frameTargetedEnemies = new Set();

    updateStealthVisibility();
    applyAuraEffects();
    const onEnemyDeath = (enemy, payload = {}) => {
        if (selectedEnemy === enemy) {
            selectedEnemy = null;
        }
        if (enemy.typeName) {
            gameState.killedEnemies.add(enemy.typeName);
        }
        if (enemy.gold > 0) {
            playMoneySound();
        }
        if (payload.isAnimatedDeath) {
            gameState.effects.push(new Effect(enemy.x, enemy.y, 'explosion', enemy.size * 4, '#ff9900', 0.5));
            playExplosionSound();
        }
    };

    const newlySpawnedEnemies = [];

    gameState.towers.forEach(tower => tower.update(gameState.enemies, gameState.projectiles, onEnemyDeath, effectiveDeltaTime, frameTargetedEnemies, gameState.path, gameState.effects, playBzztSound));
    gameState.projectiles = gameState.projectiles.filter(p => p.update(handleProjectileHit, gameState.enemies, gameState.effects, effectiveDeltaTime));
    gameState.enemies = gameState.enemies.filter(enemy => enemy.update(
        (e) => { // onFinish
            if (e.type.icon === ENEMY_TYPES.BITCOIN.icon) {
                gameState.gold = Math.max(0, gameState.gold - 1);
                updateUI(gameState, gameSpeed);
                const goldCounterRect = uiElements.goldEl.getBoundingClientRect();
                const goldX = goldCounterRect.left + (goldCounterRect.width / 3);
                const goldY = goldCounterRect.top + (goldCounterRect.height / 3);
                const canvasGoldX = (goldX / window.innerWidth) * canvasWidth;
                const canvasGoldY = (goldY / window.innerHeight) * canvasHeight;
                gameState.announcements.push(new TextAnnouncement("-$ ", canvasGoldX, canvasGoldY, 1, '#ff4d4d', canvasWidth));
            }

            if (e.type.damagesLives) {
                gameState.lives--;
                playLifeLostSound();
                updateUI(gameState, gameSpeed);
                if (gameState.lives <= 0) {
                    gameState.gameOver = true;
                    gameState.waveInProgress = false;
                    persistGameState(0);
                    triggerGameOver(false, gameState.wave - 1);
                    setMusicTrack(SpecialTrack.gameOver, { bossMode: false });
                }
            }
        },
        onEnemyDeath,
        newlySpawnedEnemies,
        playWiggleSound,
        playCrackSound,
        effectiveDeltaTime,
        playHitSound
    ));

    gameState.enemies.push(...newlySpawnedEnemies);

    gameState.effects = gameState.effects.filter(effect => effect.update(effectiveDeltaTime));
    gameState.announcements = gameState.announcements.filter(announcement => announcement.update(effectiveDeltaTime));

    if (isInfiniteGold) {
        gameState.gold = 99999;
    }

    if (selectedTowers.length > 0) {
        updateSellPanel(selectedTowers, gameState.isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower);
    }

    if (gameState.waveInProgress && gameState.enemies.length === 0 && !gameState.spawningEnemies) {
        gameState.waveInProgress = false;
        gameState.isDetourOpen = false;

        // Check for an announcement for the *next* wave from the wave that just ended.
        const completedWaveDef = waveDefinitions[gameState.wave - 1];
        if (completedWaveDef && completedWaveDef.endOfWaveAnnouncement) {
            const announcement = completedWaveDef.endOfWaveAnnouncement;
            setTimeout(() => {
                gameState.announcements.push(new TextAnnouncement(announcement.text, canvasWidth / 2, canvasHeight / 2, 5, announcement.color, canvasWidth));
            }, 1500);
        }

        onEndWave();
    }
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Determine detour path color based on current and next wave
    const nextWaveDef = waveDefinitions[gameState.wave - 1];
    const isDetourInNextWave = nextWaveDef && nextWaveDef.detourRatio > 0;

    let effectiveDetourColor = detourMazeColor; // Default to slightly visible
    if (gameState.isDetourOpen || isDetourInNextWave) { // Fully visible if active or upcoming
        effectiveDetourColor = mazeColor;
    }
    drawDetourPath(ctx, gameState.detourPath, effectiveDetourColor);
    drawPath(ctx, canvasWidth, gameState.path, mazeColor);

    // Draw ground target marker if one is set for the selected tower
    if (selectedTowers.length === 1) {
        const selectedTower = selectedTowers[0];
        if ((selectedTower.type === 'FORT' || selectedTower.type === 'NINE_PIN') && selectedTower.attackGroundTarget) {
            const target = selectedTower.attackGroundTarget;
            ctx.save();
            ctx.strokeStyle = '#ff4d4d';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.moveTo(target.x - 10, target.y - 10);
            ctx.lineTo(target.x + 10, target.y + 10);
            ctx.moveTo(target.x + 10, target.y - 10);
            ctx.lineTo(target.x - 10, target.y + 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(target.x, target.y, 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }


    gameState.enemies.forEach(enemy => {
        enemy.draw(ctx);
    });
    if (placingTower) {
        drawPlacementGrid(ctx, canvasWidth, canvasHeight, gameState.placementGrid, mouse);
    }
    gameState.towers.forEach(tower => tower.draw(ctx));
    if (selectedTowers.length > 0) {
        selectedTowers.forEach(t => {
            if (!['ORBIT', 'SUPPORT', 'CAT', 'MIND'].includes(t.type)) {
                t.drawRange(ctx);
            }
            if (['SUPPORT', 'MIND', 'CAT'].includes(t.type)) t.drawBuffEffect(ctx);
        });
    }
    gameState.projectiles.forEach(p => p.draw(ctx));
    gameState.effects.forEach(effect => effect.draw(ctx));
    gameState.announcements.forEach(announcement => announcement.draw(ctx));
    if (selectedEnemy) {
        selectedEnemy.drawSelection(ctx);
        drawEnemyInfoPanel(ctx, selectedEnemy, canvasWidth);
    }
    if (settingAttackGroundForTower) {
        const gridX = Math.floor(mouse.x / TILE_SIZE);
        const gridY = Math.floor(mouse.y / TILE_SIZE);
        const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
        const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#ff4d4d';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.arc(snappedX, snappedY, 15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(snappedX - 10, snappedY);
        ctx.lineTo(snappedX + 10, snappedY);
        ctx.moveTo(snappedX, snappedY - 10);
        ctx.lineTo(snappedX, snappedY + 10);
        ctx.stroke();

        ctx.restore();
    }
    if (placingTower) {
        const gridX = Math.floor(mouse.x / TILE_SIZE);
        const gridY = Math.floor(mouse.y / TILE_SIZE);
        const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
        const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;
        const towerTypeForPlacement = placingFromCloud?.type || draggedCloudTower?.type || draggedCanvasTower?.type || placingTower;
        const tempTower = new Tower(snappedX, snappedY, towerTypeForPlacement);
        if (placingFromCloud || draggedCloudTower || draggedCanvasTower) {
            Object.assign(tempTower, placingFromCloud || draggedCloudTower || draggedCanvasTower);
            tempTower.x = snappedX;
            tempTower.y = snappedY;
        }
        tempTower.draw(ctx);
        // Only draw range if the tower type is NOT in the excluded list
        if (!['ORBIT', 'SUPPORT', 'CAT', 'MIND'].includes(tempTower.type)) {
            tempTower.drawRange(ctx);
        }
        const isNinePin = tempTower.type === 'NINE_PIN';
        let placementColor = 'rgba(0, 255, 0, 0.4)'; // Default to green for valid
        let shakeOffsetX = 0;
        let shakeOffsetY = 0;

        const hoveredTower = gameState.towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            // For Nine Pin, check the whole 3x3 area for a click
            if (t.type === 'NINE_PIN') {
                const startX = tGridX - 1;
                const startY = tGridY - 1;
                return gridX >= startX && gridX < startX + 3 && gridY >= startY && gridY < startY + 3;
            }
            return tGridX === gridX && tGridY === gridY;
        });
        const mergeInfo = hoveredTower ? mergeHandler.getMergeInfo(hoveredTower, placingTower, gameState) : null;

        if (!isValidPlacement(snappedX, snappedY, isNinePin)) {
            if (mergeInfo) {
                placementColor = 'rgba(0, 191, 255, 0.4)'; // Light blue for merge opportunity
            } else {
                placementColor = 'rgba(255, 0, 0, 0.4)'; // Red for truly invalid
                // Simple shaking animation: oscillate offset based on time
                const shakeMagnitude = 2; // Pixels
                shakeOffsetX = Math.sin(currentTime * 0.05) * shakeMagnitude;
                shakeOffsetY = Math.cos(currentTime * 0.05) * shakeMagnitude;
            }
        }

        // Draw the temporary tower with potential shake offset
        tempTower.x = snappedX + shakeOffsetX;
        tempTower.y = snappedY + shakeOffsetY;
        tempTower.draw(ctx);
        // Only draw range if the tower type is NOT in the excluded list
        if (!['ORBIT', 'SUPPORT', 'CAT', 'MIND'].includes(tempTower.type)) {
            tempTower.drawRange(ctx);
        }

        ctx.fillStyle = placementColor;
        ctx.beginPath();
        if (isNinePin) {
            const drawX = (gridX - 1) * TILE_SIZE;
            const drawY = (gridY - 1) * TILE_SIZE;
            ctx.fillRect(drawX, drawY, TILE_SIZE * 3, TILE_SIZE * 3);
        } else {
            ctx.arc(snappedX, snappedY, TILE_SIZE / 2, 0, Math.PI * 2);
        }
        ctx.fill();
    }
    drawMergeTooltip(ctx, mergeTooltip, canvasWidth);
    if (isSelecting) {
        drawSelectionRect(ctx, selectionStart, selectionEnd);
    }
    animationFrameId = requestAnimationFrame(gameLoop);
}

function onEndWave() {
    if (gameState.wave === 25 && !gameState.waveInProgress) {
        showEndlessChoice();
        persistGameState(0);
        return;
    }

    gameState.wave++;
    uiElements.startWaveBtn.disabled = false;
    setMusicTrack(1, { bossMode: false });
    if (gameState.wave > 1) {
        const interestEarned = Math.floor(gameState.gold * 0.05);
        if (interestEarned > 0) {
            gameState.gold += interestEarned;
            gameState.announcements.push(new TextAnnouncement(`+${interestEarned}G Interest!`, canvasWidth / 2, 80, 3, undefined, canvasWidth));
        }
    }
    const waveBonus = 20 + gameState.wave;
    gameState.gold += waveBonus;
    updateUI(gameState, gameSpeed);
    persistGameState(0);
}

function isValidNinePinPlacement(gridX, gridY) {
    // Check the 3x3 area around the clicked center point
    const startX = gridX - 1;
    const startY = gridY - 1;
    for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
            const checkX = startX + i;
            const checkY = startY + j;

            if (checkX < 0 || checkX >= GRID_COLS || checkY < 0 || checkY >= GRID_ROWS ||
                gameState.placementGrid[checkY][checkX] !== GRID_EMPTY) {
                return false;
            }
        }
    }
    return true;
}

function isValidPlacement(x, y, isNinePin = false) {
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);

    if (isNinePin) {
        return isValidNinePinPlacement(gridX, gridY);
    }

    // For regular towers
    const cols = Math.floor(canvasWidth / TILE_SIZE);
    const rows = Math.floor(canvasHeight / TILE_SIZE);
    if (gridX < 0 || gridX >= cols || gridY < 0 || gridY >= rows) {
        return false;
    }
    return gameState.placementGrid[gridY] && gameState.placementGrid[gridY][gridX] === GRID_EMPTY;
}

function selectTowerToPlace(towerType) {
    resumeAudioContext();
    const cost = TOWER_TYPES[towerType].cost;
    if (gameState.gold >= cost || isInfiniteGold) {
        if (placingFromCloud) {
            placingFromCloud = null;
            renderCloudInventory();
        }
        placingTower = (placingTower === towerType) ? null : towerType;
        selectedTowers = [];
        isSellConfirmPending = false;
        selectedEnemy = null;
        updateSellPanel([], gameState.isCloudUnlocked, isSellConfirmPending);
        uiElements.buyPinBtn.classList.toggle('selected', placingTower === 'PIN');
        uiElements.buyCastleBtn.classList.toggle('selected', placingTower === 'CASTLE');
        uiElements.buySupportBtn.classList.toggle('selected', placingTower === 'SUPPORT');
    }
}

function handleCloudTowerClick(towerToPlace) {
    resumeAudioContext();
    if (placingTower) {
        placingTower = null;
        placingFromCloud = null;
        document.querySelectorAll('.tower-button.selected').forEach(btn => btn.classList.remove('selected'));
    }
    placingFromCloud = towerToPlace;
    placingTower = towerToPlace.type;
    selectedTowers = [];
    isSellConfirmPending = false;
    selectedEnemy = null;
    updateSellPanel([], gameState.isCloudUnlocked, isSellConfirmPending);
    renderCloudInventory();
}

/**
 * A robust function to check the entire board for a 3x3 square of PIN towers.
 * If found, it replaces them with a NINE_PIN tower.
 */
function checkForNinePinOnBoard() {
    const pinTowers = gameState.towers.filter(t => t.type === 'PIN');
    if (pinTowers.length < 9) return;

    const pinGrid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(false));

    // Create a map of where pins are for quick lookup
    pinTowers.forEach(pin => {
        const gridX = Math.floor(pin.x / TILE_SIZE);
        const gridY = Math.floor(pin.y / TILE_SIZE);
        pinGrid[gridY][gridX] = true;
    });

    // Check for any 3x3 square from the top-left
    for (let y = 0; y <= GRID_ROWS - 3; y++) {
        for (let x = 0; x <= GRID_COLS - 3; x++) {
            let isComplete = true;
            for (let j = 0; j < 3; j++) {
                for (let i = 0; i < 3; i++) {
                    if (!pinGrid[y + j][x + i]) {
                        isComplete = false;
                        break;
                    }
                }
                if (!isComplete) break;
            }

            if (isComplete) {
                // Found a 3x3 square starting at (x, y)
                // Now, find the actual tower objects to remove them
                let towersToRemove = [];
                let totalCost = 0;
                for (let j = 0; j < 3; j++) {
                    for (let i = 0; i < 3; i++) {
                        const tower = gameState.towers.find(t =>
                            t.type === 'PIN' &&
                            Math.floor(t.x / TILE_SIZE) === (x + i) &&
                            Math.floor(t.y / TILE_SIZE) === (y + j)
                        );
                        if (tower) {
                            towersToRemove.push(tower);
                            totalCost += tower.cost;
                        }
                    }
                }

                if (towersToRemove.length === 9) {
                    // Remove old pins
                    gameState.towers = gameState.towers.filter(t => !towersToRemove.some(rem => rem.id === t.id));

                    // Create and add new Nine Pin
                    const centerX = (x + 1) * TILE_SIZE + TILE_SIZE / 2;
                    const centerY = (y + 1) * TILE_SIZE + TILE_SIZE / 2;
                    const ninePin = new Tower(centerX, centerY, 'NINE_PIN');
                    ninePin.cost = totalCost;
                    addTower(ninePin);
                    gameState.discoveredTowerTypes.add('NINE_PIN');

                    // Update placement grid for the new tower
                    for (let j = 0; j < 3; j++) {
                        for (let i = 0; i < 3; i++) {
                            gameState.placementGrid[y + j][x + i] = GRID_TOWER;
                        }
                    }

                    gameState.announcements.push(new TextAnnouncement("NINE PIN!", canvasWidth / 2, 50, 3, '#FFFFFF', canvasWidth));
                    selectedTowers = [ninePin];
                    return; // Found and created one, so we are done.
                }
            }
        }
    }
}

function handleCanvasClick(e) {
    const isShiftPressed = e.shiftKey;
    if (isDoubleClick) {
        // If a double-click just occurred, ignore this single click event
        return;
    }

    const previouslySelectedTowers = [...selectedTowers];
    const mousePos = getMousePos(canvas, e);
    const gridX = Math.floor(mousePos.x / TILE_SIZE);
    const gridY = Math.floor(mousePos.y / TILE_SIZE);
    const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;
    let actionTaken = false;
    let isPlacingMode = placingTower || placingFromCloud;

    // Handle setting mortar attack ground target
    if (settingAttackGroundForTower) {
        const distance = Math.hypot(snappedX - settingAttackGroundForTower.x, snappedY - settingAttackGroundForTower.y);
        if (distance <= settingAttackGroundForTower.range) {
            if (settingAttackGroundForTower.type === 'FORT' || settingAttackGroundForTower.type === 'NINE_PIN') {
                settingAttackGroundForTower.attackGroundTarget = { x: snappedX, y: snappedY };
                settingAttackGroundForTower.targetingMode = 'ground';
            }
        }
        settingAttackGroundForTower = null;
        updateSellPanel(selectedTowers, gameState.isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower);
        return; // This action is complete.
    }

    // Prioritize clicking on an enemy
    const clickedOnEnemy = gameState.enemies.find(en => en.isVisible && Math.hypot(mousePos.x - en.x, mousePos.y - en.y) < en.size);
    if (clickedOnEnemy && !isPlacingMode) {
        selectedEnemy = clickedOnEnemy;
        selectedTowers = []; // Deselect any tower
        actionTaken = true;
    } else if (isPlacingMode) {
        const towerToPlaceType = placingTower;
        let mergingTower = null;
        let mergingFromCloud = false;
        let costOfPlacingTower;

        if (placingFromCloud) {
            mergingTower = placingFromCloud;
            mergingFromCloud = true;
            costOfPlacingTower = mergingTower.cost;
        } else { // Placing from buy menu
            costOfPlacingTower = TOWER_TYPES[towerToPlaceType].cost;
            mergingTower = { type: towerToPlaceType, cost: costOfPlacingTower, id: crypto.randomUUID() };
        }

        // If the user can't afford the tower, cancel the placement action.
        if (gameState.gold < costOfPlacingTower && !mergingFromCloud && !isInfiniteGold) {
            placingTower = null;
            placingFromCloud = null;
            draggedCloudTower = null;
            selectedTowers = [];
            actionTaken = true;
            uiElements.buyPinBtn.classList.remove('selected');
            uiElements.buyCastleBtn.classList.remove('selected');
            uiElements.buySupportBtn.classList.remove('selected');
            return; // Exit the function early
        }


        if (gameState.gold < costOfPlacingTower && !mergingFromCloud && !isInfiniteGold) return;

        const clickedOnTower = gameState.towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            // Check for Nine Pin tower's 3x3 collision area
            if (t.type === 'NINE_PIN') {
                const startX = tGridX - 1;
                const startY = tGridY - 1;
                return gridX >= startX && gridX < startX + 3 && gridY >= startY && gridY < startY + 3;
            }
            return tGridX === gridX && tGridY === gridY;
        });
        const mergeInfo = clickedOnTower ? mergeHandler.getMergeInfo(clickedOnTower, mergingTower.type, gameState) : null;
        const isNinePin = mergingTower.type === 'NINE_PIN';
        if (mergeInfo) {
            pendingMergeState = {
                existingTower: clickedOnTower,
                mergingTower: mergingTower,
                placingTowerType: mergingTower.type,
                mergeInfo: mergeInfo,
                placingFromCloud: mergingFromCloud,
                mergingFromCanvas: false, // Cannot be dragging when clicking
                originalPosition: draggedCanvasTowerOriginalGridPos
            };
            if (isMergeConfirmationEnabled) {
                showMergeConfirmation(pendingMergeState);
            }
            else {
                performPendingMerge();
            }
            // Only cancel placement mode if shift is NOT pressed
            if (!isShiftPressed) {
                placingTower = null;
                placingFromCloud = null;
                draggedCloudTower = null;
                selectedTowers = []; // Deselect after a merge is initiated
            }
            // This is always an action, regardless of shift key
            actionTaken = true;
        } else if (isValidPlacement(snappedX, snappedY, isNinePin)) {
            let newTower;
            if (mergingFromCloud) {
                newTower = mergingTower;
                newTower.x = snappedX;
                newTower.y = snappedY;
                gameState.cloudInventory = gameState.cloudInventory.filter(t => t.id !== mergingTower.id);
                renderCloudInventory();
            } else { // Placing a new tower from the buy menu
                const newTowerType = mergingTower.type;
                newTower = new Tower(snappedX, snappedY, newTowerType);
                gameState.gold -= costOfPlacingTower;
            }

            if (newTower.type === 'SUPPORT' && !gameState.hasPlacedFirstSupport) {
                gameState.announcements.push(new TextAnnouncement("Support\nAgent\nis Online", canvasWidth / 2, 50, 3, undefined, canvasWidth));
                gameState.hasPlacedFirstSupport = true;
            }
            if (isNinePin) {
                const startX = gridX - 1;
                const startY = gridY - 1;
                for (let j = 0; j < 3; j++) {
                    for (let i = 0; i < 3; i++) {
                        gameState.placementGrid[startY + j][startX + i] = GRID_TOWER;
                    }
                }
            } else {
                gameState.placementGrid[gridY][gridX] = GRID_TOWER;
            }
            addTower(newTower);
            if (newTower.type === 'PIN') {
                checkForNinePinOnBoard();
            }
            if (!isShiftPressed) {
                placingTower = null;
                placingFromCloud = null;
                uiElements.buyPinBtn.classList.remove('selected');
                uiElements.buyCastleBtn.classList.remove('selected');
                uiElements.buySupportBtn.classList.remove('selected');
            }
            actionTaken = true;
        } else {
            if (!isShiftPressed) {
                placingTower = null;
                placingFromCloud = null;
                actionTaken = true;
                uiElements.buyPinBtn.classList.remove('selected');
                uiElements.buyCastleBtn.classList.remove('selected');
                uiElements.buySupportBtn.classList.remove('selected');
            }
        }
    } else {
        const clickedTower = gameState.towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            // For Nine Pin, check the whole 3x3 area for a click
            if (t.type === 'NINE_PIN') {
                const startX = tGridX - 1;
                const startY = tGridY - 1;
                return gridX >= startX && gridX < startX + 3 && gridY >= startY && gridY < startY + 3;
            }
            return tGridX === gridX && tGridY === gridY;
        });

        if (clickedTower) {
            // If the clicked tower is already the only selected tower, deselect it.
            if (selectedTowers.length === 1 && selectedTowers[0].id === clickedTower.id) {
                selectedTowers = [];
            } else {
                selectedTowers = [clickedTower];
            }
            selectedEnemy = null;
        } else {
            selectedTowers = [];
            selectedEnemy = null;
        }
        actionTaken = true;
    }

    if (previouslySelectedTowers.length !== selectedTowers.length || !previouslySelectedTowers.every(t => selectedTowers.includes(t))) {
        isSellConfirmPending = false;
    }

    if (!isPlacingMode && !clickedOnEnemy) {
        uiElements.buyPinBtn.classList.remove('selected');
        uiElements.buyCastleBtn.classList.remove('selected');
        uiElements.buySupportBtn.classList.remove('selected');
    }

    if (actionTaken) {
        updateUI(gameState, gameSpeed);
        updateSellPanel(selectedTowers, gameState.isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower);
    }

    if (actionTaken) {
        persistGameState(0);
    }
}

canvas.addEventListener('mousedown', e => {
    if (placingTower) return;
    isSelecting = true;
    selectionStart = getMousePos(canvas, e);
    selectionEnd = selectionStart;
});

canvas.addEventListener('mousemove', e => {
    const mousePos = getMousePos(canvas, e);
    mouse.x = mousePos.x;
    mouse.y = mousePos.y;

    if (isSelecting) {
        selectionEnd = mousePos;
    }

    if (placingTower) {
        const gridX = Math.floor(mouse.x / TILE_SIZE);
        const gridY = Math.floor(mouse.y / TILE_SIZE);
        const hoveredTower = gameState.towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            return tGridX === gridX && tGridY === gridY;
        });
        if (hoveredTower) {
            const mergeInfo = mergeHandler.getMergeInfo(hoveredTower, placingTower, gameState);
            if (mergeInfo) {
                mergeTooltip.show = true;
                mergeTooltip.info = mergeInfo;
                mergeTooltip.x = mouse.x;
                mergeTooltip.y = mouse.y;
            } else {
                mergeTooltip.show = false;
                mergeTooltip.info = null;
            }
        } else {
            mergeTooltip.show = false;
            mergeTooltip.info = null;
        }
    } else {
        mergeTooltip.show = false;
        mergeTooltip.info = null;
    }
});

canvas.addEventListener('mouseup', e => {
    if (placingTower) {
        handleCanvasClick(e);
        return;
    }
    if (isSelecting) {
        isSelecting = false;
        const start = selectionStart;
        const end = selectionEnd;

        // If it was a click (not a drag), handle it as a single selection
        if (Math.hypot(end.x - start.x, end.y - start.y) < 10) {
            handleCanvasClick(e);
            return;
        }

        const rect = {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(start.x - end.x),
            height: Math.abs(start.y - end.y)
        };

        selectedTowers = gameState.towers.filter(tower =>
            tower.x >= rect.x &&
            tower.x <= rect.x + rect.width &&
            tower.y >= rect.y &&
            tower.y <= rect.y + rect.height
        );
        isSellConfirmPending = false;
        updateSellPanel(selectedTowers, gameState.isCloudUnlocked, isSellConfirmPending);
    }
});

canvas.addEventListener('dragover', e => {
    e.preventDefault();
    if (draggedCloudTower) {
        const mousePos = getMousePos(canvas, e);
        mouse.x = mousePos.x;
        mouse.y = mousePos.y;
        placingTower = draggedCloudTower.type;
    } else if (draggedCanvasTower) {
        const mousePos = getMousePos(canvas, e);
        mouse.x = mousePos.x;
        mouse.y = mousePos.y;
        placingTower = draggedCanvasTower.type;
    }
});
canvas.addEventListener('dragleave', () => {
    placingTower = null;
});
canvas.addEventListener('dragstart', (e) => {
    document.body.classList.add('is-dragging');
    const mousePos = getMousePos(canvas, e);
    const gridX = Math.floor(mousePos.x / TILE_SIZE);
    const gridY = Math.floor(mousePos.y / TILE_SIZE);
    if (!gameState.isCloudUnlocked) {
        e.preventDefault();
        return;
    }
    const towerToDrag = gameState.towers.find(t => {
        const tGridX = Math.floor(t.x / TILE_SIZE);
        const tGridY = Math.floor(t.y / TILE_SIZE);
        // Add check for Nine Pin tower's 3x3 collision area
        if (t.type === 'NINE_PIN') {
            const startX = tGridX - 1;
            const startY = tGridY - 1;
            return gridX >= startX && gridX < startX + 3 && gridY >= startY && gridY < startY + 3;
        }
        return tGridX === gridX && tGridY === gridY;
    });

    if (towerToDrag) {
        // If we start dragging a tower, we are not performing a selection.
        isSelecting = false;

        draggedCanvasTower = towerToDrag;
        draggedCanvasTowerOriginalGridPos = { x: Math.floor(draggedCanvasTower.x / TILE_SIZE), y: Math.floor(draggedCanvasTower.y / TILE_SIZE) };
        e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'canvas', towerId: towerToDrag.id }));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = TILE_SIZE;
        tempCanvas.height = TILE_SIZE;
        const tempCtx = tempCanvas.getContext('2d');
        const towerColor = (towerToDrag.type === 'MIND' && towerToDrag.mode === 'slow') ? '#0891b2' : ((towerToDrag.type === 'CAT' && towerToDrag.mode === 'slow') ? '#0891b2' : towerToDrag.color);
        const towerIconInfo = getTowerIconInfo(towerToDrag.type);
        const fontStyle = towerIconInfo.className === 'fa-solid' ? '900' : '400';
        tempCtx.font = `${fontStyle} 24px "${towerIconInfo.className.replace('fa-solid', 'Font Awesome 6 Free').replace('material-symbols-outlined', 'Material Symbols Outlined').replace('material-icons', 'Material Icons')}"`;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillStyle = towerColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        tempCtx.fillText(towerIconInfo.icon, TILE_SIZE / 2, TILE_SIZE / 2);
        e.dataTransfer.setDragImage(tempCanvas, TILE_SIZE / 2, TILE_SIZE / 2);
    } else {
        e.preventDefault();
        document.body.classList.remove('is-dragging');
    }
});
canvas.addEventListener('dragend', () => {
    document.body.classList.remove('is-dragging');
    draggedCanvasTower = null;
    placingTower = null;
});
uiElements.cloudInventoryPanel.addEventListener('dragover', e => {
    e.preventDefault();
});
uiElements.cloudInventoryPanel.addEventListener('drop', e => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    try {
        const transferData = JSON.parse(data);
        if (transferData.source === 'canvas') {
            const towerToMove = gameState.towers.find(t => t.id === transferData.towerId);
            if (towerToMove) {
                if (towerToMove.type === 'NINE_PIN') {
                    const centerX = Math.floor(towerToMove.x / TILE_SIZE);
                    const centerY = Math.floor(towerToMove.y / TILE_SIZE);
                    const startX = centerX - 1;
                    const startY = centerY - 1;
                    for (let j = 0; j < 3; j++) {
                        for (let i = 0; i < 3; i++) {
                            if (gameState.placementGrid[startY + j] && gameState.placementGrid[startY + j][startX + i] !== undefined) {
                                gameState.placementGrid[startY + j][startX + i] = GRID_EMPTY;
                            }
                        }
                    }
                } else if (!towerToMove.isMobile) {
                    const gridX = Math.floor(towerToMove.x / TILE_SIZE);
                    const gridY = Math.floor(towerToMove.y / TILE_SIZE);
                    gameState.placementGrid[gridY][gridX] = GRID_EMPTY;
                }
                gameState.towers = gameState.towers.filter(t => t.id !== towerToMove.id);
                gameState.cloudInventory.push(towerToMove);
                renderCloudInventory();
                selectedTowers = [];
                updateSellPanel([], gameState.isCloudUnlocked, isSellConfirmPending);
            }
        }
    } catch (e) {
        console.error("Failed to parse drop data:", e);
    }
});
canvas.addEventListener('drop', e => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    let transferData;
    try {
        transferData = JSON.parse(data);
    } catch (e) {
        console.error("Failed to parse drop data:", e);
        return;
    }
    const mousePos = getMousePos(canvas, e);
    const gridX = Math.floor(mousePos.x / TILE_SIZE);
    const gridY = Math.floor(mousePos.y / TILE_SIZE);
    const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;

    const sourceTower = draggedCanvasTower || gameState.cloudInventory.find(t => t.id === transferData.towerId);

    const targetTower = gameState.towers.find(t => {
        const tGridX = Math.floor(t.x / TILE_SIZE);
        const tGridY = Math.floor(t.y / TILE_SIZE);
        // Check for Nine Pin tower's 3x3 collision area
        if (t.type === 'NINE_PIN') {
            const startX = tGridX - 1;
            const startY = tGridY - 1;
            return gridX >= startX && gridX < startX + 3 && gridY >= startY && gridY < startY + 3;
        }
        return tGridX === gridX && tGridY === gridY;
    });

    const isNinePin = sourceTower?.type === 'NINE_PIN';
    let actionTaken = false;
    if (sourceTower) {
        if (targetTower && targetTower.id !== sourceTower.id) {
            pendingMergeState = {
                existingTower: targetTower,
                mergingTower: sourceTower,
                placingTowerType: sourceTower.type,
                mergeInfo: mergeHandler.getMergeInfo(targetTower, sourceTower.type, gameState),
                placingFromCloud: transferData.source === 'cloud',
                mergingFromCanvas: transferData.source === 'canvas',
                originalPosition: draggedCanvasTowerOriginalGridPos
            };
            if (isMergeConfirmationEnabled) {
                showMergeConfirmation(pendingMergeState);
            } else {
                performPendingMerge();
            }
            placingTower = null;
            placingFromCloud = null;
            draggedCloudTower = null;
            selectedTowers = []; // Deselect after a merge is initiated
            actionTaken = true;
        }
        else if (!targetTower && isValidPlacement(snappedX, snappedY, isNinePin)) {
            if (transferData.source === 'cloud') {
                sourceTower.x = snappedX;
                sourceTower.y = snappedY;
                addTower(sourceTower);
                gameState.cloudInventory = gameState.cloudInventory.filter(t => t.id !== sourceTower.id);
            } else if (transferData.source === 'canvas') {
                const originalGridX = draggedCanvasTowerOriginalGridPos.x;
                const originalGridY = draggedCanvasTowerOriginalGridPos.y;

                if (sourceTower.type === 'NINE_PIN') {
                    const startX = originalGridX - 1;
                    const startY = originalGridY - 1;
                    for (let j = 0; j < 3; j++) {
                        for (let i = 0; i < 3; i++) {
                            gameState.placementGrid[startY + j][startX + i] = GRID_EMPTY;
                        }
                    }
                } else {
                    gameState.placementGrid[originalGridY][originalGridX] = GRID_EMPTY;
                }
                sourceTower.x = snappedX;
                sourceTower.y = snappedY;
            }
            if (isNinePin) {
                const startX = gridX - 1;
                const startY = gridY - 1;
                for (let j = 0; j < 3; j++) {
                    for (let i = 0; i < 3; i++) {
                        gameState.placementGrid[startY + j][startX + i] = GRID_TOWER;
                    }
                }
            } else {
                gameState.placementGrid[gridY][gridX] = GRID_TOWER;
            }

            if (sourceTower.type === 'PIN') {
                checkForNinePinOnBoard();
            }
            actionTaken = true;
        }
    }
    if (actionTaken) {
        renderCloudInventory();
    }
    placingTower = null;
    draggedCloudTower = null;
    draggedCanvasTower = null;
});

canvas.addEventListener('dblclick', e => {
    resumeAudioContext();
    isDoubleClick = true;
    setTimeout(() => {
        isDoubleClick = false;
    }, 300); // Reset after 300ms, a common double-click interval

    const mousePos = getMousePos(canvas, e);
    const gridX = Math.floor(mousePos.x / TILE_SIZE);
    const gridY = Math.floor(mousePos.y / TILE_SIZE);

    const clickedTower = gameState.towers.find(t => {
        const tGridX = Math.floor(t.x / TILE_SIZE);
        const tGridY = Math.floor(t.y / TILE_SIZE);
        // For Nine Pin, check the whole 3x3 area for a click
        if (t.type === 'NINE_PIN') {
            const startX = tGridX - 1;
            const startY = tGridY - 1;
            return gridX >= startX && gridX < startX + 3 && gridY >= startY && gridY < startY + 3;
        }
        return tGridX === gridX && tGridY === gridY;
    });

    if (clickedTower) {
        selectedTowers = gameState.towers.filter(t => t.type === clickedTower.type);
        selectedEnemy = null;
        isSellConfirmPending = false;
        updateUI(gameState, gameSpeed);
        updateSellPanel(selectedTowers, gameState.isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower);
        persistGameState(0);
    }
});

// Touch event listeners for mobile drag selection
canvas.addEventListener('touchstart', e => {
    e.preventDefault(); // Prevent scrolling and zooming
    resumeAudioContext();
    if (placingTower) return;
    isSelecting = true;
    selectionStart = getMousePos(canvas, e.touches[0]);
    selectionEnd = selectionStart;
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault(); // Prevent scrolling and zooming
    const mousePos = getMousePos(canvas, e.touches[0]);
    mouse.x = mousePos.x;
    mouse.y = mousePos.y;

    if (isSelecting) {
        selectionEnd = mousePos;
    }

    if (placingTower) {
        const gridX = Math.floor(mouse.x / TILE_SIZE);
        const gridY = Math.floor(mouse.y / TILE_SIZE);
        const hoveredTower = gameState.towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            return tGridX === gridX && tGridY === gridY;
        });
        if (hoveredTower) {
            const mergeInfo = mergeHandler.getMergeInfo(hoveredTower, placingTower, gameState);
            if (mergeInfo) {
                mergeTooltip.show = true;
                mergeTooltip.info = mergeInfo;
                mergeTooltip.x = mouse.x;
                mergeTooltip.y = mouse.y;
            } else {
                mergeTooltip.show = false;
                mergeTooltip.info = null;
            }
        } else {
            mergeTooltip.show = false;
            mergeTooltip.info = null;
        }
    } else {
        mergeTooltip.show = false;
        mergeTooltip.info = null;
    }
});

canvas.addEventListener('touchend', e => {
    e.preventDefault(); // Prevent default touch behavior
    if (placingTower) {
        handleCanvasClick(e.changedTouches[0]);
        return;
    }
    if (isSelecting) {
        isSelecting = false;
        const start = selectionStart;
        const end = selectionEnd;

        // If it was a tap (not a drag), handle it as a single selection
        if (Math.hypot(end.x - start.x, end.y - start.y) < 10) {
            handleCanvasClick(e.changedTouches[0]);
            return;
        }

        const rect = {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(start.x - end.x),
            height: Math.abs(start.y - end.y)
        };

        selectedTowers = gameState.towers.filter(tower =>
            tower.x >= rect.x &&
            tower.x <= rect.x + rect.width &&
            tower.y >= rect.y &&
            tower.y <= rect.y + rect.height
        );
        isSellConfirmPending = false;
        updateSellPanel(selectedTowers, gameState.isCloudUnlocked, isSellConfirmPending);
    }
});

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.clientX || evt.touches[0].clientX;
    const clientY = evt.clientY || evt.touches[0].clientY;
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: mouseX * scaleX,
        y: mouseY * scaleY
    };
}

function reset(hardReset = false) {
    resetGameState(hardReset);

    placingTower = null;
    selectedTowers = [];
    selectedEnemy = null;
    gameSpeed = 1;
    placingFromCloud = null;
    draggedCloudTower = null;
    draggedCanvasTower = null;
    draggedCanvasTowerOriginalGridPos = { x: -1, y: -1 };
    mergeTooltip.show = false;
    mergeTooltip.info = null;
    pendingMergeState = null;
    isSellConfirmPending = false;

    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    init(true);
}

function init(fromReset = false) {
    loadGameStateFromStorage();

    if (!fromReset && gameState.gameOver) return reset();

    setMusicTrack(1, { bossMode: false });

    // Load saved settings
    const savedMergeConfirm = localStorage.getItem('mergeConfirmation');
    isMergeConfirmationEnabled = savedMergeConfirm === null ? true : JSON.parse(savedMergeConfirm);
    if (uiElements.toggleMergeConfirm) {
        uiElements.toggleMergeConfirm.checked = isMergeConfirmationEnabled;
    }

    gameState.isDetourOpen = false; // Explicitly reset detour state on init

    uiElements.speedToggleBtn.textContent = 'x1';
    uiElements.buyPinBtn.classList.remove('selected');
    uiElements.buyCastleBtn.classList.remove('selected');
    uiElements.buySupportBtn.classList.remove('selected');
    uiElements.startWaveBtn.disabled = false;
    uiElements.gameOverModal.classList.add('hidden');
    uiElements.cloudInventoryPanel.classList.add('hidden');
    renderCloudInventory();
    updateUI(gameState, gameSpeed);
    updateSellPanel([], gameState.isCloudUnlocked, isSellConfirmPending);
    canvas.width = GRID_COLS * TILE_SIZE;
    canvas.height = GRID_ROWS * TILE_SIZE;
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;

    resizeCanvas();
    lastTime = 0;
    requestAnimationFrame(gameLoop);
}

const consoleCommands = {};

consoleCommands.setTrack = setMusicTrack;
consoleCommands.setMusicOptions = setMusicOptions;
consoleCommands.nextTrack = nextMusicTrack;
consoleCommands.prevTrack = previousMusicTrack;

// Function to spawn Flutterdash from the console
consoleCommands.spawnFlutterdash = () => {
    if (gameState && gameState.path.length > 0) {
        const bossEnemy = new Enemy(ENEMY_TYPES.BOSS, gameState.path, 'BOSS');
        gameState.enemies.push(bossEnemy);
        console.log("Flutterdash spawned!");
    } else {
        console.error("Game not initialized or path is not available.");
    }
};

consoleCommands.spawnHelicopter = () => {
    if (gameState && gameState.path.length > 0) {
        const helicopter = new Enemy(ENEMY_TYPES.FLYING, gameState.path, 'FLYING');
        gameState.enemies.push(helicopter);
        console.log("Helicopter spawned!");
    } else {
        console.error("Game not initialized or path is not available.");
    }
};

// Function to add gold from the console
consoleCommands.addGold = (value) => {
    if (gameState) {
        gameState.gold += value;
        updateUI(gameState, gameSpeed);
        console.log(`Added ${value} gold. Current gold: ${gameState.gold}`);
    } else {
        console.error("Game not initialized.");
    }
};

// Function to set the wave number from the console
consoleCommands.setWave = (waveNumber) => {
    if (gameState) {
        gameState.wave = waveNumber - 1; // Subtract 1 to account for the next wave starting at `waveNumber`.
        gameState.enemies = [];
        gameState.projectiles = [];
        gameState.effects = [];
        gameState.spawningEnemies = false;
        gameState.waveInProgress = false;
        uiElements.startWaveBtn.disabled = false;
        console.log(`Wave set to ${waveNumber}. Press 'Start Wave' to begin.`);
        updateUI(gameState, gameSpeed);
    } else {
        console.error("Game not initialized.");
    }
};

// Function to start a specific wave from the console
consoleCommands.startWave = (waveNumber) => {
    if (gameState) {
        const num = parseInt(waveNumber, 10);
        if (isNaN(num) || num < 1) {
            console.error("Invalid wave number provided. Example: consoleCommands.startWave(16)");
            return;
        }

        // Clear out any active game elements from a previous wave
        gameState.enemies = [];
        gameState.projectiles = [];
        gameState.effects = [];
        gameState.announcements = [];
        gameState.spawningEnemies = false;
        gameState.waveInProgress = false;

        // Set the game to the desired wave
        gameState.wave = num;

        console.log(`Starting wave ${num}...`);

        // Update the UI to reflect the new wave number
        updateUI(gameState, gameSpeed);

        // Immediately start the spawning process for the new wave
        spawnWave();
    } else {
        console.error("Game not initialized.");
    }
};

consoleCommands.showEndless = () => {
    if (gameState) {
        showEndlessChoice();
        console.log("Showing endless choice window.");
    } else {
        console.error("Game not initialized.");
    }
};

consoleCommands.debug = () => {
    if (gameState) {
        isInfiniteGold = true;
        gameState.lives = Infinity;
        console.log("Debug mode enabled: Infinite gold and lives.");
    } else {
        console.error("Game not initialized.");
    }
};

/** @type {typeof window & { consoleCommands: typeof consoleCommands }} */(
    window
).consoleCommands = consoleCommands;

// Event Listeners
uiElements.startWaveBtn.addEventListener('click', () => {
    resumeAudioContext();
    spawnWave();
});
uiElements.buyPinBtn.addEventListener('click', () => selectTowerToPlace('PIN'));

uiElements.startEndlessBtn.addEventListener('click', () => {
    uiElements.endlessChoiceModal.classList.add('hidden');
    onEndWave(); // This will increment the wave to 26 and prepare for the next wave
});

uiElements.restartEndlessBtn.addEventListener('click', () => {
    uiElements.endlessChoiceModal.classList.add('hidden');
    reset(false);
});

uiElements.buyCastleBtn.addEventListener('click', () => selectTowerToPlace('CASTLE'));
uiElements.buySupportBtn.addEventListener('click', () => selectTowerToPlace('SUPPORT'));
uiElements.restartGameBtn.addEventListener('click', () => reset(false));

uiElements.onboardingDismissBtn.addEventListener('click', () => {
    gameState.onboardingTipDismissed = true;
    updateUI(gameState, gameSpeed);
    persistGameState(0); // Save immediately
});

uiElements.resetGameBtn.addEventListener('click', () => {
    reset(false);
    closeOptionsMenu();
});

uiElements.sellTowerBtn.addEventListener('click', () => {
    resumeAudioContext();
    if (selectedTowers.length > 0) {
        if (!isSellConfirmPending) {
            isSellConfirmPending = true;
            uiElements.sellTowerBtn.textContent = 'ARE YOU SURE?';
            uiElements.sellTowerBtn.classList.remove('bg-red-700', 'text-yellow-300', 'border-yellow-400', 'shadow-[0_4px_0_#9a3412]');
            uiElements.sellTowerBtn.classList.add('bg-yellow-500', 'text-black', 'border-yellow-600', 'shadow-[0_4px_0_#ca8a04]');
        } else {
            let totalSellValue = 0;
            selectedTowers.forEach(selectedTower => {
                totalSellValue += Math.floor(selectedTower.cost * 0.5);
                if (selectedTower.type === 'NINE_PIN') {
                    const centerX = Math.floor(selectedTower.x / TILE_SIZE);
                    const centerY = Math.floor(selectedTower.y / TILE_SIZE);
                    const startX = centerX - 1;
                    const startY = centerY - 1;
                    for (let j = 0; j < 3; j++) {
                        for (let i = 0; i < 3; i++) {
                            if (gameState.placementGrid[startY + j] && gameState.placementGrid[startY + j][startX + i] !== undefined) {
                                gameState.placementGrid[startY + j][startX + i] = GRID_EMPTY;
                            }
                        }
                    }
                } else if (!selectedTower.isMobile) {
                    const gridX = Math.floor(selectedTower.x / TILE_SIZE);
                    const gridY = Math.floor(selectedTower.y / TILE_SIZE);
                    gameState.placementGrid[gridY][gridX] = GRID_EMPTY;
                }
            });

            gameState.gold += totalSellValue;
            const selectedIds = new Set(selectedTowers.map(t => t.id));
            gameState.towers = gameState.towers.filter(t => !selectedIds.has(t.id));
            gameState.towersSoldThisGame += selectedTowers.length;

            selectedTowers = [];
            isSellConfirmPending = false;
            updateUI(gameState, gameSpeed);
            updateSellPanel([], gameState.isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower);
        }
    }
});


uiElements.moveToCloudBtn.addEventListener('click', () => {
    resumeAudioContext();
    if (selectedTowers.length === 1 && gameState.isCloudUnlocked) {
        const selectedTower = selectedTowers[0];
        gameState.cloudInventory.push(selectedTower);
        if (selectedTower.type === 'NINE_PIN') {
            const centerX = Math.floor(selectedTower.x / TILE_SIZE);
            const centerY = Math.floor(selectedTower.y / TILE_SIZE);
            const startX = centerX - 1;
            const startY = centerY - 1;
            for (let j = 0; j < 3; j++) {
                for (let i = 0; i < 3; i++) {
                    if (gameState.placementGrid[startY + j] && gameState.placementGrid[startY + j][startX + i] !== undefined) {
                        gameState.placementGrid[startY + j][startX + i] = GRID_EMPTY;
                    }
                }
            }
        } else if (!selectedTower.isMobile) {
            const gridX = Math.floor(selectedTower.x / TILE_SIZE);
            const gridY = Math.floor(selectedTower.y / TILE_SIZE);
            gameState.placementGrid[gridY][gridX] = GRID_EMPTY;
        }
        gameState.towers = gameState.towers.filter(t => t.id !== selectedTower.id);
        selectedTowers = [];
        isSellConfirmPending = false;
        renderCloudInventory();
        updateSellPanel([], gameState.isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower);
    }
});

uiElements.toggleModeBtn.addEventListener('click', () => {
    resumeAudioContext();
    if (selectedTowers.length > 0) {
        selectedTowers.forEach(selectedTower => {
            if (selectedTower.type === 'MIND' || selectedTower.type === 'CAT') {
                const modes = ['boost', 'slow', 'diversify'];
                const currentIndex = modes.indexOf(selectedTower.mode);
                selectedTower.mode = modes[(currentIndex + 1) % modes.length];
            } else if (selectedTower.type === 'ORBIT') {
                selectedTower.orbitMode = selectedTower.orbitMode === 'far' ? 'near' : 'far';
            }
        });
        updateSellPanel(selectedTowers, gameState.isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower);
    }
});

uiElements.toggleOrbitDirectionBtn.addEventListener('click', () => {
    resumeAudioContext();
    if (selectedTowers.length > 0) {
        selectedTowers.forEach(selectedTower => {
            if (selectedTower.type === 'ORBIT') {
                selectedTower.orbitDirection *= -1; // Flip direction
            }
        });
        updateSellPanel(selectedTowers, gameState.isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower);
    }
});

uiElements.toggleTargetingBtn.addEventListener('click', () => {
    resumeAudioContext();

    if (settingAttackGroundForTower) {
        return;
    }

    if (selectedTowers.length > 0) {
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
            // Determine the current common mode (if all towers share one)
            let currentCommonMode = null;
            const firstTowerMode = selectedTowers[0].targetingMode;
            if (commonModes.includes(firstTowerMode) && selectedTowers.every(t => t.targetingMode === firstTowerMode)) {
                currentCommonMode = firstTowerMode;
            }

            // Cycle to the next common mode
            let nextMode;
            if (currentCommonMode) {
                const currentIndex = commonModes.indexOf(currentCommonMode);
                nextMode = commonModes[(currentIndex + 1) % commonModes.length];
            } else {
                // If no common current mode, default to the first common mode
                nextMode = commonModes[0];
            }

            // Apply to all selected towers
            selectedTowers.forEach(tower => {
                // Check if the tower's available modes include the next common mode
                const towerAvailableModes = [];
                if (tower.type === 'FORT' || tower.type === 'NINE_PIN') {
                    towerAvailableModes.push('furthest', 'strongest', 'weakest');
                } else if (tower.type !== 'PIN_HEART') {
                    towerAvailableModes.push('strongest', 'weakest', 'furthest');
                }

                if (towerAvailableModes.includes(nextMode)) {
                    tower.targetingMode = nextMode;
                    tower.attackGroundTarget = null; // Clear ground target when changing mode
                }
            });
        }
        updateSellPanel(selectedTowers, gameState.isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower);
    }
});


if (uiElements.setGroundTargetBtn) {
    uiElements.setGroundTargetBtn.addEventListener('click', () => {
        resumeAudioContext();
        if (selectedTowers.length !== 1) return;
        const selectedTower = selectedTowers[0];
        if (selectedTower.type !== 'FORT' && selectedTower.type !== 'NINE_PIN') return;

        // Toggle setting mode
        if (settingAttackGroundForTower === selectedTower) {
            settingAttackGroundForTower = null; // Cancel
        } else {
            settingAttackGroundForTower = selectedTower; // Enter selection mode
        }
        // Update the UI to reflect the change (e.g., button icon)
        updateSellPanel(selectedTowers, gameState.isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower);
    });
}


uiElements.speedToggleBtn.addEventListener('click', () => {
    resumeAudioContext();
    if (gameSpeed === 1) {
        gameSpeed = 2;
        uiElements.speedToggleBtn.textContent = 'x2';
    } else {
        gameSpeed = 1;
        uiElements.speedToggleBtn.textContent = 'x1';
    }
    updateUI(gameState, gameSpeed);
});

uiElements.soundToggleBtn.addEventListener('click', () => {
    resumeAudioContext();
    const isSoundEnabled = toggleSoundEnabled();
    const soundIcon = document.getElementById('sound-icon');
    soundIcon.textContent = isSoundEnabled ? 'volume_up' : 'volume_off';
    uiElements.musicToggleBtn.disabled = !isSoundEnabled;
});

uiElements.musicToggleBtn.addEventListener('click', () => {
    const isMusicEnabled = toggleMusic();
    const musicIcon = document.getElementById('music-icon');
    musicIcon.textContent = isMusicEnabled ? 'music_note' : 'music_off';
});

uiElements.cloudButton.addEventListener('click', () => {
    resumeAudioContext();
    if (!gameState.isCloudUnlocked) {
        if (gameState.gold >= 100 || isInfiniteGold) {
            if (!isInfiniteGold) {
                gameState.gold -= 100;
            }
            gameState.isCloudUnlocked = true;
            uiElements.cloudInventoryPanel.classList.remove('hidden');
            updateUI(gameState, gameSpeed);
            gameState.announcements.push(new TextAnnouncement("Cloud Storage Unlocked!", canvasWidth / 2, 50, 3, undefined, canvasWidth));
        }
    } else {
        uiElements.cloudInventoryPanel.classList.toggle('hidden');
    }
});

function performPendingMerge() {
    let mergeState = pendingMergeState;
    if (!mergeState) return;
    const {
        existingTower,
        mergingTower,
        mergingFromCanvas,
        originalPosition
    } = mergeState;
    let cost = 0;
    if (mergeState.placingFromCloud || mergingFromCanvas) {
        cost = mergingTower.cost;
    } else {
        cost = TOWER_TYPES[mergingTower.type].cost;
    }
    if (!mergeState.placingFromCloud && !mergingFromCanvas && gameState.gold < cost && !isInfiniteGold) {
        uiElements.mergeConfirmModal.classList.add('hidden');
        return;
    }
    const merged = mergeHandler.executeMerge(existingTower, mergingTower.type, cost, gameState);
    if (merged) {
        if (existingTower.type === 'PIN_HEART' || mergeState.mergeInfo.resultType === 'PIN_HEART') {
            gameState.usedPinHeartTower = true;
        }

        if (mergeState.placingFromCloud) {
            gameState.cloudInventory = gameState.cloudInventory.filter(t => t.id !== mergingTower.id);
        } else if (mergingFromCanvas) {
            gameState.towers = gameState.towers.filter(t => t.id !== mergingTower.id);
            if (originalPosition.x !== -1) {
                gameState.placementGrid[originalPosition.y][originalPosition.x] = GRID_EMPTY;
            }
        } else {
            if (!isInfiniteGold) {
                gameState.gold -= cost;
            }
        }
        selectedTowers = [existingTower];
    }
    uiElements.mergeConfirmModal.classList.add('hidden');
    draggedCanvasTower = null;
    draggedCloudTower = null;
    placingTower = null;
    placingFromCloud = null;
    pendingMergeState = null;
    mergeTooltip.show = false; // FIX: Hide tooltip after merge action

    // FIX: Explicitly remove 'selected' class from tower buttons after merge.
    uiElements.buyPinBtn.classList.remove('selected');
    uiElements.buyCastleBtn.classList.remove('selected');
    uiElements.buySupportBtn.classList.remove('selected');

    updateUI(gameState, gameSpeed);
    updateSellPanel(selectedTowers, gameState.isCloudUnlocked, isSellConfirmPending, settingAttackGroundForTower);
    renderCloudInventory();
}

uiElements.cancelMergeBtn.addEventListener('click', () => {
    resumeAudioContext();
    draggedCanvasTower = null;
    draggedCloudTower = null;
    placingTower = null;
    placingFromCloud = null;
    pendingMergeState = null;
    mergeTooltip.show = false; // FIX: Hide tooltip on cancel
    uiElements.mergeConfirmModal.classList.add('hidden');
});

uiElements.confirmMergeBtn.addEventListener('click', () => {
    resumeAudioContext();
    performPendingMerge();
});

// Function to close the options menu
function closeOptionsMenu() {
    uiElements.optionsMenu.classList.add('hidden');
    // The overlay is no longer explicitly hidden here as it's not used for closing
}

// Options menu event listener
uiElements.optionsBtn.addEventListener('click', (event) => {
    resumeAudioContext();
    event.stopPropagation(); // Prevent this click from immediately closing the menu via the document listener
    uiElements.optionsMenu.classList.toggle('hidden'); // Toggle visibility
});

// Global click listener to close options menu if click is outside
window.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    // Check if the options menu is visible AND the click is outside the options menu and the options button
    if (!uiElements.optionsMenu.classList.contains('hidden') &&
        !uiElements.optionsMenu.contains(target) &&
        !uiElements.optionsBtn.contains(target)) {
        closeOptionsMenu();
    }
});

// Global touchend listener for mobile to close options menu if touch is outside
window.addEventListener('touchend', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    if (!uiElements.optionsMenu.classList.contains('hidden') &&
        !uiElements.optionsMenu.contains(target) &&
        !uiElements.optionsBtn.contains(target)) {
        closeOptionsMenu();
    }
});

uiElements.toggleMergeConfirm.addEventListener('change', () => {
    isMergeConfirmationEnabled = uiElements.toggleMergeConfirm.checked;
    localStorage.setItem('mergeConfirmation', JSON.stringify(isMergeConfirmationEnabled));
});

uiElements.libraryBtn.addEventListener('click', () => {
    populateLibraries(gameState);
    uiElements.libraryModal.classList.remove('hidden');
    closeOptionsMenu();
    updateLibraryView();
});

uiElements.libraryTowersTab.addEventListener('click', () => {
    libraryActiveTab = 'towers';
    uiElements.libraryTowersTab.classList.add('bg-gray-600');
    uiElements.libraryEnemiesTab.classList.remove('bg-gray-600');
    uiElements.towerLibraryRolodex.classList.remove('hidden');
    uiElements.enemyLibraryRolodex.classList.add('hidden');
    updateLibraryView();
});

uiElements.libraryEnemiesTab.addEventListener('click', () => {
    libraryActiveTab = 'enemies';
    uiElements.libraryEnemiesTab.classList.add('bg-gray-600');
    uiElements.libraryTowersTab.classList.remove('bg-gray-600');
    uiElements.enemyLibraryRolodex.classList.remove('hidden');
    uiElements.towerLibraryRolodex.classList.add('hidden');
    updateLibraryView();
});


function updateLibraryView() {
    if (libraryActiveTab === 'towers') {
        const towerTypes = Object.keys(TOWER_TYPES);
        const cards = uiElements.towerLibraryRolodex.querySelectorAll('.tower-card-container');
        cards.forEach((card, index) => {
            card.classList.toggle('hidden', index !== libraryCurrentIndex);
        });
        uiElements.libraryCounter.textContent = `${libraryCurrentIndex + 1} / ${towerTypes.length}`;
    } else {
        const enemyTypes = Object.keys(ENEMY_TYPES);
        const cards = uiElements.enemyLibraryRolodex.querySelectorAll('.enemy-card-container');
        cards.forEach((card, index) => {
            card.classList.toggle('hidden', index !== libraryEnemyCurrentIndex);
        });
        uiElements.libraryCounter.textContent = `${libraryEnemyCurrentIndex + 1} / ${enemyTypes.length}`;
    }
}

uiElements.libraryPrevBtn.addEventListener('click', () => {
    if (libraryActiveTab === 'towers') {
        const towerTypes = Object.keys(TOWER_TYPES);
        libraryCurrentIndex = (libraryCurrentIndex - 1 + towerTypes.length) % towerTypes.length;
    } else {
        const enemyTypes = Object.keys(ENEMY_TYPES);
        libraryEnemyCurrentIndex = (libraryEnemyCurrentIndex - 1 + enemyTypes.length) % enemyTypes.length;
    }
    updateLibraryView();
});

uiElements.libraryNextBtn.addEventListener('click', () => {
    if (libraryActiveTab === 'towers') {
        const towerTypes = Object.keys(TOWER_TYPES);
        libraryCurrentIndex = (libraryCurrentIndex + 1) % towerTypes.length;
    } else {
        const enemyTypes = Object.keys(ENEMY_TYPES);
        libraryEnemyCurrentIndex = (libraryEnemyCurrentIndex + 1) % enemyTypes.length;
    }
    updateLibraryView();
});

uiElements.libraryCloseBtn.addEventListener('click', () => {
    uiElements.libraryModal.classList.add('hidden');
});

uiElements.trophiesBtn.addEventListener('click', () => {
    populateTrophies(gameState, TROPHIES);
    uiElements.trophiesModal.classList.remove('hidden');
    closeOptionsMenu();
});

uiElements.trophiesCloseBtn.addEventListener('click', () => {
    uiElements.trophiesModal.classList.add('hidden');
});

uiElements.changelogBtn.addEventListener('click', () => {
    populateChangelog(changelog);
    uiElements.changelogModal.classList.remove('hidden');
    closeOptionsMenu();
    // Hide the indicator once the changelog is viewed
    localStorage.setItem('lastSeenVersion', CHANGELOG_VERSION);
    uiElements.changelogIndicator.classList.add('hidden');
});

uiElements.changelogCloseBtn.addEventListener('click', () => {
    uiElements.changelogModal.classList.add('hidden');
});


window.addEventListener('resize', resizeCanvas);

// Check if a new version has been released
const lastSeenVersion = localStorage.getItem('lastSeenVersion');
if (lastSeenVersion !== CHANGELOG_VERSION) {
    uiElements.changelogIndicator.classList.remove('hidden');
}

init();
