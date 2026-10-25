/**
 * The page's parse (parseHtml) runs parse5 with its own way of moving nodes
 * (LinearParser), which parse5 does when it adopts a fragment's top-level
 * nodes and in the adoption agency for misnested formatting. The tree must
 * be the one parse5's fragment parse builds, so these are the parser's
 * corners: misnested formatting, tables, implied end tags, forms,
 * document-level tags, foreign content and templates.
 */
jest.mock('@noble/ed25519', () => ({ getPublicKey: jest.fn(), getPublicKeyAsync: jest.fn(), sign: jest.fn(), verify: jest.fn(), utils: {}, etc: {} }))

import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import { parseHtml } from '@/lib/templates/compilation/template-parser'

const CORNERS = [
  'plain text, no tags',
  '  <p>leading space</p>  trailing text',
  '<b>bold <i>both</b> italic</i> after',
  '<a href="/x">one <div>block</div> <a href="/y">two</a>',
  '<p>para <div>block in a para</div> rest</p>',
  '<p>one<p>two<ul><li>a<li>b</ul>three',
  '<table><tr><td>a<td>b<tr><td>c</table>after',
  'text<table>stray text<tr><td>cell</td></tr></table>',
  '<table><caption>cap</caption><colgroup><col></colgroup><tbody><tr><th>h</th></tr></tbody></table>',
  '<table><tr><td><table><tr><td>inner</table>outer</table>',
  '<td>a cell with no table</td><tr><td>row</td></tr>',
  '<select><option>a<option>b<optgroup label="g"><option>c</select>',
  '<form><input name="a"><form><input name="b"></form></form>',
  '<html lang="en"><head><title>t</title></head><body class="x"><p>hi</p></body></html>',
  '</body><p>after a closing body</p></html>more',
  '<frameset><frame></frameset><p>still here</p>',
  '<svg viewBox="0 0 1 1"><circle r="1"/><foreignObject><p>html</p></foreignObject></svg>',
  '<math><mi>x</mi><annotation-xml encoding="text/html"><p>p</p></annotation-xml></math>',
  '<noscript><b>shown when scripting is off</b></noscript>',
  '<textarea>\nkept line</textarea><pre>\n\nfirst newline goes</pre><xmp><b>raw</b></xmp>',
  '<template><p>a template of their own</p></template><p>after</p>',
  '<template><p>never closed',
  'before</template>after</template>',
  '<form><div></form>after the form</div>',
  '<b>1<p>2<b>3<i>4</b>5</p>6</i>',
  '<a>1<a>2<div>3<a>4</div>5',
  '<font size=2><center><font color=red>deep</center>old</font>',
  '&lt;div&gt; &amp;copy; &copy; &nbsp;<p title="say &quot;hi&quot;">e</p>',
  '<!-- a comment --><!doctype html><p>x</p>',
]

/** A tree without positions, the shape compile works with */
function shape(node: any): any {
  const { position, ...rest } = node
  if (rest.children) rest.children = rest.children.map(shape)
  if (rest.content) rest.content = shape(rest.content)
  return rest
}

const fragmentParse = (html: string) => shape(unified().use(rehypeParse, { fragment: true }).parse(html))

test.each(CORNERS)('%s', (source) => {
  expect(shape(parseHtml(source))).toEqual(fragmentParse(source))
})
