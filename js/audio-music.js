// @ts-ignore This is a valid import! :)
import * as strudel from "https://unpkg.com/@strudel/web@1.2.0/dist/index.mjs";

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

async function loadMusicPlayer() {
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

export async function startMusic() {
    await loadMusicPlayer();
    const { rev, sound, stack, jux, note, cat, n } = strudel;

    const chip = note("<a <[e d] e> <b [c4 d] [b ~]> <d g>>(<2, 3, 1>,8)");

    const beat = cat(
        stack(
            sound("<bd*2 bd>"),
            sound("<white pink brown>*4")
        ).jux(rev),
        sound("[bd*2 hh*2,casio:<1 1 3>*<1 2>]")
    );

    stack(
        chip.layer(
            x => x.degradeBy(0.2).pan(.25),
            x => x.undegradeBy(0.8).pan(0.75)
        ).sometimes(jux(rev)).sustain(2),
        beat.gain(0.25).decay(.04).sustain(0)
    ).play();
}

export function stopMusic() {
    repl?.stop();
}

