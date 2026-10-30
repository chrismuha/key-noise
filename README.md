# Key Noise

Electron + Vue soundboards for Keyboard, Mouse Buttons, and outdoor warning sirens.

## Run

```bash
npm install
npm run dev             # Electron
npm run dev web         # Browser + screen tester
npm run dev:web         # Equivalent browser command
npm test
npm run build:web
```

The app runs at `http://127.0.0.1:5199/`. The web commands open
`/dev-preview.html`, with **Current device** selected by default. It fills the
available browser area and follows resizing. Phone/tablet/desktop presets,
rotation, custom sizes, simulated cutouts, and overflow checks remain available.
Key Noise's tester has no casino cabinet presets. To use another port:
`npm run dev -- web --port 5299`.

## Keyboard and Mouse

Both boards default to **Fake sounds**, which work immediately without files:
27 distinct keyboard tones, separate left/right mouse sounds, and custom-pad
previews. Each board has its own **Sound source** dropdown, remembered separately.
Choose **Real sounds** to use recordings. No real recordings are included.

Place real files in `public/sounds/`, named `sound1.mp3`, `sound2.mp3`, and onward.
WAV, OGG, and M4A with the same names are also supported. Missing real files show
the filename/folder prompt; fake sounds never replace missing files in Real mode.

The 27 keyboard slots follow this order:

```text
Q W E R T Y U I O P
A S D F G H J K L
Z X C V B N M Space
```

Q maps to sound1, W to sound2, and so on. Mouse uses sound1 for Left Click and
sound2 for Right Click. Keyboard and Mouse each retain their own playback limit.
Custom Combos support shortcut recording, MP3 uploads, and pinning to the board.
Browser uploads use browser storage; Electron uses its native file picker.

Fake sounds support live volume, exact mute, Loop, and Stop all sounds. Browser
volume also updates real audio already playing. Switching board or source stops
its active keyboard/mouse sounds. Typing and focused button activation are not
intercepted by mapped keyboard shortcuts.

## Sirens

The catalog has 60 selected current/historical models from Whelen, Federal
Signal, American Signal, ACA, Sentry, Hörmann, Darley, Sterling, and GCS. Filter by manufacturer or
search make, model, and type. Fake sounds are illustrative synthesis, not exact
model recordings or standardized emergency signals. The catalog is expandable
and is not exhaustive.

**Sound source** selects Fake or Real sounds. **Play multiple sounds** defaults
on; click different models to layer them, or uncheck it for one sound at a time.
Buttons always say **Play sound** when idle and **Stop** while playing.

Fake signal patterns:

| Mode | Powered pattern | Final coast | Complete cycle |
| --- | --- | --- | --- |
| Attack | 10 wind-ups: 3 seconds up, 5 seconds at full speed, 4-second partial coasts between rises | 60 seconds | 176 seconds |
| Fire | 10 fast wails: 1.5 seconds up, 0.5 seconds at full speed, 1.5-second shallow dips | 60 seconds | 93.5 seconds |
| Alert | One 4-second wind-up and a steady 180-second full-speed hold | 60 seconds | 244 seconds |
| Test (soundboard tap) | Short 0.8-second growl wind-up | 2.2 seconds | 3 seconds |

Attack and Fire keep the rotor turning during intermediate dips. Alert stays at full speed throughout its steady hold. Fire bottoms
out at 60% speed rather than repeatedly slowing nearly to a stop. Full wind-down
only occurs at completion or Cancel. Loop repeats a complete signal sequence.
These fixed cycles ignore the former short powered-time limit.

Volume is remembered across reloads. Zero mutes all real/fake sirens, including
loops. The master output reaches exact silence after a brief click-prevention
ramp. Fake waveform starts/stops are smoothed; there are no activation sounds.

Real sounds now includes 49 licensed field recordings across 26 catalog entries.
Select **Real sounds**, then **Alert** or **Test / Growl** for the widest coverage.
T-128 and Hörmann HLS 273 also have Attack recordings; Thunderbolt 1000T has
a Fire / fast-wail recording. Missing combinations retain the add-files message.

| Included model | Recorded modes |
| --- | --- |
| ACA Allertor 125 | Alert, Test |
| American Signal T-128 | Alert, Test, Attack (another siren is audible) |
| Federal Signal 2001-130, Model 5, Model 7, STH-10, STL-10 | Alert, Test |
| Federal Signal Thunderbolt 1000 | Alert |
| Federal Signal Thunderbolt 1000T | Alert, Test, Fire / fast wail |
| Federal Signal Thunderbolt 1003 | Alert (YouTube field recording) |
| Sentry 10V, 3V8-H | Alert, Test |
| Whelen WPS-2900 series | Alert, Test, Chime (560 Hz series sample; array size unspecified) |
| Whelen WPS-3016 | Alert |
| Whelen WPS-4004 | Alert (steady audible-protection tone), Air horn (D864) |
| Whelen 2000R (analog) | Alert, Test |
| Federal Signal Model 2T, SD-10 | Alert, Test |
| Federal Signal Modulator | Alert (6024; Thunderbolt audible in background) |
| Federal Signal SiraTone EOWS 612 | Alert (monthly test; wind noise and some clipping) |
| Hörmann HLS 273 | Attack (German Warning), Alert (German All-clear) |
| Darley 3V8, Screamer (8-port), Sterling M5 (16-port), GCS Model 3 | Alert, Test |
| American Signal E-Class | Chime (Westminster) |

The Whelen series card is separate from the individual WPS-2901–2910 models;
those models do not inherit a recording with an unidentified speaker configuration.
Test recordings are short noon/test blasts, not synthesized hold-to-run motors.
Real signals follow their recorded lengths, backgrounds, and wind-downs rather
than the fake-mode timing table. Recorded fast wail does not imply the historic
Thunderbolt 1003 hi-lo Fire signal.

The main collection was dedicated to the public domain by Railroader3921:
[source and dedication](https://www.airraidsirens.net/forums/viewtopic.php?p=207616).
Additional recordings use public Freesound HQ previews: CC0 by mordeby,
guitarguy1985, and 2887679652; CC BY 3.0 by SoundMaster391 and mmcdona1; and
CC BY 4.0 by dcf77. Required credits and license links are bundled with the app.
HLS 273 plays the actual German Warning / All-clear patterns, mapped to Attack /
Alert; these do not follow the simulator’s US-style pattern durations.
The bundled [credits page](public/sounds/sirens/CREDITS.html) and
[file manifest](public/sounds/sirens/recordings.json) document original filenames,
recorders, licenses, source URLs, hashes, transformations, and known limitations.
These files are bundled locally for offline playback. WAV collection files are
transcoded to 44.1 kHz AAC at 128 kbps; MP3 previews are copied without editing.

To add more recordings, place them under `public/sounds/sirens/`, using the
filename on each model button. Examples:

```text
public/sounds/sirens/whelen-wps-2901-attack.mp3
public/sounds/sirens/whelen-wps-2901-alert.mp3
public/sounds/sirens/whelen-wps-2901-fire.mp3
public/sounds/sirens/whelen-wps-2901-test.mp3
```

MP3, WAV, OGG, and M4A are checked in that order. Attack also accepts the original
model-only filename, such as `whelen-wps-2901.mp3`. Other modes require their own
recording. Real sounds play complete files; Loop repeats at the file's end.
**Refresh sound files** updates availability after files are added.

Model references: [Whelen WPS2900](https://www.whelenmassnotification.com/omni-directional/wps2900-series),
[Whelen WPS4000](https://www.whelenmassnotification.com/rotating/wps4000-series),
[Federal Signal outdoor warning brochure](https://www.fedsig.com/sites/default/files/resource_library_document/ANS%20Capaiblites%20brochure%20ANS200.pdf).

## Cabinet simulator and resume

Hold a model for about half a second, right-click it, or focus it and press F2 to
open the yellow control-cabinet simulator. A normal tap plays/stops the model;
moving to scroll cancels the hold. Opening the cabinet is silent.

The cabinet follows the reference with a civil-defense emblem, colored Test,
Alert, Fire, Attack, and Cancel buttons, lamps, and the selected make/model.
Source, volume, and Loop controls use the same settings as the soundboard.

**Cancel** immediately releases the active button and switches the signal lamp
off while the rotor coasts. Clicking that same signal again during coast-down
reuses the existing rotor and its current speed. It accelerates back to the
next full-speed part of the remaining sequence instead of starting from rest
or resetting the whole sequence. Real recordings pause while a short sample of their current tone coasts down.
Re-pressing the signal accelerates that same sample from its remaining speed,
then crossfades back to the paused recording at matching playback speed.

**Test is hold-to-run** in the cabinet: mouse/touch or Space/Enter powers the
rotor while held, with no automatic cutoff. Release to coast down; hold again to
reapply power from the current speed. Fake Test retains its earlier release response for the first second, then settles
into a slower coast (about 45 seconds total from full speed). Reapplying power
at any time continues from its remaining speed.
A short hold produces a lower growl. Releasing overrides Loop. Pointer cancel,
focus/window loss, or page hiding also releases Test. Real Test uses 18 dedicated startup/sustain assets with the author’s WAV loop
markers. Startup plays once; holding loops only the steady section, with no
wind-down or automatic cutoff. Release plays the actual recorded shutdown at
its original rate. A partial re-press selects a nearby matching position in the
recorded startup before returning to sustain; matching is approximate.

Back or Escape closes the cabinet and promptly stops audio. Changing sound
source stops old playback. Switching signal modes uses the existing simulated
rotor, winding smoothly from its current speed into the new pattern. The mode
dropdown also transitions playing simulated models in place. Real-file mode
changes fade the old recording out and the new one in; their wind-up sound is
part of the supplied recording. Tab navigation remains scoped to cabinet sound buttons while open,
and focus returns to the model on closing.

## Layout and navigation

Mobile opens directly to the soundboard. Keyboard shows 12 buttons per page and
Sirens shows 6; Previous/Next does not stop sirens. Settings and Custom Combos
have separate mobile pages. Desktop shows the full layout.

**Tab through sounds only** defaults on and is remembered. Tab/Shift+Tab cycle
visible sound buttons in the current board/page. Enter/Space activates them.
Turn it off for normal browser navigation through all controls.

**Hide controls** collapses headers, tabs, and settings; **Show controls** restores
them. Loop and Stop remain accessible. Text highlighting and touch text callouts
are disabled throughout the app, including text fields; typing still works.

The tests cover synthesized motor timing/continuity, Cancel/resume, mute/loops,
placeholder buffers and board controls, recording lookup, gestures, pagination,
and keyboard focus. Audio tests use controlled backends; listening on real
hardware remains useful for evaluating how the simulations sound.

Attack uses eight-second powered intervals and four-second intermediate coasts,
with an illustrative 70% minimum rotor speed,
then wind back up on the same rotor. Only the last coast reaches silence unless
Cancel removes power earlier. Retaining ten wind-ups makes Attack 2 minutes
56 seconds. Alert has one wind-up, a steady three-minute tone, and a final coast;
it does not dip or repeat wind-ups during its hold. Fire and Test use their own
existing timings.

Starting another signal during a cycle or coast-down preserves the same
oscillators and current pitch/volume. The rotor accelerates (or slows for a lower
Test growl) before following the new signal pattern. The current cancelled mode
continues its remaining sequence; a different mode begins its new sequence from
the existing motor speed. Clicking a coasting soundboard model also reapplies
power instead of leaving it stopped or creating another rotor.

Turning **Loop sounds** off updates every active voice immediately and cancels
any queued next-cycle starts. Each playing siren finishes its current complete
pattern and coast-down once; it does not start another sequence. A single
Attack/Fire pattern contains ten wind-ups; Alert contains one steady three-minute hold. Use Cancel
or Stop all sirens to remove power before that pattern finishes. A physically
held Test remains powered only while held, independently of Loop.

Alert follows the common steady-signal convention described in
[Federal Signal's siren manual](https://www.fedsig.com/sites/default/files/resource_library_document/IS_2_Rev713.pdf)
and [Connecticut's emergency siren guide](https://portal.ct.gov/cfpc/-/media/demhs/_docs/plans-and-publications/ehsp0086--mps_media_guide.pdf).
The simulator holds full speed for 180 seconds, in addition to its wind-up and
coast-down. Cancel/resume, smooth mode transitions, and Loop still apply.

Attack’s cadence follows the eight-second-on/four-second-off PGA example in
[Federal Signal’s timer instructions](https://www.civildefensemuseum.com/sirens/manuals/ARandAFTimerManual.pdf).
The ten-rise sequence ends with its full 60-second coast instead of the final
four-second intermediate coast. This is an illustrative pitch profile, not a
measured recording or a universal timing for every siren model. AR/AF controllers
also support three-minute Attack signals; the app retains its requested ten rises.

Final fake-siren coasts now last 60 seconds from full speed for Attack, Fire, and
Alert, including Cancel. Held Test keeps its first-second feathering response
and extends the remaining tail to about 45 seconds from full speed; short
growls still stop sooner. These are illustrative settings inspired by the
[sustained Grayson County recording](https://www.civildefensemuseum.com/sirens/soundsvids/graycoap.mp3),
whose author reports a coast of over two minutes and fades the recording before
the rotor stops. The app does not claim an exact measured stop time for that
recording or identical behavior across all models.

After updating recording metadata, regenerate the bundled attribution page with
`node scripts/generate-siren-credits.mjs` before building.

Real release and Cancel isolate the narrow tonal peaks in a short window of
the recording at the current playhead, then build a seamless periodic tone.
Raw wind/traffic noise and the old short-loop seam are excluded. The sample’s playback rate and gain follow
the fake motor’s continuous coast: 60 seconds for signals, and the same Test
feathering response followed by a 45-second tail. Re-powering accelerates the
same sample from its remaining rate, then returns to the paused file once the
sample reaches its original pitch. Releasing during recovery reverses power on
that same voice. No generic oscillator is substituted for the recording.

The tiny captured sample loops internally to sustain the falling tone; that
does not repeat the full recorded signal, and it always retires at the finite
coast deadline even when the user’s Loop checkbox is off. Source changes,
closing the cabinet, and hard stop cancel pending decoding and both audio paths.
The signal lamp still goes out immediately on Cancel. These are processed real
recordings with illustrative motor behavior, not unedited hardware recordings
of every possible release point. When no clear siren tone is detectable, playback stops rather than looping
background noise. The normal recording remains unmodified; this tonal
processing applies only to the interactive coast/recovery path.

The 26 recorded shutdown companions remain as a fallback for audio that cannot
be decoded into the sampled engine. Add `<model-id>-winddown.mp3` (or WAV, OGG,
M4A), or `<model-id>-<mode>-winddown.*` for a mode-specific fallback. A fallback
already in its recorded ending continues at its current playhead. Without a
companion, fallback playback disables Loop and finishes the original file.

Green siren pads indicate audio that has actually started or is still coasting.
Available but idle pads stay neutral; real-mode combinations without a recording
are dark gray/black. Pending file checks do not turn pads green.

YouTube additions are audio excerpts from Blixt1000 — Redi Wolf, whose video
descriptions explicitly dedicate them to the public domain: [WPS-4004](https://www.youtube.com/watch?v=HPNt4LDu5Z8)
and [Thunderbolt 1003](https://www.youtube.com/watch?v=0AXmBPEAfA0). The manifest
records titles, source URLs, original hashes, excerpt boundaries, processing, and
credits. Missing models retain the add-files behavior rather than inheriting
an unrelated model’s recording.

The Dropbox collection has been audited file by file: see
[all 79 source files](public/sounds/sirens/dropbox-inventory.json) for imported
filenames and unused startup/loop components or spoken announcements. STH-10
has Alert, Test, and a fallback shutdown; the source pack does not provide an
Attack recording for it. Real-mode pads list the modes that are bundled so a
missing selected mode does not hide the existence of other recordings. Chime
and Air horn appear as additional Real-only modes; switching to Fake resets
those selections to Attack. These non-motor recordings stop with a short fade.

The first Stop tap removes power and shows **Stopped · winding down**. Press
**Stop winding down** or tap that coasting soundboard pad again to end it
immediately. Cancel in the cabinet follows the same two-stage behavior. The
cabinet’s Test/Alert/Attack/Fire power buttons still resume a coasting siren.

Real **held Test** follows its recorded audio rather than the signal-mode tonal
coast engine. It never loops a complete test blast or stretches/synthesizes its
shutdown. All 18 bundled models with Test recordings have recorded power assets.
A model without authored hold-to-run assets shows an unavailable message instead
of repeatedly winding down while Test is held. Normal Test taps still play the
complete recorded test blast. Fake Test and its existing timings are unchanged.
