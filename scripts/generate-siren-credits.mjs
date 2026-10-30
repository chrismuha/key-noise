import { readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../public/sounds/sirens/', import.meta.url);
const { recordings, windDowns = [] } = JSON.parse(await readFile(new URL('recordings.json', directory), 'utf8'));
const models = new Set(recordings.map(recording => recording.sirenId)).size;
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const rows = [...recordings, ...windDowns].map(recording => `<tr>
<td>${escape(recording.model)}</td><td>${escape(recording.mode)}</td>
<td>${escape(recording.author)}</td>
<td><a href="${escape(recording.licenseUrl)}">${escape(recording.license)}</a></td>
<td><a href="${escape(recording.sourceUrl)}">${escape(recording.title || 'Recording source')}</a>
<p>${escape(recording.notes)}</p><small>${escape(recording.originalFile)}</small></td>
</tr>`).join('\n');

await writeFile(new URL('CREDITS.html', directory), `<!doctype html>
<html lang="en">
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Key Noise — Real siren recordings</title>
<style>
body{font:16px/1.6 system-ui,sans-serif;max-width:1100px;margin:0 auto;padding:24px;background:#121521;color:#edf1ff}
a{color:#9fc8ff}h1{line-height:1.2}table{border-collapse:collapse;width:100%}
td,th{text-align:left;vertical-align:top;border-bottom:1px solid #485069;padding:12px}
p{margin:.4em 0}small{overflow-wrap:anywhere}.scroll{overflow-x:auto}th{white-space:nowrap}
</style>
<main><a href="../../index.html">Back to Key Noise</a>
<h1>Real siren recording credits</h1>
<p>${recordings.length} signal recordings and ${windDowns.length} recorded shutdown tails for ${models} catalog entries. Choose Real sounds and the matching mode.
These are field recordings with their own durations, background noise, and recorded wind-downs.
Release and Cancel normally process a short sample of the current recording with gradual playback-rate and gain changes. Re-powering accelerates the same sample before returning to the paused file. Recorded shutdown companions are a fallback if sampling cannot decode the source. This processed playback is illustrative, not an unedited hardware recording of every possible release point.</p>
<p>Railroader3921 and Blixt1000 — Redi Wolf publicly dedicated their linked recordings to the public domain.
Freesound recordings below use CC0 1.0, CC BY 3.0, or CC BY 4.0, as specified for each file.
Required attribution includes the named recorder, recording source, license link, and processing notes.
Credits apply to the audio files; no endorsement by the recorders or manufacturers is implied.</p>
<p>The WPS-2900 series sample has an unspecified speaker configuration.
Some recordings include other sirens, wind, or clipping; details appear below.
Hörmann HLS 273 uses the recorded German Warning / All-clear patterns in Attack / Alert modes.
Unavailable model/mode combinations continue to show the add-files message.</p>
<div class="scroll"><table><thead><tr><th>Model</th><th>Mode</th><th>Recorder</th><th>Rights</th><th>Recording details</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<p><a href="https://www.dropbox.com/s/fwankb1ubvnlw7p/sirens.zip?dl=1">Original public-domain Dropbox collection</a> · <a href="dropbox-inventory.json">Audit of all 79 source files</a></p>
<p><a href="recordings.json">File manifest, hashes, durations, and download sources</a></p>
</main></html>
`);
console.log(`Generated credits for ${recordings.length} recordings across ${models} catalog entries.`);
