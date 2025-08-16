import type { AppProps } from "next/app";
import Head from "next/head";
import 'highlight.js/styles/github.css'; // or any theme you like
import "../styles/globals.css";
import { useSiteCSS } from "@/hooks/useSiteCSS";
import { useRouter } from "next/router";

export default function MyApp({ Component, pageProps }: AppProps) {
  const { css } = useSiteCSS();
  const router = useRouter();
  
  // Check if we're on a user profile page that might have custom CSS
  const isProfilePage = router.pathname === '/resident/[username]' || router.pathname === '/resident/[username]/index';
  const hasCustomCSS = pageProps.customCSS && pageProps.customCSS.trim() !== '';

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Only load site-wide CSS on non-profile pages */}
        {css && !isProfilePage && (
          <style 
            id="site-wide-css"
            dangerouslySetInnerHTML={{ __html: css }} 
          />
        )}
        {isProfilePage && hasCustomCSS && (
          <style 
            id="profile-page-styles"
            dangerouslySetInnerHTML={{ 
              __html: `/* Profile page - Clean canvas for user customization */
.profile-container {
  margin-top: 0;
  padding-top: 0;
}

/* Custom CSS - User or Admin Default */
${pageProps.customCSS}`
            }} 
          />
        )}
      </Head>
      <div className="thread-surface min-h-screen font-body text-thread-charcoal">
        <Component {...pageProps} />
      </div>
    </>
  );
}
