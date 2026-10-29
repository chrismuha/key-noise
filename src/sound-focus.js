// Only visible sound triggers participate, including the current mobile page.
export function cycleSoundFocus(event, root = document) {
  if (event.defaultPrevented || event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return false;
  const scope = root.querySelector?.('dialog[open]') || root;
  const buttons = [...scope.querySelectorAll('button[data-sound-button]:not([disabled])')].filter(button =>
    button.getClientRects().length > 0 && root.defaultView.getComputedStyle(button).visibility !== 'hidden'
  );
  if (!buttons.length) return false;
  const index = buttons.indexOf(root.activeElement);
  const next = index < 0
    ? (event.shiftKey ? buttons.length - 1 : 0)
    : (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
  event.preventDefault();
  buttons[next].focus();
  return true;
}
