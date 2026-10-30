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
const pageIndex = computed(() => pages.value.findIndex(section => section.id === page.value));
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
    <button type="button" class="suite-help-trigger" aria-haspopup="dialog" @click="open('help')">Help</button>
    <button type="button" class="suite-help-trigger" aria-haspopup="dialog" @click="open('contact')">Contact Us</button>
  </div>
  <Teleport to="body">
    <dialog v-if="windowKind" ref="panel" :class="['read-me', { 'suite-contact': isContact }]" :aria-labelledby="titleId" @cancel.prevent="close">
      <header class="read-me-hero">
        <span class="read-me-mark" aria-hidden="true">{{ isContact ? '@' : 'i' }}</span>
        <div><p class="read-me-eyebrow">{{ appName }} · {{ isContact ? company : 'APP NOTES' }}</p><h1 :id="titleId">{{ isContact ? 'Contact Us' : 'Help' }}</h1><p>{{ isContact ? 'Get in touch with our company.' : 'Your guide, known issues, and release notes.' }}</p></div>
        <button autofocus class="read-me-close" type="button" :aria-label="isContact ? 'Close Contact Us' : 'Close Help'" @click="close">×</button>
      </header>
      <nav v-if="!isContact" class="read-me-nav" aria-label="Help sections">
        <button v-for="section in pages" :key="section.id" type="button" :aria-current="page === section.id ? 'page' : undefined" @click="page = section.id"><span aria-hidden="true">{{ section.mark }}</span>{{ section.label }}</button>
      </nav>
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
          <div class="read-me-heading"><p class="read-me-eyebrow">{{ appName }}</p><h2>Read Me</h2><p>Current version <strong class="suite-version">{{ version || 'Not specified' }}</strong></p></div>
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
      <footer class="read-me-footer">
        <template v-if="!isContact"><button type="button" :disabled="pageIndex <= 0" @click="page = pages[pageIndex - 1].id">← Previous</button><span>{{ pageIndex + 1 }} / {{ pages.length }}</span><button type="button" :disabled="pageIndex >= pages.length - 1" @click="page = pages[pageIndex + 1].id">Next →</button></template>
        <button type="button" class="read-me-done" @click="close">Done</button>
      </footer>
    </dialog>
  </Teleport>
</template>

<style>

.read-me { width: min(880px, calc(100vw - 32px)); max-width: none; height: min(840px, calc(100dvh - 32px)); max-height: none; padding: 0; border: 1px solid #4c6470; border-radius: 20px; background: #171c23; color: #f2f6fb; box-shadow: 0 28px 90px #000a; overflow: hidden; }
.read-me[open] { display: flex; flex-direction: column; }
.read-me::backdrop { background: #070c13d9; backdrop-filter: blur(6px); }
.read-me button, .read-me input { font: inherit; }
.read-me button { cursor: pointer; min-height: 42px; border: 1px solid #52606e; border-radius: 9px; color: #edf4fa; background: #27323e; padding: 8px 12px; }
.read-me button:disabled { opacity: .4; cursor: default; }
.read-me :focus-visible { outline: 3px solid #8de3d4; outline-offset: 2px; }
.read-me a { color: #92e3d5; text-underline-offset: 3px; }
.read-me-hero { display: grid; grid-template-columns: auto 1fr auto; gap: 16px; padding: 26px; background: linear-gradient(120deg, #164b4b, #233951); flex-shrink: 0; }
.read-me-mark { width: 48px; height: 48px; display: grid; place-items: center; border: 1px solid #ffffff45; border-radius: 14px; font: bold 30px Georgia, serif; background: #ffffff12; }
.read-me-hero h1 { margin: 4px 0 8px; font-size: 30px; line-height: 1.1; }
.read-me-hero p { margin: 0; color: #d1e1eb; line-height: 1.45; }
.read-me .read-me-close { align-self: start; font-size: 25px; line-height: 1; background: #0003; }
.read-me-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .13em; color: #98cfc8; }
.read-me-nav { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 22px; border-bottom: 1px solid #ffffff1a; flex-shrink: 0; }
.read-me-nav button { display: flex; gap: 8px; align-items: center; font-size: 13px; }
.read-me-nav button[aria-current] { border-color: #76d6c3; background: #234c49; color: #b4f1e5; }
.read-me-content { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 24px; line-height: 1.65; }
.read-me-heading { margin-bottom: 24px; }
.read-me-heading h2 { margin: 4px 0 8px; font-size: 24px; line-height: 1.2; }
.read-me p { margin: 8px 0; }
.read-me h3 { margin: 10px 0 8px; font-size: 17px; line-height: 1.4; }
.read-me-card { border: 1px solid #ffffff1a; border-radius: 13px; padding: 18px; background: #202832; margin-bottom: 14px; }
.read-me-badge { display: inline-block; color: #efd4a1; background: #66502f45; border: 1px solid #bc94544a; border-radius: 6px; padding: 3px 8px; font-size: 11px; line-height: 1.5; }
.read-me-badge.has-recordings { color: #a8e8d7; border-color: #66b69e55; background: #28534450; }
.read-me-muted, .read-me-model small { color: #acbac8; font-size: 12px; }
.read-me-search { display: grid; gap: 6px; font-size: 13px; font-weight: 600; }
.read-me-search input { width: 100%; min-width: 0; min-height: 44px; color: #f2f6fb; border: 1px solid #687789; border-radius: 8px; background: #101720; padding: 10px 12px; }
.read-me-model { border: 1px solid #ffffff20; border-radius: 10px; margin-bottom: 10px; overflow-wrap: anywhere; }
.read-me-model summary { display: flex; justify-content: space-between; align-items: center; gap: 12px; cursor: pointer; padding: 14px; }
.read-me-model summary strong, .read-me-model summary small { display: block; }
.read-me-model summary strong::before { content: '▸ '; color: #9bcbbb; }
.read-me-model[open] summary strong::before { content: '▾ '; }
.read-me-model-body { padding: 0 16px 16px; border-top: 1px solid #ffffff15; font-size: 13px; }
.read-me-file { margin-top: 16px; border-top: 1px solid #ffffff15; padding-top: 8px; }
.read-me-file h3 { font-size: 14px; }
.read-me-footer { display: flex; align-items: center; gap: 10px; padding: 14px 24px; border-top: 1px solid #ffffff1a; background: #1d2630; flex-shrink: 0; }
.read-me-footer span { color: #bdc9d6; font-size: 12px; white-space: nowrap; }
.read-me .read-me-done { margin-left: auto; background: #285b52; border-color: #65b4a2; }
@media (max-width: 600px) {
  .read-me { width: calc(100vw - 16px); height: calc(100dvh - 16px); border-radius: 14px; }
  .read-me-hero { padding: 18px 14px; gap: 10px; grid-template-columns: 1fr auto; }
  .read-me-mark { display: none; }
  .read-me-hero h1 { font-size: 26px; }
  .read-me-hero p:last-child { font-size: 13px; }
  .read-me-nav { display: grid; grid-template-columns: 1fr 1fr; padding: 10px; gap: 6px; }
  .read-me-nav button { font-size: 12px; padding: 7px; justify-content: center; }
  .read-me-content { padding: 16px 12px; }
  .read-me-card { padding: 14px; }
  .read-me-model summary { align-items: start; flex-direction: column; gap: 6px; }
  .read-me-footer { padding: 10px; gap: 6px; }
  .read-me-footer button { font-size: 12px; padding: 7px; }
}

.suite-help-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.suite-help-trigger { min-height: 44px; padding: 8px 14px; border: 1px solid #759eaf80; border-radius: 8px; background: #293e4b; color: #e1f1fa; cursor: pointer; font: inherit; }
.suite-help-trigger:hover { background: #365366; }
.suite-help-trigger:focus-visible { outline: 3px solid #8de3d4; outline-offset: 2px; }
html:has(.read-me[open]), body:has(.read-me[open]) { overflow: hidden; }
.read-me ul { padding-left: 22px; }
.read-me li { margin: 8px 0; overflow-wrap: anywhere; }
.suite-release-history { margin-top: 28px; }
.suite-release-history h2 { font-size: 22px; }
.suite-version { display: inline-block; margin-left: 6px; padding: 3px 10px; border: 1px solid #71c9b666; border-radius: 7px; background: #224d45; color: #b0f1de; }
.read-me.suite-contact { height: auto; max-height: calc(100dvh - 24px); width: min(600px, calc(100vw - 24px)); }
.suite-contact-links { display: grid; gap: 12px; margin: 22px 0; }
.read-me .suite-contact-links a { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 18px; border: 1px solid #74cdb277; border-radius: 12px; background: #244e44; text-decoration: none; color: #defaf0; }
.suite-contact-links a:hover { background: #306354; }
.suite-contact-links a > span:first-child { font-size: 13px; }
.suite-contact-links strong { grid-column: 1; overflow-wrap: anywhere; font-size: 17px; }
.suite-contact-links a > span:last-child { grid-column: 2; grid-row: 1 / 3; align-self: center; }
@media (max-width: 600px) { .read-me-nav button:last-child:nth-child(odd) { grid-column: 1 / -1; } .suite-contact .read-me-content { padding: 14px; } .suite-contact-links { margin: 14px 0; } .read-me .suite-contact-links a { padding: 12px; } .suite-contact-links strong { font-size: 14px; } }

</style>
