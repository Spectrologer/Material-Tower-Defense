
const audioContext = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)();

let isSoundEnabled = true;
let isAudioResumed = false;

export function toggleSoundEnabled() {
    isSoundEnabled = !isSoundEnabled;
    return isSoundEnabled;
}

// This function will be called on the first user interaction to enable audio.
export function resumeAudioContext() {
    if (!isAudioResumed && audioContext.state === 'suspended') {
        audioContext.resume();
        isAudioResumed = true;
    }
}

export function playMoneySound() {
    if (!isSoundEnabled) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const volume = 0.05;
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

export function playHitSound() {
    if (!isSoundEnabled) return;
    const now = audioContext.currentTime;
    const duration = 0.08;
    const osc = audioContext.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(220, now + duration);
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + duration);
}

export function playExplosionSound() {
    if (!isSoundEnabled) return;
    const now = audioContext.currentTime;
    const duration = 0.5;

    // White noise for the explosion "hiss"
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    // Low-pass filter to make it sound "boomy"
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(100, now + duration * 0.7);

    // A fast volume envelope for the "boom"
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.02); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Slower decay

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    noise.start(now);
    noise.stop(now + duration);
}

export function playWiggleSound() {
    if (!isSoundEnabled) return;

    const now = audioContext.currentTime;
    const duration = 0.35;

    // Main sound source
    const osc = audioContext.createOscillator();
    osc.type = 'sine';

    // Pitch envelope - a strained, rising-then-falling groan
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.1);


    // LFO for vibrato (makes it shaky and "organic")
    const lfo = audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(6, now); // Uncomfortably fast vibrato

    // Gain node to control the depth of the vibrato
    const lfoGain = audioContext.createGain();
    lfoGain.gain.setValueAtTime(10, now); // How much the pitch wavers

    // Distortion for a strained, gritty quality
    const distortion = audioContext.createWaveShaper();
    const k = 10; // More aggressive distortion
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
        const x = i * 2 / n_samples - 1;
        curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
    }
    distortion.curve = curve;
    distortion.oversample = '4x';

    // Master volume envelope for the sound
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.03, now + 0.05); // Fade in
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Fade out

    // Connect the nodes together
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency); // FIX: Connect the gain node itself, not its gain property
    osc.connect(distortion);
    distortion.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start and stop the sound
    lfo.start(now);
    lfo.stop(now + duration);
    osc.start(now);
    osc.stop(now + duration);
}

export function playCrackSound() {
    if (!isSoundEnabled) return;
    const now = audioContext.currentTime;
    const duration = 0.15;

    // White noise source for the "crack"
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;

    // A bandpass filter to shape the noise into a "crack"
    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, now);
    filter.Q.setValueAtTime(10, now);

    // A fast volume envelope to make it sharp
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Fast decay

    // Connect nodes and play
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    noise.start(now);
    noise.stop(now + duration);
}

export function playLifeLostSound() {
    if (!isSoundEnabled) return;
    const now = audioContext.currentTime;
    const duration = 0.3;
    const osc = audioContext.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + duration);
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + duration);
}
