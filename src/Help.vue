<script setup>
// Portable across Vue apps: app content arrives through props and named slots.
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
const props = defineProps({
  appName: { type: String, required: true },
  version: { type: String, default: '' },
  sections: { type: Array, default: () => [] },
  releases: { type: Array, default: () => [] },
  company: { type: String, default: 'Muha Computer Repair' },
  email: { type: String, default: 'muhachris297@gmail.com' },
  phone: { type: String, default: '+1 (315) 338-1919' },
  website: { type: String, default: 'https://muhacomputer.com/' }
});
const emit = defineEmits(['update:open']);
const panel = ref(null);
const content = ref(null);
const windowKind = ref(null);
const page = ref('readme');
const titleId = `suite-help-${useId()}`;
const pages = computed(() => [{ id: 'readme', label: 'Read Me', mark: 'i' }, ...props.sections]);
const currentRelease = computed(() => props.releases[0]);
const history = computed(() => props.releases.slice(1));
const isContact = computed(() => windowKind.value === 'contact');
const telephoneUrl = computed(() => `tel:${props.phone.replace(/[^+0-9]/g, '')}`);
let previousFocus;
let mounted = true;
async function open(kind) {
  previousFocus = document.activeElement;
  windowKind.value = kind;
  page.value = 'readme';
  emit('update:open', true);
  await nextTick();
  if (mounted && windowKind.value === kind) panel.value?.showModal();
}
function close() {
  panel.value?.close();
  windowKind.value = null;
  emit('update:open', false);
  if (previousFocus?.isConnected) previousFocus.focus();
}
watch(page, async () => { await nextTick(); if (content.value) content.value.scrollTop = 0; });
onBeforeUnmount(() => { mounted = false; close(); });
</script>

<template>
  <div class="suite-help-actions">
    <button type="button" class="suite-help-trigger suite-help-button" aria-haspopup="dialog" @click="open('help')">Help</button>
    <button type="button" class="suite-help-trigger suite-contact-button" aria-haspopup="dialog" @click="open('contact')">Contact Us</button>
  </div>
  <Teleport to="body">
    <dialog v-if="windowKind" ref="panel" :class="['read-me', { 'suite-contact': isContact }]" :aria-labelledby="titleId" @cancel.prevent="close">
      <header class="read-me-hero">
        <h1 :id="titleId">{{ isContact ? 'Contact Us' : 'Help' }}</h1>
        <nav v-if="!isContact" class="read-me-nav" aria-label="Help sections">
          <button v-for="section in pages" :key="section.id" type="button" :aria-current="page === section.id ? 'page' : undefined" @click="page = section.id"><span aria-hidden="true">{{ section.mark }}</span>{{ section.label }}</button>
        </nav>
        <select v-if="!isContact" v-model="page" class="read-me-section-picker" aria-label="Help section"><option v-for="section in pages" :key="section.id" :value="section.id">{{ section.label }}</option></select>
        <button autofocus class="read-me-close" type="button" :aria-label="isContact ? 'Close Contact Us' : 'Close Help'" @click="close">×</button>
      </header>
      <div ref="content" class="read-me-content" tabindex="0" :aria-label="isContact ? 'Contact information' : 'Help content'">
        <template v-if="isContact">
          <p>Choose a contact method to open your email or phone app.</p>
          <div class="suite-contact-links">
            <a :href="`mailto:${email}`"><span>Email us</span><strong>{{ email }}</strong><span aria-hidden="true">↗</span></a>
            <a :href="telephoneUrl"><span>Call us</span><strong>{{ phone }}</strong><span aria-hidden="true">↗</span></a>
          </div>
          <p class="read-me-muted">Contact details from <a :href="website" target="_blank" rel="noopener">muhacomputer.com ↗</a>.</p>
        </template>
        <template v-else-if="page === 'readme'">
          <div class="read-me-heading"><h2>Read Me</h2><p>Current version <strong class="suite-version">{{ version || 'Not specified' }}</strong></p></div>
          <slot name="introduction" />
          <article v-if="currentRelease" class="read-me-card"><span class="read-me-badge has-recordings">Current notes</span><h3>{{ currentRelease.title }}</h3><ul><li v-for="(item, index) in currentRelease.items" :key="index">{{ item }}</li></ul></article>
          <section v-if="history.length" class="suite-release-history" aria-label="Historical release notes">
            <h2>Historical release notes</h2>
            <p>Earlier changes, grouped by feature. Expand a section to read the full notes.</p>
            <details v-for="(release, index) in history" :key="index" class="read-me-model"><summary><strong>{{ release.title }}</strong><span aria-hidden="true">⌄</span></summary><div class="read-me-model-body"><ul><li v-for="(item, itemIndex) in release.items" :key="itemIndex">{{ item }}</li></ul></div></details>
          </section>
          <p v-if="!releases.length">Release notes have not been supplied for this app.</p>
        </template>
        <slot v-else :name="page" />
      </div>

    </dialog>
  </Teleport>
</template>

<style>
.read-me { position: fixed; inset: 0; margin: 0; width: 100%; max-width: none; height: 100dvh; max-height: none; padding: 0; border: 0; border-radius: 0; background: #101c30; color: #fff; font: 1.25rem/1.7 system-ui, sans-serif; overflow: hidden; box-sizing: border-box; }
.read-me[open] { display: flex; flex-direction: column; }
.read-me .read-me-hero { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 6px 16px; background: #143859; border-bottom: 2px solid #436ca0; flex-shrink: 0; }
.read-me.suite-contact .read-me-hero { grid-template-columns: minmax(0, 1fr) auto; }
.read-me .read-me-hero h1 { margin: 0; color: #fff; font-size: 1.5rem; line-height: 1.3; }
.read-me::backdrop { background: #101c30; }
.read-me *, .read-me *::before, .read-me *::after { box-sizing: border-box; }
.read-me button, .read-me input, .read-me select { font: inherit; }
.read-me-section-picker { display: none; min-width: 0; width: 100%; min-height: 44px; border: 1px solid #94b0c6; border-radius: 8px; background: #263d50; color: #fff; padding: 4px 10px; font-size: 1.125rem; }
.read-me-section-picker option { color: #fff; background: #263d50; }
.read-me button { cursor: pointer; min-height: 48px; border: 2px solid #98cfff; border-radius: 9px; color: #fff; background: #163d70; padding: 8px 14px; line-height: 1.4; }
.read-me button:hover:not(:disabled) { background: #22548e; }
.read-me button:disabled { opacity: 1; cursor: default; border-style: dashed; background: #142843; color: #fff; }
.read-me :focus-visible, .suite-help-trigger:focus-visible { outline: 3px solid #ffe17a; outline-offset: 3px; }
.read-me a { color: #9cffff; text-underline-offset: 4px; }
.read-me .read-me-close { align-self: center; min-width: 44px; min-height: 44px; padding: 4px 8px; font-size: 1.75rem; line-height: 1; background: #163d70; }
.read-me-eyebrow { font-size: 1.125rem; font-weight: 700; color: #fff; }
.read-me-nav { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
.read-me-nav button { display: flex; gap: 10px; align-items: center; flex-shrink: 0; white-space: nowrap; }
.read-me-nav button[aria-current] { border-color: #9fc3b5; background: #29493f; color: #fff; }
.read-me-content { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 28px max(24px, calc((100vw - 900px) / 2)); overflow-wrap: anywhere; }
.read-me-heading { margin-bottom: 24px; }
.read-me-heading h2 { margin: 4px 0 12px; font-size: 1.75rem; line-height: 1.3; }
.read-me p { margin: 10px 0; }
.read-me h3 { margin: 12px 0 10px; font-size: 1.375rem; line-height: 1.4; }
.read-me-card { border: 2px solid #436ca0; border-radius: 12px; padding: 22px; background: #172e4b; margin-bottom: 18px; }
.read-me-badge { display: inline-block; color: #ffe9a8; background: #453207; border: 1px solid #e3bc57; border-radius: 6px; padding: 5px 10px; font-size: 1.125rem; line-height: 1.5; }
.read-me-badge.has-recordings { color: #c0ffe5; border-color: #7cebc4; background: #0a4635; }
.read-me-muted, .read-me-model small { color: #fff; font-size: 1.125rem; }
.read-me-search { display: grid; gap: 8px; font-weight: 600; }
.read-me-search input { width: 100%; min-width: 0; min-height: 48px; color: #fff; border: 2px solid #98cfff; border-radius: 8px; background: #0b1b31; padding: 10px 12px; }
.read-me-search input::placeholder { color: #fff; opacity: 1; }
.read-me-model { border: 2px solid #436ca0; border-radius: 10px; margin-bottom: 14px; overflow-wrap: anywhere; }
.read-me-model summary { display: flex; justify-content: space-between; align-items: center; gap: 16px; cursor: pointer; padding: 18px; min-height: 48px; }
.read-me-model summary strong, .read-me-model summary small { display: block; }
.read-me-model summary strong::before { content: '▸ '; color: #9cffff; }
.read-me-model[open] summary strong::before { content: '▾ '; }
.read-me-model-body { padding: 0 20px 20px; border-top: 1px solid #436ca0; }
.read-me-file { margin-top: 20px; border-top: 1px solid #436ca0; padding-top: 12px; }
.read-me-file h3 { font-size: 1.375rem; }
.suite-help-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.suite-help-trigger { min-height: 48px; min-width: 144px; padding: 10px 18px; border: 2px solid; border-radius: 8px; color: #fff; cursor: pointer; font: 600 1.125rem/1.4 system-ui, sans-serif; }
.suite-help-button { background: #30465d; border-color: #829eb8; }
.suite-help-button:hover { background: #3c556d; }
.suite-contact-button { background: #544357; border-color: #af98b9; }
.suite-contact-button:hover { background: #65536a; }
html:has(.read-me[open]), body:has(.read-me[open]) { overflow: hidden; }
.read-me ul { padding-left: 26px; }
.read-me li { margin: 12px 0; }
.suite-release-history { margin-top: 32px; }
.suite-release-history h2 { font-size: 1.75rem; }
.suite-version { display: inline-block; margin-left: 6px; padding: 4px 12px; border: 1px solid #92ffe2; border-radius: 7px; background: #145b4e; color: #fff; }
.suite-contact-links { display: grid; gap: 18px; margin: 24px 0; max-width: 780px; }
.read-me .suite-contact-links a { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; padding: 22px; border: 2px solid #af98b9; border-radius: 12px; background: #453d52; text-decoration: none; color: #fff; }
.suite-contact-links a:hover { background: #584b65; }
.suite-contact-links strong { grid-column: 1; font-size: 1.375rem; }
.suite-contact-links a > span:last-child { grid-column: 2; grid-row: 1 / 3; align-self: center; }
@media (max-width: 1100px) {
  .read-me-nav { display: none; }
  .read-me-section-picker { display: block; }
}
@media (max-width: 600px) {
  .read-me .read-me-hero { grid-template-columns: minmax(0, 1fr) auto; padding: 6px 12px; gap: 10px; }
  .read-me:not(.suite-contact) .read-me-hero h1 { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); }
  .read-me-section-picker { grid-column: 1; grid-row: 1; }
  .read-me .read-me-close { grid-column: 2; grid-row: 1; }
  .read-me-content { padding: 20px 16px; }
  .read-me-card { padding: 16px; }
  .read-me-model summary { align-items: start; flex-direction: column; padding: 16px; }
  .read-me .suite-contact-links a { padding: 16px; }
  .suite-contact-links strong { font-size: 1.125rem; }
}
</style>
