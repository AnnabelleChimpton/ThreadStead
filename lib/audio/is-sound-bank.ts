/** Whether these bytes are a SoundFont 2 file ("RIFF" … "sfbk") */
export function isSoundBank(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const text = (from: number) => String.fromCharCode(...bytes.subarray(from, from + 4));
  return text(0) === 'RIFF' && text(8) === 'sfbk';
}
