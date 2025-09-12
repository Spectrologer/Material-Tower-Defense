// @ts-ignore This is a valid import! :)
import * as _strudel from "https://unpkg.com/@strudel/web@1.2.0/dist/index.mjs";

import { syncedTrackSets, _tracks } from "./tracks.js";
/** @typedef {import("./tracks.js").TrackOptions} TrackOptions */

const defaultTrackName = (
    Object.keys(_tracks)[0]
);

const strudel = { ..._strudel };

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

        strudel.setcps = function (cps) {
            repl.setCps(cps);
        };
    });
}


let lastPlayedTrack = null;
/**
 * @param {string} trackName 
 * @param {TrackOptions} options 
 */
export async function loadTrack(trackName = defaultTrackName, options) {
    await loadMusicPlayerIfNotLoaded();

    let trackCb = _tracks[trackName];

    if (!trackCb) {
        console.warn(`Track "${trackName}" not found, falling back to default track "${defaultTrackName}"`);
        trackCb = _tracks[defaultTrackName];
    }

    const syncsWithLast = shouldTracksSync(trackName, lastPlayedTrack);
    if (!syncsWithLast) {
        stopTrack();
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
export function stopTrack() {
    repl?.stop();
}

