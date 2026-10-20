/**
 * <Embed src="…">: which links play, and the player address each becomes.
 * The address is rebuilt from checked parts, so everything else (other
 * hosts, lookalikes, other schemes, user:pass@ tricks) must come back null.
 */
import fs from 'fs'
import path from 'path'
import { embedFor, whyNoEmbed, parseEmbedCode, EMBED_HOSTS } from '@/lib/templates/embeds'

const YT = 'dQw4w9WgXcQ'
const YT_PLAYER = `https://www.youtube-nocookie.com/embed/${YT}`
const SPOTIFY_ID = '4cOdK2wGLETKBW3PvgPWqT'

function player(src: string) {
  const result = embedFor(src)
  if (!result) throw new Error(`expected a player for ${src}`)
  return result
}

describe('YouTube, always through youtube-nocookie.com', () => {
  test.each([
    `https://www.youtube.com/watch?v=${YT}`,
    `https://youtube.com/watch?v=${YT}&feature=share`,
    `https://m.youtube.com/watch?v=${YT}`,
    `https://www.youtube.com/watch?feature=youtu.be&v=${YT}`,
    `https://youtu.be/${YT}`,
    `https://youtu.be/${YT}?si=abcdef`,
    `https://www.youtube.com/shorts/${YT}`,
    `https://www.youtube.com/live/${YT}`,
    `https://www.youtube.com/embed/${YT}`,
    `https://www.youtube-nocookie.com/embed/${YT}`,
    `  https://youtu.be/${YT}  `,
  ])('%s', (src) => {
    const p = player(src)
    expect(p).toMatchObject({ host: 'youtube', label: 'YouTube', playerUrl: YT_PLAYER, height: null })
    expect(p.playUrl).toBe(`${YT_PLAYER}?autoplay=1`)
  })

  test('keeps a start time', () => {
    expect(player(`https://youtu.be/${YT}?t=90`).playerUrl).toBe(`${YT_PLAYER}?start=90`)
    expect(player(`https://www.youtube.com/watch?v=${YT}&t=1m30s`).playerUrl).toBe(`${YT_PLAYER}?start=90`)
    expect(player(`https://www.youtube.com/embed/${YT}?start=42`).playerUrl).toBe(`${YT_PLAYER}?start=42`)
    expect(player(`https://youtu.be/${YT}?t=soon`).playerUrl).toBe(YT_PLAYER)
  })

  test('plays a playlist', () => {
    const list = 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI'
    const expected = `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`
    expect(player(`https://www.youtube.com/playlist?list=${list}`).playerUrl).toBe(expected)
    expect(player(expected).playerUrl).toBe(expected)
  })

  test('drops everything it does not need from the link', () => {
    const p = player(`https://www.youtube.com/watch?v=${YT}&list=x&index=3&pp=abc&autoplay=1&origin=https://evil.example`)
    expect(p.playerUrl).toBe(YT_PLAYER)
  })

  test.each([
    'https://www.youtube.com/watch?v=short',
    `https://www.youtube.com/watch?v=${YT}x`,
    `https://www.youtube.com/watch?v=${YT.slice(0, 10)}%22`,
    'https://www.youtube.com/watch',
    'https://www.youtube.com/@somechannel',
    `https://www.youtube.com/channel/${YT}`,
    `https://youtu.be/${YT}/extra`,
    `https://www.youtube-nocookie.com/watch?v=${YT}`,
    'https://www.youtube.com/playlist?list=bad%20list',
  ])('not a video: %s', (src) => {
    expect(embedFor(src)).toBeNull()
  })
})

describe('Vimeo', () => {
  const expected = 'https://player.vimeo.com/video/76979871?dnt=1'
  test.each([
    'https://vimeo.com/76979871',
    'https://www.vimeo.com/76979871',
    'https://vimeo.com/channels/staffpicks/76979871',
    'https://vimeo.com/groups/shortfilms/videos/76979871',
    'https://player.vimeo.com/video/76979871',
    'https://player.vimeo.com/video/76979871?autoplay=1&title=0',
  ])('%s', (src) => {
    const p = player(src)
    expect(p).toMatchObject({ host: 'vimeo', label: 'Vimeo', playerUrl: expected, height: null })
    expect(p.playUrl).toBe(`${expected}&autoplay=1`)
  })

  test('keeps the private hash of an unlisted video', () => {
    expect(player('https://vimeo.com/76979871/abc123def4').playerUrl).toBe(
      'https://player.vimeo.com/video/76979871?h=abc123def4&dnt=1'
    )
    expect(player('https://player.vimeo.com/video/76979871?h=abc123def4').playerUrl).toBe(
      'https://player.vimeo.com/video/76979871?h=abc123def4&dnt=1'
    )
  })

  test.each([
    'https://vimeo.com/channels/staffpicks',
    'https://vimeo.com/someone',
    'https://vimeo.com/76979871/not-a-hash!',
    'https://player.vimeo.com/76979871',
    'https://player.vimeo.com/video/76979871?h=%22onload',
  ])('not a video: %s', (src) => {
    expect(embedFor(src)).toBeNull()
  })
})

describe('Spotify', () => {
  test.each([
    ['track', 152],
    ['album', 352],
    ['playlist', 352],
    ['episode', 232],
    ['show', 352],
  ])('%s', (type, height) => {
    const expected = `https://open.spotify.com/embed/${type}/${SPOTIFY_ID}`
    for (const src of [
      `https://open.spotify.com/${type}/${SPOTIFY_ID}`,
      `https://open.spotify.com/${type}/${SPOTIFY_ID}?si=0123456789abcdef`,
      `https://open.spotify.com/intl-de/${type}/${SPOTIFY_ID}`,
      `https://open.spotify.com/embed/${type}/${SPOTIFY_ID}?utm_source=generator&theme=0`,
    ]) {
      expect(player(src)).toEqual({ host: 'spotify', label: 'Spotify', playerUrl: expected, playUrl: expected, height })
    }
  })

  test.each([
    `https://open.spotify.com/artist/${SPOTIFY_ID}`,
    `https://open.spotify.com/track/${SPOTIFY_ID}x`,
    'https://open.spotify.com/track/short',
    `https://open.spotify.com/user/someone/playlist/${SPOTIFY_ID}`,
    `https://spotify.com/track/${SPOTIFY_ID}`,
    `https://play.spotify.com/track/${SPOTIFY_ID}`,
    `spotify:track:${SPOTIFY_ID}`,
  ])('not playable: %s', (src) => {
    expect(embedFor(src)).toBeNull()
  })
})

describe('SoundCloud', () => {
  const widget = (page: string) => `https://w.soundcloud.com/player/?url=${encodeURIComponent(page)}`

  test('a track page', () => {
    const p = player('https://soundcloud.com/some-artist/a-song')
    expect(p).toEqual({
      host: 'soundcloud',
      label: 'SoundCloud',
      playerUrl: widget('https://soundcloud.com/some-artist/a-song'),
      playUrl: `${widget('https://soundcloud.com/some-artist/a-song')}&auto_play=true`,
      height: 166,
    })
    expect(player('https://www.soundcloud.com/some-artist/a-song?in=x/sets/y').playerUrl).toBe(p.playerUrl)
    expect(player('https://m.soundcloud.com/some-artist/a-song').playerUrl).toBe(p.playerUrl)
  })

  test('a set, an artist and a private link', () => {
    expect(player('https://soundcloud.com/some-artist/sets/summer')).toMatchObject({
      playerUrl: widget('https://soundcloud.com/some-artist/sets/summer'),
      height: 450,
    })
    expect(player('https://soundcloud.com/some-artist')).toMatchObject({ height: 450 })
    expect(player('https://soundcloud.com/some-artist/a-song/s-AbCdE123').playerUrl).toBe(
      widget('https://soundcloud.com/some-artist/a-song/s-AbCdE123')
    )
  })

  test("SoundCloud's own player link and embed code", () => {
    const own =
      'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1234567890&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&visual=true'
    const p = player(own)
    expect(p.playerUrl).toBe(
      `https://w.soundcloud.com/player/?url=${encodeURIComponent('https://api.soundcloud.com/tracks/1234567890')}&color=%23ff5500&visual=true`
    )
    expect(p.height).toBe(300)
    const code = `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="${own.replace(/&/g, '&amp;')}"></iframe>`
    expect(player(code)).toMatchObject({ playerUrl: p.playerUrl, height: 166 })
    expect(player(widget('https://soundcloud.com/some-artist/a-song')).playerUrl).toBe(
      widget('https://soundcloud.com/some-artist/a-song')
    )
  })

  test.each([
    'https://soundcloud.com/',
    'https://soundcloud.com/discover',
    'https://soundcloud.com/search?q=x',
    'https://soundcloud.com/a/b/c/d/e',
    'https://soundcloud.com/some%20artist/song',
    'https://on.soundcloud.com/AbCdE',
    'https://w.soundcloud.com/player/?url=https%3A%2F%2Fevil.example%2Ftrack',
    'https://w.soundcloud.com/player/?url=javascript%3Aalert(1)',
    'https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F12%2F..%2F..%2Fx',
    'https://w.soundcloud.com/other/?url=https%3A%2F%2Fsoundcloud.com%2Fa%2Fb',
  ])('not playable: %s', (src) => {
    expect(embedFor(src)).toBeNull()
  })
})

describe('Bandcamp: its embed link or embed code, never a page link', () => {
  const big = 'https://bandcamp.com/EmbeddedPlayer/album=1234567890/size=large/bgcol=ffffff/linkcol=0687f5/tracklist=false/transparent=true/'

  test('the player link from the embed code', () => {
    expect(player(big)).toEqual({
      host: 'bandcamp',
      label: 'Bandcamp',
      playerUrl: big,
      playUrl: big,
      height: 470,
      maxWidth: 350,
    })
  })

  test('the whole embed code pasted into src', () => {
    const code = `<iframe style="border: 0; width: 100%; height: 120px;" src="https://bandcamp.com/EmbeddedPlayer/album=1234567890/size=large/bgcol=ffffff/linkcol=0687f5/tracklist=false/artwork=small/transparent=true/" seamless><a href="https://someone.bandcamp.com/album/name">Name by Someone</a></iframe>`
    expect(player(code)).toMatchObject({
      host: 'bandcamp',
      playerUrl: 'https://bandcamp.com/EmbeddedPlayer/album=1234567890/size=large/bgcol=ffffff/linkcol=0687f5/tracklist=false/artwork=small/transparent=true/',
      height: 120,
    })
    expect(parseEmbedCode(code)).toEqual({
      src: 'https://bandcamp.com/EmbeddedPlayer/album=1234567890/size=large/bgcol=ffffff/linkcol=0687f5/tracklist=false/artwork=small/transparent=true/',
      height: 120,
    })
  })

  test('heights for its layouts', () => {
    expect(player('https://bandcamp.com/EmbeddedPlayer/track=42/size=small/').height).toBe(42)
    expect(player('https://bandcamp.com/EmbeddedPlayer/album=42/size=large/artwork=small/tracklist=false/').height).toBe(120)
    expect(player('https://bandcamp.com/EmbeddedPlayer/album=42/size=large/minimal=true/')).toMatchObject({ height: 350, maxWidth: 350 })
    expect(player('https://bandcamp.com/EmbeddedPlayer/album=42/size=large/')).toMatchObject({ height: 600, maxWidth: 350 })
  })

  test('keeps only the settings it knows, in a fixed order', () => {
    expect(
      player('https://bandcamp.com/EmbeddedPlayer/v=2/transparent=true/album=42/esig=x/bgcol=zzzzzz/size=large/').playerUrl
    ).toBe('https://bandcamp.com/EmbeddedPlayer/album=42/size=large/transparent=true/')
  })

  test.each([
    'https://someone.bandcamp.com/album/name',
    'https://bandcamp.com/someone',
    'https://bandcamp.com/EmbeddedPlayer/size=large/',
    'https://bandcamp.com/EmbeddedPlayer/album=12ab/size=large/',
    'https://evil.example/EmbeddedPlayer/album=42/',
    '<iframe src="https://evil.example/EmbeddedPlayer/album=42/"></iframe>',
    '<iframe style="height: 120px"></iframe>',
    '<div src="https://bandcamp.com/EmbeddedPlayer/album=42/"></div>',
  ])('not playable: %s', (src) => {
    expect(embedFor(src)).toBeNull()
  })

  test('the owner hears why a page link does not work', () => {
    expect(whyNoEmbed('https://someone.bandcamp.com/album/name')).toMatch(/embed code/)
  })
})

describe('never anything else', () => {
  test.each([
    // other hosts and lookalikes
    'https://evil.example/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'https://evilyoutube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com.evil.example/embed/dQw4w9WgXcQ',
    'https://youtube.co/watch?v=dQw4w9WgXcQ',
    'https://youtu.be.evil.example/dQw4w9WgXcQ',
    'https://vimeo.com.evil.example/76979871',
    'https://notvimeo.com/76979871',
    'https://open.spotify.com.evil.example/track/4cOdK2wGLETKBW3PvgPWqT',
    'https://soundcloud.com.evil.example/a/b',
    'https://evilbandcamp.com/EmbeddedPlayer/album=42/',
    'https://bandcamp.com.evil.example/EmbeddedPlayer/album=42/',
    'https://www.youtube.com./watch?v=dQw4w9WgXcQ',
    // userinfo tricks
    'https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com:pass@evil.example/embed/dQw4w9WgXcQ',
    'https://user@www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://evil.example@youtu.be/dQw4w9WgXcQ',
    'https://evil.example\\@youtu.be/dQw4w9WgXcQ',
    // ports
    'https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ',
    // other schemes and no scheme
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'http://youtu.be/dQw4w9WgXcQ',
    'javascript:alert(1)//https://youtu.be/dQw4w9WgXcQ',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'vbscript:msgbox(1)',
    'ftp://youtube.com/watch?v=dQw4w9WgXcQ',
    '//www.youtube.com/watch?v=dQw4w9WgXcQ',
    '//youtu.be/dQw4w9WgXcQ',
    'www.youtube.com/watch?v=dQw4w9WgXcQ',
    'youtu.be/dQw4w9WgXcQ',
    '/watch?v=dQw4w9WgXcQ',
    'https:/youtu.be/dQw4w9WgXcQ',
    'https:\\\\youtu.be\\dQw4w9WgXcQ',
    // whitespace and control characters inside
    'https://you\ttu.be/dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ\n<script>',
    // embed code that points somewhere else
    '<iframe src="javascript:alert(1)"></iframe>',
    '<iframe src="//www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    // nothing
    '',
    '   ',
  ])('%s', (src) => {
    expect(embedFor(src)).toBeNull()
  })

  test('not a string', () => {
    expect(embedFor(undefined)).toBeNull()
    expect(embedFor(null)).toBeNull()
    expect(embedFor(42)).toBeNull()
    expect(embedFor({ toString: () => `https://youtu.be/${YT}` })).toBeNull()
  })

  test('every player address is on its host’s player origin, and plays back to itself', () => {
    const samples = [
      `https://youtu.be/${YT}?t=5`,
      'https://www.youtube.com/playlist?list=PLabcdef',
      'https://vimeo.com/76979871/abc123def4',
      `https://open.spotify.com/album/${SPOTIFY_ID}`,
      'https://soundcloud.com/some-artist/sets/summer',
      'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1&visual=true',
      'https://bandcamp.com/EmbeddedPlayer/album=42/size=small/',
    ]
    for (const src of samples) {
      const p = player(src)
      const origin = EMBED_HOSTS[p.host].origin
      expect(new URL(p.playerUrl).origin).toBe(origin)
      expect(new URL(p.playUrl).origin).toBe(origin)
      // Feeding the player address back in gives the same player
      expect(player(p.playerUrl)).toEqual(p)
    }
  })
})

describe('the note for the owner', () => {
  test('says what is missing or wrong, and nothing for a good link', () => {
    expect(whyNoEmbed(undefined)).toMatch(/needs a link/)
    expect(whyNoEmbed('')).toMatch(/needs a link/)
    expect(whyNoEmbed('https://evil.example/')).toBe(
      "Embed can't play that link. It takes links from YouTube, Vimeo, Bandcamp, SoundCloud and Spotify."
    )
    expect(whyNoEmbed(`https://youtu.be/${YT}`)).toBeUndefined()
  })
})

describe('the Content-Security-Policy', () => {
  test("frame-src lets in exactly the players' origins", () => {
    const config = fs.readFileSync(path.resolve(__dirname, '../../../next.config.ts'), 'utf8')
    const directive = config.match(/"frame-src ([^"]*)"/)
    expect(directive).not.toBeNull()
    const sources = directive![1].trim().split(/\s+/).sort()
    expect(sources).toEqual(["'self'", ...Object.values(EMBED_HOSTS).map((h) => h.origin)].sort())
  })
})
