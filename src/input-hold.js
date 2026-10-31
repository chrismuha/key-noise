// One voice per press: never cut off a tap and replace it during a hold.
export function createInputHold({ play, limit = 3 }) {
  const presses = new Map();
  function start(token, sound) {
    if (presses.has(token) || presses.size >= limit) return;
    const press = { released: false };
    presses.set(token, press);
    Promise.resolve(play(sound, true)).then(player => {
      press.voice = player;
      if (!player && presses.get(token) === press) presses.delete(token);
      if (press.released) player?.stop();
    }).catch(() => {});
  }
  function end(token, cancel = false) {
    const press = presses.get(token);
    if (!press) return;
    presses.delete(token);
    press.released = true;
    if (!cancel && press.voice?.release) press.voice.release();
    else press.voice?.stop();
  }
  function cancelAll() { for (const token of presses.keys()) end(token, true); }
  return { start, end, cancelAll };
}
