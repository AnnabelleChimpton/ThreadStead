/**
 * The 12 recovery words are shown once for the resident to keep; this
 * browser keeps only that they exist (signup audit #13). An older version
 * kept them in plain text in localStorage next to the key: reading the
 * marker forgets them.
 */
// jsdom's Uint8Array isn't Node's, which noble checks for: a stand-in key that
// still differs per secret is enough to tell two accounts' words apart
jest.mock('@noble/ed25519', () => ({ getPublicKeyAsync: async (secret: Uint8Array) => Uint8Array.from(secret).reverse() }))

import { recoveryPhraseSet, markRecoveryPhraseSet, SEED_STORAGE, ENCRYPTED_SEED_STORAGE, KEY_STORAGE } from '../local-identity'
import { addPasswordToAccount, createKeypairFromSeedPhrase } from '../did-client'

const WORDS = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const OTHER_WORDS = 'legal winner thank year wave sausage worth useful legal winner thank yellow'

beforeEach(() => {
  localStorage.clear()
  ;(globalThis as { fetch?: unknown }).fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }))
})

describe('the marker', () => {
  test('an older plain copy of the words is forgotten, its date kept', () => {
    localStorage.setItem(SEED_STORAGE, JSON.stringify({ mnemonic: WORDS, created: 1234 }))
    expect(recoveryPhraseSet()).toEqual({ created: 1234 })
    expect(localStorage.getItem(SEED_STORAGE)).toBe(JSON.stringify({ created: 1234 }))
    expect(JSON.stringify({ ...localStorage })).not.toContain('abandon')
  })

  test('setting it never writes words', () => {
    markRecoveryPhraseSet(99)
    expect(recoveryPhraseSet()).toEqual({ created: 99 })
  })

  test('a password account has recovery: its words are kept encrypted', () => {
    localStorage.setItem(ENCRYPTED_SEED_STORAGE, 'encrypted-blob')
    expect(recoveryPhraseSet()).toEqual({ created: 0 })
  })

  test('none: no recovery', () => {
    expect(recoveryPhraseSet()).toBeNull()
  })
})

describe('adding a password asks for the words', () => {
  beforeEach(async () => {
    localStorage.setItem(KEY_STORAGE, JSON.stringify(await createKeypairFromSeedPhrase(WORDS)))
  })

  test("words that aren't recovery words are refused before anything is sent", async () => {
    await expect(addPasswordToAccount('Correct-horse-9', 'not twelve words')).rejects.toThrow("Those aren't 12 recovery words")
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  test("another account's words are refused before anything is sent", async () => {
    await expect(addPasswordToAccount('Correct-horse-9', OTHER_WORDS)).rejects.toThrow('for a different account')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  test("this account's words go to the server, tidied, and the browser keeps them only encrypted", async () => {
    await addPasswordToAccount('Correct-horse-9', `  ${WORDS.toUpperCase().replace(/ /g, '   ')}\n`)
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('/api/auth/add-password')
    expect(JSON.parse(init.body).seedPhrase).toBe(WORDS)
    expect(localStorage.getItem(ENCRYPTED_SEED_STORAGE)).toBeTruthy()
    expect(JSON.stringify({ ...localStorage })).not.toContain('abandon')
  })
})
