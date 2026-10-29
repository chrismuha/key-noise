<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Sirens from './Sirens.vue';
import { startPlaceholderSound } from './placeholder-sounds';
import { cycleSoundFocus } from './sound-focus';

const maxSoundSlots = 64;
const customPadCount = 5;
const meterBarCount = 18;
const customPadsStorageKey = 'key-noise-custom-pads';
const playbackSettingsStorageKey = 'key-noise-playback-settings';
const mousePlaybackSettingsStorageKey = 'key-noise-mouse-playback-settings';
const supportedAudioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
const defaultPlaybackSettings = {
  soundLimitValue: 5,
  soundLimitUnit: 'seconds'
};
const tabs = [
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'mouse', label: 'Mouse Buttons' },
  { id: 'sirens', label: 'Sirens' }
];
const keys = [
  'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
  'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
  'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Space'
];
const mouseButtons = [
  { button: 0, label: 'Left Click', soundNumber: 1 },
  { button: 2, label: 'Right Click', soundNumber: 2 }
];

function loadSoundTabSetting() {
  try { return localStorage.getItem('key-noise-tab-sounds-only') !== 'off'; }
  catch { return true; }
}
const tabSoundsOnly = ref(loadSoundTabSetting());
const loopSounds = ref(false);
const headerCollapsed = ref(false);
const activeAudio = new Map();
const placeholderPlayers = new Set();
let audioGeneration = 0;
function toggleHeader() {
  headerCollapsed.value = !headerCollapsed.value;
  if (headerCollapsed.value) mobilePage.value = 'soundboard';
}
watch(loopSounds, (value) => {
  for (const audio of activeAudio.keys()) audio.loop = value;
  for (const player of placeholderPlayers) player.setLoop(value);
}, { flush: 'sync' });
function stopAllAudio() {
  audioGeneration++;
  for (const [audio, timer] of activeAudio) {
    window.clearInterval(timer);
    audio.pause();
    audio.currentTime = 0;
  }
  activeAudio.clear();
  for (const player of placeholderPlayers) player.stop();
  placeholderPlayers.clear();
  resetMeterSoon();
}

function saveSoundTabSetting() {
  try { localStorage.setItem('key-noise-tab-sounds-only', tabSoundsOnly.value ? 'on' : 'off'); } catch { /* Keep working for this session. */ }
}
const activeTab = ref('keyboard');
function savedSource(key) {
  try { return localStorage.getItem(key) === 'real' ? 'real' : 'fake'; } catch { return 'fake'; }
}
const keyboardSoundSource = ref(savedSource('key-noise-keyboard-source'));
const mouseSoundSource = ref(savedSource('key-noise-mouse-source'));
const activeSoundSource = computed({
  get: () => activeTab.value === 'mouse' ? mouseSoundSource.value : keyboardSoundSource.value,
  set: value => { if (activeTab.value === 'mouse') mouseSoundSource.value = value; else keyboardSoundSource.value = value; }
});
watch([keyboardSoundSource, mouseSoundSource], () => {
  stopAllAudio();
  try {
    localStorage.setItem('key-noise-keyboard-source', keyboardSoundSource.value);
    localStorage.setItem('key-noise-mouse-source', mouseSoundSource.value);
  } catch { /* Sources remain usable for this session. */ }
});
watch(activeTab, stopAllAudio);
const mobilePage = ref('soundboard');
const keyboardPage = ref(1);
const isMobile = ref(false);
let mobileMedia;
function updateMobileLayout() { isMobile.value = mobileMedia.matches; }
const keyboardPageCount = computed(() => Math.max(1, Math.ceil((keyBindings.value.length + pinnedCustomPads.value.length) / 12)));
function keyboardItemVisible(index) { return !isMobile.value || Math.floor(index / 12) === keyboardPage.value - 1; }

const lastKey = ref('');
const lastSound = ref('');
const loadedSounds = ref(new Set());
const missingSounds = ref(new Set());
const isArmed = ref(false);
const systemVolume = ref(100);
const systemVolumeSupported = ref(true);
watch(systemVolume, value => {
  for (const player of placeholderPlayers) player.setVolume(value / 100);
  if (!window.keyNoiseApi) for (const audio of activeAudio.keys()) audio.volume = value / 100;
});
const soundLimitValue = ref(defaultPlaybackSettings.soundLimitValue);
const soundLimitUnit = ref(defaultPlaybackSettings.soundLimitUnit);
const mouseSoundLimitValue = ref(defaultPlaybackSettings.soundLimitValue);
const mouseSoundLimitUnit = ref(defaultPlaybackSettings.soundLimitUnit);
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
const mouseBindings = computed(() => mouseButtons.map((button) => ({
  ...button,
  fileName: `sound${button.soundNumber}.mp3`
})));

const loadedCount = computed(() => loadedSounds.value.size);
const configuredCustomCount = computed(() => customPads.value.filter((pad) => isAllowedCustomCombo(pad.combo) && pad.fileUrl).length);
const pinnedCustomPads = computed(() => customPads.value.filter((pad) => pad.pinned));
const soundLimitMs = computed(() => normalizeSoundLimit(soundLimitValue.value, soundLimitUnit.value).milliseconds);
const mouseSoundLimitMs = computed(() => normalizeSoundLimit(mouseSoundLimitValue.value, mouseSoundLimitUnit.value).milliseconds);
const activeSoundLimitValue = computed({
  get() {
    return activeTab.value === 'mouse' ? mouseSoundLimitValue.value : soundLimitValue.value;
  },
  set(value) {
    if (activeTab.value === 'mouse') {
      mouseSoundLimitValue.value = value;
      return;
    }

    soundLimitValue.value = value;
  }
});
const activeSoundLimitUnit = computed({
  get() {
    return activeTab.value === 'mouse' ? mouseSoundLimitUnit.value : soundLimitUnit.value;
  },
  set(value) {
    const nextUnit = value === 'milliseconds' ? 'milliseconds' : 'seconds';
    const currentUnit = activeTab.value === 'mouse' ? mouseSoundLimitUnit.value : soundLimitUnit.value;
    const currentValue = activeTab.value === 'mouse' ? mouseSoundLimitValue.value : soundLimitValue.value;
    const currentMilliseconds = normalizeSoundLimit(currentValue, currentUnit).milliseconds;
    const nextValue = nextUnit === 'milliseconds' ? currentMilliseconds : currentMilliseconds / 1000;
    const normalized = normalizeSoundLimit(nextValue, nextUnit);

    if (activeTab.value === 'mouse') {
      mouseSoundLimitValue.value = normalized.value;
      mouseSoundLimitUnit.value = normalized.unit;
      return;
    }

    soundLimitValue.value = normalized.value;
    soundLimitUnit.value = normalized.unit;
  }
});
const activeSoundLimitMs = computed(() => (activeTab.value === 'mouse' ? mouseSoundLimitMs.value : soundLimitMs.value));
const activeReadoutLabel = computed(() => (activeTab.value === 'mouse' ? 'Mouse' : 'Key'));
const activeSettingsTitle = computed(() => (activeTab.value === 'mouse' ? 'Mouse Settings' : 'Keyboard Settings'));
const activeSettingsLabel = computed(() => (activeTab.value === 'mouse' ? 'Mouse MP3 playback limit' : 'MP3 playback limit'));
const activeSoundLimitText = computed(() => {
  if (activeSoundLimitUnit.value === 'milliseconds') {
    return '5000ms max';
  }

  return '5 seconds max';
});
const statusText = computed(() => {
  if (activeSoundSource.value === 'fake') return activeTab.value === 'mouse' ? '2 mouse sounds ready' : `${keys.length} keyboard sounds ready`;
  if (activeTab.value === 'mouse') {
    const readyCount = mouseBindings.value.filter((binding) => loadedSounds.value.has(binding.soundNumber)).length;

    if (readyCount > 0) {
      return `${readyCount} mouse sound${readyCount === 1 ? '' : 's'} ready`;
    }

    return 'Add sound1.mp3 for left click and sound2.mp3 for right click';
  }

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

function normalizeSoundLimit(value, unit) {
  const nextUnit = unit === 'milliseconds' ? 'milliseconds' : 'seconds';
  const fallback = nextUnit === 'milliseconds'
    ? defaultPlaybackSettings.soundLimitValue * 1000
    : defaultPlaybackSettings.soundLimitValue;
  const minValue = nextUnit === 'milliseconds' ? 1 : 1;
  const maxValue = nextUnit === 'milliseconds' ? 5000 : 5;
  const numericValue = Number(value);
  const safeValue = Math.max(minValue, Math.min(maxValue, Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback));
  const milliseconds = nextUnit === 'milliseconds' ? safeValue : safeValue * 1000;

  return {
    value: safeValue,
    unit: nextUnit,
    milliseconds: Math.max(1, milliseconds)
  };
}

function savePlaybackSettings(storageKey, valueRef, unitRef) {
  const normalized = normalizeSoundLimit(valueRef.value, unitRef.value);
  valueRef.value = normalized.value;
  unitRef.value = normalized.unit;
  localStorage.setItem(storageKey, JSON.stringify({
    soundLimitValue: normalized.value,
    soundLimitUnit: normalized.unit
  }));
}

function loadPlaybackSettings(storageKey, valueRef, unitRef) {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const normalized = normalizeSoundLimit(savedSettings.soundLimitValue, savedSettings.soundLimitUnit);
    valueRef.value = normalized.value;
    unitRef.value = normalized.unit;
  } catch {
    valueRef.value = defaultPlaybackSettings.soundLimitValue;
    unitRef.value = defaultPlaybackSettings.soundLimitUnit;
  }
}

function saveActivePlaybackSettings() {
  if (activeTab.value === 'mouse') {
    savePlaybackSettings(mousePlaybackSettingsStorageKey, mouseSoundLimitValue, mouseSoundLimitUnit);
    return;
  }

  savePlaybackSettings(playbackSettingsStorageKey, soundLimitValue, soundLimitUnit);
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

async function playAudioUrl(url, limitMs = soundLimitMs.value) {
  const generation = audioGeneration;
  const audio = new Audio(url);
  audio.volume = window.keyNoiseApi ? 1 : systemVolume.value / 100;
  const isSynced = await syncMeterToAudio(audio);
  if (generation !== audioGeneration) return;
  audio.loop = loopSounds.value;
  await audio.play();
  if (generation !== audioGeneration) { audio.pause(); return; }
  audio.loop = loopSounds.value;
  const limitTimer = window.setInterval(() => {
    if (loopSounds.value) {
      audio.loop = true;
      audio.currentTime = 0;
    } else {
      audio.pause();
      audio.currentTime = 0;
      window.clearInterval(limitTimer);
      activeAudio.delete(audio);
      resetMeterSoon();
    }
  }, limitMs);
  activeAudio.set(audio, limitTimer);
  audio.addEventListener('ended', () => {
    window.clearInterval(limitTimer);
    activeAudio.delete(audio);
  }, { once: true });
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
    return response.ok && !response.headers.get('content-type')?.includes('text/html');
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

async function playPlaceholder(number, kind, limitMs) {
  const generation = audioGeneration;
  try {
    const context = getAudioContext();
    if (!context) throw new Error('Audio unavailable');
    if (context.state !== 'running') await context.resume();
    if (generation !== audioGeneration) return;
    let player;
    player = startPlaceholderSound(context, { number, kind, limitMs, volume: systemVolume.value / 100, loop: loopSounds.value, onEnded: () => placeholderPlayers.delete(player) });
    placeholderPlayers.add(player);
    isArmed.value = true;
    lastSound.value = `Sound ${number}`;
    meterLevels.value = meterLevels.value.map((_, index) => .2 + ((number + index) % 7) / 10);
    resetMeterSoon(Math.min(limitMs, 240));
  } catch { lastSound.value = 'Could not start audio. Try the sound button again.'; }
}

async function playSound(soundNumber) {
  if (keyboardSoundSource.value === 'fake') {
    lastKey.value = keys[soundNumber - 1] || `Sound ${soundNumber}`;
    return playPlaceholder(soundNumber, 'keyboard', soundLimitMs.value);
  }
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

async function playMouseButton(binding) {
  if (mouseSoundSource.value === 'fake') {
    lastKey.value = binding.label;
    return playPlaceholder(binding.soundNumber, 'mouse', mouseSoundLimitMs.value);
  }
  const sources = buildSoundSources(binding.soundNumber);

  for (const source of sources) {
    if (!loadedSounds.value.has(binding.soundNumber) && !(await audioExists(source.url))) {
      continue;
    }

    try {
      await playAudioUrl(source.url, mouseSoundLimitMs.value);
      refreshReactiveSet(loadedSounds, binding.soundNumber);
      missingSounds.value.delete(binding.soundNumber);
      isArmed.value = true;
      lastKey.value = binding.label;
      lastSound.value = `sound${binding.soundNumber}.${source.extension}`;
      return;
    } catch {
      refreshReactiveSet(missingSounds, binding.soundNumber);
    }
  }

  lastKey.value = binding.label;
  lastSound.value = `Missing sound${binding.soundNumber}.mp3`;
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
  if (!window.keyNoiseApi?.selectMp3) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mp3,audio/mpeg';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        pad.fileName = file.name;
        pad.fileUrl = String(reader.result);
        try { saveCustomPads(); lastSound.value = `${file.name} loaded`; }
        catch { lastSound.value = 'Loaded for this session; browser storage is full.'; }
      };
      reader.readAsDataURL(file);
    }, { once: true });
    input.click();
    return;
  }
  const result = await window.keyNoiseApi?.selectMp3?.();
  if (!result || result.canceled) return;

  pad.fileName = result.fileName || 'Custom sound.mp3';
  pad.fileUrl = result.fileUrl || '';
  saveCustomPads();
  lastSound.value = `${pad.fileName} loaded`;
}

async function playCustomPad(pad) {
  if (keyboardSoundSource.value === 'fake') {
    lastKey.value = pad.combo || `Custom ${pad.id}`;
    return playPlaceholder(keys.length + pad.id, 'keyboard', soundLimitMs.value);
  }
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
  if (activeTab.value !== 'keyboard') return;
  if (event.repeat) return;
  if (handleRecording(event)) return;
  if (event.target instanceof Element && event.target.closest('input, select, textarea, button, a, [contenteditable="true"]')) return;

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

function isInteractiveMouseTarget(target) {
  return target instanceof Element && Boolean(target.closest('button, input, select, label, a, textarea'));
}

function handleMouseDown(event) {
  if (activeTab.value !== 'mouse' || isInteractiveMouseTarget(event.target)) return;

  const binding = mouseBindings.value.find((item) => item.button === event.button);
  if (!binding) return;

  event.preventDefault();
  playMouseButton(binding);
}

function handleContextMenu(event) {
  if (activeTab.value === 'mouse' && !isInteractiveMouseTarget(event.target)) {
    event.preventDefault();
  }
}

function handleTabAndEscapeFocus(event) {
  if (event.defaultPrevented) return;

  if (event.key === 'Escape') {
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement && typeof active.blur === 'function') {
      active.blur();
    }
    return;
  }

  if (tabSoundsOnly.value) cycleSoundFocus(event);
}

onMounted(() => {
  mobileMedia = window.matchMedia('(max-width: 760px)');
  updateMobileLayout();
  mobileMedia.addEventListener('change', updateMobileLayout);
  loadPlaybackSettings(playbackSettingsStorageKey, soundLimitValue, soundLimitUnit);
  loadPlaybackSettings(mousePlaybackSettingsStorageKey, mouseSoundLimitValue, mouseSoundLimitUnit);
  loadCustomPads();
  scanSounds();
  refreshSystemVolume();
  systemVolumePollTimer = window.setInterval(refreshSystemVolume, 1000);
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keydown', handleTabAndEscapeFocus);
  window.addEventListener('keyup', handleKeyup);
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('contextmenu', handleContextMenu);
});

onBeforeUnmount(() => {
  stopAllAudio();
  mobileMedia?.removeEventListener('change', updateMobileLayout);
  stopMeterAnimation();
  window.clearTimeout(meterResetTimer);
  window.clearInterval(systemVolumePollTimer);
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keydown', handleTabAndEscapeFocus);
  window.removeEventListener('keyup', handleKeyup);
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('contextmenu', handleContextMenu);
});
</script>

<template>
  <main class="app" :class="{ 'board-only': headerCollapsed }" :data-mobile-page="mobilePage">
    <div class="soundboard-toolbar">
      <button class="collapse-header" type="button" :aria-expanded="!headerCollapsed" :aria-label="headerCollapsed ? 'Show header and controls' : 'Hide header and controls'" @click="toggleHeader">{{ headerCollapsed ? '▾ Show controls' : '▴ Hide controls' }}</button>
      <label v-if="activeTab !== 'sirens'" class="settings-field board-source"><span>Sound source</span><select v-model="activeSoundSource"><option value="fake">Fake sounds</option><option value="real">Real sounds</option></select></label>
      <label class="loop-option"><input v-model="loopSounds" type="checkbox" /><span>Loop sounds</span></label>
      <button v-if="activeTab !== 'sirens'" class="stop-siren" type="button" @click="stopAllAudio">Stop all sounds</button>
    </div>
    <nav class="tabs" aria-label="Input modes">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ active: activeTab === tab.id }"
        :aria-pressed="activeTab === tab.id"
        @click="activeTab = tab.id; mobilePage = 'soundboard'; keyboardPage = 1"
      >
        {{ tab.label }}
      </button>
    </nav>

    <nav class="mobile-navigation" aria-label="Mobile pages">
      <button type="button" :aria-pressed="mobilePage === 'soundboard'" @click="mobilePage = 'soundboard'">Soundboard</button>
      <button type="button" :aria-pressed="mobilePage === 'settings'" @click="mobilePage = 'settings'">Settings</button>
      <button v-if="activeTab === 'keyboard'" type="button" :aria-pressed="mobilePage === 'custom'" @click="mobilePage = 'custom'">Custom Combos</button>
    </nav>

    <section class="sound-navigation-settings mobile-settings-content" aria-label="Keyboard navigation settings">
      <label class="multi-sound-option"><input v-model="tabSoundsOnly" type="checkbox" @change="saveSoundTabSetting" /><span>Tab through sounds only</span></label>
      <p>Tab / Shift+Tab cycles through visible sound buttons. Turn off to tab through all controls.</p>
    </section>

    <Sirens v-if="activeTab === 'sirens'" :loop-sounds="loopSounds" @update:loop-sounds="loopSounds = $event" />

    <section v-if="activeTab !== 'sirens'" class="stage" :class="{ active: isArmed }" tabindex="0">
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
          {{ activeTab === 'mouse' ? 'Click the left or right mouse button while this tab is active.' : 'Press a mapped key or one of your custom key combos.' }}
        </p>
      </div>

      <div class="readout">
        <div>
          <span>{{ activeReadoutLabel }}</span>
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

    <section v-if="activeTab !== 'sirens'" class="settings-section" aria-label="Playback settings">
      <div class="section-title">
        <h2>{{ activeSettingsTitle }}</h2>
        <span>{{ activeSettingsLabel }}</span>
      </div>

      <div class="settings-row">
        <label class="settings-field">
          <span>Limit</span>
          <input
            v-model.number="activeSoundLimitValue"
            type="number"
            :min="1"
            :max="activeSoundLimitUnit === 'milliseconds' ? 5000 : 5"
            :step="1"
            @change="saveActivePlaybackSettings"
            @blur="saveActivePlaybackSettings"
          />
        </label>

        <label class="settings-field">
          <span>Unit</span>
          <select v-model="activeSoundLimitUnit" @change="saveActivePlaybackSettings">
            <option value="seconds">Seconds</option>
            <option value="milliseconds">Milliseconds</option>
          </select>
        </label>

        <strong>{{ activeSoundLimitText }}</strong>
      </div>
    </section>

    <section v-if="activeTab === 'keyboard'" class="bindings" aria-label="Key bindings">
      <button
        v-for="(binding, index) in keyBindings"
        v-show="keyboardItemVisible(index)"
        :key="binding.key"
        type="button"
        class="key"
        data-sound-button
        @click="playSound(binding.soundNumber)"
      >
        <span>{{ binding.key }}</span>
        <small>{{ activeSoundSource === 'fake' ? 'Play sound' : binding.fileName }}</small>
      </button>

      <button
        v-for="(pad, index) in pinnedCustomPads"
        v-show="keyboardItemVisible(keyBindings.length + index)"
        :key="`pinned-${pad.id}`"
        type="button"
        class="key pinned-key"
        data-sound-button
        :class="{ loaded: isAllowedCustomCombo(pad.combo) && pad.fileUrl, missing: !isAllowedCustomCombo(pad.combo) || !pad.fileUrl }"
        @click="playCustomPad(pad)"
      >
        <span>{{ pad.combo || `Custom ${pad.id}` }}</span>
        <small>{{ pad.fileName || 'Custom MP3' }}</small>
      </button>
    </section>

    <section v-else-if="activeTab === 'mouse'" class="bindings mouse-bindings" aria-label="Mouse button bindings">
      <button
        v-for="binding in mouseBindings"
        :key="binding.label"
        type="button"
        class="key mouse-key"
        data-sound-button
        :class="{ loaded: loadedSounds.has(binding.soundNumber), missing: missingSounds.has(binding.soundNumber) }"
        @click="playMouseButton(binding)"
        @contextmenu.prevent
      >
        <span>{{ binding.label }}</span>
        <small>{{ activeSoundSource === 'fake' ? 'Play sound' : binding.fileName }}</small>
      </button>
    </section>

    <div v-if="activeTab !== 'sirens'" class="mobile-only mobile-board-footer">
      <p role="status">{{ lastSound || statusText }}</p>
      <nav v-if="activeTab === 'keyboard'" class="board-pagination" aria-label="Keyboard sound pages">
        <button type="button" :disabled="keyboardPage <= 1" @click="keyboardPage--">Previous</button>
        <span>Page {{ keyboardPage }} / {{ keyboardPageCount }}</span>
        <button type="button" :disabled="keyboardPage >= keyboardPageCount" @click="keyboardPage++">Next</button>
      </nav>
    </div>

    <section v-if="activeTab === 'keyboard'" class="custom-section" aria-label="Custom combo pads">
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

          <button type="button" class="custom-trigger" data-sound-button @click="playCustomPad(pad)">
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
