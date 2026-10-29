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
all sirens. Volume and a 1–5 second playback limit are available.

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
