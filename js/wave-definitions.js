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
        healthMultiplier: 1.1, healthBonus: 15,
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
        composition: [comp(ENEMY_TYPES.FLYING, 7)],
        healthMultiplier: 1.3, healthBonus: 15,
    },
    // Wave 8: A mix of ground and air to test defense flexibility.
    {
        composition: [comp(ENEMY_TYPES.HEAVY, 5), comp(ENEMY_TYPES.FLYING, 5)],
        healthMultiplier: 1.4, healthBonus: 15,
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
            comp(ENEMY_TYPES.FLYING, 4),
            comp(ENEMY_TYPES.SWARM, 4),
            comp(ENEMY_TYPES.STEALTH, 4)
        ],
        healthMultiplier: 2, healthBonus: 10,
        detourRatio: 0.75,
        endOfWaveAnnouncement: { text: "ALERT:\nFLUTTERDASH APPROACHING!", color: '#f542e9ff' }
    },
    // Wave 15: The Final Boss
    {
        isBoss: true,
        composition: [comp(ENEMY_TYPES.BOSS, 1)],
        endOfWaveAnnouncement: { text: "ALERT:\nWho invited symbols!?", color: '#cb83ffff' }

    },
    // Wave 16: Special Proust Wave
    {
        isSpecial: 'PROUST',
        duration: 120, // seconds
        health: 20000,
        text: "For a long time, I went to bed early. Sometimes, my candle barely out, my eyes would close so quickly that I did not have time to tell myself: “I’m falling asleep.” And half an hour later the thought that it was time to look for sleep would awaken me; I would make as if to put away the book which I imagined was still in my hands, and to blow out the light; I had not ceased while sleeping to form reflections on what I had just read, but these reflections had taken a rather peculiar turn; it seemed to me that I myself was what the book was talking about: a church, a quartet, the rivalry between François I and Charles V. This belief would survive for a few seconds after my waking; it did not shock my reason but lay heavy like scales on my eyes and kept them from realizing that the candlestick was no longer lit. Then it would begin to seem unintelligible to me, as after metempsychosis do the thoughts of an earlier existence; the subject of the book would separate itself from me, I was free to apply myself to it or not; immediately I would recover my sight and I would be astonished to find a darkness around me, soft and restful for my eyes, but perhaps even more so for my mind, to which it appeared as a thing without cause, incomprehensible, a thing truly dark. I would ask myself what time it could be; I could hear the whistling of trains, which, now nearer and now farther off, punctuating the distance like the note of a bird in a forest, showed me the extent of the deserted countryside where the traveler is hurrying toward the nearest station; and the little path that he is following will be engraved on his memory by the excitement that he owes to new places, to unaccustomed activities, to the recent conversation and the farewells under the unfamiliar lamp that are still following him into the silence of the night, to the imminent sweetness of the return.",
        endOfWaveAnnouncement: { text: "The text has been vanquished!", color: '#f5e5c7' }
    },
];

