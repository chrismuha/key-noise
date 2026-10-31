"""Author native-rate powered loops, excluding recorded shutdowns.
Run after generating playback-profiles.json. No audio is changed.
"""
import json
from pathlib import Path
base = Path(__file__).resolve().parent.parent / 'public/sounds/sirens'
m = json.loads((base / 'recordings.json').read_text())
profiles = json.loads((base / 'playback-profiles.json').read_text())
for r in m['recordings']:
    if r['mode'] in ['chime', 'airhorn']:
        continue
    end = r.get('windDownStartSeconds', r['durationSeconds'])
    points = [(t, hz) for t, hz in profiles.get(r['fileName'], []) if 1 < t < end - .25 and hz > 0]
    start = min(5, end / 4)
    stop = max(start + .5, end - .25)
    if points:
        values = sorted(hz for t, hz in points)
        peak = values[int(.8 * (len(values) - 1))]
        peaks = [(t, hz) for t, hz in points if abs(hz / peak - 1) < .025]
        if len(peaks) >= 2:
            if r['mode'] in ['attack', 'fire', 'pulse']:
                start, stop = peaks[0][0], peaks[-1][0]
            else:
                start = peaks[len(peaks) // 3][0]
                stop = peaks[-1][0]
    if stop - start < .5:
        start, stop = max(0, end - 1), end - .01
    r['sustainLoop'] = {'start': round(start, 3), 'end': round(stop, 3)}
(base / 'recordings.json').write_text(json.dumps(m, ensure_ascii=False, indent=2) + '\n')
print('Authored powered loops; startup plays once and shutdown waits for Stop/Cancel.')
