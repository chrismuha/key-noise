// Selected current and historical outdoor warning sirens. Audio files are supplied separately.
const families = [
  ['Whelen', 'Electronic', ['WPS-2901', 'WPS-2902', 'WPS-2903', 'WPS-2904', 'WPS-2905', 'WPS-2906', 'WPS-2907', 'WPS-2908', 'WPS-2909', 'WPS-2910', 'WPS-4004', 'WPS-4008', 'Vortex', 'Hornet']],
  ['Federal Signal', 'Mechanical', ['2001-130', '508-128', 'Eclipse8', 'Model 2', 'Model 5', 'Model 7', 'STH-10', 'STL-10', 'Thunderbolt 1000', 'Thunderbolt 1000T', 'Thunderbolt 1003']],
  ['Federal Signal', 'Electronic', ['Modulator', 'DSA', 'SiraTone EOWS 612', 'SiraTone EOWS 1212']],
  ['American Signal', 'Mechanical', ['T-128', 'T-135', 'T-180']],
  ['American Signal', 'Electronic', ['i-Force', 'E-Class']],
  ['ACA', 'Mechanical', ['Allertor 125', 'Hurricane 130', 'Penetrator 10', 'Penetrator 50', 'P-15', 'P-50']],
  ['Sentry', 'Mechanical', ['3V8-H', '7V8', '10V', '14V', '16V1T', '20V2T']],
  ['Hörmann', 'Electronic', ['ECN 600', 'ECN 1200', 'ECN 2400', 'ECN 3000']],
  ['Hörmann', 'Pneumatic', ['HLS 273']]
];
export const sirens = families.flatMap(([manufacturer, type, models]) => models.map((model) => ({
  id: `${manufacturer}-${model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  manufacturer, model, type
})));
export const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
export function soundSources(siren, mode) {
  const names = mode ? [`${siren.id}-${mode}`, ...(mode === 'attack' ? [siren.id] : [])] : [siren.id];
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
