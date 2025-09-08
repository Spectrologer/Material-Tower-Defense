import { ENEMY_TYPES } from './constants.js';

// A helper function to make wave compositions more readable.
const comp = (type, count) => ({ type, count });

/**
 * Defines the properties for each wave in the game.
 * - isSwarm: (Optional) Boolean, true if it's a high-density, fast-spawning wave.
 * - isBoss: (Optional) Boolean, true if it's a boss wave.
 * - composition: An array of enemy types and their counts for the wave.
 * - healthMultiplier: A multiplier applied to the base health of enemies.
 * - healthBonus: A flat health bonus added after the multiplier.
 * - endOfWaveAnnouncement: (Optional) An object to configure a warning message for the *next* wave.
 */
export const waveDefinitions = [
    // Wave 1
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 8)],
        healthMultiplier: 1.00, healthBonus: 0,
    },
    // Wave 2
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 12)],
        healthMultiplier: 1.15, healthBonus: 0,
        endOfWaveAnnouncement: { text: "Warning:\nFast enemies incoming!", color: '#ffb84d' }
    },
    // Wave 3
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 10), comp(ENEMY_TYPES.FAST, 5)],
        healthMultiplier: 1.30, healthBonus: 0,
        endOfWaveAnnouncement: { text: "Warning:\Swarm incoming!", color: '#ffb84d' }

    },
    // Wave 4 (Swarm)
    {
        isSwarm: true,
        composition: [comp(ENEMY_TYPES.SWARM, 35)],
        healthMultiplier: 1.15, healthBonus: 0,
        endOfWaveAnnouncement: { text: "Warning:\nFlying enemies incoming!", color: '#af97d4ff' }
    },
    // Wave 5
    {
        composition: [comp(ENEMY_TYPES.FLYING, 5)],
        healthMultiplier: 1.60, healthBonus: 0,
        endOfWaveAnnouncement: { text: "Warning:\nBulky enemies inbound!", color: '#979fd4ff' }

    },
    // Wave 6
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 10)],
        healthMultiplier: 1.75, healthBonus: 10,
    },
    // Wave 7
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 10), comp(ENEMY_TYPES.FAST, 8), comp(ENEMY_TYPES.HEAVY, 4), comp(ENEMY_TYPES.FLYING, 4)],
        healthMultiplier: 1.90, healthBonus: 10,
    },
    // Wave 8 (Swarm)
    {
        isSwarm: true,
        composition: [comp(ENEMY_TYPES.SWARM, 55)],
        healthMultiplier: 1.35, healthBonus: 10,
    },
    // Wave 9
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 15), comp(ENEMY_TYPES.FLYING, 10)],
        healthMultiplier: 2.20, healthBonus: 10,
        endOfWaveAnnouncement: { text: "Warning:\nUpcoming enemies will steal gold!", color: '#f7e51aff' }
    },
    // Wave 10 (Special)
    {
        composition: [comp(ENEMY_TYPES.BITCOIN, 25)],
        healthMultiplier: 2.35, healthBonus: 10,
    },
    // Wave 11
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 20), comp(ENEMY_TYPES.FAST, 15), comp(ENEMY_TYPES.HEAVY, 10)],
        healthMultiplier: 2.85, healthBonus: 10,
    },
    // Wave 12 (Swarm)
    {
        isSwarm: true,
        composition: [comp(ENEMY_TYPES.SWARM, 65)],
        healthMultiplier: 1.55, healthBonus: 10,
    },
    // Wave 13
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 15), comp(ENEMY_TYPES.FLYING, 15), comp(ENEMY_TYPES.FAST, 10)],
        healthMultiplier: 3.85, healthBonus: 10,
    },
    // Wave 14
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 25), comp(ENEMY_TYPES.FLYING, 20)],
        healthMultiplier: 4.35, healthBonus: 10,
        endOfWaveAnnouncement: { text: "Warning:\nPrepare for Flutterdash!", color: '#f542e9ff' }
    },
    // Wave 15 (Boss)
    {
        isBoss: true,
        composition: [comp(ENEMY_TYPES.BOSS, 1)],
    },
];
