import React, { useState, useEffect } from 'react';
import Layout from '@/components/ui/layout/Layout';
import RetroCard from '@/components/ui/layout/RetroCard';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { GetServerSideProps } from 'next';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay';
import PageMeta from '@/components/ui/layout/PageMeta';

interface PolicyData {
  terms_full: string;
}

interface TermsOfServicePageProps {
  siteConfig: SiteConfig;
}

export default function TermsOfServicePage({ siteConfig }: TermsOfServicePageProps) {
  const [termsContent, setTermsContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTerms = async () => {
      try {
        const response = await fetch('/api/policies');
        if (!response.ok) {
          throw new Error('Failed to load terms of service');
        }
        const data = await response.json();
        setTermsContent(data.policies.terms_full);
      } catch (err) {
        console.error('Error loading terms of service:', err);
        setError('Failed to load terms of service');
        // Fallback to default content
        setTermsContent('Terms of service not yet configured by administrators.');
      } finally {
        setLoading(false);
      }
    };

    loadTerms();
  }, []);

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner message="Loading terms of service..." className="py-8" />;
    }

    if (error) {
      return <ErrorDisplay title={error} />;
    }

    // Check if content looks like markdown
    if (termsContent.includes('#') || termsContent.includes('**')) {
      // Simple markdown-to-HTML conversion for basic formatting
      let htmlContent = termsContent
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');

      // Wrap in paragraphs if not already wrapped
      if (!htmlContent.startsWith('<h') && !htmlContent.startsWith('<p')) {
        htmlContent = '<p>' + htmlContent + '</p>';
      }

      return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    }

    // Plain text content - split into paragraphs
    return (
      <div>
        {termsContent.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Terms of service" description={`The rules for using ${siteConfig.site_name}.`} path="/help/terms" />
      <Layout siteConfig={siteConfig}>
        <RetroCard>
          <div className="prose prose-lg max-w-none">
            {renderContent()}
          </div>
        </RetroCard>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<TermsOfServicePageProps> = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    },
  };
};