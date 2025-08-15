import type { AppProps } from "next/app";
import Head from "next/head";
import 'highlight.js/styles/github.css'; // or any theme you like
import "../styles/globals.css";


export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="thread-surface min-h-screen font-body text-thread-charcoal">
        <Component {...pageProps} />
      </div>
    </>
  );
}
