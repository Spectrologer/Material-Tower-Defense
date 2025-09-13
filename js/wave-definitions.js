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
        detourRatio: 0,
    },
    // Wave 2: More NORMAL enemies, testing basic tower placement without a detour.
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 15)],
        healthMultiplier: 1.15, healthBonus: 0,
        endOfWaveAnnouncement: { text: "Warning:\nFast enemies incoming!", color: '#ffb84d' }
    },
    // Wave 3: Introduce FAST enemies and split the path.
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 10), comp(ENEMY_TYPES.FAST, 8)],
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
        composition: [comp(ENEMY_TYPES.HEAVY, 7)],
        healthMultiplier: 1.1, healthBonus: 30,
    },
    // Wave 6: A mix of HEAVY on main path and FAST on detour to challenge tower specialization.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 4), comp(ENEMY_TYPES.FAST, 8)],
        healthMultiplier: 1.2, healthBonus: 10,
        detourRatio: 1.0,
        endOfWaveAnnouncement: { text: "Warning:\nAirspace violation detected!", color: '#af97d4ff' }
    },
    // Wave 7: Introduce FLYING enemies, a pure anti-air check.
    {
        composition: [comp(ENEMY_TYPES.FLYING, 10)],
        healthMultiplier: 1.3, healthBonus: 20,
    },
    // Wave 8: A mix of ground and air to test defense flexibility.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 5), comp(ENEMY_TYPES.FLYING, 5)],
        healthMultiplier: 1.4, healthBonus: 22,
        endOfWaveAnnouncement: { text: "Unseen threats ahead!\nDetection required.", color: '#BDBDBD' }
    },
    // Wave 9: Introduce STEALTH enemies, testing detection tower usage.
    {
        composition: [comp(ENEMY_TYPES.STEALTH, 8)],
        healthMultiplier: 1.1, healthBonus: 10,
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
        composition: [comp(ENEMY_TYPES.BITCOIN, 25)],
        healthMultiplier: 2, healthBonus: 25,
    },
    // Wave 12: A difficult pincer attack with HEAVY and FAST enemies on separate paths.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 7), comp(ENEMY_TYPES.FAST, 13)],
        healthMultiplier: 1.9, healthBonus: 35,
        detourRatio: 1.0,
    },
    // Wave 13: Mixed wave including STEALTH to test layered defenses.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 6), comp(ENEMY_TYPES.STEALTH, 2), comp(ENEMY_TYPES.FAST, 4)],
        healthMultiplier: 2.2, healthBonus: 35,
        detourRatio: 0.5,
    },
    // Wave 14: Pre-boss wave with a mix of all major threats.
    {
        composition: [
            comp(ENEMY_TYPES.HEAVY, 4),
            comp(ENEMY_TYPES.FLYING, 4),
            comp(ENEMY_TYPES.SWARM, 4),
            comp(ENEMY_TYPES.STEALTH, 4)
        ],
        healthMultiplier: 2, healthBonus: 30,
        detourRatio: 0.75,
        endOfWaveAnnouncement: { text: "ALERT:\nFLUTTERDASH APPROACHING!", color: '#f542e9ff' }
    },
    // Wave 15: The Final Boss
    {
        isBoss: true,
        composition: [comp(ENEMY_TYPES.BOSS, 1)],
    },
    // Wave 16: A dense wave of normal enemies to test sustained damage.
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 40)],
        healthMultiplier: 2.5, healthBonus: 50,
        detourRatio: 0.2,
    },
    // Wave 17: Fast and stealthy enemies attacking from both paths.
    {
        composition: [comp(ENEMY_TYPES.FAST, 15), comp(ENEMY_TYPES.STEALTH, 10)],
        healthMultiplier: 2.8, healthBonus: 60,
        detourRatio: 0.6,
    },
    // Wave 18: A heavy ground assault with flying support.
    { // Boss Decay: The boss returns, but not as a final boss.
        composition: [comp(ENEMY_TYPES.BOSS, 1), comp(ENEMY_TYPES.HEAVY, 8)],
        healthMultiplier: 3.2, healthBonus: 75, // Health multiplier does not affect boss
    },
    // Wave 19: A massive swarm wave to push splash damage towers to their limit.
    {
        isSwarm: true,
        composition: [comp(ENEMY_TYPES.SWARM, 50)],
        healthMultiplier: 3.0, healthBonus: 40,
        detourRatio: 1.0,
    },
    // Wave 20: Economic challenge with a large group of Bitcoin enemies.
    {
        composition: [comp(ENEMY_TYPES.BITCOIN, 40)],
        healthMultiplier: 4.0, healthBonus: 100,
    },
    // Wave 21: A tricky combination of fast detour enemies and heavy main path enemies.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 8), comp(ENEMY_TYPES.FAST, 20)],
        healthMultiplier: 4.5, healthBonus: 120,
        detourRatio: 1.0,
    },
    // Wave 22: A test of detection and mixed damage with stealth and heavy units.
    { // Boss Decay: The boss appears alongside stealth units, a tricky combination.
        composition: [comp(ENEMY_TYPES.BOSS, 1), comp(ENEMY_TYPES.STEALTH, 12)],
        healthMultiplier: 5.0, healthBonus: 150, // Health multiplier does not affect boss
        detourRatio: 0.5,
    },
    // Wave 23: A mixed wave of all ground types to test overall defense.
    {
        composition: [
            comp(ENEMY_TYPES.NORMAL, 15),
            comp(ENEMY_TYPES.FAST, 10),
            comp(ENEMY_TYPES.HEAVY, 5),
            comp(ENEMY_TYPES.SWARM, 20)
        ],
        healthMultiplier: 5.5, healthBonus: 180,
        detourRatio: 0.3,
    },
    // Wave 24: A challenging air and ground pincer attack.
    {
        composition: [comp(ENEMY_TYPES.FLYING, 15), comp(ENEMY_TYPES.HEAVY, 10)],
        healthMultiplier: 6.0, healthBonus: 220,
    },
    // Wave 25: A pre-infinite wave with a bit of everything, including stealth.
    {
        composition: [
            comp(ENEMY_TYPES.BOSS, 2), // Two bosses at once!
            comp(ENEMY_TYPES.FLYING, 8),
            comp(ENEMY_TYPES.FAST, 10)
        ],
        healthMultiplier: 6.5, healthBonus: 250,
        detourRatio: 0.5,
        endOfWaveAnnouncement: { text: "Warning:\nInfinite waves incoming!", color: '#ff4d4d' }
    },
];

export function generateWave(waveNumber) {
    // The wave number to start procedural generation from.
    const proceduralStartWave = 26;

    // Calculate the wave's difficulty based on how far past the start it is.
    const difficultyScale = waveNumber - proceduralStartWave;

    const wave = {
        composition: [],
        healthMultiplier: 6.5 + difficultyScale * 0.5,
        healthBonus: 250 + difficultyScale * 25,
        detourRatio: Math.min(1, 0.5 + difficultyScale * 0.05),
    };

    // Base counts for different enemy types.
    const baseNormal = 15;
    const baseFast = 10;
    const baseHeavy = 5;
    const baseFlying = 4;
    const baseStealth = 3;

    // Add a mix of enemies, increasing their count and difficulty based on the wave number.
    wave.composition.push(comp(ENEMY_TYPES.NORMAL, baseNormal + difficultyScale * 4));
    wave.composition.push(comp(ENEMY_TYPES.FAST, baseFast + difficultyScale * 3));
    wave.composition.push(comp(ENEMY_TYPES.HEAVY, baseHeavy + Math.floor(difficultyScale * 2)));

    // Introduce and scale flying enemies.
    wave.composition.push(comp(ENEMY_TYPES.FLYING, baseFlying + Math.floor(difficultyScale * 1.5)));

    // Introduce and scale stealth enemies.
    wave.composition.push(comp(ENEMY_TYPES.STEALTH, baseStealth + Math.floor(difficultyScale * 1.2)));

    return wave;
}
