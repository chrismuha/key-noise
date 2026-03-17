# DOCX Filler

Electron + Vue app that opens an existing `.docx` or `.dotx`, detects section headings ending with `:`, shows text boxes for each section, inserts the typed text under those headings, and saves a new `.docx`.

## Install

```bash
npm install
npm run dev
```

## How to use

1. Launch the app.
2. Click **Open Template**.
3. Select your `.docx` or `.dotx`.
4. The app detects headings ending in `:`.
5. Type content into the generated boxes.
6. Click **Generate DOCX** and choose where to save.

## Notes

- This works best with templates like:
  - `THINGS WE DID NOT TALK ABOUT LAST TIME THAT WE NEED TO:`
  - `NEW THINGS WE NEED TO TALK ABOUT:`
  - `GENERAL UPDATES ON MY SYMPTOMS`
- Inserted text is plain paragraphs.
- It does not yet preserve rich formatting for inserted text.
