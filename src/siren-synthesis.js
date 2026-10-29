// Illustrative motor-speed profiles, not exact manufacturer recordings.
function coastCurve(progress) {
  const phase = Math.max(0, Math.min(1, progress));
  // Ease away from operating speed, then settle gradually through the low growl.
  return (1 - phase) ** 2 * (1 + 2 * phase);
}
export function sirenCycle(mode, duration) {
  if (mode === 'alert') return { windUp: 4, powered: 180, windDown: 60, peak: 1, trough: 1 };
  if (['attack', 'fire'].includes(mode)) {
    const windUp = mode === 'fire' ? 1.5 : 3;
    // Federal PGA reference cadence: 8 seconds powered, 4 seconds coasting.
    const dip = mode === 'fire' ? 1.5 : 4;
    const peakHold = mode === 'fire' ? 0.5 : 5;
    // Rotor depth is illustrative; timer specifications do not define pitch.
    const trough = mode === 'fire' ? 0.6 : 0.70;
    const powered = Number((9 * (windUp + peakHold + dip) + peakHold).toFixed(6));
    return { windUp, peakHold, dip, trough, surges: 10, powered, windDown: 60, peak: 1 };
  }
  return { windUp: 0.8, powered: 0, windDown: 2.2, peak: 0.5 };
}
export function startSimulatedSiren(context, siren, { duration, volume, onEnded, destination = context.destination, mode = 'attack', held = false, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const start = context.currentTime;
  let cycle = held ? { windUp: 3, powered: Infinity, windDown: 4, peak: 1 } : sirenCycle(mode, duration);
  let powerOff = cycle.windUp + cycle.powered;
  let length = powerOff + cycle.windDown;
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
    if (mode === 'attack') return 0.775 + 0.225 * Math.cos(t * Math.PI / 2);
    return cycle.peak;
  }
  function speedAt(t) {
    if (cycle.surges) {
      if (t >= powerOff) return coastCurve((t - powerOff) / cycle.windDown);
      const span = cycle.windUp + cycle.peakHold + cycle.dip;
      const pulse = Math.floor(t / span);
      const phase = t - pulse * span;
      const smooth = value => value * value * (3 - 2 * value);
      if (phase <= cycle.windUp) {
        const low = pulse === 0 ? 0 : cycle.trough;
        return low + (1 - low) * smooth(phase / cycle.windUp);
      }
      if (phase <= cycle.windUp + cycle.peakHold) return 1;
      const floor = cycle.trough;
      return 1 - (1 - floor) * smooth((phase - cycle.windUp - cycle.peakHold) / cycle.dip);
    }
    if (t < cycle.windUp) {
      const phase = Math.max(0, t / cycle.windUp);
      return cycle.peak * phase * phase * (3 - 2 * phase);
    }
    if (t < powerOff) return poweredSpeed(t - cycle.windUp);
    const progress = (t - powerOff) / cycle.windDown;
    return poweredSpeed(cycle.powered) * (mode === 'test' ? Math.pow(Math.max(0, 1 - progress), 1.6) : coastCurve(progress));
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
  let landmarks = cycle.surges
    ? Array.from({ length: cycle.surges }, (_, index) => {
      const at = index * (cycle.windUp + cycle.peakHold + cycle.dip);
      return [at, at + cycle.windUp, Math.min(powerOff, at + cycle.windUp + cycle.peakHold)];
    }).flat()
    : [];
  scheduleSpeed(start, held ? cycle.windUp : length, speedAt, landmarks);
  oscillators.forEach(({ oscillator }) => oscillator.start(start));
  let stopped = false;
  let manualPower = held;
  let cleaned = false;
  let retirementTimer;
  let scheduledEnd = Infinity;
  let motionAt = time => speedAt(time - start);
  let signalPositionAt = time => time - start;
  let pausedSignalPosition = null;
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
    if (pausedSignalPosition === null) pausedSignalPosition = signalPositionAt(now);
    clearTimer(retirementTimer);
    scheduledEnd = Infinity;
    manualPower = true;
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
  function resumeSignal() {
    if (cleaned || !Number.isFinite(length) || (scheduledEnd !== Infinity && context.currentTime >= scheduledEnd)) return false;
    const now = context.currentTime;
    const speed = motionAt(now);
    const position = pausedSignalPosition ?? signalPositionAt(now);
    if (position >= length) return false;
    holdCurrent(now);
    stopped = false;
    manualPower = false;
    let resumePosition = !cycle.surges ? (position >= powerOff ? cycle.windUp : Math.max(cycle.windUp, position)) : position;
    if (cycle.surges && position < powerOff) {
      const span = cycle.windUp + cycle.peakHold + cycle.dip;
      const pulse = Math.floor(position / span);
      const peakAt = pulse * span + cycle.windUp;
      resumePosition = position <= peakAt ? peakAt
        : position <= peakAt + cycle.peakHold ? position
        : Math.min(powerOff, (pulse + 1) * span + cycle.windUp);
    }
    const recovery = Math.max(0.2, cycle.windUp * (1 - speed));
    const remaining = recovery + length - resumePosition;
    const ramp = elapsed => {
      if (elapsed >= recovery) return speedAt(resumePosition + elapsed - recovery);
      const phase = Math.max(0, elapsed / recovery);
      return speed + (1 - speed) * phase * phase * (3 - 2 * phase);
    };
    signalPositionAt = time => time < now + recovery ? position : resumePosition + time - now - recovery;
    pausedSignalPosition = null;
    motionAt = time => ramp(Math.max(0, time - now));
    scheduleSpeed(now, remaining, ramp, [recovery, ...landmarks.filter(t => t > resumePosition).map(t => t - resumePosition + recovery)]);
    retireAt(now + remaining + 0.02);
    return true;
  }
  function transitionSignal(nextMode, { held: nextHeld = false } = {}) {
    if (cleaned || (scheduledEnd !== Infinity && context.currentTime >= scheduledEnd)) return false;
    const now = context.currentTime;
    const currentSpeed = motionAt(now);
    holdCurrent(now);
    clearTimer(retirementTimer);
    mode = nextMode;
    held = nextHeld;
    cycle = held ? { windUp: 3, powered: Infinity, windDown: 4, peak: 1 } : sirenCycle(mode, duration);
    powerOff = cycle.windUp + cycle.powered;
    length = powerOff + cycle.windDown;
    landmarks = cycle.surges ? Array.from({ length: cycle.surges }, (_, index) => {
      const at = index * (cycle.windUp + cycle.peakHold + cycle.dip);
      return [at, at + cycle.windUp, Math.min(powerOff, at + cycle.windUp + cycle.peakHold)];
    }).flat() : [];
    stopped = false;
    manualPower = held;
    pausedSignalPosition = null;
    const difference = cycle.peak - currentSpeed;
    const recovery = Math.max(0.2, (difference >= 0 ? cycle.windUp : cycle.windDown) * Math.abs(difference));
    const ramp = elapsed => {
      if (elapsed >= recovery) return held ? 1 : speedAt(cycle.windUp + elapsed - recovery);
      const phase = Math.max(0, elapsed / recovery);
      return currentSpeed + difference * phase * phase * (3 - 2 * phase);
    };
    motionAt = time => ramp(Math.max(0, time - now));
    signalPositionAt = time => time < now + recovery
      ? cycle.windUp * Math.max(0, time - now) / recovery : cycle.windUp + time - now - recovery;
    const remaining = recovery + length - cycle.windUp;
    scheduleSpeed(now, held ? recovery : remaining, ramp,
      held ? [] : [recovery, ...landmarks.filter(t => t > cycle.windUp).map(t => t - cycle.windUp + recovery)]);
    if (held) scheduledEnd = Infinity;
    else retireAt(now + remaining + 0.02);
    return true;
  }
  function stop({ immediate = false } = {}) {
    if (cleaned || (stopped && !immediate)) return;
    stopped = true;
    const now = context.currentTime;
    if (pausedSignalPosition === null && !manualPower) pausedSignalPosition = signalPositionAt(now);
    holdCurrent(now);
    if (immediate) {
      envelope.gain.linearRampToValueAtTime(0, now + 0.015);
      clearTimer(retirementTimer);
      scheduledEnd = now + 0.02;
      oscillators.forEach(({ oscillator }) => oscillator.stop(scheduledEnd));
    } else {
      const speed = motionAt(now);
      const fullCoast = manualPower ? 4 : cycle.windDown;
      const originalCoast = Math.max(1.5, fullCoast * Math.sqrt(Math.min(1, speed / (manualPower ? 1 : cycle.peak))));
      // Preserve the familiar first second of Test feathering, then let the rotor linger.
      const lead = Math.min(1, originalCoast / 4);
      const coast = manualPower ? Math.max(lead + 1.5, 45 * speed) : originalCoast;
      const ramp = t => {
        if (manualPower) {
          if (t <= lead) return speed * Math.pow(Math.max(0, 1 - t / originalCoast), 1.6);
          const remainingSpeed = speed * Math.pow(1 - lead / originalCoast, 1.6);
          return remainingSpeed * coastCurve((t - lead) / (coast - lead));
        }
        return speed * (mode === 'test' ? Math.pow(Math.max(0, 1 - t / coast), 1.6) : coastCurve(t / coast));
      };
      motionAt = time => ramp(Math.max(0, time - now));
      scheduleSpeed(now, coast, ramp, manualPower ? [lead] : []);
      retireAt(now + coast + 0.02);
    }
  }
  oscillators[0].oscillator.onended = cleanup;
  return { stop, resume, resumeSignal, transitionSignal, setVolume, get cycle() { return cycle; }, get scheduledEnd() { return scheduledEnd; }, get speed() { return motionAt(context.currentTime); } };
}
