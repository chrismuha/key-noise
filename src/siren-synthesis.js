// Illustrative motor-speed profiles, not exact manufacturer recordings.
export function sirenCycle(mode, duration) {
  if (mode === 'fire' || mode === 'alert') {
    const windUp = mode === 'fire' ? 2 : 4;
    const dip = mode === 'fire' ? 1.5 : 3;
    const peakHold = mode === 'fire' ? 2.25 : 10.7;
    const powered = Number((9 * (windUp + peakHold + dip) + peakHold).toFixed(6));
    return { windUp, peakHold, dip, surges: 10, powered, windDown: mode === 'fire' ? 4 : 6, peak: 1 };
  }
  if (mode === 'test') return { windUp: 0.8, powered: 0, windDown: 2.2, peak: 0.5 };
  return { windUp: 3, powered: Math.max(1, Number(duration) || 5), windDown: 4, peak: 1 };
}
export function startSimulatedSiren(context, siren, { duration, volume, onEnded, destination = context.destination, mode = 'attack', held = false, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const start = context.currentTime;
  const cycle = held ? { windUp: 3, powered: Infinity, windDown: 4, peak: 1 } : sirenCycle(mode, duration);
  const powerOff = cycle.windUp + cycle.powered;
  const length = powerOff + cycle.windDown;
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
  function poweredSpeed(t) {
    if (held) return 1;
    if (mode === 'attack') return 0.7 + 0.3 * Math.cos(t * Math.PI / 2);
    return cycle.peak;
  }
  function speedAt(t) {
    if (cycle.surges) {
      if (t >= powerOff) return Math.pow(Math.max(0, 1 - (t - powerOff) / cycle.windDown), 1.6);
      const span = cycle.windUp + cycle.peakHold + cycle.dip;
      const pulse = Math.floor(t / span);
      const phase = t - pulse * span;
      const smooth = value => value * value * (3 - 2 * value);
      if (phase <= cycle.windUp) {
        const low = pulse === 0 ? 0 : 0.15;
        return low + (1 - low) * smooth(phase / cycle.windUp);
      }
      if (phase <= cycle.windUp + cycle.peakHold) return 1;
      return 1 - 0.85 * smooth((phase - cycle.windUp - cycle.peakHold) / cycle.dip);
    }
    if (t < cycle.windUp) {
      const phase = Math.max(0, t / cycle.windUp);
      return cycle.peak * phase * phase * (3 - 2 * phase);
    }
    if (t < powerOff) return poweredSpeed(t - cycle.windUp);
    return poweredSpeed(cycle.powered) * Math.pow(Math.max(0, 1 - (t - powerOff) / cycle.windDown), 1.6);
  }
  function setVolume(value) {
    const normalized = Math.max(0, Math.min(1, Number(value) || 0));
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setValueAtTime(normalized, context.currentTime);
  }
  setVolume(volume);
  const oscillators = [1, /1000T|1003|STL|2T/.test(siren.model) ? 1.25 : 1.5].map(ratio => {
    const oscillator = context.createOscillator();
    oscillator.type = siren.type === 'Electronic' ? 'sine' : 'sawtooth';
    oscillator.connect(filter);
    return { oscillator, ratio };
  });
  function scheduleSpeed(at, seconds, speed, landmarks = []) {
    const steps = Math.ceil(seconds / 0.04);
    const times = new Set(landmarks);
    for (let i = 0; i <= steps; i++) times.add(seconds * i / steps);
    for (const t of [...times].sort((a, b) => a - b)) {
      const value = speed(t);
      const time = at + t;
      for (const { oscillator, ratio } of oscillators) {
        oscillator.frequency.linearRampToValueAtTime(Math.max(20, frequency * ratio * value), time);
      }
      // Motor volume follows speed, reaching silence only after the rotor coasts down.
      envelope.gain.linearRampToValueAtTime(0.5 * Math.pow(value, 0.8), time);
    }
  }
  envelope.gain.setValueAtTime(0, start);
  const landmarks = cycle.surges
    ? Array.from({ length: cycle.surges }, (_, index) => {
      const at = index * (cycle.windUp + cycle.peakHold + cycle.dip);
      return [at, at + cycle.windUp, Math.min(powerOff, at + cycle.windUp + cycle.peakHold)];
    }).flat()
    : [];
  scheduleSpeed(start, held ? cycle.windUp : length, speedAt, landmarks);
  oscillators.forEach(({ oscillator }) => oscillator.start(start));
  let stopped = false;
  let cleaned = false;
  let retirementTimer;
  let scheduledEnd = Infinity;
  let motionAt = time => speedAt(time - start);
  function retireAt(time) {
    clearTimer(retirementTimer);
    scheduledEnd = time;
    const retire = () => {
      if (cleaned) return;
      if (context.currentTime < time) {
        retirementTimer = setTimer(retire, (time - context.currentTime) * 1000);
        return;
      }
      oscillators.forEach(({ oscillator }) => oscillator.stop(context.currentTime));
    };
    retirementTimer = setTimer(retire, Math.max(0, time - context.currentTime) * 1000);
  }
  if (!held) retireAt(start + length + 0.02);
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    clearTimer(retirementTimer);
    oscillators.forEach(({ oscillator }) => { oscillator.onended = null; oscillator.disconnect(); });
    filter.disconnect();
    envelope.disconnect();
    output.disconnect();
    onEnded();
  }
  function holdCurrent(now) {
    envelope.gain.cancelAndHoldAtTime(now);
    oscillators.forEach(({ oscillator }) => oscillator.frequency.cancelAndHoldAtTime(now));
  }
  function resume() {
    if (cleaned || (scheduledEnd !== Infinity && context.currentTime >= scheduledEnd)) return false;
    const now = context.currentTime;
    const speed = motionAt(now);
    clearTimer(retirementTimer);
    scheduledEnd = Infinity;
    stopped = false;
    holdCurrent(now);
    const rise = Math.max(0.2, 3 * (1 - speed));
    const ramp = elapsed => {
      const phase = Math.max(0, Math.min(1, elapsed / rise));
      return speed + (1 - speed) * phase * phase * (3 - 2 * phase);
    };
    motionAt = time => ramp(time - now);
    scheduleSpeed(now, rise, ramp);
    return true;
  }
  function stop({ immediate = false } = {}) {
    if (cleaned || (stopped && !immediate)) return;
    stopped = true;
    const now = context.currentTime;
    holdCurrent(now);
    if (immediate) {
      envelope.gain.linearRampToValueAtTime(0, now + 0.015);
      clearTimer(retirementTimer);
      scheduledEnd = now + 0.02;
      oscillators.forEach(({ oscillator }) => oscillator.stop(scheduledEnd));
    } else {
      const speed = motionAt(now);
      const coast = Math.max(0.2, cycle.windDown * Math.sqrt(speed / cycle.peak));
      const ramp = t => speed * Math.pow(Math.max(0, 1 - t / coast), 1.6);
      motionAt = time => ramp(Math.max(0, time - now));
      scheduleSpeed(now, coast, ramp);
      retireAt(now + coast + 0.02);
    }
  }
  oscillators[0].oscillator.onended = cleanup;
  return { stop, resume, setVolume, cycle, get scheduledEnd() { return scheduledEnd; }, get speed() { return motionAt(context.currentTime); } };
}
