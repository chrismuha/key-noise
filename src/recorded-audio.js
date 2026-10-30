// Decode original audio for native-rate held Test playback.
export async function loadRecordedBuffer(context, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not load the recording');
  return context.decodeAudioData(await response.arrayBuffer());
}
