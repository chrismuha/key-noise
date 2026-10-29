import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
async function sourceModule(name) {
  const source = await readFile(new URL(`../src/${name}.js`, import.meta.url), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { sirens, soundSources, findSound } = await sourceModule('sirens');
const { startSimulatedSiren } = await sourceModule('siren-synthesis');
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
  assert.equal(nodes[3].stopped, 7);
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
    defineProps: () => ({ loopSounds: loop }),
    ref, computed, watch, sirens, onMounted() {}, onBeforeUnmount() {},
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
      const preview = { destination: options.destination, initialVolume: options.volume, stopped: false, stop() { this.stopped = true; options.onEnded(); }, setVolume(value) { this.volume = value; }, end: options.onEnded };
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
  const board = runInNewContext(`${source}\n;({ play, stop, soundMode, playing, volume, readinessText, isMobile, boardPage, boardPageCount, visibleSirens, manufacturer, allowMultiple, getMasterVolume: () => masterVolume })`, sandbox);
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
test('real loops repeat at the configured limit and remain individually stoppable', async () => {
  const { board, recordings, sandbox, nextTick } = await soundboard(true);
  const queued = new Map(); let timerId = 0;
  sandbox.window.setTimeout = callback => { queued.set(++timerId, callback); return timerId; };
  sandbox.window.clearTimeout = id => queued.delete(id);
  board.soundMode.value = 'real'; await nextTick();
  await board.play(sirens[0]); await board.play(sirens[1]);
  assert.ok(recordings.every(audio => audio.loop));
  recordings[0].currentTime = 4;
  const [id, limit] = queued.entries().next().value;
  queued.delete(id); limit();
  assert.equal(recordings[0].currentTime, 0);
  assert.equal(board.playing.value.size, 2);
  await board.play(sirens[0]);
  assert.equal(board.playing.value.size, 1);
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
