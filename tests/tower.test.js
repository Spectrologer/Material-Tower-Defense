import assert from 'assert';
import { Tower } from '../js/game-entities.js';
import { TOWER_TYPES } from '../js/constants.js';

test('Tower should serialize and deserialize basic properties', () => {
    const tower = new Tower(100, 200, 'PIN');
    tower.level = 3;
    tower.damageLevel = 2;
    tower.targetingMode = 'weakest';
    tower.damageMultiplier = 1.5;
    tower.projectileCount = 2;

    const json = tower.toJSON();
    const restored = Tower.fromJSON(json);

    assert.equal(restored.x, tower.x);
    assert.equal(restored.y, tower.y);
    assert.equal(restored.type, tower.type);
    assert.equal(restored.id, tower.id);
    assert.equal(restored.level, tower.level);
    assert.equal(restored.damageLevel, tower.damageLevel);
    assert.equal(restored.targetingMode, tower.targetingMode);
    assert.equal(restored.damageMultiplier, tower.damageMultiplier);
    assert.equal(restored.projectileCount, tower.projectileCount);
});

test('Tower should preserve fragmenting shot properties', () => {
    const tower = new Tower(150, 250, 'PIN_HEART');
    tower.hasFragmentingShot = true;
    tower.fragmentBounces = 3;
    tower.bounceDamageFalloff = 0.7;

    const json = tower.toJSON();
    const restored = Tower.fromJSON(json);

    assert.equal(restored.hasFragmentingShot, true);
    assert.equal(restored.fragmentBounces, 3);
    assert.equal(restored.bounceDamageFalloff, 0.7);
});

test('Tower should preserve merge multipliers', () => {
    const tower = new Tower(200, 300, 'CASTLE');
    tower.damageMultiplierFromMerge = 1.5;

    const json = tower.toJSON();
    const restored = Tower.fromJSON(json);

    assert.equal(restored.damageMultiplierFromMerge, 1.5);
});

test('Tower should preserve visual properties', () => {
    const tower = new Tower(250, 350, 'NAT');
    tower.color = '#ff0000';
    tower.projectileSize = 10;

    const json = tower.toJSON();
    const restored = Tower.fromJSON(json);

    assert.equal(restored.color, '#ff0000');
    assert.equal(restored.projectileSize, 10);
});

test('ORBIT tower should recreate orbiters on deserialization', () => {
    const tower = new Tower(100, 100, 'ORBIT');
    tower.orbitMode = 'near';
    tower.level = 2;

    const json = tower.toJSON();
    const restored = Tower.fromJSON(json);

    assert.equal(restored.type, 'ORBIT');
    assert.equal(restored.orbitMode, 'near');
    assert.equal(restored.level, 2);
    assert.ok(restored.orbiters);
    assert.equal(restored.orbiters.length, 2);
});

test('FIREPLACE tower should preserve burn properties', () => {
    const tower = new Tower(150, 150, 'FIREPLACE');
    tower.level = 2;

    const json = tower.toJSON();
    const restored = Tower.fromJSON(json);

    assert.equal(restored.type, 'FIREPLACE');
    assert.equal(restored.burnDps, tower.burnDps);
    assert.equal(restored.burnDuration, tower.burnDuration);
    assert.equal(restored.splashRadius, tower.splashRadius);
});

test('ENT tower should preserve aura properties', () => {
    const tower = new Tower(200, 200, 'ENT');
    tower.mode = 'slow';

    const json = tower.toJSON();
    const restored = Tower.fromJSON(json);

    const towerProps = Object.keys(tower);

    for (const prop of towerProps) {
        assert.deepEqual(restored[prop], tower[prop], `Property ${prop} does not match on restored tower`);
    }
});

test('CAT tower should preserve properties', () => {
    const tower = new Tower(250, 250, 'CAT');
    tower.mode = 'boost';

    const json = tower.toJSON();
    const restored = Tower.fromJSON(json);

    const towerProps = Object.keys(tower);

    for (const prop of towerProps) {
        assert.deepEqual(restored[prop], tower[prop], `Property ${prop} does not match on restored tower`);
    }
});

test('SUPPORT tower should preserve level and recalculate stats', () => {
    const tower = new Tower(300, 300, 'SUPPORT');
    tower.level = 3;

    const json = tower.toJSON();
    const restored = Tower.fromJSON(json);

    assert.equal(restored.type, 'SUPPORT');
    assert.equal(restored.level, 3);
    // After updateStats, attackSpeedBoost should be recalculated based on level
    // Base attackSpeedBoost * Math.pow(0.95, level - 1)
    const expectedBoost = TOWER_TYPES.SUPPORT.attackSpeedBoost * Math.pow(0.95, 2);
    assert.equal(restored.attackSpeedBoost.toFixed(6), expectedBoost.toFixed(6));
});

test('NINE_PIN tower should maintain MAX LEVEL status', () => {
    const tower = new Tower(350, 350, 'NINE_PIN');

    const json = tower.toJSON();
    const restored = Tower.fromJSON(json);

    assert.equal(restored.type, 'NINE_PIN');
    assert.equal(restored.level, 'MAX LEVEL');
    assert.equal(restored.damageLevel, 'MAX LEVEL');
});

test('All tower types should serialize and deserialize successfully', () => {
    const towerTypes = Object.keys(TOWER_TYPES);

    for (const type of towerTypes) {
        const tower = new Tower(100, 100, type);
        const json = tower.toJSON();
        const restored = Tower.fromJSON(json);

        assert.equal(restored.type, type, `Failed to serialize ${type} tower`);
        assert.equal(restored.x, 100, `${type} tower x position mismatch`);
        assert.equal(restored.y, 100, `${type} tower y position mismatch`);
        assert.ok(restored.id, `${type} tower missing id`);
    }
});

test('Tower updateStats should be called after deserialization', () => {
    const tower = new Tower(100, 100, 'CASTLE');
    tower.level = 4;

    const json = tower.toJSON();
    const restored = Tower.fromJSON(json);

    // After updateStats, damage should be recalculated based on level
    assert.ok(restored.damage > 0);
    assert.ok(restored.range > 0);
    assert.ok(restored.fireRate > 0);
});