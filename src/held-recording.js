// Actual recorded startup -> authored sustain loop -> actual recorded shutdown.
// Playhead matching changes which part plays, never its pitch or playback rate.
export function startHeldRecording(context, power, shutdown, {
  loopStart, loopEnd, powerCurve = [], windDownCurve = [], destination = context.destination, onEnded
}) {
  let current;
  let phase = 'power';
  let closed = false;
  const voices = new Set();
  function valueAt(curve, time, fallback) {
    if (!curve.length) return fallback;
    let previous = curve[0];
    for (const point of curve.slice(1)) {
      if (time <= point[0]) {
        const fraction = Math.max(0, Math.min(1, (time - previous[0]) / Math.max(.001, point[0] - previous[0])));
        return previous[1] + (point[1] - previous[1]) * fraction;
      }
      previous = point;
    }
    return previous[1];
  }
  function positionFor(curve, speed, fallback) {
    if (!curve.length) return fallback;
    // Interpolate between curve points so partial presses do not snap in 200ms steps.
    for (let i = 1; i < curve.length; i++) {
      const [a, b] = [curve[i - 1], curve[i]];
      if (a[1] === b[1]) { if (speed === a[1]) return a[0]; continue; }
      if (speed >= Math.min(a[1], b[1]) && speed <= Math.max(a[1], b[1])) {
        return a[0] + (b[0] - a[0]) * (speed - a[1]) / (b[1] - a[1]);
      }
    }
    return curve.reduce((best, point) => Math.abs(point[1] - speed) < Math.abs(best[1] - speed) ? point : best, curve[0])[0];
  }
  function playhead() { return current.offset + Math.max(0, context.currentTime - current.start); }
  function dispose(voice) {
    voice.source.onended = null;
    try { voice.source.stop(); } catch { /* Already ended. */ }
    voice.source.disconnect(); voice.gain.disconnect(); voices.delete(voice);
  }
  function play(buffer, offset, sustain) {
    const previous = current;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = sustain;
    if (sustain) { source.loopStart = loopStart; source.loopEnd = Math.min(loopEnd, buffer.duration); }
    source.connect(gain); gain.connect(destination);
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(1, context.currentTime + .08);
    const voice = { source, gain, start: context.currentTime, offset: Math.max(0, Math.min(offset, buffer.duration - .01)) };
    voices.add(voice); current = voice;
    source.onended = () => {
      const finished = !closed && current === voice && phase === 'coast';
      dispose(voice);
      if (finished) { stop(); onEnded(); }
    };
    source.start(context.currentTime, voice.offset);
    if (previous) {
      previous.gain.gain.cancelAndHoldAtTime(context.currentTime);
      previous.gain.gain.linearRampToValueAtTime(0, context.currentTime + .08);
      previous.source.stop(context.currentTime + .1);
    }
  }
  function release() {
    if (closed || phase === 'coast') return;
    const elapsed = playhead();
    const speed = elapsed >= loopStart ? 1 : valueAt(powerCurve, elapsed, elapsed / Math.max(.01, loopStart));
    phase = 'coast';
    const offset = speed >= .98 ? 0 : positionFor(windDownCurve, speed, (1 - speed) * shutdown.duration);
    play(shutdown, offset, false);
  }
  function resume() {
    if (closed) return false;
    if (phase === 'power') return true;
    const speed = valueAt(windDownCurve, playhead(), Math.max(0, 1 - playhead() / shutdown.duration));
    const offset = positionFor(powerCurve, speed, speed * loopStart);
    phase = 'power';
    play(power, Math.min(offset, loopStart), true);
    return true;
  }
  function stop() {
    if (closed) return;
    closed = true;
    for (const voice of [...voices]) dispose(voice);
  }
  play(power, 0, true);
  return { release, resume, stop, get phase() { return phase; } };
}
