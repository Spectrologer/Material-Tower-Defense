// This file is the "brain" of the game. It sets everything up and runs the main game loop.

// Imports: Pulling in all the different parts of the game from other files.
import { TOWER_TYPES, ENEMY_TYPES, TILE_SIZE, GRID_EMPTY, GRID_TOWER } from './constants.js';
import { generatePath } from './path-generator.js';
// We now import the new TextAnnouncement class as well.
import { Enemy, Tower, Projectile, Effect, TextAnnouncement } from './game-entities.js';
import { uiElements, updateUI, updateSellPanel, triggerGameOver } from './ui-manager.js';

// Setting up the drawing area (the canvas).
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// A variable to hold the canvas's width and height.
let canvasWidth, canvasHeight;
let lastCanvasWidth = 0; // Used to track canvas resizing.

// Game State: These variables keep track of everything happening in the game.
let lives, gold, wave;
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


// This function resizes the canvas to fit the screen, especially for mobile.
function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    const aspectRatio = 9 / 16; // Portrait aspect ratio

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

    // Set the display size of the canvas
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;

    // Center the canvas within the container
    canvas.style.left = `${(availableWidth - newWidth) / 2}px`;
    canvas.style.top = `${(availableHeight - newHeight) / 2}px`;


    // ONLY update the internal resolution and regenerate the path
    // if the actual canvas width has changed. This prevents vertical
    // resizing from breaking the game by resetting the maze.
    if (lastCanvasWidth === 0) {
        canvas.width = newWidth;
        canvas.height = newHeight;

        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        lastCanvasWidth = canvasWidth; // Store the new width

        // Generates the maze path based on the new canvas size.
        const pathData = generatePath(canvasWidth, canvasHeight);
        path = pathData.path;
        placementGrid = pathData.placementGrid;
    }
}

// This function creates a new wave of enemies.
function spawnWave() {
    wave++;
    waveInProgress = true;
    updateUI({ lives, gold, wave });
    uiElements.startWaveBtn.disabled = true;

    // This logic creates special "swarm" waves every 4th wave.
    const isSwarmWave = wave > 0 && wave % 4 === 0;

    const enemyCount = isSwarmWave ? 15 + wave * 5 : 5 + wave * 3;
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
            if (wave >= 4 && rand < 0.2) { // 20% chance for Flying from wave 4
                enemyType = ENEMY_TYPES.FLYING;
            } else if (wave >= 6 && rand < 0.4) { // 20% chance for Heavy from wave 6 (rand is 0.2-0.4)
                enemyType = ENEMY_TYPES.HEAVY;
            } else if (wave >= 3 && rand < 0.7) { // 30% chance for Fast from wave 3 (rand is 0.4-0.7)
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
            announcements.push(new TextAnnouncement(`New Enemy: ${displayName}`, canvasWidth / 2, 50, 180));
        }
        
        const healthMultiplier = 1 + (wave - 1) * 0.15;
        // Swarm enemies get less of a health boost in later waves to keep them weak.
        const finalHealth = isSwarmWave ? enemyType.health * (1 + (wave - 1) * 0.05) : enemyType.health * healthMultiplier;
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

    // Apply speed boosts from Support towers.
    const supportTowers = towers.filter(t => t.type === 'SUPPORT');
    const attackingTowers = towers.filter(t => t.type !== 'SUPPORT' && t.type !== 'ENT');
    supportTowers.forEach(supportTower => {
        attackingTowers.forEach(attackTower => {
            const dist = Math.hypot(supportTower.x - attackTower.x, supportTower.y - attackTower.y);
            if (dist <= supportTower.range) {
                attackTower.fireRate *= supportTower.attackSpeedBoost; 
            }
        });
    });

    // Apply effects from Ent towers.
    const entTowers = towers.filter(t => t.type === 'ENT');
    entTowers.forEach(entTower => {
        if (entTower.mode === 'boost') {
             attackingTowers.forEach(attackTower => {
                const dist = Math.hypot(entTower.x - attackTower.x, entTower.y - attackTower.y);
                if (dist <= entTower.range) {
                    // Corrected logic: We want to multiply the fire rate by the boost value, not set it with Math.min().
                    attackTower.fireRate *= entTower.attackSpeedBoost;
                    attackTower.damageMultiplier = Math.max(attackTower.damageMultiplier, entTower.damageBoost);
                }
            });
        } else if (entTower.mode === 'slow') {
            enemies.forEach(enemy => {
                const dist = Math.hypot(entTower.x - enemy.x, entTower.y - enemy.y);
                if (dist <= entTower.range) {
                    // Apply the strongest slow effect, non-stacking.
                    enemy.slowMultiplier = Math.min(enemy.slowMultiplier, entTower.enemySlow);
                }
            });
        }
    });
}

// This function is called when a projectile hits an enemy.
function handleProjectileHit(projectile) {
    // Calculate final damage with multipliers
    const finalDamage = projectile.owner.damage * projectile.owner.damageMultiplier;

    if (projectile.owner.type === 'FIREPLACE') {
        effects.push(new Effect(projectile.target.x, projectile.target.y, 'local_fire_department', projectile.owner.splashRadius * 2, projectile.owner.projectileColor, 20));
        enemies.forEach(enemy => {
            if (Math.hypot(projectile.target.x - enemy.x, projectile.target.y - enemy.y) <= projectile.owner.splashRadius) {
                if (enemy.takeDamage(finalDamage)) {
                     gold += enemy.gold;
                }
                enemy.applyBurn(projectile.owner.burnDps, projectile.owner.burnDuration);
            }
        });
    } else if (projectile.owner.splashRadius > 0) {
        effects.push(new Effect(projectile.target.x, projectile.target.y, 'explosion', projectile.owner.splashRadius * 2, projectile.owner.projectileColor, 20));
        enemies.forEach(enemy => {
            if (Math.hypot(projectile.target.x - enemy.x, projectile.target.y - enemy.y) <= projectile.owner.splashRadius) {
                if (enemy.takeDamage(finalDamage)) {
                    gold += enemy.gold;
                }
            }
        });
    } else {
         if (projectile.target.takeDamage(finalDamage)) {
            gold += projectile.target.gold;
         }
    }
    updateUI({ lives, gold, wave });
}

// The main loop that runs continuously to update and draw the game.
function gameLoop() {
    if(gameOver) return;

    for (let i = 0; i < gameSpeed; i++) {
        applyAuraEffects(); // Now handling both boosts and slows
        towers.forEach(tower => tower.update(enemies, projectiles));
        
        projectiles = projectiles.filter(p => p.update(handleProjectileHit));
        
        enemies = enemies.filter(enemy => enemy.update(
            () => { // This happens when an enemy reaches the end of the path.
                lives--;
                updateUI({ lives, gold, wave });
                if (lives <= 0) {
                    gameOver = true;
                    triggerGameOver(false, wave);
                }
            },
            () => {} 
        ));
        
        effects = effects.filter(effect => effect.update());
        // We also update any active text announcements.
        announcements = announcements.filter(announcement => announcement.update());
        
        // Checks if the wave is over.
        if(waveInProgress && enemies.length === 0){
            waveInProgress = false;
            uiElements.startWaveBtn.disabled = false;
            gold += 25 + wave * 2;
            updateUI({ lives, gold, wave });
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
    if (placementGrid[mouseGridY] && placementGrid[mouseGridX] === GRID_EMPTY) {
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

uiElements.sellTowerBtn.addEventListener('click', () => {
    if (selectedTower) {
        const gridX = Math.floor(selectedTower.x / TILE_SIZE);
        const gridY = Math.floor(selectedTower.y / TILE_SIZE);
        placementGrid[gridY][gridX] = GRID_EMPTY;

        gold += Math.floor(selectedTower.cost * 0.5);
        towers = towers.filter(t => t !== selectedTower);
        selectedTower = null;
        updateUI({ lives, gold, wave });
        updateSellPanel(null);
    }
});

uiElements.toggleModeBtn.addEventListener('click', () => {
    if (selectedTower && selectedTower.type === 'ENT') {
        selectedTower.mode = (selectedTower.mode === 'boost') ? 'slow' : 'boost';
        updateSellPanel(selectedTower);
    }
});

canvas.addEventListener('click', (e) => {
    const mousePos = getMousePos(canvas, e);
    const gridX = Math.floor(mousePos.x / TILE_SIZE);
    const gridY = Math.floor(mousePos.y / TILE_SIZE);
    const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;

    if (placingTower) {
        const towerToPlaceType = placingTower;
        if (gold < TOWER_TYPES[towerToPlaceType].cost) return;

        let clickedOnTower = towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            return tGridX === gridX && tGridY === gridY;
        });

        // This is the logic for merging towers together.
        if (clickedOnTower && clickedOnTower.level !== 'MAX LEVEL') {
            let merged = false;
            // The rate at which bonuses decrease. A higher value means faster falloff.
            const diminishingFactor = 0.15; 
            const levelModifier = Math.pow(1 - diminishingFactor, clickedOnTower.level - 1);

            if (clickedOnTower.type === 'SUPPORT' && towerToPlaceType === 'SUPPORT') {
                clickedOnTower.type = 'ENT';
                clickedOnTower.level = 'MAX LEVEL';
                clickedOnTower.cost = TOWER_TYPES['SUPPORT'].cost + TOWER_TYPES['SUPPORT'].cost;
                clickedOnTower.updateStats();
                merged = true;
            } else if (clickedOnTower.type === 'PIN' && towerToPlaceType === 'PIN') {
                 clickedOnTower.type = 'NAT';
                 clickedOnTower.level = 1;
                 clickedOnTower.cost += TOWER_TYPES['PIN'].cost;
                 clickedOnTower.updateStats();
                 merged = true;
            } else if (clickedOnTower.type === towerToPlaceType) {
                clickedOnTower.level++;
                clickedOnTower.updateStats();
                merged = true;
            } else if ((clickedOnTower.type === 'SUPPORT' && towerToPlaceType === 'PIN') || (clickedOnTower.type === 'PIN' && towerToPlaceType === 'SUPPORT')) {
                clickedOnTower.type = 'PIN_HEART';
                clickedOnTower.level = 1;
                clickedOnTower.cost = TOWER_TYPES['SUPPORT'].cost + TOWER_TYPES['PIN'].cost;
                clickedOnTower.updateStats();
                merged = true;
            } else if ((clickedOnTower.type === 'SUPPORT' && towerToPlaceType === 'CASTLE') || (clickedOnTower.type === 'CASTLE' && towerToPlaceType === 'SUPPORT')) {
                clickedOnTower.type = 'FIREPLACE';
                clickedOnTower.level = 1;
                clickedOnTower.cost = TOWER_TYPES['SUPPORT'].cost + TOWER_TYPES['CASTLE'].cost;
                clickedOnTower.updateStats();
                merged = true;
            } else if ((clickedOnTower.type === 'PIN' && towerToPlaceType === 'CASTLE') || (clickedOnTower.type === 'CASTLE' && towerToPlaceType === 'PIN')) {
                clickedOnTower.type = 'FORT';
                clickedOnTower.level = 1;
                clickedOnTower.cost += TOWER_TYPES[towerToPlaceType].cost;
                clickedOnTower.updateStats();
                merged = true;
            } else if ((clickedOnTower.type === 'FORT' || clickedOnTower.type === 'PIN_HEART' || clickedOnTower.type === 'FIREPLACE' || clickedOnTower.type === 'NAT') && (towerToPlaceType === 'PIN' || towerToPlaceType === 'CASTLE')) {
                const mergingTowerStats = TOWER_TYPES[towerToPlaceType];
                if (towerToPlaceType === 'PIN') {
                    clickedOnTower.damage += 0.5 * levelModifier;
                    clickedOnTower.permFireRate *= (1 - (0.05 * levelModifier)); // 5% speed boost with falloff
                } else if (towerToPlaceType === 'CASTLE') {
                    clickedOnTower.damage += 2 * levelModifier;
                    clickedOnTower.range += 10 * levelModifier;
                    if (clickedOnTower.splashRadius) {
                        clickedOnTower.splashRadius += 5 * levelModifier;
                    }
                }
                clickedOnTower.cost += mergingTowerStats.cost;
                updateSellPanel(clickedOnTower);
                merged = true;
            } else if ((clickedOnTower.type === 'SUPPORT' || clickedOnTower.type === 'ENT') && (towerToPlaceType === 'PIN' || towerToPlaceType === 'CASTLE')) {
                 const mergingTowerStats = TOWER_TYPES[towerToPlaceType];
                if (towerToPlaceType === 'PIN') {
                   clickedOnTower.range += 10 * levelModifier;
                   clickedOnTower.attackSpeedBoost *= (1 - (0.02 * levelModifier)); // 2% better boost with falloff
                } else if (towerToPlaceType === 'CASTLE') {
                    clickedOnTower.range += 25 * levelModifier;
                    clickedOnTower.attackSpeedBoost *= (1 - (0.05 * levelModifier)); // 5% better boost with falloff
                }
                clickedOnTower.cost += mergingTowerStats.cost;
                clickedOnTower.updateStats();
                updateSellPanel(clickedOnTower);
                merged = true;
            }

            if (merged) {
                gold -= TOWER_TYPES[towerToPlaceType].cost;
                placingTower = null; 
            }
        } else { // This is for placing a new tower on an empty spot.
            if (isValidPlacement(snappedX, snappedY)) {
                towers.push(new Tower(snappedX, snappedY, placingTower));
                
                // Check for the first support tower placement.
                if (placingTower === 'SUPPORT' && !hasPlacedFirstSupport) {
                    announcements.push(new TextAnnouncement("Support Agent is online.", canvasWidth / 2, 50, 180));
                    hasPlacedFirstSupport = true;
                }

                placementGrid[gridY][gridX] = GRID_TOWER;
                gold -= TOWER_TYPES[placingTower].cost;
                placingTower = null;
            }
        }

        if (!placingTower) { // Resets the UI after you place or merge a tower.
            updateUI({ lives, gold, wave });
            uiElements.buyPinBtn.classList.remove('selected');
            uiElements.buyCastleBtn.classList.remove('selected');
            uiElements.buySupportBtn.classList.remove('selected');
        }
    } else { // This handles selecting a tower that's already on the map.
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
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

// This function initializes or resets the game to its starting state.
function init() {
    lives = 20;
    gold = 100;
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
    lastCanvasWidth = 0; // Force path regeneration on new game
    uiElements.speedToggleBtn.textContent = 'x1';
    
    uiElements.buyPinBtn.classList.remove('selected');
    uiElements.buyCastleBtn.classList.remove('selected');
    uiElements.buySupportBtn.classList.remove('selected');
    uiElements.startWaveBtn.disabled = false;
    uiElements.gameOverModal.classList.add('hidden');

    updateUI({ lives, gold, wave });
    updateSellPanel(null);
    
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