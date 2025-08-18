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
  const isAdvancedTemplate = isProfilePage && pageProps.templateMode === 'advanced';

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

${isAdvancedTemplate ? `
/* Advanced Template Mode - CSS Override Helper */
/* Users can target these classes to completely override defaults */

/* Reset global color inheritance for advanced templates */
body, body * {
  color: inherit;
}

/* Make component classes easy to override */
.ts-profile-display-name,
.ts-bio-heading, 
.ts-profile-bio,
.ts-blog-posts,
.ts-blog-posts h3,
.ts-blog-post-content,
.ts-blog-post-meta {
  /* Reduced specificity - user CSS can override easily */
}

/* Helper comment for users */
/*
  TARGET THESE CLASSES IN YOUR <style> SECTION:
  
  .ts-profile-display-name { color: red !important; }
  .ts-bio-heading { color: blue !important; }  
  .ts-profile-bio { color: green !important; }
  .ts-blog-posts { color: purple !important; }
  
  Use !important to override defaults completely.
*/
` : ''}

/* Custom CSS - User or Admin Default */
${pageProps.customCSS}`
            }} 
          />
        )}
      </Head>
      <div className={`min-h-screen font-body ${
        isAdvancedTemplate 
          ? '' // No default classes for advanced templates - completely clean
          : 'thread-surface text-thread-charcoal' // Normal styling for everything else
      }`}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
