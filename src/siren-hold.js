export function createSirenHold({ onHold, onTap, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let pending;
  let suppressed;
  function cancel() { if (pending) clearTimer(pending.timer); pending = null; }
  return {
    start(event, siren) {
      cancel();
      suppressed = null;
      if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
      pending = { id: siren.id, x: event.clientX, y: event.clientY, timer: setTimer(() => {
        pending = null;
        suppressed = siren.id;
        onHold(siren);
      }, 550) };
    },
    move(event) { if (pending && Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 12) { suppressed = pending.id; cancel(); } },
    cancel,
    tap(siren) {
      cancel();
      if (suppressed === siren.id) { suppressed = null; return; }
      onTap(siren);
    },
    dispose() { cancel(); suppressed = null; }
  };
}
