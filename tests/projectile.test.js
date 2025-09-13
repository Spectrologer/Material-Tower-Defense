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
    const projectile = new Projectile(owner, { x: 200, y: 0, health: 100 });
    const initialSpeed = projectile.currentSpeed;
    projectile.update(() => { }, [], [], DELTA_TIME);
    assert(projectile.currentSpeed > initialSpeed, 'Rocket speed should increase over time');
});