import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
async function sourceModule(name) {
  const source = await readFile(new URL(`../src/${name}.js`, import.meta.url), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { sirens, soundSources, findSound } = await sourceModule('sirens');
const { startSimulatedSiren: createSimulatedSiren } = await sourceModule('siren-synthesis');
const startSimulatedSiren = (context, siren, options) => createSimulatedSiren(context, siren, { setTimer: () => 0, clearTimer() {}, ...options });
test('catalog provides unique portable filenames for every model and requested manufacturers', () => {
  assert.equal(new Set(sirens.map(s => s.id)).size, sirens.length);
  for (const make of ['Whelen', 'Federal Signal']) assert.ok(sirens.some(s => s.manufacturer === make));
  for (const siren of sirens) {
    assert.match(siren.id, /^[a-z0-9-]+$/);
    assert.equal(soundSources(siren).length, 4);
  }
});
test('missing files reject Vite HTML fallback and allow a later supported audio format', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, headers: new Headers({ 'content-type': 'text/html' }) });
    assert.equal(await findSound(sirens[0]), null);
    globalThis.fetch = async (url) => ({ ok: true, headers: new Headers({ 'content-type': url.endsWith('.ogg') ? 'audio/ogg' : 'text/html' }) });
    assert.equal((await findSound(sirens[0])).fileName, `${sirens[0].id}.ogg`);
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.equal(await findSound(sirens[0]), null);
  } finally { globalThis.fetch = original; }
});
test('simulated playback schedules a limit, handles live volume, and stops only once', () => {
  const nodes = [];
  const events = [];
  function parameter() { return Object.fromEntries(['cancelAndHoldAtTime', 'cancelScheduledValues', 'setValueAtTime', 'setTargetAtTime', 'linearRampToValueAtTime'].map(method => [method, (...args) => events.push([method, ...args])])); }
  function node() { const n = { connect() {}, disconnect() { this.disconnected = true; }, gain: parameter(), frequency: parameter(), start(t) { this.started = t; }, stop(t) { this.stopped = t; } }; nodes.push(n); return n; }
  const context = { currentTime: 2, destination: {}, createGain: node, createBiquadFilter: node, createOscillator: node };
  let ended = 0;
  const playback = startSimulatedSiren(context, sirens[0], { duration: 5, volume: .25, onEnded: () => ended++ });
  assert.equal(nodes[3].started, 2);
  assert.equal(playback.scheduledEnd, 78.02);
  playback.setVolume(.5);
  assert.ok(events.some(event => event[0] === 'setValueAtTime' && event[1] === .5));
  playback.stop(); playback.stop();
  nodes[3].onended();
  assert.equal(ended, 1);
  assert.ok(nodes.every(n => n.disconnected));
});

// Exercise the component's playback orchestration with controlled audio backends.
async function soundboard(loop = false) {
  const { runInNewContext } = await import('node:vm');
  const { ref, computed, watch, nextTick } = await import('vue');
  const source = (await readFile(new URL('../src/Sirens.vue', import.meta.url), 'utf8'))
    .split('<script setup>')[1].split('</script>')[0].replace(/^import .*;\n/gm, '');
  const previews = [];
  const recordings = [];
  const sandbox = {
    defineEmits: () => () => {},
    createSirenHold: () => ({ dispose() {} }),
    defineProps: () => ({ loopSounds: loop }),
    ref, computed, watch, nextTick, sirens, onMounted() {}, onBeforeUnmount() {},
    localStorage: { getItem() { return null; }, setItem() {} },
    window: { clearTimeout, setTimeout, AudioContext: class {
      state = 'running'; currentTime = 0; destination = {};
      createGain() {
        const gain = { value: 1, setValueAtTime(value) { this.value = value; }, cancelAndHoldAtTime() {}, linearRampToValueAtTime(value) { this.value = value; } };
        this.output = { gain, connect() {}, disconnect() {} };
        return this.output;
      }
      createMediaElementSource() { return { connect() {}, disconnect() {} }; }
      close() {}
    } },
    findSound: async () => ({ url: './example.mp3', fileName: 'example.mp3' }),
    startSimulatedSiren(context, siren, options) {
      const preview = { resumeSignal() { this.signalResumes = (this.signalResumes || 0) + 1; return true; }, resume() { this.stopped = false; this.resumed = (this.resumed || 0) + 1; return true; }, destination: options.destination, initialVolume: options.volume, mode: options.mode, held: options.held, stopped: false, stop() { this.stopped = true; options.onEnded(); }, setVolume(value) { this.volume = value; }, end: options.onEnded };
      previews.push(preview);
      return preview;
    },
    Audio: class {
      constructor() { recordings.push(this); }
      play() { return Promise.resolve(); }
      pause() { this.paused = true; }
      removeAttribute() {} load() {}
    }
  };
  const board = runInNewContext(`${source}\n;({ play, stop, soundMode, playing, volume, readinessText, isMobile, boardPage, boardPageCount, visibleSirens, manufacturer, allowMultiple, getMasterVolume: () => masterVolume, sirenMode, simulatorSiren, openSimulator, closeSimulator, simulatorCommand, stopButton, beginSimulatorTest, releaseSimulatorTest, simulatorActiveMode })`, sandbox);
  return { board, previews, recordings, nextTick, sandbox };
}
test('fake sirens overlap and stopping or finishing one preserves the others', async () => {
  const { board, previews, nextTick } = await soundboard();
  await board.play(sirens[0]); await board.play(sirens[1]);
  assert.equal(board.playing.value.size, 2);
  assert.equal(previews[0].stopped, false);
  board.volume.value = 40; await nextTick();
  assert.equal(board.getMasterVolume().gain.value, .4);
  await board.play(sirens[0]);
  assert.equal(board.playing.value.size, 1);
  assert.equal(previews[1].stopped, false);
  previews[1].end();
  assert.equal(board.playing.value.size, 0);
});
test('real recordings overlap and stop all releases every player', async () => {
  const { board, recordings, nextTick } = await soundboard();
  board.soundMode.value = 'real'; await nextTick();
  assert.match(board.readinessText.value, /^Add files named .* in public\/sounds\/sirens$/);
  await board.play(sirens[0]); await board.play(sirens[1]);
  assert.equal(board.playing.value.size, 2);
  assert.ok(recordings.every(audio => !audio.paused));
  recordings[0].onended();
  assert.equal(board.playing.value.size, 1);
  assert.equal(recordings[1].paused, undefined);
  board.stop();
  assert.equal(board.playing.value.size, 0);
  assert.ok(recordings.every(audio => audio.paused));
});
test('switching source cancels pending real playback without starting stale audio', async () => {
  const { board, sandbox, recordings, nextTick } = await soundboard();
  board.soundMode.value = 'real'; await nextTick();
  let resolve;
  sandbox.findSound = () => new Promise(done => { resolve = done; });
  const pending = board.play(sirens[0]);
  board.soundMode.value = 'fake'; await nextTick();
  resolve({ url: './example.mp3', fileName: 'example.mp3' });
  await pending;
  assert.equal(board.playing.value.size, 0);
  assert.equal(recordings.length, 0);
});

test('mobile sirens paginate without interrupting audio and filters return to the first page', async () => {
  const { board, nextTick } = await soundboard();
  board.isMobile.value = true;
  assert.equal(board.visibleSirens.value.length, 6);
  await board.play(board.visibleSirens.value[0]);
  const firstId = board.visibleSirens.value[0].id;
  board.boardPage.value = 2;
  assert.equal(board.visibleSirens.value.length, 6);
  assert.notEqual(board.visibleSirens.value[0].id, firstId);
  assert.equal(board.playing.value.has(firstId), true);
  board.manufacturer.value = 'Whelen'; await nextTick();
  assert.equal(board.boardPage.value, 1);
  assert.ok(board.visibleSirens.value.every(s => s.manufacturer === 'Whelen'));
  board.isMobile.value = false;
  assert.ok(board.visibleSirens.value.length > 6);
  board.stop();
});

test('single-sound checkbox stops previous sirens and returns to layering when enabled', async () => {
  const { board, previews, nextTick } = await soundboard();
  board.allowMultiple.value = false; await nextTick();
  await board.play(sirens[0]); await board.play(sirens[1]);
  assert.equal(board.playing.value.size, 1);
  assert.equal(previews[0].stopped, true);
  assert.equal(previews[1].stopped, false);
  board.allowMultiple.value = true; await nextTick();
  await board.play(sirens[0]); await board.play(sirens[1]);
  assert.equal(board.playing.value.size, 2);
  board.stop();
});

test('looping fake sirens restart independently and Stop all cancels scheduled repeats', async () => {
  const { board, previews, sandbox } = await soundboard(true);
  const queued = new Map(); let timerId = 0;
  sandbox.window.setTimeout = callback => { queued.set(++timerId, callback); return timerId; };
  sandbox.window.clearTimeout = id => queued.delete(id);
  await board.play(sirens[0]); await board.play(sirens[1]);
  previews[0].end();
  assert.equal(board.playing.value.size, 2);
  assert.equal(queued.size, 1);
  const [id, restart] = queued.entries().next().value;
  queued.delete(id); restart();
  assert.equal(previews.length, 3);
  assert.equal(previews[1].stopped, false);
  previews[2].end();
  board.stop();
  assert.equal(queued.size, 0);
  assert.equal(board.playing.value.size, 0);
});
test('real loops play complete recordings and cancel with a short fade', async () => {
  const { board, recordings, sandbox, nextTick } = await soundboard(true);
  const queued = new Map(); let timerId = 0;
  sandbox.window.setTimeout = callback => { queued.set(++timerId, callback); return timerId; };
  sandbox.window.clearTimeout = id => queued.delete(id);
  board.soundMode.value = 'real'; await nextTick();
  await board.play(sirens[0]); await board.play(sirens[1]);
  assert.ok(recordings.every(audio => audio.loop));
  assert.equal(queued.size, 0, 'no duration timer may truncate a recorded wind-down');
  await board.play(sirens[0]);
  assert.equal(board.playing.value.size, 2, 'keep the cancelling voice tracked until its fade completes');
  const [id, fadeEnded] = queued.entries().next().value;
  queued.delete(id); fadeEnded();
  assert.equal(board.playing.value.size, 1);
  assert.equal(recordings[0].paused, true);
  assert.equal(recordings[1].paused, undefined);
  board.stop(); assert.equal(queued.size, 0);
});

test('fake sirens share an exact 0–100% master volume, including new loop cycles', async () => {
  const { board, previews, sandbox } = await soundboard(true);
  const queued = [];
  sandbox.window.setTimeout = callback => { queued.push(callback); return queued.length; };
  sandbox.window.clearTimeout = () => {};
  await board.play(sirens[0]); await board.play(sirens[1]);
  const output = board.getMasterVolume();
  assert.ok(previews.every(preview => preview.destination === output));
  board.volume.value = 0;
  assert.equal(output.gain.value, 0);
  previews[0].end(); queued.shift()();
  assert.equal(previews.at(-1).destination, output);
  assert.equal(output.gain.value, 0);
  board.volume.value = 100;
  assert.equal(output.gain.value, 1);
  board.stop();
});
test('real sirens use the same zero and full-volume output as fake sirens', async () => {
  const { board, recordings, nextTick } = await soundboard();
  board.soundMode.value = 'real'; await nextTick();
  board.volume.value = 0;
  await board.play(sirens[0]); await board.play(sirens[1]);
  assert.equal(board.getMasterVolume().gain.value, 0);
  assert.ok(recordings.every(audio => audio.volume === 1));
  board.volume.value = 100;
  assert.equal(board.getMasterVolume().gain.value, 1);
  board.stop();
});

test('mode-specific recordings do not fall back to the wrong tone', async () => {
  const siren = sirens[0];
  assert.equal(soundSources(siren, 'attack')[0].fileName, `${siren.id}-attack.mp3`);
  assert.ok(soundSources(siren, 'attack').some(source => source.fileName === `${siren.id}.mp3`));
  for (const mode of ['alert', 'fire', 'test']) {
    assert.equal(soundSources(siren, mode).length, 4);
    assert.ok(soundSources(siren, mode).every(source => source.fileName.startsWith(`${siren.id}-${mode}.`)));
  }
});
test('all four fake modes have distinct pitch patterns and Test is a brief low growl', () => {
  function render(mode) {
    const oscillators = [];
    const parameter = () => ({ points: [], setValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {}, linearRampToValueAtTime(value, time) { this.points.push([value, time]); } });
    const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop(time) { this.end = time; } });
    const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator() { const oscillator = node(); oscillators.push(oscillator); return oscillator; } };
    const playback = startSimulatedSiren(context, sirens[0], { duration: 5, volume: 1, mode, onEnded() {} });
    return { ...oscillators[0], end: playback.scheduledEnd };
  }
  const modes = ['attack', 'alert', 'fire', 'test'].map(render);
  assert.equal(new Set(modes.map(oscillator => JSON.stringify(oscillator.frequency.points))).size, 4);
  assert.ok(Math.abs(modes[3].end - 3.02) < 1e-9);
  const peaks = modes.map(oscillator => Math.max(...oscillator.frequency.points.map(point => point[0])));
  assert.ok(peaks[3] < peaks[0]);
  assert.ok(modes[1].end > modes[2].end, 'Alert must run its ten wind-ups more slowly than Fire');
  assert.ok(modes.every(oscillator => oscillator.frequency.points.at(-1)[0] === 20));
});
test('changing mode stops old voices and passes the new mode to subsequent sounds', async () => {
  const { board, previews, nextTick } = await soundboard();
  await board.play(sirens[0]);
  assert.equal(previews[0].mode, 'attack');
  board.sirenMode.value = 'test'; await nextTick();
  assert.equal(board.playing.value.size, 0);
  assert.equal(previews[0].stopped, true);
  await board.play(sirens[0]);
  assert.equal(previews[1].mode, 'test');
  board.stop();
});

test('simulator opening is silent; commands play the selected model and closing stops it', async () => {
  const { board, previews } = await soundboard();
  board.openSimulator(sirens[2]);
  assert.equal(board.simulatorSiren.value.id, sirens[2].id);
  assert.equal(previews.length, 0);
  await board.simulatorCommand('test');
  assert.equal(board.playing.value.has(sirens[2].id), true);
  assert.equal(previews[0].mode, 'test');
  board.closeSimulator();
  assert.equal(board.simulatorSiren.value, null);
  assert.equal(board.playing.value.size, 0);
  assert.equal(previews[0].stopped, true);
});
test('the latest simulator command wins and Cancel cancels pending commands', async () => {
  const { board, previews } = await soundboard();
  board.openSimulator(sirens[0]);
  await Promise.all([board.simulatorCommand('alert'), board.simulatorCommand('fire')]);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].mode, 'fire');
  const pending = board.simulatorCommand('attack');
  board.stopButton(); await pending;
  assert.equal(previews.length, 1);
  assert.equal(board.playing.value.size, 0);
  board.closeSimulator();
});
const { createSirenHold } = await sourceModule('siren-hold');
function holdFixture() {
  const actions = [];
  const timers = new Map(); let id = 0;
  const gesture = createSirenHold({ onHold: siren => actions.push(['hold', siren.id]), onTap: siren => actions.push(['tap', siren.id]), setTimer: callback => { timers.set(++id, callback); return id; }, clearTimer: timer => timers.delete(timer) });
  return { gesture, actions, timers, pointer: { clientX: 30, clientY: 30, button: 0, isPrimary: true } };
}
test('a long press opens the simulator and suppresses the following playback click', () => {
  const { gesture, actions, timers, pointer } = holdFixture();
  gesture.start(pointer, sirens[0]);
  timers.values().next().value();
  gesture.cancel(); gesture.tap(sirens[0]);
  assert.deepEqual(actions, [['hold', sirens[0].id]]);
  gesture.start(pointer, sirens[0]); gesture.cancel(); gesture.tap(sirens[0]);
  assert.equal(actions.at(-1)[0], 'tap');
});
test('scrolling cancels long press without playing, and disposal clears the timer', () => {
  const { gesture, actions, timers, pointer } = holdFixture();
  gesture.start(pointer, sirens[0]);
  gesture.move({ clientX: 30, clientY: 60 });
  assert.equal(timers.size, 0);
  gesture.tap(sirens[0]); assert.equal(actions.length, 0);
  gesture.start(pointer, sirens[0]); gesture.dispose();
  assert.equal(timers.size, 0);
});

test('every motor cycle has a complete rise and fall even with one second of powered time', () => {
  for (const mode of ['attack', 'alert', 'fire', 'test']) {
    const nodes = [];
    const parameter = () => ({ points: [], setValueAtTime(value, time) { this.points.push([value, time]); }, linearRampToValueAtTime(value, time) { this.points.push([value, time]); }, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
    const node = () => { const n = { gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop(time) { this.end = time; } }; nodes.push(n); return n; };
    const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator: node };
    const playback = startSimulatedSiren(context, sirens[0], { duration: 1, volume: 1, mode, onEnded() {} });
    const points = nodes[3].frequency.points;
    const peak = Math.max(...points.map(point => point[0]));
    assert.equal(points[0][0], 20);
    assert.ok(peak > 200, mode);
    assert.equal(points.at(-1)[0], 20);
    assert.equal(nodes[1].gain.points.at(-1)[0], 0);
    assert.equal(playback.scheduledEnd, playback.cycle.windUp + playback.cycle.powered + playback.cycle.windDown + .02);
    context.currentTime = playback.cycle.windUp;
    playback.stop();
    assert.ok(playback.scheduledEnd >= context.currentTime + 2, 'Cancel must coast from operating speed, not cut off');
    playback.stop({ immediate: true });
    assert.equal(nodes[3].end, context.currentTime + .02);
  }
});
test('Cancel keeps a coasting rotor tracked and never restarts its loop', async () => {
  const { board, previews, sandbox } = await soundboard(true);
  const queued = new Map(); let id = 0;
  sandbox.window.setTimeout = callback => { queued.set(++id, callback); return id; };
  sandbox.window.clearTimeout = timer => queued.delete(timer);
  await board.play(sirens[0]);
  previews[0].stop = function(options) { this.stopped = true; if (options?.immediate) this.end(); };
  board.stopButton();
  assert.equal(board.playing.value.size, 1);
  previews[0].end();
  assert.equal(board.playing.value.size, 0);
  assert.equal(queued.size, 0);
});
test('Cancel between loop cycles clears the queued restart without leaving a stuck voice', async () => {
  const { board, previews, sandbox } = await soundboard(true);
  const queued = new Map(); let id = 0;
  sandbox.window.setTimeout = callback => { queued.set(++id, callback); return id; };
  sandbox.window.clearTimeout = timer => queued.delete(timer);
  await board.play(sirens[0]); previews[0].end();
  assert.equal(queued.size, 1);
  board.stopButton();
  assert.equal(queued.size, 0);
  assert.equal(board.playing.value.size, 0);
});
test('held Test has no automatic cutoff and coasts from its current rotor speed on release', () => {
  function start() {
    const nodes = [];
    const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
    const node = () => { const n = { gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop(time) { this.end = time; } }; nodes.push(n); return n; };
    const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator: node };
    const playback = startSimulatedSiren(context, sirens[0], { duration: 1, volume: 1, mode: 'test', held: true, onEnded() {} });
    return { context, playback, oscillator: nodes[3] };
  }
  const long = start();
  assert.equal(long.oscillator.end, undefined);
  long.context.currentTime = 3600;
  long.playback.stop();
  assert.equal(long.playback.scheduledEnd, 3604.02);
  const growl = start();
  growl.context.currentTime = .3; growl.playback.stop();
  assert.ok(growl.playback.scheduledEnd < 4, 'a short press should coast from low speed');
});
test('held simulator Test starts a momentary voice and release overrides Loop', async () => {
  const { board, previews, sandbox } = await soundboard(true);
  const queued = [];
  sandbox.window.setTimeout = callback => { queued.push(callback); return queued.length; };
  sandbox.window.clearTimeout = () => {};
  board.openSimulator(sirens[0]);
  await board.beginSimulatorTest();
  assert.equal(previews[0].held, true);
  previews[0].stop = function() { this.stopped = true; };
  board.releaseSimulatorTest();
  assert.equal(previews[0].stopped, true);
  assert.equal(board.playing.value.size, 1);
  previews[0].end();
  assert.equal(board.playing.value.size, 0);
  assert.equal(queued.length, 0);
});
test('releasing Test before async startup completes prevents a stuck motor', async () => {
  const { board, previews } = await soundboard();
  board.openSimulator(sirens[0]);
  const starting = board.beginSimulatorTest();
  board.releaseSimulatorTest();
  await starting;
  assert.equal(previews.length, 0);
  assert.equal(board.playing.value.size, 0);
});
test('cabinet Test handles pointer and keyboard holds without a second activation click', async () => {
  const { runInNewContext } = await import('node:vm');
  const { ref } = await import('vue');
  const emitted = [];
  const script = (await readFile(new URL('../src/SirenSimulator.vue', import.meta.url), 'utf8')).split('<script setup>')[1].split('</script>')[0].replace(/^import .*;\n/gm, '');
  const control = runInNewContext(`${script}\n;({ pressTest, releaseTest, testKeyUp, activateButton })`, { ref, defineProps: () => ({}), defineEmits: () => (...args) => emitted.push(args), onMounted() {}, onBeforeUnmount() {} });
  let captured = null;
  control.pressTest({ type: 'pointerdown', button: 0, pointerId: 7, preventDefault() {}, currentTarget: { focus() {}, setPointerCapture(id) { captured = id; } } });
  assert.equal(captured, 7);
  control.releaseTest(); control.activateButton('test', { detail: 1 });
  assert.deepEqual(emitted, [['test-start'], ['test-end']]);
  emitted.length = 0;
  control.pressTest({ type: 'keydown', key: ' ', preventDefault() {} });
  control.pressTest({ type: 'keydown', key: ' ', repeat: true, preventDefault() {} });
  control.testKeyUp({ key: ' ', preventDefault() {} });
  assert.deepEqual(emitted, [['test-start'], ['test-end']]);
});

test('Attack, Fire, and Alert complete exactly ten full-speed wind-ups before coasting', () => {
  function render(mode, duration) {
    const oscillators = [];
    const parameter = () => ({ points: [], setValueAtTime() {}, linearRampToValueAtTime(value, time) { this.points.push([value, time]); }, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
    const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop(time) { this.end = time; } });
    const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator() { const oscillator = node(); oscillators.push(oscillator); return oscillator; } };
    const playback = startSimulatedSiren(context, sirens[0], { duration, volume: 1, mode, onEnded() {} });
    return { cycle: playback.cycle, oscillator: { ...oscillators[0], end: playback.scheduledEnd } };
  }
  const fire = render('fire', 1);
  const alert = render('alert', 1);
  assert.ok(alert.cycle.windUp > fire.cycle.windUp);
  for (const mode of ['attack', 'fire', 'alert']) {
    const { cycle, oscillator } = render(mode, 1);
    const points = oscillator.frequency.points;
    const fullSpeed = Math.max(...points.map(point => point[0]));
    const peaks = [];
    let atFullSpeed = false;
    for (const [value, time] of points) {
      if (Math.abs(value - fullSpeed) < 1e-9) {
        if (!atFullSpeed) peaks.push({ start: time, end: time });
        peaks.at(-1).end = time;
        atFullSpeed = true;
      } else atFullSpeed = false;
    }
    assert.equal(peaks.length, 10, mode);
    for (const peak of peaks) assert.ok(Math.abs(peak.end - peak.start - cycle.peakHold) < .001, 'each peak must stay at full speed for its entire hold');
    const lastPeakTime = cycle.windUp + cycle.powered;
    assert.ok(Math.abs(peaks.at(-1).end - lastPeakTime) < .001);
    assert.equal(points.at(-1)[0], 20);
    assert.equal(oscillator.end, lastPeakTime + cycle.windDown + .02);
    assert.equal(oscillator.end, (mode === 'fire' ? 51.5 : mode === 'attack' ? 76 : 198) + .02);
    assert.equal(render(mode, 5).oscillator.end, oscillator.end, 'powered-time setting must not truncate the sequence');
  }
});

test('Test re-powers a coasting oscillator continuously and cancels its pending retirement', () => {
  const oscillators = [];
  const queued = new Map(); let id = 0;
  const parameter = () => ({ points: [], setValueAtTime() {}, linearRampToValueAtTime(value, time) { this.points.push([value, time]); }, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop(time) { this.end = time; } });
  const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator() { const oscillator = node(); oscillators.push(oscillator); return oscillator; } };
  const playback = startSimulatedSiren(context, sirens[0], { duration: 1, volume: 1, mode: 'test', held: true, onEnded() {}, setTimer(callback) { queued.set(++id, callback); return id; }, clearTimer(timer) { queued.delete(timer); } });
  context.currentTime = 3;
  assert.equal(playback.speed, 1);
  playback.stop();
  context.currentTime = 4;
  const coastingSpeed = playback.speed;
  assert.ok(coastingSpeed > 0 && coastingSpeed < 1);
  assert.equal(queued.size, 1);
  assert.equal(playback.resume(), true);
  assert.equal(playback.speed, coastingSpeed);
  assert.equal(queued.size, 0);
  assert.equal(playback.scheduledEnd, Infinity);
  assert.equal(oscillators.length, 2, 'reuse both voices instead of constructing a new rotor');
  context.currentTime = 5;
  assert.ok(playback.speed > coastingSpeed);
  const currentSpeed = playback.speed;
  playback.stop();
  assert.equal(playback.speed, currentSpeed);
  playback.stop({ immediate: true });
  assert.equal(queued.size, 0);
});
test('Test does not restart an active signal or a coasting Test session', async () => {
  const { board, previews } = await soundboard();
  board.openSimulator(sirens[0]);
  await board.simulatorCommand('fire');
  const original = previews[0];
  original.stop = function(options) { if (options?.immediate) this.end(); };
  await board.beginSimulatorTest();
  assert.equal(previews.length, 1);
  assert.equal(original.resumed, 1);
  assert.equal(board.sirenMode.value, 'fire');
  board.releaseSimulatorTest();
  await board.beginSimulatorTest();
  assert.equal(previews.length, 1);
  assert.equal(original.resumed, 2);
  assert.equal(board.playing.value.size, 1);
  board.stop();
});
test('Test reuses the current real recording position instead of rewinding', async () => {
  const { board, recordings, nextTick } = await soundboard();
  board.soundMode.value = 'real'; await nextTick();
  board.openSimulator(sirens[0]);
  await board.simulatorCommand('alert');
  recordings[0].currentTime = 8;
  await board.beginSimulatorTest();
  assert.equal(recordings.length, 1);
  assert.equal(recordings[0].currentTime, 8);
  board.releaseSimulatorTest();
  await board.beginSimulatorTest();
  assert.equal(recordings[0].currentTime, 8);
  assert.equal(recordings.length, 1);
  board.stop();
});

test('Cancel releases the activated cabinet button immediately while the rotor coasts', async () => {
  const { board, previews } = await soundboard();
  board.openSimulator(sirens[0]);
  await board.simulatorCommand('fire');
  assert.equal(board.simulatorActiveMode.value, 'fire');
  previews[0].stop = function() { this.stopped = true; };
  board.stopButton();
  assert.equal(board.simulatorActiveMode.value, null);
  assert.equal(board.playing.value.size, 1, 'audio remains tracked during its coast');
  previews[0].end();
  assert.equal(board.playing.value.size, 0);
});

test('full-speed release coasts slowly at first, stays continuous, and reaches exact silence', () => {
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() {} });
  const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator: node };
  const playback = startSimulatedSiren(context, sirens[0], { duration: 1, volume: 1, mode: 'attack', onEnded() {} });
  context.currentTime = 3;
  playback.stop();
  assert.equal(playback.speed, 1);
  context.currentTime = 4;
  assert.ok(playback.speed > .98, 'do not plunge in pitch during the first second');
  context.currentTime = 12;
  assert.ok(Math.abs(playback.speed - .5) < 1e-9);
  context.currentTime = 20;
  assert.ok(playback.speed > 0 && playback.speed < .02, 'retain a low tail instead of cutting off');
  context.currentTime = 21;
  assert.equal(playback.speed, 0);
});

test('cancelled Attack, Fire, and Alert resume the same motor at its current speed', () => {
  for (const mode of ['attack', 'fire', 'alert']) {
    let oscillatorCount = 0;
    const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
    const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() {} });
    const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator() { oscillatorCount++; return node(); } };
    const motor = startSimulatedSiren(context, sirens[0], { duration: 5, volume: 1, mode, onEnded() {} });
    context.currentTime = motor.cycle.windUp + .1;
    motor.stop(); context.currentTime += 2;
    const coastingSpeed = motor.speed;
    assert.ok(coastingSpeed > 0);
    assert.equal(motor.resumeSignal(), true);
    assert.equal(motor.speed, coastingSpeed, mode);
    context.currentTime += .1;
    assert.ok(motor.speed >= coastingSpeed, 're-powering must accelerate, not dive toward a trough');
    assert.equal(oscillatorCount, 2);
    motor.stop({ immediate: true });
  }
});
test('running signal dips stay above rotor-stopping speeds until the final coast', () => {
  for (const mode of ['attack', 'fire', 'alert']) {
    const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
    const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() {} });
    const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator: node };
    const motor = startSimulatedSiren(context, sirens[0], { duration: 5, volume: 1, mode, onEnded() {} });
    for (let time = motor.cycle.windUp; time < motor.cycle.windUp + motor.cycle.powered; time += .1) {
      context.currentTime = time;
      assert.ok(motor.speed >= motor.cycle.trough - 1e-8, mode);
    }
    if (mode === 'fire') assert.ok(motor.cycle.windUp + motor.cycle.peakHold + motor.cycle.dip < 4);
  }
});
const { startPlaceholderSound } = await sourceModule('placeholder-sounds');
test('keyboard and mouse fake sounds generate non-silent, click-free buffers and obey volume/loop/stop', () => {
  for (const kind of ['keyboard', 'mouse']) {
    let samples; let source;
    const gain = { value: 1, setValueAtTime(value) { this.value = value; }, cancelScheduledValues() {} };
    const context = { currentTime: 0, sampleRate: 48000, destination: {}, createBuffer(channels, size) { samples = new Float32Array(size); return { getChannelData: () => samples }; }, createGain() { return { gain, connect() {}, disconnect() {} }; }, createBufferSource() { source = { connect() {}, disconnect() {}, start() {}, stop() { this.onended(); } }; return source; } };
    let ended = 0;
    const player = startPlaceholderSound(context, { number: 2, kind, volume: 0, loop: true, onEnded() { ended++; } });
    assert.ok(samples.some(value => Math.abs(value) > .01));
    assert.equal(samples[0], 0);
    assert.ok(Math.abs(samples.at(-1)) < 1e-8);
    assert.equal(gain.value, 0);
    assert.equal(source.loop, true);
    player.setVolume(1); assert.equal(gain.value, 1);
    player.setLoop(false); assert.equal(source.loop, false);
    player.stop(); assert.equal(gain.value, 0); assert.equal(ended, 1);
  }
});
test('Keyboard and Mouse default to independent fake sources with live mute and Stop all', async () => {
  const { runInNewContext } = await import('node:vm');
  const { ref, computed, watch, nextTick } = await import('vue');
  const script = (await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')).split('<script setup>')[1].split('</script>')[0].replace(/^import .*;\n/gm, '');
  const players = [];
  const state = runInNewContext(`${script}\n;({ activeTab, keyboardSoundSource, mouseSoundSource, playSound, playMouseButton, systemVolume, loopSounds, stopAllAudio, statusText, lastSound })`, {
    ref, computed, watch, onMounted() {}, onBeforeUnmount() {},
    localStorage: { getItem() { return null; }, setItem() {} },
    window: { AudioContext: class { state = 'running'; }, setTimeout() { return 0; }, clearTimeout() {}, clearInterval() {} },
    startPlaceholderSound(context, options) { const player = { ...options, setVolume(value) { this.volume = value; }, setLoop(value) { this.loop = value; }, stop() { this.stopped = true; } }; players.push(player); return player; }
  });
  assert.equal(state.keyboardSoundSource.value, 'fake');
  assert.equal(state.mouseSoundSource.value, 'fake');
  await state.playSound(1);
  assert.equal(players[0].kind, 'keyboard');
  state.systemVolume.value = 0; await nextTick();
  assert.equal(players[0].volume, 0);
  state.loopSounds.value = true; await nextTick();
  assert.equal(players[0].loop, true);
  state.stopAllAudio(); assert.equal(players[0].stopped, true);
  state.keyboardSoundSource.value = 'real'; await nextTick();
  assert.match(state.statusText.value, /^Add files named/);
  state.activeTab.value = 'mouse'; await nextTick();
  await state.playMouseButton({ soundNumber: 2, label: 'Right Click' });
  assert.equal(players[1].kind, 'mouse');
  assert.equal(players[1].volume, 0);
  assert.equal(state.mouseSoundSource.value, 'fake');
  state.stopAllAudio();
});
