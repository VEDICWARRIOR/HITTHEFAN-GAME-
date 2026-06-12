let audioCtx = null;
let masterGain = null;
let fanOscillator = null;
let fanOscillatorB = null; // for dual detuning
let fanModulator = null;   // for FM synthesis
let fanNoise = null;
let fanGain = null;
let fanFilter = null;
let isMuted = false;
let isInitialized = false;
let activeFanId = 'classic';

export function initAudio() {
  console.log('Audio module ready (will init on first tap)');
}

export function ensureAudioContext() {
  if (isInitialized) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = isMuted ? 0 : 0.95;
    masterGain.connect(audioCtx.destination);
    isInitialized = true;
  } catch (e) {
    console.warn('Web Audio API not supported:', e);
  }
}

export function startFanSound(fanId = 'classic') {
  if (!isInitialized || fanOscillator) return;
  activeFanId = fanId;
  try {
    fanGain = audioCtx.createGain();
    fanGain.gain.value = 0;
    fanGain.connect(masterGain);

    fanFilter = audioCtx.createBiquadFilter();
    fanFilter.connect(fanGain);

    // Setup custom oscillators and filters depending on the fan archetype
    if (fanId === 'classic') {
      // Classic hum: sawtooth wave + lowpass filter
      fanOscillator = audioCtx.createOscillator();
      fanOscillator.type = 'sawtooth';
      fanOscillator.frequency.value = 52;
      
      fanFilter.type = 'lowpass';
      fanFilter.frequency.value = 260;
      fanFilter.Q.value = 1.8;
      
      fanOscillator.connect(fanFilter);
      fanOscillator.start();

      // Mechanical wind noise
      fanNoise = _noiseSource(2);
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 180;
      noiseFilter.Q.value = 0.8;
      fanNoise.connect(noiseFilter);
      noiseFilter.connect(fanGain);
      fanNoise.loop = true;
      fanNoise.start();

    } else if (fanId === 'carbon') {
      // Carbon: triangle wave + bandpass filter (high-pitched lightweight whistle)
      fanOscillator = audioCtx.createOscillator();
      fanOscillator.type = 'triangle';
      fanOscillator.frequency.value = 75;

      fanFilter.type = 'bandpass';
      fanFilter.frequency.value = 450;
      fanFilter.Q.value = 1.2;

      fanOscillator.connect(fanFilter);
      fanOscillator.start();

      fanNoise = _noiseSource(2.5);
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 600;
      fanNoise.connect(noiseFilter);
      noiseFilter.connect(fanGain);
      fanNoise.loop = true;
      fanNoise.start();

    } else if (fanId === 'hazard') {
      // Hazard: heavy square wave hum + rattle LFO
      fanOscillator = audioCtx.createOscillator();
      fanOscillator.type = 'square';
      fanOscillator.frequency.value = 42;

      fanFilter.type = 'lowpass';
      fanFilter.frequency.value = 170;
      fanFilter.Q.value = 3.8; // High resonance rattle

      fanOscillator.connect(fanFilter);
      fanOscillator.start();

      // Low frequency modulator for rattling motor speed
      fanModulator = audioCtx.createOscillator();
      fanModulator.type = 'sine';
      fanModulator.frequency.value = 12; // LFO 12Hz rattle
      const modulatorGain = audioCtx.createGain();
      modulatorGain.gain.value = 8;
      fanModulator.connect(modulatorGain);
      modulatorGain.connect(fanOscillator.frequency);
      fanModulator.start();

    } else if (fanId === 'neon') {
      // Neon: Futuristic FM Plasma Hum (sine wave carrier + carrier frequency modulator)
      fanOscillator = audioCtx.createOscillator();
      fanOscillator.type = 'sine';
      fanOscillator.frequency.value = 85;

      fanFilter.type = 'bandpass';
      fanFilter.frequency.value = 700;
      fanFilter.Q.value = 2.0;

      fanOscillator.connect(fanFilter);
      fanOscillator.start();

      // FM Modulator
      fanModulator = audioCtx.createOscillator();
      fanModulator.type = 'sine';
      fanModulator.frequency.value = 170; // Double frequency
      const fmGain = audioCtx.createGain();
      fmGain.gain.value = 60;
      fanModulator.connect(fmGain);
      fmGain.connect(fanOscillator.frequency);
      fanModulator.start();

    } else if (fanId === 'vortex') {
      // Vortex: Heavy noise-sweep + dual detuned triangles (intense jet engine style)
      fanOscillator = audioCtx.createOscillator();
      fanOscillator.type = 'sawtooth';
      fanOscillator.frequency.value = 60;

      fanOscillatorB = audioCtx.createOscillator();
      fanOscillatorB.type = 'triangle';
      fanOscillatorB.frequency.value = 60.5;

      fanFilter.type = 'lowpass';
      fanFilter.frequency.value = 320;
      fanFilter.Q.value = 2.2;

      fanOscillator.connect(fanFilter);
      fanOscillatorB.connect(fanFilter);
      fanOscillator.start();
      fanOscillatorB.start();

      // Heavy jet noise
      fanNoise = _noiseSource(1.5);
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'peaking';
      noiseFilter.frequency.value = 200;
      noiseFilter.Q.value = 1.5;
      noiseFilter.gain.value = 12;
      fanNoise.connect(noiseFilter);
      noiseFilter.connect(fanGain);
      fanNoise.loop = true;
      fanNoise.start();

    } else if (fanId === 'quantum') {
      // Quantum: Dual detuned super-saw oscillators + FM sweep (nuclear reactor reactor sound)
      fanOscillator = audioCtx.createOscillator();
      fanOscillator.type = 'sawtooth';
      fanOscillator.frequency.value = 100;

      fanOscillatorB = audioCtx.createOscillator();
      fanOscillatorB.type = 'sawtooth';
      fanOscillatorB.frequency.value = 101.8; // Detuned

      fanFilter.type = 'lowpass';
      fanFilter.frequency.value = 500;
      fanFilter.Q.value = 4.5; // High sweep resonance

      fanOscillator.connect(fanFilter);
      fanOscillatorB.connect(fanFilter);
      
      fanOscillator.start();
      fanOscillatorB.start();

      // FM modulator for reactor modulation
      fanModulator = audioCtx.createOscillator();
      fanModulator.type = 'sine';
      fanModulator.frequency.value = 35;
      const fmGain = audioCtx.createGain();
      fmGain.gain.value = 150;
      fanModulator.connect(fmGain);
      fmGain.connect(fanOscillator.frequency);
      fmGain.connect(fanOscillatorB.frequency);
      fanModulator.start();
    }

  } catch (e) {
    console.warn('Could not start fan sound:', e);
  }
}

export function updateFanSound(rpm, maxRPM = 10000) {
  if (!fanOscillator || !fanGain || !fanFilter) return;
  
  const pct = Math.min(1, rpm / maxRPM);
  const t = audioCtx.currentTime;

  if (activeFanId === 'classic') {
    const freq = 52 + pct * 180 + Math.sin(t * 18) * pct * 6;
    fanOscillator.frequency.setTargetAtTime(freq, t, 0.08);
    fanFilter.frequency.setTargetAtTime(260 + pct * 900, t, 0.1);
    fanGain.gain.setTargetAtTime(0.03 + pct * 0.16, t, 0.08);

  } else if (activeFanId === 'carbon') {
    const freq = 75 + pct * 240 + Math.sin(t * 22) * pct * 4;
    fanOscillator.frequency.setTargetAtTime(freq, t, 0.06);
    fanFilter.frequency.setTargetAtTime(450 + pct * 1800, t, 0.08);
    fanGain.gain.setTargetAtTime(0.025 + pct * 0.12, t, 0.06);

  } else if (activeFanId === 'hazard') {
    const freq = 42 + pct * 130;
    fanOscillator.frequency.setTargetAtTime(freq, t, 0.1);
    fanFilter.frequency.setTargetAtTime(170 + pct * 600, t, 0.12);
    fanGain.gain.setTargetAtTime(0.04 + pct * 0.22, t, 0.09);
    if (fanModulator) {
      fanModulator.frequency.setTargetAtTime(12 + pct * 28, t, 0.1);
    }

  } else if (activeFanId === 'neon') {
    const freq = 85 + pct * 280;
    fanOscillator.frequency.setTargetAtTime(freq, t, 0.05);
    fanFilter.frequency.setTargetAtTime(700 + pct * 1600, t, 0.06);
    fanGain.gain.setTargetAtTime(0.02 + pct * 0.14, t, 0.07);
    if (fanModulator) {
      fanModulator.frequency.setTargetAtTime(170 + pct * 560, t, 0.05);
    }

  } else if (activeFanId === 'vortex') {
    const freq = 60 + pct * 220;
    fanOscillator.frequency.setTargetAtTime(freq, t, 0.07);
    fanOscillatorB.frequency.setTargetAtTime(freq + 0.5, t, 0.07);
    fanFilter.frequency.setTargetAtTime(320 + pct * 1400, t, 0.1);
    fanGain.gain.setTargetAtTime(0.035 + pct * 0.2, t, 0.08);

  } else if (activeFanId === 'quantum') {
    const freq = 100 + pct * 450;
    fanOscillator.frequency.setTargetAtTime(freq, t, 0.05);
    if (fanOscillatorB) fanOscillatorB.frequency.setTargetAtTime(freq * 1.015, t, 0.05);
    fanFilter.frequency.setTargetAtTime(500 + pct * 2800, t, 0.06);
    fanGain.gain.setTargetAtTime(0.025 + pct * 0.18, t, 0.07);
    if (fanModulator) {
      fanModulator.frequency.setTargetAtTime(35 + pct * 120, t, 0.05);
    }
  }
}

export function stopFanSound() {
  [fanOscillator, fanOscillatorB, fanModulator, fanNoise].forEach((source) => {
    if (!source) return;
    try {
      source.stop();
    } catch (_) {}
  });
  fanOscillator = null;
  fanOscillatorB = null;
  fanModulator = null;
  fanNoise = null;
  fanGain = null;
  fanFilter = null;
}

export function playTapSound(taps = 1, speedPct = 0, fanId = 'classic') {
  if (!isInitialized) return;

  const t = audioCtx.currentTime;

  if (fanId === 'classic') {
    const pitch = 400 + Math.min(800, taps * 10) + speedPct * 300 + Math.random() * 80;
    _tone({ frequency: pitch, duration: 0.05, gain: 0.05, type: 'triangle' });
    if (taps % 8 === 0) _tone({ frequency: pitch * 1.4, duration: 0.04, gain: 0.03, type: 'sine' });

  } else if (fanId === 'carbon') {
    // Carbon: high-pitched digital click
    const pitch = 800 + Math.min(1200, taps * 15) + speedPct * 400 + Math.random() * 100;
    _tone({ frequency: pitch, duration: 0.035, gain: 0.04, type: 'triangle' });
    _tone({ frequency: pitch * 2, duration: 0.02, gain: 0.025, type: 'sine' });

  } else if (fanId === 'hazard') {
    // Hazard: heavy clonk sound
    const pitch = 180 + Math.min(500, taps * 6) + speedPct * 200 + Math.random() * 50;
    _tone({ frequency: pitch, duration: 0.08, gain: 0.08, type: 'sawtooth' });
    _tone({ frequency: pitch * 1.5, duration: 0.06, gain: 0.04, type: 'triangle' });

  } else if (fanId === 'neon') {
    // Neon: futuristic synthesizer zap
    const pitch = 600 + Math.min(2000, taps * 25) + Math.random() * 150;
    _tone({ frequency: pitch, endFrequency: pitch * 0.4, duration: 0.065, gain: 0.04, type: 'sine' });

  } else if (fanId === 'vortex') {
    // Vortex: heavy whipping wind sound
    const pitch = 300 + Math.min(900, taps * 12) + speedPct * 300;
    _tone({ frequency: pitch, endFrequency: pitch * 1.3, duration: 0.055, gain: 0.045, type: 'triangle' });

  } else if (fanId === 'quantum') {
    // Quantum: electricity spark discharge
    const pitch = 1200 + Math.random() * 400;
    _tone({ frequency: pitch, endFrequency: 80, duration: 0.045, gain: 0.03, type: 'sine' });
    _tone({ frequency: pitch * 1.8, endFrequency: 200, duration: 0.03, gain: 0.025, type: 'sawtooth' });
  }
}

export function playWarningBeep() {
  if (!isInitialized) return;
  _tone({ frequency: 620, duration: 0.085, gain: 0.06, type: 'square' });
  setTimeout(() => _tone({ frequency: 460, duration: 0.1, gain: 0.05, type: 'square' }), 70);
}

export function playDestroySound() {
  if (!isInitialized) return;
  try {
    const noise = _noiseSource(1.2);
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.4;
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.1);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500;
    filter.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 1.0);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();

    // Shattering tones depending on active fan
    if (activeFanId === 'classic' || activeFanId === 'hazard') {
      _tone({ frequency: 90, endFrequency: 20, duration: 0.7, gain: 0.3, type: 'sawtooth' });
      setTimeout(() => _tone({ frequency: 160, endFrequency: 30, duration: 0.5, gain: 0.15, type: 'sawtooth' }), 80);
    } else if (activeFanId === 'neon' || activeFanId === 'quantum') {
      // High tech implode
      _tone({ frequency: 800, endFrequency: 40, duration: 0.6, gain: 0.25, type: 'sine' });
      _tone({ frequency: 1200, endFrequency: 20, duration: 0.8, gain: 0.18, type: 'triangle' });
    } else {
      _tone({ frequency: 200, endFrequency: 30, duration: 0.6, gain: 0.25, type: 'triangle' });
    }
  } catch (_) {}
}

export function playUpgradeSound() {
  if (!isInitialized) return;
  _tone({ frequency: 440, duration: 0.08, gain: 0.06, type: 'sine' });
  setTimeout(() => _tone({ frequency: 660, duration: 0.09, gain: 0.06, type: 'sine' }), 80);
  setTimeout(() => _tone({ frequency: 880, duration: 0.12, gain: 0.055, type: 'triangle' }), 160);
}

export function playSelectSound() {
  if (!isInitialized) return;
  _tone({ frequency: 650, duration: 0.06, gain: 0.045, type: 'triangle' });
}

export function toggleMute() {
  isMuted = !isMuted;
  if (masterGain) {
    masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.95, audioCtx.currentTime, 0.05);
  }
  return isMuted;
}

export function getMuted() {
  return isMuted;
}

function _tone({ frequency, endFrequency, duration, gain, type }) {
  try {
    const osc = audioCtx.createOscillator();
    const node = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, audioCtx.currentTime + duration);
    node.gain.value = gain;
    node.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(node);
    node.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

function _noiseSource(seconds) {
  const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * seconds));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.6));
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  return source;
}
