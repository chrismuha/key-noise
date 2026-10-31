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

Keyboard and Mouse work immediately with built-in sounds: 27 distinct keyboard
tones and separate left/right mouse sounds. Neither has a sound-source dropdown
or needs sound files. Saved source preferences from older versions are ignored.
The Real/Fake selector applies only to Sirens.

The 27 keyboard slots follow this order:

```text
Q W E R T Y U I O P
A S D F G H J K L
Z X C V B N M Space
```

Each board retains its own playback limit. Custom Combos support shortcut
recording, audio uploads, and pinning to the board. An uploaded custom file plays
when provided; otherwise that custom pad uses a built-in sound. Browser uploads
use browser storage; Electron uses its native file picker.

Sounds support live volume, exact mute, Loop, and Stop all sounds. Switching
boards stops active keyboard/mouse audio. Typing and focused button activation
are not intercepted by mapped keyboard shortcuts.

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
| Pulse | Illustrative steady pitch, 1 second on / 1 second off for 180 seconds after wind-up | 60 seconds | 244 seconds |
| Test (soundboard tap) | Short 0.8-second growl wind-up | 2.2 seconds | 3 seconds |

Attack and Fire keep the rotor turning during intermediate dips. Alert stays at full speed throughout its steady hold. Fire bottoms
out at 60% speed rather than repeatedly slowing nearly to a stop. Full wind-down
only occurs at completion or Cancel. Loop repeats a complete signal sequence.
These fixed cycles ignore the former short powered-time limit.

Volume is remembered across reloads. Zero mutes all real/fake sirens, including
loops. The master output reaches exact silence after a brief click-prevention
ramp. Fake waveform starts/stops are smoothed; there are no activation sounds.

Real sounds now includes 59 audio recordings across 33 catalog entries.
Select **Real sounds**, then **Alert** or **Test / Growl** for the widest coverage.
T-128, STH-10, and Hörmann HLS 273 also have Attack recordings; Thunderbolt 1000T has
a Fire / fast-wail recording. Missing combinations retain the add-files message.

| Included model | Recorded modes |
| --- | --- |
| ACA Allertor 125 | Alert, Test |
| American Signal T-128 | Alert, Test, Attack (another siren is audible) |
| Federal Signal 2001-130, Model 5, Model 7, STL-10 | Alert, Test |
| Federal Signal STH-10A | Alert, Test, Attack (two distant sirens; Sturgis, KY) |
| Federal Signal Thunderbolt 1000 | Alert |
| Federal Signal Thunderbolt 1000T | Alert, Test, Fire / fast wail |
| Federal Signal Thunderbolt 1003 | Alert (YouTube field recording) |
| Sentry 10V, 3V8-H | Alert, Test |
| Sentry 7V8 (7V8-B), 16V1T (16V1T-B) | Alert |
| Federal Signal 508-128 (uploader identifies 508), Model 2 | Alert |
| Whelen Vortex | Alert, Attack (R4 variant; other sirens audible) |
| Whelen WPS-2905 | Attack (wail excerpt; voice excluded) |
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
CC BY 4.0 by dcf77. YouTube additions by Blixt1000, SoundLiker13, and Brandon Mendel
(DSRX100) use the uploader-selected Creative Commons Attribution license;
original titles, source links, copyright notices, and excerpt boundaries are
retained in the manifest and credits. Required credits and license links are bundled with the app.
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
or resetting the whole sequence in Fake mode. Real signals use their recorded
shutdown at the original pitch and speed; re-pressing selects a compatible
measured pitch position for analyzed mechanical recordings, or returns to the
paused original position if a reliable match is unavailable. Fixed recordings cannot reproduce every intermediate rotor
speed, and no synthesized coast is added in Real mode.

**Test is hold-to-run** in the cabinet: mouse/touch or Space/Enter powers the
rotor while held, with no automatic cutoff. Release to coast down; hold again to
reapply power from the current speed. Fake Test retains its earlier release response for the first second, then settles
into a slower coast (about 45 seconds total from full speed). Reapplying power
at any time continues from its remaining speed.
A short hold produces a lower growl. Releasing overrides Loop. Pointer cancel,
focus/window loss, or page hiding also releases Test. Real Test uses 18 dedicated startup/sustain assets with the author’s WAV loop
markers. Startup plays once; holding loops only the steady section, with no
wind-down or automatic cutoff. Release plays the actual recorded shutdown at
its original rate. A partial release or re-press interpolates the measured curves to select a
matching recorded position before continuing; matching remains approximate.

Back or Escape closes the cabinet and promptly stops audio. Changing sound
source stops old playback. Switching signal modes uses the existing simulated
rotor, winding smoothly from its current speed into the new pattern when using
the cabinet buttons. Changing the main soundboard mode dropdown immediately
stops all sirens. Cabinet Real-file mode changes fade the old recording out
and the new one in; their wind-up sound is
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

Real release and Cancel play the matching recorded shutdown companion at its
original pitch and speed. If the original file is already in its ending, it
continues from that playhead. Without a companion (or if it fails to play),
Loop is disabled and the original recording finishes naturally. No generated
tones, resynthesis, pitch shifting, or artificial coast timing enter Real mode.
A short gain crossfade joins the original signal and recorded shutdown.
Analyzed mechanical recordings choose compatible measured pitch positions for
Cancel and resume, without changing playback speed. Unreliable or missing
profiles fall back to the normal recorded transition. Early release can still
differ from a physical siren because these are fixed
recordings. Resuming uses a compatible pitch position when available, otherwise
the paused original position.

The 36 recorded shutdown companions are the primary shutdown audio. Add
`<model-id>-winddown.mp3` (or WAV, OGG, M4A), or
`<model-id>-<mode>-winddown.*` for a mode-specific shutdown. Second Stop,
source changes, and closing the cabinet dispose of both recorded audio paths.
The signal lamp goes out immediately on Cancel.

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
has Alert, Test, and a recorded shutdown; the source pack does not provide an
Attack recording for it. Real-mode pads list the modes that are bundled so a
missing selected mode does not hide the existence of other recordings. Chime
and Air horn appear as additional Real-only modes; switching to Fake resets
those selections to Attack. These non-motor recordings stop with a short fade.

The first Stop tap removes power and shows **Stopped · winding down**. Press
**Stop winding down** or tap that coasting soundboard pad again to end it
immediately. Cancel in the cabinet follows the same two-stage behavior. The
cabinet’s Test/Alert/Attack/Fire power buttons still resume a coasting siren.

Real **held Test** uses only its recorded startup, steady sustain, and shutdown. It never loops a complete test blast or stretches/synthesizes its
shutdown. All 18 bundled models with Test recordings have recorded power assets.
In the simulator, Test is dimmed and disabled for models without authored
hold-to-run assets. Normal Test taps still play the
complete recorded test blast. Fake Test and its existing timings are unchanged.

## In-app Help

Choose **Help** in the top toolbar for Known issues, Siren availability,
Reported issues, and Controls & tips. The button hides with the header controls.
The dialog includes searchable notes for every siren, actual bundled mode
coverage, held-Test support, source limitations, and audio credits. Reported
fixes are distinguished from remaining limitations; this is not a live tracker.
Controls & tips explains unavailable Real buttons, matched Cancel/resume, held-Test
interpolation, STH-10A/B/C coverage, and Pulse playback. Read Me displays the latest
change-list entry and expandable earlier release notes.
Use the section tabs (or section dropdown in narrower windows) to navigate,
and Escape or the header close button to close.


## Reusable Help and Contact Us

Key Noise is the only project using this rollout so far. `src/Help.vue` is the
portable component: it imports only Vue, owns both toolbar buttons and modal
windows, and accepts `appName`, `version`, `sections`, and `releases` props.
Company contact defaults are shared; `company`, `email`, `phone`, and `website`
can override them. `update:open` tells the host to suspend background shortcuts.
Named slots match each section ID; the optional `introduction` slot appears in
Read Me. A release entry is `{ title, items: string[] }`, newest first. The
component displays supplied titles without adding dates.

`src/KeyNoiseHelp.vue` supplies app-specific issue/guide slots and siren data.
`src/help-content.js` reads the current package version and converts the existing
changelog to feature groups with dates removed from the headings. It preserves
the full history without making up old version numbers. Other projects can use
the exact same `Help.vue` with their own content provider; no rollout to them is
authorized yet.

Contact details are from [Muha Computer Repair](https://muhacomputer.com/):
[muhachris297@gmail.com](mailto:muhachris297@gmail.com) and
[(315) 338-1919](tel:+13153381919). Contact Us opens a full-screen overlay; only selecting a
contact link opens the mail or phone app. Help and Contact Us both hide when
the header controls are collapsed.

For this change, review uses the existing live dev browser. No build files,
package versions, or build configuration are changed, and no test/build command
is run.

Help, Read Me, and Contact Us fill the viewport. Their text uses at least
18px at default sizing with high-contrast colors, including metadata and
status labels. Help is blue; Contact Us is purple. Both retain visible focus
and large touch targets. Small screens can scroll the section navigation and
content without shrinking the text.

Keyboard and Mouse support hold-to-sustain: a press starts one smoothly faded
voice, with no tap-to-hold restart. Tap for a short sound,
or hold a pad, its mapped key, or a mouse button for sustained playback until
release. Up to three sounds can play together; additional presses are ignored until
a sound is released. Holding a focused pad with Space/Enter
also works. Release stops that held voice even with Loop enabled. Custom pads
sustain their built-in tone, or loop their uploaded recording without adding
synthetic audio. Stop all, changing tabs, opening Help, losing window focus,
and hiding the page cancel held inputs and pending audio starts.

The in-app **Help → Controls & tips** is the user guide. It covers current
hold/release behavior, the three-sound limit, safe stopping, Space handling,
full-screen Help navigation, release history, toolbar buttons, and Contact Us.

STH-10 Attack uses [SoundLiker13’s Sturgis recording](https://www.youtube.com/watch?v=PgxAVz-qr54),
with the uploader-selected YouTube Creative Commons Attribution license. The
14–215 second excerpt includes two distant STH-10s and background noise; Cancel
uses its own final shutdown (190–215 seconds). The uploader’s original notice
is retained in the manifest and credits. STH-10A/C Fire is also bundled from the supplied Siren Archives video.

Pulse is available in the mode selector and simulator. Fake Pulse uses an
illustrative pulsed steady pattern, not a manufacturer-specific cadence. Real
Pulse is rare; STH-10C includes a supplied-video excerpt. Matching files use
`model-pulse.mp3` (or WAV, OGG, M4A), with optional `model-pulse-winddown.m4a`.
Missing Pulse recordings show the normal unavailable message.

STH-10 variants have separate catalog listings: the existing entry is STH-10A
(its filenames retain `federal-signal-sth-10` for compatibility). STH-10B has
its own files. STH-10C shares A’s Alert, Attack, and Fire recordings and simulated
patterns; C-specific files take priority. Within this family, only C offers Pulse.
No B recordings are bundled. C Pulse is included; custom replacements use
`federal-signal-sth-10c-pulse.mp3` (WAV, OGG, M4A also supported).

The supplied [Siren Archives video](https://www.youtube.com/watch?v=uly8yG2oBCs)
provides STH-10C Pulse (14:29–19:05) and STH-10A/C Fire (9:43–14:28),
with matching shutdown companions and the original long endings. The uploader
titles this source “All signals synth”; this description is retained in the
manifest. No reuse license is stated in its metadata, and no copyright-expiration
claim is made. Existing Alert and Attack recordings remain in use.

Mechanical playback profiles are bundled in `public/sounds/sirens/playback-profiles.json`.
Regenerate them with `python scripts/generate-playback-profiles.py /path/to/ffmpeg`
(requires NumPy). No audio files are modified. Held Test interpolates its authored
speed curves. Real simulator buttons are disabled when their matching recording
is unavailable; held Test requires dedicated power assets.
