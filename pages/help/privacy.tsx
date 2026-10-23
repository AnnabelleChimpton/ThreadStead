import React, { useState, useEffect } from 'react';
import Layout from '@/components/ui/layout/Layout';
import RetroCard from '@/components/ui/layout/RetroCard';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { GetServerSideProps } from 'next';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay';
import PageMeta from '@/components/ui/layout/PageMeta';
import { SITE_TITLE } from '@/lib/config/site/constants';

interface PolicyData {
  privacy_full: string;
}

interface PrivacyPolicyPageProps {
  siteConfig: SiteConfig;
}

export default function PrivacyPolicyPage({ siteConfig }: PrivacyPolicyPageProps) {
  const [policyContent, setPolicyContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        const response = await fetch('/api/policies');
        if (!response.ok) {
          throw new Error('Failed to load privacy policy');
        }
        const data = await response.json();
        setPolicyContent(data.policies.privacy_full);
      } catch (err) {
        console.error('Error loading privacy policy:', err);
        setError('Failed to load privacy policy');
        // Fallback to default content
        setPolicyContent('Privacy policy not yet configured by administrators.');
      } finally {
        setLoading(false);
      }
    };

    loadPolicy();
  }, []);

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner message="Loading privacy policy..." className="py-8" />;
    }

    if (error) {
      return <ErrorDisplay title={error} />;
    }

    // Check if content looks like markdown
    if (policyContent.includes('#') || policyContent.includes('**')) {
      // Simple markdown-to-HTML conversion for basic formatting
      let htmlContent = policyContent
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
        {policyContent.split('\n\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Privacy policy" description={`What ${SITE_TITLE} keeps about you, why, and what you can do about it.`} path="/help/privacy" />
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

export const getServerSideProps: GetServerSideProps<PrivacyPolicyPageProps> = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    },
  };
};