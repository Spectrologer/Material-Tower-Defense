import assert from 'assert';
import { MergeHandler } from '../js/merge-logic.js';
import { Tower } from '../js/game-entities.js';
import { TOWER_TYPES } from '../js/constants.js';

let mergeHandler;
let gameState;

// Helper function to reset state before each test
function beforeEach() {
    mergeHandler = new MergeHandler();
    gameState = {
        gold: 1000,
        hasPerformedFirstMerge: false,
        discoveredMerges: new Set(),
        discoveredTowerTypes: new Set(['PIN', 'CASTLE', 'SUPPORT']),
    };
}

test('MergeHandler should perform a basic same-type merge (PIN + PIN)', () => {
    beforeEach();
    const tower = new Tower(100, 100, 'PIN');
    const initialLevel = tower.level;
    const initialCost = tower.cost;
    const costToAdd = TOWER_TYPES.PIN.cost;

    const success = mergeHandler.executeMerge(tower, 'PIN', costToAdd, gameState);

    assert.strictEqual(success, true, 'Merge should be successful');
    assert.strictEqual(tower.level, initialLevel + 1, 'Tower level should increase by 1');
    assert.strictEqual(tower.cost, initialCost + costToAdd, 'Tower cost should be updated');
    assert.strictEqual(gameState.hasPerformedFirstMerge, true, 'GameState should track first merge');
});

test('MergeHandler should perform a transformation merge (SUPPORT + SUPPORT -> ENT)', () => {
    beforeEach();
    const tower = new Tower(100, 100, 'SUPPORT');
    const costToAdd = TOWER_TYPES.SUPPORT.cost;
    const initialCost = tower.cost;

    const success = mergeHandler.executeMerge(tower, 'SUPPORT', costToAdd, gameState);

    assert.strictEqual(success, true, 'Merge should be successful');
    assert.strictEqual(tower.type, 'ENT', 'Tower type should transform to ENT');
    assert.strictEqual(tower.level, 1, 'Transformed tower should reset to level 1');
    assert.strictEqual(tower.cost, initialCost + costToAdd, 'Cost should be updated');
    assert(gameState.discoveredMerges.has('SUPPORT+SUPPORT'), 'SUPPORT+SUPPORT merge should be discovered');
    assert(gameState.discoveredTowerTypes.has('ENT'), 'ENT tower type should be discovered');
});

test('MergeHandler should perform an upgrade merge (NAT + CASTLE)', () => {
    beforeEach();
    const tower = new Tower(100, 100, 'NAT');
    const initialProjectileCount = tower.projectileCount || 1;
    const costToAdd = TOWER_TYPES.CASTLE.cost;

    const success = mergeHandler.executeMerge(tower, 'CASTLE', costToAdd, gameState);

    assert.strictEqual(success, true, 'Merge should be successful');
    assert.strictEqual(tower.type, 'NAT', 'Tower type should remain NAT');
    assert.strictEqual(tower.projectileCount, initialProjectileCount + 1, 'Projectile count should increase');
});

test('MergeHandler should not merge unmergeable tower types (NINE_PIN)', () => {
    beforeEach();
    const ninePinTower = new Tower(100, 100, 'NINE_PIN');
    const pinTower = new Tower(200, 200, 'PIN');

    const info = mergeHandler.getMergeInfo(ninePinTower, 'PIN', gameState);
    assert.strictEqual(info, null, 'Should not be able to merge onto a NINE_PIN');

    const info2 = mergeHandler.getMergeInfo(pinTower, 'NINE_PIN', gameState);
    assert.strictEqual(info2, null, 'Should not be able to merge a NINE_PIN onto another tower');
});

test('getMergeInfo should return correct info for a valid, undiscovered merge', () => {
    beforeEach();
    const supportTower = new Tower(100, 100, 'SUPPORT');
    const info = mergeHandler.getMergeInfo(supportTower, 'SUPPORT', gameState);

    assert.deepStrictEqual(info, {
        resultType: 'ENT',
        text: 'ENT',
        upgrade: undefined,
        isDiscovered: false
    });
});
