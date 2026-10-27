import { GetServerSideProps, NextApiRequest } from 'next';
import Layout from '@/components/ui/layout/Layout';
import ButtonLink from '@/components/ui/ButtonLink';
import PageHeader from '@/components/ui/layout/PageHeader';
import RetroCard from '@/components/ui/layout/RetroCard';
import PageMeta from '@/components/ui/layout/PageMeta';
import BringYourSite, { SignedOutSteps } from '@/components/features/rings/BringYourSite';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';

interface BringYourSitePageProps {
  siteConfig: SiteConfig;
  username: string | null;
}

export default function BringYourSitePage({ siteConfig, username }: BringYourSitePageProps) {
  const description = 'Bring your homepage from Neocities or your own domain, or have your rings link to your site.';
  return (
    <>
      <PageMeta title="Bring your site" description={description} path="/build/bring-your-site" />

      <Layout siteConfig={siteConfig}>
        <div className="space-y-6 max-w-4xl mx-auto">
          <PageHeader title="Bring your site">
            <p>
              If you already have a site on Neocities, Nekoweb or your own domain, you don&apos;t have to start over. I
              can copy your homepage into the editor here so it becomes your page, or you can leave it where it is and
              have your rings link to it. Or both. First I need to know the site is really yours, which takes one small
              edit over there.
            </p>
          </PageHeader>

          {username ? (
            <BringYourSite username={username} />
          ) : (
            <>
              <RetroCard>
                <p className="mt-0 text-nb-ink">
                  You&apos;ll need an account here first. Once you have one, the First steps list on your home links back
                  here.
                </p>
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href="/signup">Sign up</ButtonLink>
                  <ButtonLink href="/login?next=/build/bring-your-site" variant="secondary">Log in</ButtonLink>
                </div>
              </RetroCard>
              <SignedOutSteps />
            </>
          )}
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<BringYourSitePageProps> = async ({ req }) => {
  const siteConfig = await getSiteConfig();

  let username: string | null = null;
  try {
    const { getSessionUser } = await import('@/lib/auth/server');
    const user = await getSessionUser(req as NextApiRequest);
    username = user?.primaryHandle?.split('@')[0] ?? null;
  } catch {
    // Signed out or the lookup failed: the sign-up card
  }

  return { props: { siteConfig, username } };
};
