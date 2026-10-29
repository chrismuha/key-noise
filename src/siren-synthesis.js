// Illustrative audio only: these profiles do not reproduce exact model recordings.
export function startSimulatedSiren(context, siren, { duration, volume, onEnded }) {
  const start = context.currentTime;
  const end = start + duration;
  const seed = [...siren.id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  const frequency = 400 + seed % 180;
  const output = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2400;
  filter.connect(output);
  output.connect(context.destination);
  function setVolume(value) {
    const now = context.currentTime;
    output.gain.cancelScheduledValues(now);
    output.gain.setTargetAtTime(value * 0.18, now, 0.03);
    output.gain.setValueAtTime(value * 0.18, Math.max(now, end - 0.15));
    output.gain.linearRampToValueAtTime(0, end);
  }
  output.gain.setValueAtTime(0, start);
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
  function stop() {
    if (stopped) return;
    stopped = true;
    oscillators.forEach((oscillator) => { oscillator.onended = null; oscillator.stop(); oscillator.disconnect(); });
    filter.disconnect();
    output.disconnect();
    onEnded();
  }
  oscillators[0].onended = stop;
  return { stop, setVolume };
}
