<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';
import { sirens, findSound } from './sirens';
import SirenSimulator from './SirenSimulator.vue';
import { createSirenHold } from './siren-hold';
import { startSimulatedSiren } from './siren-synthesis';
const emit = defineEmits(['update:loopSounds']);
const simulatorSiren = ref(null);
const simulatorTestHeld = ref(false);
const simulatorActiveMode = ref(null);
let simulatorCommandRequest = 0;
const props = defineProps({ loopSounds: { type: Boolean, default: false } });
function savedSoundMode() {
  try { return localStorage.getItem('key-noise-simulated-sirens') === 'off' ? 'real' : 'fake'; }
  catch { return 'fake'; }
}
const soundMode = ref(savedSoundMode());
const allowMultiple = ref(true);
const sirenMode = ref('attack');
const modeLabels = { attack: 'Attack', alert: 'Alert', fire: 'Fire', test: 'Test / Growl' };
const modeDescriptions = {
  attack: 'Ten continuous wails with shallow, gradual pitch dips; fully coasts down only at the end.',
  alert: 'One wind-up, a steady three-minute tone, then a gradual full coast-down.',
  fire: 'Fire: ten fast wails with shallow dips, followed by one final coast-down.',
  test: 'A low growl with a short wind-up and a complete coast-down.'
};
function expectedFile(siren) { return `${siren.id}-${sirenMode.value}.mp3`; }
const simulated = computed(() => soundMode.value === 'fake');
const boardPage = ref(1);
const isMobile = ref(false);
let mobileMedia;
function updateMobileLayout() { isMobile.value = mobileMedia.matches; }
const manufacturer = ref('All manufacturers');
const search = ref('');
const duration = ref(5);
function savedVolume() {
  try {
    const saved = localStorage.getItem('key-noise-siren-volume');
    const value = Number(saved);
    return saved !== null && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 25;
  } catch { return 25; }
}
const volume = ref(savedVolume());
const playing = ref(new Set());
const status = ref('Choose a model to play.');
const available = ref(new Set());
const scanning = ref(false);
const manufacturers = [...new Set(sirens.map((siren) => siren.manufacturer))];
const filtered = computed(() => sirens.filter((siren) =>
  (manufacturer.value === 'All manufacturers' || siren.manufacturer === manufacturer.value) &&
  `${siren.manufacturer} ${siren.model} ${siren.type}`.toLowerCase().includes(search.value.trim().toLowerCase())
));
const readinessText = computed(() => simulated.value
  ? `${sirens.length} fake sounds ready`
  : available.value.size
    ? `${available.value.size} sound${available.value.size === 1 ? '' : 's'} ready`
    : `Add files named ${expectedFile(sirens[0])} and onward in public/sounds/sirens`);
const playbackText = computed(() => playing.value.size
  ? `${playing.value.size} siren${playing.value.size === 1 ? '' : 's'} playing · ${status.value}`
  : status.value);
const sessions = new Map();
const boardPageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / 6)));
const visibleSirens = computed(() => isMobile.value ? filtered.value.slice((boardPage.value - 1) * 6, boardPage.value * 6) : filtered.value);
watch([manufacturer, search], () => { boardPage.value = 1; });
let context;
let masterVolume;
async function getAudioOutput() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  context ||= new AudioContext();
  if (!masterVolume) {
    masterVolume = context.createGain();
    masterVolume.gain.setValueAtTime(volume.value / 100, context.currentTime);
    masterVolume.connect(context.destination);
  }
  if (context.state !== 'running') await context.resume();
  return masterVolume;
}
let disposed = false;
let scanRequest = 0;
let preservedModeChange = null;
function finish(id, session) {
  if (sessions.get(id) !== session) return;
  sessions.delete(id);
  if (simulatorSiren.value?.id === id) simulatorActiveMode.value = null;
  window.clearTimeout(session.timer);
  session.simulation?.stop({ immediate: true });
  if (session.audio) {
    session.audio.onended = null;
    session.audio.onerror = null;
    session.source?.disconnect();
    session.output?.disconnect();
    session.audio.pause();
    session.audio.removeAttribute('src');
    session.audio.load();
  }
  playing.value.delete(id);
}
function windDown(id, session) {
  if (simulatorSiren.value?.id === id) simulatorActiveMode.value = null;
  if (session.stopping) return;
  session.stopping = true;
  window.clearTimeout(session.timer);
  if (session.simulation) {
    session.simulation.stop();
    status.value = 'Winding down…';
  } else {
    // Recordings contain their own motor sound; fade only an explicit cancellation.
    if (session.output) {
      session.output.gain.cancelAndHoldAtTime(context.currentTime);
      session.output.gain.linearRampToValueAtTime(0, context.currentTime + 0.15);
      session.timer = window.setTimeout(() => finish(id, session), 160);
    } else finish(id, session);
  }
}
function stop() {
  for (const [id, session] of sessions) finish(id, session);
}
function openSimulator(siren) {
  simulatorActiveMode.value = null;
  simulatorTestHeld.value = false;
  simulatorCommandRequest++;
  stop();
  simulatorSiren.value = siren;
  status.value = 'Power on. Choose Test, Alert, Fire, or Attack.';
}
function closeSimulator() {
  simulatorActiveMode.value = null;
  simulatorTestHeld.value = false;
  simulatorCommandRequest++;
  stop();
  simulatorSiren.value = null;
  status.value = 'Choose a model to play.';
}
async function simulatorCommand(mode, { held = false } = {}) {
  simulatorTestHeld.value = held;
  const request = ++simulatorCommandRequest;
  const siren = simulatorSiren.value;
  if (!siren) return;
  const session = sessions.get(siren.id);
  if (!held && session?.simulation && session.mode !== mode && session.simulation.transitionSignal(mode)) {
    session.mode = mode;
    session.held = false;
    session.stopping = false;
    window.clearTimeout(session.timer);
    simulatorActiveMode.value = mode;
    if (sirenMode.value !== mode) { preservedModeChange = mode; sirenMode.value = mode; }
    status.value = `${modeLabels[mode]} · transitioning from the current rotor speed.`;
    return;
  }
  if (!held && session?.audio && session.mode !== mode) {
    windDown(siren.id, session);
    await new Promise(resolve => window.setTimeout(resolve, 180));
    if (request !== simulatorCommandRequest || simulatorSiren.value !== siren || disposed) return;
  }
  if (!held && session?.mode === mode) {
    const continued = session.simulation
      ? (!session.stopping && !session.held) || session.simulation.resumeSignal()
      : session.audio && !session.audio.paused;
    if (continued) {
      session.stopping = false;
      session.held = false;
      window.clearTimeout(session.timer);
      if (session.audio) {
        session.output.gain.cancelAndHoldAtTime(context.currentTime);
        session.output.gain.linearRampToValueAtTime(1, context.currentTime + 0.01);
        session.audio.loop = props.loopSounds;
      }
      simulatorActiveMode.value = mode;
      status.value = `${modeLabels[mode]} resumed from the current speed.`;
      return;
    }
  }
  stop();
  simulatorActiveMode.value = mode;
  sirenMode.value = mode;
  await nextTick();
  if (request === simulatorCommandRequest && simulatorSiren.value === siren && !disposed) await play(siren, { held });
}
function beginSimulatorTest() {
  if (simulatorTestHeld.value) return;
  const session = sessions.get(simulatorSiren.value?.id);
  if (session?.simulation?.resume()) {
    simulatorCommandRequest++;
    simulatorTestHeld.value = true;
    simulatorActiveMode.value = 'test';
    session.held = true;
    session.stopping = false;
    window.clearTimeout(session.timer);
    status.value = 'Test held · powering the current rotor.';
    return;
  }
  if (session?.audio && !session.audio.paused) {
    simulatorCommandRequest++;
    simulatorTestHeld.value = true;
    simulatorActiveMode.value = 'test';
    session.held = true;
    session.stopping = false;
    window.clearTimeout(session.timer);
    session.output.gain.cancelAndHoldAtTime(context.currentTime);
    session.output.gain.linearRampToValueAtTime(1, context.currentTime + 0.01);
    session.audio.loop = true;
    status.value = 'Test held · continuing the current recording.';
    return;
  }
  return simulatorCommand('test', { held: true });
}
function releaseSimulatorTest() {
  if (!simulatorTestHeld.value) return;
  simulatorTestHeld.value = false;
  simulatorCommandRequest++;
  const id = simulatorSiren.value?.id;
  const session = sessions.get(id);
  if (session) windDown(id, session);
}
const holdGesture = createSirenHold({ onHold: openSimulator, onTap: play });
function stopButton() {
  simulatorActiveMode.value = null;
  simulatorTestHeld.value = false;
  simulatorCommandRequest++;
  for (const [id, session] of sessions) windDown(id, session);
  if (!sessions.size) status.value = 'All sirens stopped.';
}
async function scan() {
  const request = ++scanRequest;
  const mode = sirenMode.value;
  scanning.value = true;
  const results = await Promise.all(sirens.map(async (siren) => await findSound(siren, mode) ? siren.id : null));
  if (disposed || request !== scanRequest) return;
  available.value = new Set(results.filter(Boolean));
  scanning.value = false;
}
async function play(siren, { held = false } = {}) {
  const previous = sessions.get(siren.id);
  if (previous) {
    if (previous.stopping && previous.simulation?.resumeSignal()) {
      previous.stopping = false;
      previous.held = false;
      window.clearTimeout(previous.timer);
      if (simulatorSiren.value?.id === siren.id) simulatorActiveMode.value = previous.mode;
      status.value = `${modeLabels[previous.mode]} resumed from the current speed.`;
    } else windDown(siren.id, previous);
    return;
  }
  if (!allowMultiple.value) stop();
  const session = { held, mode: sirenMode.value };
  sessions.set(siren.id, session);
  // Include pending requests so a second click or Stop all cancels them too.
  playing.value.add(siren.id);
  const current = () => !disposed && sessions.get(siren.id) === session;
  if (simulated.value) {
    try {
      const destination = await getAudioOutput();
      if (!current()) return;
      const startPreview = (repeat = false) => {
        if (!current()) return;
        if (repeat && (!props.loopSounds || session.stopping || session.held)) {
          finish(siren.id, session);
          return;
        }
        session.waitingToLoop = false;
        session.simulation = startSimulatedSiren(context, siren, {
          duration: duration.value, volume: 1, destination, mode: session.mode, held: session.held,
          onEnded: () => {
            if (!current()) return;
            session.simulation = null;
            if (props.loopSounds && !session.stopping && !session.held) {
              session.waitingToLoop = true;
              session.timer = window.setTimeout(() => startPreview(true), 0);
            }
            else { finish(siren.id, session); status.value = `${siren.model} finished.`; }
          }
        });
      };
      startPreview();
      status.value = `${modeLabels[sirenMode.value]}: ${siren.manufacturer} ${siren.model}`;
    } catch {
      if (current()) { finish(siren.id, session); status.value = 'Could not start fake audio. Try the model button again.'; }
    }
    return;
  }
  status.value = `Checking ${siren.model}…`;
  const source = await findSound(siren, sirenMode.value);
  if (!current()) return;
  if (!source) {
    finish(siren.id, session);
    available.value.delete(siren.id);
    status.value = `Add files named ${expectedFile(siren)} and onward in public/sounds/sirens`;
    return;
  }
  const audio = new Audio(source.url);
  session.audio = audio;
  audio.volume = 1;
  audio.loop = (held && simulatorTestHeld.value) || props.loopSounds;
  audio.onended = () => { if (current()) { finish(siren.id, session); status.value = `${siren.model} finished.`; } };
  audio.onerror = () => { if (current()) { finish(siren.id, session); status.value = `Could not play ${source.fileName}. Check the audio file.`; } };
  try {
    const destination = await getAudioOutput();
    if (!current()) return;
    session.source = context.createMediaElementSource(audio);
    session.output = context.createGain();
    session.output.gain.setValueAtTime(0, context.currentTime);
    session.source.connect(session.output);
    session.output.connect(destination);
    await audio.play();
    if (!current()) { audio.pause(); return; }
    audio.loop = (session.held && simulatorTestHeld.value) || props.loopSounds;
    session.output.gain.linearRampToValueAtTime(1, context.currentTime + 0.15);
    available.value.add(siren.id);
    status.value = `Playing ${siren.manufacturer} ${siren.model}`;

  } catch {
    if (current()) { finish(siren.id, session); status.value = `Could not play ${source.fileName}. Check the audio file and try again.`; }
  }
}
watch(() => props.loopSounds, (value) => {
  for (const [id, session] of sessions) {
    if (session.audio) session.audio.loop = (session.held && simulatorTestHeld.value) || value;
    if (!value && session.waitingToLoop) finish(id, session);
  }
}, { flush: 'sync' });
watch(volume, (value) => {
  try { localStorage.setItem('key-noise-siren-volume', String(value)); } catch { /* Session volume still works. */ }
  if (!masterVolume) return;
  const now = context.currentTime;
  // A short finite ramp prevents clicks and reaches exact silence at zero.
  masterVolume.gain.cancelAndHoldAtTime(now);
  masterVolume.gain.linearRampToValueAtTime(value / 100, now + 0.01);
}, { flush: 'sync' });
watch(allowMultiple, () => { stop(); status.value = 'Choose a model to play.'; });
watch(sirenMode, (mode) => {
  if (preservedModeChange === mode) preservedModeChange = null;
  else {
    for (const [id, session] of sessions) {
      if (session.simulation?.transitionSignal(mode)) {
        session.mode = mode;
        session.held = false;
        session.stopping = false;
        window.clearTimeout(session.timer);
        if (simulatorSiren.value?.id === id) simulatorActiveMode.value = mode;
      } else windDown(id, session);
    }
  }
  available.value = new Set();
  status.value = modeDescriptions[mode];
  scan();
});
watch([soundMode, duration], () => { stop(); status.value = 'Choose a model to play.'; });
watch(soundMode, (value) => {
  try { localStorage.setItem('key-noise-simulated-sirens', value === 'fake' ? 'on' : 'off'); } catch { /* Session setting still works. */ }
});
onMounted(() => {
  mobileMedia = window.matchMedia('(max-width: 760px)');
  updateMobileLayout();
  mobileMedia.addEventListener('change', updateMobileLayout);
  scan();
});
onBeforeUnmount(() => { disposed = true; holdGesture.dispose(); mobileMedia?.removeEventListener('change', updateMobileLayout); stop(); masterVolume?.disconnect(); context?.close(); });
</script>

<template>
  <section class="sirens-section" aria-label="Siren soundboard">
    <SirenSimulator v-if="simulatorSiren" :siren="simulatorSiren" :running="playing.has(simulatorSiren.id)" :signal-active="Boolean(simulatorActiveMode)" :mode="sirenMode" :active-mode="simulatorActiveMode" :status="status" :volume="volume" :source="soundMode" :loop="props.loopSounds" @command="simulatorCommand" @test-start="beginSimulatorTest" @test-end="releaseSimulatorTest" @cancel="stopButton" @close="closeSimulator" @update:volume="volume = $event" @update:source="soundMode = $event" @update:loop="emit('update:loopSounds', $event)" />
    <div class="mobile-settings-content">
    <div class="section-title"><h2>Air Raid Sirens</h2><span>{{ filtered.length }} models</span></div>
    <p class="siren-note">Browse by make, model, and type. Choose fake sounds to play immediately, or real sounds to use your own files. Play several models together; click a playing model to stop just that siren. The simulations are playful approximations, not exact recordings of each model.</p>
    <p class="eyebrow siren-readiness" role="status">{{ readinessText }}</p>
    <div class="siren-controls">
      <label class="settings-field"><span>Search models or types</span><input v-model="search" type="search" placeholder="Try Thunderbolt or electronic" /></label>
      <label class="settings-field"><span>Siren volume · {{ volume }}%</span><input v-model.number="volume" aria-label="Siren volume" type="range" min="0" max="100" step="1" /></label>
      <button class="stop-siren" type="button" :disabled="!playing.size" @click="stopButton">Stop all sirens</button>
      <button class="rescan-sirens" type="button" :disabled="scanning" @click="scan">{{ scanning ? 'Checking files…' : 'Refresh sound files' }}</button>
    </div>
    </div>
    <div class="siren-board">
    <div class="siren-quick-controls">
      <label class="settings-field"><span>Siren mode</span><select v-model="sirenMode"><option value="attack">Attack</option><option value="alert">Alert</option><option value="fire">Fire</option><option value="test">Test / Growl</option></select></label>
      <label class="settings-field"><span>Sound source</span><select v-model="soundMode"><option value="fake">Fake sounds</option><option value="real">Real sounds</option></select></label>
      <label class="settings-field"><span>Manufacturer</span><select v-model="manufacturer"><option>All manufacturers</option><option v-for="make in manufacturers" :key="make">{{ make }}</option></select></label>
      <label class="multi-sound-option"><input v-model="allowMultiple" type="checkbox" /><span>Play multiple sounds</span></label>
      <p class="multi-sound-help">{{ allowMultiple ? 'Tap a siren, then tap another to play them together. Tap a playing siren to stop it.' : 'Tap a siren to play. Choosing another stops the previous sound.' }}</p>
    </div>
    <p class="siren-mode-description">{{ modeDescriptions[sirenMode] }}</p>
    <p class="siren-status" role="status">{{ playbackText }}</p>
    <div class="siren-grid">
      <button v-for="siren in visibleSirens" :key="siren.id" type="button" class="key siren-key" data-sound-button :class="{ loaded: playing.has(siren.id) || available.has(siren.id), missing: !simulated && !available.has(siren.id) }" :aria-pressed="playing.has(siren.id)" :aria-label="`${playing.has(siren.id) ? 'Stop' : 'Play'} ${siren.manufacturer} ${siren.model}`" @pointerdown="holdGesture.start($event, siren)" @pointermove="holdGesture.move($event)" @pointerup="holdGesture.cancel()" @pointercancel="holdGesture.cancel()" @pointerleave="holdGesture.cancel()" @contextmenu.prevent="openSimulator(siren)" @keydown.f2.prevent="openSimulator(siren)" @click="holdGesture.tap(siren)">
        <small>{{ siren.manufacturer }}</small><span>{{ siren.model }}</span><small>{{ siren.type }}</small><small class="siren-filename">{{ expectedFile(siren) }}</small><strong>{{ playing.has(siren.id) ? '■ Stop' : '▶ Play sound' }}</strong><small class="simulator-hint">Hold for simulator · F2</small>
      </button>
    </div>
    <nav class="board-pagination mobile-only" aria-label="Siren sound pages">
      <button type="button" :disabled="boardPage <= 1" @click="boardPage--">Previous</button>
      <span>Page {{ boardPage }} / {{ boardPageCount }}</span>
      <button type="button" :disabled="boardPage >= boardPageCount" @click="boardPage++">Next</button>
    </nav>
    <button class="stop-siren mobile-only mobile-stop-all" type="button" :disabled="!playing.size" @click="stopButton">Stop all sirens</button>
    <p v-if="!filtered.length" class="siren-note">No models match. Try another manufacturer or clear the search.</p>
    </div>
    <p class="siren-note mobile-settings-content">Add files to <code>public/sounds/sirens/</code> using the mode-specific filenames shown on the buttons (for example, model-attack.mp3 or model-test.mp3). Attack mode also accepts the original model.mp3 filename. MP3, WAV, OGG, and M4A are supported. This catalog covers selected current and historical models; it is not an exhaustive list.</p>
  </section>
</template>
