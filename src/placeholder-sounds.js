// Self-contained, short previews for boards that do not yet have recordings.
export function startPlaceholderSound(context, { number, kind = 'keyboard', volume = 1, limitMs = 5000, loop = false, held = false, onEnded = () => {} }) {
  const naturalLength = kind === 'mouse' ? 0.12 : 0.24;
  const seconds = held ? naturalLength : Math.max(0.001, Math.min(naturalLength, limitMs / 1000));
  const buffer = context.createBuffer(1, Math.max(1, Math.ceil(context.sampleRate * seconds)), context.sampleRate);
  const samples = buffer.getChannelData(0);
  const frequency = kind === 'mouse' ? (number === 1 ? 180 : 280) : 220 * 2 ** (((number - 1) % 27) / 12);
  const toneFrequency = Math.round(frequency * seconds) * context.sampleRate / samples.length;
  for (let i = 0; i < samples.length; i++) {
    const time = i / context.sampleRate;
    const envelope = held ? 1 : Math.max(0, Math.min(1, time / .015, (samples.length - 1 - i) / context.sampleRate / .04));
    samples[i] = .30 * envelope * (Math.sin(2 * Math.PI * toneFrequency * time) + .15 * Math.sin(4 * Math.PI * toneFrequency * time));
  }
  const source = context.createBufferSource();
  const output = context.createGain();
  source.buffer = buffer;
  source.loop = held || loop;
  source.connect(output);
  output.connect(context.destination);
  function setVolume(value) { output.gain.setValueAtTime(Math.max(0, Math.min(1, Number(value) || 0)), context.currentTime); }
  setVolume(volume);
  if (held) {
    const level = output.gain.value;
    output.gain.setValueAtTime(0, context.currentTime);
    output.gain.linearRampToValueAtTime(level, context.currentTime + .015);
  }
  let ended = false;
  source.onended = () => {
    if (ended) return;
    ended = true;
    source.disconnect(); output.disconnect(); onEnded();
  };
  source.start();
  return {
    setVolume,
    setLoop(value) { source.loop = held || value; },
    release() {
      if (ended) return;
      output.gain.cancelScheduledValues(context.currentTime);
      output.gain.setValueAtTime(output.gain.value, context.currentTime);
      output.gain.linearRampToValueAtTime(0, context.currentTime + .04);
      source.stop(context.currentTime + .04);
    },
    stop() { if (!ended) { output.gain.cancelScheduledValues(context.currentTime); output.gain.setValueAtTime(0, context.currentTime); source.stop(); } }
  };
}
