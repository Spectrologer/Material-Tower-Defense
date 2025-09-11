// @ts-ignore
import { evaluate } from 'https://cdn.jsdelivr.net/npm/@strudel.cycles/core@0.10.0/dist/index.mjs';
// @ts-ignore
import { webAudio } from 'https://cdn.jsdelivr.net/npm/@strudel.cycles/webaudio@0.10.0/dist/index.mjs';

// We'll hold the music instance here
let musicInstance = null;
let isMusicPlaying = false;

// The strudel code for the song you provided
const strudelCode = `
// "¯\\_(ツ)_/¯" @by Hiddenist
// @version 0.1

setcps(1)

const chip1 = note("<a <[e d] e> <b [c4 d] [b ~]> <d g>>(<2, 3>,8)")

$: chip1.layer(
  x => x.degradeBy(0.2).pan(.25),
  x => x.undegradeBy(0.8).pan(0.75)
).sometimes(jux(rev)).sustain(2)
  // .off(1/8, x=>x.add(2))
  ._scope()

$: cat(
  sound("<bd*2 bd>,<white pink brown>*4").jux(rev),
  sound("[bd*2 hh*2,casio:<1 1 3>*<1 2>]")
)
.gain(0.25).decay(.04).sustain(0)._scope()
`;

/**
 * Starts playing the background music using Strudel.
 */
async function playBackgroundMusic() {
    if (musicInstance) {
        musicInstance.stop();
    }
    // Evaluate the strudel code to get a playable instance
    musicInstance = await evaluate(strudelCode, [webAudio()]);
    isMusicPlaying = true;
}

/**
 * Stops the background music.
 */
function stopBackgroundMusic() {
    if (musicInstance) {
        musicInstance.stop();
        musicInstance = null;
        isMusicPlaying = false;
    }
}

/**
 * Toggles the background music on and off.
 */
export function toggleMusic() {
    if (isMusicPlaying) {
        stopBackgroundMusic();
    } else {
        playBackgroundMusic();
    }
    return isMusicPlaying;
}

