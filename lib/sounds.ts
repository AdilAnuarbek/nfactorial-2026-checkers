let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.08
) {
  const ctx = getCtx();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  amp.gain.value = gain;
  osc.connect(amp);
  amp.connect(ctx.destination);
  const now = ctx.currentTime;
  amp.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

export function playMoveSound() {
  tone(440, 0.08, 'triangle', 0.06);
}

export function playCaptureSound() {
  tone(220, 0.06, 'square', 0.07);
  window.setTimeout(() => tone(330, 0.08, 'square', 0.06), 60);
}

export function playWinSound() {
  [523, 659, 784].forEach((f, i) => {
    window.setTimeout(() => tone(f, 0.15, 'sine', 0.07), i * 120);
  });
}

export function playSelectSound() {
  tone(600, 0.04, 'sine', 0.04);
}
