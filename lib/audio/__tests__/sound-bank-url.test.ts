import { soundBankUrlFor } from '../sound-bank-url';

test('a member’s song has its bank on the same route', () => {
  expect(soundBankUrlFor('/api/media/serve/cm123')).toBe('/api/media/serve/cm123?bank=1');
});

test('the signup music has its bank beside the file', () => {
  expect(soundBankUrlFor('/uploads/admin/welcome.mid')).toBe('/uploads/admin/welcome.mid.sf2');
  expect(soundBankUrlFor('/uploads/admin/Welcome.MIDI')).toBe('/uploads/admin/Welcome.MIDI.sf2');
});

test('anything else has none', () => {
  expect(soundBankUrlFor('/song.mid')).toBeNull();
  expect(soundBankUrlFor('https://example.com/api/media/serve/cm123')).toBeNull();
  expect(soundBankUrlFor('/api/media/serve/cm123?x=1')).toBeNull();
  expect(soundBankUrlFor('/uploads/admin/../secret.mid')).toBeNull();
});
