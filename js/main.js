// This file is the "brain" of the game. It sets everything up and runs the main game loop.

// Imports: Pulling in all the different parts of the game from other files.
import { TOWER_TYPES, ENEMY_TYPES, TILE_SIZE, GRID_EMPTY, GRID_TOWER, GRID_COLS, GRID_ROWS } from './constants.js';
import { generatePath } from './path-generator.js';
// We now import the new TextAnnouncement class as well.
import { Enemy, Tower, Projectile, Effect, TextAnnouncement } from './game-entities.js';
import { uiElements, updateUI, updateSellPanel, triggerGameOver, showMergeConfirmation } from './ui-manager.js';

// Setting up the drawing area (the canvas).
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const tooltipElement = document.getElementById('tooltip');

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
    const volume = 0.05; // Reduced initial volume
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01); 

    // Schedule a smooth fade-out.
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    // Start the sound and stop it shortly after.
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

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
// New variables for the Cloud Inventory feature
let isCloudUnlocked = false;
let cloudInventory = [];
let placingFromCloud = null; // Stores the tower object being placed from the cloud
let draggedCloudTower = null; // Stores the tower object being dragged from the cloud
let draggedCanvasTower = null; // New variable to store the tower dragged from the canvas
let draggedCanvasTowerOriginalGridPos = {x: -1, y: -1}; // Stores the original position of the dragged tower
// New variables for the merge preview tooltip
let mergeTooltip = { show: false, x: 0, y: 0, info: null };
let longPressTimer = null;
const LONG_PRESS_DURATION = 500; // 500 milliseconds for a long press

// Global console function to add gold
window.addGold = (amount) => {
    const parsedAmount = parseInt(amount, 10);
    if (!isNaN(parsedAmount) && parsedAmount > 0) {
        gold += parsedAmount;
        updateUI({ lives, gold, wave, isCloudUnlocked });
        announcements.push(new TextAnnouncement(`+${parsedAmount}G`, canvasWidth / 2, 80, 180, undefined, canvasWidth));
        console.log(`Added ${parsedAmount} gold.`);
    } else {
        console.error("Invalid amount. Please provide a positive number.");
    }
};

// This function scales the canvas display size to fit its container.
function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    // GUARD CLAUSE: If canvas resolution hasn't been set yet, don't try to resize.
    if (!canvas.width || !canvas.height) return;
    
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

// Gets the correct icon string and the class needed to display it.
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

// Renders the towers currently stored in the cloud inventory.
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

        towerRep.draggable = true; // Make the tower icon draggable
        
        const levelDisplay = tower.level === 'MAX LEVEL' ? 'MAX' : tower.level;

        let iconEl;
        if (towerIconInfo.className.startsWith('fa-')) {
            // Font Awesome uses <i> tags with full class names
            iconEl = `<i class="${towerIconInfo.className} fa-${towerIconInfo.icon}" style="font-size: 24px; color: #1a1a1a;"></i>`;
        } else {
            // Material Icons use <span> tags with the icon name as content
            iconEl = `<span class="${towerIconInfo.className}" style="font-size: 28px; color: #1a1a1a; font-variation-settings: 'FILL' 1;">${towerIconInfo.icon}</span>`;
        }

        towerRep.innerHTML = `
            ${iconEl}
            <span class="absolute bottom-0 right-1 text-xs font-bold text-black" style="text-shadow: 0 0 2px white, 0 0 2px white;">${levelDisplay}</span>
        `;
        
        towerRep.addEventListener('click', () => handleCloudTowerClick(tower));
        
        // Event listeners for drag and drop functionality
        towerRep.addEventListener('dragstart', (e) => {
            draggedCloudTower = tower;
            e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'cloud', towerId: tower.id }));
            // A slight delay ensures the drag image is created before the original is hidden
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

// This function creates a new wave of enemies.
function spawnWave() {
    // wave variable now represents completed waves. The next wave is wave + 1.
    waveInProgress = true;
    updateUI({ lives, gold, wave: wave + 1, isCloudUnlocked }); // Show the user the wave they are starting
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
        // Only reset stats for attack towers
        if (!['SUPPORT', 'ENT', 'CAT'].includes(tower.type)) {
            tower.fireRate = tower.permFireRate;
            tower.damageMultiplier = 1; // Reset damage multiplier
            tower.goldBonusMultiplier = 1; // Reset gold bonus
        }
    });
    
    enemies.forEach(enemy => {
        enemy.slowMultiplier = 1;
    });

    // Apply effects from aura towers.
    towers.forEach(auraTower => {
        if (['SUPPORT', 'ENT', 'CAT'].includes(auraTower.type)) {
            towers.forEach(targetTower => {
                // Aura towers don't buff other aura towers
                if (!['SUPPORT', 'ENT', 'CAT'].includes(targetTower.type)) {
                    const dist = Math.hypot(auraTower.x - targetTower.x, auraTower.y - targetTower.y);
                    if (dist <= auraTower.range) {
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
            // Also apply slow effects to enemies if the ENT/CAT tower is in slow mode
            if (['ENT', 'CAT'].includes(auraTower.type) && auraTower.mode === 'slow') {
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
    if (!targetEnemy || typeof targetEnemy.takeDamage !== 'function') {
        return;
    }
    
    // Calculate final damage with multipliers
    const finalDamage = projectile.owner.damage * projectile.owner.damageMultiplier;
    const goldMultiplier = projectile.owner.goldBonusMultiplier || 1;

    const awardGold = (enemy) => {
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

// The main loop that runs continuously to update and draw the game.
function gameLoop() {
    if(gameOver) return;

    for (let i = 0; i < gameSpeed; i++) {
        applyAuraEffects();
        
        const onEnemyDeath = (enemy) => {
            // Gold is now handled in handleProjectileHit, so this is just for sound
            playMoneySound();
        };

        towers.forEach(tower => tower.update(enemies, projectiles, onEnemyDeath));
        
        projectiles = projectiles.filter(p => p.update(handleProjectileHit, enemies));
        
        enemies = enemies.filter(enemy => enemy.update(
            () => { // This happens when an enemy reaches the end of the path.
                lives--;
                updateUI({ lives, gold, wave, isCloudUnlocked });
                if (lives <= 0) {
                    gameOver = true;
                    triggerGameOver(false, wave);
                }
            },
            () => { // onDeath callback from enemy (e.g. from burn damage)
                playMoneySound();
            } 
        ));
        
        effects = effects.filter(effect => effect.update());
        announcements = announcements.filter(announcement => announcement.update());
        
        if(waveInProgress && enemies.length === 0){
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

            updateUI({ lives, gold, wave, isCloudUnlocked });
        }
    }
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawPath();

    if (placingTower) {
        drawPlacementGrid();
    }

    towers.forEach(tower => tower.draw(ctx));
    
    if (selectedTower) {
        selectedTower.drawRange(ctx);
        if(['SUPPORT', 'ENT', 'CAT'].includes(selectedTower.type)) selectedTower.drawBuffEffect(ctx);
    }

    projectiles.forEach(p => p.draw(ctx));
    effects.forEach(effect => effect.draw(ctx));
    enemies.forEach(enemy => enemy.draw(ctx));
    announcements.forEach(announcement => announcement.draw(ctx));
    
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
            ctx.arc(snappedX, snappedY, TILE_SIZE/2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw merge tooltip last so it's on top
    drawMergeTooltip(ctx);

    animationFrameId = requestAnimationFrame(gameLoop);
}

// Draws the grid of dots where you can place towers.
function drawPlacementGrid() {
    const cols = Math.floor(canvasWidth / TILE_SIZE);
    const rows = Math.floor(canvasHeight / TILE_SIZE);
    ctx.save();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const gridType = placementGrid[y][x];
            // Draw a semi-transparent square to denote the tile.
            if (gridType === GRID_EMPTY) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
            // Draw a more defined border for empty spots and path to distinguish them
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
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
        // Cancel any cloud placement if a new tower is selected.
        if (placingFromCloud) {
            placingFromCloud = null;
            renderCloudInventory();
        }
        placingTower = (placingTower === towerType) ? null : towerType;
        selectedTower = null;
        updateSellPanel(null, isCloudUnlocked);
        uiElements.buyPinBtn.classList.toggle('selected', placingTower === 'PIN');
        uiElements.buyCastleBtn.classList.toggle('selected', placingTower === 'CASTLE');
        uiElements.buySupportBtn.classList.toggle('selected', placingTower === 'SUPPORT');
    }
}

// Handles clicking a tower in the cloud inventory to start placing it.
function handleCloudTowerClick(towerToPlace) {
    if (placingTower) { // If already placing something, cancel it first.
        placingTower = null;
        placingFromCloud = null;
        // Deselect buy buttons if any were active
        document.querySelectorAll('.tower-button.selected').forEach(btn => btn.classList.remove('selected'));
    }
    placingFromCloud = towerToPlace;
    placingTower = towerToPlace.type; // Used for the visual preview
    selectedTower = null;
    updateSellPanel(null, isCloudUnlocked);
    renderCloudInventory(); // Re-render to show which tower is selected
}

// The new, refactored function to handle all merge and upgrade logic.
function performMerge(clickedOnTower, mergingTowerType, costToAdd) {
    let merged = false;
    const originalTowerColor = clickedOnTower.color;
    // Capture the level of the tower on the grid before any changes.
    const existingTowerLevel = clickedOnTower.level === 'MAX LEVEL' ? 5 : clickedOnTower.level;
    
    // This block handles all merge combinations
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

// Determines the outcome of a merge without actually performing it.
function getMergeResultInfo(existingTower, placingType) {
    const existingType = existingTower.type;
    let result = { text: null, resultType: null, upgrade: null };

    // New tower creation
    if ((existingType === 'SUPPORT' && placingType === 'SUPPORT')) { result.resultType = 'ENT'; }
    else if ((existingType === 'ENT' && placingType === 'SUPPORT') || (existingType === 'SUPPORT' && placingType === 'ENT')) { result.resultType = 'CAT'; }
    else if ((existingType === 'PIN' && placingType === 'PIN')) { result.resultType = 'NAT'; }
    else if ((existingType === 'CASTLE' && placingType === 'CASTLE')) { result.resultType = 'ORBIT'; }
    else if ((existingType === 'SUPPORT' && placingType === 'PIN') || (existingType === 'PIN' && placingType === 'SUPPORT')) { result.resultType = 'PIN_HEART'; }
    else if ((existingType === 'SUPPORT' && placingType === 'CASTLE') || (existingType === 'CASTLE' && placingType === 'SUPPORT')) { result.resultType = 'FIREPLACE'; }
    else if ((existingType === 'PIN' && placingType === 'CASTLE') || (existingType === 'CASTLE' && placingType === 'PIN')) { result.resultType = 'FORT'; }
    
    // Same-type level up
    else if (existingType === placingType && existingTower.level !== 'MAX LEVEL' && existingTower.level < 5) {
        result.resultType = existingType;
        result.text = `${existingType} LVL ${existingTower.level + 1}`;
    }
    
    // Hybrid upgrades
    else if (existingTower.level !== 'MAX LEVEL') {
        if (existingType === 'NAT' && existingTower.level < 5) {
            if (placingType === 'CASTLE') result.upgrade = { text: '+ Proj', icon: 'multiple_stop', family: 'material-symbols-outlined' };
            else if (placingType === 'PIN') result.upgrade = { text: '+ Dmg', icon: 'bolt', family: 'material-icons' };
        } else if (['FORT', 'PIN_HEART'].includes(existingType) && existingTower.level < 5) {
            if (placingType === 'PIN') result.upgrade = { text: '+ Dmg/Spd', icon: 'bolt', family: 'material-icons' }; // Simplified for tooltip
            else if (placingType === 'CASTLE') result.upgrade = { text: '+ Dmg/Spl', icon: 'bolt', family: 'material-icons' };
        } else if (existingType === 'ORBIT' && existingTower.level < 5) {
            if (placingType === 'PIN') result.upgrade = { text: '+ Dmg', icon: 'bolt', family: 'material-icons' };
            else if (placingType === 'CASTLE') result.upgrade = { text: '+ Dmg/Size', icon: 'bolt', family: 'material-icons' };
        } else if (existingType === 'FIREPLACE' && existingTower.level < 3) {
            if (placingType === 'CASTLE') result.upgrade = { text: '+ Splash', icon: 'bubble_chart', family: 'material-icons' };
            else if (placingType === 'PIN') result.upgrade = { text: '+ Burn', icon: 'local_fire_department', family: 'material-symbols-outlined' };
        }

        if(result.upgrade){
            result.resultType = existingType;
            result.text = `Upgrade`;
        }
    }
    
    if (!result.text && result.resultType) {
        result.text = result.resultType.replace('_', ' ');
    }

    return (result.text && result.resultType) ? result : null;
}


// Draws the merge preview tooltip on the canvas.
function drawMergeTooltip(ctx) {
    if (!mergeTooltip.show || !mergeTooltip.info) return;

    ctx.save();
    
    const info = mergeTooltip.info;
    const padding = 8;
    const iconSize = 24;
    const iconPadding = 5;
    
    // --- Measure all components first ---
    ctx.font = "14px 'Press Start 2P'";
    const resultTextMetrics = ctx.measureText(info.text);
    let totalContentWidth = 0;
    
    // Main result icon + text
    const resultIconInfo = getTowerIconInfo(info.resultType);
    totalContentWidth += iconSize + iconPadding + resultTextMetrics.width;
    
    // Upgrade icon + text (if it exists)
    let upgradeTextMetrics = { width: 0 };
    if (info.upgrade) {
        upgradeTextMetrics = ctx.measureText(info.upgrade.text);
        totalContentWidth += iconSize + iconPadding + upgradeTextMetrics.width;
        totalContentWidth += 10; // Extra padding between result and upgrade
    }

    const rectWidth = totalContentWidth + padding * 2;
    const rectHeight = iconSize + padding * 2;

    // --- Position the tooltip ---
    let rectX = mergeTooltip.x + 20;
    let rectY = mergeTooltip.y - rectHeight - 10;
    if (rectX + rectWidth > canvasWidth) rectX = canvasWidth - rectWidth - 5;
    if (rectY < 5) rectY = mergeTooltip.y + 20;

    // --- Draw background ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(rectX, rectY, rectWidth, rectHeight);
    ctx.fill();
    ctx.stroke();

    // --- Draw content ---
    let currentX = rectX + padding;
    const contentY = rectY + padding + (rectHeight - padding * 2) / 2;

    // 1. Draw Result Icon
    if (resultIconInfo && resultIconInfo.icon) {
        let fontWeight = '400', fontFamily = "'Material Icons'", iconToDraw = resultIconInfo.icon;
        if (resultIconInfo.className.startsWith('fa-')) {
            fontWeight = '900'; fontFamily = '"Font Awesome 6 Free"';
            if (info.resultType === 'CAT') iconToDraw = '\uf6be';
        } else if (resultIconInfo.className === 'material-symbols-outlined') {
            fontFamily = "'Material Symbols Outlined'";
        }
        ctx.font = `${fontWeight} ${iconSize}px ${fontFamily}`;
        ctx.fillStyle = TOWER_TYPES[info.resultType]?.color || '#FFFFFF';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(iconToDraw, currentX, contentY);
        currentX += iconSize + iconPadding;
    }

    // 2. Draw Result Text
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(info.text, currentX, contentY);
    currentX += resultTextMetrics.width + 10;

    // 3. Draw Upgrade Info (if it exists)
    if (info.upgrade) {
        // 3a. Draw Upgrade Icon
        let fontWeight = '400', fontFamily = "'Material Icons'", iconToDraw = info.upgrade.icon;
        if (info.upgrade.family === 'material-symbols-outlined') {
             fontFamily = "'Material Symbols Outlined'";
        }
        ctx.font = `${fontWeight} ${iconSize-4}px ${fontFamily}`; // Slightly smaller icon
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(iconToDraw, currentX, contentY);
        currentX += (iconSize-4) + iconPadding;

        // 3b. Draw Upgrade Text
        ctx.font = "14px 'Press Start 2P'";
        ctx.fillStyle = '#00ff88';
        ctx.fillText(info.upgrade.text, currentX, contentY);
    }
    
    ctx.restore();
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

uiElements.cloudButton.addEventListener('click', () => {
    if (!isCloudUnlocked) {
        if (gold >= 100) {
            gold -= 100;
            isCloudUnlocked = true;
            uiElements.cloudInventoryPanel.classList.remove('hidden');
            uiElements.cloudButton.disabled = false;
            updateUI({ lives, gold, wave, isCloudUnlocked });
            resizeCanvas();
        }
    } else {
        uiElements.cloudInventoryPanel.classList.toggle('hidden');
        resizeCanvas();
    }
});

// Listener for the "Sell" button in the selected tower panel.
uiElements.sellTowerBtn.addEventListener('click', () => {
    if (selectedTower) {
        const gridX = Math.floor(selectedTower.x / TILE_SIZE);
        const gridY = Math.floor(selectedTower.y / TILE_SIZE);
        placementGrid[gridY][gridX] = GRID_EMPTY;

        gold += Math.floor(selectedTower.cost * 0.5);
        towers = towers.filter(t => t.id !== selectedTower.id);
        selectedTower = null;
        updateUI({ lives, gold, wave, isCloudUnlocked });
        updateSellPanel(null, isCloudUnlocked);
    }
});

// Listener for the "Move to Cloud" button in the selected tower panel.
uiElements.moveToCloudBtn.addEventListener('click', () => {
    if (selectedTower) {
        const gridX = Math.floor(selectedTower.x / TILE_SIZE);
        const gridY = Math.floor(selectedTower.y / TILE_SIZE);
        placementGrid[gridY][gridX] = GRID_EMPTY;

        cloudInventory.push(selectedTower);
        towers = towers.filter(t => t.id !== selectedTower.id);
        renderCloudInventory();

        selectedTower = null;
        updateSellPanel(null, isCloudUnlocked);
    }
});


uiElements.toggleModeBtn.addEventListener('click', () => {
    if (selectedTower && (selectedTower.type === 'ENT' || selectedTower.type === 'CAT')) {
        selectedTower.mode = (selectedTower.mode === 'boost') ? 'slow' : 'boost';
    } else if (selectedTower && selectedTower.type === 'ORBIT') {
        selectedTower.orbitMode = (selectedTower.orbitMode === 'far') ? 'near' : 'far';
    }
    updateSellPanel(selectedTower, isCloudUnlocked);
});

// Handles the final step of a merge after the confirmation modal.
uiElements.confirmMergeBtn.addEventListener('click', () => {
    const mergeState = uiElements.mergeConfirmModal.mergeState;
    if (!mergeState) return;
    
    const existingTower = mergeState.existingTower;
    const mergingTower = mergeState.mergingTower;
    const mergingFromCloud = mergeState.placingFromCloud;
    const mergingFromCanvas = mergeState.mergingFromCanvas;
    
    // Perform the merge based on the saved state
    if (performMerge(existingTower, mergingTower.type, mergingTower.cost)) {
        if (mergingFromCloud) {
            cloudInventory = cloudInventory.filter(t => t.id !== mergingTower.id);
        } else if (mergingFromCanvas) {
             towers = towers.filter(t => t.id !== mergingTower.id);
             placementGrid[Math.floor(mergingTower.y / TILE_SIZE)][Math.floor(mergingTower.x / TILE_SIZE)] = GRID_EMPTY;
        } else {
             gold -= mergingTower.cost;
        }
        selectedTower = null;
        updateUI({ lives, gold, wave, isCloudUnlocked });
        updateSellPanel(null, isCloudUnlocked);
    }
    uiElements.mergeConfirmModal.classList.add('hidden');
    renderCloudInventory();
});

uiElements.cancelMergeBtn.addEventListener('click', () => {
    uiElements.mergeConfirmModal.classList.add('hidden');
    // If a tower was dragged from the canvas for a merge, we need to put it back.
    const mergeState = uiElements.mergeConfirmModal.mergeState;
    if(mergeState && mergeState.mergingFromCanvas) {
        const tower = mergeState.mergingTower;
        // Find the tower in the original array and reset its position
        const originalTower = towers.find(t => t.id === tower.id);
        if(originalTower) {
            originalTower.x = mergeState.originalPosition.x * TILE_SIZE + TILE_SIZE / 2;
            originalTower.y = mergeState.originalPosition.y * TILE_SIZE + TILE_SIZE / 2;
            placementGrid[mergeState.originalPosition.y][mergeState.originalPosition.x] = GRID_TOWER;
        }
    }
});


function handleCanvasAction(e) {
    const mousePos = getMousePos(canvas, e);
    const gridX = Math.floor(mousePos.x / TILE_SIZE);
    const gridY = Math.floor(mousePos.y / TILE_SIZE);
    const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;

    let actionTaken = false;

    // Check if the user is in a placing state, which could be from a button or a cloud tap
    const isPlacingMode = placingTower || placingFromCloud;

    if (isPlacingMode) {
        const towerToPlaceType = placingTower;
        let mergingTower = null;
        let mergingFromCloud = false;
        let mergingFromCanvas = false;
        let costOfPlacingTower;
        
        if(placingFromCloud) {
            mergingTower = placingFromCloud;
            mergingFromCloud = true;
            costOfPlacingTower = mergingTower.cost;
        } else if (draggedCanvasTower) {
            mergingTower = draggedCanvasTower;
            mergingFromCanvas = true;
            costOfPlacingTower = mergingTower.cost;
        } else {
            costOfPlacingTower = TOWER_TYPES[towerToPlaceType].cost;
            mergingTower = {type: towerToPlaceType, cost: costOfPlacingTower, id: crypto.randomUUID()}; // Create a temporary object for the new tower
        }
        
        if (gold < costOfPlacingTower && !mergingFromCloud && !mergingFromCanvas) return;

        const clickedOnTower = towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            return tGridX === gridX && tGridY === gridY;
        });

        const mergeInfo = clickedOnTower ? getMergeResultInfo(clickedOnTower, mergingTower.type) : null;

        if(mergeInfo) {
            // Found a merge target, show the confirmation modal
            const mergeState = {
                existingTower: clickedOnTower,
                mergingTower: mergingTower,
                placingTowerType: mergingTower.type,
                mergeInfo: mergeInfo,
                placingFromCloud: mergingFromCloud,
                mergingFromCanvas: mergingFromCanvas,
                originalPosition: draggedCanvasTowerOriginalGridPos // Save original position for a canvas-to-canvas move
            };
            uiElements.mergeConfirmModal.mergeState = mergeState;
            showMergeConfirmation(mergeState);
            
            // Cancel placement mode
            placingTower = null;
            placingFromCloud = null;
            draggedCloudTower = null;
            
            actionTaken = true;

        } else if (isValidPlacement(snappedX, snappedY)) {
            // No merge, just a regular placement
            towers.push(new Tower(snappedX, snappedY, mergingTower.type));
            
            // Set the new tower's properties if it came from the cloud or was a drag from canvas
            const newTower = towers[towers.length - 1];
            if(mergingFromCloud || mergingFromCanvas) {
                Object.assign(newTower, mergingTower);
                newTower.x = snappedX;
                newTower.y = snappedY;
                if(mergingFromCloud) {
                    cloudInventory = cloudInventory.filter(t => t.id !== mergingTower.id);
                    renderCloudInventory();
                } else if (mergingFromCanvas) {
                     towers = towers.filter(t => t.id !== mergingTower.id);
                     placementGrid[draggedCanvasTowerOriginalGridPos.y][draggedCanvasTowerOriginalGridPos.x] = GRID_EMPTY;
                     towers.push(newTower);
                }
            } else {
                gold -= costOfPlacingTower;
            }

            if (newTower.type === 'SUPPORT' && !hasPlacedFirstSupport) {
                announcements.push(new TextAnnouncement("Support\nAgent\nis Online", canvasWidth / 2, 50, 180, undefined, canvasWidth));
                hasPlacedFirstSupport = true;
            }
            placementGrid[gridY][gridX] = GRID_TOWER;
            placingTower = null;
            placingFromCloud = null;
            actionTaken = true;
        } else {
            // Clicked on an invalid spot (not a tower, not an empty spot) -> CANCEL
            placingTower = null;
            placingFromCloud = null;
            actionTaken = true;
        }
    } else {
        // Not in placing mode, so select a tower or deselect it
        selectedTower = towers.find(t => {
            const tGridX = Math.floor(t.x / TILE_SIZE);
            const tGridY = Math.floor(t.y / TILE_SIZE);
            return tGridX === gridX && tGridY === gridY;
        }) || null;
        actionTaken = true;
    }

    if (!isPlacingMode) {
         // Reset state after a successful action.
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

    // Scale mouse coordinates to match canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mouse.x = mouseX * scaleX;
    mouse.y = mouseY * scaleY;

    // Logic for merge tooltip on hover
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

// Drag and Drop listeners for the canvas
canvas.addEventListener('dragover', e => {
    e.preventDefault(); // This is necessary to allow a drop
    if (draggedCloudTower) {
        const mousePos = getMousePos(canvas, e);
        mouse.x = mousePos.x;
        mouse.y = mousePos.y;
        placingTower = draggedCloudTower.type; // Use placingTower for visual preview
    } else if (draggedCanvasTower) {
        // Allow dropping a tower from the field back onto the field.
        const mousePos = getMousePos(canvas, e);
        mouse.x = mousePos.x;
        mouse.y = mousePos.y;
        placingTower = draggedCanvasTower.type;
    }
});

canvas.addEventListener('dragleave', () => {
    placingTower = null; // Clear preview when dragging off canvas
});

// Dragstart listener on the canvas for dragging towers from the field.
canvas.addEventListener('dragstart', (e) => {
    document.body.classList.add('is-dragging');

    const mousePos = getMousePos(canvas, e);
    const gridX = Math.floor(mousePos.x / TILE_SIZE);
    const gridY = Math.floor(mousePos.y / TILE_SIZE);
    
    // Only allow dragging a tower if Cloud is unlocked and a tower exists at the grid position.
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
        draggedCanvasTowerOriginalGridPos = {x: gridX, y: gridY};
        e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'canvas', towerId: towerToDrag.id }));
        
        // This is a common pattern to create a simple drag image from the canvas context
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

        e.dataTransfer.setDragImage(tempCanvas, TILE_SIZE/2, TILE_SIZE/2);
    } else {
        // Prevent drag operation if no tower is selected.
        e.preventDefault();
        document.body.classList.remove('is-dragging');
    }
});

// Add dragend listener to remove the class from the body
canvas.addEventListener('dragend', () => {
    document.body.classList.remove('is-dragging');
});

// Drop listener for the cloud inventory panel
uiElements.cloudInventoryPanel.addEventListener('dragover', e => {
    e.preventDefault(); // This is crucial to allow a drop
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
                // Remove from canvas, add to cloud
                const gridX = Math.floor(towerToMove.x / TILE_SIZE);
                const gridY = Math.floor(towerToMove.y / TILE_SIZE);
                placementGrid[gridY][gridX] = GRID_EMPTY;
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
    
    // Get mouse position for placement
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
        // Case 1: Drop onto an existing tower for a merge
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
        // Case 2: Drop onto an empty spot
        else if (!targetTower && isValidPlacement(snappedX, snappedY)) {
            if (transferData.source === 'cloud') {
                sourceTower.x = snappedX;
                sourceTower.y = snappedY;
                towers.push(sourceTower);
                cloudInventory = cloudInventory.filter(t => t.id !== sourceTower.id);
            } else if (transferData.source === 'canvas') {
                // Move tower to new spot on canvas
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

    // Reset state variables
    placingTower = null;
    draggedCloudTower = null;
    draggedCanvasTower = null;
});

canvas.addEventListener('click', handleCanvasAction);

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Scale mouse coordinates to match canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mouse.x = mouseX * scaleX;
    mouse.y = mouseY * scaleY;

    // Logic for merge tooltip on hover
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

// Drag and Drop listeners for the canvas
canvas.addEventListener('dragover', e => {
    e.preventDefault(); // This is necessary to allow a drop
    if (draggedCloudTower) {
        const mousePos = getMousePos(canvas, e);
        mouse.x = mousePos.x;
        mouse.y = mousePos.y;
        placingTower = draggedCloudTower.type; // Use placingTower for visual preview
    } else if (draggedCanvasTower) {
        // Allow dropping a tower from the field back onto the field.
        const mousePos = getMousePos(canvas, e);
        mouse.x = mousePos.x;
        mouse.y = mousePos.y;
        placingTower = draggedCanvasTower.type;
    }
});

canvas.addEventListener('dragleave', () => {
    placingTower = null; // Clear preview when dragging off canvas
});

// Dragstart listener on the canvas for dragging towers from the field.
canvas.addEventListener('dragstart', (e) => {
    document.body.classList.add('is-dragging');

    const mousePos = getMousePos(canvas, e);
    const gridX = Math.floor(mousePos.x / TILE_SIZE);
    const gridY = Math.floor(mousePos.y / TILE_SIZE);
    
    // Only allow dragging a tower if Cloud is unlocked and a tower exists at the grid position.
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
        draggedCanvasTowerOriginalGridPos = {x: gridX, y: gridY};
        e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'canvas', towerId: towerToDrag.id }));
        
        // This is a common pattern to create a simple drag image from the canvas context
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

        e.dataTransfer.setDragImage(tempCanvas, TILE_SIZE/2, TILE_SIZE/2);
    } else {
        // Prevent drag operation if no tower is selected.
        e.preventDefault();
        document.body.classList.remove('is-dragging');
    }
});

// Add dragend listener to remove the class from the body
canvas.addEventListener('dragend', () => {
    document.body.classList.remove('is-dragging');
});

// Drop listener for the cloud inventory panel
uiElements.cloudInventoryPanel.addEventListener('dragover', e => {
    e.preventDefault(); // This is crucial to allow a drop
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
                // Remove from canvas, add to cloud
                const gridX = Math.floor(towerToMove.x / TILE_SIZE);
                const gridY = Math.floor(towerToMove.y / TILE_SIZE);
                placementGrid[gridY][gridX] = GRID_EMPTY;
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
    
    // Get mouse position for placement
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
        // Case 1: Drop onto an existing tower for a merge
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
        // Case 2: Drop onto an empty spot
        else if (!targetTower && isValidPlacement(snappedX, snappedY)) {
            if (transferData.source === 'cloud') {
                sourceTower.x = snappedX;
                sourceTower.y = snappedY;
                towers.push(sourceTower);
                cloudInventory = cloudInventory.filter(t => t.id !== sourceTower.id);
            } else if (transferData.source === 'canvas') {
                // Move tower to new spot on canvas
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

    // Reset state variables
    placingTower = null;
    draggedCloudTower = null;
    draggedCanvasTower = null;
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
    wave = 0;
    enemies = [];
    towers = [];
    projectiles = [];
    effects = [];
    announcements = [];
    introducedEnemies.clear();
    hasPlacedFirstSupport = false; // Reset for the new game.
    waveInProgress = false;
    placingTower = null;
    gameOver = false;
    selectedTower = null;
    gameSpeed = 1;
    // Reset cloud variables
    isCloudUnlocked = false;
    cloudInventory = [];
    placingFromCloud = null;
    draggedCloudTower = null;
    draggedCanvasTower = null; // Reset this variable on init
    draggedCanvasTowerOriginalGridPos = {x: -1, y: -1};
    mergeTooltip.show = false; // Reset tooltip state
    mergeTooltip.info = null;

    uiElements.speedToggleBtn.textContent = 'x1';
    
    uiElements.buyPinBtn.classList.remove('selected');
    uiElements.buyCastleBtn.classList.remove('selected');
    uiElements.buySupportBtn.classList.remove('selected');
    uiElements.startWaveBtn.disabled = false;
    uiElements.gameOverModal.classList.add('hidden');
    // Hide the cloud panel on reset
    uiElements.cloudInventoryPanel.classList.add('hidden');
    renderCloudInventory(); // Clear the inventory display

    updateUI({ lives, gold, wave, isCloudUnlocked });
    updateSellPanel(null, isCloudUnlocked);
    
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
