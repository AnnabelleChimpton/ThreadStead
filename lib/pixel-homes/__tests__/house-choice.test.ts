import {
  HOUSE_TEMPLATES, HOUSE_PALETTES, PAGE_THEME_FOR_PALETTE,
  parseHouseChoice, houseChoiceQuery, saveHouseChoice, readHouseChoice, clearHouseChoice,
} from '../house-choice';
import { DEFAULT_PROFILE_TEMPLATE_INFO } from '@/lib/templates/default-profile-templates';
import { PALETTE_COLORS } from '@/components/pixel-homes/HouseSVG';

describe('house choice', () => {
  it('offers only palettes the house renderer knows', () => {
    // The old demo cycled through palettes that don't exist and crashed
    for (const p of HOUSE_PALETTES) expect(PALETTE_COLORS[p.id]).toBeDefined();
  });

  it('gives every palette a real profile page theme', () => {
    for (const p of HOUSE_PALETTES) {
      expect(DEFAULT_PROFILE_TEMPLATE_INFO[PAGE_THEME_FOR_PALETTE[p.id]]).toBeDefined();
    }
  });

  it('parses a valid choice from query params', () => {
    expect(parseHouseChoice('cabin_v1', 'crt_glow')).toEqual({ template: 'cabin_v1', palette: 'crt_glow' });
  });

  it.each([
    ['castle_v1', 'thread_sage'],
    ['cabin_v1', 'thread_sunset'],
    [['cabin_v1'], 'crt_glow'],
    [undefined, undefined],
  ])('rejects %p / %p', (house, palette) => {
    expect(parseHouseChoice(house, palette)).toBeNull();
  });

  it('round-trips through the signup link', () => {
    const choice = { template: HOUSE_TEMPLATES[2].id, palette: HOUSE_PALETTES[3].id };
    const params = new URLSearchParams(houseChoiceQuery(choice));
    expect(parseHouseChoice(params.get('house'), params.get('palette'))).toEqual(choice);
  });

  it('remembers the choice for the rest of the browser session', () => {
    saveHouseChoice({ template: 'loft_v1', palette: 'pixel_petals' });
    expect(readHouseChoice()).toEqual({ template: 'loft_v1', palette: 'pixel_petals' });
    clearHouseChoice();
    expect(readHouseChoice()).toBeNull();
  });

  it('ignores a tampered stored choice', () => {
    sessionStorage.setItem('ts-house-choice', JSON.stringify({ template: 'castle_v1', palette: 'crt_glow' }));
    expect(readHouseChoice()).toBeNull();
    sessionStorage.setItem('ts-house-choice', '{not json');
    expect(readHouseChoice()).toBeNull();
  });
});
