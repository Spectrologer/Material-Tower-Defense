import { TILE_SIZE, GRID_EMPTY, GRID_PATH, GRID_COLS, GRID_ROWS } from './constants.js';

// Define a single, fixed layout generator for a portrait view.
const generateFixedPortraitLayout = (cols, rows) => {
    const p = [];
    // Define turning points based on percentages of the grid dimensions
    const y1 = Math.max(1, Math.floor(rows * 0.20));
    const y2 = Math.max(y1 + 2, Math.floor(rows * 0.5));
    const y3 = Math.max(y2 + 2, Math.floor(rows * 0.80));
    const x1 = Math.max(1, Math.floor(cols * 0.2));
    const x2 = Math.max(x1 + 1, Math.floor(cols * 0.8));

    // Create the path shape
    for (let x = 0; x <= x2; x++) p.push([x, y1]);
    for (let y = y1; y <= y2; y++) p.push([x2, y]);
    for (let x = x2; x >= x1; x--) p.push([x, y2]);
    for (let y = y2; y <= y3; y++) p.push([x1, y]);
    for (let x = x1; x < cols; x++) p.push([x, y3]);

    return p;
};

export function generatePath() {
    const cols = GRID_COLS;
    const rows = GRID_ROWS;
    
    let path = [];
    let placementGrid = Array(rows).fill(null).map(() => Array(cols).fill(GRID_EMPTY));

    // Generate the fixed layout
    const selectedLayout = generateFixedPortraitLayout(cols, rows);

    selectedLayout.forEach(coord => {
        const [gridX, gridY] = coord;
        // De-duplicate points to create a clean path array of grid coordinates
        if (path.length === 0 || path[path.length - 1].x !== gridX || path[path.length - 1].y !== gridY) {
             path.push({ x: gridX, y: gridY });
        }
    });
    
    // Convert grid coords to pixel coords and populate placement grid
    for(let i=0; i<path.length; i++) {
        const gridPos = path[i];
        if (gridPos.x >= 0 && gridPos.x < cols && gridPos.y >= 0 && gridPos.y < rows) {
            placementGrid[gridPos.y][gridPos.x] = GRID_PATH;
        }
        path[i] = { x: gridPos.x * TILE_SIZE + TILE_SIZE / 2, y: gridPos.y * TILE_SIZE + TILE_SIZE / 2 };
    }

    // Return the single path and grid, layoutIndex is no longer needed
    return { path, placementGrid };
}