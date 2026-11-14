<script setup>
import { computed, nextTick, ref, useId } from 'vue';
const props = defineProps({
  placement: { type: String, default: 'inline' },
  appName: { type: String, required: true },
  version: { type: String, required: true },
  theme: { type: String, default: 'dark', validator: value => ['dark', 'light'].includes(value) },
  company: { type: String, default: 'Muha Computer Repair' },
  email: { type: String, default: 'muhachris297@gmail.com' },
  phone: { type: String, default: '+1 (315) 338-1919' },
  website: { type: String, default: 'https://muhacomputer.com/' },
  knownIssues: { type: Array, default: () => [] },
  fixedIssues: { type: Array, default: () => [] },
  comingSoon: { type: Array, default: () => [] },
  usageTips: { type: Array, default: () => [] },
  troubleshooting: { type: Array, default: () => [] },
});
const titleId = `suite-help-${useId()}`;
const telephoneUrl = computed(() => `tel:${props.phone.replace(/[^+0-9]/g, '')}`);
const panel = ref(null);
const page = ref('contact');
const content = ref(null);
function selectPage(id) {
  page.value = id;
  nextTick(() => { if (content.value) content.value.scrollTop = 0; });
}
const sections = [ ['contact', 'Contact us'], ['report', 'Report an issue'], ['known', 'Known issues'], ['coming', 'Coming soon'], ['tips', 'Tips & troubleshooting'] ];
const reportUrl = computed(() => `mailto:${props.email}?subject=${encodeURIComponent(`${props.appName} ${props.version} issue report`)}&body=${encodeURIComponent(`${props.appName} version: ${props.version}\nDevice and operating system:\nWorkspace or screen:\nSteps to reproduce:\n1. \nExpected result:\nActual result or exact error:\nHow often it happens:\n\nPlease remove customer, financial, and other private information from screenshots or attachments.`)}`);

</script>

<template>
  <button type="button" class="suite-help-trigger" :data-theme="theme" :data-placement="placement" aria-haspopup="dialog" @click="panel.showModal()"><span aria-hidden="true">?</span> Help</button>
  <Teleport to="body">
    <dialog ref="panel" @keydown.stop @keydown.esc.prevent="panel.close()" class="suite-help-panel" :data-theme="theme" :aria-labelledby="titleId">
      <header>
        <div><h1 :id="titleId">{{ appName }} Help</h1><p>Version {{ version }}</p></div>
        <button type="button" class="suite-help-close" autofocus aria-label="Close Help" @click="panel.close()">Close</button>
      </header>
      <nav aria-label="Help sections">
        <button v-for="[id, label] in sections" :key="id" type="button" :aria-current="page === id ? 'page' : undefined" @click="selectPage(id)">{{ label }}</button>
      </nav>
      <main ref="content">
        <section v-if="page === 'contact'">
          <h2>Contact us</h2><p>{{ company }}</p>
          <div class="suite-help-links">
            <a class="suite-contact-card" :href="`mailto:${email}`">
              <span class="suite-contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg></span>
              <span class="suite-contact-details"><span class="suite-contact-label">Email us</span><strong>{{ email }}</strong><span class="suite-contact-hint">Open your email app</span></span>
              <span class="suite-contact-arrow" aria-hidden="true">↗</span>
            </a>
            <a class="suite-contact-card suite-contact-phone" :href="telephoneUrl">
              <span class="suite-contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 3 3 5-2 2a14 14 0 0 0 6 6l2-2 5 3-1 3c-1 3-7 0-11-4S2 6 5 4Z"/></svg></span>
              <span class="suite-contact-details"><span class="suite-contact-label">Call us</span><strong>{{ phone }}</strong><span class="suite-contact-hint">Open your phone app</span></span>
              <span class="suite-contact-arrow" aria-hidden="true">↗</span>
            </a>
            <a class="suite-contact-card suite-contact-website" :href="website" target="_blank" rel="noopener noreferrer">
              <span class="suite-contact-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg></span>
              <span class="suite-contact-details"><span class="suite-contact-label">Visit our website</span><strong>{{ website.replace(/^https?:\/\//, '').replace(/\/$/, '') }}</strong><span class="suite-contact-hint">Opens in your browser</span></span>
              <span class="suite-contact-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
          <p>Email and phone links open your device’s email or phone app.</p>
        </section>
        <section v-else-if="page === 'report'">
          <h2>Report an issue</h2><p>Tell us the screen, steps to reproduce, expected result, actual result, exact error, device, and operating system. Include whether the problem happens every time.</p>
          <a class="suite-help-report" :href="reportUrl">Prepare issue report email</a>
          <p>This opens an email draft with the current version and a report template. Review it and send it from your email app. If the link does not open, email {{ email }} with those details.</p>
          <p>Remove customer, financial, and other private information from screenshots or attachments.</p>
        </section>
        <section v-else-if="page === 'known'">
          <h2>Known issues</h2><p>Confirmed problems documented for this version appear here.</p>
          <article v-for="(issue, index) in knownIssues" :key="index"><h3>{{ issue.title }}</h3><p>{{ issue.description }}</p></article>
          <p v-if="!knownIssues.length">No confirmed issues are currently listed in this version’s Help. If you encounter a problem, use Report an issue.</p>
          <h2 class="suite-help-fixed-heading">Fixed</h2>
          <p>Completed fixes and what they mean for you.</p>
          <article v-for="(issue, index) in fixedIssues" :key="`fixed-${index}`">
            <h3>{{ issue.title }}</h3>
            <p v-if="issue.version">Fixed in version {{ issue.version }}</p>
            <p>{{ issue.description }}</p>
            <p><strong>How we fixed it:</strong> {{ issue.resolution }}</p>
            <p v-if="issue.userNotes"><strong>What this means for you:</strong> {{ issue.userNotes }}</p>
          </article>
          <p v-if="!fixedIssues.length">No completed fixes are currently listed here. See Release Notes for the full change history.</p>
          <p>Use Bug Report to share a problem you encounter.</p>
        </section>
        <section v-else-if="page === 'coming'">
          <h2>Coming soon</h2><p>Planned features are not available yet.</p>
          <article v-for="(item, index) in comingSoon" :key="index"><h3>{{ item.title }}</h3><p>{{ item.description }}</p></article>
          <p v-if="!comingSoon.length">No upcoming features are currently listed. See the user guide and release notes for available features.</p>
        </section>
        <section v-else>
          <h2>Tips & troubleshooting</h2>
          <article v-for="(tip, index) in usageTips" :key="index"><h3>{{ tip.title }}</h3><p>{{ tip.description }}</p></article>
          <h3 v-if="troubleshooting.length">Troubleshooting checklist</h3>
          <ul v-if="troubleshooting.length"><li v-for="(tip, index) in troubleshooting" :key="index">{{ tip }}</li></ul>
          <p>If the problem continues, use Report an issue and include the exact error and steps.</p>
        </section>
      </main>
      <footer class="suite-help-footer">
        <button type="button" class="suite-help-bug-report" @click="selectPage('report')"><span aria-hidden="true">🐛</span> Bug Report</button>
      </footer>
    </dialog>
  </Teleport>
</template>

<style scoped>
/* Self-contained palette: host app tokens do not change this shared screen. */
.suite-help-panel, .suite-help-trigger {
  --panel-bg: #111;
  --fg: #fff;
  --muted-bg: #333;
  --input-border: #ffffffa0;
  --blue: #2563eb;
  --brand-accent: #ff6600;
  font: 16px/1.5 system-ui, sans-serif;
  text-align: left;
  letter-spacing: normal;
}
.suite-help-panel[data-theme="light"], .suite-help-trigger[data-theme="light"] {
  --panel-bg: #fff;
  --fg: #111318;
  --muted-bg: #f1f3f5;
  --input-border: #00000080;
}
.suite-help-panel *, .suite-help-panel *::before, .suite-help-panel *::after { box-sizing: border-box; }
.suite-help-panel h2 { font-size: 24px; margin: 0 0 16px; font-weight: 700; line-height: 1.3; }
.suite-help-panel h3 { font-size: 18px; font-weight: 700; line-height: 1.4; }
.suite-help-panel p { margin: 16px 0; }
.suite-help-panel ul { padding-left: 24px; }
.suite-help-panel button, .suite-help-trigger { height: auto; font-weight: 400; }

.suite-help-trigger { font: 400 13.3333px Arial, sans-serif; display: inline-flex; align-items: center; gap: .55rem; min-height: 44px; padding: .7rem 1rem; border: 1px solid var(--brand-accent); border-radius: .6rem; background: var(--panel-bg); color: var(--fg); cursor: pointer; }
.suite-help-trigger:hover { background: var(--muted-bg); box-shadow: 0 0 20px -10px var(--brand-accent); }
.suite-help-panel { position: fixed; inset: 0; width: 100%; max-width: none; height: 100dvh; max-height: none; margin: 0; padding: 0; border: 0; border-radius: 0; background: var(--panel-bg); color: var(--fg); box-sizing: border-box; }
.suite-help-panel[open] { display: flex; flex-direction: column; }
.suite-help-panel::backdrop { background: #000a; }
.suite-help-panel header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 24px; border-bottom: 1px solid var(--input-border); }
.suite-help-panel h1 { font-weight: 700; line-height: 1.3; margin: 0; font-size: clamp(22px, 4vw, 32px); }
.suite-help-panel header p { margin: 4px 0 0; }
.suite-help-panel nav { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 24px; border-bottom: 1px solid var(--input-border); }
.suite-help-panel button { padding: 10px 14px; min-height: 44px; border: 1px solid var(--blue); border-radius: 8px; background: var(--panel-bg); color: var(--fg); cursor: pointer; font: inherit; font-weight: 700; }
.suite-help-panel .suite-help-close {
  background: #b42318;
  border: none;
  color: #fff;
  font-weight: 700;
}
.suite-help-panel .suite-help-close:hover { background: #922018; }
.suite-help-panel button[aria-current] { background: var(--muted-bg); border-color: var(--brand-accent); }
.suite-help-panel main { flex: 1; min-height: 0; overflow-y: auto; padding: 24px max(20px, calc((100% - 900px) / 2)); overflow-wrap: anywhere; line-height: 1.6; }
.suite-help-panel article { padding: 16px; margin: 16px 0; border: 1px solid var(--input-border); border-radius: 12px; }
.suite-help-panel h3 { margin-top: 0; }
.suite-help-links { display: grid; gap: 12px; }
.suite-help-panel a { color: var(--fg); text-decoration: underline; text-underline-offset: 4px; }
.suite-help-links a, .suite-help-report { display: block; padding: 14px; border: 1px solid var(--blue); border-radius: 8px; background: var(--panel-bg); color: var(--fg); }
.suite-help-panel li { margin: 12px 0; }
.suite-help-panel :focus-visible, .suite-help-trigger:focus-visible { outline: 3px solid var(--fg); outline-offset: 3px; }
/* Contact cards keep the same appearance in every app using this component. */
.suite-help-links { gap: 14px; margin-block: 24px; }
.suite-help-panel .suite-contact-card {
  --contact-accent: var(--blue);
  display: grid; grid-template-columns: 48px minmax(0, 1fr) 24px;
  align-items: center; gap: 18px; padding: 22px;
  border: 1px solid color-mix(in srgb, var(--contact-accent) 45%, var(--input-border));
  border-radius: 16px;
  background: color-mix(in srgb, var(--contact-accent) 5%, var(--panel-bg));
  text-decoration: none;
  transition: background-color .18s ease, border-color .18s ease, box-shadow .18s ease;
}
.suite-help-panel .suite-contact-phone { --contact-accent: #169c91; }
.suite-help-panel .suite-contact-website { --contact-accent: var(--brand-accent); }
.suite-help-panel .suite-contact-card:hover {
  border-color: var(--contact-accent);
  background: color-mix(in srgb, var(--contact-accent) 10%, var(--panel-bg));
  box-shadow: 0 4px 20px color-mix(in srgb, var(--contact-accent) 12%, transparent);
}
.suite-contact-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 14px; background: color-mix(in srgb, var(--contact-accent) 15%, var(--panel-bg)); }
.suite-contact-icon svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.suite-contact-details { display: grid; gap: 4px; min-width: 0; }
.suite-contact-label { font-size: 13px; font-weight: 600; color: var(--fg); }
.suite-contact-details strong { font-size: clamp(16px, 2.5vw, 19px); font-weight: 600; overflow-wrap: anywhere; }
.suite-contact-hint { font-size: 13px; color: var(--fg); }
.suite-contact-arrow { font-size: 24px; color: var(--fg); }
@media (max-width: 480px) {
  .suite-help-panel .suite-contact-card { grid-template-columns: 40px minmax(0, 1fr) 18px; gap: 12px; padding: 16px; }
  .suite-contact-icon { width: 40px; height: 40px; border-radius: 12px; }
}

/* A compact edge tab keeps Help reachable without covering bottom actions. */
.suite-help-trigger[data-placement="edge"] { position:fixed;right:0;top:40%;bottom:auto;z-index:1000;min-width:44px;min-height:64px;width:44px;padding:8px 4px;border-radius:10px 0 0 10px;writing-mode:vertical-rl;gap:5px;font:600 13px/1.2 Arial,sans-serif;box-shadow:0 2px 10px #0003; }
.suite-help-trigger[data-placement="edge"]:hover,.suite-help-trigger[data-placement="edge"]:focus-visible {width:50px;}

/* Keep reporting available without covering the Help content. */
.suite-help-panel header, .suite-help-panel nav, .suite-help-footer { flex-shrink: 0; }
.suite-help-footer { display: flex; justify-content: flex-end; padding: 10px 24px; padding-bottom: max(10px, env(safe-area-inset-bottom)); border-top: 1px solid var(--input-border); }
.suite-help-panel .suite-help-bug-report { display: inline-flex; align-items: center; gap: 8px; font-size: 16px; }
.suite-help-panel .suite-help-bug-report:hover { background: var(--muted-bg); }
.suite-help-panel .suite-help-fixed-heading { margin-top: 32px; }

</style>
