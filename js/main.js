import { TOWER_TYPES, ENEMY_TYPES, TILE_SIZE, GRID_EMPTY, GRID_TOWER, GRID_COLS, GRID_ROWS } from './constants.js';
import { generatePath } from './path-generator.js';
import { Enemy, Tower, Projectile, Effect, TextAnnouncement } from './game-entities.js';
import { uiElements, updateUI, updateSellPanel, triggerGameOver, showMergeConfirmation } from './ui-manager.js';
import { drawPlacementGrid, drawPath, drawMergeTooltip, getTowerIconInfo, drawEnemyInfoPanel } from './drawing-function.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let canvasWidth, canvasHeight;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let isSoundEnabled = true;
let isAudioResumed = false;

// This function will be called on the first user interaction to enable audio.
function resumeAudioContext() {
    if (!isAudioResumed && audioContext.state === 'suspended') {
        audioContext.resume();
        isAudioResumed = true;
    }
}

function playMoneySound() {
    if (!isSoundEnabled) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const volume = 0.05;
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

function playWiggleSound() {
    if (!isSoundEnabled) return;

    const now = audioContext.currentTime;
    const duration = 0.35;

    // Main sound source
    const osc = audioContext.createOscillator();
    osc.type = 'sine';

    // Pitch envelope - a strained, rising-then-falling groan
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.1);


    // LFO for vibrato (makes it shaky and "organic")
    const lfo = audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(6, now); // Uncomfortably fast vibrato

    // Gain node to control the depth of the vibrato
    const lfoGain = audioContext.createGain();
    lfoGain.gain.setValueAtTime(10, now); // How much the pitch wavers

    // Distortion for a strained, gritty quality
    const distortion = audioContext.createWaveShaper();
    const k = 10; // More aggressive distortion
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
        const x = i * 2 / n_samples - 1;
        curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
    }
    distortion.curve = curve;
    distortion.oversample = '4x';

    // Master volume envelope for the sound
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.03, now + 0.05); // Fade in
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Fade out

    // Connect the nodes together
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency); // LFO modulates the oscillator's frequency
    osc.connect(distortion);
    distortion.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start and stop the sound
    lfo.start(now);
    lfo.stop(now + duration);
    osc.start(now);
    osc.stop(now + duration);
}

function playCrackSound() {
    if (!isSoundEnabled) return;
    const now = audioContext.currentTime;
    const duration = 0.15;

    // White noise source for the "crack"
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    // A bandpass filter to shape the noise into a "crack"
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, now);
    filter.Q.setValueAtTime(10, now);

    // A fast volume envelope to make it sharp
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Fast decay

    // Connect nodes and play
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    noise.start(now);
    noise.stop(now + duration);
}

// Game State
let lives, gold, wave;
let enemies = [];
let towers = [];
let projectiles = [];
let effects = [];
let announcements = [];
let introducedEnemies = new Set();
let hasPlacedFirstSupport = false;
let path = [];
let placementGrid = [];
let waveInProgress = false;
let spawningEnemies = false;
let placingTower = null;
let gameOver = false;
let animationFrameId;
let mouse = { x: 0, y: 0 };
let selectedTower = null;
let selectedEnemy = null;
let gameSpeed = 1;
let isCloudUnlocked = false;
let cloudInventory = [];
let placingFromCloud = null;
let draggedCloudTower = null;
let draggedCanvasTower = null;
let draggedCanvasTowerOriginalGridPos = { x: -1, y: -1 };
let mergeTooltip = { show: false, x: 0, y: 0, info: null };

// Debug Functions
window.addGold = (amount) => {
    const parsedAmount = parseInt(amount, 10);
    if (!isNaN(parsedAmount) && parsedAmount > 0) {
        gold += parsedAmount;
        updateUI({ lives, gold, wave, isCloudUnlocked });
        announcements.push(new TextAnnouncement(`+${parsedAmount}G`, canvasWidth / 2, 80, 180, undefined, canvasWidth));
    }
};
window.spawn = (enemyType) => {
    const upperEnemyType = enemyType.toUpperCase();
    const type = ENEMY_TYPES[upperEnemyType];
    if (type) {
        enemies.push(new Enemy(type, path, upperEnemyType));
    }
};

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
    cloudInventory.forEach(tower => {
        const towerIconInfo = getTowerIconInfo(tower.type);
        const isSelected = placingFromCloud === tower;
        const towerRep = document.createElement('button');
        towerRep.className = `pixel-button p-1 w-full h-14 flex flex-col items-center justify-center relative ${isSelected ? 'selected' : ''}`;
        const towerColor = (tower.type === 'ENT' && tower.mode === 'slow') ? '#0891b2' : ((tower.type === 'CAT' && tower.mode === 'slow') ? '#0891b2' : tower.color);
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

function spawnWave() {
    waveInProgress = true;
    spawningEnemies = true;
    updateUI({ lives, gold, wave: wave + 1, isCloudUnlocked });
    uiElements.startWaveBtn.disabled = true;
    const nextWave = wave + 1;

    if (nextWave === 15) {
        enemies.push(new Enemy(ENEMY_TYPES.BOSS, path, 'BOSS'));
        spawningEnemies = false;
        return;
    }

    const isSwarmWave = nextWave > 0 && nextWave % 4 === 0;
    const enemyCount = isSwarmWave ? 15 + nextWave * 5 : 5 + nextWave * 3;
    const spawnRate = isSwarmWave ? 150 : 500;
    const goldMultiplier = 1 + 0.1 * (nextWave - 1);
    let spawned = 0;
    const spawnInterval = setInterval(() => {
        if (spawned >= enemyCount) {
            clearInterval(spawnInterval);
            spawningEnemies = false;
            return;
        }
        let enemyType;
        if (isSwarmWave) {
            enemyType = ENEMY_TYPES.SWARM;
        } else if (nextWave === 10) {
            enemyType = ENEMY_TYPES.BITCOIN;
        } else {
            const rand = Math.random();
            if (nextWave >= 4 && rand < 0.2) {
                enemyType = ENEMY_TYPES.FLYING;
            } else if (nextWave >= 6 && rand < 0.4) {
                enemyType = ENEMY_TYPES.HEAVY;
            } else if (nextWave >= 3 && rand < 0.7) {
                enemyType = ENEMY_TYPES.FAST;
            } else {
                enemyType = ENEMY_TYPES.NORMAL;
            }
        }
        const enemyTypeName = Object.keys(ENEMY_TYPES).find(key => ENEMY_TYPES[key] === enemyType);
        if (enemyTypeName && !introducedEnemies.has(enemyTypeName)) {
            introducedEnemies.add(enemyTypeName);
            const displayName = enemyType.icon.replace(/_/g, ' ');
            announcements.push(new TextAnnouncement(`New Enemy:\n${displayName}`, canvasWidth / 2, 50, 180, undefined, canvasWidth));
        }

        let healthMultiplier;
        if (nextWave <= 10) {
            // Standard health scaling for the first 10 waves
            healthMultiplier = 1 + (nextWave - 1) * 0.15;
        } else {
            // More aggressive health scaling after wave 10
            const baseHealthAtWave10 = 1 + (10 - 1) * 0.15;
            const wavesAfter10 = nextWave - 10;
            healthMultiplier = baseHealthAtWave10 + (wavesAfter10 * 0.30);
        }

        const finalHealth = isSwarmWave ? enemyType.health * (1 + (nextWave - 1) * 0.05) : enemyType.health * healthMultiplier;
        const finalGold = Math.ceil(enemyType.gold * goldMultiplier);
        const finalEnemyType = { ...enemyType, health: Math.ceil(finalHealth), gold: finalGold };
        enemies.push(new Enemy(finalEnemyType, path, enemyTypeName));
        spawned++;
    }, spawnRate);
}

function applyAuraEffects() {
    towers.forEach(tower => {
        if (!['SUPPORT', 'ENT', 'CAT'].includes(tower.type)) {
            tower.fireRate = tower.permFireRate;
            tower.damageMultiplier = 1;
            tower.goldBonusMultiplier = 1;
        }
    });
    enemies.forEach(enemy => {
        enemy.slowMultiplier = 1;
    });
    towers.forEach(auraTower => {
        if (['SUPPORT', 'ENT', 'CAT'].includes(auraTower.type)) {
            const auraGridX = Math.floor(auraTower.x / TILE_SIZE);
            const auraGridY = Math.floor(auraTower.y / TILE_SIZE);
            towers.forEach(targetTower => {
                if (!['SUPPORT', 'ENT', 'CAT'].includes(targetTower.type)) {
                    const targetGridX = Math.floor(targetTower.x / TILE_SIZE);
                    const targetGridY = Math.floor(targetTower.y / TILE_SIZE);
                    if (Math.abs(auraGridX - targetGridX) <= 1 && Math.abs(auraGridY - targetGridY) <= 1) {
                        if (auraTower.type === 'SUPPORT') {
                            targetTower.fireRate *= auraTower.attackSpeedBoost;
                        } else if (['ENT', 'CAT'].includes(auraTower.type) && auraTower.mode === 'boost') {
                            targetTower.fireRate *= auraTower.attackSpeedBoost;
                            targetTower.damageMultiplier = Math.max(targetTower.damageMultiplier, auraTower.damageBoost);
                        }
                        if (auraTower.type === 'CAT') {
                            targetTower.goldBonusMultiplier = Math.max(targetTower.goldBonusMultiplier, auraTower.goldBonus);
                        }
                    }
                }
            });
            if (['ENT', 'CAT'].includes(auraTower.type) && auraTower.mode === 'slow') {
                enemies.forEach(enemy => {
                    const enemyGridX = Math.floor(enemy.x / TILE_SIZE);
                    const enemyGridY = Math.floor(enemy.y / TILE_SIZE);
                    if (Math.abs(auraGridX - enemyGridX) <= 1 && Math.abs(auraGridY - enemyGridY) <= 1) {
                        enemy.slowMultiplier = Math.min(enemy.slowMultiplier, auraTower.enemySlow);
                    }
                });
            }
        }
    });
}

function handleProjectileHit(projectile, hitEnemy) {
    const targetEnemy = hitEnemy || projectile.target;
    if (!targetEnemy || typeof targetEnemy.takeDamage !== 'function') {
        return;
    }
    const finalDamage = projectile.owner.damage * projectile.owner.damageMultiplier;
    const goldMultiplier = projectile.owner.goldBonusMultiplier || 1;
    const awardGold = (enemy) => {
        if (enemy.type.icon === ENEMY_TYPES.BITCOIN.icon) return;
        const goldToGive = Math.ceil(enemy.gold * goldMultiplier);
        gold += goldToGive;
        effects.push(new Effect(enemy.x, enemy.y, 'attach_money', enemy.gold * 5 + 10, '#FFD700', 30));
    };
    if (projectile.owner.type === 'FIREPLACE') {
        effects.push(new Effect(targetEnemy.x, targetEnemy.y, 'local_fire_department', projectile.owner.splashRadius * 2, projectile.owner.projectileColor, 20));
        enemies.forEach(enemy => {
            if (Math.hypot(targetEnemy.x - enemy.x, targetEnemy.y - enemy.y) <= projectile.owner.splashRadius) {
                if (enemy === targetEnemy || !enemy.type.splashImmune) {
                    if (enemy.takeDamage(finalDamage)) {
                        awardGold(enemy);
                    }
                    enemy.applyBurn(projectile.owner.burnDps, projectile.owner.burnDuration);
                }
            }
        });
    } else if (projectile.owner.splashRadius > 0) {
        effects.push(new Effect(targetEnemy.x, targetEnemy.y, 'explosion', projectile.owner.splashRadius * 2, projectile.owner.projectileColor, 20));
        enemies.forEach(enemy => {
            if (Math.hypot(targetEnemy.x - enemy.x, targetEnemy.y - enemy.y) <= projectile.owner.splashRadius) {
                if (enemy === targetEnemy || !enemy.type.splashImmune) {
                    if (enemy.takeDamage(finalDamage)) {
                        awardGold(enemy);
                    }
                }
            }
        });
    } else {
        if (targetEnemy.takeDamage(finalDamage)) {
            awardGold(targetEnemy);
        }
    }
    updateUI({ lives, gold, wave, isCloudUnlocked });
}

function gameLoop() {
    if (gameOver) return;
    for (let i = 0; i < gameSpeed; i++) {
        applyAuraEffects();
        const onEnemyDeath = (enemy) => {
            if (selectedEnemy === enemy) {
                selectedEnemy = null;
            }
            playMoneySound();
        };

        const newlySpawnedEnemies = []; // Create a temporary array for new enemies

        towers.forEach(tower => tower.update(enemies, projectiles, onEnemyDeath));
        projectiles = projectiles.filter(p => p.update(handleProjectileHit, enemies));
        enemies = enemies.filter(enemy => enemy.update(
            (e) => { // onFinish
                // Handle Bitcoin gold stealing separately
                if (e.type.icon === ENEMY_TYPES.BITCOIN.icon) {
                    gold = Math.max(0, gold - 1);
                    updateUI({ lives, gold, wave, isCloudUnlocked });
                    const goldCounterRect = uiElements.goldEl.getBoundingClientRect();
                    const goldX = goldCounterRect.left + (goldCounterRect.width / 3);
                    const goldY = goldCounterRect.top + (goldCounterRect.height / 3);
                    const canvasGoldX = (goldX / window.innerWidth) * canvasWidth;
                    const canvasGoldY = (goldY / window.innerHeight) * canvasHeight;
                    announcements.push(new TextAnnouncement("-$", canvasGoldX, canvasGoldY, 60, '#ff4d4d', canvasWidth));
                }

                // Handle life damage for other enemies
                if (e.type.damagesLives) {
                    lives--;
                    updateUI({ lives, gold, wave, isCloudUnlocked });
                    if (lives <= 0) {
                        gameOver = true;
                        triggerGameOver(false, wave);
                    }
                }
            },
            () => { // onDeath
                playMoneySound();
            },
            newlySpawnedEnemies, // Pass the temporary array for spawning
            playWiggleSound, // Pass the wiggle sound function
            playCrackSound // Pass the crack sound function
        ));

        enemies.push(...newlySpawnedEnemies); // Add the newly spawned enemies to the main list
    }
    effects = effects.filter(effect => effect.update());
    announcements = announcements.filter(announcement => announcement.update());
    if (waveInProgress && enemies.length === 0 && !spawningEnemies) {
        waveInProgress = false;
        wave++;
        uiElements.startWaveBtn.disabled = false;
        if (wave > 1) {
            const interestEarned = Math.floor(gold * 0.05);
            if (interestEarned > 0) {
                gold += interestEarned;
                announcements.push(new TextAnnouncement(`+${interestEarned}G Interest!`, canvasWidth / 2, 80, 180, undefined, canvasWidth));
            }
        }
        const waveBonus = 20 + wave;
        gold += waveBonus;
        if (wave === 3) {
            setTimeout(() => {
                announcements.push(new TextAnnouncement("Warning:\nFlying enemies incoming!", canvasWidth / 2, canvasHeight / 2, 300, '#ff4d4d', canvasWidth));
            }, 1500);
        }
        if (wave === 9) { // Wave before Bitcoin
            setTimeout(() => {
                announcements.push(new TextAnnouncement("Warning:\nBitcoin enemies steal gold!", canvasWidth / 2, canvasHeight / 2, 300, '#F7931A', canvasWidth));
            }, 1500);
        }
        if (wave === 14) { // Wave before Boss
            setTimeout(() => {
                announcements.push(new TextAnnouncement("Warning:\nBOSS INCOMING!", canvasWidth / 2, canvasHeight / 2, 300, '#42A5F5', canvasWidth));
            }, 1500);
        }
        updateUI({ lives, gold, wave, isCloudUnlocked });
    }
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawPath(ctx, canvasWidth, path);
    if (placingTower) {
        drawPlacementGrid(ctx, canvasWidth, canvasHeight, placementGrid, mouse);
    }
    towers.forEach(tower => tower.draw(ctx));
    if (selectedTower) {
        selectedTower.drawRange(ctx);
        if (['SUPPORT', 'ENT', 'CAT'].includes(selectedTower.type)) selectedTower.drawBuffEffect(ctx);
    }
    projectiles.forEach(p => p.draw(ctx));
    effects.forEach(effect => effect.draw(ctx));
    enemies.forEach(enemy => enemy.draw(ctx));
    announcements.forEach(announcement => announcement.draw(ctx));
    if (selectedEnemy) {
        selectedEnemy.drawSelection(ctx);
        drawEnemyInfoPanel(ctx, selectedEnemy, canvasWidth);
    }
    if (placingTower) {
        const gridX = Math.floor(mouse.x / TILE_SIZE);
        const gridY = Math.floor(mouse.y / TILE_SIZE);
        const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
        const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;
        const tempTower = new Tower(snappedX, snappedY, placingTower);
        if (placingFromCloud || draggedCloudTower || draggedCanvasTower) {
            Object.assign(tempTower, placingFromCloud || draggedCloudTower || draggedCanvasTower);
            tempTower.x = snappedX;
            tempTower.y = snappedY;
        }
        tempTower.draw(ctx);
        tempTower.drawRange(ctx);
        if (!isValidPlacement(snappedX, snappedY)) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(snappedX, snappedY, TILE_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    drawMergeTooltip(ctx, mergeTooltip, canvasWidth);
    animationFrameId = requestAnimationFrame(gameLoop);
}

function isValidPlacement(x, y) {
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
    const cols = Math.floor(canvasWidth / TILE_SIZE);
    const rows = Math.floor(canvasHeight / TILE_SIZE);
    if (gridX < 0 || gridX >= cols || gridY < 0 || gridY >= rows) {
        return false;
    }
    return placementGrid[gridY] && placementGrid[gridY][gridX] === GRID_EMPTY;
}

function selectTowerToPlace(towerType) {
    resumeAudioContext();
    const cost = TOWER_TYPES[towerType].cost;
    if (gold >= cost) {
        if (placingFromCloud) {
            placingFromCloud = null;
            renderCloudInventory();
        }
        placingTower = (placingTower === towerType) ? null : towerType;
        selectedTower = null;
        selectedEnemy = null;
        updateSellPanel(null, isCloudUnlocked);
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
    selectedTower = null;
    selectedEnemy = null;
    updateSellPanel(null, isCloudUnlocked);
    renderCloudInventory();
}

function blendColors(colorA, colorB) {
    const [rA, gA, bA] = colorA.match(/\w\w/g).map((c) => parseInt(c, 16));
    const [rB, gB, bB] = colorB.match(/\w\w/g).map((c) => parseInt(c, 16));
    const r = Math.round(rA * 0.5 + rB * 0.5).toString(16).padStart(2, '0');
    const g = Math.round(gA * 0.5 + gB * 0.5).toString(16).padStart(2, '0');
    const b = Math.round(bA * 0.5 + bB * 0.5).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

function performMerge(clickedOnTower, mergingTowerType, costToAdd) {
    let merged = false;
    const originalTowerColor = clickedOnTower.color;
    const existingTowerLevel = clickedOnTower.level === 'MAX LEVEL' ? 5 : clickedOnTower.level;
    if (clickedOnTower.type === 'SUPPORT' && mergingTowerType === 'SUPPORT') {
        clickedOnTower.type = 'ENT';
        clickedOnTower.level = 'MAX LEVEL';
        clickedOnTower.damageLevel = 'MAX LEVEL';
        clickedOnTower.cost += costToAdd;
        clickedOnTower.updateStats();
        clickedOnTower.color = TOWER_TYPES.ENT.color;
        merged = true;
    } else if ((clickedOnTower.type === 'ENT' && mergingTowerType === 'SUPPORT') || (clickedOnTower.type === 'SUPPORT' && mergingTowerType === 'ENT')) {
        clickedOnTower.type = 'CAT';
        clickedOnTower.level = 'MAX LEVEL';
        clickedOnTower.damageLevel = 'MAX LEVEL';
        clickedOnTower.cost += costToAdd;
        clickedOnTower.updateStats();
        clickedOnTower.color = TOWER_TYPES.CAT.color;
        merged = true;
    } else if (clickedOnTower.type === 'PIN' && mergingTowerType === 'PIN') {
        const oldCost = clickedOnTower.cost;
        clickedOnTower.type = 'NAT';
        clickedOnTower.level = existingTowerLevel;
        clickedOnTower.damageLevel = existingTowerLevel;
        clickedOnTower.projectileCount = 1;
        clickedOnTower.damageMultiplierFromMerge = 1;
        clickedOnTower.updateStats();
        clickedOnTower.splashRadius = TOWER_TYPES.NAT.splashRadius;
        clickedOnTower.color = TOWER_TYPES.NAT.color;
        clickedOnTower.cost = oldCost + costToAdd;
        merged = true;
    } else if (clickedOnTower.type === 'CASTLE' && mergingTowerType === 'CASTLE') {
        const oldCost = clickedOnTower.cost;
        clickedOnTower.type = 'ORBIT';
        clickedOnTower.orbitMode = 'far';
        clickedOnTower.orbiters = [new Projectile(clickedOnTower, null, 0), new Projectile(clickedOnTower, null, Math.PI)];
        clickedOnTower.level = existingTowerLevel;
        clickedOnTower.damageLevel = existingTowerLevel;
        clickedOnTower.updateStats();
        clickedOnTower.splashRadius = TOWER_TYPES.ORBIT.splashRadius;
        clickedOnTower.color = TOWER_TYPES.ORBIT.color;
        clickedOnTower.cost = oldCost + costToAdd;
        merged = true;
    } else if (clickedOnTower.type === mergingTowerType && clickedOnTower.level !== 'MAX LEVEL') {
        if (clickedOnTower.level < 5) {
            clickedOnTower.level++;
            if (clickedOnTower.damageLevel) clickedOnTower.damageLevel++;
            clickedOnTower.updateStats();
            clickedOnTower.cost += costToAdd;
            merged = true;
        }
    } else if ((clickedOnTower.type === 'SUPPORT' && mergingTowerType === 'PIN') || (clickedOnTower.type === 'PIN' && mergingTowerType === 'SUPPORT')) {
        const oldCost = clickedOnTower.cost;
        clickedOnTower.type = 'PIN_HEART';
        clickedOnTower.level = existingTowerLevel;
        clickedOnTower.damageLevel = existingTowerLevel;
        clickedOnTower.updateStats();
        clickedOnTower.splashRadius = TOWER_TYPES.PIN_HEART.splashRadius;
        clickedOnTower.color = TOWER_TYPES.PIN_HEART.color;
        clickedOnTower.cost = oldCost + costToAdd;
        merged = true;
    } else if ((clickedOnTower.type === 'SUPPORT' && mergingTowerType === 'CASTLE') || (clickedOnTower.type === 'CASTLE' && mergingTowerType === 'SUPPORT')) {
        const oldCost = clickedOnTower.cost;
        clickedOnTower.type = 'FIREPLACE';
        clickedOnTower.level = existingTowerLevel;
        clickedOnTower.damageLevel = existingTowerLevel;
        clickedOnTower.updateStats();
        clickedOnTower.damage = TOWER_TYPES.FIREPLACE.damage;
        clickedOnTower.splashRadius = TOWER_TYPES.FIREPLACE.splashRadius;
        clickedOnTower.burnDps = TOWER_TYPES.FIREPLACE.burnDps;
        clickedOnTower.burnDuration = TOWER_TYPES.FIREPLACE.burnDuration;
        clickedOnTower.color = TOWER_TYPES.FIREPLACE.color;
        clickedOnTower.cost = oldCost + costToAdd;
        merged = true;
    } else if ((clickedOnTower.type === 'PIN' && mergingTowerType === 'CASTLE') || (clickedOnTower.type === 'CASTLE' && mergingTowerType === 'PIN')) {
        const oldCost = clickedOnTower.cost;
        clickedOnTower.type = 'FORT';
        clickedOnTower.level = existingTowerLevel;
        clickedOnTower.damageLevel = existingTowerLevel;
        clickedOnTower.updateStats();
        clickedOnTower.splashRadius = TOWER_TYPES.FORT.splashRadius;
        clickedOnTower.color = TOWER_TYPES.FORT.color;
        clickedOnTower.cost = oldCost + costToAdd;
        merged = true;
    } else if (clickedOnTower.type === 'NAT' && mergingTowerType === 'CASTLE') {
        if (clickedOnTower.level !== 'MAX LEVEL' && clickedOnTower.level < 5) {
            if (!clickedOnTower.projectileCount) clickedOnTower.projectileCount = 1;
            clickedOnTower.level++;
            clickedOnTower.projectileCount++;
            clickedOnTower.updateStats();
            clickedOnTower.cost += costToAdd;
            clickedOnTower.color = blendColors(clickedOnTower.color, TOWER_TYPES.CASTLE.color);
            merged = true;
        }
    } else if (clickedOnTower.type === 'NAT' && mergingTowerType === 'PIN') {
        if (clickedOnTower.level !== 'MAX LEVEL' && clickedOnTower.level < 5) {
            if (clickedOnTower.damageMultiplierFromMerge === undefined) clickedOnTower.damageMultiplierFromMerge = 1;
            clickedOnTower.level++;
            clickedOnTower.damageLevel++;
            clickedOnTower.damageMultiplierFromMerge *= 1.25;
            clickedOnTower.updateStats();
            clickedOnTower.cost += costToAdd;
            clickedOnTower.color = blendColors(clickedOnTower.color, TOWER_TYPES.PIN.color);
            merged = true;
        }
    } else if ((['FORT', 'PIN_HEART', 'ORBIT'].includes(clickedOnTower.type)) && (['PIN', 'CASTLE'].includes(mergingTowerType))) {
        if (clickedOnTower.level !== 'MAX LEVEL' && clickedOnTower.level < 5) {
            const diminishingFactor = 0.15;
            const levelModifier = typeof clickedOnTower.level === 'number' ? Math.pow(1 - diminishingFactor, clickedOnTower.level - 1) : 1;
            if (clickedOnTower.type === 'ORBIT') {
                if (mergingTowerType === 'PIN') clickedOnTower.damage += 2 * levelModifier;
                else if (mergingTowerType === 'CASTLE') {
                    clickedOnTower.damage += 1 * levelModifier;
                    clickedOnTower.projectileSize += 1;
                }
            } else {
                if (mergingTowerType === 'PIN') {
                    clickedOnTower.damage += 0.5 * levelModifier;
                    clickedOnTower.permFireRate *= (1 - (0.05 * levelModifier));
                } else if (mergingTowerType === 'CASTLE') {
                    clickedOnTower.damage += 2 * levelModifier;
                    if (clickedOnTower.splashRadius) clickedOnTower.splashRadius += 5 * levelModifier;
                }
            }
            clickedOnTower.level++;
            if (clickedOnTower.damageLevel) clickedOnTower.damageLevel++;
            clickedOnTower.cost += costToAdd;
            clickedOnTower.color = blendColors(originalTowerColor, TOWER_TYPES[mergingTowerType].color);
            merged = true;
        }
    } else if (clickedOnTower.type === 'FIREPLACE' && (['PIN', 'CASTLE'].includes(mergingTowerType))) {
        if (clickedOnTower.level !== 'MAX LEVEL' && clickedOnTower.level < 3) {
            if (mergingTowerType === 'CASTLE') clickedOnTower.splashRadius += 10;
            else if (mergingTowerType === 'PIN') clickedOnTower.burnDps += 1;
            clickedOnTower.level++;
            clickedOnTower.cost += costToAdd;
            clickedOnTower.color = blendColors(originalTowerColor, TOWER_TYPES[mergingTowerType].color);
            clickedOnTower.updateStats();
            clickedOnTower.damage = TOWER_TYPES.FIREPLACE.damage;
            merged = true;
        }
    }
    if (merged) {
        if (clickedOnTower.type === 'FIREPLACE' && clickedOnTower.level === 3) {
            clickedOnTower.level = 'MAX LEVEL';
        } else if (clickedOnTower.type !== 'FIREPLACE' && clickedOnTower.level === 5) {
            clickedOnTower.level = 'MAX LEVEL';
            if (clickedOnTower.damageLevel) clickedOnTower.damageLevel = 'MAX LEVEL';
        }
    }
    return merged;
}

function getMergeResultInfo(existingTower, placingType) {
    if (existingTower.type === 'NINE_PIN' || placingType === 'NINE_PIN' || TOWER_TYPES[existingTower.type].unmergeable) {
        return null;
    }
    const existingType = existingTower.type;
    let result = { text: null, resultType: null, upgrade: null };
    if ((existingType === 'SUPPORT' && placingType === 'SUPPORT')) { result.resultType = 'ENT'; }
    else if ((existingType === 'ENT' && placingType === 'SUPPORT') || (existingType === 'SUPPORT' && placingType === 'ENT')) { result.resultType = 'CAT'; }
    else if ((existingType === 'PIN' && placingType === 'PIN')) { result.resultType = 'NAT'; }
    else if ((existingType === 'CASTLE' && placingType === 'CASTLE')) { result.resultType = 'ORBIT'; }
    else if ((existingType === 'SUPPORT' && placingType === 'PIN') || (existingType === 'PIN' && placingType === 'SUPPORT')) { result.resultType = 'PIN_HEART'; }
    else if ((existingType === 'SUPPORT' && placingType === 'CASTLE') || (existingType === 'CASTLE' && placingType === 'SUPPORT')) { result.resultType = 'FIREPLACE'; }
    else if ((existingType === 'PIN' && placingType === 'CASTLE') || (existingType === 'CASTLE' && placingType === 'PIN')) { result.resultType = 'FORT'; }
    else if (existingType === placingType && existingTower.level !== 'MAX LEVEL' && existingTower.level < 5) {
        result.resultType = existingType;
        result.text = `${existingType} LVL ${existingTower.level + 1}`;
    }
    else if (existingTower.level !== 'MAX LEVEL') {
        if (existingType === 'NAT' && existingTower.level < 5) {
            if (placingType === 'CASTLE') result.upgrade = { text: '+ Proj', icon: 'multiple_stop', family: 'material-symbols-outlined' };
            else if (placingType === 'PIN') result.upgrade = { text: '+ Dmg', icon: 'bolt', family: 'material-icons' };
        } else if (['FORT', 'PIN_HEART'].includes(existingType) && existingTower.level < 5) {
            if (placingType === 'PIN') result.upgrade = { text: '+ Dmg/Spd', icon: 'bolt', family: 'material-icons' };
            else if (placingType === 'CASTLE') result.upgrade = { text: '+ Dmg/Spl', icon: 'bolt', family: 'material-icons' };
        } else if (existingType === 'ORBIT' && existingTower.level < 5) {
            if (placingType === 'PIN') result.upgrade = { text: '+ Dmg', icon: 'bolt', family: 'material-icons' };
            else if (placingType === 'CASTLE') result.upgrade = { text: '+ Dmg/Size', icon: 'bolt', family: 'material-icons' };
        } else if (existingType === 'FIREPLACE' && existingTower.level < 3) {
            if (placingType === 'CASTLE') result.upgrade = { text: '+ Splash', icon: 'bubble_chart', family: 'material-icons' };
            else if (placingType === 'PIN') result.upgrade = { text: '+ Burn', icon: 'local_fire_department', family: 'material-symbols-outlined' };
        }
        if (result.upgrade) {
            result.resultType = existingType;
            result.text = `Upgrade`;
        }
    }
    if (!result.text && result.resultType) {
        result.text = result.resultType.replace('_', ' ');
    }
    return (result.text && result.resultType) ? result : null;
}
function checkForAndCreateNinePin(placedGridX, placedGridY) {
    for (let dy = -2; dy <= 0; dy++) {
        for (let dx = -2; dx <= 0; dx++) {
            const startX = placedGridX + dx;
            const startY = placedGridY + dy;

            if (startX < 0 || startY < 0 || startX + 2 >= GRID_COLS || startY + 2 >= GRID_ROWS) {
                continue;
            }

            let pinTowersInSquare = [];
            let isComplete = true;
            for (let j = 0; j < 3; j++) {
                for (let i = 0; i < 3; i++) {
                    const checkX = startX + i;
                    const checkY = startY + j;
                    const tower = towers.find(t => Math.floor(t.x / TILE_SIZE) === checkX && Math.floor(t.y / TILE_SIZE) === checkY);

                    if (tower && tower.type === 'PIN') {
                        pinTowersInSquare.push(tower);
                    } else {
                        isComplete = false;
                        break;
                    }
                }
                if (!isComplete) break;
            }

            if (isComplete) {
                let totalCost = 0;
                pinTowersInSquare.forEach(t => {
                    totalCost += t.cost;
                });
                towers = towers.filter(t => !pinTowersInSquare.some(pin => pin.id === t.id));

                const centerX = (startX + 1) * TILE_SIZE + TILE_SIZE / 2;
                const centerY = (startY + 1) * TILE_SIZE + TILE_SIZE / 2;

                const ninePin = new Tower(centerX, centerY, 'NINE_PIN');
                ninePin.cost = totalCost;
                towers.push(ninePin);
                
                // Mark the entire 3x3 area as occupied
                for (let j = 0; j < 3; j++) {
                    for (let i = 0; i < 3; i++) {
                        placementGrid[startY + j][startX + i] = GRID_TOWER;
                    }
                }

                announcements.push(new TextAnnouncement("NINE PIN!", canvasWidth / 2, 50, 180, '#FFFFFF', canvasWidth));
                selectedTower = ninePin;
                return;
            }
        }
    }
}
function handleCanvasAction(e) {
    resumeAudioContext();
    const mousePos = getMousePos(canvas, e);
    const gridX = Math.floor(mousePos.x / TILE_SIZE);
    const gridY = Math.floor(mousePos.y / TILE_SIZE);
    const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;
    let actionTaken = false;
    const isPlacingMode = placingTower || placingFromCloud;

    // Prioritize clicking on an enemy
    const clickedOnEnemy = enemies.find(en => Math.hypot(mousePos.x - en.x, mousePos.y - en.y) < en.size);
    if (clickedOnEnemy) {
        selectedEnemy = clickedOnEnemy;
        selectedTower = null; // Deselect any tower
        actionTaken = true;
    } else if (isPlacingMode) {
        const towerToPlaceType = placingTower;
        let mergingTower = null;
        let mergingFromCloud = false;
        let mergingFromCanvas = false;
        let costOfPlacingTower;
        if (placingFromCloud) {
            mergingTower = placingFromCloud;
            mergingFromCloud = true;
            costOfPlacingTower = mergingTower.cost;
        } else if (draggedCanvasTower) {
            mergingTower = draggedCanvasTower;
            mergingFromCanvas = true;
            costOfPlacingTower = mergingTower.cost;
        } else {
            costOfPlacingTower = TOWER_TYPES[towerToPlaceType].cost;
            mergingTower = { type: towerToPlaceType, cost: costOfPlacingTower, id: crypto.randomUUID() };
        }
        if (gold < costOfPlacingTower && !mergingFromCloud && !mergingFromCanvas) return;
        const clickedOnTower = towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            return tGridX === gridX && tGridY === gridY;
        });
        const mergeInfo = clickedOnTower ? getMergeResultInfo(clickedOnTower, mergingTower.type) : null;
        if (mergeInfo) {
            const mergeState = {
                existingTower: clickedOnTower,
                mergingTower: mergingTower,
                placingTowerType: mergingTower.type,
                mergeInfo: mergeInfo,
                placingFromCloud: mergingFromCloud,
                mergingFromCanvas: mergingFromCanvas,
                originalPosition: draggedCanvasTowerOriginalGridPos
            };
            uiElements.mergeConfirmModal.mergeState = mergeState;
            showMergeConfirmation(mergeState);
            placingTower = null;
            placingFromCloud = null;
            draggedCloudTower = null;
            actionTaken = true;
        } else if (isValidPlacement(snappedX, snappedY)) {
            const newTowerType = mergingTower.type;
            const newTower = new Tower(snappedX, snappedY, newTowerType);
            if (mergingFromCloud || mergingFromCanvas) {
                Object.assign(newTower, mergingTower);
                newTower.x = snappedX;
                newTower.y = snappedY;
                if (mergingFromCloud) {
                    cloudInventory = cloudInventory.filter(t => t.id !== mergingTower.id);
                    renderCloudInventory();
                } else if (mergingFromCanvas) {
                    towers = towers.filter(t => t.id !== mergingTower.id);
                    placementGrid[draggedCanvasTowerOriginalGridPos.y][draggedCanvasTowerOriginalGridPos.x] = GRID_EMPTY;
                }
            } else {
                gold -= costOfPlacingTower;
            }
            if (newTower.type === 'SUPPORT' && !hasPlacedFirstSupport) {
                announcements.push(new TextAnnouncement("Support\nAgent\nis Online", canvasWidth / 2, 50, 180, undefined, canvasWidth));
                hasPlacedFirstSupport = true;
            }
            placementGrid[gridY][gridX] = GRID_TOWER;
            towers.push(newTower);
            if (newTowerType === 'PIN') {
                 checkForAndCreateNinePin(gridX, gridY);
            }
            placingTower = null;
            placingFromCloud = null;
            actionTaken = true;
        } else {
            placingTower = null;
            placingFromCloud = null;
            actionTaken = true;
        }
    } else {
        selectedTower = towers.find(t => {
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

        if (selectedTower) {
            selectedEnemy = null; // Deselect any enemy if a tower is selected
        } else {
            // Click was on empty space, deselect everything
            selectedEnemy = null;
            selectedTower = null;
        }
        actionTaken = true;
    }

    if (!isPlacingMode && !clickedOnEnemy) {
        uiElements.buyPinBtn.classList.remove('selected');
        uiElements.buyCastleBtn.classList.remove('selected');
        uiElements.buySupportBtn.classList.remove('selected');
    }

    if (actionTaken) {
        updateUI({ lives, gold, wave, isCloudUnlocked });
        updateSellPanel(selectedTower, isCloudUnlocked);
    }
}
canvas.addEventListener('click', handleCanvasAction);
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse.x = mouseX * scaleX;
    mouse.y = mouseY * scaleY;
    if (placingTower) {
        const gridX = Math.floor(mouse.x / TILE_SIZE);
        const gridY = Math.floor(mouse.y / TILE_SIZE);
        const hoveredTower = towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            return tGridX === gridX && tGridY === gridY;
        });
        if (hoveredTower) {
            const mergeInfo = getMergeResultInfo(hoveredTower, placingTower);
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
    if (!isCloudUnlocked) {
        e.preventDefault();
        return;
    }
    const towerToDrag = towers.find(t => {
        const tGridX = Math.floor(t.x / TILE_SIZE);
        const tGridY = Math.floor(t.y / TILE_SIZE);
        return tGridX === gridX && tGridY === gridY;
    });
    if (towerToDrag) {
        draggedCanvasTower = towerToDrag;
        draggedCanvasTowerOriginalGridPos = { x: gridX, y: gridY };
        e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'canvas', towerId: towerToDrag.id }));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = TILE_SIZE;
        tempCanvas.height = TILE_SIZE;
        const tempCtx = tempCanvas.getContext('2d');
        const towerColor = (towerToDrag.type === 'ENT' && towerToDrag.mode === 'slow') ? '#0891b2' : ((towerToDrag.type === 'CAT' && towerToDrag.mode === 'slow') ? '#0891b2' : towerToDrag.color);
        const towerIconInfo = getTowerIconInfo(towerToDrag.type);
        const fontStyle = towerIconInfo.className === 'fa-solid' ? '900' : '400';
        tempCtx.font = `${fontStyle} 24px "${towerIconInfo.className.replace('fa-solid', 'Font Awesome 6 Free').replace('material-symbols-outlined', 'Material Symbols Outlined').replace('material-icons', 'Material Icons')}"`;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillStyle = towerColor;
        tempCtx.fillText(towerIconInfo.icon, TILE_SIZE / 2, TILE_SIZE / 2);
        e.dataTransfer.setDragImage(tempCanvas, TILE_SIZE / 2, TILE_SIZE / 2);
    } else {
        e.preventDefault();
        document.body.classList.remove('is-dragging');
    }
});
canvas.addEventListener('dragend', () => {
    document.body.classList.remove('is-dragging');
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
            const towerToMove = towers.find(t => t.id === transferData.towerId);
            if (towerToMove) {
                if (towerToMove.type === 'NINE_PIN') {
                    const centerX = Math.floor(towerToMove.x / TILE_SIZE);
                    const centerY = Math.floor(towerToMove.y / TILE_SIZE);
                    const startX = centerX - 1;
                    const startY = centerY - 1;
                    for (let j = 0; j < 3; j++) {
                        for (let i = 0; i < 3; i++) {
                            if (placementGrid[startY + j] && placementGrid[startY + j][startX + i] !== undefined) {
                                placementGrid[startY + j][startX + i] = GRID_EMPTY;
                            }
                        }
                    }
                } else {
                    const gridX = Math.floor(towerToMove.x / TILE_SIZE);
                    const gridY = Math.floor(towerToMove.y / TILE_SIZE);
                    placementGrid[gridY][gridX] = GRID_EMPTY;
                }
                towers = towers.filter(t => t.id !== towerToMove.id);
                cloudInventory.push(towerToMove);
                renderCloudInventory();
                selectedTower = null;
                updateSellPanel(null, isCloudUnlocked);
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
    const targetTower = towers.find(t => {
        const tGridX = Math.floor(t.x / TILE_SIZE);
        const tGridY = Math.floor(t.y / TILE_SIZE);
        return tGridX === gridX && tGridY === gridY;
    });
    let sourceTower;
    if (transferData.source === 'cloud') {
        sourceTower = cloudInventory.find(t => t.id === transferData.towerId);
    } else if (transferData.source === 'canvas') {
        sourceTower = towers.find(t => t.id === transferData.towerId);
    }
    let actionTaken = false;
    if (sourceTower) {
        if (targetTower && targetTower.id !== sourceTower.id) {
            const mergeState = {
                existingTower: targetTower,
                mergingTower: sourceTower,
                placingTowerType: sourceTower.type,
                mergeInfo: getMergeResultInfo(targetTower, sourceTower.type),
                placingFromCloud: transferData.source === 'cloud',
                mergingFromCanvas: transferData.source === 'canvas',
                originalPosition: draggedCanvasTowerOriginalGridPos
            };
            uiElements.mergeConfirmModal.mergeState = mergeState;
            showMergeConfirmation(mergeState);
            actionTaken = true;
        }
        else if (!targetTower && isValidPlacement(snappedX, snappedY)) {
            if (transferData.source === 'cloud') {
                sourceTower.x = snappedX;
                sourceTower.y = snappedY;
                towers.push(sourceTower);
                cloudInventory = cloudInventory.filter(t => t.id !== sourceTower.id);
            } else if (transferData.source === 'canvas') {
                placementGrid[Math.floor(sourceTower.y / TILE_SIZE)][Math.floor(sourceTower.x / TILE_SIZE)] = GRID_EMPTY;
                sourceTower.x = snappedX;
                sourceTower.y = snappedY;
            }
            placementGrid[gridY][gridX] = GRID_TOWER;
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

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: mouseX * scaleX,
        y: mouseY * scaleY
    };
}

function init() {
    lives = 20;
    gold = 100;
    wave = 0;
    enemies = [];
    towers = [];
    projectiles = [];
    effects = [];
    announcements = [];
    introducedEnemies.clear();
    hasPlacedFirstSupport = false;
    waveInProgress = false;
    spawningEnemies = false;
    placingTower = null;
    gameOver = false;
    selectedTower = null;
    selectedEnemy = null;
    gameSpeed = 1;
    isCloudUnlocked = false;
    cloudInventory = [];
    placingFromCloud = null;
    draggedCloudTower = null;
    draggedCanvasTower = null;
    draggedCanvasTowerOriginalGridPos = { x: -1, y: -1 };
    mergeTooltip.show = false;
    mergeTooltip.info = null;
    uiElements.speedToggleBtn.textContent = 'x1';
    uiElements.buyPinBtn.classList.remove('selected');
    uiElements.buyCastleBtn.classList.remove('selected');
    uiElements.buySupportBtn.classList.remove('selected');
    uiElements.startWaveBtn.disabled = false;
    uiElements.gameOverModal.classList.add('hidden');
    uiElements.cloudInventoryPanel.classList.add('hidden');
    renderCloudInventory();
    updateUI({ lives, gold, wave, isCloudUnlocked });
    updateSellPanel(null, isCloudUnlocked);
    canvas.width = GRID_COLS * TILE_SIZE;
    canvas.height = GRID_ROWS * TILE_SIZE;
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    const pathData = generatePath();
    path = pathData.path;
    placementGrid = pathData.placementGrid;
    resizeCanvas();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

// Event Listeners
uiElements.startWaveBtn.addEventListener('click', () => {
    resumeAudioContext();
    spawnWave();
});
uiElements.buyPinBtn.addEventListener('click', () => selectTowerToPlace('PIN'));
uiElements.buyCastleBtn.addEventListener('click', () => selectTowerToPlace('CASTLE'));
uiElements.buySupportBtn.addEventListener('click', () => selectTowerToPlace('SUPPORT'));
uiElements.restartGameBtn.addEventListener('click', init);

uiElements.sellTowerBtn.addEventListener('click', () => {
    resumeAudioContext();
    if (selectedTower) {
        gold += Math.floor(selectedTower.cost * 0.5);
        if (selectedTower.type === 'NINE_PIN') {
            const centerX = Math.floor(selectedTower.x / TILE_SIZE);
            const centerY = Math.floor(selectedTower.y / TILE_SIZE);
            const startX = centerX - 1;
            const startY = centerY - 1;
            for (let j = 0; j < 3; j++) {
                for (let i = 0; i < 3; i++) {
                    if (placementGrid[startY + j] && placementGrid[startY + j][startX + i] !== undefined) {
                        placementGrid[startY + j][startX + i] = GRID_EMPTY;
                    }
                }
            }
        } else {
            const gridX = Math.floor(selectedTower.x / TILE_SIZE);
            const gridY = Math.floor(selectedTower.y / TILE_SIZE);
            placementGrid[gridY][gridX] = GRID_EMPTY;
        }
        towers = towers.filter(t => t !== selectedTower);
        selectedTower = null;
        updateUI({ lives, gold, wave, isCloudUnlocked });
        updateSellPanel(null, isCloudUnlocked);
    }
});

uiElements.moveToCloudBtn.addEventListener('click', () => {
    resumeAudioContext();
    if (selectedTower && isCloudUnlocked) {
        cloudInventory.push(selectedTower);
        if (selectedTower.type === 'NINE_PIN') {
            const centerX = Math.floor(selectedTower.x / TILE_SIZE);
            const centerY = Math.floor(selectedTower.y / TILE_SIZE);
            const startX = centerX - 1;
            const startY = centerY - 1;
            for (let j = 0; j < 3; j++) {
                for (let i = 0; i < 3; i++) {
                     if (placementGrid[startY + j] && placementGrid[startY + j][startX + i] !== undefined) {
                        placementGrid[startY + j][startX + i] = GRID_EMPTY;
                    }
                }
            }
        } else {
            const gridX = Math.floor(selectedTower.x / TILE_SIZE);
            const gridY = Math.floor(selectedTower.y / TILE_SIZE);
            placementGrid[gridY][gridX] = GRID_EMPTY;
        }
        towers = towers.filter(t => t !== selectedTower);
        selectedTower = null;
        renderCloudInventory();
        updateSellPanel(null, isCloudUnlocked);
    }
});

uiElements.toggleModeBtn.addEventListener('click', () => {
    resumeAudioContext();
    if (selectedTower) {
        if (selectedTower.type === 'ENT' || selectedTower.type === 'CAT') {
            selectedTower.mode = selectedTower.mode === 'boost' ? 'slow' : 'boost';
        } else if (selectedTower.type === 'ORBIT') {
            selectedTower.orbitMode = selectedTower.orbitMode === 'far' ? 'near' : 'far';
        }
        updateSellPanel(selectedTower, isCloudUnlocked);
    }
});

uiElements.toggleTargetingBtn.addEventListener('click', () => {
    resumeAudioContext();
    if (selectedTower) {
        const modes = ['strongest', 'weakest', 'furthest'];
        const currentIndex = modes.indexOf(selectedTower.targetingMode);
        selectedTower.targetingMode = modes[(currentIndex + 1) % modes.length];
        updateSellPanel(selectedTower, isCloudUnlocked);
    }
});

uiElements.speedToggleBtn.addEventListener('click', () => {
    resumeAudioContext();
    if (gameSpeed === 1) {
        gameSpeed = 2;
        uiElements.speedToggleBtn.textContent = 'x2';
    } else {
        gameSpeed = 1;
        uiElements.speedToggleBtn.textContent = 'x1';
    }
});

uiElements.soundToggleBtn.addEventListener('click', () => {
    resumeAudioContext();
    isSoundEnabled = !isSoundEnabled;
    const soundIcon = document.getElementById('sound-icon');
    soundIcon.textContent = isSoundEnabled ? 'volume_up' : 'volume_off';
});

uiElements.cloudButton.addEventListener('click', () => {
    resumeAudioContext();
    if (!isCloudUnlocked) {
        if (gold >= 100) {
            gold -= 100;
            isCloudUnlocked = true;
            uiElements.cloudInventoryPanel.classList.remove('hidden');
            updateUI({ lives, gold, wave, isCloudUnlocked });
            announcements.push(new TextAnnouncement("Cloud Storage Unlocked!", canvasWidth / 2, 50, 180, undefined, canvasWidth));
        }
    } else {
        uiElements.cloudInventoryPanel.classList.toggle('hidden');
    }
});

uiElements.cancelMergeBtn.addEventListener('click', () => {
    resumeAudioContext();
    // Reset dragging state and hide the modal without performing the merge
    draggedCanvasTower = null;
    draggedCloudTower = null;
    placingTower = null;
    placingFromCloud = null;
    uiElements.mergeConfirmModal.classList.add('hidden');
});

uiElements.confirmMergeBtn.addEventListener('click', () => {
    resumeAudioContext();
    const mergeState = uiElements.mergeConfirmModal.mergeState;
    if (!mergeState) return;

    const {
        existingTower,
        mergingTower,
        placingFromCloud,
        mergingFromCanvas,
        originalPosition
    } = mergeState;

    let cost = 0;
    // Determine the cost based on the source of the merging tower
    if (placingFromCloud || mergingFromCanvas) {
        cost = mergingTower.cost;
    } else {
        cost = TOWER_TYPES[mergingTower.type].cost;
    }

    // Check for sufficient gold only if buying a new tower for the merge
    if (!placingFromCloud && !mergingFromCanvas && gold < cost) {
        uiElements.mergeConfirmModal.classList.add('hidden');
        return; // Not enough gold
    }

    const merged = performMerge(existingTower, mergingTower.type, cost);

    if (merged) {
        if (placingFromCloud) {
            cloudInventory = cloudInventory.filter(t => t.id !== mergingTower.id);
        } else if (mergingFromCanvas) {
            towers = towers.filter(t => t.id !== mergingTower.id);
            if (originalPosition.x !== -1) {
                placementGrid[originalPosition.y][originalPosition.x] = GRID_EMPTY;
            }
        } else {
            gold -= cost;
        }
        // Select the tower that was merged into to show its new stats
        selectedTower = existingTower;
    }

    // Hide modal and reset states
    uiElements.mergeConfirmModal.classList.add('hidden');
    draggedCanvasTower = null;
    draggedCloudTower = null;
    placingTower = null;
    placingFromCloud = null;

    // Update all relevant UI components
    updateUI({ lives, gold, wave, isCloudUnlocked });
    updateSellPanel(selectedTower, isCloudUnlocked);
    renderCloudInventory();
});


window.addEventListener('resize', resizeCanvas);

document.fonts.ready.then(() => {
    init();
}).catch(err => {
    console.error("Font loading failed, starting game anyway.", err);
    init();
});

