// Generates a short, restrained two-tone chime via Web Audio. No assets, no
// network. Designed to read as "ping" through kitchen noise without being
// jarring. The audio context is lazily created on first call so we don't
// trigger autoplay restrictions until the user has interacted.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) return null;
  ctx = new AudioCtor();
  return ctx;
}

interface ChimeOptions {
  volume?: number; // 0..1
}

export function playNewOrderChime({ volume = 0.25 }: ChimeOptions = {}): void {
  const audio = getCtx();
  if (!audio) return;
  // Resume if the context was suspended (some browsers start it suspended).
  if (audio.state === 'suspended') {
    void audio.resume();
  }
  const now = audio.currentTime;
  const tones = [
    { freq: 880, start: 0, dur: 0.12 },
    { freq: 1320, start: 0.14, dur: 0.18 },
  ];
  for (const t of tones) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = t.freq;
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(volume, now + t.start + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + t.start + t.dur,
    );
    osc.connect(gain).connect(audio.destination);
    osc.start(now + t.start);
    osc.stop(now + t.start + t.dur + 0.05);
  }
}

export function primeAudio(): void {
  // Call this after a user gesture (e.g. PIN entry) so the chime fires
  // reliably the first time without being blocked by autoplay policy.
  const audio = getCtx();
  if (audio && audio.state === 'suspended') {
    void audio.resume();
  }
}
