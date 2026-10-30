// Coast a snapshot of the actual recording. No oscillator replaces its timbre.
export async function loadRecordedBuffer(context, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load the recording');
  return context.decodeAudioData(await response.arrayBuffer());
}
const smooth = value => {
  const phase = Math.max(0, Math.min(1, value));
  return phase * phase * (3 - 2 * phase);
};
const coastCurve = progress => 1 - smooth(progress);

export function startRecordedMotor(context, recording, {
  position, destination = context.destination, held = false, onEnded,
  setTimer = setTimeout, clearTimer = clearTimeout
}) {
  const rate = recording.sampleRate;
  // A recent, short grain follows the pitch at release instead of another
  // recording's full-speed ending. Blend the loop seam to avoid a click.
  const end = Math.min(recording.length, Math.max(2, Math.round(rate * .04), Math.round(position * rate)));
  const length = Math.min(end, Math.max(2, Math.round(rate * .12)));
  const overlap = Math.max(1, Math.min(Math.round(rate * .008), Math.floor(length / 4)));
  const grain = context.createBuffer(recording.numberOfChannels, length - overlap, rate);
  for (let channel = 0; channel < recording.numberOfChannels; channel++) {
    const input = recording.getChannelData(channel);
    const output = grain.getChannelData(channel);
    const start = end - length;
    for (let i = 0; i < output.length; i++) {
      const blend = i / overlap;
      output[i] = i < overlap
        ? input[start + length - overlap + i] * (1 - blend) + input[start + i] * blend
        : input[start + i];
    }
  }
  const source = context.createBufferSource();
  const envelope = context.createGain();
  const output = context.createGain();
  source.buffer = grain;
  source.loop = true;
  source.connect(envelope);
  envelope.connect(output);
  output.connect(destination);
  let closed = false;
  let timer;
  let motion = () => 1;
  let endsAt = Infinity;
  let generation = 0;
  const speed = () => Math.max(0, Math.min(1, motion(context.currentTime)));
  function hold() {
    source.playbackRate.cancelAndHoldAtTime(context.currentTime);
    envelope.gain.cancelAndHoldAtTime(context.currentTime);
  }
  function schedule(seconds, atSpeed) {
    const start = context.currentTime;
    const steps = Math.max(1, Math.ceil(seconds / .04));
    for (let step = 0; step <= steps; step++) {
      const t = seconds * step / steps;
      const value = Math.max(0, atSpeed(t));
      source.playbackRate.linearRampToValueAtTime(Math.max(.001, value), start + t);
      envelope.gain.linearRampToValueAtTime(Math.pow(value, .8), start + t);
    }
  }
  function stop() {
    if (closed) return;
    closed = true;
    generation++;
    clearTimer(timer);
    source.stop(); source.disconnect(); envelope.disconnect(); output.disconnect();
  }
  function atAudioTime(time, callback) {
    const request = ++generation;
    clearTimer(timer);
    const check = () => {
      if (closed || generation !== request) return;
      if (context.currentTime < time) { timer = setTimer(check, (time - context.currentTime) * 1000); return; }
      callback();
    };
    timer = setTimer(check, Math.max(0, time - context.currentTime) * 1000);
  }
  function windDown({ held: manual = false } = {}) {
    if (closed) return;
    const initial = speed();
    const start = context.currentTime;
    const seconds = manual ? Math.max(1.5, 45 * initial) : Math.max(1.5, 60 * Math.sqrt(initial));
    const lead = Math.min(1, seconds / 4);
    const originalCoast = Math.max(1.5, 4 * Math.sqrt(initial));
    const curve = elapsed => {
      if (!manual) return initial * coastCurve(elapsed / seconds);
      if (elapsed <= lead) return initial * Math.pow(Math.max(0, 1 - elapsed / originalCoast), 1.6);
      const afterLead = initial * Math.pow(1 - lead / originalCoast, 1.6);
      return afterLead * coastCurve((elapsed - lead) / (seconds - lead));
    };
    hold();
    motion = time => curve(Math.max(0, time - start));
    schedule(seconds, curve);
    endsAt = start + seconds + .02;
    atAudioTime(endsAt, () => { stop(); onEnded(); });
  }
  function resume(onReady) {
    if (closed) return false;
    const initial = speed();
    const start = context.currentTime;
    const seconds = Math.max(.2, 3 * (1 - initial));
    hold();
    const curve = elapsed => initial + (1 - initial) * smooth(elapsed / seconds);
    motion = time => curve(Math.max(0, time - start));
    schedule(seconds, curve);
    endsAt = Infinity;
    atAudioTime(start + seconds, onReady);
    return true;
  }
  function fadeOut() {
    if (closed) return;
    hold();
    output.gain.cancelAndHoldAtTime(context.currentTime);
    output.gain.linearRampToValueAtTime(0, context.currentTime + .12);
    atAudioTime(context.currentTime + .14, stop);
  }
  envelope.gain.setValueAtTime(1, context.currentTime);
  output.gain.setValueAtTime(0, context.currentTime);
  source.start();
  // The soundboard crossfades the original out over the same interval.
  output.gain.linearRampToValueAtTime(1, context.currentTime + .12);
  windDown({ held });
  return { windDown, resume, fadeOut, stop, get speed() { return speed(); }, get scheduledEnd() { return endsAt; } };
}
