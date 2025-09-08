import { TILE_SIZE, GRID_EMPTY, TOWER_TYPES, ENEMY_TYPES } from './constants.js';

export function drawPlacementGrid(ctx, canvasWidth, canvasHeight, placementGrid, mouse) {
    const cols = Math.floor(canvasWidth / TILE_SIZE);
    const rows = Math.floor(canvasHeight / TILE_SIZE);
    ctx.save();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const gridType = placementGrid[y][x];
            if (gridType === GRID_EMPTY) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
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

export function drawPath(ctx, canvasWidth, path, mazeColor) {
    ctx.strokeStyle = '#748275ff';
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

export function drawMergeTooltip(ctx, mergeTooltip, canvasWidth) {
    if (!mergeTooltip.show || !mergeTooltip.info) return;

    ctx.save();

    const info = mergeTooltip.info;
    const padding = 8;
    const iconSize = 24;
    const iconPadding = 5;

    ctx.font = "14px 'Press Start 2P'";
    const resultTextMetrics = ctx.measureText(info.text);
    let totalContentWidth = 0;

    const resultIconInfo = getTowerIconInfo(info.resultType);
    totalContentWidth += iconSize + iconPadding + resultTextMetrics.width;

    let upgradeTextMetrics = { width: 0 };
    if (info.upgrade) {
        upgradeTextMetrics = ctx.measureText(info.upgrade.text);
        totalContentWidth += iconSize + iconPadding + upgradeTextMetrics.width;
        totalContentWidth += 10;
    }

    const rectWidth = totalContentWidth + padding * 2;
    const rectHeight = iconSize + padding * 2;

    let rectX = mergeTooltip.x + 20;
    let rectY = mergeTooltip.y - rectHeight - 10;
    if (rectX + rectWidth > canvasWidth) rectX = canvasWidth - rectWidth - 5;
    if (rectY < 5) rectY = mergeTooltip.y + 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(rectX, rectY, rectWidth, rectHeight);
    ctx.fill();
    ctx.stroke();

    let currentX = rectX + padding;
    const contentY = rectY + padding + (rectHeight - padding * 2) / 2;

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

    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(info.text, currentX, contentY);
    currentX += resultTextMetrics.width + 10;

    if (info.upgrade) {
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

export function drawEnemyInfoPanel(ctx, enemy, canvasWidth) {
    ctx.save();
    const enemyType = enemy.type;
    const name = enemy.typeName ? enemy.typeName.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';

    const stats = [
        { icon: 'favorite', text: `${enemy.health.toFixed(0)}/${enemy.maxHealth}`, color: '#ef4444' },
        { icon: 'speed', text: `${enemyType.speed}`, color: '#38bdf8' },
        { icon: 'paid', text: `${enemyType.gold}`, color: '#facc15' }
    ];

    const padding = 8;
    const lineHeight = 18;
    const iconSize = 12;
    const iconPadding = 4;

    // Measure name width with its own font size first
    ctx.font = "12px 'Press Start 2P'";
    const nameMetrics = ctx.measureText(name);

    // Then measure stats width with their font size
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

    // Ensure panel stays on screen
    if (rectX + rectWidth > canvasWidth) {
        rectX = enemy.x - enemy.size - 10 - rectWidth;
    }
    if (rectY < 5) rectY = 5;
    if (rectY + rectHeight > ctx.canvas.height) rectY = ctx.canvas.height - rectHeight - 5;


    // Draw panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeStyle = enemyType.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(rectX, rectY, rectWidth, rectHeight);
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Draw Name
    ctx.fillStyle = enemyType.color;
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillText(name, rectX + padding, rectY + padding);

    // Draw Stats
    stats.forEach((stat, index) => {
        const statY = rectY + padding + (lineHeight * 1.5) + (index * lineHeight);

        // Draw Icon
        ctx.font = `${iconSize}px 'Material Symbols Outlined'`;
        ctx.fillStyle = stat.color;
        ctx.fillText(stat.icon, rectX + padding, statY);

        // Draw Text
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText(stat.text, rectX + padding + iconSize + iconPadding, statY);
    });

    ctx.restore();
}


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
        default:
            icon = 'help';
            break;
    }
    return { icon, className };
}
