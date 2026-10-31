"""Generate native-pitch matching metadata. Requires numpy and ffmpeg on PATH.
Usage: python scripts/generate-playback-profiles.py [path-to-ffmpeg]
Only mechanical recordings are analyzed; no audio files are modified.
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
base = Path(__file__).resolve().parent.parent / 'public/sounds/sirens'
manifest = json.loads((base / 'recordings.json').read_text())
# Families with pitched mechanical rotors. Electronic/pneumatic patterns are excluded.
ids = {r['sirenId'] for r in manifest['heldTests']}
ids.update(['federal-signal-sth-10c'])
entries = {r['fileName']: r for section in ['recordings', 'windDowns'] for r in manifest[section] if r['sirenId'] in ids and r['mode'] not in ['chime', 'airhorn']}
profiles = {}
for name, entry in entries.items():
    data = subprocess.check_output([sys.argv[1] if len(sys.argv) > 1 else 'ffmpeg', '-v', 'error', '-i', str(base / name), '-ac', '1', '-ar', '4000', '-f', 'f32le', '-'])
    samples = np.frombuffer(data, dtype='<f4')
    window = 1024
    points = []
    for center in range(0, len(samples), 1000):
        start = max(0, min(center - window // 2, len(samples) - window))
        chunk = samples[start:start + window]
        if len(chunk) < window:
            continue
        spectrum = np.abs(np.fft.rfft(chunk * np.hanning(window)))
        lo, hi = 20, 385 # 78–1500 Hz; discard low-frequency rumble.
        peak = lo + int(np.argmax(spectrum[lo:hi]))
        rms = float(np.sqrt(np.mean(chunk ** 2)))
        # Reject near-silence and diffuse noise rather than matching traffic/wind.
        confident = rms > .001 and spectrum[peak] > 8 * np.median(spectrum[lo:hi])
        hz = round(float(peak * 4000 / window), 2) if confident else 0
        points.append([round(center / 4000, 3), hz])
    profiles[name] = points
out = '{\n' + ',\n'.join('  '+json.dumps(k)+': '+json.dumps(v, separators=(',', ':')) for k,v in profiles.items()) + '\n}\n'
(base / 'playback-profiles.json').write_text(out)
print(f'Generated {len(profiles)} recording profiles; audio unchanged.')
