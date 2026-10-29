// Illustrative audio only: these profiles do not reproduce exact model recordings.
export function startSimulatedSiren(context, siren, { duration, volume, onEnded, destination = context.destination }) {
  const start = context.currentTime;
  const end = start + duration;
  const seed = [...siren.id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  const frequency = 400 + seed % 180;
  const output = context.createGain();
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2400;
  filter.connect(envelope);
  envelope.connect(output);
  output.connect(destination);
  // Normalize the two voices and fade the waveform itself, independently of volume.
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(0.5, start + 0.02);
  envelope.gain.setValueAtTime(0.5, end - 0.02);
  envelope.gain.linearRampToValueAtTime(0, end);
  function setVolume(value) {
    const normalized = Math.max(0, Math.min(1, Number(value) || 0));
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setValueAtTime(normalized, context.currentTime);
  }
  setVolume(volume);
  const oscillators = [1, /1000T|1003|STL|2T/.test(siren.model) ? 1.25 : 1.5].map((ratio) => {
    const oscillator = context.createOscillator();
    oscillator.type = siren.type === 'Electronic' ? 'sine' : 'sawtooth';
    for (let t = 0; t <= duration; t += 0.05) {
      const sweep = 0.45 + 0.55 * (1 - Math.cos(t * Math.PI / 2)) / 2;
      oscillator.frequency.linearRampToValueAtTime(frequency * ratio * sweep, start + t);
    }
    oscillator.connect(filter);
    oscillator.start(start);
    oscillator.stop(end);
    return oscillator;
  });
  let stopped = false;
  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    oscillators.forEach((oscillator) => { oscillator.onended = null; oscillator.disconnect(); });
    filter.disconnect();
    envelope.disconnect();
    output.disconnect();
    onEnded();
  }
  function stop() {
    if (stopped || cleaned) return;
    stopped = true;
    const now = context.currentTime;
    // Hold the current envelope before fading, so stopping never cuts a waveform abruptly.
    envelope.gain.cancelAndHoldAtTime(now);
    envelope.gain.linearRampToValueAtTime(0, now + 0.015);
    oscillators.forEach(oscillator => oscillator.stop(now + 0.02));
  }
  oscillators[0].onended = cleanup;
  return { stop, setVolume };
}
