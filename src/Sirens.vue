<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { sirens, findSound } from './sirens';
import { startSimulatedSiren } from './siren-synthesis';
const props = defineProps({ loopSounds: { type: Boolean, default: false } });
function savedSoundMode() {
  try { return localStorage.getItem('key-noise-simulated-sirens') === 'off' ? 'real' : 'fake'; }
  catch { return 'fake'; }
}
const soundMode = ref(savedSoundMode());
const allowMultiple = ref(true);
const simulated = computed(() => soundMode.value === 'fake');
const boardPage = ref(1);
const isMobile = ref(false);
let mobileMedia;
function updateMobileLayout() { isMobile.value = mobileMedia.matches; }
const manufacturer = ref('All manufacturers');
const search = ref('');
const duration = ref(5);
const volume = ref(25);
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
    : 'Add files named whelen-wps-2901.mp3, federal-signal-thunderbolt-1000t.mp3, and onward in public/sounds/sirens');
const playbackText = computed(() => playing.value.size
  ? `${playing.value.size} siren${playing.value.size === 1 ? '' : 's'} playing · ${status.value}`
  : status.value);
const sessions = new Map();
const boardPageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / 6)));
const visibleSirens = computed(() => isMobile.value ? filtered.value.slice((boardPage.value - 1) * 6, boardPage.value * 6) : filtered.value);
watch([manufacturer, search], () => { boardPage.value = 1; });
let context;
let disposed = false;
function finish(id, session) {
  if (sessions.get(id) !== session) return;
  sessions.delete(id);
  window.clearTimeout(session.timer);
  session.simulation?.stop();
  if (session.audio) {
    session.audio.onended = null;
    session.audio.onerror = null;
    session.audio.pause();
    session.audio.removeAttribute('src');
    session.audio.load();
  }
  playing.value.delete(id);
}
function stop() {
  for (const [id, session] of sessions) finish(id, session);
}
function stopButton() { stop(); status.value = 'All sirens stopped.'; }
async function scan() {
  scanning.value = true;
  const results = await Promise.all(sirens.map(async (siren) => await findSound(siren) ? siren.id : null));
  if (disposed) return;
  available.value = new Set(results.filter(Boolean));
  scanning.value = false;
}
async function play(siren) {
  const previous = sessions.get(siren.id);
  if (previous) {
    finish(siren.id, previous);
    status.value = `${siren.model} stopped.`;
    return;
  }
  if (!allowMultiple.value) stop();
  const session = {};
  sessions.set(siren.id, session);
  // Include pending requests so a second click or Stop all cancels them too.
  playing.value.add(siren.id);
  const current = () => !disposed && sessions.get(siren.id) === session;
  if (simulated.value) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context ||= new AudioContext();
      if (context.state !== 'running') await context.resume();
      if (!current()) return;
      const startPreview = () => {
        if (!current()) return;
        session.simulation = startSimulatedSiren(context, siren, {
          duration: duration.value, volume: volume.value / 100,
          onEnded: () => {
            if (!current()) return;
            if (props.loopSounds) session.timer = window.setTimeout(startPreview, 0);
            else { finish(siren.id, session); status.value = `${siren.model} finished.`; }
          }
        });
      };
      startPreview();
      status.value = `Fake sound: ${siren.manufacturer} ${siren.model}`;
    } catch {
      if (current()) { finish(siren.id, session); status.value = 'Could not start fake audio. Try the model button again.'; }
    }
    return;
  }
  status.value = `Checking ${siren.model}…`;
  const source = await findSound(siren);
  if (!current()) return;
  if (!source) {
    finish(siren.id, session);
    available.value.delete(siren.id);
    status.value = `Add files named ${siren.id}.mp3 and onward in public/sounds/sirens`;
    return;
  }
  const audio = new Audio(source.url);
  session.audio = audio;
  audio.volume = volume.value / 100;
  audio.loop = props.loopSounds;
  audio.onended = () => { if (current()) { finish(siren.id, session); status.value = `${siren.model} finished.`; } };
  audio.onerror = () => { if (current()) { finish(siren.id, session); status.value = `Could not play ${source.fileName}. Check the audio file.`; } };
  try {
    await audio.play();
    if (!current()) { audio.pause(); return; }
    available.value.add(siren.id);
    status.value = `Playing ${siren.manufacturer} ${siren.model}`;
    const scheduleLimit = () => {
      session.timer = window.setTimeout(() => {
        if (!current()) return;
        if (props.loopSounds) {
          audio.currentTime = 0;
          scheduleLimit();
        } else {
          finish(siren.id, session);
          status.value = `${siren.model} playback limit reached.`;
        }
      }, duration.value * 1000);
    };
    scheduleLimit();
  } catch {
    if (current()) { finish(siren.id, session); status.value = `Could not play ${source.fileName}. Check the audio file and try again.`; }
  }
}
watch(() => props.loopSounds, (value) => {
  for (const session of sessions.values()) if (session.audio) session.audio.loop = value;
});
watch(volume, (value) => {
  for (const session of sessions.values()) {
    if (session.audio) session.audio.volume = value / 100;
    session.simulation?.setVolume(value / 100);
  }
});
watch(allowMultiple, () => { stop(); status.value = 'Choose a model to play.'; });
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
onBeforeUnmount(() => { disposed = true; mobileMedia?.removeEventListener('change', updateMobileLayout); stop(); context?.close(); });
</script>

<template>
  <section class="sirens-section" aria-label="Siren soundboard">
    <div class="mobile-settings-content">
    <div class="section-title"><h2>Air Raid Sirens</h2><span>{{ filtered.length }} models</span></div>
    <p class="siren-note">Browse by make, model, and type. Choose fake sounds to play immediately, or real sounds to use your own files. Play several models together; click a playing model to stop just that siren. The simulations are playful approximations, not exact recordings of each model.</p>
    <p class="eyebrow siren-readiness" role="status">{{ readinessText }}</p>
    <div class="siren-controls">
      <label class="settings-field"><span>Search models or types</span><input v-model="search" type="search" placeholder="Try Thunderbolt or electronic" /></label>
      <label class="settings-field"><span>Playback limit</span><select v-model.number="duration"><option :value="1">1 second</option><option :value="2">2 seconds</option><option :value="3">3 seconds</option><option :value="4">4 seconds</option><option :value="5">5 seconds</option></select></label>
      <label class="settings-field"><span>Siren volume · {{ volume }}%</span><input v-model.number="volume" aria-label="Siren volume" type="range" min="0" max="100" /></label>
      <button class="stop-siren" type="button" :disabled="!playing.size" @click="stopButton">Stop all sirens</button>
      <button class="rescan-sirens" type="button" :disabled="scanning" @click="scan">{{ scanning ? 'Checking files…' : 'Refresh sound files' }}</button>
    </div>
    </div>
    <div class="siren-board">
    <div class="siren-quick-controls">
      <label class="settings-field"><span>Sound source</span><select v-model="soundMode"><option value="fake">Fake sounds</option><option value="real">Real sounds</option></select></label>
      <label class="settings-field"><span>Manufacturer</span><select v-model="manufacturer"><option>All manufacturers</option><option v-for="make in manufacturers" :key="make">{{ make }}</option></select></label>
      <label class="multi-sound-option"><input v-model="allowMultiple" type="checkbox" /><span>Play multiple sounds</span></label>
      <p class="multi-sound-help">{{ allowMultiple ? 'Tap a siren, then tap another to play them together. Tap a playing siren to stop it.' : 'Tap a siren to play. Choosing another stops the previous sound.' }}</p>
    </div>
    <p class="siren-status" role="status">{{ playbackText }}</p>
    <div class="siren-grid">
      <button v-for="siren in visibleSirens" :key="siren.id" type="button" class="key siren-key" data-sound-button :class="{ loaded: playing.has(siren.id) || available.has(siren.id), missing: !simulated && !available.has(siren.id) }" :aria-pressed="playing.has(siren.id)" :aria-label="`${playing.has(siren.id) ? 'Stop' : 'Play'} ${siren.manufacturer} ${siren.model}`" @click="play(siren)">
        <small>{{ siren.manufacturer }}</small><span>{{ siren.model }}</span><small>{{ siren.type }}</small><small class="siren-filename">{{ siren.id }}.mp3</small><strong>{{ playing.has(siren.id) ? '■ Stop' : simulated ? '▶ Fake sound' : available.has(siren.id) ? '▶ Play sound' : 'No sound file yet' }}</strong>
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
    <p class="siren-note mobile-settings-content">Add files to <code>public/sounds/sirens/</code> using the filenames shown on the buttons. MP3, WAV, OGG, and M4A are supported. This catalog covers selected current and historical models; it is not an exhaustive list.</p>
  </section>
</template>
