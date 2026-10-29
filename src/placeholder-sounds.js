// Self-contained, short previews for boards that do not yet have recordings.
export function startPlaceholderSound(context, { number, kind = 'keyboard', volume = 1, limitMs = 5000, loop = false, onEnded = () => {} }) {
  const seconds = Math.max(0.001, Math.min(kind === 'mouse' ? 0.12 : 0.24, limitMs / 1000));
  const buffer = context.createBuffer(1, Math.max(1, Math.ceil(context.sampleRate * seconds)), context.sampleRate);
  const samples = buffer.getChannelData(0);
  const frequency = kind === 'mouse' ? (number === 1 ? 180 : 280) : 220 * 2 ** (((number - 1) % 27) / 12);
  for (let i = 0; i < samples.length; i++) {
    const time = i / context.sampleRate;
    const phase = i / Math.max(1, samples.length - 1);
    const envelope = Math.min(1, time / .005) * Math.sin(Math.PI * phase) ** 2 * Math.exp(-phase * 3);
    samples[i] = .45 * envelope * (Math.sin(2 * Math.PI * frequency * time) + .15 * Math.sin(4 * Math.PI * frequency * time));
  }
  const source = context.createBufferSource();
  const output = context.createGain();
  source.buffer = buffer;
  source.loop = loop;
  source.connect(output);
  output.connect(context.destination);
  function setVolume(value) { output.gain.setValueAtTime(Math.max(0, Math.min(1, Number(value) || 0)), context.currentTime); }
  setVolume(volume);
  let ended = false;
  source.onended = () => {
    if (ended) return;
    ended = true;
    source.disconnect(); output.disconnect(); onEnded();
  };
  source.start();
  return {
    setVolume,
    setLoop(value) { source.loop = value; },
    stop() { if (!ended) { output.gain.cancelScheduledValues(context.currentTime); output.gain.setValueAtTime(0, context.currentTime); source.stop(); } }
  };
}
