// This file is responsible for creating the path that enemies follow across the screen.

import { TILE_SIZE, GRID_EMPTY, GRID_PATH, GRID_COLS, GRID_ROWS } from './constants.js';

// This function creates a fixed S-shaped path layout.
const generateFixedPortraitLayout = (cols, rows) => {
    const p = [];
    const y1 = Math.floor(rows * 0.20);
    const y2 = Math.floor(rows * 0.5);
    const y3 = Math.floor(rows * 0.80);
    const x1 = Math.floor(cols * 0.2);
    const x2 = Math.floor(cols * 0.8);

    // Creates the path segment by segment.
    for (let x = 0; x <= x2; x++) p.push([x, y1]);
    for (let y = y1; y <= y2; y++) p.push([x2, y]);
    for (let x = x2; x >= x1; x--) p.push([x, y2]);
    for (let y = y2; y <= y3; y++) p.push([x1, y]);
    for (let x = x1; x < cols; x++) p.push([x, y3]);

    return p;
};

// This is the main function that generates the path and the placement grid for the game.
export function generatePath() {
    const cols = GRID_COLS;
    const rows = GRID_ROWS;
    let path = [];
    // Start with a grid that's completely empty.
    let placementGrid = Array(rows).fill(null).map(() => Array(cols).fill(GRID_EMPTY));

    const selectedLayout = generateFixedPortraitLayout(cols, rows);

    // Convert the layout coordinates into path points.
    selectedLayout.forEach(coord => {
        const [gridX, gridY] = coord;
        if (path.length === 0 || path[path.length - 1].x !== gridX || path[path.length - 1].y !== gridY) {
            path.push({ x: gridX, y: gridY });
        }
    });

    // Mark the path squares on the placement grid so you can't build there.
    for (let i = 0; i < path.length; i++) {
        const gridPos = path[i];
        if (gridPos.x >= 0 && gridPos.x < cols && gridPos.y >= 0 && gridPos.y < rows) {
            placementGrid[gridPos.y][gridPos.x] = GRID_PATH;
        }
        // Convert grid coordinates (like 1, 2) to pixel coordinates (like 60, 100).
        path[i] = { x: gridPos.x * TILE_SIZE + TILE_SIZE / 2, y: gridPos.y * TILE_SIZE + TILE_SIZE / 2 };
    }

    return { path, placementGrid };
}
