import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/ui/layout/Layout';
import RetroCard from '@/components/ui/layout/RetroCard';

interface PolicyData {
  terms_full: string;
}

export default function TermsOfServicePage() {
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
      return <p>Loading terms of service...</p>;
    }

    if (error) {
      return <p className="text-red-600">{error}</p>;
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
      <Head>
        <title>Terms of Service | ThreadStead</title>
        <meta name="description" content="ThreadStead Terms of Service - Rules and conditions for using our platform." />
      </Head>
      <Layout>
        <RetroCard>
          <div className="prose prose-lg max-w-none">
            {renderContent()}
          </div>
        </RetroCard>
      </Layout>
    </>
  );
}