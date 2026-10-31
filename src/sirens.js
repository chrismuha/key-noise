// Selected current and historical outdoor warning sirens; some real recordings are bundled.
const families = [
  ['Whelen', 'Electronic', ['WPS-2900 series', 'WPS-2901', 'WPS-2902', 'WPS-2903', 'WPS-2904', 'WPS-2905', 'WPS-2906', 'WPS-2907', 'WPS-2908', 'WPS-2909', 'WPS-2910', 'WPS-3016', '2000R', 'WPS-4004', 'WPS-4008', 'Vortex', 'Hornet']],
  ['Federal Signal', 'Mechanical', ['2001-130', '508-128', 'Eclipse8', 'Model 2', 'Model 2T', 'SD-10', 'Model 5', 'Model 7', 'STH-10A', 'STH-10B', 'STH-10C', 'STL-10', 'Thunderbolt 1000', 'Thunderbolt 1000T', 'Thunderbolt 1003']],
  ['Federal Signal', 'Electronic', ['Modulator', 'DSA', 'SiraTone EOWS 612', 'SiraTone EOWS 1212']],
  ['American Signal', 'Mechanical', ['T-128', 'T-135', 'T-180']],
  ['American Signal', 'Electronic', ['i-Force', 'E-Class']],
  ['ACA', 'Mechanical', ['Allertor 125', 'Hurricane 130', 'Penetrator 10', 'Penetrator 50', 'P-15', 'P-50']],
  ['Sentry', 'Mechanical', ['3V8-H', '7V8', '10V', '14V', '16V1T', '20V2T']],
  ['Hörmann', 'Electronic', ['ECN 600', 'ECN 1200', 'ECN 2400', 'ECN 3000']],
  ['Hörmann', 'Pneumatic', ['HLS 273']],
  ['Darley', 'Mechanical', ['3V8', 'Screamer (8-port)']],
  ['Sterling', 'Mechanical', ['M5']],
  ['GCS', 'Mechanical', ['Model 3']]
];
export const sirens = families.flatMap(([manufacturer, type, models]) => models.map((model) => ({
  id: `${manufacturer}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  manufacturer, model, type,
  // Retain A's existing asset IDs and user-installed filenames.
  ...(model === 'STH-10A' ? { id: 'federal-signal-sth-10', unsupportedModes: ['pulse'] } : {}),
  ...(model === 'STH-10B' ? { unsupportedModes: ['pulse'] } : {}),
  ...(model === 'STH-10C' ? {
    sharedRecordingId: 'federal-signal-sth-10', sharedModes: ['alert', 'attack', 'fire'],
    synthesisId: 'federal-signal-sth-10',
    recordingNote: 'Alert, Attack, Fire shared with STH-10A · Pulse capable'
  } : {}),
  ...(model === 'WPS-2900 series' ? { recordingNote: '560 Hz series sample · speaker configuration unspecified' } : {})
})));
export const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
export function soundSources(siren, mode) {
  if (siren.unsupportedModes?.includes(mode)) return [];
  const ids = [siren.id, ...(siren.sharedModes?.includes(mode) ? [siren.sharedRecordingId] : [])];
  const names = ids.flatMap(id => mode ? [`${id}-${mode}`, ...(mode === 'attack' ? [id] : [])] : [id]);
  return names.flatMap(name => audioExtensions.map(extension => ({
    fileName: `${name}.${extension}`,
    url: `./sounds/sirens/${name}.${extension}`
  })));
}
export async function findSound(siren, mode) {
  for (const source of soundSources(siren, mode)) {
    try {
      const response = await fetch(source.url, { method: 'HEAD', cache: 'no-store' });
      // Vite returns index.html for absent files, so status alone is insufficient.
      if (response.ok && !response.headers.get('content-type')?.includes('text/html')) return source;
    } catch { /* Try the next supported format. */ }
  }
  return null;
}

// Shutdown recordings are separate from the playable signal modes.
// Mode-specific tails take precedence (for example, German Warning vs All-clear).
export async function findWindDown(siren, mode) {
  if (siren.unsupportedModes?.includes(mode)) return null;
  const ids = [siren.id, ...(siren.sharedModes?.includes(mode) ? [siren.sharedRecordingId] : [])];
  for (const name of ids.flatMap(id => [`${id}-${mode}-winddown`, `${id}-winddown`])) {
    for (const extension of audioExtensions) {
      const source = { fileName: `${name}.${extension}`, url: `./sounds/sirens/${name}.${extension}` };
      try {
        const response = await fetch(source.url, { method: 'HEAD', cache: 'no-store' });
        if (response.ok && !response.headers.get('content-type')?.includes('text/html')) return source;
      } catch { /* Keep looking for a recorded tail. */ }
    }
  }
  return null;
}

let recordingDetails;
export async function getRecordingCatalog() {
  if (!recordingDetails) {
    recordingDetails = fetch('./sounds/sirens/recordings.json')
      .then(response => { if (!response.ok) throw new Error('Missing recording metadata'); return response.json(); })
      .catch(() => { recordingDetails = null; return null; });
  }
  return await recordingDetails;
}
export async function getRecordingDetails(fileName) {
  const manifest = await getRecordingCatalog();
  return manifest?.recordings?.find(recording => recording.fileName === fileName) || null;
}
