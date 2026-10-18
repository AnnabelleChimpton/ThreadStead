import {
  generateThreadRingSlug,
  validateAll,
  validatePostTitle,
  validateThreadRingName,
  validateUsername,
} from '..';

const code = (r: ReturnType<typeof validateUsername>) => (r.ok ? 'ok' : r.code);

describe('validateUsername', () => {
  it.each([
    ['alice', 'ok'],
    ['a_b-c9', 'ok'],
    ['', 'empty'],
    ['ab', 'too_short'],
    ['a'.repeat(33), 'too_long'],
    ['Alice', 'bad_charset'], // lowercase only
    ['9lives', 'bad_charset'], // must start with a letter
    ['al ice', 'bad_charset'],
    ['a--b', 'double_punct'],
    ['a__b', 'double_punct'],
    ['ab_', 'trailing_punct'],
    ['admin', 'reserved'],
  ])('%s → %s', (input, expected) => {
    expect(code(validateUsername(input))).toBe(expected);
  });

  it('folds look-alikes and separators before the reserved check', () => {
    for (const name of ['adm1n', 'off_icial', 'sup-port', 'm0d']) {
      expect(validateUsername(name)).toMatchObject({ ok: false, code: 'reserved' });
    }
    expect(validateUsername('adm1n')).toMatchObject({ matched: 'admin' });
  });

  it('trims surrounding whitespace into `normalized`', () => {
    expect(validateUsername('  alice  ')).toEqual({ ok: true, normalized: 'alice' });
  });
});

describe('validatePostTitle', () => {
  it('collapses whitespace and allows punctuation', () => {
    expect(validatePostTitle('  Hello,\n\n  world!!  ')).toEqual({ ok: true, normalized: 'Hello, world!!' });
    expect(validatePostTitle('so -- what_')).toMatchObject({ ok: true });
  });

  it('enforces 1–200 characters', () => {
    expect(validatePostTitle('')).toMatchObject({ code: 'empty' });
    expect(validatePostTitle('   ')).toMatchObject({ code: 'too_short' });
    expect(validatePostTitle('x'.repeat(200))).toMatchObject({ ok: true });
    expect(validatePostTitle('x'.repeat(201))).toMatchObject({ code: 'too_long' });
  });

  it('rejects slurs, including simple substitutions', () => {
    expect(validatePostTitle('you f4ggot')).toMatchObject({ code: 'obscene' });
  });

  it('leaves words that merely look close alone', () => {
    for (const title of ['Country roads', 'Therapist notes', 'Mount Fuji', 'Turnip soup', 'Pineapple']) {
      expect(validatePostTitle(title)).toMatchObject({ ok: true });
    }
  });

  it.each(['Grape jam recipe', 'Fuchsia flowers', 'Trip to Fukuoka', 'Scraped knees', 'Draper family',
    'Skyscraper photos', 'Therapeutic walks', 'Scunthorpe United', 'Fire retardant', 'Niggles and snags'])(
    'accepts the ordinary title %p',
    (title) => {
      expect(validatePostTitle(title)).toMatchObject({ ok: true });
    }
  );

  it('still refuses a slur sitting next to an excused word', () => {
    for (const title of ['grapefuck', 'Fuchsia c*nt'.replace('*', 'u'), 'scrape r3tard']) {
      expect(validatePostTitle(title)).toMatchObject({ code: 'obscene' });
    }
  });

  it('does not excuse look-alike spellings of the excused words', () => {
    expect(validatePostTitle('gr4pe')).toMatchObject({ code: 'obscene' });
  });
});

describe('validateThreadRingName', () => {
  it('accepts 2–50 characters and rejects reserved names', () => {
    expect(validateThreadRingName('Pixel Pals')).toEqual({ ok: true, normalized: 'Pixel Pals' });
    expect(validateThreadRingName('a')).toMatchObject({ code: 'too_short' });
    expect(validateThreadRingName('x'.repeat(51))).toMatchObject({ code: 'too_long' });
    expect(validateThreadRingName('Feed')).toMatchObject({ code: 'reserved' });
  });

  it('requires a letter or number so the slug is not empty', () => {
    expect(validateThreadRingName('!!!')).toMatchObject({ ok: false, code: 'invalid_format' });
  });

  it('rejects a name whose slug is a reserved hyphenated name', () => {
    for (const name of ['The Spool', 'the_spool', 'THE-SPOOL', 'Th3 Spool']) {
      expect(validateThreadRingName(name)).toMatchObject({ ok: false, code: 'reserved', matched: 'the-spool' });
    }
    expect(validateThreadRingName('The Spoolers')).toMatchObject({ ok: true });
  });
});

describe('generateThreadRingSlug', () => {
  it.each([
    ['Pixel Pals', 'pixel-pals'],
    ['  Lots   of   Space  ', 'lots-of-space'],
    ['--Edge--Case--', 'edge-case'],
    ['Rock & Roll!', 'rock-roll'],
    ['ring2025', 'ring2025'],
  ])('%p → %p', (name, slug) => {
    expect(generateThreadRingSlug(name)).toBe(slug);
  });
});

describe('validateAll', () => {
  it('validates only the fields given', () => {
    const results = validateAll({ username: 'alice', postTitle: '' });
    expect(Object.keys(results).sort()).toEqual(['postTitle', 'username']);
    expect(results.username.ok).toBe(true);
    expect(results.postTitle.ok).toBe(false);
  });
});
