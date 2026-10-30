# key-noise Change List

## October 30, 2026 — Dropbox Collection Audit and Second-Tap Stop

- Audit all 79 files in the original public-domain Dropbox ZIP and include an
  inventory of imported sounds, startup/loop components, and spoken announcements.
- Add GCS Model 3 and eight-port Screamer Alert/Test recordings, plus Westminster
  chimes for Whelen WPS-2900 and ASC E-Class and a WPS-4004 D864 air horn. Retain
  the recorder’s Darley identification and ACA-prefixed archive naming discrepancy.
- Expand to 49 signal recordings across 26 entries and 26 fallback shutdowns.
  Expose Chime/Air horn as Real-only modes and show each model’s bundled modes,
  including STH-10’s existing Alert/Test recordings, directly on its pad.
- First Stop displays “Stopped · winding down”; a second Stop/Cancel or tap on a
  coasting soundboard pad immediately ends that voice. Keep cabinet power-button
  resume behavior, active-only green pads, and cleanup of pending sampled starts.
- Update recording credits, inventory links, README, and regression coverage.
  All 69 tests and the web build pass. Verify the two-stage controls in the
  browser and all 75 audio assets against built hashes; all nine additional
  Dropbox assets decode and retain their documented durations.

## October 29, 2026 — Active-Only Green Pads and YouTube Recordings

- Make green siren pads mean audio has started or is still winding down, rather
  than merely having a file available. Keep idle pads neutral and unavailable
  real-mode pads dark gray/black. File lookups remain cancellable without
  showing green before audio starts; clear green after natural or forced stop.
- Search YouTube’s Creative Commons results and check recorder descriptions.
  Add public-domain audio excerpts by Blixt1000 — Redi Wolf for Thunderbolt 1003
  Alert and WPS-4004’s steady audible-protection tone in Alert mode.
- Expand the library to 42 signal recordings across 23 entries, plus 24 recorded
  fallback tails. Credit each YouTube source with title, original hash, excerpt
  times, and conversion notes. Preserve missing-file behavior for other models.
- Cover pending versus audible state, coasting, and final color cleanup in tests.
- All 64 tests and the web build pass. Verify idle/playing/coasting colors in
  the browser and decode both new signals and their fallback tails against
  their manifest durations and built-asset hashes.

## October 29, 2026 — Continuous Real-Sound Coasting from the Current Tone

- Supersede fixed recorded-tail transitions with a short sample captured at the
  real recording’s current playhead. Lower its playback rate and gain using the
  fake motor’s 60-second signal coast and 45-second Test feathering/tail profile.
- Keep the recording’s timbre instead of switching to another clip at a different
  pitch. Blend the grain seam and audio handoff to avoid abrupt transitions.
- Re-power the same sampled voice from its remaining rate, then return to the
  paused recording at full sampled speed; release during recovery coasts from
  that intermediate rate rather than resetting it.
- Keep finite shutdown deadlines independent of Loop, immediate signal-lamp
  release, master mute/volume, pending-decode cancellation, and full cleanup.
  Preserve the dedicated recorded tails as a fallback when decoding fails.
- Document that Real coast-down now processes recorded samples, including any
  captured field noise; the behavior is illustrative rather than an unedited
  recording of an arbitrary hardware release point.
- All 63 tests and the web build pass; verify sampled real coast and recovery in
  the browser. Compare the sampled pitch curve directly with the fake motor and
  cover exact silence, finite retirement, and interrupted recovery.

## October 29, 2026 — Recorded Wind-downs on Real Release and Cancel

- Replace the 150 ms Real-sound cancellation fade with 22 recorded shutdown
  companions covering all 21 bundled model/series entries. Crossfade into the
  actual tail and let it finish naturally; keep its original recorded duration.
- Import dedicated public-domain shutdowns and attribute excerpts from existing
  licensed recordings. Keep German Warning and All-clear tails mode-specific.
- Immediately release the signal button/lamp, disable Loop during shutdown, and
  keep the session tracked until the tail ends. Preserve recordings already in
  their ending instead of restarting a full-speed tail.
- Re-pressing a signal or Test crossfades back to the original paused playhead.
  Clean up outgoing players, pending starts, timers, and nodes on source changes
  or hard stop. Missing custom companions finish the original file instead of
  abruptly fading out.
- Document companion naming, approximate ending boundaries, real-playback limits,
  and updated source credits; cover release, completion, Loop, resume, pending
  cancellation, and all bundled shutdown assets in regression tests.
- All 58 tests and the web build pass. All 22 shutdown files decode with their
  documented durations and match built assets; verify recorded coast and resume
  in the browser cabinet.

## October 29, 2026 — Expand Real Recordings to 40 Sounds

- Add 15 real recordings, bringing the bundled library to 40 files across 21
  catalog entries. Add coverage for Modulator 6024, SiraTone EOWS 612, and Hörmann
  HLS 273; HLS 273 includes German Warning (Attack) and All-clear (Alert).
- Add accurately named catalog entries for Whelen WPS-3016 and analog 2000R,
  Federal Signal Model 2T and SD-10, Darley 3V8, and Sterling M5. Preserve existing
  recordings and keep unavailable mode/model combinations empty.
- Include more public-domain files from Railroader3921, CC0 audio by 2887679652,
  and CC BY recordings by SoundMaster391, mmcdona1, and dcf77. Retain recorder
  names, source and license links, file hashes, and original processing notes.
- Document local signal-pattern differences and recordings with background
  sirens, wind noise, or clipping. Expand attribution and asset-integrity checks.
- Verify all 40 files decode and match built assets; confirm HLS 273 Warning /
  All-clear and layered Modulator playback in the browser. All 53 tests and the
  web build pass. Generate the credits page from the provenance manifest.

## October 29, 2026 — Bundle Licensed Real Siren Recordings

- Add 25 local field recordings for 12 catalog entries, with Alert and short Test
  blasts for Allertor 125, T-128, 2001-130, Model 5, Model 7, STH-10, STL-10,
  Thunderbolt 1000T, Sentry 10V, Sentry 3V8-H, and a Whelen WPS-2900 series sample.
- Include a Thunderbolt 1000 Alert, a T-128 Attack recording with another siren
  audible, and a Thunderbolt 1000T fast wail in Fire mode. Preserve missing-file
  messages for unavailable model/mode combinations instead of substituting audio.
- Add a clearly labeled Whelen series card rather than assign an unidentified
  array recording to individual 2901–2910 models. Real-mode descriptions explain
  that actual recordings have their own lengths and wind-downs.
- Bundle recording credits and provenance: public-domain collection by
  Railroader3921; CC0 Freesound previews by mordeby and guitarguy1985. Document
  transcoding, source URLs, file hashes, recorded modes, and background sounds.
- Link credits from siren settings and document availability and offline use.
- Verify all 25 files decode, match their manifest hashes and built assets, and
  resolve only for the intended model/mode. Confirm layered real playback in
  the browser; all 53 tests and the web build pass.

## October 29, 2026 — Longer Final Coasts and Released-Test Tails

- Extend Attack, Fire, and Alert final coasts to 60 seconds from full speed,
  including Cancel, so the low growl continues beyond the old 18–24 second cutoff.
- Extend full-speed held-Test release to 45 seconds while preserving its first
  second of feathering and shorter tails for low-speed taps. Reapplying power
  continues from the remaining rotor speed.
- Keep intermediate cycles unchanged. Document the Grayson County recording as
  a reference for sustained coasting, with its faded ending and uncertain model;
  these simulator durations are illustrative, not claimed measurements.
- Cover extended natural coasts, release tails, exact silence, and late re-powering.

## October 29, 2026 — Use Documented Siren Timer Cadence

- Replace the overly high 85% Attack trough with an illustrative 70% trough.
- Use the Federal Signal PGA manual’s eight-seconds-powered/four-seconds-coasting
  cadence: three seconds rising, five seconds at full speed, then a partial coast.
- Retain ten rises and a complete final 18-second coast (134 seconds total);
  preserve Alert, Fire, Test, Cancel, and current-speed transitions.
- Document the source and distinguish measured timer timing from estimated pitch
  depth. Update cadence, trough, peak-count, and playback-duration checks.

## October 29, 2026 — Shallower Attack Dips Between Cycles

- Raise Attack’s intermediate minimum from 72% to 85% rotor speed so its pitch
  falls less before the next wind-up. Preserve the current cycle timing, ten
  full-speed peaks, and complete final wind-down.
- Update mid-dip and all-nine-trough regression checks and document the new floor.

## October 29, 2026 — Slower Attack Coasts Between Wind-ups

- Extend each Attack intermediate dip from 8 to 12 seconds, retaining at least
  72% rotor speed before smoothly returning to full speed.
- Keep all ten wind-ups and the final complete coast; the full sequence now
  lasts 166 seconds. Add timing and mid-dip speed regression checks.

## October 29, 2026 — Correct Alert to a Single Steady Signal

- Replace repeated Alert wind-ups with one 4-second wind-up, 180 seconds of
  steady full-speed tone, then the existing 24-second final coast-down.
- Match the common steady Alert / wavering Attack distinction documented by
  Federal Signal and Connecticut's emergency siren guide; update the mode label
  and README to remove the previous cycling Alert description.
- Preserve Attack/Fire patterns, Test, mute, Cancel/resume, smooth transitions,
  and Loop. Recover Alert directly into its remaining steady hold when resumed.
- Add regression coverage for one rise, an uninterrupted three-minute plateau,
  and one complete final coast, including current-rotor mode transitions.

## October 29, 2026 — Shallower Attack and Alert Pitch Dips

- Keep Attack at least 72% and Alert at least 75% rotor speed during intermediate
  dips, avoiding a near-shutdown growl before each next wind-up.
- Retain gradual dip timing, all ten full-speed peaks, current-rotor recovery,
  and a complete final coast to silence. Preserve Fire and Test profiles.
- Add regression coverage for all nine intermediate troughs and their following
  full-speed peaks in both modes.

## October 29, 2026 — Responsive Keyboard Sound Labels

- Give keyboard/mouse button contents a bounded grid track and let sound labels
  wrap, including filenames and pinned custom sounds, instead of clipping.
- Allow long Sound readouts and custom-pad filenames to wrap as well.
- Verify real-file labels at seven requested viewport widths from 240 to 1024
  pixels, including both sides of the mobile breakpoint, with no label overflow.
  Also verify fake Play sound labels at narrow phone width.

## October 29, 2026 — Stop Layered Repeats When Loop Is Off

- Cancel every queued fake-siren repeat immediately when Loop is disabled and
  recheck the setting inside queued callbacks before starting another cycle.
- Update all active real-recording loop flags synchronously, retaining only the
  explicit hold-to-run Test exception. Recheck Loop after asynchronous startup.
- Synchronize Keyboard/Mouse loop changes immediately and recheck recorded
  playback after startup so an older enabled value cannot remain attached.
- Keep the current complete signal pattern and natural coast-down, but do not
  restart it when Loop is off. Preserve Cancel and Stop all behavior.
- Reproduce the queued-repeat failure with layered voices and add regression
  tests for disabling queued loops, one-shot layering, and real-recording ends.

## October 29, 2026 — Smooth Transitions Between Different Signals

- Switch simulator modes and active mode-dropdown selections on the existing
  fake rotor. Preserve current pitch/volume and wind smoothly into the new
  pattern while running or coasting instead of hard-stopping and recreating audio.
- Support gradual deceleration into a lower Test growl as well as acceleration
  back to full speed, retaining mute, signal controls, and loop behavior.
- Reapply power when clicking a coasting soundboard model.
- Fade old real recordings out before switching files and fade new files in;
  retain same-recording resume behavior and cancellation of pending commands.
- Add regression coverage for oscillator/speed continuity, cabinet mode changes,
  and recorded-file transitions.

## October 29, 2026 — Gradual Partial Coasts Between Signal Wind-Ups

- Stretch Attack's intermediate slowdown to 8 seconds and Alert's to 12 seconds,
  preventing the rapid pitch plunge between otherwise complete wind-ups.
- Keep the rotor spinning at a minimum 45% speed for Attack and 50% for Alert;
  fully coast to silence only at the final shutdown or explicit Cancel.
- Preserve ten complete wind-ups, giving total durations of 130 seconds for
  Attack and 279 seconds for Alert with the longer intermediate coasts.
- Keep Fire and Test timing unchanged and retain recovery from the same rotor.
- Add regression coverage for gradual first-second pitch loss, nonzero troughs,
  full-speed recovery, and complete final silence.

## October 29, 2026 — Slow Final Test Coast Without Changing Feathering

- Preserve Test's existing hold, wind-up, re-powering, and first-second release
  response. If power stays released, continue into a longer low-speed tail
  instead of quickly finishing the wind-down.
- Coast about 12 seconds from full-speed manual Test release, scaling down for
  shorter growls. Reapply power from the remaining rotor speed at any point.
- Keep the regular soundboard growl and other signal timing unchanged.
- Add a regression test for first-second continuity, retained tail speed, and
  resuming smoothly after leaving Test released for more than a second.

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
