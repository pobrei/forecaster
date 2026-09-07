/**
 * Procedural Audio FX for Tactile UI (Web Audio API)
 * Synthesizes subtle mechanical clicks, tab switches, and archival paper sounds
 * Completely self-contained with no external sound asset dependencies.
 */

let audioCtx: AudioContext | null = null;
const AUDIO_MUTE_KEY = 'forecaster_ui_sound_muted';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isAudioMuted(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(AUDIO_MUTE_KEY);
    // Default to unmuted (or true if user toggles off)
    return stored === 'true';
  } catch {
    return true;
  }
}

export function setAudioMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIO_MUTE_KEY, muted ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('forecaster-audio-toggle', { detail: { muted } }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Subtle tactile mechanical micro-click (like a vintage camera or dossier latch)
 */
export function playTactileClick(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.012);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.012);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.015);
  } catch {
    // Fail silently on restricted autoplay
  }
}

/**
 * Crisp tab slide / dossier flip sound
 */
export function playDossierFlip(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Noise buffer for paper texture
    const bufferSize = ctx.sampleRate * 0.025; // 25ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, ctx.currentTime);
    filter.Q.setValueAtTime(2.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.026);
  } catch {
    // Fail silently
  }
}

/**
 * Meteorological satellite telemetry beep
 */
export function playTelemetryChirp(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.02); // E6

    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.065);
  } catch {
    // Fail silently
  }
}
