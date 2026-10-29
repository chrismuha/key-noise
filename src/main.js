import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

// Disable drag/keyboard text highlighting, including native text inputs.
document.addEventListener('selectstart', (event) => event.preventDefault());
document.addEventListener('select', (event) => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
  if (field.selectionStart === null || field.selectionStart === field.selectionEnd) return;
  const caret = field.selectionDirection === 'backward' ? field.selectionStart : field.selectionEnd;
  field.setSelectionRange(caret, caret);
}, true);

createApp(App).mount('#app');

requestAnimationFrame(() => {
  window.keyNoiseApi?.appReady?.();
});
