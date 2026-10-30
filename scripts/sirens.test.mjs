import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function sourceModule(name) {
  const source = await readFile(new URL(`../src/${name}.js`, import.meta.url), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { sirens, soundSources, findSound, findWindDown } = await sourceModule('sirens');
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
  assert.equal(playback.scheduledEnd, 178.02);
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
  const properties = ref({ loopSounds: loop }).value;
  const sandbox = {
    defineEmits: () => () => {},
    createSirenHold: () => ({ dispose() {} }),
    defineProps: () => properties,
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
    findWindDown: async () => null,
    getRecordingDetails: async () => null,
    getRecordingCatalog: async () => null,
    loadRecordedBuffer: async () => { throw new Error("Use recorded fallback in this backend"); },
    startHeldRecording() { throw new Error("No held recording backend configured"); },
    startSimulatedSiren(context, siren, options) {
      const preview = { transitionSignal(mode) { this.mode = mode; this.transitions = (this.transitions || 0) + 1; return true; }, resumeSignal() { this.signalResumes = (this.signalResumes || 0) + 1; return true; }, resume() { this.stopped = false; this.resumed = (this.resumed || 0) + 1; return true; }, destination: options.destination, initialVolume: options.volume, mode: options.mode, held: options.held, stopped: false, stop() { this.stopped = true; options.onEnded(); }, setVolume(value) { this.volume = value; }, end: options.onEnded };
      previews.push(preview);
      return preview;
    },
    Audio: class {
      constructor(url) { this.src = url; recordings.push(this); }
      play() { return Promise.resolve(); }
      pause() { this.paused = true; }
      removeAttribute() {} load() {}
    }
  };
  const board = runInNewContext(`${source}\n;({ play, stop, soundMode, playing, sounding, windingDown, status, volume, readinessText, isMobile, boardPage, boardPageCount, visibleSirens, manufacturer, allowMultiple, getMasterVolume: () => masterVolume, sirenMode, simulatorSiren, openSimulator, closeSimulator, simulatorCommand, stopButton, beginSimulatorTest, releaseSimulatorTest, simulatorActiveMode })`, sandbox);
  return { board, previews, recordings, nextTick, sandbox, props: properties };
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
test('custom real recordings without a companion stop looping and finish their own ending', async () => {
  const { board, recordings, sandbox, nextTick } = await soundboard(true);
  const queued = new Map(); let timerId = 0;
  sandbox.window.setTimeout = callback => { queued.set(++timerId, callback); return timerId; };
  sandbox.window.clearTimeout = id => queued.delete(id);
  board.soundMode.value = 'real'; await nextTick();
  await board.play(sirens[0]); await board.play(sirens[1]);
  assert.ok(recordings.every(audio => audio.loop));
  await board.play(sirens[0]);
  assert.equal(recordings[0].loop, false);
  assert.equal(recordings[1].loop, true);
  assert.equal(board.playing.value.size, 2);
  assert.equal(queued.size, 0, 'no short cancellation timer may truncate the recorded ending');
  recordings[0].onended();
  assert.equal(board.playing.value.size, 1);
  assert.equal(recordings[0].paused, true);
  assert.notEqual(recordings[1].paused, true);
  board.stop();
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
  assert.ok(modes[1].end > modes[2].end, 'Alert holds a longer steady signal than Fire');
  assert.ok(modes.every(oscillator => oscillator.frequency.points.at(-1)[0] === 20));
});
test('changing the main mode stops the current voice without recreating it', async () => {
  const { board, previews, nextTick } = await soundboard();
  await board.play(sirens[0]);
  assert.equal(previews[0].mode, 'attack');
  board.sirenMode.value = 'test'; await nextTick();
  assert.equal(board.playing.value.size, 0);
  assert.equal(previews[0].stopped, true);
  assert.equal(previews[0].mode, 'attack');
  assert.equal(previews.length, 1);
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
    const parameter = () => ({ points: [], cancelScheduledValues() {}, setValueAtTime(value, time) { this.points.push([value, time]); }, linearRampToValueAtTime(value, time) { this.points.push([value, time]); }, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
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
  assert.equal(long.playback.scheduledEnd, 3645.02);
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

test('Attack and Fire complete exactly ten full-speed wind-ups before coasting', () => {
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
  for (const mode of ['attack', 'fire']) {
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
    assert.equal(oscillator.end, (mode === 'fire' ? 93.5 : 176) + .02);
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
test('real held Test never repeats a complete recorded blast when power assets are missing', async () => {
  const { board, recordings, nextTick } = await soundboard();
  board.soundMode.value = 'real'; await nextTick(); board.openSimulator(sirens[0]);
  await board.beginSimulatorTest();
  assert.equal(recordings.length, 0);
  assert.equal(board.playing.value.size, 0);
  assert.match(board.status.value, /No recorded hold-to-run Test/);
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
  context.currentTime = 33;
  assert.ok(Math.abs(playback.speed - .5) < 1e-9);
  context.currentTime = 59;
  assert.ok(playback.speed > 0 && playback.speed < .02, 'retain a low tail instead of cutting off');
  context.currentTime = 63;
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
test('Keyboard and Mouse always play built-in sounds despite saved Real preferences, with live mute and Stop all', async () => {
  const { runInNewContext } = await import('node:vm');
  const { ref, computed, watch, nextTick } = await import('vue');
  const script = (await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')).split('<script setup>')[1].split('</script>')[0].replace(/^import .*;\n/gm, '');
  const players = [];
  const state = runInNewContext(`${script}\n;({ activeTab, playSound, playMouseButton, systemVolume, loopSounds, stopAllAudio, statusText, lastSound })`, {
    ref, computed, watch, onMounted() {}, onBeforeUnmount() {},
    localStorage: { getItem(key) { return ['key-noise-keyboard-source', 'key-noise-mouse-source'].includes(key) ? 'real' : null; }, setItem() {} },
    window: { AudioContext: class { state = 'running'; }, setTimeout() { return 0; }, clearTimeout() {}, clearInterval() {} },
    startPlaceholderSound(context, options) { const player = { ...options, setVolume(value) { this.volume = value; }, setLoop(value) { this.loop = value; }, stop() { this.stopped = true; } }; players.push(player); return player; }
  });
  assert.equal(state.statusText.value, '27 keyboard sounds ready');
  await state.playSound(1);
  assert.equal(players[0].kind, 'keyboard');
  state.systemVolume.value = 0; await nextTick();
  assert.equal(players[0].volume, 0);
  state.loopSounds.value = true; await nextTick();
  assert.equal(players[0].loop, true);
  state.stopAllAudio(); assert.equal(players[0].stopped, true);
  state.activeTab.value = 'mouse'; await nextTick();
  await state.playMouseButton({ soundNumber: 2, label: 'Right Click' });
  assert.equal(players[1].kind, 'mouse');
  assert.equal(players[1].volume, 0);
  assert.equal(state.statusText.value, '2 mouse sounds ready');
  assert.equal(state.lastSound.value, 'Sound 2');
  state.stopAllAudio();
});

test('Test retains its first-second release feel then settles into a slow resumable tail', () => {
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() {} });
  const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator: node };
  const motor = startSimulatedSiren(context, sirens[0], { duration: 1, volume: 1, mode: 'test', held: true, onEnded() {} });
  context.currentTime = 3; motor.stop();
  context.currentTime = 3.5;
  assert.ok(Math.abs(motor.speed - Math.pow(1 - .5 / 4, 1.6)) < 1e-9);
  context.currentTime = 4;
  assert.ok(Math.abs(motor.speed - Math.pow(.75, 1.6)) < 1e-9);
  context.currentTime = 5;
  assert.ok(motor.speed > .6, 'the tail must remain spinning after a second without reapplying power');
  const remainingSpeed = motor.speed;
  assert.equal(motor.resume(), true);
  assert.equal(motor.speed, remainingSpeed);
  context.currentTime += .5;
  assert.ok(motor.speed > remainingSpeed);
  motor.stop();
  context.currentTime = motor.scheduledEnd;
  assert.equal(motor.speed, 0);
});

test('Attack dips gradually between wind-ups without stopping the rotor', () => {
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() {} });
  for (const mode of ['attack']) {
    const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator: node };
    const motor = startSimulatedSiren(context, sirens[0], { duration: 5, volume: 1, mode, onEnded() {} });
    const firstDrop = motor.cycle.windUp + motor.cycle.peakHold;
    assert.equal(motor.cycle.windUp + motor.cycle.peakHold, 8, 'each powered interval lasts eight seconds');
    assert.equal(motor.cycle.dip, 4, 'each intermediate coast lasts four seconds');
    context.currentTime = firstDrop + 2;
    assert.ok(Math.abs(motor.speed - .85) < 1e-9, 'halfway through a dip the rotor retains 85% speed');
    context.currentTime = firstDrop + 1;
    assert.ok(motor.speed > .95, `${mode} should not plunge during the first second of a partial coast`);
    context.currentTime = firstDrop + motor.cycle.dip;
    assert.ok(Math.abs(motor.speed - motor.cycle.trough) < 1e-9);
    assert.ok(motor.speed > .4, 'the next wind-up starts from a spinning rotor');
    context.currentTime += motor.cycle.windUp;
    assert.ok(Math.abs(motor.speed - 1) < 1e-9);
    context.currentTime = motor.scheduledEnd;
    assert.equal(motor.speed, 0, 'full shutdown still completes at the very end');
  }
});

test('different signal transitions preserve current speed and oscillator identity during running and coast-down', () => {
  const nodes = [];
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() { this.stopped = true; } });
  const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator() { const n = node(); nodes.push(n); return n; } };
  const motor = startSimulatedSiren(context, sirens[0], { duration: 5, volume: 1, mode: 'attack', onEnded() {} });
  context.currentTime = 8;
  const runningSpeed = motor.speed;
  assert.equal(motor.transitionSignal('alert'), true);
  assert.equal(motor.speed, runningSpeed);
  assert.equal(motor.cycle.powered, 180);
  context.currentTime += 5;
  motor.stop();
  context.currentTime += 3;
  const coastingSpeed = motor.speed;
  assert.equal(motor.transitionSignal('fire'), true);
  assert.equal(motor.speed, coastingSpeed);
  context.currentTime += .1;
  assert.ok(motor.speed >= coastingSpeed);
  assert.equal(nodes.length, 2);
  assert.ok(nodes.every(n => !n.stopped));
  motor.stop({ immediate: true });
});
test('cabinet switches signals on one rotor instead of stopping/recreating it', async () => {
  const { board, previews } = await soundboard();
  board.openSimulator(sirens[0]);
  await board.simulatorCommand('attack');
  await board.simulatorCommand('alert');
  assert.equal(previews.length, 1);
  assert.equal(previews[0].stopped, false);
  assert.equal(previews[0].mode, 'alert');
  assert.equal(previews[0].transitions, 1);
  previews[0].stop = function() { this.stopped = true; };
  board.stopButton();
  await board.simulatorCommand('fire');
  assert.equal(previews.length, 1);
  assert.equal(previews[0].mode, 'fire');
  assert.equal(board.simulatorActiveMode.value, 'fire');
  board.stop();
});
test('recorded mode changes fade the previous file before starting the next', async () => {
  const { board, recordings, nextTick } = await soundboard();
  board.soundMode.value = 'real'; await nextTick();
  board.openSimulator(sirens[0]);
  await board.simulatorCommand('alert');
  await board.simulatorCommand('fire');
  assert.equal(recordings.length, 2);
  assert.equal(recordings[0].paused, true);
  assert.notEqual(recordings[1].paused, true);
  board.stop();
});

test('turning Loop off cancels every queued repeat for layered sirens', async () => {
  const { board, previews, sandbox, props } = await soundboard(true);
  const queued = new Map(); let timer = 0;
  sandbox.window.setTimeout = callback => { queued.set(++timer, callback); return timer; };
  sandbox.window.clearTimeout = id => queued.delete(id);
  await board.play(sirens[0]); await board.play(sirens[1]);
  previews[0].end(); previews[1].end();
  const staleCallbacks = [...queued.values()];
  assert.equal(queued.size, 2);
  props.loopSounds = false;
  assert.equal(queued.size, 0, 'disable pending repeats immediately, before another complete sequence starts');
  staleCallbacks.forEach(callback => callback());
  assert.equal(previews.length, 2);
  assert.equal(board.playing.value.size, 0);
});
test('layered sirens each play once when Loop starts off', async () => {
  const { board, previews, sandbox } = await soundboard();
  const queued = [];
  sandbox.window.setTimeout = callback => { queued.push(callback); return queued.length; };
  sandbox.window.clearTimeout = () => {};
  for (const siren of sirens.slice(0, 3)) await board.play(siren);
  previews.forEach(preview => preview.end());
  assert.equal(queued.length, 0);
  assert.equal(previews.length, 3);
  assert.equal(board.playing.value.size, 0);
});
test('turning Loop off updates all active real recordings and lets each end once', async () => {
  const { board, recordings, props, nextTick } = await soundboard(true);
  board.soundMode.value = 'real'; await nextTick();
  await board.play(sirens[0]); await board.play(sirens[1]);
  props.loopSounds = false;
  assert.ok(recordings.every(audio => audio.loop === false));
  recordings.forEach(audio => audio.onended());
  assert.equal(board.playing.value.size, 0);
  assert.equal(recordings.length, 2);
});

test('Attack keeps strong rotor speed through every intermediate dip', () => {
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() {} });
  for (const [mode, floor] of [['attack', .70]]) {
    const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator: node };
    const motor = startSimulatedSiren(context, sirens[0], { duration: 5, volume: 1, mode, onEnded() {} });
    const span = motor.cycle.windUp + motor.cycle.peakHold + motor.cycle.dip;
    for (let pulse = 1; pulse < 10; pulse++) {
      context.currentTime = pulse * span;
      assert.ok(Math.abs(motor.speed - floor) < 1e-9, 'intermediate rotor speed must not approach the final shutdown growl');
      context.currentTime += motor.cycle.windUp;
      assert.ok(Math.abs(motor.speed - 1) < 1e-9);
    }
    context.currentTime = motor.scheduledEnd;
    assert.equal(motor.speed, 0);
  }
});

test('Alert winds up once, holds one steady three-minute tone, and coasts only at the end', () => {
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() {} });
  const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator: node };
  const motor = startSimulatedSiren(context, sirens[0], { duration: 1, volume: 1, mode: 'alert', onEnded() {} });
  assert.equal(motor.cycle.surges, undefined);
  assert.equal(motor.cycle.powered, 180);
  context.currentTime = 0; assert.equal(motor.speed, 0);
  for (let time = 4; time <= 184; time += .25) {
    context.currentTime = time;
    assert.equal(motor.speed, 1, 'no intermediate wind-downs during the steady Alert');
  }
  context.currentTime = 214;
  assert.equal(motor.speed, .5);
  context.currentTime = 244;
  assert.equal(motor.speed, 0);
  assert.equal(motor.scheduledEnd, 244.02);
});


test('natural final coasts retain a long tail and can be re-powered without restarting the rotor', () => {
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  const node = () => ({ gain: parameter(), frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() {} });
  for (const mode of ['attack', 'fire', 'alert']) {
    const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator: node };
    const motor = startSimulatedSiren(context, sirens[0], { duration: 1, volume: 1, mode, onEnded() {} });
    assert.equal(motor.cycle.windDown, 60);
    const coastStart = motor.cycle.windUp + motor.cycle.powered;
    context.currentTime = coastStart;
    assert.equal(motor.speed, 1);
    context.currentTime += 1;
    assert.ok(motor.speed > .99, 'the final coast must ease away from full speed');
    context.currentTime = coastStart + 45;
    assert.ok(motor.speed > .1, 'a low growl must still exist well past the old cutoff');
    const speed = motor.speed;
    assert.equal(motor.transitionSignal('attack'), true);
    assert.equal(motor.speed, speed, 're-powering keeps the remaining momentum');
    motor.stop({ immediate: true });
  }
  const context = { currentTime: 0, destination: {}, createGain: node, createBiquadFilter: node, createOscillator: node };
  const motor = startSimulatedSiren(context, sirens[0], { duration: 1, volume: 1, mode: 'test', held: true, onEnded() {} });
  context.currentTime = 3; motor.stop();
  context.currentTime = 33;
  assert.ok(motor.speed > .1, 'a fully powered Test release retains its low tail for thirty seconds');
  const speed = motor.speed;
  assert.equal(motor.resume(), true);
  assert.equal(motor.speed, speed);
});


test('bundled real recordings match catalog modes, provenance, and intact audio files', async () => {
  const base = new URL('../public/sounds/sirens/', import.meta.url);
  const { recordings } = JSON.parse(await readFile(new URL('recordings.json', base), 'utf8'));
  const credits = await readFile(new URL('CREDITS.html', base), 'utf8');
  assert.equal(recordings.length, 56);
  assert.equal(new Set(recordings.map(r => r.sirenId)).size, 32);
  assert.equal(new Set(recordings.map(r => `${r.sirenId}:${r.mode}`)).size, recordings.length);
  for (const recording of recordings) {
    const siren = sirens.find(s => s.id === recording.sirenId);
    assert.ok(siren, recording.fileName);
    assert.ok(soundSources(siren, recording.mode).some(s => s.fileName === recording.fileName));
    assert.ok(recording.author && recording.license && recording.notes);
    assert.ok(credits.includes(recording.author), 'credits must name each recorder');
    assert.ok(credits.includes(recording.sourceUrl), 'credits must link each source');
    assert.ok(credits.includes(recording.licenseUrl), 'credits must link each license');
    assert.match(recording.sourceUrl, /^https:\/\//);
    assert.ok(recording.durationSeconds > 2);
    const data = await readFile(new URL(recording.fileName, base));
    assert.equal(data.length, recording.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'), recording.sha256);
    if (recording.fileName.endsWith('.m4a')) assert.equal(data.toString('ascii', 4, 8), 'ftyp');
    else assert.ok(data.toString('ascii', 0, 3) === 'ID3' || data[0] === 0xff, recording.fileName);
  }
});

test('real file lookup discovers bundled AAC and MP3 modes without assigning unrelated recordings', async () => {
  const base = new URL('../public/sounds/sirens/', import.meta.url);
  const { recordings } = JSON.parse(await readFile(new URL('recordings.json', base), 'utf8'));
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async url => {
      try {
        await stat(new URL(url.split('/').at(-1), base));
        return { ok: true, headers: new Headers({ 'content-type': url.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg' }) };
      } catch { return { ok: true, headers: new Headers({ 'content-type': 'text/html' }) }; }
    };
    for (const recording of recordings) {
      assert.equal((await findSound(sirens.find(s => s.id === recording.sirenId), recording.mode)).fileName, recording.fileName);
    }
    assert.equal(await findSound(sirens.find(s => s.id === 'whelen-wps-2901'), 'alert'), null);
    assert.equal(await findSound(sirens.find(s => s.id === 'federal-signal-thunderbolt-1000t'), 'attack'), null);
    assert.equal(await findSound(sirens.find(s => s.id === 'sentry-10v'), 'fire'), null);
  } finally { globalThis.fetch = original; }
});

function configureHeldBackend(sandbox, siren) {
  const voices = [];
  sandbox.getRecordingCatalog = async () => ({ heldTests: [{ sirenId: siren.id, fileName: 'power.m4a', windDownFileName: 'tail.m4a', loopStartSeconds: 2, loopEndSeconds: 3 }] });
  sandbox.loadRecordedBuffer = async () => ({});
  sandbox.startHeldRecording = (context, power, tail, options) => {
    const voice = { releases: 0, resumes: 0, release() { this.releases++; }, resume() { this.resumes++; return true; }, stop() { this.stopped = true; }, end: options.onEnded };
    voices.push(voice); return voice;
  };
  return voices;
}
test('real Test holds a recorded sustain and releases to its actual shutdown, ignoring Loop', async () => {
  const { board, sandbox, recordings, nextTick } = await soundboard(true);
  const voices = configureHeldBackend(sandbox, sirens[0]);
  board.soundMode.value = 'real'; await nextTick(); board.openSimulator(sirens[0]);
  await board.beginSimulatorTest();
  assert.equal(voices.length, 1);
  assert.equal(recordings.length, 0, 'a complete test blast is never looped through HTML audio');
  board.releaseSimulatorTest();
  assert.equal(voices[0].releases, 1);
  assert.equal(board.simulatorActiveMode.value, null);
  assert.equal(board.playing.value.size, 1);
  voices[0].end();
  assert.equal(board.playing.value.size, 0);
});
test('re-pressing real Test resumes its recorded power engine instead of sampling a new artificial tone', async () => {
  const { board, sandbox, nextTick } = await soundboard();
  const voices = configureHeldBackend(sandbox, sirens[0]);
  board.soundMode.value = 'real'; await nextTick(); board.openSimulator(sirens[0]);
  await board.beginSimulatorTest(); board.releaseSimulatorTest();
  await board.beginSimulatorTest();
  assert.equal(voices.length, 1);
  assert.equal(voices[0].resumes, 1);
  assert.equal(board.simulatorActiveMode.value, 'test');
  board.stopButton(); board.stopButton();
  assert.equal(voices[0].stopped, true);
  assert.equal(board.playing.value.size, 0);
});

test('Cancel during an existing recorded ending leaves its playhead and tail intact', async () => {
  const { board, recordings, sandbox, nextTick } = await soundboard(true);
  sandbox.findWindDown = async () => ({ url: './model-winddown.m4a' });
  sandbox.getRecordingDetails = async () => ({ windDownStartSeconds: 10 });
  board.soundMode.value = 'real'; await nextTick();
  await board.play(sirens[0]); recordings[0].currentTime = 13;
  board.stopButton(); await nextTick(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(recordings.length, 1, 'do not restart a full-speed tail when already coasting');
  assert.equal(recordings[0].currentTime, 13);
  assert.equal(recordings[0].loop, false);
  assert.equal(board.playing.value.size, 1);
  recordings[0].onended();
  assert.equal(board.playing.value.size, 0);
});

test('a source change tears down a pending recorded shutdown without late playback', async () => {
  const { board, recordings, sandbox, nextTick } = await soundboard();
  sandbox.findWindDown = async () => ({ url: './model-winddown.m4a' });
  board.soundMode.value = 'real'; await nextTick(); await board.play(sirens[0]);
  let resolveTail;
  sandbox.Audio.prototype.play = function () { return new Promise(resolve => { resolveTail = resolve; }); };
  board.stopButton(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(recordings.length, 2);
  board.soundMode.value = 'fake'; await nextTick(); resolveTail(); await nextTick();
  assert.equal(board.playing.value.size, 0);
  assert.ok(recordings.every(audio => audio.paused));
});

test('every bundled model has an attributed, intact shutdown file and mode-specific tails win', async () => {
  const base = new URL('../public/sounds/sirens/', import.meta.url);
  const { recordings, windDowns } = JSON.parse(await readFile(new URL('recordings.json', base), 'utf8'));
  const credits = await readFile(new URL('CREDITS.html', base), 'utf8');
  assert.equal(windDowns.length, 33);
  assert.equal(new Set(windDowns.map(tail => tail.sirenId)).size, 31);
  for (const tail of windDowns) {
    const data = await readFile(new URL(tail.fileName, base));
    assert.equal(createHash('sha256').update(data).digest('hex'), tail.sha256);
    assert.equal(data.length, tail.bytes);
    assert.equal(data.toString('ascii', 4, 8), 'ftyp');
    assert.ok(tail.durationSeconds > 2);
    assert.ok(credits.includes(tail.author) && credits.includes(tail.sourceUrl) && credits.includes(tail.licenseUrl));
  }
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async url => {
      try { await stat(new URL(url.split('/').at(-1), base)); return { ok: true, headers: new Headers({ 'content-type': 'audio/mp4' }) }; }
      catch { return { ok: true, headers: new Headers({ 'content-type': 'text/html' }) }; }
    };
    for (const recording of recordings.filter(recording => !['chime', 'airhorn'].includes(recording.mode))) {
      assert.ok(await findWindDown(sirens.find(siren => siren.id === recording.sirenId), recording.mode), recording.fileName);
    }
    const hormann = sirens.find(siren => siren.id === 'h-rmann-hls-273');
    assert.equal((await findWindDown(hormann, 'attack')).fileName, 'h-rmann-hls-273-attack-winddown.m4a');
    assert.equal((await findWindDown(hormann, 'alert')).fileName, 'h-rmann-hls-273-alert-winddown.m4a');
  } finally { globalThis.fetch = original; }
});

test('siren active styling follows started audio, remains during coast, and clears on finish', async () => {
  const { board, sandbox, recordings, nextTick } = await soundboard();
  board.soundMode.value = 'real'; await nextTick();
  let resolveFile;
  sandbox.findSound = () => new Promise(resolve => { resolveFile = resolve; });
  const pending = board.play(sirens[0]);
  assert.equal(board.playing.value.size, 1, 'pending work stays cancellable');
  assert.equal(board.sounding.value.size, 0, 'pending lookup must not turn the pad green');
  resolveFile({ url: './sound.mp3', fileName: 'sound.mp3' }); await pending;
  assert.equal(board.sounding.value.has(sirens[0].id), true);
  board.stopButton(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(board.sounding.value.has(sirens[0].id), true, 'a coasting pad stays green');
  recordings[0].onended();
  assert.equal(board.sounding.value.size, 0);
});


test('a second Stop hard-stops every coasting voice and clears green and winding-down state', async () => {
  const { board, previews } = await soundboard();
  await board.play(sirens[0]); await board.play(sirens[1]);
  for (const preview of previews) preview.stop = function () { this.stopped = true; };
  board.stopButton();
  assert.equal(board.windingDown.value.size, 2);
  assert.equal(board.sounding.value.size, 2);
  assert.match(board.status.value, /Stopped.*winding down/);
  board.stopButton();
  assert.equal(board.playing.value.size, 0);
  assert.equal(board.sounding.value.size, 0);
  assert.equal(board.windingDown.value.size, 0);
});
test('tapping a coasting soundboard pad stops it; simulator power controls still resume', async () => {
  const { board, previews } = await soundboard();
  await board.play(sirens[0]); previews[0].stop = () => {};
  await board.play(sirens[0]);
  assert.equal(board.windingDown.value.has(sirens[0].id), true);
  await board.play(sirens[0]);
  assert.equal(board.playing.value.size, 0);
  board.openSimulator(sirens[0]); await board.simulatorCommand('alert');
  previews[1].stop = () => {};
  board.stopButton(); await board.simulatorCommand('alert');
  assert.equal(board.playing.value.size, 1);
  assert.equal(board.windingDown.value.size, 0);
  board.stop();
});


test('recorded chime and air-horn modes reset to Attack when switching to fake sounds', async () => {
  const { board, nextTick } = await soundboard();
  board.soundMode.value = 'real'; await nextTick();
  board.sirenMode.value = 'chime'; await nextTick();
  board.soundMode.value = 'fake'; await nextTick();
  assert.equal(board.sirenMode.value, 'attack');
});

test('Dropbox audit accounts for source files and exposes STH-10 playback and loop components accurately', async () => {
  const base = new URL('../public/sounds/sirens/', import.meta.url);
  const inventory = JSON.parse(await readFile(new URL('dropbox-inventory.json', base), 'utf8'));
  const { recordings } = JSON.parse(await readFile(new URL('recordings.json', base), 'utf8'));
  assert.equal(inventory.files.length, 79);
  assert.equal(new Set(inventory.files.map(file => file.originalFile)).size, 79);
  for (const file of inventory.files) {
    assert.ok(file.disposition && file.durationSeconds > 0);
    for (const name of file.includedAs) assert.ok((await stat(new URL(name, base))).isFile());
  }
  const sth10 = recordings.filter(recording => recording.sirenId === 'federal-signal-sth-10');
  assert.deepEqual(sth10.map(recording => recording.mode).sort(), ['alert', 'test']);
  assert.match(inventory.files.find(file => file.originalFile === 'federalsignal_sth10_startloop.wav').disposition, /hold-to-run/);
  assert.ok(recordings.some(recording => recording.sirenId === 'american-signal-e-class' && recording.mode === 'chime'));
  assert.ok(recordings.some(recording => recording.sirenId === 'whelen-wps-4004' && recording.mode === 'airhorn'));
});

const { startHeldRecording } = await sourceModule('held-recording');
function heldRecordingBackend() {
  const voices = [];
  const context = { currentTime: 0, destination: {},
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, cancelAndHoldAtTime() {} }, connect() {}, disconnect() {} }; },
    createBufferSource() { const source = { connect() {}, disconnect() {}, start(at, offset) { this.started = { at, offset }; }, stop(at) { this.stoppedAt = at; } }; voices.push(source); return source; }
  };
  const options = { loopStart: 3, loopEnd: 5, powerCurve: [[0,0],[1,.3],[2,.7],[3,1]], windDownCurve: [[0,1],[10,.7],[20,.3],[30,0]], onEnded() {} };
  return { context, voices, options, power: { duration: 5 }, tail: { duration: 30 } };
}
test('recorded hold-to-run Test plays startup once and loops only the authored steady section indefinitely', () => {
  const { context, voices, options, power, tail } = heldRecordingBackend();
  const test = startHeldRecording(context, power, tail, options);
  assert.equal(voices[0].buffer, power);
  assert.equal(voices[0].loop, true);
  assert.equal(voices[0].loopStart, 3);
  assert.equal(voices[0].loopEnd, 5);
  context.currentTime = 3600;
  assert.equal(test.phase, 'power');
  assert.equal(voices.length, 1, 'holding never starts a shutdown or repeats startup');
  assert.equal(voices[0].stoppedAt, undefined);
  test.release();
  assert.equal(voices[1].buffer, tail);
  assert.equal(voices[1].loop, false);
  assert.equal(voices[1].started.offset, 0);
  assert.equal(voices[1].playbackRate, undefined, 'real wind-down is not artificially pitch shifted');
  test.stop();
});
test('partial real Test release and re-press choose matching recorded positions without restarting from rest', () => {
  const { context, voices, options, power, tail } = heldRecordingBackend();
  const test = startHeldRecording(context, power, tail, options);
  context.currentTime = 2; test.release();
  assert.equal(voices[1].started.offset, 10, '70% startup selects the matching actual shutdown position');
  context.currentTime = 12; test.resume();
  assert.equal(voices[2].buffer, power);
  assert.equal(voices[2].started.offset, 1, '30% shutdown resumes the actual startup above rest');
  assert.equal(test.phase, 'power');
  test.stop();
});
test('recorded shutdown finishes exactly once and retired power sources cannot stop a resumed Test', () => {
  const { context, voices, options, power, tail } = heldRecordingBackend();
  let ended = 0;
  const test = startHeldRecording(context, power, tail, { ...options, onEnded() { ended++; } });
  context.currentTime = 5; test.release();
  const retired = voices[0].onended;
  retired(); assert.equal(ended, 0);
  test.resume(); voices[1].onended(); assert.equal(ended, 0);
  test.release(); voices.at(-1).onended();
  assert.equal(ended, 1);
  assert.equal(test.resume(), false);
});
test('all bundled Test recordings have attributed startup/sustain assets with valid authored loop markers', async () => {
  const base = new URL('../public/sounds/sirens/', import.meta.url);
  const { recordings, heldTests } = JSON.parse(await readFile(new URL('recordings.json', base), 'utf8'));
  assert.equal(heldTests.length, 18);
  for (const recording of recordings.filter(recording => recording.mode === 'test')) {
    const asset = heldTests.find(test => test.sirenId === recording.sirenId);
    assert.ok(asset, recording.fileName);
    assert.ok(asset.loopStartSeconds >= 0 && asset.loopEndSeconds > asset.loopStartSeconds);
    assert.ok(asset.loopEndSeconds <= asset.durationSeconds + .01);
    const bytes = await readFile(new URL(asset.fileName, base));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    assert.ok((await stat(new URL(asset.windDownFileName, base))).isFile());
  }
});
test('releasing Real Test while recorded power assets decode cannot start a late sustain loop', async () => {
  const { board, sandbox, nextTick } = await soundboard();
  const voices = configureHeldBackend(sandbox, sirens[0]);
  const decodes = [];
  sandbox.loadRecordedBuffer = () => new Promise(resolve => decodes.push(resolve));
  board.soundMode.value = 'real'; await nextTick(); board.openSimulator(sirens[0]);
  const pending = board.beginSimulatorTest(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(decodes.length, 2);
  board.releaseSimulatorTest();
  for (const resolve of decodes) resolve({});
  await pending;
  assert.equal(voices.length, 0);
  assert.equal(board.playing.value.size, 0);
  assert.equal(board.simulatorActiveMode.value, null);
});

for (const mode of ['alert', 'attack', 'fire', 'test']) {
  test(`Real ${mode} cancellation uses only the recorded shutdown at native rate`, async () => {
    const { board, sandbox, recordings, previews, nextTick } = await soundboard(true);
    const sth10 = sirens.find(siren => siren.id === 'federal-signal-sth-10');
    sandbox.findWindDown = async () => ({ url: './sth-10-recorded-winddown.m4a' });
    sandbox.loadRecordedBuffer = () => { throw new Error('Signal cancellation must never decode/resynthesize a tone'); };
    board.soundMode.value = 'real'; await nextTick();
    board.sirenMode.value = mode; await nextTick();
    await board.play(sth10);
    board.stopButton(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(previews.length, 0, 'no fake sound can enter Real playback');
    assert.equal(recordings.length, 2, 'the actual shutdown file is played');
    assert.equal(recordings[1].src, './sth-10-recorded-winddown.m4a');
    assert.equal(recordings[1].loop, false);
    assert.equal(recordings[1].playbackRate, undefined, 'leave native playback rate untouched');
    assert.equal(recordings[0].loop, false);
    assert.equal(board.windingDown.value.has(sth10.id), true);
    recordings[1].onended();
    assert.equal(board.playing.value.size, 0);
    assert.equal(board.sounding.value.size, 0);
  });
}
test('a failed recorded shutdown finishes the original without fake audio or looping', async () => {
  const { board, sandbox, recordings, previews, nextTick } = await soundboard(true);
  sandbox.findWindDown = async () => ({ url: './shutdown.m4a' });
  board.soundMode.value = 'real'; await nextTick(); await board.play(sirens[0]);
  board.stopButton(); await new Promise(resolve => setImmediate(resolve));
  recordings[1].onerror();
  assert.equal(recordings[0].loop, false);
  assert.equal(previews.length, 0);
  recordings[0].onended();
  assert.equal(board.playing.value.size, 0);
});

for (const source of ['fake', 'real']) {
  test(`main mode dropdown immediately stops every ${source} siren instead of changing its signal`, async () => {
    const { board, previews, recordings, nextTick } = await soundboard(true);
    board.soundMode.value = source; await nextTick();
    board.sirenMode.value = 'alert'; await nextTick();
    await board.play(sirens[0]); await board.play(sirens[1]);
    assert.equal(board.playing.value.size, 2);
    board.sirenMode.value = 'attack'; await nextTick();
    assert.equal(board.playing.value.size, 0);
    assert.equal(board.sounding.value.size, 0);
    assert.equal(board.windingDown.value.size, 0);
    assert.ok(previews.every(preview => preview.stopped));
    assert.ok(recordings.every(audio => audio.paused));
    assert.equal(previews.length + recordings.length, 2, 'no replacement sound starts');
  });
}
test('main mode dropdown cancels a pending recording lookup without late playback', async () => {
  const { board, sandbox, recordings, nextTick } = await soundboard();
  board.soundMode.value = 'real'; await nextTick();
  board.sirenMode.value = 'alert'; await nextTick();
  let resolveFile;
  sandbox.findSound = () => resolveFile ? Promise.resolve(null) : new Promise(resolve => { resolveFile = resolve; });
  const pending = board.play(sirens[0]);
  board.sirenMode.value = 'attack'; await nextTick();
  resolveFile({ url: './alert.m4a', fileName: 'alert.m4a' }); await pending;
  assert.equal(recordings.length, 0);
  assert.equal(board.playing.value.size, 0);
});
