<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
const props = defineProps({ siren: Object, running: Boolean, signalActive: Boolean, mode: String, activeMode: String, status: String, volume: Number, source: String, loop: Boolean });
const emit = defineEmits(['command', 'test-start', 'test-end', 'cancel', 'close', 'update:volume', 'update:source', 'update:loop']);
const panel = ref(null);
const testHeld = ref(false);
function pressTest(event) {
  if (event.type === 'keydown' && (event.repeat || ![' ', 'Enter'].includes(event.key))) return;
  if (event.type === 'pointerdown' && (event.button !== 0 || event.isPrimary === false)) return;
  event.preventDefault();
  if (testHeld.value) return;
  if (event.type === 'pointerdown') {
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  testHeld.value = true;
  emit('test-start');
}
function releaseTest() {
  if (!testHeld.value) return;
  testHeld.value = false;
  emit('test-end');
}
function testKeyUp(event) {
  if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); releaseTest(); }
}
function activateButton(id, event) {
  if (id === 'test') {
    // Assistive technologies can activate a button without pointer/key down events.
    if (event.detail === 0 && !testHeld.value) emit('command', 'test');
    return;
  }
  releaseTest();
  emit(id === 'cancel' ? 'cancel' : 'command', id);
}
function releaseWhenHidden() { if (document.hidden) releaseTest(); }
const buttons = [
  { id: 'test', label: 'Test', color: 'silver' },
  { id: 'alert', label: 'Alert', color: 'blue' },
  { id: 'fire', label: 'Fire', color: 'red' },
  { id: 'attack', label: 'Attack', color: 'yellow' },
  { id: 'cancel', label: 'Cancel', color: 'black' }
];
let previousFocus;
onMounted(() => {
  previousFocus = document.activeElement;
  panel.value.showModal();
  window.addEventListener('blur', releaseTest);
  document.addEventListener('visibilitychange', releaseWhenHidden);
});
onBeforeUnmount(() => { releaseTest(); window.removeEventListener('blur', releaseTest); document.removeEventListener('visibilitychange', releaseWhenHidden); panel.value?.close(); if (previousFocus?.isConnected) previousFocus.focus(); });
</script>

<template>
  <dialog ref="panel" class="siren-simulator" aria-labelledby="simulator-title" @cancel.prevent="emit('close')">
    <div class="simulator-topbar"><button type="button" class="simulator-back" @click="emit('close')">← Soundboard</button><span>Siren simulator</span></div>
    <div class="siren-cabinet">
      <span class="cabinet-screw screw-top" aria-hidden="true"></span>
      <span class="cabinet-screw screw-bottom" aria-hidden="true"></span>
      <div class="civil-defense-emblem" aria-hidden="true"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="98" fill="#17395b"/><path d="M100 20 174 148H26Z" fill="#e4dfc7"/><text x="100" y="128" text-anchor="middle" fill="#9b2925" font-family="Arial,sans-serif" font-size="66" font-weight="bold" textLength="86" lengthAdjust="spacingAndGlyphs">CD</text></svg></div>
      <div class="cabinet-model"><span>{{ siren.manufacturer }}</span><h2 id="simulator-title">{{ siren.model }}</h2><small>{{ siren.type }} · {{ source === 'fake' ? 'Simulated audio' : 'Real sound files' }}</small></div>
      <div class="cabinet-lights"><span><i class="pilot-light power-light"></i>Power</span><span><i class="pilot-light signal-light" :class="{ lit: signalActive }"></i>Signal</span></div>
      <div class="warning-control-plate">
        <div class="cabinet-buttons"><button v-for="button in buttons" :key="button.id" type="button" class="cabinet-control" :class="[button.color, { engaged: button.id === 'test' ? testHeld && activeMode === 'test' : activeMode === button.id }]" :data-sound-button="button.id !== 'cancel' ? '' : undefined" :aria-label="button.id === 'cancel' ? 'Cancel siren' : `${button.label} ${siren.model}`" :aria-pressed="button.id === 'cancel' ? undefined : button.id === 'test' ? testHeld && activeMode === 'test' : activeMode === button.id" @pointerdown="button.id === 'test' && pressTest($event)" @pointerup="button.id === 'test' && releaseTest()" @pointercancel="button.id === 'test' && releaseTest()" @lostpointercapture="button.id === 'test' && releaseTest()" @keydown="button.id === 'test' && pressTest($event)" @keyup="button.id === 'test' && testKeyUp($event)" @blur="button.id === 'test' && releaseTest()" @click="activateButton(button.id, $event)"><span>{{ button.label }}</span><i aria-hidden="true"></i></button></div>
        <p class="test-hold-hint">Hold Test to power · release to coast · hold again to resume</p>
        <h3>Warning Signal Control</h3><p>Local control station · {{ siren.model }}</p><small>Key Noise · Civil Defense Simulator</small>
      </div>
      <p class="cabinet-status" role="status">{{ status }}</p>
    </div>
    <div class="simulator-options">
      <label class="settings-field"><span>Sound source</span><select :value="source" @change="emit('update:source', $event.target.value)"><option value="fake">Fake sounds</option><option value="real">Real sounds</option></select></label>
      <label class="settings-field"><span>Volume · {{ volume }}%</span><input :value="volume" type="range" min="0" max="100" step="1" aria-label="Simulator volume" @input="emit('update:volume', Number($event.target.value))" /></label>
      <label class="loop-option"><input :checked="loop" type="checkbox" @change="emit('update:loop', $event.target.checked)" />Loop sounds</label>
    </div>
  </dialog>
</template>
