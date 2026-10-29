import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const code = await readFile(new URL('../src/sound-focus.js', import.meta.url), 'utf8');
const { cycleSoundFocus } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
function fixture() {
  const root = { activeElement: null, defaultView: { getComputedStyle: button => ({ visibility: button.visibility || 'visible' }) } };
  const buttons = Array.from({ length: 3 }, () => ({ getClientRects() { return this.hidden ? [] : [{}]; }, focus() { root.activeElement = this; } }));
  root.querySelectorAll = selector => { assert.equal(selector, 'button[data-sound-button]:not([disabled])'); return buttons; };
  const event = { key: 'Tab', preventDefault() { this.prevented = true; } };
  return { root, buttons, event };
}
test('Tab enters the soundboard from another control and wraps in both directions', () => {
  const { root, buttons, event } = fixture();
  root.activeElement = {};
  cycleSoundFocus(event, root); assert.equal(root.activeElement, buttons[0]);
  cycleSoundFocus(event, root); assert.equal(root.activeElement, buttons[1]);
  root.activeElement = buttons[2]; cycleSoundFocus(event, root); assert.equal(root.activeElement, buttons[0]);
  event.shiftKey = true; cycleSoundFocus(event, root); assert.equal(root.activeElement, buttons[2]);
  assert.equal(event.prevented, true);
});
test('hidden pages and invisible sound buttons are skipped', () => {
  const { root, buttons, event } = fixture();
  buttons[0].hidden = true; buttons[2].visibility = 'hidden';
  cycleSoundFocus(event, root); assert.equal(root.activeElement, buttons[1]);
  cycleSoundFocus(event, root); assert.equal(root.activeElement, buttons[1]);
  buttons[1].hidden = true;
  assert.equal(cycleSoundFocus(event, root), false);
});
test('modified Tab and non-Tab keys preserve normal behavior', () => {
  const { root, event } = fixture();
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'defaultPrevented']) {
    assert.equal(cycleSoundFocus({ ...event, [modifier]: true }, root), false);
  }
  assert.equal(cycleSoundFocus({ ...event, key: 'Enter' }, root), false);
  assert.equal(root.activeElement, null);
});
