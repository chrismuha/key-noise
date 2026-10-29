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

The catalog has 51 selected current/historical models from Whelen, Federal
Signal, American Signal, ACA, Sentry, and Hörmann. Filter by manufacturer or
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

Real recordings live under `public/sounds/sirens/`, using the filename on each
model button. Examples:

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
or resetting the whole sequence. Real recordings keep their current position
when resumed before their short cancellation fade finishes.

**Test is hold-to-run** in the cabinet: mouse/touch or Space/Enter powers the
rotor while held, with no automatic cutoff. Release to coast down; hold again to
reapply power from the current speed. Test retains its earlier release response for the first second, then settles
into a slower coast (about 45 seconds total from full speed). Reapplying power
at any time continues from its remaining speed.
A short hold produces a lower growl. Releasing overrides Loop. Pointer cancel,
focus/window loss, or page hiding also releases Test. Real Test audio repeats
while held and fades on release; it cannot synthesize motor behavior from a file.

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
