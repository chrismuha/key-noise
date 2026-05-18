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
