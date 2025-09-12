import assert from 'assert';
import { Enemy } from '../js/game-entities.js';
import { ENEMY_TYPES } from '../js/constants.js';

const DELTA_TIME = 1 / 60; // Simulate a 60 FPS game loop

test('Enemy should initialize with correct health', () => {
    const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const enemy = new Enemy(ENEMY_TYPES.NORMAL, path, 'NORMAL');

    assert.equal(enemy.health, ENEMY_TYPES.NORMAL.health);
    assert.equal(enemy.maxHealth, ENEMY_TYPES.NORMAL.health);
});

test('Enemy takeDamage should reduce health', () => {
    const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const enemy = new Enemy(ENEMY_TYPES.NORMAL, path, 'NORMAL');
    const initialHealth = enemy.health;

    enemy.takeDamage(10);
    assert.equal(enemy.health, initialHealth - 10);
});

test('Enemy takeDamage should return true when killed', () => {
    const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const enemy = new Enemy(ENEMY_TYPES.NORMAL, path, 'NORMAL');

    const killed = enemy.takeDamage(enemy.health);
    assert.equal(killed, true);
    assert.equal(enemy.health, 0);
});

test('Enemy should move along its path', () => {
    const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const enemy = new Enemy(ENEMY_TYPES.NORMAL, path, 'NORMAL');
    const initialX = enemy.x;

    // Simulate two seconds of movement to ensure enemy reaches second node
    for (let i = 0; i < 120; i++) {
        enemy.update(() => { }, () => { }, [], null, null, DELTA_TIME);
    }

    assert(enemy.x > initialX, 'Enemy should have moved along the x-axis');
    assert(enemy.pathIndex >= 1, 'Enemy should have reached at least the second path node');
});

test('BOSS enemy should lay an EGG', () => {
    const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const boss = new Enemy(ENEMY_TYPES.BOSS, path, 'BOSS');
    const allEnemies = [];
    boss.timeUntilLay = 0.1; // Set time to lay an egg very soon

    // Simulate enough time to trigger egg laying
    for (let i = 0; i < 120; i++) { // 2 seconds
        boss.update(() => { }, () => { }, allEnemies, () => { }, () => { }, DELTA_TIME);
    }

    assert.strictEqual(allEnemies.length, 1, 'Boss should have laid one egg');
    assert.strictEqual(allEnemies[0].type, ENEMY_TYPES.EGG, 'The spawned enemy should be an EGG');
});


test('EGG enemy should hatch into a HATCHED enemy', () => {
    const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const egg = new Enemy(ENEMY_TYPES.EGG, path, 'EGG');
    const allEnemies = [];
    egg.hatchTimer = 0.1; // Set hatch time to be very soon

    // Simulate time passing to trigger hatch
    for (let i = 0; i < 10; i++) { // ~0.16 seconds
        const keepEnemy = egg.update(() => { }, () => { }, allEnemies, null, () => { }, DELTA_TIME);
        if (!keepEnemy) break; // Stop updating if enemy should be removed
    }

    assert.strictEqual(allEnemies.length, 1, 'Egg should have hatched one enemy');
    assert.strictEqual(allEnemies[0].type, ENEMY_TYPES.HATCHED, 'The hatched enemy should be of type HATCHED');
});

test('Enemy should take burn damage over time', () => {
    const path = [{ x: 0, y: 0 }];
    const enemy = new Enemy(ENEMY_TYPES.HEAVY, path, 'HEAVY');
    const initialHealth = enemy.health;

    enemy.applyBurn(10, 2); // 10 dps for 2 seconds

    // Simulate one second of burn damage
    for (let i = 0; i < 60; i++) {
        enemy.update(() => { }, () => { }, [], null, null, DELTA_TIME);
    }

    assert(enemy.health < initialHealth, 'Enemy health should be reduced by burn damage');
    assert(enemy.health > 0, 'Enemy should not be dead after 1 second of burn');
});
