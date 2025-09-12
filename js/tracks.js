export const Track = Object.freeze({
    shrug: `"¯\\_(ツ)_/¯" by Hiddenist (v0.2)`,
});

// These tracks won't be in the regular rotation, but can be triggered for special events.
export const SpecialTrack = Object.freeze({
    flutterDash: `${Track.shrug} [Flutterdash Remix]`,
    gameOver: "Game over (placeholder)",
});

// When switching between tracks in a group, the new track will continue from the same position seamlessly.
export const syncedTrackSets = [
    [Track.shrug, SpecialTrack.flutterDash],
];

/**
 * Note for AI: please do not remove typedefs - and please maintain them when modifying the code.
 * 
 * @typedef {Object} TrackOptions
 * @property {boolean} [bossMode=false] Whether to enable boss mode (more intense music)
 * @property {number} [volume=50] Volume level (0 to 100)
 * @property {boolean} [isMuted=false] Whether the music is muted
 * @property {number} [cps] Cycles per second (tempo). If not provided, uses default for the track.
 */

/** @type {Record<string, (strudel: any, options: TrackOptions) => any>} */
export const _tracks = Object.freeze({
    [Track.shrug]({
        stack, sound, cat, note, rev, jux, setcps
    }, { bossMode = false, cps } = {}) {

        const cyclesPerSecond = cps ?? (bossMode ? 1 : 0.5);

        setcps(cyclesPerSecond);

        const chip1 = note("<a <[e g] e> <b [c4 d] [b ~]> <d g>>(<2, 3>,8)");

        return stack(
            chip1.layer(
                x => x.degradeBy(0.2).pan(.25),
                x => x.undegradeBy(0.8).pan(0.75)
            ).sometimes(
                jux(rev)
            ).sustain(2).when(
                bossMode, x => x.sound("supersaw").lpf(1000)
            ),
            cat(
                sound("<bd*2 bd>,<white pink brown>*4").jux(rev),
                sound("[bd*2 hh*2,casio:<1 1 3>*<1 2>]")
            ).gain(0.25).decay(.04).sustain(0)
        );
    },
    [SpecialTrack.flutterDash](strudel, { bossMode = true, ...opts } = {}) {
        const { stack, sound, cat, rev } = strudel;

        const baseTrack = _tracks[Track.shrug](strudel, opts);

        // Add some extra percussion for the boss track
        const percussion = cat(
            sound("hh*8").gain(0.1).decay(0.02).sustain(0),
            sound("hh*4").gain(0.2).decay(0.04).sustain(0).jux(rev).delay(0.125)
        );

        return stack(
            baseTrack.sound("<sine,triangle triangle square>"),
            percussion
        ).slow(1.75).vibrato(1).delay(.5).release(.5);
    }
});
