// This file is the master plan for every wave in the game.

import { ENEMY_TYPES } from './constants.js';

// Just a little shortcut to make the wave definitions cleaner.
const comp = (type, count) => ({ type, count });

// This is the big list of all the pre-designed waves.
// `composition`: Which enemies and how many.
// `healthMultiplier/healthBonus`: Makes enemies tougher as the game goes on.
// `isSwarm/isBoss`: Special flags for certain wave types.
// `detourRatio`: What fraction of enemies should take the scenic route.
// `interleave`: If true, mixes up the spawn order of different enemy types.
// `endOfWaveAnnouncement`: A little heads-up for the player about what's coming next.
export const waveDefinitions = [
    // Wave 1: A few NORMAL enemies, with a FAST one at the end to keep players on their toes.
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 10), comp(ENEMY_TYPES.FAST, 1)],
        healthMultiplier: 0.9, healthBonus: 0,
        detourRatio: 0,
    },
    // Wave 2: Introduce SWARM enemies early to hint at splash damage.
    {
        composition: [comp(ENEMY_TYPES.NORMAL, 12), comp(ENEMY_TYPES.SWARM, 5)],
        healthMultiplier: 1.15, healthBonus: 0,
        endOfWaveAnnouncement: { text: "Warning:\nFast enemies incoming!", color: '#ffb84d' }
    },
    // Wave 3: A bigger split wave to make the detour more significant.
    {
        interleave: true,
        composition: [comp(ENEMY_TYPES.NORMAL, 10), comp(ENEMY_TYPES.FAST, 12)],
        healthMultiplier: 1.0, healthBonus: 0,
        detourRatio: 0.5,
        endOfWaveAnnouncement: { text: "Warning:\nWe've encountered a bug!", color: '#00e6e6' }

    },
    // Wave 4: A mixed swarm to test splash and single-target prioritization.
    {
        isSwarm: true,
        interleave: true,
        composition: [comp(ENEMY_TYPES.NORMAL, 5), comp(ENEMY_TYPES.SWARM, 15)],
        healthMultiplier: 1.0, healthBonus: 0,
        detourRatio: 1.0,
        endOfWaveAnnouncement: { text: "Warning:\nBulky enemies inbound!", color: '#3446ceff' }
    },
    // Wave 5: Introduce HEAVY enemies, a pure test of single-target damage.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 7)],
        healthMultiplier: 1.1, healthBonus: 30,
    },
    // Wave 6: Introduce HEALERs alongside HEAVY enemies to teach the importance of focus fire.
    {
        interleave: true,
        composition: [comp(ENEMY_TYPES.HEAVY, 6), comp(ENEMY_TYPES.HEALER, 2)],
        healthMultiplier: 1.2, healthBonus: 10,
        detourRatio: 0,
        endOfWaveAnnouncement: { text: "Fliers incoming!", color: '#4fc3f7' }
    },
    // Wave 7: A pure anti-air check with a tough ground-based surprise at the end.
    {
        composition: [comp(ENEMY_TYPES.FLYING, 10), comp(ENEMY_TYPES.HEAVY, 1)],
        healthMultiplier: 1.3, healthBonus: 20,
    },
    // Wave 8: A mix of ground and air to test defense flexibility.
    {
        interleave: true,
        composition: [comp(ENEMY_TYPES.HEAVY, 5), comp(ENEMY_TYPES.HEALER, 2), comp(ENEMY_TYPES.FLYING, 5)],
        healthMultiplier: 1.4, healthBonus: 25,
        endOfWaveAnnouncement: { text: "Unseen threats ahead!\nDetection required.", color: '#BDBDBD' }
    },
    // Wave 9: Test detection and speed simultaneously.
    {
        interleave: true,
        composition: [comp(ENEMY_TYPES.STEALTH, 8), comp(ENEMY_TYPES.FAST, 5)],
        healthMultiplier: 1.1, healthBonus: 10,
        detourRatio: 0.5,
    },
    // Wave 10: A capstone wave for the early game, testing a bit of everything.
    {
        isSwarm: true,
        composition: [comp(ENEMY_TYPES.NORMAL, 12), comp(ENEMY_TYPES.SWARM, 15), comp(ENEMY_TYPES.HEAVY, 1)],
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
        composition: [comp(ENEMY_TYPES.HEAVY, 7), comp(ENEMY_TYPES.HEALER, 3), comp(ENEMY_TYPES.FAST, 7)],
        healthMultiplier: 1.9, healthBonus: 35,
        detourRatio: 1.0,
    },
    // Wave 13: Mixed wave including STEALTH to test layered defenses.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 6), comp(ENEMY_TYPES.HEALER, 2), comp(ENEMY_TYPES.STEALTH, 2), comp(ENEMY_TYPES.FAST, 4)],
        healthMultiplier: 2.2, healthBonus: 35,
        detourRatio: 0.5,
    },
    // Wave 14: Pre-boss wave with a mix of all major threats.
    {
        composition: [
            comp(ENEMY_TYPES.HEAVY, 4), comp(ENEMY_TYPES.HEALER, 2),
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
        composition: [comp(ENEMY_TYPES.BOSS, 1)], // Flutterdash
    },
    // Wave 16: Introduce the Summoner, a slow but persistent threat.
    {
        composition: [comp(ENEMY_TYPES.SUMMONER, 4)],
        healthMultiplier: 2.5, healthBonus: 50,
        endOfWaveAnnouncement: { text: "Warning:\nReality is becoming unstable!", color: '#9333ea' }
    },
    // Wave 17: Introduce Phantoms, testing tracking and burst damage.
    {
        composition: [comp(ENEMY_TYPES.PHANTOM, 8), comp(ENEMY_TYPES.FAST, 10)],
        healthMultiplier: 2.8, healthBonus: 60,
        detourRatio: 0.6,
    },
    // Wave 18: A tricky wave combining Phantoms that teleport and Summoners that create blockers.
    {
        composition: [comp(ENEMY_TYPES.SUMMONER, 2), comp(ENEMY_TYPES.PHANTOM, 6)],
        healthMultiplier: 3.2, healthBonus: 75,
        detourRatio: 0.5,
    },
    // Wave 19: A massive swarm wave to push splash damage towers to their limit.
    {
        isSwarm: true,
        composition: [comp(ENEMY_TYPES.SWARM, 30), comp(ENEMY_TYPES.SPLITTER_MINI, 10)],
        healthMultiplier: 3.0, healthBonus: 40,
        detourRatio: 1.0,
        endOfWaveAnnouncement: { text: "Warning:\nCellular division detected!", color: '#84cc16' }
    },
    // Wave 20: Introduce the Splitter enemy.
    {
        composition: [comp(ENEMY_TYPES.SPLITTER, 10)],
        healthMultiplier: 4.0, healthBonus: 100,
        detourRatio: 0.33,
    },
    // Wave 21: Splitters are now mixed with Heavies, creating a durable, high-density threat.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 6), comp(ENEMY_TYPES.HEALER, 3), comp(ENEMY_TYPES.SPLITTER, 6)],
        healthMultiplier: 4.5, healthBonus: 120,
    },
    // Wave 22: A test of detection and area damage with Stealth and Splitter units.
    {
        composition: [comp(ENEMY_TYPES.STEALTH, 12), comp(ENEMY_TYPES.SPLITTER, 6)],
        healthMultiplier: 4.8, healthBonus: 130,
        detourRatio: 0.5,
    },
    // Wave 23: A chaotic wave featuring all new enemy types together.
    {
        composition: [comp(ENEMY_TYPES.SUMMONER, 2), comp(ENEMY_TYPES.PHANTOM, 5), comp(ENEMY_TYPES.SPLITTER, 5)],
        healthMultiplier: 5.0, healthBonus: 150, // Health multiplier does not affect boss
        detourRatio: 0.4,
    },
    // Wave 24: A challenging air and ground pincer attack.
    {
        composition: [comp(ENEMY_TYPES.FLYING, 15), comp(ENEMY_TYPES.HEAVY, 8), comp(ENEMY_TYPES.HEALER, 4)],
        healthMultiplier: 5.5, healthBonus: 180,
    },
    // Wave 25: A pre-infinite wave with a bit of everything, including stealth.
    {
        composition: [
            comp(ENEMY_TYPES.BOSS, 1),
            comp(ENEMY_TYPES.SUMMONER, 2),
            comp(ENEMY_TYPES.PHANTOM, 4),
            comp(ENEMY_TYPES.SPLITTER, 4)
        ],
        healthMultiplier: 6.5, healthBonus: 250,
        detourRatio: 0.5,
        endOfWaveAnnouncement: { text: "Warning:\nInfinite waves incoming!", color: '#ff4d4d' }
    },
];

// This function creates waves procedurally for endless mode.
export function generateWave(waveNumber) {
    // The wave number to start procedural generation from.
    const proceduralStartWave = 26;

    // Calculate the wave's difficulty based on how far past the start it is.
    const difficultyScale = waveNumber - proceduralStartWave;
    // The basic structure of a generated wave.
    const wave = {
        composition: [],
        healthMultiplier: 6.5 + difficultyScale * 0.5,
        armorMultiplier: 6.5 + difficultyScale * 0.5, // Use the same scaling for armor
        healthBonus: 250 + difficultyScale * 25,
        detourRatio: Math.min(1, 0.5 + difficultyScale * 0.05),
    };

    // Base counts for different enemy types.
    const baseNormal = 15;
    const baseFast = 10;
    const baseHeavy = 5;
    const baseFlying = 4;
    const baseStealth = 3;
    const basePhantom = 2;

    // Add a mix of enemies, increasing their count and difficulty based on the wave number.
    wave.composition.push(comp(ENEMY_TYPES.NORMAL, baseNormal + difficultyScale * 4));
    wave.composition.push(comp(ENEMY_TYPES.FAST, baseFast + difficultyScale * 3));
    wave.composition.push(comp(ENEMY_TYPES.HEAVY, baseHeavy + Math.floor(difficultyScale * 2)));

    // Introduce and scale flying enemies.
    wave.composition.push(comp(ENEMY_TYPES.FLYING, baseFlying + Math.floor(difficultyScale * 1.5)));

    // Introduce and scale stealth enemies.
    wave.composition.push(comp(ENEMY_TYPES.STEALTH, baseStealth + Math.floor(difficultyScale * 1.2)));

    // Introduce and scale phantom enemies.
    wave.composition.push(comp(ENEMY_TYPES.PHANTOM, basePhantom + Math.floor(difficultyScale * 1.1)));

    return wave;
}
