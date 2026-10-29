# Key Noise

Electron + Vue app that plays numbered sound files when mapped keyboard keys are pressed.

## Install

```bash
npm install
npm run dev
```

## Sound files

Add your sounds to:

```text
public/sounds/
```

Name them in numerical order:

```text
sound1.mp3
sound2.mp3
sound3.mp3
```

The app also checks for `.wav`, `.ogg`, and `.m4a` files with the same numbering.

## Key map

The first 27 sound slots are mapped across the keyboard:

```text
Q W E R T Y U I O P
A S D F G H J K L
Z X C V B N M Space
```

Each key plays the matching number, so `Q` plays `sound1.mp3`, `W` plays `sound2.mp3`, and so on.

## Mouse map

The Mouse Buttons tab uses the first two sound slots:

```text
Left Click  -> sound1.mp3
Right Click -> sound2.mp3
```

Mouse button playback has its own saved duration setting.

## Sirens

The Sirens tab includes selected current and historical models from Whelen,
Federal Signal, American Signal, ACA, Sentry, and Hörmann. Filter by manufacturer
or search make, model, and type. This is an expandable catalog, not an exhaustive
list of every siren ever made.

**Sound source** offers **Fake sounds** (the default) and **Real sounds**. Every model can play an illustrative
synthesized wail without audio files. These are approximations, not exact model
recordings. Select Real sounds to play your own audio instead. Missing files
show a message; there is no automatic simulated fallback in Real sounds mode.
Several models can play together, each with its own playback limit. Click a
playing model to stop just that siren, or press Stop all sirens. Filtering keeps
active sirens playing. Switching tabs or changing the source or duration stops
all sirens. Volume and a 1–5 second powered-time setting are available for fake Attack sirens, in addition to wind-up and coast-down. Fire and Alert always finish their ten-wind-up sequences.

Add real sounds under `public/sounds/sirens/`, with the filenames shown on each
model button. For example:

```text
public/sounds/sirens/whelen-wps-2901.mp3
public/sounds/sirens/federal-signal-thunderbolt-1000t.mp3
```

WAV, OGG, and M4A are also supported, in that order after MP3. Use **Refresh sound
files** after adding files. No recordings are included.

Model references include [Whelen's WPS2900 catalog](https://www.whelenmassnotification.com/omni-directional/wps2900-series),
[Whelen's WPS4000 catalog](https://www.whelenmassnotification.com/rotating/wps4000-series),
and [Federal Signal's outdoor warning brochure](https://www.fedsig.com/sites/default/files/resource_library_document/ANS%20Capaiblites%20brochure%20ANS200.pdf).

## Web development and screen tester

```bash
npm run dev web
# Equivalent:
npm run dev:web
```

Opens `http://127.0.0.1:5199/dev-preview.html`, using the same responsive preview
as Sentence Maker. Defaults to **Current device**, filling the available browser
area and following window resizing or device rotation. Includes phone, tablet, foldable, laptop, desktop, 4K,
rotation, custom dimensions, simulated cutouts/safe areas, and overflow checks.
Open `http://127.0.0.1:5199/` for the app without the tester. Plain `npm run dev`
continues to launch Electron. If port 5199 is occupied, stop the other server or
run `npm run dev -- web --port 5299` to use another port.

The web app supports local MP3 uploads and in-app playback volume; Electron
retains its system volume and native file picker. Custom files stored in browser
storage are subject to the browser's storage limit.

```bash
npm run build:web
node --test scripts/sirens.test.mjs
```

On mobile (up to 760 CSS pixels wide), each tab opens to its soundboard. Keyboard
buttons have 12 items per page; sirens have 6. Previous/Next changes the visible
buttons without stopping sirens. **Settings** contains volume, playback options, and model search. The Sirens
soundboard keeps Real/Fake sounds and Manufacturer dropdowns visible, alongside
a **Play multiple sounds** checkbox (on by default). With it checked, tap several
models to layer them; uncheck it to play one at a time.
**Custom Combos** has its own mobile page in Keyboard. Desktop shows the full
layout and all model buttons together.

**Tab through sounds only** is enabled by default and saved across sessions.
Tab and Shift+Tab wrap through visible sound buttons in the current tab and
mobile page, skipping other controls. Enter or Space activates the focused
button. Turn the setting off for standard browser tab navigation. Find this
checkbox above the desktop content, or on the mobile Settings page.

**Loop sounds** in the top toolbar repeats playing sounds until stopped. It
works with real files and fake sirens, and repeats each sound at its playback
limit (or earlier if the recording ends). Uncheck Loop to finish the current
cycle. Use each siren button to stop that siren, or Stop all to silence the board.
Keyboard and Mouse audio also support looping and their Stop all sounds button.

Use **▴ Hide controls** for a soundboard view without the header, tabs, settings,
or filters. Loop and Stop remain available. **▾ Show controls** restores the full
view without interrupting playback.

The **Siren mode** dropdown offers **Attack** (rising/falling wail), **Alert**
(ten slower full wind-ups), **Fire** (ten faster full wind-ups), and **Test / Growl**
(a short low growl with 0.8 seconds of wind-up and 2.2 seconds of coast-down).
These fake-mode patterns are illustrative rather than standardized emergency
signals or exact reproductions. Loop repeats the selected pattern. Changing
mode stops active sounds so the next model plays the newly selected pattern.

For Real sounds, add mode-specific recordings, for example:

```text
public/sounds/sirens/whelen-wps-2901-attack.mp3
public/sounds/sirens/whelen-wps-2901-alert.mp3
public/sounds/sirens/whelen-wps-2901-fire.mp3
public/sounds/sirens/whelen-wps-2901-test.mp3
```

The filenames displayed on the buttons follow the selected mode. WAV, OGG, and
M4A also work. Attack accepts the original model-only filename as a fallback;
other modes require their own files so they do not play an unrelated recording.
Real recordings play in full so any recorded wind-up and wind-down are preserved.

## Cabinet simulator

Press and hold a siren model for about half a second to open its control cabinet.
A normal tap still plays/stops the sound. Moving your finger to scroll cancels
the hold. On desktop, right-click the model or focus it and press **F2**.

The simulator follows the reference cabinet: a yellow metal enclosure, civil
defense emblem, power/signal lamps, and five colored **Test**, **Alert**, **Fire**,
**Attack**, and **Cancel** buttons. It displays the selected make and model.
Opening it is silent; a mode button starts that siren. Test uses the short growl.
Cancel stops playback; changing mode restarts the model with the new pattern.
Sound source, volume, and Loop controls use the same settings as the soundboard.
Missing real recordings show their expected filename instead of generating audio.

**← Soundboard** or **Escape** closes the cabinet and stops its sounds. The modal
keeps focus inside the simulator; sound-only Tab navigation cycles its four mode
buttons, and focus returns to the model when the cabinet closes. The cabinet
fits narrow screens and scrolls vertically when needed.

## Complete motor cycles

Fake sirens wind up from a low rotor pitch and coast all the way down to silence.
Attack adds 3 seconds of wind-up and 4 seconds of coast-down around the
selected **Powered time** (1–5 seconds). Fire performs ten complete rises to full
speed, each with a 2-second rise, a 2.25-second full-speed hold, and a 1.5-second
dip between rises, followed by a 4-second final coast (**1 minute total**). Alert
performs the same ten rises more slowly: 4 seconds up, a 10.7-second full-speed
hold, 3 seconds between rises, then a 6-second final coast (**3 minutes total**). These sequences ignore the short powered-time selector so
the final rise is never cut off. Test / Growl uses a short 0.8-second rise and 2.2-second coast, without a
powered hold. Loop restarts only after the complete motor cycle finishes.

Clicking a playing siren or using **Cancel / Stop all sirens** removes motor power
and lets simulated rotors coast down from their current pitch. The signal light
stays on while the sound is audible. Volume zero still mutes immediately after
the brief click-prevention ramp. Leaving the tab, closing the simulator, changing
mode/source, or switching playback settings stops audio promptly.

Real sounds play complete recordings; the powered-time selector is disabled in
Real sounds mode. Loop repeats the complete file. Explicitly cancelling a real
recording fades it out briefly; the app cannot generate a physical rotor coast
from an arbitrary recording.

In the cabinet simulator, **Test is a momentary hold-to-run button**. Hold it with
a mouse or finger, or focus it and hold Space/Enter. The fake rotor accelerates
for 3 seconds and stays at full speed indefinitely while held. Release to remove
power and coast down from the current speed; brief holds give low growls. Loop
never restarts a released Test. Pointer cancellation, focus loss, window blur,
and switching away from the page also release the control. Real Test recordings
repeat while held and fade out on release. The regular soundboard Test mode
still plays its short complete growl cycle when tapped.

Holding Test again while a rotor is coasting reapplies power to the **same
rotor**, preserving its current pitch, speed, and volume. It accelerates from
that speed instead of starting from zero. You can repeatedly hold, release,
let it slow, and hold again. Test can also take manual power control of the
currently running simulated signal without constructing another sound or
resetting the model. Real recordings keep their playback position when Test
is pressed again during their release fade. Once a sound has fully finished,
the next hold starts a new rotor or recording normally.
