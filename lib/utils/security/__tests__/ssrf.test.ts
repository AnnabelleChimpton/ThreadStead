/**
 * @jest-environment node
 */
import { assertPublicUrl, isPrivateAddress, safeFetch, UnsafeUrlError } from '../ssrf'

describe('isPrivateAddress', () => {
  test.each([
    '127.0.0.1', '127.1.2.3', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1',
    '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:169.254.169.254', '64:ff9b::a00:1',
    'not-an-ip',
  ])('%s is refused', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true)
  })

  test.each(['93.184.216.34', '172.32.0.1', '1.1.1.1', '2606:4700:4700::1111', '::ffff:93.184.216.34'])(
    '%s is public',
    (ip) => {
      expect(isPrivateAddress(ip)).toBe(false)
    }
  )
})

describe('assertPublicUrl', () => {
  const resolvesTo = (...addresses: string[]) => async () => addresses.map((address) => ({ address }))

  test('public hostnames pass', async () => {
    await expect(assertPublicUrl('https://example.com/a', resolvesTo('93.184.216.34'))).resolves.toBeInstanceOf(URL)
  })

  test.each([
    ['http://localhost:3000/api', resolvesTo('127.0.0.1')],
    ['http://foo.localhost/', resolvesTo('93.184.216.34')],
    ['http://169.254.169.254/latest/meta-data/', resolvesTo()],
    ['http://[::1]/', resolvesTo()],
    ['http://2130706433/', resolvesTo()], // 127.0.0.1 as a decimal integer — URL normalises it
    ['http://rebind.example/', resolvesTo('93.184.216.34', '10.0.0.1')], // ANY private address refuses
    ['file:///etc/passwd', resolvesTo()],
    ['ftp://example.com/', resolvesTo('93.184.216.34')],
    ['http://user:pw@example.com/', resolvesTo('93.184.216.34')],
  ])('%s is refused', async (url, resolve) => {
    await expect(assertPublicUrl(url, resolve)).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  test('an unresolvable host is refused', async () => {
    await expect(
      assertPublicUrl('https://nope.invalid/', async () => {
        throw new Error('ENOTFOUND')
      })
    ).rejects.toThrow(/Could not resolve/)
  })
})

describe('safeFetch', () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
  })
  const resolve = async (host: string) => [{ address: host === 'internal.example' ? '10.0.0.7' : '93.184.216.34' }]

  test('a redirect to a private address is refused before it is fetched', async () => {
    const fetchMock = jest.fn(async () => new Response(null, { status: 302, headers: { location: 'http://internal.example/admin' } }))
    global.fetch = fetchMock as any
    await expect(safeFetch('https://example.com/', {}, { resolve })).rejects.toBeInstanceOf(UnsafeUrlError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((fetchMock.mock.calls[0] as any)[1].redirect).toBe('manual')
  })

  test('public redirects are followed', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: '/new' } }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    global.fetch = fetchMock as any
    const res = await safeFetch('https://example.com/old', {}, { resolve })
    expect(res.status).toBe(200)
    expect(fetchMock.mock.calls[1][0]).toBe('https://example.com/new')
  })

  test('redirect loops stop', async () => {
    global.fetch = jest.fn(async () => new Response(null, { status: 302, headers: { location: '/again' } })) as any
    await expect(safeFetch('https://example.com/', {}, { resolve, maxRedirects: 3 })).rejects.toThrow(/Too many redirects/)
  })
})
