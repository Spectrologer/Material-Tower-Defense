// This file defines exactly what enemies appear in each wave of the game.

import { ENEMY_TYPES } from './constants.js';

// A little helper to make the wave composition easier to read.
const comp = (type, count) => ({ type, count });

// This is the main list of all the waves in the game.
// Each wave is an object with a few properties:
// - composition: Which enemies to spawn and how many of them.
// - healthMultiplier/healthBonus: Makes enemies tougher in later waves.
// - isSwarm/isBoss: Special flags for swarm or boss waves.
// - detourRatio: A number from 0 to 1 that deterministically sends a fraction of enemies
//                down the detour path. It only affects enemies with `prefersDetour: true`
//                set in constants.js. For example, 0.5 means every 2nd eligible enemy
//                will take the detour. 1.0 means all eligible enemies will.
// - endOfWaveAnnouncement: A message to show the player to warn them about the *next* wave.
export const waveDefinitions = [
    // Wave 1: A few NORMAL enemies to introduce the detour.
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 10)],
        healthMultiplier: 0.9, healthBonus: 0,
        detourRatio: 1.0,
    },
    // Wave 2: More NORMAL enemies, testing basic tower placement without a detour.
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 15)],
        healthMultiplier: 0.95, healthBonus: 0,
        endOfWaveAnnouncement: { text: "Warning:\nFast enemies incoming!", color: '#ffb84d' }
    },
    // Wave 3: Introduce FAST enemies and split the path.
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 10), comp(ENEMY_TYPES.FAST, 4)],
        healthMultiplier: 1.0, healthBonus: 0,
        detourRatio: 0.5,
        endOfWaveAnnouncement: { text: "Warning:\nWe've encountered a bug!", color: '#00e6e6' }

    },
    // Wave 4: Introduce SWARM, a light swarm to test splash damage.
    {
        isSwarm: true,
        composition: [comp(ENEMY_TYPES.SWARM, 18)],
        healthMultiplier: 1.0, healthBonus: 0,
        detourRatio: 1.0,
        endOfWaveAnnouncement: { text: "Warning:\nBulky enemies inbound!", color: '#3446ceff' }
    },
    // Wave 5: Introduce HEAVY enemies, a pure test of single-target damage.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 5)],
        healthMultiplier: 1.1, healthBonus: 2,
    },
    // Wave 6: A mix of HEAVY on main path and FAST on detour to challenge tower specialization.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 4), comp(ENEMY_TYPES.FAST, 8)],
        healthMultiplier: 1.2, healthBonus: 2,
        detourRatio: 1.0,
        endOfWaveAnnouncement: { text: "Warning:\nAirspace violation detected!", color: '#af97d4ff' }
    },
    // Wave 7: Introduce FLYING enemies, a pure anti-air check.
    {
        composition: [comp(ENEMY_TYPES.FLYING, 7)],
        healthMultiplier: 1.3, healthBonus: 5,
    },
    // Wave 8: A mix of ground and air to test defense flexibility.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 5), comp(ENEMY_TYPES.FLYING, 5)],
        healthMultiplier: 1.4, healthBonus: 5,
        endOfWaveAnnouncement: { text: "Unseen threats ahead!\nDetection required.", color: '#BDBDBD' }
    },
    // Wave 9: Introduce STEALTH enemies, testing detection tower usage.
    {
        composition: [comp(ENEMY_TYPES.STEALTH, 10)],
        healthMultiplier: 1.5, healthBonus: 10,
        detourRatio: 0.5,
    },
    // Wave 10: A larger ground wave with mixed types to test overall defense.
    {
        isSwarm: true,
        composition: [comp(ENEMY_TYPES.NORMAL, 12), comp(ENEMY_TYPES.SWARM, 15)],
        healthMultiplier: 1.6, healthBonus: 10,
        detourRatio: 0.25,
        endOfWaveAnnouncement: { text: "Warning:\nFinancial assets at risk!", color: '#f7e51aff' }
    },
    // Wave 11: Introduce BITCOIN enemies as an economic challenge.
    {
        composition: [comp(ENEMY_TYPES.BITCOIN, 18)],
        healthMultiplier: 1.7, healthBonus: 10,
    },
    // Wave 12: A difficult pincer attack with HEAVY and FAST enemies on separate paths.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 7), comp(ENEMY_TYPES.FAST, 12)],
        healthMultiplier: 1.9, healthBonus: 15,
        detourRatio: 1.0,
    },
    // Wave 13: Mixed wave including STEALTH to test layered defenses.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 6), comp(ENEMY_TYPES.STEALTH, 4), comp(ENEMY_TYPES.FAST, 4)],
        healthMultiplier: 2.2, healthBonus: 15,
        detourRatio: 0.5,
    },
    // Wave 14: Pre-boss wave with a mix of all major threats.
    {
        composition: [
            comp(ENEMY_TYPES.HEAVY, 4),
            comp(ENEMY_TYPES.FLYING, 6),
            comp(ENEMY_TYPES.SWARM, 8),
            comp(ENEMY_TYPES.STEALTH, 4)
        ],
        healthMultiplier: 2.5, healthBonus: 20,
        detourRatio: 0.75,
        endOfWaveAnnouncement: { text: "ALERT:\nFLUTTERDASH APPROACHING!", color: '#f542e9ff' }
    },
    // Wave 15: The Final Boss
    {
        isBoss: true,
        composition: [comp(ENEMY_TYPES.BOSS, 1)],
    },
];

