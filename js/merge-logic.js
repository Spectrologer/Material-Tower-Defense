import { TOWER_TYPES } from './constants.js';
import { Projectile, Tower } from './game-entities.js';

/**
 * Blends two hexadecimal colors.
 * @param {string} colorA - The first color in hex format (e.g., '#RRGGBB').
 * @param {string} colorB - The second color in hex format.
 * @returns {string} The blended color in hex format.
 */
function blendColors(colorA, colorB) {
    const [rA, gA, bA] = colorA.match(/\w\w/g).map((c) => parseInt(c, 16));
    const [rB, gB, bB] = colorB.match(/\w\w/g).map((c) => parseInt(c, 16));
    const r = Math.round(rA * 0.5 + rB * 0.5).toString(16).padStart(2, '0');
    const g = Math.round(gA * 0.5 + gB * 0.5).toString(16).padStart(2, '0');
    const b = Math.round(bA * 0.5 + bB * 0.5).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * Creates a consistent, order-independent key for a pair of tower types.
 * @param {string} type1 - The type of the first tower.
 * @param {string} type2 - The type of the second tower.
 * @returns {string} A sorted and joined key (e.g., 'CASTLE+PIN').
 */
const createRecipeKey = (type1, type2) => [type1, type2].sort().join('+');

// The "recipe book" for all merge combinations.
const recipes = new Map();

/**
 * A helper function to add a new recipe to the map.
 * @param {string} type1 - The type of the first tower.
 * @param {string} type2 - The type of the second tower.
 * @param {object} outcome - An object describing the result of the merge.
 */
const addRecipe = (type1, type2, outcome) => {
    const key = createRecipeKey(type1, type2);
    recipes.set(key, outcome);
};

// --- TOWER TRANSFORMATION RECIPES ---
addRecipe('SUPPORT', 'SUPPORT', {
    resultType: 'ENT',
    apply: (tower) => {
        tower.type = 'ENT';
        tower.level = 1;
        tower.damageLevel = 1;
        tower.updateStats();
        tower.color = TOWER_TYPES.ENT.color;
    }
});

addRecipe('ENT', 'SUPPORT', {
    resultType: 'CAT',
    apply: (tower) => {
        tower.type = 'CAT';
        tower.level = 1;
        tower.damageLevel = 1;
        tower.updateStats();
        tower.color = TOWER_TYPES.CAT.color;
    }
});

addRecipe('SUPPORT', 'NAT', {
    resultType: 'ANTI_AIR',
    apply: (tower) => {
        const newLevel = tower.level;
        const newDamageMultiplier = tower.damageMultiplierFromMerge;
        // Check if the NAT tower had multiple projectiles (from Castle merges)
        const projectileCountBonus = tower.projectileCount > 1 ? (tower.projectileCount - 1) : 0;

        tower.type = 'ANTI_AIR';
        tower.level = newLevel;
        tower.damageLevel = newLevel;
        tower.projectileCount = 1;
        tower.damageMultiplierFromMerge = newDamageMultiplier;

        tower.natCastleBonus = projectileCountBonus;

        tower.updateStats();
        tower.color = TOWER_TYPES.ANTI_AIR.color;
    }
});

// This is the recipe to restore the original functionality.
addRecipe('PIN', 'PIN', {
    resultType: 'NAT',
    apply: (tower, { existingTowerLevel }) => {
        tower.type = 'NAT';
        tower.level = existingTowerLevel;
        tower.damageLevel = existingTowerLevel;
        tower.projectileCount = 1;
        tower.damageMultiplierFromMerge = 1;
        tower.updateStats();
        tower.splashRadius = TOWER_TYPES.NAT.splashRadius;
        tower.color = TOWER_TYPES.NAT.color;
    }
});


addRecipe('CASTLE', 'CASTLE', {
    resultType: 'ORBIT',
    apply: (tower, { existingTowerLevel }) => {
        tower.type = 'ORBIT';
        tower.orbitMode = 'far';
        tower.level = existingTowerLevel;
        tower.damageLevel = existingTowerLevel;
        tower.upgradeCount = 0; // Fix: Initialize upgrade count on merge.
        tower.updateStats();
        tower.splashRadius = TOWER_TYPES.ORBIT.splashRadius;
        tower.color = TOWER_TYPES.ORBIT.color;
        // Fix: Initialize the orbiters when the tower is created via merge.
        tower.orbiters = [
            new Projectile(tower, null, 0),
            new Projectile(tower, null, Math.PI)
        ];
    }
});

addRecipe('PIN', 'SUPPORT', {
    resultType: 'PIN_HEART',
    apply: (tower, { existingTowerLevel }) => {
        tower.type = 'PIN_HEART';
        tower.level = existingTowerLevel;
        tower.damageLevel = existingTowerLevel;
        tower.updateStats();
        tower.splashRadius = TOWER_TYPES.PIN_HEART.splashRadius;
        tower.color = TOWER_TYPES.PIN_HEART.color;
        tower.hasFragmentingShot = false;
        tower.fragmentBounces = 0;
        // The fix is here. Explicitly set and lock the targeting mode.
        tower.targetingMode = 'weakest';
    }
});

addRecipe('CASTLE', 'SUPPORT', {
    resultType: 'FIREPLACE',
    apply: (tower, { existingTowerLevel }) => {
        tower.type = 'FIREPLACE';
        tower.level = existingTowerLevel;
        tower.damageLevel = existingTowerLevel;
        tower.updateStats();
        tower.damage = TOWER_TYPES.FIREPLACE.damage;
        tower.splashRadius = TOWER_TYPES.FIREPLACE.splashRadius;
        tower.burnDps = TOWER_TYPES.FIREPLACE.burnDps;
        tower.burnDuration = TOWER_TYPES.FIREPLACE.burnDuration;
        tower.color = TOWER_TYPES.FIREPLACE.color;
    }
});

addRecipe('CASTLE', 'PIN', {
    resultType: 'FORT',
    apply: (tower, { existingTowerLevel }) => {
        tower.type = 'FORT';
        tower.level = 1;
        tower.damageLevel = 1;
        tower.updateStats();
        tower.splashRadius = TOWER_TYPES.FORT.splashRadius;
        tower.color = TOWER_TYPES.FORT.color;
    }
});


// --- TOWER UPGRADE RECIPES ---

addRecipe('NAT', 'CASTLE', {
    resultType: 'NAT', text: 'Upgrade',
    upgrade: { text: '+ Proj', icon: 'multiple_stop', family: 'material-symbols-outlined' },
    canApply: (tower) => tower.level < 5,
    apply: (tower) => {
        if (!tower.projectileCount) tower.projectileCount = 1;
        tower.level++;
        tower.projectileCount++;
        tower.updateStats();
        tower.color = blendColors(tower.color, TOWER_TYPES.CASTLE.color);
    }
});

addRecipe('NAT', 'PIN', {
    resultType: 'NAT', text: 'Upgrade',
    upgrade: { text: '+ Dmg', icon: 'bolt', family: 'material-icons' },
    canApply: (tower) => tower.level < 5,
    apply: (tower) => {
        if (tower.damageMultiplierFromMerge === undefined) tower.damageMultiplierFromMerge = 1;
        tower.level++;
        tower.damageLevel++;
        tower.damageMultiplierFromMerge *= 1.25;
        tower.updateStats();
        tower.color = blendColors(tower.color, TOWER_TYPES.PIN.color);
    }
});

// --- ANTI_AIR UPGRADES ---
addRecipe('ANTI_AIR', 'PIN', {
    resultType: 'ANTI_AIR', text: 'Upgrade',
    upgrade: { text: '+ Dmg', icon: 'bolt', family: 'material-icons' },
    canApply: (tower) => {
        // Prevent upgrading a level 5 NAT that was converted to AA
        if (tower.level === 5 && tower.damageLevel === 5) {
            return false;
        }
        return tower.level < TOWER_TYPES.ANTI_AIR.maxLevel;
    },
    apply: (tower) => {
        tower.level++;
        tower.damageLevel++;
        tower.damageMultiplierFromMerge = (tower.damageMultiplierFromMerge || 1) * 1.25;
        tower.updateStats();
        tower.color = blendColors(tower.color, TOWER_TYPES.PIN.color);
    }
});

addRecipe('ANTI_AIR', 'CASTLE', {
    resultType: 'ANTI_AIR', text: 'Upgrade',
    upgrade: { text: '+ Splash', icon: 'bubble_chart', family: 'material-icons' },
    canApply: (tower) => {
        // The splash radius is already determined by the NAT's previous upgrades.
        // Don't allow this merge if it was created from a level 5 NAT.
        if (tower.level === 5 && tower.damageLevel === 5) {
            return false;
        }
        return tower.level < TOWER_TYPES.ANTI_AIR.maxLevel;
    },
    apply: (tower) => {
        tower.level++;
        tower.updateStats();
        tower.color = blendColors(tower.color, TOWER_TYPES.CASTLE.color);
    }
});

// --- PIN_HEART UPGRADES ---
addRecipe('PIN_HEART', 'PIN', {
    resultType: 'PIN_HEART', text: 'Upgrade',
    upgrade: { text: '+ Dmg', icon: 'bolt', family: 'material-icons' },
    canApply: (tower) => tower.level < 5,
    apply: (tower) => {
        tower.level++;
        tower.damageLevel++;
        tower.damageMultiplierFromMerge = (tower.damageMultiplierFromMerge || 1) * 1.01;
        tower.updateStats();
        tower.color = blendColors(tower.color, TOWER_TYPES.PIN.color);
    }
});

addRecipe('PIN_HEART', 'CASTLE', {
    resultType: 'PIN_HEART', text: 'Upgrade',
    upgrade: { text: '+1 Frag', icon: 'call_split', family: 'material-icons' },
    canApply: (tower) => tower.level < 5,
    apply: (tower) => {
        tower.level++;
        if (!tower.hasFragmentingShot) {
            tower.hasFragmentingShot = true;
            tower.fragmentBounces = 2; // Initial unlock
        } else {
            tower.fragmentBounces++; // Add a bounce on subsequent upgrades
        }
        tower.updateStats();
        tower.color = blendColors(tower.color, TOWER_TYPES.CASTLE.color);
    }
});

// --- FORT UPGRADES ---
// Upgrade Fort with a Pin to increase its damage.
addRecipe('FORT', 'PIN', {
    resultType: 'FORT', text: 'Upgrade',
    upgrade: { text: '+ Dmg', icon: 'bolt', family: 'material-icons' },
    canApply: (tower) => {
        const visualLevel = (typeof tower.level === 'string' && tower.level === 'MAX LEVEL') ? 5 : (tower.level + tower.damageLevel - 1);
        return visualLevel < 5;
    },
    apply: (tower) => {
        tower.damageLevel++;
        tower.damageMultiplierFromMerge = (tower.damageMultiplierFromMerge || 1) * 1.1;
        tower.updateStats();
        tower.color = blendColors(tower.color, TOWER_TYPES.PIN.color);
    }
});

// Upgrade Fort with a Castle to increase its splash radius.
addRecipe('FORT', 'CASTLE', {
    resultType: 'FORT', text: 'Upgrade',
    upgrade: { text: '+ Splash', icon: 'bubble_chart', family: 'material-icons' },
    canApply: (tower) => {
        const visualLevel = (typeof tower.level === 'string' && tower.level === 'MAX LEVEL') ? 5 : (tower.level + tower.damageLevel - 1);
        return visualLevel < 5;
    },
    apply: (tower) => {
        tower.level++;
        tower.splashRadius += 10;
        tower.updateStats();
        tower.color = blendColors(tower.color, TOWER_TYPES.CASTLE.color);
    }
});


// --- ORBIT UPGRADES (FIXED) ---
const ORBIT_MAX_UPGRADES = 4;

addRecipe('ORBIT', 'PIN', {
    resultType: 'ORBIT', text: 'Upgrade',
    upgrade: { text: '+ Dmg', icon: 'bolt', family: 'material-icons' },
    canApply: (tower) => tower.upgradeCount < ORBIT_MAX_UPGRADES,
    apply: (tower) => {
        tower.damageLevel++;
        tower.upgradeCount++;
        tower.updateStats();
        tower.color = blendColors(tower.color, TOWER_TYPES.PIN.color);
    }
});

addRecipe('ORBIT', 'CASTLE', {
    resultType: 'ORBIT', text: 'Upgrade',
    upgrade: { text: '+ Orbiter', icon: 'satellite', family: 'material-symbols-outlined' },
    canApply: (tower) => tower.upgradeCount < ORBIT_MAX_UPGRADES,
    apply: (tower) => {
        tower.level++;
        tower.upgradeCount++;
        // Recalculate angles to space orbiters evenly
        const currentOrbiterCount = tower.orbiters.length;
        const newOrbiterCount = currentOrbiterCount + 1;
        const angleStep = (2 * Math.PI) / newOrbiterCount;
        for (let i = 0; i < currentOrbiterCount; i++) {
            tower.orbiters[i].angle = i * angleStep;
        }
        tower.orbiters.push(new Projectile(tower, null, currentOrbiterCount * angleStep));
        tower.updateStats();
        tower.color = blendColors(tower.color, TOWER_TYPES.CASTLE.color);
    }
});

addRecipe('FIREPLACE', 'CASTLE', {
    resultType: 'FIREPLACE', text: 'Upgrade',
    upgrade: { text: '+ Splash', icon: 'bubble_chart', family: 'material-icons' },
    canApply: (tower) => tower.level < 3,
    apply: (tower, { originalTowerColor, mergingTowerType }) => {
        tower.splashRadius += 10;
        tower.level++;
        tower.cost += tower.cost;
        tower.color = blendColors(originalTowerColor, TOWER_TYPES[mergingTowerType].color);
        tower.updateStats();
        tower.damage = TOWER_TYPES.FIREPLACE.damage;
    }
});

addRecipe('FIREPLACE', 'PIN', {
    resultType: 'FIREPLACE', text: 'Upgrade',
    upgrade: { text: '+ Burn', icon: 'local_fire_department', family: 'material-symbols-outlined' },
    canApply: (tower) => tower.level < 3,
    apply: (tower, { originalTowerColor, mergingTowerType }) => {
        tower.burnDps += 1;
        tower.level++;
        tower.cost += tower.cost;
        tower.color = blendColors(originalTowerColor, TOWER_TYPES[mergingTowerType].color);
        tower.updateStats();
        tower.damage = TOWER_TYPES.FIREPLACE.damage;
    }
});


/**
 * Determines the potential result of a merge for UI display.
 * @param {Tower} existingTower - The tower being merged onto.
 * @param {string} placingType - The type of the tower being placed/dragged.
 * @param {object} gameState - The current game state.
 * @returns {object|null} An object with info for the merge tooltip, or null if no merge is possible.
 */
export function getMergeResultInfo(existingTower, placingType, gameState) {
    if (existingTower.type === 'NINE_PIN' || placingType === 'NINE_PIN' || TOWER_TYPES[existingTower.type].unmergeable) {
        return null;
    }

    // Look up recipe in the map first for transformations
    const key = createRecipeKey(existingTower.type, placingType);
    const recipe = recipes.get(key);
    const isDiscovered = gameState.discoveredMerges.has(key);

    if (recipe) {
        if (recipe.canApply && !recipe.canApply(existingTower)) {
            return null;
        }
        return {
            resultType: recipe.resultType,
            text: recipe.text || recipe.resultType.replace('_', ' '),
            upgrade: recipe.upgrade,
            isDiscovered: isDiscovered
        };
    }

    // Fallback to same-type level up if no recipe is found
    if (existingTower.type === placingType && existingTower.level !== 'MAX LEVEL' && existingTower.level < 5) {
        return {
            resultType: existingTower.type,
            text: `${existingTower.type} LVL ${existingTower.level + 1}`,
            isDiscovered: true // Same-type level ups are always "discovered"
        };
    }

    return null;
}

/**
 * Applies a merge to a tower based on a recipe.
 * @param {Tower} tower - The base tower to modify.
 * @param {string} mergingTowerType - The type of the tower being merged with.
 * @param {number} costToAdd - The cost of the merging tower.
 * @param {object} gameState - The current game state.
 * @returns {boolean} True if a merge was successfully performed, false otherwise.
 */
export function performMerge(tower, mergingTowerType, costToAdd, gameState) {
    const originalTowerColor = tower.color;
    const existingTowerLevel = tower.level === 'MAX LEVEL' ? 5 : tower.level;

    // 1. Look up recipe first
    const key = createRecipeKey(tower.type, mergingTowerType);
    const recipe = recipes.get(key);

    if (recipe) {
        if (recipe.canApply && !recipe.canApply(tower)) {
            return false; // Condition not met for this upgrade
        }

        const oldCost = tower.cost;
        recipe.apply(tower, { existingTowerLevel, originalTowerColor, mergingTowerType });
        tower.cost = oldCost + costToAdd;

        const maxLevel = TOWER_TYPES[tower.type].maxLevel || 5;
        if (tower.type === 'ORBIT') {
            if (tower.upgradeCount === ORBIT_MAX_UPGRADES) {
                tower.level = 'MAX LEVEL';
            }
        } else if (tower.level === maxLevel) {
            tower.level = 'MAX LEVEL';
            if (tower.damageLevel) tower.damageLevel = 'MAX LEVEL';
        }

        // Fort-specific MAX LEVEL check
        if (tower.type === 'FORT') {
            const visualLevel = (typeof tower.level === 'string' && tower.level === 'MAX LEVEL') ? 5 : (tower.levelForCalc + tower.damageLevelForCalc - 1);
            if (visualLevel >= 5) {
                tower.level = 'MAX LEVEL';
            }
        }
        gameState.hasPerformedFirstMerge = true;
        gameState.discoveredMerges.add(key);
        gameState.discoveredTowerTypes.add(tower.type);
        return true;
    }

    // 2. If no specific recipe, handle same-type level up as a fallback
    if (tower.type === mergingTowerType && tower.level !== 'MAX LEVEL' && tower.level < 5) {
        tower.level++;
        if (tower.damageLevel && tower.damageLevel !== 'MAX LEVEL') tower.damageLevel++;
        tower.updateStats();
        tower.cost += costToAdd;
        if (tower.level === 5) {
            tower.level = 'MAX LEVEL';
            if (tower.damageLevel) tower.damageLevel = 'MAX LEVEL';
        }
        gameState.hasPerformedFirstMerge = true;
        return true;
    }

    return false;
}
