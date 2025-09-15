import assert from 'assert';
import { Enemy } from '../js/game-entities.js';
import { ENEMY_TYPES } from '../js/constants.js';

test('SPLITTER enemy should spawn SPLITTER_MINI enemies on death', () => {
    const splitter = new Enemy(ENEMY_TYPES.SPLITTER, [{ x: 0, y: 0 }], 'SPLITTER');
    const newlySpawnedEnemies = [];
    const onDeath = () => { }; // Mock onDeath function

    splitter.takeDamage(splitter.health, null, onDeath, newlySpawnedEnemies);

    assert.strictEqual(newlySpawnedEnemies.length, 2, 'Should spawn 2 new enemies');
    assert.strictEqual(newlySpawnedEnemies[0].type, ENEMY_TYPES.SPLITTER_MINI, 'First spawned enemy should be a SPLITTER_MINI');
    assert.strictEqual(newlySpawnedEnemies[1].type, ENEMY_TYPES.SPLITTER_MINI, 'Second spawned enemy should be a SPLITTER_MINI');
});

test('SPLITTER_MINI enemy should spawn SPLITTER_MICRO enemies on death', () => {
    const mini = new Enemy(ENEMY_TYPES.SPLITTER_MINI, [{ x: 0, y: 0 }], 'SPLITTER_MINI');
    const newlySpawnedEnemies = [];
    const onDeath = () => { };

    mini.takeDamage(mini.health, null, onDeath, newlySpawnedEnemies);

    assert.strictEqual(newlySpawnedEnemies.length, 2, 'Should spawn 2 new enemies');
    assert.strictEqual(newlySpawnedEnemies[0].type, ENEMY_TYPES.SPLITTER_MICRO, 'First spawned enemy should be a SPLITTER_MICRO');
    assert.strictEqual(newlySpawnedEnemies[1].type, ENEMY_TYPES.SPLITTER_MICRO, 'Second spawned enemy should be a SPLITTER_MICRO');
});

test('SPLITTER_MICRO enemy should not spawn any enemies on death', () => {
    const micro = new Enemy(ENEMY_TYPES.SPLITTER_MICRO, [{ x: 0, y: 0 }], 'SPLITTER_MICRO');
    const newlySpawnedEnemies = [];
    const onDeath = () => { };

    micro.takeDamage(micro.health, null, onDeath, newlySpawnedEnemies);

    assert.strictEqual(newlySpawnedEnemies.length, 0, 'SPLITTER_MICRO should not spawn any new enemies');
});