<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const maxSoundSlots = 64;
const customPadCount = 5;
const meterBarCount = 18;
const customPadsStorageKey = 'key-noise-custom-pads';
const supportedAudioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
const keys = [
  'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
  'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
  'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Space'
];

const lastKey = ref('');
const lastSound = ref('');
const loadedSounds = ref(new Set());
const missingSounds = ref(new Set());
const isArmed = ref(false);
const systemVolume = ref(100);
const systemVolumeSupported = ref(true);
const recordingPadId = ref(null);
const customPads = ref(createDefaultCustomPads());
const meterLevels = ref(createIdleMeterLevels());

let audioContext;
let meterAnimationFrame = 0;
let meterResetTimer = 0;
let systemVolumePollTimer = 0;

const keyBindings = computed(() => keys.map((key, index) => ({
  key,
  soundNumber: index + 1,
  fileName: `sound${index + 1}.mp3`
})));

const loadedCount = computed(() => loadedSounds.value.size);
const configuredCustomCount = computed(() => customPads.value.filter((pad) => isAllowedCustomCombo(pad.combo) && pad.fileUrl).length);
const pinnedCustomPads = computed(() => customPads.value.filter((pad) => pad.pinned));
const statusText = computed(() => {
  const readyCount = loadedCount.value + configuredCustomCount.value;

  if (readyCount > 0) {
    return `${readyCount} sound${readyCount === 1 ? '' : 's'} ready`;
  }

  return 'Add files named sound1.mp3, sound2.mp3, and onward in public/sounds';
});

function createDefaultCustomPads() {
  return Array.from({ length: customPadCount }, (_, index) => ({
    id: index + 1,
    combo: '',
    fileName: '',
    fileUrl: '',
    pinned: false
  }));
}

function createIdleMeterLevels() {
  return Array.from({ length: meterBarCount }, (_, index) => {
    const wave = Math.sin(index * 1.7) * 0.16;
    return Math.max(0.22, Math.min(0.68, 0.42 + wave));
  });
}

function getKeyName(event) {
  if (event.code === 'Space') return 'Space';

  const key = event.key.toUpperCase();
  return /^[A-Z]$/.test(key) ? key : '';
}

function getComboMainKey(event) {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return '';
  if (event.code === 'Space') return 'Space';
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
  if (/^Digit[0-9]$/.test(event.code)) return event.code.slice(5);
  return event.key.length === 1 ? event.key.toUpperCase() : event.key;
}

function getComboFromEvent(event) {
  const parts = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Cmd');

  const mainKey = getComboMainKey(event);
  if (mainKey) parts.push(mainKey);

  return parts.length >= 2 ? parts.join('+') : '';
}

function isAllowedCustomCombo(combo) {
  if (!combo) return false;

  const parts = combo.split('+');
  return !parts.includes('Cmd') && !parts.includes('Ctrl');
}

function buildSoundSources(soundNumber) {
  return supportedAudioExtensions.map((extension) => ({
    extension,
    url: `./sounds/sound${soundNumber}.${extension}`
  }));
}

function refreshReactiveSet(targetSet, value) {
  targetSet.value = new Set(targetSet.value).add(value);
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ||= new AudioContextClass();
  return audioContext;
}

function resetMeterSoon(delay = 180) {
  window.clearTimeout(meterResetTimer);
  meterResetTimer = window.setTimeout(() => {
    meterLevels.value = createIdleMeterLevels();
    isArmed.value = false;
  }, delay);
}

function stopMeterAnimation() {
  if (meterAnimationFrame) {
    cancelAnimationFrame(meterAnimationFrame);
    meterAnimationFrame = 0;
  }
}

async function syncMeterToAudio(audio) {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === 'suspended') {
      await context.resume();
    }

    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.7;
    source.connect(analyser);
    analyser.connect(context.destination);

    const data = new Uint8Array(analyser.frequencyBinCount);
    stopMeterAnimation();
    window.clearTimeout(meterResetTimer);

    const updateMeter = () => {
      if (audio.paused || audio.ended) {
        resetMeterSoon();
        return;
      }

      analyser.getByteFrequencyData(data);
      const binSize = Math.max(1, Math.floor(data.length / meterBarCount));
      meterLevels.value = Array.from({ length: meterBarCount }, (_, index) => {
        const start = index * binSize;
        const slice = data.slice(start, start + binSize);
        const average = slice.reduce((sum, value) => sum + value, 0) / slice.length;
        return Math.max(0.12, Math.min(1, average / 180));
      });
      meterAnimationFrame = requestAnimationFrame(updateMeter);
    };

    meterAnimationFrame = requestAnimationFrame(updateMeter);
    audio.addEventListener('ended', () => resetMeterSoon(), { once: true });
    return true;
  } catch {
    return false;
  }
}

function startFallbackMeter(audio) {
  stopMeterAnimation();
  window.clearTimeout(meterResetTimer);

  const updateMeter = () => {
    if (audio.paused || audio.ended) {
      resetMeterSoon();
      return;
    }

    const time = audio.currentTime * 16;
    meterLevels.value = Array.from({ length: meterBarCount }, (_, index) => {
      const wave = Math.sin(time + index * 0.9) * 0.34;
      return Math.max(0.18, Math.min(1, 0.56 + wave));
    });
    meterAnimationFrame = requestAnimationFrame(updateMeter);
  };

  meterAnimationFrame = requestAnimationFrame(updateMeter);
}

async function playAudioUrl(url) {
  const audio = new Audio(url);
  audio.volume = 1;
  const isSynced = await syncMeterToAudio(audio);

  await audio.play();
  if (!isSynced) {
    startFallbackMeter(audio);
  }
}

async function refreshSystemVolume() {
  const result = await window.keyNoiseApi?.getSystemVolume?.();
  if (!result) return;

  systemVolumeSupported.value = result.supported !== false;
  if (Number.isFinite(result.volume)) {
    systemVolume.value = result.volume;
  }
}

async function setSystemVolume() {
  const result = await window.keyNoiseApi?.setSystemVolume?.(systemVolume.value);
  if (!result) return;

  systemVolumeSupported.value = result.supported !== false;
  if (Number.isFinite(result.volume)) {
    systemVolume.value = result.volume;
  }
}

async function audioExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function scanSounds() {
  const found = new Set();
  const missing = new Set();

  for (let soundNumber = 1; soundNumber <= maxSoundSlots; soundNumber += 1) {
    const sources = buildSoundSources(soundNumber);
    let hasSound = false;

    for (const source of sources) {
      if (await audioExists(source.url)) {
        hasSound = true;
        break;
      }
    }

    if (hasSound) {
      found.add(soundNumber);
    } else {
      missing.add(soundNumber);
    }
  }

  loadedSounds.value = found;
  missingSounds.value = missing;
}

async function playSound(soundNumber) {
  const sources = buildSoundSources(soundNumber);

  for (const source of sources) {
    if (!loadedSounds.value.has(soundNumber) && !(await audioExists(source.url))) {
      continue;
    }

    try {
      await playAudioUrl(source.url);
      refreshReactiveSet(loadedSounds, soundNumber);
      missingSounds.value.delete(soundNumber);
      lastSound.value = `sound${soundNumber}.${source.extension}`;
      return;
    } catch {
      refreshReactiveSet(missingSounds, soundNumber);
    }
  }

  lastSound.value = `Missing sound${soundNumber}.mp3`;
}

function saveCustomPads() {
  localStorage.setItem(customPadsStorageKey, JSON.stringify(customPads.value));
}

function loadCustomPads() {
  try {
    const savedPads = JSON.parse(localStorage.getItem(customPadsStorageKey) || '[]');
    if (!Array.isArray(savedPads)) return;

    customPads.value = createDefaultCustomPads().map((pad) => {
      const saved = savedPads.find((item) => item && item.id === pad.id) || {};
      return {
        ...pad,
        combo: typeof saved.combo === 'string' && isAllowedCustomCombo(saved.combo) ? saved.combo : '',
        fileName: typeof saved.fileName === 'string' ? saved.fileName : '',
        fileUrl: typeof saved.fileUrl === 'string' ? saved.fileUrl : '',
        pinned: saved.pinned === true
      };
    });
  } catch {
    customPads.value = createDefaultCustomPads();
  }
}

function startRecordingCombo(padId) {
  recordingPadId.value = padId;
  lastKey.value = `Set combo ${padId}`;
  lastSound.value = 'Press an Alt or Shift combo';
}

async function chooseCustomMp3(pad) {
  const result = await window.keyNoiseApi?.selectMp3?.();
  if (!result || result.canceled) return;

  pad.fileName = result.fileName || 'Custom sound.mp3';
  pad.fileUrl = result.fileUrl || '';
  saveCustomPads();
  lastSound.value = `${pad.fileName} loaded`;
}

async function playCustomPad(pad) {
  if (!pad.fileUrl) {
    lastSound.value = `Custom ${pad.id} needs an MP3`;
    return;
  }

  try {
    await playAudioUrl(pad.fileUrl);
    isArmed.value = true;
    lastKey.value = pad.combo || `Custom ${pad.id}`;
    lastSound.value = pad.fileName || `Custom ${pad.id}`;
  } catch {
    lastSound.value = `Could not play ${pad.fileName || `custom ${pad.id}`}`;
  }
}

function clearCustomPad(pad) {
  pad.combo = '';
  pad.fileName = '';
  pad.fileUrl = '';
  pad.pinned = false;
  saveCustomPads();
}

function toggleCustomPadPin(pad) {
  pad.pinned = !pad.pinned;
  saveCustomPads();
}

function handleRecording(event) {
  if (!recordingPadId.value || event.repeat) return false;

  const combo = getComboFromEvent(event);
  if (!combo) {
    event.preventDefault();
    lastSound.value = 'Use a combo like Alt+Shift+A';
    return true;
  }

  if (!isAllowedCustomCombo(combo)) {
    return false;
  }

  event.preventDefault();
  const pad = customPads.value.find((item) => item.id === recordingPadId.value);
  if (pad) {
    pad.combo = combo;
    saveCustomPads();
    lastKey.value = combo;
    lastSound.value = `Custom ${pad.id} combo set`;
  }

  recordingPadId.value = null;
  return true;
}

function handleKeydown(event) {
  if (event.repeat) return;
  if (handleRecording(event)) return;

  const combo = getComboFromEvent(event);
  if (isAllowedCustomCombo(combo)) {
    const customPad = customPads.value.find((pad) => pad.combo === combo);
    if (customPad) {
      event.preventDefault();
      playCustomPad(customPad);
      return;
    }
  }

  if (combo || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const keyName = getKeyName(event);
  const binding = keyBindings.value.find((item) => item.key === keyName);

  if (!binding) return;

  event.preventDefault();
  isArmed.value = true;
  lastKey.value = keyName;
  playSound(binding.soundNumber);
}

function handleKeyup(event) {
  if (getKeyName(event)) {
    isArmed.value = false;
  }
}

onMounted(() => {
  loadCustomPads();
  scanSounds();
  refreshSystemVolume();
  systemVolumePollTimer = window.setInterval(refreshSystemVolume, 1000);
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
});

onBeforeUnmount(() => {
  stopMeterAnimation();
  window.clearTimeout(meterResetTimer);
  window.clearInterval(systemVolumePollTimer);
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keyup', handleKeyup);
});
</script>

<template>
  <main class="app">
    <section class="stage" :class="{ active: isArmed }" tabindex="0">
      <div class="meter" aria-hidden="true">
        <span
          v-for="bar in meterBarCount"
          :key="bar"
          :style="{ '--level': meterLevels[bar - 1] }"
        />
      </div>

      <div class="headline">
        <p class="eyebrow">{{ statusText }}</p>
        <h1>Key Noise</h1>
        <p class="subtitle">
          Press a mapped key or one of your custom key combos.
        </p>
      </div>

      <div class="readout">
        <div>
          <span>Key</span>
          <strong>{{ lastKey || '-' }}</strong>
        </div>
        <div>
          <span>Sound</span>
          <strong>{{ lastSound || 'Ready' }}</strong>
        </div>
        <label class="volume">
          <span>Volume</span>
          <input
            v-model.number="systemVolume"
            type="range"
            min="0"
            max="100"
            step="1"
            :disabled="!systemVolumeSupported"
            @input="setSystemVolume"
          />
          <strong>{{ systemVolumeSupported ? `${systemVolume}%` : 'System' }}</strong>
        </label>
      </div>
    </section>

    <section class="bindings" aria-label="Key bindings">
      <button
        v-for="binding in keyBindings"
        :key="binding.key"
        type="button"
        class="key"
        @click="playSound(binding.soundNumber)"
      >
        <span>{{ binding.key }}</span>
        <small>{{ binding.fileName }}</small>
      </button>

      <button
        v-for="pad in pinnedCustomPads"
        :key="`pinned-${pad.id}`"
        type="button"
        class="key pinned-key"
        :class="{ loaded: isAllowedCustomCombo(pad.combo) && pad.fileUrl, missing: !isAllowedCustomCombo(pad.combo) || !pad.fileUrl }"
        @click="playCustomPad(pad)"
      >
        <span>{{ pad.combo || `Custom ${pad.id}` }}</span>
        <small>{{ pad.fileName || 'Custom MP3' }}</small>
      </button>
    </section>

    <section class="custom-section" aria-label="Custom combo pads">
      <div class="section-title">
        <h2>Custom Combos</h2>
        <span>{{ configuredCustomCount }} / {{ customPadCount }} ready</span>
      </div>

      <div class="custom-pads">
        <article
          v-for="pad in customPads"
          :key="`custom-${pad.id}`"
          class="custom-pad"
          :class="{ ready: isAllowedCustomCombo(pad.combo) && pad.fileUrl, recording: recordingPadId === pad.id, pinned: pad.pinned }"
        >
          <button
            type="button"
            class="pin-button"
            :class="{ active: pad.pinned }"
            :aria-label="pad.pinned ? `Unpin custom ${pad.id}` : `Pin custom ${pad.id}`"
            :title="pad.pinned ? 'Unpin from main grid' : 'Pin to main grid'"
            @click="toggleCustomPadPin(pad)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M9.828.722a.5.5 0 0 1 .707 0l4.743 4.743a.5.5 0 0 1 0 .707l-.708.707a.5.5 0 0 1-.707 0l-.586-.586-3.89 3.89.586.586a.5.5 0 0 1 0 .707l-.707.708a.5.5 0 0 1-.707 0L6.586 10.21l-3.182 3.182a.5.5 0 0 1-.708-.708l3.182-3.182-1.973-1.973a.5.5 0 0 1 0-.707l.708-.707a.5.5 0 0 1 .707 0l.586.586 3.89-3.89-.586-.586a.5.5 0 0 1 0-.707z"/>
            </svg>
          </button>

          <button type="button" class="custom-trigger" @click="playCustomPad(pad)">
            <span>Custom {{ pad.id }}</span>
            <strong>{{ pad.combo || 'No combo' }}</strong>
            <small>{{ pad.fileName || 'No MP3' }}</small>
          </button>

          <div class="custom-actions">
            <button type="button" @click="startRecordingCombo(pad.id)">
              {{ recordingPadId === pad.id ? 'Listening' : 'Set Combo' }}
            </button>
            <button type="button" @click="chooseCustomMp3(pad)">Upload MP3</button>
            <button type="button" class="clear" @click="clearCustomPad(pad)">Clear</button>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
