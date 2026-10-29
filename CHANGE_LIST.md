# key-noise Change List

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
