import assert from 'assert';
import { Projectile, Tower, Enemy } from '../js/game-entities.js';
import { TOWER_TYPES, ENEMY_TYPES } from '../js/constants.js';

const DELTA_TIME = 1 / 60; // Simulate a 60 FPS game loop

test('Projectile should move towards its target', () => {
    const owner = new Tower(0, 0, 'PIN');
    const target = new Enemy(ENEMY_TYPES.NORMAL, [{ x: 200, y: 0 }], 'NORMAL');
    target.x = 200;
    target.y = 0;
    const projectile = new Projectile(owner, target);

    const initialX = projectile.x;
    projectile.update(() => { }, [], [], DELTA_TIME);

    assert(projectile.x > initialX, 'Projectile should have moved along the x-axis');
});

test('Projectile should be removed after hitting a target', () => {
    const owner = new Tower(0, 0, 'PIN');
    const target = new Enemy(ENEMY_TYPES.NORMAL, [{ x: 5, y: 0 }], 'NORMAL');
    target.x = 5;
    target.y = 0;
    const projectile = new Projectile(owner, target);

    let hitCalled = false;
    const onHit = () => { hitCalled = true; };

    const shouldKeep = projectile.update(onHit, [], [], DELTA_TIME);

    assert.strictEqual(hitCalled, true, 'onHit callback should have been called');
    assert.strictEqual(shouldKeep, false, 'Projectile should be marked for removal after hitting target');
});

test('ANTI_AIR rocket should accelerate', () => {
    const owner = new Tower(0, 0, 'ANTI_AIR');
    const target = new Enemy(ENEMY_TYPES.FLYING, [{ x: 200, y: 0 }], 'FLYING');
    const projectile = new Projectile(owner, target);

    // The projectile is emerging for the first few frames and doesn't move or accelerate.
    // We need to update past this emerging phase.
    projectile.isEmerging = false; // Bypass the emerging state for this test

    const initialSpeed = projectile.currentSpeed;
    const shouldKeep = projectile.update(() => { }, [], [], DELTA_TIME);

    assert.strictEqual(shouldKeep, true, 'Projectile should not be removed on the first frame');
    assert(projectile.currentSpeed > initialSpeed, 'Rocket speed should increase over time');
    const speedAfterFirstUpdate = projectile.currentSpeed;
    projectile.update(() => { }, [], [], DELTA_TIME);
    assert(projectile.currentSpeed > speedAfterFirstUpdate, 'Rocket speed should continue to increase on subsequent updates');
});

test('NINE_PIN projectile should pierce multiple enemies', () => {
    const owner = new Tower(0, 0, 'NINE_PIN');
    const target = new Enemy(ENEMY_TYPES.NORMAL, [{ x: 200, y: 0 }], 'NORMAL');
    target.x = 200;
    target.y = 0;

    const enemy1 = new Enemy(ENEMY_TYPES.NORMAL, [], 'NORMAL');
    enemy1.x = 50;
    enemy1.y = 0;

    const enemy2 = new Enemy(ENEMY_TYPES.NORMAL, [], 'NORMAL');
    enemy2.x = 100;
    enemy2.y = 0;

    const enemies = [target, enemy1, enemy2];
    const projectile = new Projectile(owner, target);

    let hitCount = 0;
    const onHit = (proj, hitEnemy) => {
        hitCount++;
    };

    // Move the projectile past the first two enemies but not to the final target
    for (let i = 0; i < 15; i++) {
        projectile.update(onHit, enemies, [], DELTA_TIME);
    }

    assert.strictEqual(hitCount, 2, 'NINE_PIN projectile should have hit two enemies');
    assert.strictEqual(projectile.hitEnemies.size, 2, 'Two enemies should be in the hitEnemies set');
});