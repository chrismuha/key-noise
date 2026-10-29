# key-noise Change List

## October 29, 2026 — Signal Corrections and Keyboard/Mouse Fake Sounds

- Add independently remembered Real/Fake sound dropdowns to Keyboard and Mouse,
  defaulting to generated previews without recordings. Provide keyboard tones,
  separate mouse sounds, custom-pad previews, live volume/mute, Loop, and Stop.
- Make Attack complete ten full wind-ups before its final coast. Make Fire a
  faster ten-wail pattern with shallow dips, keeping at least 60% rotor speed
  between rises instead of repeatedly slowing nearly to a stop.
- Restore Test's earlier response: 2.2-second short-growl coast and roughly
  4-second manual full-speed coast, independently of other signal coast timings.
- Resume cancelled Attack/Alert/Fire on the same oscillator pair at its current
  speed, smoothly recovering to a full-speed part of the remaining sequence.
  Preserve progress and real recording position instead of restarting.
- Switch the signal lamp off immediately on Cancel while retaining audible
  coast-down and immediate button release.
- Resize/recenter the civil-defense triangle and CD so both fit within the circle.
- Remove the obsolete short siren duration selector for fixed complete cycles.
- Consolidate README instructions and add regression tests for all ten Attack
  peaks, Fire trough speeds, signal recovery, placeholder buffers, and board controls.
- Verify muted Keyboard/Mouse playback, real-file prompts, Fire Cancel/resume,
  immediate lamp/button release, and corrected emblem in the live browser.

## October 29, 2026 — Slower, Gradual Siren Coast-Downs

- Replace the steep initial pitch drop with a smooth coast curve that loses
  speed gently at first and settles gradually through its low growl.
- Extend full-speed Attack, Fire, and manual Test coasts to 18 seconds, Alert
  to 24 seconds, and the short Test growl's coast to 6 seconds. Scale manual
  coast time to current speed while preserving re-powering the same rotor.
- Preserve Fire/Alert powered patterns and peak holds; longer tails make their
  total cycles 74 seconds and 3 minutes 18 seconds respectively.
- Retain immediate control-button release on Cancel, exact mute, and prompt
  stops when switching tabs/sources or closing the simulator.
- Add regression coverage for gradual early pitch loss, continuous mid-coast
  speed, a lingering low tail, and exact silence at the end.

## October 29, 2026 — Longer Full-Speed Signal Holds

- Extend fake Fire to one minute total and fake Alert to three minutes total,
  including their final coast-downs, while retaining ten complete wind-ups.
- Hold each Fire peak at full speed for 2.25 seconds and each slower Alert peak
  for 10.7 seconds instead of immediately dropping after reaching full speed.
- Update mode descriptions and fixed-cycle duration labels. Preserve early
  Cancel, re-powering through Test, full-cycle loops, and recorded-file playback.
- Verify all ten sustained full-speed peaks, exact total durations, and complete
  final wind-downs in automated timing tests.

## October 29, 2026 — Disable Text Highlighting

- Disable text selection and touch text callouts throughout the app and cabinet
  simulator. Prevent drag selection and collapse native text-input selections
  while retaining caret movement, typing, scrolling, and control activation.

## October 29, 2026 — Immediate Cabinet Button Release on Cancel

- Separate the cabinet's latched button state from the rotor's audible/running
  state. Cancel releases the active button and its pressed accessibility state
  immediately while the siren continues its natural coast-down.
- Keep the signal lamp on until the rotor finishes, and release the Test button
  immediately when manual power is removed.
- Add regression coverage verifying immediate button release with the same
  still-coasting audio session.

## October 29, 2026 — Reapply Test Power Without Restarting

- Reuse the current simulated rotor when Test is held during a running signal
  or coast-down. Preserve current pitch/speed and accelerate from there rather
  than stopping and recreating the siren.
- Allow repeated hold/release/hold gestures while the rotor is still turning,
  canceling its pending shutdown when power returns. Keep mute and Loop behavior.
- Keep the current recording and playback position when Test re-powers real
  audio during an explicit fade, instead of loading or rewinding the file.
- Keep the Test pressed state separate from the selected signal and clarify the
  cabinet hint: hold to power, release to coast, hold again to resume.
- Add regression coverage for continuous speed through repeated gestures,
  canceled shutdown, unchanged oscillator counts, and preserved real-file position.

## October 29, 2026 — Ten Complete Fire and Alert Wind-Ups

- Make fake Fire finish exactly ten full-speed wind-ups before the final
  coast-down: 2-second rises, 1.5-second dips between rises, and 4-second coast.
- Make fake Alert run the same ten-wind-up sequence more slowly: 4-second rises,
  3-second dips between rises, and 6-second final coast.
- Schedule every full-speed peak explicitly so no rise is partial or cut off.
  Disable the Attack powered-time selector for these fixed complete sequences.
- Preserve early Cancel coast-down, full-sequence looping, hold-to-run Test,
  independent overlapping sirens, and real-file playback.
- Add regression coverage counting all ten equal full-speed peaks and verifying
  the complete final coast regardless of the powered-time setting.

## October 29, 2026 — Momentary Hold-to-Run Test Control

- Make the cabinet Test button run only while held using a mouse, touch, Space,
  or Enter. Wind fake rotors up over 3 seconds and sustain full speed without
  an automatic duration cutoff; short holds produce lower growls.
- Coast from the current rotor speed on release and suppress Loop restarts.
  Release on pointer cancellation, focus/window loss, and page hiding as well.
- Capture the pointer so releasing outside the button still removes power.
  Cancel pending asynchronous starts when Test is released quickly.
- Repeat real Test recordings while held and fade them out when released.
- Keep regular soundboard Test taps as short complete growl cycles, with an
  assistive click fallback for activating the cabinet button without a hold.
- Add regression tests for long/short holds, release with Loop enabled, and
  release before playback initialization completes.

## October 29, 2026 — Complete Siren Wind-Up and Coast-Down

- Model fake sirens with a full low-to-high motor wind-up and a speed-based
  coast-down to silence instead of ending at an arbitrary pitch.
- Treat the 1–5 second selector as Powered time. Attack/Alert add 3 seconds of
  wind-up and 4 seconds of coast; Fire adds 4 and 5 seconds respectively.
  Test / Growl completes a 0.8-second wind-up and 2.2-second coast.
- Start each fake loop only after its full cycle finishes, preserving mute and
  independent overlapping playback. Cancel or clicking a playing siren removes
  power and coasts down from its current pitch; keep it tracked until finished.
- Keep tab/source/mode changes and closing the simulator as prompt stops.
- Play real recordings in full, looping at their natural end instead of
  truncating their wind-down with the powered-time setting. Fade explicit
  cancellation briefly; real rotor behavior remains part of the recording.
- Add regression coverage for complete rises/falls at the shortest powered time,
  graceful versus immediate stop, and untruncated real recording loops.

## October 29, 2026 — Current Device Web Preview

- Add Current device as the default screen tester preset, filling the available browser area without a simulated device frame.
- Keep fixed device presets, rotation, and custom sizing available when selected.
- Refresh preview dimensions automatically on browser resizing and clear simulated safe-area overrides when returning to Current device.
- Remove casino cabinet presets, cabinet display markup, and cabinet-specific styling from the Key Noise web screen tester.

## October 29, 2026 — Press-and-Hold Cabinet Simulator

- Hold any siren model for 550 ms to open a dedicated control-cabinet simulator.
  Preserve normal tap playback, suppress the click after a hold, and cancel the
  gesture when moving to scroll. Also support right-click and keyboard F2.
- Recreate the supplied yellow cabinet reference in responsive CSS/SVG, with
  civil defense emblem, enclosure hardware, power/signal lamps, model name,
  and silver Test, blue Alert, red Fire, yellow Attack, and black Cancel buttons.
- Open silently, then play the selected model using the cabinet mode buttons.
  Use the existing source, volume, mute, and loop controls. Test gives the growl;
  Cancel stops audio. Protect rapid commands so only the latest command starts,
  including when Cancel interrupts a pending command.
- Provide a native modal with Escape/Back dismissal, focus restoration, and
  sound-only Tab navigation scoped to the simulator. Stop sounds on dismissal.
- Keep the cabinet usable on small screens with a scrollable layout and a
  persistent Back control. No extra activation or button sound effects.
- Add hold/scroll, simulator lifecycle, command-race, and modal-focus tests.
  Verify desktop entry, playback indicators, mute, Loop, Cancel, Back, and a
  phone-sized layout in the connected browser with no console errors observed.

## October 29, 2026 — Attack, Alert, Fire, and Test / Growl Modes

- Add a Siren mode dropdown next to Sound source and Manufacturer.
- Give fake sirens four distinct illustrative patterns: Attack rises/falls,
  Alert winds up to steady pitch, Fire rises/falls more slowly, and Test / Growl
  produces a short low wind-up/down capped at 1.5 seconds or the playback limit.
- Support independent looping and overlapping voices for the chosen mode.
  Changing mode stops old voices and refreshes real-file availability, ignoring
  stale scans from the previous mode.
- Load mode-specific real recordings using model-attack, model-alert, model-fire,
  or model-test filenames in MP3/WAV/OGG/M4A formats. Preserve original model-only
  filenames as an Attack fallback; never use them for the other modes.
- Update filenames, missing-file messages, mode descriptions, and README setup
  instructions. Keep model-button labels as Play sound / Stop.
- Add regression tests for distinct patterns, the brief growl, recording filename
  fallbacks, and stopping/restarting playback when the selected mode changes.

## October 29, 2026 — Siren Volume, Transitions, and Consistent Button Labels

- Route real and fake sirens, overlapping voices, and loop restarts through one
  master volume output. Zero reaches exact silence after a 10 ms fade; 100%
  applies unity gain. Use Web Audio for real files so control does not depend on
  browser support for changing an HTML audio element's volume.
- Separate fake-siren volume from its attack/release envelope, normalize its
  two voices, and fade starts and stops to reduce clicks. No activation sound
  effects are added.
- Save the siren volume across tab changes and reloads, including a zero setting.
- Remove range-input padding/borders so the slider uses its full control width.
- Label every idle siren button “▶ Play sound” for both Real and Fake sources,
  including models awaiting sound files. Playing buttons show “■ Stop”; missing
  real files still show the filename/folder guidance in the status message.
- Add regression tests for muted and full-volume real/fake playback and muted
  loop restarts. Automated audio tests use controlled backends; listening on
  the user's device is still needed to confirm the reported sound is resolved.

## October 29, 2026 — Sirens, Mobile Soundboards, and Playback Controls

### Sirens soundboard

- Add a Sirens tab with 51 selected current and historical models from Whelen,
  Federal Signal, American Signal, ACA, Sentry, and Hörmann. Each model button
  identifies its manufacturer, model, and mechanical, electronic, or pneumatic type.
- Add Manufacturer and Sound source dropdowns directly above the soundboard,
  plus model/type search in Settings.
- Offer Fake sounds by default: synthesized, illustrative siren wails that work
  immediately without sound files. These are approximations, not authentic model
  recordings, and the catalog is not exhaustive.
- Offer Real sounds for user-supplied MP3, WAV, OGG, or M4A files under
  `public/sounds/sirens/`. Show each expected filename, a Keyboard-style
  “Add files named…” message when sounds are missing, readiness counts, and a
  Refresh sound files button. No real recordings ship with the app.
- Remember the Real/Fake sound source across sessions.
- Enable Play multiple sounds by default. Different sirens can overlap, each
  with an independent playback limit. Click a playing model to stop just that
  siren, or use Stop all sirens. Uncheck the setting for one sound at a time.
- Keep sirens playing when browsing filters or mobile soundboard pages. Stop
  them when changing source, duration, single/multiple mode, or leaving Sirens.
- Add live siren volume and a one-to-five-second playback limit.

### Looping and soundboard view

- Add a Loop sounds checkbox for Keyboard, Mouse, and both real and fake Sirens.
  Repeat each sound at its playback limit or the recording's end until stopped;
  unchecking Loop lets the current cycle finish. Layered sirens loop independently.
- Add Stop all sounds for Keyboard/Mouse, including cancellation of pending starts.
- Add Hide controls / Show controls arrows to collapse the large header, tabs,
  settings, and filters. Keep the soundboard, loop control, pagination, and stop
  actions available without interrupting audio.

### Mobile and keyboard navigation

- Rework fluid layouts, grid tracks, long labels, safe-area spacing, touch targets,
  focus indicators, and reduced-motion behavior for small and large viewports.
- Open mobile tabs to the soundboard instead of the large desktop header.
  Put settings and custom keyboard combos on separate mobile pages.
- Paginate mobile keyboards at 12 buttons per page and sirens at 6 per page,
  with Previous/Next controls. Show all buttons together on desktop.
- Add Tab through sounds only, enabled by default and remembered. Tab and
  Shift+Tab wrap through visible sound buttons in the current tab/page, skipping
  other controls and hidden content. Turn it off for normal browser navigation.
- Allow Enter/Space to activate focused buttons and prevent mapped keyboard
  shortcuts from intercepting typing or activation inside interactive controls.
- Make mouse sound buttons work through click activation, including touch and
  keyboard input.

### Web development and compatibility

- Add `npm run dev web`, `npm run dev:web`, and `npm run dev:mobile:web`.
  Keep plain `npm run dev` launching Electron.
- Add `/dev-preview.html`, based on the suite's Sentence Maker screen tester,
  with Current device selected by default and automatic viewport resizing.
- Include phone, tablet, foldable, laptop, desktop, 4K, custom size, rotation,
  simulated cutouts/safe areas, and horizontal-overflow checks.
- Add browser MP3 uploads for custom pads and browser playback volume while
  retaining Electron's native picker and system volume behavior. Permit local
  data/blob media in the content security policy for browser uploads.
- Fix missing-audio detection so Vite's HTML fallback is not reported as an
  available audio file. Continue checking alternate supported audio formats.
- Expand README instructions for playback, model filenames, controls, mobile
  pages, web development, and the preview tester.

### Validation and known limits

- Add 13 automated tests for catalog/filenames, missing-file detection, simulated
  audio lifecycle, real/fake concurrency, pending-playback cancellation, mobile
  pagination, single/multiple mode, independent loops, and sound-only Tab focus.
- Expose these tests through `npm test` so the existing CI test step runs them.
- Validate the production web build and development preview HTTP routes.
- Browser visual verification was unavailable in this environment. Audio tests
  use controlled audio backends; real-device listening and layout checks remain
  manual. Vite continues to report the existing CommonJS configuration warning.


## October 7, 2026 — App Icon Framing

- Match ProfitPulse’s macOS icon dimensions and placement before and after launch.
- Keep source artwork separate so repeated builds do not accumulate padding.
