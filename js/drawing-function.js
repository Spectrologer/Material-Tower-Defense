// This file contains functions for drawing things onto the game canvas.

import { TILE_SIZE, GRID_EMPTY, TOWER_TYPES } from './constants.js';

// Draws the grid lines on the board to show where you can place towers.
export function drawPlacementGrid(ctx, canvasWidth, canvasHeight, placementGrid, mouse) {
    const cols = Math.floor(canvasWidth / TILE_SIZE);
    const rows = Math.floor(canvasHeight / TILE_SIZE);
    ctx.save();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;

    // Loop through every square on the grid.
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const gridType = placementGrid[y][x];
            // If the spot is empty, give it a faint white background.
            if (gridType === GRID_EMPTY) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
            // Draw the grid lines for every square.
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    // Highlight the square your mouse is currently hovering over.
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

// Draws the path that enemies will follow.
export function drawPath(ctx, canvasWidth, path, mazeColor) {
    // This draws the darker border of the path.
    ctx.strokeStyle = '#acacacff';
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

    // This draws the main, lighter part of the path on top.
    ctx.strokeStyle = mazeColor;
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

// New function to draw a temporary path.
export function drawUpcomingPath(ctx, path) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = TILE_SIZE - 20;
    ctx.setLineDash([5, 5]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    // It's a vertical line from the top path segment to the bottom path segment.
    ctx.moveTo(path[4].x, path[4].y - TILE_SIZE / 2);
    ctx.lineTo(path[4].x, path[4].y + TILE_SIZE);
    ctx.lineTo(path[4].x + TILE_SIZE * 2, path[4].y + TILE_SIZE);
    ctx.lineTo(path[4].x + TILE_SIZE * 2, path[4].y - TILE_SIZE / 2);
    ctx.stroke();
    ctx.restore();
}

// Draws the detour path as a solid segment.
export function drawDetourPath(ctx, path, mazeColor) {
    if (!path || path.length < 1) return;
    ctx.save();

    // This draws the darker border of the path.
    ctx.strokeStyle = '#7c7c7cff'; // Darker border for detour
    ctx.lineWidth = TILE_SIZE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    // This draws the main, lighter part of the path on top.
    ctx.strokeStyle = mazeColor;
    ctx.lineWidth = TILE_SIZE - 10;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    ctx.restore();
}


// Draws the little pop-up tooltip that appears when you hover over a tower to merge it.
export function drawMergeTooltip(ctx, mergeTooltip, canvasWidth) {
    if (!mergeTooltip.show || !mergeTooltip.info) return;

    ctx.save();

    const info = mergeTooltip.info;
    const isDiscovered = info.isDiscovered;
    const padding = 8;
    const iconSize = 24;
    const iconPadding = 5;

    // Figure out how wide the tooltip needs to be based on its text and icons.
    const resultText = isDiscovered ? info.text : '???';
    ctx.font = "14px 'Press Start 2P'";
    const resultTextMetrics = ctx.measureText(resultText);
    let totalContentWidth = 0;

    totalContentWidth += iconSize + iconPadding + resultTextMetrics.width;

    let upgradeTextMetrics = { width: 0 };
    if (isDiscovered && info.upgrade) {
        upgradeTextMetrics = ctx.measureText(info.upgrade.text);
        totalContentWidth += iconSize + iconPadding + upgradeTextMetrics.width;
        totalContentWidth += 10;
    }

    const rectWidth = totalContentWidth + padding * 2;
    const rectHeight = iconSize + padding * 2;

    // Make sure the tooltip doesn't go off the edge of the screen.
    let rectX = mergeTooltip.x + 20;
    let rectY = mergeTooltip.y - rectHeight - 10;
    if (rectX + rectWidth > canvasWidth) rectX = canvasWidth - rectWidth - 5;
    if (rectY < 5) rectY = mergeTooltip.y + 20;

    // Draw the tooltip box.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(rectX, rectY, rectWidth, rectHeight);
    ctx.fill();
    ctx.stroke();

    // Draw the contents (icons and text) inside the tooltip.
    let currentX = rectX + padding;
    const contentY = rectY + padding + (rectHeight - padding * 2) / 2;

    if (isDiscovered) {
        const resultIconInfo = getTowerIconInfo(info.resultType);
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
        }
    } else {
        ctx.font = `400 ${iconSize}px 'Material Symbols Outlined'`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('question_mark', currentX, contentY);
    }
    currentX += iconSize + iconPadding;

    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(resultText, currentX, contentY);
    currentX += resultTextMetrics.width + 10;

    if (isDiscovered && info.upgrade) {
        let fontWeight = '400', fontFamily = "'Material Icons'", iconToDraw = info.upgrade.icon;
        if (info.upgrade.family === 'material-symbols-outlined') {
            fontFamily = "'Material Symbols Outlined'";
        }
        ctx.font = `${fontWeight} ${iconSize - 4}px ${fontFamily}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(iconToDraw, currentX, contentY);
        currentX += (iconSize - 4) + iconPadding;

        ctx.font = "14px 'Press Start 2P'";
        ctx.fillStyle = '#00ff88';
        ctx.fillText(info.upgrade.text, currentX, contentY);
    }

    ctx.restore();
}

// Draws the info panel that shows an enemy's stats when you click on it.
export function drawEnemyInfoPanel(ctx, enemy, canvasWidth) {
    ctx.save();
    const enemyType = enemy.type;
    const name = enemy.typeName ? enemy.typeName.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';

    const stats = [
        { icon: 'favorite', text: `${enemy.health.toFixed(0)}/${enemy.maxHealth}`, color: '#ef4444' },
        { icon: 'speed', text: `${enemyType.speed}`, color: '#4ade80' },
        { icon: 'paid', text: `${enemyType.gold}`, color: '#facc15' }
    ];

    const padding = 8;
    const lineHeight = 18;
    const iconSize = 12;
    const iconPadding = 4;

    // Figure out the panel's size based on the text length.
    ctx.font = "12px 'Press Start 2P'";
    const nameMetrics = ctx.measureText(name);
    ctx.font = "10px 'Press Start 2P'";
    let maxStatWidth = 0;
    stats.forEach(stat => {
        const metrics = ctx.measureText(stat.text);
        const totalWidth = iconSize + iconPadding + metrics.width;
        if (totalWidth > maxStatWidth) {
            maxStatWidth = totalWidth;
        }
    });

    const rectWidth = Math.max(nameMetrics.width, maxStatWidth) + padding * 2;
    const rectHeight = (stats.length + 1.5) * lineHeight + padding * 2;

    let rectX = enemy.x + enemy.size + 10;
    let rectY = enemy.y - rectHeight / 2;

    // Make sure the panel doesn't go off-screen.
    if (rectX + rectWidth > canvasWidth) {
        rectX = enemy.x - enemy.size - 10 - rectWidth;
    }
    if (rectY < 5) rectY = 5;
    if (rectY + rectHeight > ctx.canvas.height) rectY = ctx.canvas.height - rectHeight - 5;


    // Draw the panel background.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeStyle = enemyType.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(rectX, rectY, rectWidth, rectHeight);
    ctx.fill();
    ctx.stroke();

    // Draw the enemy's name and stats.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = enemyType.color;
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillText(name, rectX + padding, rectY + padding);

    stats.forEach((stat, index) => {
        const statY = rectY + padding + (lineHeight * 1.5) + (index * lineHeight);
        ctx.font = `${iconSize}px 'Material Symbols Outlined'`;
        ctx.fillStyle = stat.color;
        ctx.fillText(stat.icon, rectX + padding, statY);
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText(stat.text, rectX + padding + iconSize + iconPadding, statY);
    });

    ctx.restore();
}


// A helper function to get the right icon name and font for a tower type.
export function getTowerIconInfo(type) {
    let icon;
    let className = 'material-icons';
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
            icon = 'ent';
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
        case 'NINE_PIN':
            icon = 'move_item';
            className = "material-symbols-outlined";
            break;
        case 'ANTI_AIR':
            icon = 'open_jam';
            className = "material-symbols-outlined";
            break;
        default:
            icon = 'help';
            break;
    }
    return { icon, className };
}
