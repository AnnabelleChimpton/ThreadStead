/**
 * React hook for managing page metadata
 * Provides easy-to-use functions for setting page metadata
 */

import React, { useEffect } from 'react';
import { MetadataConfig, MetadataGenerator } from '@/lib/utils/metadata/metadata-generator';

export interface UseMetadataOptions {
  siteConfig?: any;
  autoApply?: boolean; // Whether to automatically apply metadata to document head
}

export function useMetadata(options: UseMetadataOptions = {}) {
  const { siteConfig, autoApply = true } = options;

  const generator = new MetadataGenerator(
    process.env.NEXT_PUBLIC_BASE_URL,
    siteConfig
  );

  /**
   * Apply metadata configuration to the document head
   */
  const applyMetadata = (config: MetadataConfig) => {
    if (typeof window === 'undefined') return;

    const doc = document;

    // Update title
    const title = generator['formatTitle'](config.title);
    doc.title = title;

    // Helper to update or create meta tag
    const updateMeta = (selector: string, content: string, attr = 'content') => {
      let element = doc.querySelector(selector) as HTMLMetaElement;
      if (!element) {
        element = doc.createElement('meta');
        if (selector.includes('property=')) {
          const property = selector.match(/property="([^"]+)"/)?.[1];
          if (property) element.setAttribute('property', property);
        } else if (selector.includes('name=')) {
          const name = selector.match(/name="([^"]+)"/)?.[1];
          if (name) element.setAttribute('name', name);
        }
        doc.head.appendChild(element);
      }
      element.setAttribute(attr, content);
    };

    // Helper to update or create link tag
    const updateLink = (rel: string, href: string) => {
      let element = doc.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!element) {
        element = doc.createElement('link');
        element.setAttribute('rel', rel);
        doc.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // Basic meta tags
    if (config.description) {
      updateMeta('meta[name="description"]', config.description);
    }

    if (config.keywords && config.keywords.length > 0) {
      updateMeta('meta[name="keywords"]', config.keywords.join(', '));
    }

    if (config.author) {
      updateMeta('meta[name="author"]', config.author);
    }

    // Canonical URL
    if (config.url) {
      const fullUrl = config.url.startsWith('http')
        ? config.url
        : `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${config.url}`;
      updateLink('canonical', fullUrl);
    }

    // Robots meta
    const robotsContent = config.noIndex ? 'noindex, nofollow' : 'index, follow';
    updateMeta('meta[name="robots"]', robotsContent);

    // OpenGraph meta tags
    updateMeta('meta[property="og:title"]', title);
    if (config.description) {
      updateMeta('meta[property="og:description"]', config.description);
    }
    updateMeta('meta[property="og:type"]', config.type || 'website');

    const imageUrl = config.image
      ? (config.image.startsWith('http') ? config.image : `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${config.image}`)
      : `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/assets/default-og-image.png`;
    updateMeta('meta[property="og:image"]', imageUrl);

    if (config.imageAlt) {
      updateMeta('meta[property="og:image:alt"]', config.imageAlt);
    }

    if (config.url) {
      const fullUrl = config.url.startsWith('http')
        ? config.url
        : `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}${config.url}`;
      updateMeta('meta[property="og:url"]', fullUrl);
    }

    // ThreadStead is the platform name - fallback when site_name unavailable
    const siteName = siteConfig?.site_name || 'ThreadStead';
    updateMeta('meta[property="og:site_name"]', siteName);
    updateMeta('meta[property="og:locale"]', config.locale || 'en_US');

    // Article-specific OpenGraph
    if (config.type === 'article') {
      if (config.author) {
        updateMeta('meta[property="article:author"]', config.author);
      }
      if (config.publishedTime) {
        updateMeta('meta[property="article:published_time"]', config.publishedTime);
      }
      if (config.modifiedTime) {
        updateMeta('meta[property="article:modified_time"]', config.modifiedTime);
      }
    }

    // Social media card meta tags
    updateMeta('meta[name="twitter:card"]', 'summary_large_image');
    updateMeta('meta[name="twitter:title"]', title);
    if (config.description) {
      updateMeta('meta[name="twitter:description"]', config.description);
    }
    updateMeta('meta[name="twitter:image"]', imageUrl);

    // Structured data (JSON-LD)
    if (config.structuredData) {
      // Remove existing structured data
      const existingScript = doc.querySelector('script[type="application/ld+json"][data-metadata]');
      if (existingScript) {
        existingScript.remove();
      }

      // Add new structured data
      const script = doc.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-metadata', 'true');
      script.textContent = JSON.stringify(config.structuredData, null, 0);
      doc.head.appendChild(script);
    }
  };

  /**
   * Set metadata for user profile page
   */
  const setUserProfileMetadata = (user: any) => {
    const { contentMetadataGenerator } = require('@/lib/utils/metadata/content-metadata');
    const metadata = contentMetadataGenerator.generateUserProfileMetadata(user);
    if (autoApply) {
      applyMetadata(metadata);
    }
    return metadata;
  };

  /**
   * Set metadata for blog post page
   */
  const setBlogPostMetadata = (post: any, userHandle: string) => {
    const { contentMetadataGenerator } = require('@/lib/utils/metadata/content-metadata');
    const metadata = contentMetadataGenerator.generateBlogPostMetadata(post, userHandle);
    if (autoApply) {
      applyMetadata(metadata);
    }
    return metadata;
  };

  /**
   * Set metadata for ThreadRing page
   */
  const setThreadRingMetadata = (ring: any) => {
    const { contentMetadataGenerator } = require('@/lib/utils/metadata/content-metadata');
    const metadata = contentMetadataGenerator.generateThreadRingMetadata(ring);
    if (autoApply) {
      applyMetadata(metadata);
    }
    return metadata;
  };

  /**
   * Set metadata for homepage
   */
  const setHomepageMetadata = () => {
    const { contentMetadataGenerator } = require('@/lib/utils/metadata/content-metadata');
    const metadata = contentMetadataGenerator.generateHomepageMetadata(siteConfig);
    if (autoApply) {
      applyMetadata(metadata);
    }
    return metadata;
  };

  /**
   * Set metadata for discover page
   */
  const setDiscoverMetadata = (searchQuery?: string) => {
    const { contentMetadataGenerator } = require('@/lib/utils/metadata/content-metadata');
    const metadata = contentMetadataGenerator.generateDiscoverMetadata(searchQuery);
    if (autoApply) {
      applyMetadata(metadata);
    }
    return metadata;
  };

  /**
   * Set custom metadata
   */
  const setCustomMetadata = (config: MetadataConfig) => {
    if (autoApply) {
      applyMetadata(config);
    }
    return config;
  };

  return {
    applyMetadata,
    setUserProfileMetadata,
    setBlogPostMetadata,
    setThreadRingMetadata,
    setHomepageMetadata,
    setDiscoverMetadata,
    setCustomMetadata,
    generator
  };
}

/**
 * Higher-order component to automatically apply metadata
 */
export function withMetadata<P extends object>(
  Component: React.ComponentType<P>,
  getMetadata: (props: P) => MetadataConfig
): React.ComponentType<P> {
  const WithMetadataComponent = (props: P) => {
    const { applyMetadata } = useMetadata();

    useEffect(() => {
      const metadata = getMetadata(props);
      applyMetadata(metadata);
    }, [props, applyMetadata]);

    return React.createElement(Component, props);
  };

  return WithMetadataComponent;
}