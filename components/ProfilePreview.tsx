import React, { useEffect, useState, useMemo } from 'react';
import { TemplateEngine } from '@/lib/template-engine';
import { fetchResidentData } from '@/lib/template-data';
import { scopeCSS, generateScopeId } from '@/lib/css-scoping';
import type { TemplateNode } from '@/lib/template-parser';
import type { ResidentData } from '@/components/template/ResidentDataProvider';

interface ProfilePreviewProps {
  // Preview modes
  mode: 'css-only' | 'template-only' | 'combined';
  
  // Content to preview
  customCSS?: string;
  templateAst?: TemplateNode | null;
  
  // User data
  username: string;
  
  // Preview settings
  showFrame?: boolean;
  height?: string;
  className?: string;
}

export default function ProfilePreview({
  mode,
  customCSS = '',
  templateAst = null,
  username,
  showFrame = true,
  height = 'h-96',
  className = ''
}: ProfilePreviewProps) {
  const [residentData, setResidentData] = useState<ResidentData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Load resident data
  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      setPreviewError(null);
      try {
        let data: ResidentData | null = null;
        
        if (username) {
          data = await fetchResidentData(username);
        }
        
        if (!data) {
          data = TemplateEngine.createMockData(username || 'testuser');
        }
        
        setResidentData(data);
      } catch (error) {
        console.error('Failed to load resident data:', error);
        setPreviewError('Failed to load user data for preview');
        setResidentData(TemplateEngine.createMockData(username || 'testuser'));
      } finally {
        setDataLoading(false);
      }
    }
    
    loadData();
  }, [username]);

  const renderPreviewContent = () => {
    if (dataLoading) {
      return (
        <div className="flex items-center justify-center h-full text-thread-sage">
          <div className="text-center">
            <div className="animate-spin w-6 h-6 border-2 border-thread-pine border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Loading preview...</p>
          </div>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="flex items-center justify-center h-full text-red-600">
          <div className="text-center">
            <p className="text-sm">{previewError}</p>
          </div>
        </div>
      );
    }

    if (!residentData) {
      return (
        <div className="flex items-center justify-center h-full text-thread-sage">
          <p className="text-sm">No data available for preview</p>
        </div>
      );
    }

    // CSS-only preview: Show default profile layout with CSS applied
    if (mode === 'css-only') {
      return (
        <div className="preview-default-layout">
          {/* CSS is now applied via scoped styles above */}
          
          {/* Render a simplified default profile layout */}
          <div className="profile-container">
            <div className="profile-content-wrapper">
              <div className="profile-main-content">
                {/* Profile Header */}
                <div className="thread-surface thread-module profile-header">
                  <div className="profile-header-layout">
                    <div className="profile-photo-section">
                      <div className="profile-photo-wrapper">
                        <div className="profile-photo-frame">
                          <img 
                            src={residentData.owner.avatarUrl || "/assets/default-avatar.gif"} 
                            alt="Profile"
                            className="profile-photo-image"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="profile-info-section">
                      <div className="profile-identity">
                        <h2 className="profile-display-name thread-headline">
                          {residentData.owner.displayName || residentData.owner.handle}
                        </h2>
                        <span className="profile-status thread-label">threadstead resident</span>
                      </div>
                      {residentData.capabilities?.bio && (
                        <div className="profile-bio-section">
                          <p className="profile-bio">{residentData.capabilities.bio}</p>
                        </div>
                      )}
                      <div className="profile-actions">
                        <button className="profile-button thread-button">Sample Action</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sample Content */}
                <div className="thread-surface thread-module">
                  <div className="profile-tabs">
                    <div className="profile-tab-list">
                      <button className="profile-tab-button active">Blog</button>
                      <button className="profile-tab-button">Friends</button>
                      <button className="profile-tab-button">Media</button>
                    </div>
                    <div className="profile-tab-panel">
                      <div className="blog-tab-content profile-tab-content">
                        <div className="blog-posts-list">
                          <div className="blog-post-card thread-surface">
                            <div className="blog-post-header">
                              <span className="blog-post-date thread-label">Sample Date</span>
                            </div>
                            <div className="blog-post-content">
                              <h3 className="blog-post-title">Sample Blog Post</h3>
                              <p>This is how your blog posts will look with your custom CSS...</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Template-only or combined preview
    if ((mode === 'template-only' || mode === 'combined') && templateAst) {
      try {
        const renderResult = TemplateEngine.render({
          ast: templateAst,
          residentData: residentData,
          mode: 'preview'
        });

        if (!renderResult.success) {
          return (
            <div className="template-error p-4 bg-red-50 border border-red-200 rounded text-red-700">
              <h4 className="font-medium mb-2">Template Render Error</h4>
              <ul className="text-sm">
                {renderResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          );
        }

        return (
          <div className="preview-template-layout">
            {/* CSS is now applied via scoped styles above for all modes */}
            {/* Ensure template content is wrapped in the same profile structure as CSS-only mode */}
            <div className="profile-container">
              <div className="profile-content-wrapper">
                <div className="profile-main-content">
                  {/* Add site-level structure that CSS might target */}
                  <div className="site-layout">
                    <div className="site-main">
                      {renderResult.content}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      } catch (error) {
        return (
          <div className="template-error p-4 bg-red-50 border border-red-200 rounded text-red-700">
            <h4 className="font-medium mb-2">Preview Error</h4>
            <p className="text-sm">{String(error)}</p>
          </div>
        );
      }
    }

    // Fallback for template modes without template
    return (
      <div className="flex items-center justify-center h-full text-thread-sage">
        <div className="text-center">
          <p className="mb-2">No template to preview</p>
          <p className="text-sm">Design a template to see it here</p>
        </div>
      </div>
    );
  };

  const containerClasses = `
    ${showFrame ? 'border border-thread-sage/30 rounded-lg' : ''}
    bg-thread-cream
    ${height}
    overflow-auto
    ${className}
  `;

  // Generate a unique ID for this preview instance to scope CSS
  const previewId = generateScopeId(React.useId());
  
  // Process custom CSS to scope it to this preview container
  const scopedCSS = useMemo(() => scopeCSS(customCSS || '', previewId), [customCSS, previewId]);

  return (
    <div className={containerClasses}>
      <div className="preview-wrapper h-full">
        {/* Apply scoped CSS */}
        {scopedCSS && (
          <style dangerouslySetInnerHTML={{ __html: scopedCSS }} />
        )}
        
        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && customCSS && (
          <div className="text-xs bg-gray-100 p-2 border-b">
            <strong>Debug:</strong> CSS ({customCSS.length} chars) → Scoped ({scopedCSS.length} chars) | Preview ID: {previewId}
          </div>
        )}
        
        {/* Create an isolated preview environment with unique ID */}
        <div 
          id={previewId}
          className="preview-isolation" 
          style={{ 
            isolation: 'isolate', 
            position: 'relative',
            height: '100%',
            width: '100%'
          }}
        >
          {renderPreviewContent()}
        </div>
      </div>
    </div>
  );
}