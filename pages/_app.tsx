import type { AppProps } from "next/app";
import 'highlight.js/styles/github.css'; // or any theme you like
import "../styles/globals.css";


export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
