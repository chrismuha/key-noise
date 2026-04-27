<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const maxSoundSlots = 64;
const supportedAudioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
const keys = [
  'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
  'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
  'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Space'
];

const volume = ref(0.85);
const lastKey = ref('');
const lastSound = ref('');
const loadedSounds = ref(new Set());
const missingSounds = ref(new Set());
const isArmed = ref(false);

const keyBindings = computed(() => keys.map((key, index) => ({
  key,
  soundNumber: index + 1,
  fileName: `sound${index + 1}.mp3`
})));

const loadedCount = computed(() => loadedSounds.value.size);
const statusText = computed(() => {
  if (loadedCount.value > 0) {
    return `${loadedCount.value} sound${loadedCount.value === 1 ? '' : 's'} ready`;
  }

  return 'Add files named sound1.mp3, sound2.mp3, and onward in public/sounds';
});

function getKeyName(event) {
  if (event.code === 'Space') return 'Space';

  const key = event.key.toUpperCase();
  return /^[A-Z]$/.test(key) ? key : '';
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

    const audio = new Audio(source.url);
    audio.volume = volume.value;

    try {
      await audio.play();
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

function handleKeydown(event) {
  if (event.repeat) return;

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
  scanSounds();
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keyup', handleKeyup);
});
</script>

<template>
  <main class="app">
    <section class="stage" :class="{ active: isArmed }" tabindex="0">
      <div class="meter" aria-hidden="true">
        <span v-for="bar in 18" :key="bar" />
      </div>

      <div class="headline">
        <p class="eyebrow">{{ statusText }}</p>
        <h1>Key Noise</h1>
        <p class="subtitle">
          Press a mapped key and the app plays the matching numbered sound file.
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
          <input v-model.number="volume" type="range" min="0" max="1" step="0.01" />
        </label>
      </div>
    </section>

    <section class="bindings" aria-label="Key bindings">
      <button
        v-for="binding in keyBindings"
        :key="binding.key"
        type="button"
        class="key"
        :class="{ loaded: loadedSounds.has(binding.soundNumber), missing: missingSounds.has(binding.soundNumber) }"
        @click="playSound(binding.soundNumber)"
      >
        <span>{{ binding.key }}</span>
        <small>{{ binding.fileName }}</small>
      </button>
    </section>
  </main>
</template>
