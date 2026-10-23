import { GetServerSideProps } from 'next';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import PageHeader from '@/components/ui/layout/PageHeader';
import Callout from '@/components/ui/feedback/Callout';
import ButtonLink from '@/components/ui/ButtonLink';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import PageMeta from '@/components/ui/layout/PageMeta';

interface ContactProps {
  siteConfig: SiteConfig;
}

export default function Contact({ siteConfig }: ContactProps) {
  const link = 'text-thread-sunset hover:underline font-medium break-words';
  return (
    <>
      <PageMeta title="Contact" description="It's just me running this site, so anything you send here comes straight to me." path="/help/contact" />

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <PageHeader title="Contact me" back={{ href: '/help', label: 'Back to Help' }}>
            <p>It&apos;s just me running this site, so anything you send here comes straight to me.</p>
          </PageHeader>

          <div className="thread-module mb-12 space-y-4 leading-relaxed">
            <p>
              Questions about how something works, or anything else, can go to{' '}
              <a href="mailto:hello@homepageagain.com" className={link}>hello@homepageagain.com</a>.
            </p>
            <p>
              If something&apos;s broken, email{' '}
              <a href="mailto:support@homepageagain.com" className={link}>support@homepageagain.com</a>.
              It really helps if you tell me what you clicked and what happened, and a screenshot is even better.
            </p>
            <p>
              Ideas for the site go to{' '}
              <a href="mailto:feedback@homepageagain.com" className={link}>feedback@homepageagain.com</a>.
              If you&apos;d rather not put your name on it, there&apos;s an{' '}
              <a href="https://forms.gle/cNJssqoKs9yJTspG6" target="_blank" rel="noopener noreferrer" className={link}>anonymous feedback form</a> too.
            </p>
            <p className="mb-0">
              If someone&apos;s breaking the <Link href="/help/guidelines" className={link}>house rules</Link>, use the Report button on the post or comment, or email{' '}
              <a href="mailto:abuse@homepageagain.com" className={link}>abuse@homepageagain.com</a>.
            </p>
          </div>

          <Callout title="Quick answers">
            <p>The FAQ covers the usual questions.</p>
            <p><ButtonLink href="/help/faq">Read the FAQ</ButtonLink></p>
          </Callout>

          <p className="mt-6 text-sm text-nb-ink">
            I usually reply within a day or two. If it can&apos;t wait, put URGENT in the subject line.
          </p>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    }
  };
};
