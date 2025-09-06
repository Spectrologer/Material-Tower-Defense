// This file is the "brain" of the game. It sets everything up and runs the main game loop.

// Imports: Pulling in all the different parts of the game from other files.
import { TOWER_TYPES, ENEMY_TYPES, TILE_SIZE, GRID_EMPTY, GRID_TOWER, GRID_COLS, GRID_ROWS } from './constants.js';
import { generatePath } from './path-generator.js';
// We now import the new TextAnnouncement class as well.
import { Enemy, Tower, Projectile, Effect, TextAnnouncement } from './game-entities.js';
import { uiElements, updateUI, updateSellPanel, triggerGameOver } from './ui-manager.js';

// Setting up the drawing area (the canvas).
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Helper function to blend two hex colors.
function blendColors(colorA, colorB) {
    const [rA, gA, bA] = colorA.match(/\w\w/g).map((c) => parseInt(c, 16));
    const [rB, gB, bB] = colorB.match(/\w\w/g).map((c) => parseInt(c, 16));
    const r = Math.round(rA * 0.5 + rB * 0.5).toString(16).padStart(2, '0');
    const g = Math.round(gA * 0.5 + gB * 0.5).toString(16).padStart(2, '0');
    const b = Math.round(bA * 0.5 + bB * 0.5).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

// A variable to hold the canvas's width and height.
let canvasWidth, canvasHeight;
// The new AudioContext for generating sound.
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let isSoundEnabled = true;

function playMoneySound() {
    // Only play the sound if it is enabled.
    if (!isSoundEnabled) return;

    // Create an oscillator for a simple tone.
    const oscillator = audioContext.createOscillator();
    // Create a gain node to control the volume and create a fade-out effect.
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A simple "ding" tone (A5).

    // Connect the nodes: oscillator -> gain -> speakers.
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set the initial volume to a low value and increase it quickly.
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, audioContext.currentTime + 0.01); // Made the sound slightly softer.

    // Schedule a smooth fade-out.
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    // Start the sound and stop it shortly after.
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Game State: These variables keep track of everything happening in the game.
let lives, gold, wave;
// Make gold a global property on the window object so ui-manager can access it.
window.gold = 0;
let enemies = [];
let towers = [];
let projectiles = [];
let effects = [];
// This array will hold the pop-up text announcements.
let announcements = [];
// This set will keep track of which enemies we've already seen.
let introducedEnemies = new Set();
let hasPlacedFirstSupport = false; // Tracks if the first support tower has been placed.
let path = [];
let placementGrid = [];
let waveInProgress = false;
let placingTower = null;
let gameOver = false;
let animationFrameId; // Used to control the game's animation loop.
let mouse = { x: 0, y: 0 }; // Keeps track of the mouse position.
let selectedTower = null;
let gameSpeed = 1;
// New variable to track clicks on the debug button
let debugClickCount = 0;

// This function scales the canvas display size to fit its container.
function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    // The canvas's internal aspect ratio is now fixed by our constants.
    const aspectRatio = canvas.width / canvas.height;

    const availableWidth = container.clientWidth;
    const availableHeight = container.clientHeight;

    let newWidth = availableWidth;
    let newHeight = newWidth / aspectRatio;

    // If the calculated height is too tall for the container,
    // scale down the dimensions based on the available height.
    if (newHeight > availableHeight) {
        newHeight = availableHeight;
        newWidth = newHeight * aspectRatio;
    }

    // Set the CSS display size of the canvas
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;

    // Center the canvas within the container
    canvas.style.left = `${(availableWidth - newWidth) / 2}px`;
    canvas.style.top = `${(availableHeight - newHeight) / 2}px`;
}


// This function creates a new wave of enemies.
function spawnWave() {
    // wave variable now represents completed waves. The next wave is wave + 1.
    waveInProgress = true;
    updateUI({ lives, gold, wave: wave + 1 }); // Show the user the wave they are starting
    uiElements.startWaveBtn.disabled = true;

    // All calculations should be based on the wave that is about to start.
    const nextWave = wave + 1;
    const isSwarmWave = nextWave > 0 && nextWave % 4 === 0;

    const enemyCount = isSwarmWave ? 15 + nextWave * 5 : 5 + nextWave * 3;
    const spawnRate = isSwarmWave ? 150 : 500; // Swarm enemies spawn much faster.
    
    let spawned = 0;
    const spawnInterval = setInterval(() => {
        if (spawned >= enemyCount) {
            clearInterval(spawnInterval);
            return;
        }

        let enemyType;
        if (isSwarmWave) {
            // On a swarm wave, only spawn the new SWARM enemy type.
            enemyType = ENEMY_TYPES.SWARM;
        } else {
            // On normal waves, spawn a random mix of enemies.
            const rand = Math.random();
            if (nextWave >= 4 && rand < 0.2) { // 20% chance for Flying from wave 4
                enemyType = ENEMY_TYPES.FLYING;
            } else if (nextWave >= 6 && rand < 0.4) { // 20% chance for Heavy from wave 6 (rand is 0.2-0.4)
                enemyType = ENEMY_TYPES.HEAVY;
            } else if (nextWave >= 3 && rand < 0.7) { // 30% chance for Fast from wave 3 (rand is 0.4-0.7)
                enemyType = ENEMY_TYPES.FAST;
            } else { // 30% chance for Normal (or 100% on wave 1-2)
                enemyType = ENEMY_TYPES.NORMAL;
            }
        }
        
        // This is where we check if a new enemy type is being introduced.
        const enemyTypeName = Object.keys(ENEMY_TYPES).find(key => ENEMY_TYPES[key] === enemyType);
        if (enemyTypeName && !introducedEnemies.has(enemyTypeName)) {
            // If it's the first time we've seen this enemy...
            introducedEnemies.add(enemyTypeName); // ...add it to our set of seen enemies...
            // ...and create a new announcement that will last for 3 seconds (180 frames).
            const displayName = enemyType.icon.replace(/_/g, ' '); // Makes names like 'bug_report' look like 'bug report'.
            announcements.push(new TextAnnouncement(`New Enemy:\n${displayName}`, canvasWidth / 2, 50, 180, undefined, canvasWidth));
        }
        
        const healthMultiplier = 1 + (nextWave - 1) * 0.15;
        // Swarm enemies get less of a health boost in later waves to keep them weak.
        const finalHealth = isSwarmWave ? enemyType.health * (1 + (nextWave - 1) * 0.05) : enemyType.health * healthMultiplier;
        const finalEnemyType = {...enemyType, health: Math.ceil(finalHealth)};

        enemies.push(new Enemy(finalEnemyType, path));
        spawned++;
    }, spawnRate);
}

// Applies buffs from Support towers to nearby attack towers and slows from Ent towers.
function applyAuraEffects() {
    // Reset all buffs and debuffs at the start of the frame.
    towers.forEach(tower => {
        if (tower.type !== 'SUPPORT' && tower.type !== 'ENT') {
            tower.fireRate = tower.permFireRate;
            tower.damageMultiplier = 1; // Reset damage multiplier
        }
    });
    
    enemies.forEach(enemy => {
        enemy.slowMultiplier = 1;
    });

    // Apply effects from aura towers.
    towers.forEach(auraTower => {
        if (auraTower.type === 'SUPPORT' || auraTower.type === 'ENT') {
            towers.forEach(targetTower => {
                if (targetTower.type !== 'SUPPORT' && targetTower.type !== 'ENT') {
                    const dist = Math.hypot(auraTower.x - targetTower.x, auraTower.y - targetTower.y);
                    if (dist <= auraTower.range) {
                        if (auraTower.type === 'SUPPORT') {
                            targetTower.fireRate *= auraTower.attackSpeedBoost; 
                        } else if (auraTower.type === 'ENT' && auraTower.mode === 'boost') {
                            targetTower.fireRate *= auraTower.attackSpeedBoost;
                            targetTower.damageMultiplier = Math.max(targetTower.damageMultiplier, auraTower.damageBoost);
                        }
                    }
                }
            });
            // Also apply slow effects to enemies if the ENT tower is in slow mode
            if (auraTower.type === 'ENT' && auraTower.mode === 'slow') {
                 enemies.forEach(enemy => {
                    const dist = Math.hypot(auraTower.x - enemy.x, auraTower.y - enemy.y);
                    if (dist <= auraTower.range) {
                        // Apply the strongest slow effect, non-stacking.
                        enemy.slowMultiplier = Math.min(enemy.slowMultiplier, auraTower.enemySlow);
                    }
                });
            }
        }
    });
}

// This function is called when a projectile hits an enemy.
function handleProjectileHit(projectile, hitEnemy) {
    const targetEnemy = hitEnemy || projectile.target;

    // If the target isn't a valid enemy (e.g., a fake target for spreadshot), do nothing.
    // This projectile will just expire without hitting anything.
    if (!targetEnemy || typeof targetEnemy.takeDamage !== 'function') {
        return;
    }
    
    // Calculate final damage with multipliers
    const finalDamage = projectile.owner.damage * projectile.owner.damageMultiplier;

    if (projectile.owner.type === 'FIREPLACE') {
        effects.push(new Effect(targetEnemy.x, targetEnemy.y, 'local_fire_department', projectile.owner.splashRadius * 2, projectile.owner.projectileColor, 20));
        enemies.forEach(enemy => {
            if (Math.hypot(targetEnemy.x - enemy.x, targetEnemy.y - enemy.y) <= projectile.owner.splashRadius) {
                // The direct target always takes damage. Others take splash if not immune.
                if (enemy === targetEnemy || !enemy.type.splashImmune) {
                    if (enemy.takeDamage(finalDamage)) {
                         // Add gold drop effect
                         effects.push(new Effect(enemy.x, enemy.y, 'attach_money', enemy.gold * 5 + 10, '#FFD700', 30));
                         gold += enemy.gold;
                    }
                    enemy.applyBurn(projectile.owner.burnDps, projectile.owner.burnDuration);
                }
            }
        });
    } else if (projectile.owner.splashRadius > 0) {
        effects.push(new Effect(targetEnemy.x, targetEnemy.y, 'explosion', projectile.owner.splashRadius * 2, projectile.owner.projectileColor, 20));
        enemies.forEach(enemy => {
            if (Math.hypot(targetEnemy.x - enemy.x, targetEnemy.y - enemy.y) <= projectile.owner.splashRadius) {
                 // The direct target always takes damage. Others take splash if not immune.
                 if (enemy === targetEnemy || !enemy.type.splashImmune) {
                    if (enemy.takeDamage(finalDamage)) {
                        // Add gold drop effect
                        effects.push(new Effect(enemy.x, enemy.y, 'attach_money', enemy.gold * 5 + 10, '#FFD700', 30));
                        gold += enemy.gold;
                    }
                }
            }
        });
    } else {
         if (targetEnemy.takeDamage(finalDamage)) {
            // Add gold drop effect
            effects.push(new Effect(targetEnemy.x, projectile.y, 'attach_money', targetEnemy.gold * 5 + 10, '#FFD700', 30));
            gold += targetEnemy.gold;
         }
    }
    window.gold = gold; // Sync the global gold variable
    updateUI({ lives, gold, wave });
}

// The main loop that runs continuously to update and draw the game.
function gameLoop() {
    if(gameOver) return;

    for (let i = 0; i < gameSpeed; i++) {
        applyAuraEffects(); // Now handling both boosts and slows
        
        const onEnemyDeath = (enemy) => {
            effects.push(new Effect(enemy.x, enemy.y, 'attach_money', enemy.gold * 5 + 10, '#FFD700', 30));
            gold += enemy.gold;
            window.gold = gold;
            updateUI({ lives, gold, wave });
            playMoneySound();
        };

        towers.forEach(tower => tower.update(enemies, projectiles, onEnemyDeath));
        
        projectiles = projectiles.filter(p => p.update(handleProjectileHit, enemies));
        
        enemies = enemies.filter(enemy => enemy.update(
            () => { // This happens when an enemy reaches the end of the path.
                lives--;
                updateUI({ lives, gold, wave });
                if (lives <= 0) {
                    gameOver = true;
                    triggerGameOver(false, wave);
                }
            },
            () => { // New onDeath callback to handle enemy death.
                // Play the money sound when an enemy dies.
                playMoneySound();
            } 
        ));
        
        effects = effects.filter(effect => effect.update());
        // We also update any active text announcements.
        announcements = announcements.filter(announcement => announcement.update());
        
        // Checks if the wave is over.
        if(waveInProgress && enemies.length === 0){
            waveInProgress = false;
            wave++; // The wave is now officially complete, so we increment the counter.
            uiElements.startWaveBtn.disabled = false;
            
            // Calculate and add interest on unspent gold (starting after wave 1 is complete)
            // This now runs after wave 2 is completed (when wave becomes 2)
            if (wave > 1) {
                const interestEarned = Math.floor(gold * 0.05);
                if (interestEarned > 0) {
                    gold += interestEarned;
                    // Announce the interest earned
                    announcements.push(new TextAnnouncement(`+${interestEarned}G Interest!`, canvasWidth / 2, 80, 180, undefined, canvasWidth));
                }
            }

            // Add a smaller flat bonus for completing the wave
            const waveBonus = 10 + wave;
            gold += waveBonus;
            
            // Add a warning for the next wave if it contains flying enemies for the first time
            // This now correctly warns at the end of wave 3 for the upcoming wave 4.
            if (wave === 3) {
                setTimeout(() => {
                    announcements.push(new TextAnnouncement("Warning:\nFlying enemies incoming!", canvasWidth / 2, canvasHeight / 2, 300, '#ff4d4d', canvasWidth)); // Longer duration
                }, 1500); // 1.5 second delay
            }

            window.gold = gold;
            updateUI({ lives, gold, wave }); // The UI now shows the number of completed waves.
        }
    }
    
    // Drawing everything on the screen.
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawPath();

    if (placingTower) {
        drawPlacementGrid();
    }

    towers.forEach(tower => tower.draw(ctx));
    
    if (selectedTower) {
        selectedTower.drawRange(ctx);
        if(selectedTower.type === 'SUPPORT' || selectedTower.type === 'ENT') selectedTower.drawBuffEffect(ctx);
    }

    projectiles.forEach(p => p.draw(ctx));
    effects.forEach(effect => effect.draw(ctx));
    enemies.forEach(enemy => enemy.draw(ctx));
    // And finally, we draw any active announcements on top of everything else.
    announcements.forEach(announcement => announcement.draw(ctx));
    
    // Shows a preview of the tower you're about to place.
    if (placingTower) {
        const gridX = Math.floor(mouse.x / TILE_SIZE);
        const gridY = Math.floor(mouse.y / TILE_SIZE);
        const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
        const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;

        const tempTower = new Tower(snappedX, snappedY, placingTower);
        tempTower.draw(ctx);
        tempTower.drawRange(ctx);
        if (!isValidPlacement(snappedX, snappedY)) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(snappedX, snappedY, TILE_SIZE/2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // This tells the browser to run gameLoop again for the next frame.
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Draws the grid of dots where you can place towers.
function drawPlacementGrid() {
    const cols = Math.floor(canvasWidth / TILE_SIZE);
    const rows = Math.floor(canvasHeight / TILE_SIZE);
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (placementGrid[y] && placementGrid[y][x] === GRID_EMPTY) {
                ctx.beginPath();
                ctx.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    const mouseGridX = Math.floor(mouse.x / TILE_SIZE);
    const mouseGridY = Math.floor(mouse.y / TILE_SIZE);
    if (placementGrid[mouseGridY] && placementGrid[mouseGridY][mouseGridX] === GRID_EMPTY) {
        ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
        ctx.fillRect(mouseGridX * TILE_SIZE, mouseGridY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
        ctx.strokeRect(mouseGridX * TILE_SIZE, mouseGridY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    ctx.restore();
}

// Draws the path for the enemies to follow.
function drawPath() {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = TILE_SIZE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (path.length > 0) {
         ctx.moveTo(0, path[0].y);
         ctx.lineTo(path[0].x, path[0].y);
    }
    for (let i = 0; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
     if (path.length > 0) {
         ctx.lineTo(canvasWidth, path[path.length - 1].y);
    }
    ctx.stroke();
    
    ctx.strokeStyle = '#666';
    ctx.lineWidth = TILE_SIZE - 10;
     ctx.beginPath();
    if (path.length > 0) {
         ctx.moveTo(0, path[0].y);
         ctx.lineTo(path[0].x, path[0].y);
    }
    for (let i = 0; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
     if (path.length > 0) {
         ctx.lineTo(canvasWidth, path[path.length - 1].y);
    }
    ctx.stroke();
}

// Checks if you're allowed to place a tower in a specific spot.
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

// Handles selecting a tower from the buy menu.
function selectTowerToPlace(towerType) {
    const cost = TOWER_TYPES[towerType].cost;
    if (gold >= cost) {
        placingTower = (placingTower === towerType) ? null : towerType;
        selectedTower = null;
        updateSellPanel(null);
        uiElements.buyPinBtn.classList.toggle('selected', placingTower === 'PIN');
        uiElements.buyCastleBtn.classList.toggle('selected', placingTower === 'CASTLE');
        uiElements.buySupportBtn.classList.toggle('selected', placingTower === 'SUPPORT');
    }
}

// Event Listeners: These watch for clicks and other user actions.
uiElements.startWaveBtn.addEventListener('click', spawnWave);
uiElements.buyPinBtn.addEventListener('click', () => selectTowerToPlace('PIN'));
uiElements.buyCastleBtn.addEventListener('click', () => selectTowerToPlace('CASTLE'));
uiElements.buySupportBtn.addEventListener('click', () => selectTowerToPlace('SUPPORT'));
uiElements.restartGameBtn.addEventListener('click', init);

uiElements.speedToggleBtn.addEventListener('click', () => {
    gameSpeed = gameSpeed === 1 ? 2 : 1;
    uiElements.speedToggleBtn.textContent = `x${gameSpeed}`;
});

uiElements.soundToggleBtn.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    const soundIcon = document.getElementById('sound-icon');
    if (isSoundEnabled) {
        soundIcon.textContent = 'volume_up';
    } else {
        soundIcon.textContent = 'volume_off';
    }
});

uiElements.sellTowerBtn.addEventListener('click', () => {
    if (selectedTower) {
        const gridX = Math.floor(selectedTower.x / TILE_SIZE);
        const gridY = Math.floor(selectedTower.y / TILE_SIZE);
        placementGrid[gridY][gridX] = GRID_EMPTY;

        gold += Math.floor(selectedTower.cost * 0.5);
        window.gold = gold; // Sync global gold
        towers = towers.filter(t => t !== selectedTower);
        selectedTower = null;
        updateUI({ lives, gold, wave });
        updateSellPanel(null);
    }
});

uiElements.toggleModeBtn.addEventListener('click', () => {
    if (selectedTower && selectedTower.type === 'ENT') {
        selectedTower.mode = (selectedTower.mode === 'boost') ? 'slow' : 'boost';
    } else if (selectedTower && selectedTower.type === 'ORBIT') {
        selectedTower.orbitMode = (selectedTower.orbitMode === 'far') ? 'near' : 'far';
    }
    updateSellPanel(selectedTower);
});

// New event listener for the infinite gold button
uiElements.infiniteGoldBtn = document.getElementById('infinite-gold');
if (uiElements.infiniteGoldBtn) {
    uiElements.infiniteGoldBtn.addEventListener('click', () => {
        debugClickCount++;
        if (debugClickCount >= 2) {
            gold = 99999;
            window.gold = gold;
            debugClickCount = 0;
            uiElements.infiniteGoldBtn.textContent = "DEBUG";
        } else {
            uiElements.infiniteGoldBtn.textContent = "CLICK AGAIN";
        }
        updateUI({ lives, gold, wave });
    });
}

canvas.addEventListener('click', (e) => {
    const mousePos = getMousePos(canvas, e);
    const gridX = Math.floor(mousePos.x / TILE_SIZE);
    const gridY = Math.floor(mousePos.y / TILE_SIZE);
    const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;

    let actionTaken = false;

    if (placingTower) {
        const towerToPlaceType = placingTower;
        if (gold < TOWER_TYPES[towerToPlaceType].cost) return;

        const clickedOnTower = towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            return tGridX === gridX && tGridY === gridY;
        });

        // Case 1: Click is on an invalid spot (not a tower, not an empty spot) -> CANCEL
        if (!clickedOnTower && !isValidPlacement(snappedX, snappedY)) {
            placingTower = null;
            actionTaken = true; // We performed the "cancel" action
        }
        // Case 2: Click is on an existing tower -> TRY MERGE
        else if (clickedOnTower) {
            let merged = false;
            const originalTowerColor = clickedOnTower.color;
            // Capture the level of the tower on the grid before any changes.
            const existingTowerLevel = clickedOnTower.level === 'MAX LEVEL' ? 5 : clickedOnTower.level;
            
            // This block handles all merge combinations
            if (clickedOnTower.type === 'SUPPORT' && towerToPlaceType === 'SUPPORT') {
                clickedOnTower.type = 'ENT';
                clickedOnTower.level = 'MAX LEVEL';
                clickedOnTower.damageLevel = 'MAX LEVEL';
                clickedOnTower.cost += TOWER_TYPES['SUPPORT'].cost;
                clickedOnTower.updateStats();
                clickedOnTower.color = TOWER_TYPES.ENT.color;
                merged = true;
            } else if (clickedOnTower.type === 'PIN' && towerToPlaceType === 'PIN') {
                const oldCost = clickedOnTower.cost;
                clickedOnTower.type = 'NAT';
                clickedOnTower.level = existingTowerLevel; 
                clickedOnTower.damageLevel = existingTowerLevel;
                clickedOnTower.projectileCount = 1; // Initialize projectile count for new NAT
                clickedOnTower.damageMultiplierFromMerge = 1; // Initialize damage multiplier
                clickedOnTower.updateStats();
                clickedOnTower.splashRadius = TOWER_TYPES.NAT.splashRadius;
                clickedOnTower.color = TOWER_TYPES.NAT.color;
                clickedOnTower.cost = oldCost + TOWER_TYPES['PIN'].cost;
                merged = true;
            } else if (clickedOnTower.type === 'CASTLE' && towerToPlaceType === 'CASTLE') {
                const oldCost = clickedOnTower.cost;
                // Directly modify the existing tower to become an Orbit tower
                clickedOnTower.type = 'ORBIT';
                clickedOnTower.orbitMode = 'far';
                // Crucially, create new orbiters with a reference to THIS tower instance
                clickedOnTower.orbiters = [
                    new Projectile(clickedOnTower, null, 0),
                    new Projectile(clickedOnTower, null, Math.PI)
                ];
                
                clickedOnTower.level = existingTowerLevel; 
                clickedOnTower.damageLevel = existingTowerLevel;
                clickedOnTower.updateStats(); // Recalculate stats for the new tower type and level
                clickedOnTower.splashRadius = TOWER_TYPES.ORBIT.splashRadius;
                clickedOnTower.color = TOWER_TYPES.ORBIT.color;
                clickedOnTower.cost = oldCost + TOWER_TYPES[towerToPlaceType].cost;
                merged = true;
            } else if (clickedOnTower.type === towerToPlaceType && clickedOnTower.level !== 'MAX LEVEL') {
                if (clickedOnTower.level < 5) {
                    clickedOnTower.level++;
                    if(clickedOnTower.damageLevel) clickedOnTower.damageLevel++;
                    clickedOnTower.updateStats();
                    merged = true;
                }
            } else if ((clickedOnTower.type === 'SUPPORT' && towerToPlaceType === 'PIN') || (clickedOnTower.type === 'PIN' && towerToPlaceType === 'SUPPORT')) {
                const oldCost = clickedOnTower.cost;
                clickedOnTower.type = 'PIN_HEART';
                clickedOnTower.level = existingTowerLevel;
                clickedOnTower.damageLevel = existingTowerLevel;
                clickedOnTower.updateStats();
                clickedOnTower.splashRadius = TOWER_TYPES.PIN_HEART.splashRadius;
                clickedOnTower.color = TOWER_TYPES.PIN_HEART.color;
                clickedOnTower.cost = oldCost + TOWER_TYPES[towerToPlaceType].cost;
                merged = true;
            } else if ((clickedOnTower.type === 'SUPPORT' && towerToPlaceType === 'CASTLE') || (clickedOnTower.type === 'CASTLE' && towerToPlaceType === 'SUPPORT')) {
                const oldCost = clickedOnTower.cost;
                clickedOnTower.type = 'FIREPLACE';
                clickedOnTower.level = existingTowerLevel; 
                clickedOnTower.damageLevel = existingTowerLevel;
                clickedOnTower.updateStats();
                // Explicitly set/reset stats for the new Fireplace tower
                clickedOnTower.damage = TOWER_TYPES.FIREPLACE.damage;
                clickedOnTower.splashRadius = TOWER_TYPES.FIREPLACE.splashRadius;
                clickedOnTower.burnDps = TOWER_TYPES.FIREPLACE.burnDps;
                clickedOnTower.burnDuration = TOWER_TYPES.FIREPLACE.burnDuration;
                clickedOnTower.color = TOWER_TYPES.FIREPLACE.color;
                clickedOnTower.cost = oldCost + TOWER_TYPES[towerToPlaceType].cost;
                merged = true;
            } else if ((clickedOnTower.type === 'PIN' && towerToPlaceType === 'CASTLE') || (clickedOnTower.type === 'CASTLE' && towerToPlaceType === 'PIN')) {
                const oldCost = clickedOnTower.cost;
                clickedOnTower.type = 'FORT';
                clickedOnTower.level = existingTowerLevel; 
                clickedOnTower.damageLevel = existingTowerLevel;
                clickedOnTower.updateStats();
                clickedOnTower.splashRadius = TOWER_TYPES.FORT.splashRadius;
                clickedOnTower.color = TOWER_TYPES.FORT.color;
                clickedOnTower.cost = oldCost + TOWER_TYPES[towerToPlaceType].cost;
                merged = true;
            } else if (clickedOnTower.type === 'NAT' && towerToPlaceType === 'CASTLE') { // Specific logic for NAT + CASTLE merge
                const mergingTowerStats = TOWER_TYPES[towerToPlaceType];
                if (clickedOnTower.level !== 'MAX LEVEL' && clickedOnTower.level < 5) {
                    
                    if (!clickedOnTower.projectileCount) clickedOnTower.projectileCount = 1;
                    
                    clickedOnTower.level++; // Only increase visual/cost level
                    clickedOnTower.projectileCount++;
                    
                    clickedOnTower.updateStats();
                    clickedOnTower.cost += mergingTowerStats.cost;
                    clickedOnTower.color = blendColors(clickedOnTower.color, TOWER_TYPES.CASTLE.color);
                    merged = true;
                }
            } else if (clickedOnTower.type === 'NAT' && towerToPlaceType === 'PIN') { // Specific logic for NAT + PIN merge
                const mergingTowerStats = TOWER_TYPES[towerToPlaceType];
                if (clickedOnTower.level !== 'MAX LEVEL' && clickedOnTower.level < 5) {
                    
                    if (clickedOnTower.damageMultiplierFromMerge === undefined) clickedOnTower.damageMultiplierFromMerge = 1;
                    
                    clickedOnTower.level++;
                    clickedOnTower.damageLevel++; // Increase both levels for damage scaling
                    clickedOnTower.damageMultiplierFromMerge *= 1.25; // 25% more damage
                    
                    clickedOnTower.updateStats();
                    clickedOnTower.cost += mergingTowerStats.cost;
                    clickedOnTower.color = blendColors(clickedOnTower.color, TOWER_TYPES.PIN.color);
                    merged = true;
                }
            } else if (clickedOnTower.type === 'CASTLE' && towerToPlaceType === 'NAT') {
                 // This logic path is currently unreachable because you can't select NAT to place.
                const mergingTowerStats = TOWER_TYPES[towerToPlaceType];
                if (clickedOnTower.level !== 'MAX LEVEL' && clickedOnTower.level < 5) {
                    clickedOnTower.type = 'NAT';
                    clickedOnTower.level = 1; // New hybrid towers start at level 1
                    clickedOnTower.damageLevel = 1;
                    clickedOnTower.projectileCount = 2; // Becomes a NAT with an extra projectile
                    clickedOnTower.updateStats();
                    clickedOnTower.splashRadius = TOWER_TYPES.NAT.splashRadius;
                    clickedOnTower.cost += mergingTowerStats.cost;
                    clickedOnTower.color = blendColors(clickedOnTower.color, TOWER_TYPES.NAT.color);
                    merged = true;
                }
            } else if ((['FORT', 'PIN_HEART', 'ORBIT'].includes(clickedOnTower.type)) && (['PIN', 'CASTLE'].includes(towerToPlaceType))) {
                const mergingTowerStats = TOWER_TYPES[towerToPlaceType];
                if (clickedOnTower.level !== 'MAX LEVEL' && clickedOnTower.level < 5) {
                     const diminishingFactor = 0.15;
                     const levelModifier = typeof clickedOnTower.level === 'number' ? Math.pow(1 - diminishingFactor, clickedOnTower.level - 1) : 1;
                    
                    if (clickedOnTower.type === 'ORBIT') {
                        if (towerToPlaceType === 'PIN') {
                            clickedOnTower.damage += 2 * levelModifier; // More significant damage boost
                        } else if (towerToPlaceType === 'CASTLE') {
                            clickedOnTower.damage += 1 * levelModifier; // Slight damage boost
                            clickedOnTower.projectileSize += 1; // Increase projectile size
                        }
                    } else { // Generic logic for other hybrids
                        if (towerToPlaceType === 'PIN') {
                            clickedOnTower.damage += 0.5 * levelModifier;
                            clickedOnTower.permFireRate *= (1 - (0.05 * levelModifier));
                        } else if (towerToPlaceType === 'CASTLE') {
                            clickedOnTower.damage += 2 * levelModifier;
                            if (clickedOnTower.splashRadius) {
                                clickedOnTower.splashRadius += 5 * levelModifier;
                            }
                        }
                    }

                    clickedOnTower.level++;
                    if(clickedOnTower.damageLevel) clickedOnTower.damageLevel++;
                    clickedOnTower.cost += mergingTowerStats.cost;
                    clickedOnTower.color = blendColors(originalTowerColor, TOWER_TYPES[towerToPlaceType].color);
                    merged = true;
                }
            } else if (clickedOnTower.type === 'FIREPLACE' && (['PIN', 'CASTLE'].includes(towerToPlaceType))) {
                 const mergingTowerStats = TOWER_TYPES[towerToPlaceType];
                 if (clickedOnTower.level !== 'MAX LEVEL' && clickedOnTower.level < 3) { // Max level is 3
                    if (towerToPlaceType === 'CASTLE') {
                        // Merging a CASTLE increases splash radius
                        clickedOnTower.splashRadius += 10;
                    } else if (towerToPlaceType === 'PIN') {
                        // Merging a PIN increases burn DPS
                        clickedOnTower.burnDps += 1;
                    }
                    
                    clickedOnTower.level++;
                    clickedOnTower.cost += mergingTowerStats.cost;
                    clickedOnTower.color = blendColors(originalTowerColor, TOWER_TYPES[towerToPlaceType].color);
                    clickedOnTower.updateStats(); 
                    // Force-reset damage to its base value after update to prevent any increase.
                    clickedOnTower.damage = TOWER_TYPES.FIREPLACE.damage;
                    merged = true;
                }
            }
            
            if (clickedOnTower.type === 'FIREPLACE' && clickedOnTower.level === 3) {
                clickedOnTower.level = 'MAX LEVEL';
            } else if (clickedOnTower.type !== 'FIREPLACE' && clickedOnTower.level === 5) {
                clickedOnTower.level = 'MAX LEVEL';
                if(clickedOnTower.damageLevel) clickedOnTower.damageLevel = 'MAX LEVEL';
            }

            if (merged) {
                gold -= TOWER_TYPES[towerToPlaceType].cost;
                window.gold = gold;
                placingTower = null;
                actionTaken = true;
                updateSellPanel(clickedOnTower); // Update panel to show new stats
            } else {
                // Merge failed (e.g., max level), so we cancel placement mode
                // and will fall through to select the tower instead.
                placingTower = null;
            }
        }
        // Case 3: Click is on a valid empty spot -> PLACE
        else { 
            towers.push(new Tower(snappedX, snappedY, placingTower));
            if (placingTower === 'SUPPORT' && !hasPlacedFirstSupport) {
                announcements.push(new TextAnnouncement("Support\nAgent\nis Online", canvasWidth / 2, 50, 180, undefined, canvasWidth));
                hasPlacedFirstSupport = true;
            }
            placementGrid[gridY][gridX] = GRID_TOWER;
            gold -= TOWER_TYPES[placingTower].cost;
            window.gold = gold;
            placingTower = null;
            actionTaken = true;
        }

        if (!placingTower) {
            updateUI({ lives, gold, wave });
            uiElements.buyPinBtn.classList.remove('selected');
            uiElements.buyCastleBtn.classList.remove('selected');
            uiElements.buySupportBtn.classList.remove('selected');
        }
    }

    if (!actionTaken) {
        selectedTower = towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            return tGridX === gridX && tGridY === gridY;
        }) || null;
        updateSellPanel(selectedTower);
    }
});


canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Scale mouse coordinates to match canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mouse.x = mouseX * scaleX;
    mouse.y = mouseY * scaleY;
});

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;

    // Scale mouse coordinates to match canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return { 
        x: mouseX * scaleX, 
        y: mouseY * scaleY
    };
}

// This function initializes or resets the game to its starting state.
function init() {
    lives = 20;
    gold = 100;
    window.gold = gold; // Sync the global gold variable
    wave = 0;
    enemies = [];
    towers = [];
    projectiles = [];
    effects = [];
    // We reset the announcements and the set of seen enemies for the new game.
    announcements = [];
    introducedEnemies.clear();
    hasPlacedFirstSupport = false; // Reset for the new game.
    waveInProgress = false;
    placingTower = null;
    gameOver = false;
    selectedTower = null;
    gameSpeed = 1;
    uiElements.speedToggleBtn.textContent = 'x1';
    
    uiElements.buyPinBtn.classList.remove('selected');
    uiElements.buyCastleBtn.classList.remove('selected');
    uiElements.buySupportBtn.classList.remove('selected');
    uiElements.startWaveBtn.disabled = false;
    uiElements.gameOverModal.classList.add('hidden');

    updateUI({ lives, gold, wave });
    updateSellPanel(null);
    
    // Set the fixed, internal resolution of the game canvas.
    // This will NOT change, ensuring the grid size is always the same.
    canvas.width = GRID_COLS * TILE_SIZE;
    canvas.height = GRID_ROWS * TILE_SIZE;
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;

    // Generate the game path and grid based on the fixed dimensions.
    const pathData = generatePath(); // No longer needs width/height arguments.
    path = pathData.path;
    placementGrid = pathData.placementGrid;
    
    // Call resizeCanvas to scale the canvas element to fit the window.
    resizeCanvas();
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

// This makes sure the game resizes correctly when the browser window changes size.
window.addEventListener('resize', resizeCanvas);

// THIS IS THE FIX: Wait for the custom fonts (for icons) to be loaded before starting the game.
// This prevents the game from trying to draw icons before they are available, which causes them to show up as text.
document.fonts.ready.then(() => {
    init(); // Start the game!
});
