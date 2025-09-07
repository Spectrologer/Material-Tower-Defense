import { TOWER_TYPES } from './constants.js';

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
        tower.level = 'MAX LEVEL';
        tower.damageLevel = 'MAX LEVEL';
        tower.updateStats();
        tower.color = TOWER_TYPES.ENT.color;
    }
});

addRecipe('ENT', 'SUPPORT', {
    resultType: 'CAT',
    apply: (tower) => {
        tower.type = 'CAT';
        tower.level = 'MAX LEVEL';
        tower.damageLevel = 'MAX LEVEL';
        tower.updateStats();
        tower.color = TOWER_TYPES.CAT.color;
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
        tower.updateStats();
        tower.splashRadius = TOWER_TYPES.ORBIT.splashRadius;
        tower.color = TOWER_TYPES.ORBIT.color;
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
        tower.level = existingTowerLevel;
        tower.damageLevel = existingTowerLevel;
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


const advancedUpgradeApply = (tower, { mergingTowerType, originalTowerColor }) => {
    const diminishingFactor = 0.15;
    const levelModifier = typeof tower.level === 'number' ? Math.pow(1 - diminishingFactor, tower.level - 1) : 1;
    if (tower.type === 'ORBIT') {
        if (mergingTowerType === 'PIN') tower.damage += 2 * levelModifier;
        else if (mergingTowerType === 'CASTLE') {
            tower.damage += 1 * levelModifier;
            tower.projectileSize += 1;
        }
    } else { // FORT or PIN_HEART
        if (mergingTowerType === 'PIN') {
            tower.damage += 0.5 * levelModifier;
            tower.permFireRate *= (1 - (0.05 * levelModifier));
        } else if (mergingTowerType === 'CASTLE') {
            tower.damage += 2 * levelModifier;
            if (tower.splashRadius) tower.splashRadius += 5 * levelModifier;
        }
    }
    tower.level++;
    if (tower.damageLevel) tower.damageLevel++;
    tower.color = blendColors(originalTowerColor, TOWER_TYPES[mergingTowerType].color);
};

addRecipe('FORT', 'PIN', {
    resultType: 'FORT', text: 'Upgrade',
    upgrade: { text: '+ Dmg/Spd', icon: 'bolt', family: 'material-icons' },
    canApply: (tower) => tower.level < 5,
    apply: advancedUpgradeApply
});

addRecipe('FORT', 'CASTLE', {
    resultType: 'FORT', text: 'Upgrade',
    upgrade: { text: '+ Dmg/Spl', icon: 'bolt', family: 'material-icons' },
    canApply: (tower) => tower.level < 5,
    apply: advancedUpgradeApply
});

addRecipe('PIN_HEART', 'PIN', {
    resultType: 'PIN_HEART', text: 'Upgrade',
    upgrade: { text: '+ Dmg/Spd', icon: 'bolt', family: 'material-icons' },
    canApply: (tower) => tower.level < 5,
    apply: advancedUpgradeApply
});

addRecipe('PIN_HEART', 'CASTLE', {
    resultType: 'PIN_HEART', text: 'Upgrade',
    upgrade: { text: '+ Dmg/Spl', icon: 'bolt', family: 'material-icons' },
    canApply: (tower) => tower.level < 5,
    apply: advancedUpgradeApply
});

addRecipe('ORBIT', 'PIN', {
    resultType: 'ORBIT', text: 'Upgrade',
    upgrade: { text: '+ Dmg', icon: 'bolt', family: 'material-icons' },
    canApply: (tower) => tower.level < 5,
    apply: advancedUpgradeApply
});

addRecipe('ORBIT', 'CASTLE', {
    resultType: 'ORBIT', text: 'Upgrade',
    upgrade: { text: '+ Dmg/Size', icon: 'bolt', family: 'material-icons' },
    canApply: (tower) => tower.level < 5,
    apply: advancedUpgradeApply
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
 * @returns {object|null} An object with info for the merge tooltip, or null if no merge is possible.
 */
export function getMergeResultInfo(existingTower, placingType) {
    if (existingTower.type === 'NINE_PIN' || placingType === 'NINE_PIN' || TOWER_TYPES[existingTower.type].unmergeable) {
        return null;
    }

    // Look up recipe in the map first for transformations
    const key = createRecipeKey(existingTower.type, placingType);
    const recipe = recipes.get(key);
    if (recipe) {
        if (recipe.canApply && !recipe.canApply(existingTower)) {
            return null;
        }
        return {
            resultType: recipe.resultType,
            text: recipe.text || recipe.resultType.replace('_', ' '),
            upgrade: recipe.upgrade
        };
    }
    
    // Fallback to same-type level up if no recipe is found
    if (existingTower.type === placingType && existingTower.level !== 'MAX LEVEL' && existingTower.level < 5) {
        return {
            resultType: existingTower.type,
            text: `${existingTower.type} LVL ${existingTower.level + 1}`
        };
    }

    return null;
}

/**
 * Applies a merge to a tower based on a recipe.
 * @param {Tower} tower - The base tower to modify.
 * @param {string} mergingTowerType - The type of the tower being merged with.
 * @param {number} costToAdd - The cost of the merging tower.
 * @returns {boolean} True if a merge was successfully performed, false otherwise.
 */
export function performMerge(tower, mergingTowerType, costToAdd) {
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

        const maxLevel = tower.type === 'FIREPLACE' ? 3 : 5;
        if (tower.level === maxLevel) {
            tower.level = 'MAX LEVEL';
            if (tower.damageLevel) tower.damageLevel = 'MAX LEVEL';
        }
        return true;
    }
    
    // 2. If no specific recipe, handle same-type level up as a fallback
    if (tower.type === mergingTowerType && tower.level !== 'MAX LEVEL' && tower.level < 5) {
        tower.level++;
        if (tower.damageLevel) tower.damageLevel++;
        tower.updateStats();
        tower.cost += costToAdd;
        if (tower.level === 5) {
            tower.level = 'MAX LEVEL';
            if (tower.damageLevel) tower.damageLevel = 'MAX LEVEL';
        }
        return true;
    }

    return false;
}

