// @ts-ignore This is a valid import! :)
import * as strudel from "https://unpkg.com/@strudel/web@1.2.0/dist/index.mjs";

export const Track = Object.freeze({
    shrug: `"¯\\_(ツ)_/¯" by Hiddenist (v0.2)`,
    flutterDash: `"¯\\_(ツ)_/¯" by Hiddenist (vFlutterdash)`,
});

export const syncedTrackSets = [
    [Track.shrug, Track.flutterDash],
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

/** @type {Record<string, (_strudel: typeof strudel, options: TrackOptions) => any>} */
const tracks = Object.freeze({
    [Track.shrug]({
        stack, sound, cat, note, rev, jux
    }, { bossMode = false, cps } = {}) {

        const cyclesPerSecond = cps ?? (bossMode ? 1 : 0.5);

        repl.setCps(cyclesPerSecond);

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
    [Track.flutterDash]({
        stack, sound, cat, rev,
    }, { bossMode = true, ...opts } = {}) {
        const baseTrack = tracks[Track.shrug](strudel, opts);

        // Add some extra percussion for the boss track
        const percussion = cat(
            sound("hh*8").gain(0.1).decay(0.02).sustain(0),
            sound("hh*4").gain(0.2).decay(0.04).sustain(0).jux(rev).delay(0.125)
        );

        return stack(
            baseTrack,
            percussion
        ).slow(1.75).vibrato(1).delay(.5).release(.5);
    }
});

const defaultTrackName = (
    Object.keys(tracks)[0]
);

/** @type {any} */
let repl;
async function initStrudel(options = {}) {
    const { global = true, prebake, ...replOptions } = options;
    const register = global ? strudel.defaultPrebake : () => strudel.registerSynthSounds();
    strudel.initAudioOnFirstClick();
    strudel.miniAllStrings();
    repl = await strudel.webaudioRepl({ ...replOptions, transpiler: strudel.transpiler });
    await register();
    await prebake?.();
    strudel.setTime(() => repl.scheduler.now());
    return repl;
};

export let isMusicPlayerLoaded = false;

async function loadMusicPlayerIfNotLoaded() {
    if (isMusicPlayerLoaded) return;

    await initStrudel({ global: false }).then(async () => {
        // Load only the samples we need from the Dirt-Samples repository
        await strudel.samples({
            bd: ['bd/BT0A0A7.wav', 'bd/BT0AADA.wav'],
            hh: ['hh/000_hh3closedhh.wav', 'hh/001_hh3openhh.wav'],
            casio: ['casio/high.wav', 'casio/low.wav', 'casio/noise.wav'],
        }, 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/');

        isMusicPlayerLoaded = true;

        strudel.Pattern.prototype.play = function () {
            repl.setPattern(this, true);
            return this;
        };
    });
}


let lastPlayedTrack = null;
/**
 * @param {string} trackName 
 * @param {TrackOptions} options 
 */
export async function startMusic(trackName = defaultTrackName, options) {
    await loadMusicPlayerIfNotLoaded();

    let trackCb = tracks[trackName];

    if (!trackCb) {
        console.warn(`Track "${trackName}" not found, falling back to default track "${defaultTrackName}"`);
        trackCb = tracks[defaultTrackName];
    }

    const syncsWithLast = shouldTracksSync(trackName, lastPlayedTrack);
    if (!syncsWithLast) {
        stopMusic();
    }
    lastPlayedTrack = trackName;

    const gain = options.isMuted ? 0 : (options.volume ?? 50) / 100;

    console.debug(`Playing track "${trackName}" with options:`, options, `=> gain: ${gain}`);

    trackCb(strudel, options).gain(gain).play();
}

function shouldTracksSync(newTrack, oldTrack) {
    if (!newTrack || !oldTrack) return false;
    if (newTrack === oldTrack) return true;

    for (const trackSet of syncedTrackSets) {
        if (trackSet.includes(newTrack) && trackSet.includes(oldTrack)) {
            return true;
        }
    }
    return false;
}

/**
 * This stops the music player entirely. When it starts again, it will start from the beginning of the track.
 */
export function stopMusic() {
    repl?.stop();
}

