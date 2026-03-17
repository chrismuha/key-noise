<script setup>
import { ref } from 'vue';

const templatePath = ref('');
const sections = ref([]);
const formData = ref({});
const status = ref('');
const isSaving = ref(false);

async function chooseTemplate() {
  status.value = '';
  const result = await window.templateApi.selectTemplate();

  if (result.canceled) return;

  templatePath.value = result.filePath;
  sections.value = result.sections || [];

  const next = {};
  for (const section of sections.value) {
    next[section.label] = '';
  }
  formData.value = next;

  if (result.error) {
    status.value = result.error;
    return;
  }

  if (!sections.value.length) {
    status.value = 'No section headings ending with ":" were found.';
  }
}

async function generateDoc() {
  if (!templatePath.value) {
    status.value = 'Choose a template first.';
    return;
  }

  isSaving.value = true;
  status.value = '';

  const result = await window.templateApi.generateFilledDocx({
    templatePath: templatePath.value,
    valuesByLabel: formData.value
  });

  isSaving.value = false;

  if (result.canceled) return;
  if (result.error) {
    status.value = `Error: ${result.error}`;
    return;
  }

  status.value = `Saved: ${result.savedTo}`;
}
</script>

<template>
  <div class="app">
    <div class="card">
      <h1>DOCX Filler</h1>
      <p>Load a Word template, detect heading sections, type into boxes, and save a filled DOCX.</p>

      <div class="actions">
        <button @click="chooseTemplate">Open Template</button>
        <button @click="generateDoc" :disabled="!sections.length || isSaving">
          {{ isSaving ? 'Saving...' : 'Generate DOCX' }}
        </button>
      </div>

      <div class="path">
        <strong>Template:</strong> {{ templatePath || 'None selected' }}
      </div>

      <div v-if="status" class="status">{{ status }}</div>
    </div>

    <div class="card" v-if="sections.length">
      <h2>Detected Sections</h2>

      <div class="field" v-for="section in sections" :key="section.id">
        <label>{{ section.label }}</label>
        <textarea
          v-model="formData[section.label]"
          rows="5"
          :placeholder="`Type text for: ${section.label}`"
        />
      </div>
    </div>
  </div>
</template>
