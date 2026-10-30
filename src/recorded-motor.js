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

function spectrum(real, imaginary) {
  const count = real.length;
  for (let i = 1, j = 0; i < count; i++) {
    let bit = count >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imaginary[i], imaginary[j]] = [imaginary[j], imaginary[i]];
    }
  }
  for (let size = 2; size <= count; size *= 2) {
    const rotation = -2 * Math.PI / size;
    const stepReal = Math.cos(rotation), stepImaginary = Math.sin(rotation);
    for (let offset = 0; offset < count; offset += size) {
      let wr = 1, wi = 0;
      for (let j = 0; j < size / 2; j++) {
        const first = offset + j, second = first + size / 2;
        const tr = real[second] * wr - imaginary[second] * wi;
        const ti = real[second] * wi + imaginary[second] * wr;
        real[second] = real[first] - tr; imaginary[second] = imaginary[first] - ti;
        real[first] += tr; imaginary[first] += ti;
        const next = wr * stepReal - wi * stepImaginary;
        wi = wr * stepImaginary + wi * stepReal; wr = next;
      }
    }
  }
}

// Build a perfectly periodic wavetable using only narrow tonal peaks present
// in the recording. Raw wind/traffic noise and short-loop seams must not become
// a repeating fan sound as the playback rate falls.
export function isolateRecordedTone(context, recording, position) {
  const rate = recording.sampleRate;
  const end = Math.min(recording.length, Math.max(2, Math.round(rate * .04), Math.round(position * rate)));
  const length = Math.min(end, Math.max(2, Math.round(rate * .12)));
  let count = 1024;
  while (count < length) count *= 2;
  const channels = [];
  const power = new Float64Array(count / 2);
  let windowSum = 0;
  for (let channel = 0; channel < recording.numberOfChannels; channel++) {
    const real = new Float64Array(count), imaginary = new Float64Array(count);
    const input = recording.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const window = .5 - .5 * Math.cos(2 * Math.PI * i / Math.max(1, length - 1));
      real[i] = input[end - length + i] * window;
      if (channel === 0) windowSum += window;
    }
    spectrum(real, imaginary);
    for (let bin = 0; bin < power.length; bin++) power[bin] += real[bin] ** 2 + imaginary[bin] ** 2;
    channels.push({ real, imaginary });
  }
  const magnitude = power.map(value => Math.sqrt(value / channels.length));
  const first = Math.max(1, Math.ceil(90 * count / rate));
  const last = Math.min(magnitude.length - 2, Math.floor(4000 * count / rate));
  let maximum = 0;
  for (let bin = first; bin <= last; bin++) maximum = Math.max(maximum, magnitude[bin]);
  const candidates = [];
  for (let bin = first; bin <= last; bin++) {
    const value = magnitude[bin];
    if (value < maximum * .03 || value <= magnitude[bin - 1] || value < magnitude[bin + 1]) continue;
    const neighborhood = [];
    const inner = Math.max(2, Math.ceil(35 * count / rate));
    const outer = Math.max(inner + 2, Math.ceil(90 * count / rate));
    for (let distance = inner; distance <= outer; distance++) {
      if (bin - distance >= first) neighborhood.push(magnitude[bin - distance]);
      if (bin + distance <= last) neighborhood.push(magnitude[bin + distance]);
    }
    neighborhood.sort((a, b) => a - b);
    const floor = neighborhood.length ? neighborhood[Math.floor(neighborhood.length / 2)] : maximum;
    if (value < Math.max(1e-9, floor) * 5 || 2 * value / Math.max(1, windowSum) < .0005) continue;
    candidates.push(bin);
  }
  candidates.sort((a, b) => magnitude[b] - magnitude[a]);
  const peaks = [];
  for (const bin of candidates) {
    if (peaks.every(other => Math.abs(other - bin) * rate / count >= 24)) peaks.push(bin);
    if (peaks.length === 24) break;
  }
  if (!peaks.length) {
    const error = new Error('No clear siren tone at the current playhead');
    error.code = 'NO_SIREN_TONE';
    throw error;
  }
  const grain = context.createBuffer(recording.numberOfChannels, count, rate);
  for (let channel = 0; channel < channels.length; channel++) {
    const output = grain.getChannelData(channel);
    const { real, imaginary } = channels[channel];
    for (const bin of peaks) {
      const amplitude = 2 * Math.hypot(real[bin], imaginary[bin]) / windowSum;
      const phase = Math.atan2(imaginary[bin], real[bin]);
      const step = 2 * Math.PI * bin / count;
      const stepCos = Math.cos(step), stepSin = Math.sin(step);
      let cosine = Math.cos(phase), sine = Math.sin(phase);
      for (let i = 0; i < count; i++) {
        output[i] += amplitude * cosine;
        const next = cosine * stepCos - sine * stepSin;
        sine = sine * stepCos + cosine * stepSin; cosine = next;
      }
    }
    const peak = output.reduce((value, sample) => Math.max(value, Math.abs(sample)), 0);
    if (peak > .95) for (let i = 0; i < count; i++) output[i] *= .95 / peak;
  }
  return grain;
}

export function startRecordedMotor(context, recording, {
  position, destination = context.destination, held = false, onEnded,
  setTimer = setTimeout, clearTimer = clearTimeout
}) {
  const grain = isolateRecordedTone(context, recording, position);
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
