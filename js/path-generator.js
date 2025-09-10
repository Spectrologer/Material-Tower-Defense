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
    let pathInGridCoords = [];
    // Start with a grid that's completely empty.
    let placementGrid = Array(rows).fill(null).map(() => Array(cols).fill(GRID_EMPTY));

    const selectedLayout = generateFixedPortraitLayout(cols, rows);

    // Convert the layout coordinates into path points.
    selectedLayout.forEach(coord => {
        const [gridX, gridY] = coord;
        if (pathInGridCoords.length === 0 || pathInGridCoords[pathInGridCoords.length - 1].x !== gridX || pathInGridCoords[pathInGridCoords.length - 1].y !== gridY) {
            pathInGridCoords.push({ x: gridX, y: gridY });
        }
    });

    // --- Create Detour Path ---
    const y1 = Math.floor(rows * 0.20);
    const y2 = Math.floor(rows * 0.5);
    const x1 = Math.floor(cols * 0.2); // Use x1 for the detour path location
    let detourPathInGridCoords = [];
    for (let y = y1; y <= y2; y++) {
        detourPathInGridCoords.push({ x: x1, y });
    }

    // --- Create Combined Path with Detour ---
    const detourStartIndex = pathInGridCoords.findIndex(p => p.x === x1 && p.y === y1);
    const rejoinPoint = { x: x1, y: y2 };
    // Find where the detour would rejoin the main path's horizontal segment.
    const detourRejoinIndexOnMain = pathInGridCoords.findIndex(p => p.y === rejoinPoint.y && p.x === rejoinPoint.x);


    let pathWithDetourInGridCoords = [];
    if (detourStartIndex !== -1 && detourRejoinIndexOnMain !== -1) {
        // Part 1: Main path up to the detour start.
        pathWithDetourInGridCoords.push(...pathInGridCoords.slice(0, detourStartIndex));
        // Part 2: The detour itself.
        pathWithDetourInGridCoords.push(...detourPathInGridCoords);
        // Part 3: Main path from where detour rejoins.
        pathWithDetourInGridCoords.push(...pathInGridCoords.slice(detourRejoinIndexOnMain + 1));

    } else {
        // Fallback if detour points aren't on the path for some reason
        pathWithDetourInGridCoords = [...pathInGridCoords];
    }


    // --- Mark paths on grid and convert all paths to pixel coordinates ---
    const convertToPixels = (gridPath) => {
        return gridPath.map(gridPos => ({
            x: gridPos.x * TILE_SIZE + TILE_SIZE / 2,
            y: gridPos.y * TILE_SIZE + TILE_SIZE / 2
        }));
    };

    // Mark detour path on grid so you can't build on it.
    for (const gridPos of detourPathInGridCoords) {
        if (gridPos.x >= 0 && gridPos.x < cols && gridPos.y >= 0 && gridPos.y < rows) {
            placementGrid[gridPos.y][gridPos.x] = GRID_PATH;
        }
    }
    // Mark main path on grid. This will correctly overwrite any detour tiles
    // that overlap with the main path, ensuring consistent path marking.
    for (const gridPos of pathInGridCoords) {
        if (gridPos.x >= 0 && gridPos.x < cols && gridPos.y >= 0 && gridPos.y < rows) {
            placementGrid[gridPos.y][gridPos.x] = GRID_PATH;
        }
    }

    const path = convertToPixels(pathInGridCoords);
    const detourPath = convertToPixels(detourPathInGridCoords);
    const pathWithDetour = convertToPixels(pathWithDetourInGridCoords);

    return { path, placementGrid, detourPath, pathWithDetour };
}
