<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { sirens, getRecordingCatalog } from './sirens';
import Help from './Help.vue';
import { appVersion, releases } from './help-content';
const emit = defineEmits(['update:open']);
const search = ref('');
const catalog = ref(null);
const loading = ref(true);
const sections = [
  { id: 'known', label: 'Known issues', mark: '!' },
  { id: 'models', label: 'Siren availability', mark: '♫' },
  { id: 'reported', label: 'Reported issues', mark: '↺' },
  { id: 'guide', label: 'Controls & tips', mark: '?' }
];
const labels = { alert: 'Alert', attack: 'Attack', fire: 'Fire / fast wail', pulse: 'Pulse', test: 'Test / Growl', chime: 'Chime', airhorn: 'Air horn' };
const recordings = computed(() => catalog.value?.recordings || []);
const recordedModelCount = computed(() => models.value.filter(siren => siren.files.length).length);
const models = computed(() => sirens.filter(siren => `${siren.manufacturer} ${siren.model}`.toLowerCase().includes(search.value.trim().toLowerCase())).map(siren => {
  const files = recordings.value.filter(item => item.sirenId === siren.id || item.sirenId === siren.sharedRecordingId && siren.sharedModes.includes(item.mode));
  const modes = [...new Set(files.map(item => item.mode))];
  return { ...siren, files, modes, missing: ['alert', 'attack', 'fire', 'pulse', 'test'].filter(mode => !siren.unsupportedModes?.includes(mode) && !modes.includes(mode)), held: catalog.value?.heldTests?.some(item => item.sirenId === siren.id), tails: catalog.value?.windDowns?.some(item => item.sirenId === siren.id || item.sirenId === siren.sharedRecordingId && siren.sharedModes.some(mode => item.mode === 'winddown' || item.mode === `${mode}-winddown`)) };
}));
let mounted = true;
async function loadCatalog() {
  loading.value = true;
  const manifest = await getRecordingCatalog();
  if (mounted) { catalog.value = manifest; loading.value = false; }
}
function updateOpen(open) {
  emit('update:open', open);
  if (open && !loading.value && !catalog.value) void loadCatalog();
}
onMounted(loadCatalog);
onBeforeUnmount(() => { mounted = false; });
</script>

<template>
  <Help app-name="Key Noise" :version="appVersion" :sections="sections" :releases="releases" @update:open="updateOpen">
        <template #known>
          <div class="read-me-heading"><p class="read-me-eyebrow">BEFORE YOU PLAY</p><h2>Known issues & limitations</h2><p>These notes apply to every siren. Check Siren availability for model-specific recordings and source notes.</p></div>
          <article class="read-me-card"><span class="read-me-badge">Recording limitation</span><h3>Wind-downs won’t always match a physical siren</h3><p>Real sounds use only recorded audio, including on Cancel. A short crossfade joins the signal to its recorded shutdown at the original pitch and speed. For analyzed mechanical recordings, Cancel chooses a shutdown position with a matching measured pitch. Resume matches back to the signal. Uncertain or missing matches use the normal recorded transition. Field noise, volume differences, and fixed recordings can still prevent an exact physical match.</p><p>If a recording is already winding down, it continues from there. Without a playable shutdown file, the original recording finishes naturally with Loop turned off. Tap Stop again for immediate silence.</p></article>
          <article class="read-me-card"><span class="read-me-badge">Missing recordings</span><h3>Some panel buttons have no real sound file</h3><p>A model may have Alert but no Attack, Fire, Pulse, or Test recording. The yellow control panel does not mean every mode is available. Unavailable Real panel controls are dimmed and disabled. Missing soundboard modes show an add-files or unavailable message; they never substitute fake audio. Pulse is a rare signal; an STH-10C Pulse excerpt is bundled. Check each model’s available modes before choosing one.</p></article>
          <article class="read-me-card"><span class="read-me-badge">Fixed audio</span><h3>Real and fake controls behave differently</h3><p>Real signals follow their recorded duration and pattern. They do not automatically follow the fake three-minute Alert or ten-wail Attack/Fire timing. Re-powering analyzed mechanical recordings selects a compatible recorded pitch when a reliable match is available; other recordings return to the paused position.</p><p>Held Real Test needs dedicated startup, sustain, and shutdown assets. It interpolates the measured startup and shutdown curves when released or pressed again; a model with a Test tap recording may still lack held-Test support.</p></article>
          <article class="read-me-card"><span class="read-me-badge">Field recordings</span><h3>Background noise, variants, and regional patterns</h3><p>Wind, traffic, clipping, and other sirens can be audible. Some files represent a particular variant or family, not every configuration. Hörmann HLS 273 uses German Warning / All-clear patterns mapped to Attack / Alert. A Fire / fast-wail recording does not imply every model’s historic Fire signal.</p><p>The catalog is a selection of models, not an exhaustive library. New recordings are added only to matching model/mode combinations.</p></article>
          <article class="read-me-card"><span class="read-me-badge">Other tabs</span><h3>Keyboard and mouse work immediately</h3><p>Keyboard and Mouse use built-in sounds with no source dropdown or audio files to add. Custom keyboard pads use your uploaded audio when supplied, or a built-in sound otherwise. The Real/Fake selector applies only to Sirens. Tap a pad for its normal sound, or hold a pad, mapped key, or mouse button to sustain it until release. Up to three sounds can play together. Additional presses are ignored until you release a sound. A press starts one smoothly faded voice, so there is no tap-to-hold restart or volume jump.</p></article>
        </template>
        <template #models>
          <div class="read-me-heading"><p class="read-me-eyebrow">BUNDLED AUDIO</p><h2>Siren availability</h2><p v-if="!loading && catalog">{{ recordings.length }} recordings · {{ recordedModelCount }} of {{ sirens.length }} catalog models. These entries describe bundled files; custom files you add may differ.</p><p>Every model shares the wind-down and fixed-recording limitations under Known issues.</p></div>
          <label class="read-me-search">Find a model or manufacturer<input v-model="search" type="search" placeholder="For example, STH-10 or Whelen" /></label>
          <p v-if="loading" role="status">Loading recording details…</p>
          <p v-else-if="!catalog" role="status">Recording details could not be loaded. Reopen Help to try again; this does not mean every model is missing audio.</p>
          <template v-else>
            <p class="read-me-muted" role="status">{{ models.length }} {{ models.length === 1 ? 'model' : 'models' }} shown</p>
            <details v-for="siren in models" :key="siren.id" class="read-me-model">
              <summary><span><strong>{{ siren.manufacturer }} {{ siren.model }}</strong><small>{{ siren.type }}</small></span><span :class="['read-me-badge', { 'has-recordings': siren.modes.length }]">{{ siren.modes.length ? siren.modes.map(mode => labels[mode]).join(' · ') : 'No bundled recordings' }}</span></summary>
              <div class="read-me-model-body"><p><strong>Missing signal modes:</strong> {{ siren.missing.length ? siren.missing.map(mode => labels[mode]).join(', ') : 'None' }}.</p><p><strong>Held Test:</strong> {{ siren.held ? 'Recorded startup, sustain, and shutdown available.' : 'No dedicated held-Test assets.' }}</p><p><strong>Recorded shutdown:</strong> {{ siren.tails ? 'Companion available; exact coverage depends on mode. Early cancellation can differ from a physical coast-down.' : 'No companion bundled; the original file finishes naturally if one is not available.' }}</p><p v-if="!siren.files.length">Real modes stay unavailable until matching files are added. Fake sounds remain available separately.</p><article v-for="file in siren.files" :key="file.fileName" class="read-me-file"><h3>{{ labels[file.mode] }} · {{ Math.round(file.durationSeconds) }} seconds</h3><p>{{ file.notes }}</p><a :href="file.sourceUrl" target="_blank" rel="noopener">Recording source ↗</a></article></div>
            </details>
            <p v-if="!models.length">No matching models. Try a manufacturer or a shorter model name.</p>
          </template>
          <p><a href="./sounds/sirens/CREDITS.html" target="_blank" rel="noopener">Full audio credits, licenses & source notes ↗</a></p>
        </template>
        <template #reported>
          <div class="read-me-heading"><p class="read-me-eyebrow">USER FEEDBACK</p><h2>Reported issues</h2><p>A record of reported behavior and the current response. A code fix is not a guarantee that every recording sounds physically accurate.</p></div>
          <article class="read-me-card"><span class="read-me-badge has-recordings">Change made · needs listening feedback</span><h3>STH-10 sounds artificial on Cancel</h3><p>Removed the generated harmonic coast-down engine for all Real sirens. Cancel now uses the actual shutdown recording. Early Cancel and resume now match measured recording pitch where reliable profiles are available. Held Test uses interpolated recorded-position matching. Remaining field-recording differences are described under Known issues.</p></article>
          <article class="read-me-card"><span class="read-me-badge has-recordings">Change made · checks pass</span><h3>Main mode dropdown leaves sounds running</h3><p>Changing the main dropdown now immediately stops playing, looping, winding-down, and pending sounds. The yellow simulator keeps its separate signal controls.</p></article>
          <article class="read-me-card"><span class="read-me-badge has-recordings">Change made · checks pass</span><h3>Held Real Test winds down while still held</h3><p>Dedicated recorded power assets now loop only the steady section while held and play their actual shutdown on release. Real simulator Test is disabled when dedicated startup/sustain assets are missing; a normal soundboard Test tap can still play its recorded blast.</p></article>
          <article class="read-me-card"><span class="read-me-badge has-recordings">Earlier fixes · feedback welcome</span><h3>Looping, volume, and active indicators</h3><p>Earlier reports included sounds repeating with Loop off, volume not reaching silence, activation noises, and pads staying green after stopping. Loop cleanup, volume handling, and active-state updates have been changed; activation effects were removed. If any return, report the model and steps rather than assuming they are part of a recording.</p></article>
          <article class="read-me-card"><span class="read-me-badge">Include these details</span><h3>Reporting another issue</h3><p>When reporting a problem, include the model, Real or Fake source, selected mode, main board or yellow simulator, Loop setting, device, and the steps that caused it. For audio problems, mention whether it happens at startup, during playback, on Cancel, or when starting again.</p><p>This page is an in-app record, not a live issue tracker or submission form.</p></article>
        </template>
        <template #guide>
          <div class="read-me-heading"><p class="read-me-eyebrow">QUICK GUIDE</p><h2>Controls & tips</h2></div>
          <article class="read-me-card"><h3>Choose your siren sound source</h3><p>On Sirens, Fake sounds are generated previews. Real sounds play audio files only. Choose the source and mode, then press a ready model button. Gray/black Real pads have no file for the selected mode. In the simulator, dimmed Real signal buttons are disabled because their recording is unavailable. Test also needs dedicated hold-to-run startup and sustain audio.</p></article>
          <article class="read-me-card"><h3>Play, layer, loop, and stop</h3><p>Enable multiple sounds to layer sirens. Loop repeats a normal signal while enabled; it does not repeat a cancelled shutdown. Green means sound is playing or winding down, not just that a file exists.</p><p>First Stop or cabinet Cancel begins shutdown. The signal lamp goes out immediately. A second Stop or Cancel ends the sound immediately; tapping a coasting soundboard pad also stops it. Changing the main mode dropdown stops sounds immediately.</p></article>
          <article class="read-me-card"><h3>Open the yellow simulator</h3><p>Press and hold a siren pad to open its control panel. Hold Test to run it, release to wind down, and press again to re-power. Alert, Attack, Fire, and Pulse use the selected source’s behavior and available files.</p></article>
          <article class="read-me-card"><h3>Cancel and resume real recordings</h3><p>Press Cancel to begin the recorded shutdown, then press the same signal to resume. Analyzed mechanical recordings select positions with a similar measured pitch, without changing audio speed. Held Real Test interpolates its startup and shutdown curves when released or pressed again.</p><p>If no reliable pitch match is available, playback uses its normal recorded transition. Volume differences, background noise, and fixed source audio can still be audible. Press Cancel again for immediate silence.</p></article>
          <article class="read-me-card"><h3>STH-10 variants and Pulse</h3><p>Choose STH-10A, B, or C as separate models. C shares A’s Alert, Attack, and Fire sounds; within this family, Pulse is available only on C. A includes Alert, Attack, Fire, and Test recordings; C includes Alert, Attack, Fire, and Pulse. B currently has no bundled recordings.</p><p>Fake Pulse is an illustrative steady-pitch tone with one second on and one second off. Real Pulse follows the supplied audio’s own pattern and duration. Check Siren availability for source details and current coverage.</p></article>
          <article class="read-me-card"><h3>Hold keyboard and mouse sounds</h3><p>Press a pad, mapped key, or mouse button to start its sound; keep holding to sustain it and release to stop. Space/Enter also hold a focused pad. Up to three sounds can play at once. Release a sound before pressing another; extra keys do not queue up or start later.</p><p>Held sounds stop on release even with Loop enabled. Stop all sounds, changing tabs, opening Help, leaving the window, or hiding the page cancels held sounds. Space does not scroll while it plays a mapped sound. Uploaded custom pads loop their own audio while held.</p></article>
          <article class="read-me-card"><h3>Help, Read Me, and contacting us</h3><p>Help opens a full-screen reading area with current version, undated release history, known/reported issues, and this guide. Use section tabs on wide screens or the slim section dropdown on smaller screens. The close button or Escape returns to the board.</p><p>Help and Contact Us are muted blue/purple buttons; Hide/Show controls uses muted green. Contact Us opens email and phone links. Hide controls hides Help and Contact Us too; Show controls restores them. Keyboard, Mouse Buttons, and Sirens use larger navigation tabs.</p></article>
          <article class="read-me-card"><h3>Keyboard navigation and small screens</h3><p>Sound-only Tab navigation is enabled by default. Turn it off in settings to Tab through all controls. Help uses normal dialog navigation, and Escape closes it. Mobile pages separate the soundboard from settings.</p><p>Hide controls gives the soundboard more room and hides this Help button too. Show controls brings it back.</p></article>
        </template>
  </Help>
</template>
