import assert from 'assert';
import { Enemy } from '../js/game-entities.js';
import { ENEMY_TYPES } from '../js/constants.js';

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

test('Enemy should be the same after serialization and deserialization', () => {
    const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    const enemy = new Enemy(ENEMY_TYPES.FLYING, path, 'FLYING');
    enemy.health = 5; // Simulate some damage taken
    enemy.pathIndex = 1; // Simulate progress along the path

    const serialized = enemy.toJSON();
    const deserializedEnemy = Enemy.fromJSON(serialized, path);

    assert.equal(deserializedEnemy.type, enemy.type, 'type should match');
    assert.equal(deserializedEnemy.health, enemy.health, 'health should match');
    assert.equal(deserializedEnemy.maxHealth, enemy.maxHealth, 'maxHealth should match');
    assert.equal(deserializedEnemy.pathIndex, enemy.pathIndex, 'pathIndex should match');
    assert.deepEqual(deserializedEnemy.position, enemy.position);
});