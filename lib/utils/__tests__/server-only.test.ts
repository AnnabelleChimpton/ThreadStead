import { putServerOnly, readServerOnly } from '../server-only';

describe('server-only text', () => {
  it("survives Next merging _app's pageProps with getServerSideProps'", () => {
    // _app.getInitialProps puts the site's CSS, the page puts its own CSS;
    // Next then does Object.assign({}, appPageProps, pageProps)
    const appPageProps = {};
    putServerOnly(appPageProps, 'site-wide-css', 'body { color: red }');
    const pageProps = { cssMode: 'inherit' };
    putServerOnly(pageProps, 'advanced-template-css', '.mine { color: blue }');

    const merged = Object.assign({}, appPageProps, pageProps);
    expect(readServerOnly(merged, 'site-wide-css')).toBe('body { color: red }');
    expect(readServerOnly(merged, 'advanced-template-css')).toBe('.mine { color: blue }');
  });

  it('stays out of the page data', () => {
    const props = { a: 1 };
    putServerOnly(props, 'site-wide-css', 'body {}');
    expect(JSON.stringify(props)).toBe('{"a":1}');
  });
});
