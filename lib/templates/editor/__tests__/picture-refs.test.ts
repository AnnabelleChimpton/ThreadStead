import { byFileName, isPicture, isRelative, pictureName, picturesIn, picturesOnOwnSites, rewritePictures } from '../picture-refs'

const PAGE = `<style>body { background: url("img/stars.gif"); }</style>
<img src="cat.gif" alt="Cat"> <img src='./images/CAT.GIF'>
<a href="big/dog.png"><img src="dog_small.png" srcset="dog_small.png 1x, dog@2x.png 2x"></a>
<div style="background-image:url(tile.png?v=3)"></div>
<a href="about.html">About</a> <img src="https://pat.neocities.org/cat.gif"> <img src="https://someone.else/cat.gif">
<img src="data:image/gif;base64,R0lGOD">`

test('what counts as a picture, its name, and whether it is written against the page', () => {
  expect(isPicture('a/b.JPEG?x#y')).toBe(true)
  expect(isPicture('about.html')).toBe(false)
  expect(isPicture('font.woff2')).toBe(false)
  expect(pictureName('./images/Cat%20Face.GIF?v=2')).toBe('cat face.gif')
  expect(isRelative('img/a.gif')).toBe(true)
  expect(isRelative('/img/a.gif')).toBe(true)
  expect(isRelative('//cdn.x/a.gif')).toBe(false)
  expect(isRelative('https://x.y/a.gif')).toBe(false)
  expect(isRelative('data:image/gif;base64,x')).toBe(false)
})

test('every picture address, in attributes, srcset, style and <style>', () => {
  expect(picturesIn(PAGE, 'html')).toEqual([
    'img/stars.gif', 'cat.gif', './images/CAT.GIF', 'big/dog.png', 'dog_small.png', 'dog@2x.png', 'tile.png?v=3',
    'https://pat.neocities.org/cat.gif', 'https://someone.else/cat.gif',
  ])
  expect(picturesIn('.a { background: url(a.png) } @font-face { src: url(f.woff) }', 'css')).toEqual(['a.png'])
})

test('uploads take the place of pictures with the same name, here or on your own site, not anyone else’s', () => {
  const { to, used } = byFileName([
    { name: 'cat.gif', url: 'https://cdn.example/u/1.gif' },
    { name: 'Tile.png', url: 'https://cdn.example/u/2.png' },
    { name: 'unused.png', url: 'https://cdn.example/u/3.png' },
  ], new Set(['pat.neocities.org']))
  const out = rewritePictures(PAGE, 'html', to)
  expect(out).toContain('<img src="https://cdn.example/u/1.gif" alt="Cat"> <img src=\'https://cdn.example/u/1.gif\'>')
  expect(out).toContain('style="background-image:url(https://cdn.example/u/2.png)"')
  expect(out).toContain('<img src="https://cdn.example/u/1.gif"> <img src="https://someone.else/cat.gif">')
  expect(out).toContain('url("img/stars.gif")')
  expect(out).toContain('srcset="dog_small.png 1x, dog@2x.png 2x"')
  expect(out).toContain('<a href="about.html">')
  expect([...used].sort()).toEqual(['cat.gif', 'tile.png'])
})

test('srcset entries and CSS change one by one, quotes kept', () => {
  const to = (url: string) => (url === 'b.png' ? 'https://x/b.png' : null)
  expect(rewritePictures('<img srcset="a.png 1x, b.png 2x">', 'html', to)).toBe('<img srcset="a.png 1x, https://x/b.png 2x">')
  expect(rewritePictures(".a { background: url('b.png') } .b { background: url(c.png) }", 'css', to))
    .toBe(".a { background: url('https://x/b.png') } .b { background: url(c.png) }")
})

test('the pictures still on your own site', () => {
  expect(picturesOnOwnSites(PAGE, '.x { background: url(https://pat.neocities.org/bg.png) }', new Set(['pat.neocities.org'])))
    .toEqual(['https://pat.neocities.org/cat.gif', 'https://pat.neocities.org/bg.png'])
  expect(picturesOnOwnSites(PAGE, '', new Set())).toEqual([])
})
