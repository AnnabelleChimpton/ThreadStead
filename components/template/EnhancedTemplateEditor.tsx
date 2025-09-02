// Enhanced template editor with islands support
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import TemplatePreview from './TemplatePreview';
import { fetchResidentData } from '@/lib/template-data';
import type { ResidentData } from '@/components/template/ResidentDataProvider';
import type { CompiledTemplate } from '@/lib/template-compiler';
import { getDefaultTemplate } from '@/lib/default-css-template';
import { TEMPLATE_EXAMPLES } from '@/lib/default-profile-template';
import { HTML_TEMPLATES, getHTMLTemplate } from '@/lib/default-html-templates';
import Link from 'next/link';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { generatePreviewCSS, type CSSMode, type TemplateMode } from '@/lib/css-layers';
import { useSiteCSS } from '@/hooks/useSiteCSS';
import MinimalNavBar from '@/components/MinimalNavBar';

// Warning dialog for data loss prevention
interface DataLossWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
}

function DataLossWarning({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Yes, Continue" 
}: DataLossWarningProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border-2 border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Component to handle preview for both standard layout and custom template modes
interface StandardLayoutPreviewProps {
  user: any;
  template: string;
  customCSS: string;
  cssMode: 'inherit' | 'override' | 'disable';
  useStandardLayout: boolean;
  showNavigation: boolean;
  residentData: ResidentData;
  onCompile: (compiledTemplate: CompiledTemplate | null) => void;
  onError: (error: string) => void;
  defaultTemplate?: string | null;
  loadingDefaultTemplate: boolean;
  siteWideCSS?: string;
}

// Simplified NavBar for preview that doesn't require data fetching
function PreviewNavBar({ siteConfig }: { siteConfig: any }) {
  return (
    <header className="site-header border-b border-thread-sage bg-thread-cream px-4 sm:px-6 py-4 sticky top-0 z-[9999] backdrop-blur-sm bg-thread-cream/95 relative">
      <nav className="site-navigation mx-auto max-w-5xl flex items-center justify-between">
        <div className="site-branding flex-shrink-0">
          <h1 className="site-title thread-headline text-xl sm:text-2xl font-bold text-thread-pine">{siteConfig.site_name}</h1>
          <span className="site-tagline thread-label hidden sm:inline">{siteConfig.site_tagline}</span>
        </div>
        
        {/* Desktop Navigation */}
        <div className="site-nav-container hidden lg:flex items-center gap-8">
          <div className="site-nav-links flex items-center gap-6">
            <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/">Home</Link>
            <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/discovery">Discovery</Link>
            <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/help">Help</Link>
          </div>
          
          {/* Site Auth */}
          <div className="site-auth flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-thread-sage">
              <span className="hidden sm:inline">Preview Mode</span>
              <div className="w-8 h-8 bg-thread-sage rounded-full flex items-center justify-center">
                <span className="text-white text-xs">👤</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile hamburger */}
        <div className="lg:hidden">
          <button className="p-2 text-thread-pine hover:text-thread-sunset">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
}

// Scoped component wrapper for navigation/footer with isolated CSS
function ScopedNavFooterWrapper({ 
  children, 
  customCSS,
  cssMode = 'inherit' 
}: { 
  children: React.ReactNode; 
  customCSS: string;
  cssMode?: CSSMode;
}) {
  const shadowHostRef = React.useRef<HTMLDivElement>(null);
  const shadowRootRef = React.useRef<ShadowRoot | null>(null);
  const [shadowReady, setShadowReady] = React.useState(false);
  const { css: siteWideCSS } = useSiteCSS();

  React.useEffect(() => {
    if (shadowHostRef.current && !shadowRootRef.current) {
      try {
        const shadowRoot = shadowHostRef.current.attachShadow({ mode: 'open' });
        shadowRootRef.current = shadowRoot;
        
        const container = document.createElement('div');
        container.id = 'nav-footer-content';
        shadowRoot.appendChild(container);
        
        setShadowReady(true);
      } catch (error) {
        console.error('Failed to create shadow DOM:', error);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!shadowRootRef.current || !shadowReady) return;

    const existingStyle = shadowRootRef.current.querySelector('#nav-footer-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'nav-footer-styles';
    
    // Generate layered CSS for shadow DOM
    const layeredCSS = generatePreviewCSS({
      cssMode,
      templateMode: 'enhanced',
      siteWideCSS,
      userCustomCSS: customCSS,
      profileId: 'nav-footer-preview'
    });

    styleElement.textContent = `
      ${layeredCSS}
      
      /* Ensure proper styling for shadow DOM */
      #nav-footer-content {
        width: 100%;
        display: block;
      }
    `;

    shadowRootRef.current.insertBefore(styleElement, shadowRootRef.current.firstChild);
  }, [customCSS, cssMode, siteWideCSS, shadowReady]);

  return (
    <div 
      ref={shadowHostRef}
      className="nav-footer-shadow-host"
    >
      {shadowReady && shadowRootRef.current && (
        createPortal(
          <div id="nav-footer-content">
            {children}
          </div>,
          shadowRootRef.current.querySelector('#nav-footer-content') as HTMLElement
        )
      )}
    </div>
  );
}

function StandardLayoutPreview({
  user,
  template,
  customCSS,
  cssMode,
  useStandardLayout,
  showNavigation,
  residentData,
  onCompile,
  onError,
  defaultTemplate,
  loadingDefaultTemplate,
  siteWideCSS
}: StandardLayoutPreviewProps) {
  const { config } = useSiteConfig();
  
  // Use default template for standard layout, or user's template for custom mode
  const previewTemplate = useStandardLayout && defaultTemplate ? defaultTemplate : template;

  if (useStandardLayout && loadingDefaultTemplate) {
    return (
      <div className="p-4 text-center text-thread-sage">
        Loading standard layout preview...
      </div>
    );
  }

  return (
    <div>
      
      {/* Helpful info for standard layout users */}
      {useStandardLayout && (
        <div className="p-3 bg-blue-50 border-b border-blue-200 text-sm text-blue-700">
          <strong>Preview:</strong> This shows how your CSS will look with the standard layout including navigation and footer.
          The layout structure cannot be modified, but your CSS styling is applied.
        </div>
      )}
      
      {/* Navigation context for realistic preview with scoped CSS */}
      <div className={`preview-with-context ${useStandardLayout ? 'thread-surface min-h-screen preview-standard-layout' : ''}`}>
        {/* Navigation - show appropriate navbar based on template mode */}
        {showNavigation && (
          <>
            {useStandardLayout ? (
              // Standard layout: Show PreviewNavBar with full site CSS (no shadow DOM isolation)
              <PreviewNavBar siteConfig={config} />
            ) : (
              // Advanced template: Show MinimalNavBar with user's custom CSS applied
              <ScopedNavFooterWrapper customCSS={customCSS} cssMode={cssMode}>
                <MinimalNavBar />
              </ScopedNavFooterWrapper>
            )}
          </>
        )}
        
        {/* Template content */}
        <div className={`template-content-preview ${useStandardLayout ? 'mx-auto max-w-5xl px-6 py-8' : ''}`}>
          <TemplatePreview
            user={user}
            template={previewTemplate}
            customCSS={customCSS}
            cssMode={cssMode}
            renderMode="islands"
            residentData={residentData}
            onCompile={onCompile}
            onError={onError}
            siteWideCSS={siteWideCSS}
            useStandardLayout={useStandardLayout}
          />
        </div>
        
        {/* Footer - show based on toggle */}
        {showNavigation && (
          <>
            {useStandardLayout ? (
              // Standard layout: Show footer with full site CSS (no shadow DOM isolation)
              <footer className="site-footer border-t border-thread-sage bg-thread-cream px-6 py-4 mt-auto">
                <div className="footer-content mx-auto max-w-5xl text-center">
                  <span className="footer-tagline thread-label">{config.site_description}</span>
                  <p className="footer-copyright text-sm text-thread-sage mt-1">© {new Date().getFullYear()} {config.footer_text}</p>
                </div>
              </footer>
            ) : (
              // Advanced template: Apply user's custom CSS to footer
              <ScopedNavFooterWrapper customCSS={customCSS} cssMode={cssMode}>
                <footer className="site-footer border-t border-thread-sage bg-thread-cream px-6 py-4 mt-auto">
                  <div className="footer-content mx-auto max-w-5xl text-center">
                    <span className="footer-tagline thread-label">{config.site_description}</span>
                    <p className="footer-copyright text-sm text-thread-sage mt-1">© {new Date().getFullYear()} {config.footer_text}</p>
                  </div>
                </footer>
              </ScopedNavFooterWrapper>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface EnhancedTemplateEditorProps {
  user: any; // User with profile
  initialTemplate?: string;
  initialCSS?: string;
  initialCSSMode?: 'inherit' | 'override' | 'disable';
  initialShowNavigation?: boolean;
  onSave?: (template: string, css: string, compiledTemplate?: CompiledTemplate, cssMode?: 'inherit' | 'override' | 'disable', showNavigation?: boolean) => void;
}

export default function EnhancedTemplateEditor({
  user,
  initialTemplate = '',
  initialCSS = '',
  initialCSSMode = 'inherit',
  initialShowNavigation = true,
  onSave
}: EnhancedTemplateEditorProps) {
  const [template, setTemplate] = useState(initialTemplate);
  const [customCSS, setCustomCSS] = useState(initialCSS);
  const [cssMode, setCSSMode] = useState<'inherit' | 'override' | 'disable'>(initialCSSMode);
  
  // Get site-wide CSS without triggering DOM updates (read-only)
  const [siteWideCSS, setSiteWideCSS] = useState<string>('');
  
  // Fetch site-wide CSS for preview without updating global DOM
  React.useEffect(() => {
    async function fetchSiteCSS() {
      try {
        const res = await fetch("/api/site-css");
        if (res.ok) {
          const data = await res.json();
          setSiteWideCSS(data.css || '');
        }
      } catch (error) {
        console.error("Failed to load site CSS for preview:", error);
      }
    }
    fetchSiteCSS();
  }, []);
  
  // Detect if user is currently using standard layout
  const [useStandardLayout, setUseStandardLayout] = useState(() => {
    const isEmptyTemplate = !initialTemplate || initialTemplate.trim() === '';
    const hasCustomCSS = initialCSS && initialCSS.trim() !== '' && initialCSS.trim() !== '/* Add your custom CSS here */';
    const hasNoContent = !initialTemplate && (!initialCSS || initialCSS.trim() === '' || initialCSS.trim() === '/* Add your custom CSS here */');
    
    // Use standard layout if:
    // 1. Empty template + custom CSS (user is styling standard layout)
    // 2. No template and no CSS (fresh profile - start with standard layout)
    // 3. Empty template and only placeholder CSS (effectively fresh profile)
    const shouldUseStandardLayout = (isEmptyTemplate && hasCustomCSS) || hasNoContent || isEmptyTemplate;
    
    return shouldUseStandardLayout;
  });
  
  
  // Load default template for preview when needed
  const [defaultTemplateForPreview, setDefaultTemplateForPreview] = useState<string | null>(null);
  const [loadingDefaultTemplate, setLoadingDefaultTemplate] = useState(false);
  
  // Navigation toggle for custom templates
  const [showNavigation, setShowNavigation] = useState(initialShowNavigation);
  
  // Always use islands mode - legacy mode removed
  const [residentData, setResidentData] = useState<ResidentData | null>(null);
  
  const useStandardLayoutOption = () => {
    showDataLossWarning(
      "Switch to Standard Layout",
      "This will replace your current HTML template and CSS with a clean standard layout. Any unsaved changes will be lost.",
      () => {
        setUseStandardLayout(true);
        setTemplate(''); // Clear template since we're using standard layout
        setCustomCSS('/* Add your custom CSS here to style the standard layout */\n\n');
        setCSSMode('inherit');
        setSaveMessage('✓ Switched to Standard Layout mode');
        setTimeout(() => setSaveMessage(null), 3000);
      }
    );
  };

  const loadDefaultTemplate = async () => {
    const doLoad = async () => {
      setLoadingDefault(true);
      try {
        const fullHandle = user.primaryHandle || user.handles?.[0]?.handle;
        const username = fullHandle ? fullHandle.split('@')[0] : 'user';
        
        const response = await fetch(`/api/profile/${username}/template/default?refresh=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          setUseStandardLayout(false); // This creates an editable version
          setTemplate(data.template);
          setCustomCSS(data.css);
          setCSSMode(data.cssMode || 'inherit');
          setSaveMessage('✓ Editable default template loaded!');
        } else {
          setSaveMessage('❌ Failed to load default template');
        }
      } catch (error) {
        console.error('Failed to load default template:', error);
        setSaveMessage('❌ Failed to load default template');
      } finally {
        setLoadingDefault(false);
        setTimeout(() => setSaveMessage(null), 3000);
      }
    };

    showDataLossWarning(
      "Load Default Template",
      "This will replace your current HTML template and CSS with the default template. Any unsaved changes will be lost.",
      doLoad
    );
  };
  const [isLoading, setIsLoading] = useState(true);
  const [compiledTemplate, setCompiledTemplate] = useState<CompiledTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'template' | 'css' | 'preview'>('template');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadingDefault, setLoadingDefault] = useState(false);
  
  // Data loss warning state
  const [warningDialog, setWarningDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmAction: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmAction: () => {}
  });

  // Check if user has unsaved content that would be lost
  const hasUnsavedContent = () => {
    const hasCustomTemplate = template && template.trim() !== '' && template.trim() !== initialTemplate;
    const hasCustomCSS = customCSS && customCSS.trim() !== '' && 
      customCSS.trim() !== '/* Add your custom CSS here */' &&
      customCSS.trim() !== '/* Add your custom CSS here to style the standard layout */' &&
      customCSS.trim() !== initialCSS;
    
    return hasCustomTemplate || hasCustomCSS;
  };

  const showDataLossWarning = (title: string, message: string, confirmAction: () => void) => {
    if (hasUnsavedContent()) {
      setWarningDialog({
        isOpen: true,
        title,
        message,
        confirmAction
      });
    } else {
      // No unsaved content, proceed directly
      confirmAction();
    }
  };

  const closeWarning = () => {
    setWarningDialog({
      isOpen: false,
      title: '',
      message: '',
      confirmAction: () => {}
    });
  };

  const confirmWarningAction = () => {
    warningDialog.confirmAction();
    closeWarning();
  };

  // Feature flag for islands mode
  // Islands are always enabled - legacy mode removed

  // Load resident data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      
      try {
        const fullHandle = user.primaryHandle || user.handles?.[0]?.handle;
        const username = fullHandle ? fullHandle.split('@')[0] : 'user';
        
        // For test users or if handle doesn't exist, use mock data directly
        if (!username || username === 'testuser' || user.id === 'test-user-123') {
          const mockData = {
            owner: {
              id: user.id,
              handle: username,
              displayName: user.profile?.displayName || 'Test User',
              avatarUrl: user.profile?.avatarUrl || '/assets/default-avatar.gif'
            },
            viewer: { id: null },
            posts: [
              { id: '1', contentHtml: 'This is a test post from the enhanced editor', createdAt: new Date().toISOString() },
              { id: '2', contentHtml: 'Another test post with some content', createdAt: new Date(Date.now() - 86400000).toISOString() }
            ],
            guestbook: [
              { id: '1', message: 'Great profile!', authorUsername: 'visitor1', createdAt: new Date().toISOString() }
            ],
            capabilities: { bio: user.profile?.bio || 'This is a test bio for the enhanced template editor!' },
            images: [],
            profileImages: []
          };
          setResidentData(mockData);
          return;
        }
        
        // For real users, try to fetch data using just the username
        const data = await fetchResidentData(username);
        
        if (data) {
          setResidentData(data);
        } else {
          // Profile not found, use mock data for template editing
          const mockData = {
            owner: {
              id: user.id,
              handle: user.primaryHandle || 'user',
              displayName: user.profile?.displayName || 'User',
              avatarUrl: user.profile?.avatarUrl || '/assets/default-avatar.gif'
            },
            viewer: { id: null },
            posts: [
              { id: '1', contentHtml: 'This is a sample post for template preview', createdAt: new Date().toISOString() },
              { id: '2', contentHtml: 'Another sample post to show multiple entries', createdAt: new Date(Date.now() - 86400000).toISOString() }
            ],
            guestbook: [
              { id: '1', message: 'Welcome to the site!', authorUsername: 'visitor1', createdAt: new Date().toISOString() }
            ],
            capabilities: { bio: user.profile?.bio || 'This is a sample bio for template preview' },
            images: [],
            profileImages: []
          };
          setResidentData(mockData);
        }
      } catch (error) {
        console.error('EnhancedTemplateEditor: Failed to load resident data:', error);
        // Use mock data as fallback
        const mockData = {
          owner: {
            id: user.id,
            handle: user.primaryHandle || user.handles?.[0]?.handle || 'user',
            displayName: user.profile?.displayName || 'User',
            avatarUrl: user.profile?.avatarUrl || '/assets/default-avatar.gif'
          },
          viewer: { id: null },
          posts: [
            { id: '1', contentHtml: 'This is a test post', createdAt: new Date().toISOString() }
          ],
          guestbook: [],
          capabilities: { bio: user.profile?.bio || 'This is a test bio' },
          images: [],
          profileImages: []
        };
        setResidentData(mockData);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [user]);

  // Handle save
  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Handle standard layout mode differently
      if (useStandardLayout) {
        // For standard layout, we save with empty template to indicate using default layout
        // Standard layout always shows navigation (showNavigation = true)
        await onSave('', customCSS, undefined, cssMode, true);
        setSaveMessage('✓ Standard layout saved!');
        return;
      }
      
      // Ensure we have compiled template data before saving custom templates
      if (!compiledTemplate) {
        console.warn('EnhancedTemplateEditor: No compiled template data available. Make sure to preview the template first.');
        setSaveMessage('⚠️ Please preview the template first, then save');
        return;
      }
      
      await onSave(template, customCSS, compiledTemplate, cssMode, showNavigation);
      setSaveMessage('✓ Template saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage('✗ Failed to save template');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Stable callback for template compilation
  const handleCompile = useCallback((compiled: CompiledTemplate | null) => {
    setCompiledTemplate(compiled);
  }, []);

  // Stable callback for compilation errors
  const handleError = useCallback((error: string) => {
    console.error('Preview error:', error);
  }, []);

  // Load default template for preview when in standard layout mode
  const loadDefaultTemplateForPreview = useCallback(async () => {
    try {
      const fullHandle = user.primaryHandle || user.handles?.[0]?.handle;
      const username = fullHandle ? fullHandle.split('@')[0] : 'user';
      
      const response = await fetch(`/api/profile/${username}/template/default`); // Remove refresh param to allow caching
      if (response.ok) {
        const data = await response.json();
        return data.template; // Return just the template, don't change editor state
      }
    } catch (error) {
      console.error('Failed to load default template for preview:', error);
    }
    return null;
  }, [user.primaryHandle, user.handles]);

  // Load default template for preview when switching to standard layout
  useEffect(() => {
    if (useStandardLayout && !defaultTemplateForPreview && !loadingDefaultTemplate) {
      setLoadingDefaultTemplate(true);
      loadDefaultTemplateForPreview().then(template => {
        setDefaultTemplateForPreview(template);
        setLoadingDefaultTemplate(false);
      });
    }
  }, [useStandardLayout, defaultTemplateForPreview, loadingDefaultTemplate, loadDefaultTemplateForPreview]);

  // Sample templates - unified Islands approach (matches default exactly)
  const sampleTemplates = {
    basic: `<RetroCard>
  <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="md" />
</RetroCard>

<div class="profile-tabs-wrapper">
  <Tabs>
    <Tab title="Blog">
      <BlogPosts limit="5" />
    </Tab>
  </Tabs>
</div>`,
    
    advanced: `<RetroCard>
  <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="md" />
</RetroCard>

<div class="profile-tabs-wrapper">
  <Tabs>
    <Tab title="Blog">
      <BlogPosts limit="5" />
    </Tab>
    
    <Tab title="Media">
      <MediaGrid />
    </Tab>
    
    <Tab title="Friends / Websites">
      <FriendDisplay />
      <WebsiteDisplay />
    </Tab>
    
    <Tab title="Badges">
      <ProfileBadges showTitle="false" layout="grid" />
    </Tab>
    
    <Tab title="Guestbook">
      <Guestbook />
    </Tab>
  </Tabs>
</div>`,

    creative: `<RetroCard>
  <ProfileHeader showPhoto="true" showBio="true" showActions="true" photoSize="md" />
</RetroCard>

<div class="profile-tabs-wrapper">
  <Tabs>
    <Tab title="Blog">
      <BlogPosts limit="5" />
    </Tab>
    
    <Tab title="Media">
      <MediaGrid />
    </Tab>
    
    <Tab title="Friends / Websites">
      <FriendDisplay />
      <WebsiteDisplay />
    </Tab>
    
    <Tab title="Badges">
      <ProfileBadges showTitle="false" layout="grid" />
    </Tab>
    
    <Tab title="Guestbook">
      <Guestbook />
    </Tab>
  </Tabs>
</div>`
  };

  if (isLoading) {
    return (
      <div className="template-editor-loading p-8 text-center">
        <p>Loading editor...</p>
      </div>
    );
  }

  // Enhanced keyboard handling for tab indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, contentType: 'template' | 'css') => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = contentType === 'template' ? template : customCSS;
      const setter = contentType === 'template' ? setTemplate : setCustomCSS;
      
      if (e.shiftKey) {
        // Shift+Tab: Remove indentation
        const lines = currentValue.split('\n');
        const startLine = currentValue.substring(0, start).split('\n').length - 1;
        const endLine = currentValue.substring(0, end).split('\n').length - 1;
        
        let removedChars = 0;
        for (let i = startLine; i <= endLine; i++) {
          if (lines[i].startsWith('  ')) {
            lines[i] = lines[i].substring(2);
            removedChars += 2;
          } else if (lines[i].startsWith('\t')) {
            lines[i] = lines[i].substring(1);
            removedChars += 1;
          }
        }
        
        const newValue = lines.join('\n');
        setter(newValue);
        
        // Restore selection
        setTimeout(() => {
          textarea.selectionStart = Math.max(0, start - (startLine === endLine ? Math.min(removedChars, 2) : 0));
          textarea.selectionEnd = Math.max(0, end - removedChars);
        });
      } else {
        // Tab: Add indentation
        if (start === end) {
          // No selection, just insert tab
          const newValue = currentValue.substring(0, start) + '  ' + currentValue.substring(end);
          setter(newValue);
          
          // Move cursor
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          });
        } else {
          // Multiple lines selected, indent all
          const lines = currentValue.split('\n');
          const startLine = currentValue.substring(0, start).split('\n').length - 1;
          const endLine = currentValue.substring(0, end).split('\n').length - 1;
          
          for (let i = startLine; i <= endLine; i++) {
            lines[i] = '  ' + lines[i];
          }
          
          const newValue = lines.join('\n');
          setter(newValue);
          
          // Restore selection
          const addedChars = (endLine - startLine + 1) * 2;
          setTimeout(() => {
            textarea.selectionStart = start + 2;
            textarea.selectionEnd = end + addedChars;
          });
        }
      }
    }
  };

  return (
    <div className="enhanced-template-editor w-full">
      {/* Tab Navigation - exactly matching original style */}
      <div className="flex gap-1 px-4">
        <button
          onClick={() => setActiveTab('template')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'template'
              ? 'bg-thread-paper text-thread-charcoal border-t-2 border-l-2 border-r-2 border-thread-sage'
              : 'text-thread-sage hover:text-thread-charcoal hover:bg-thread-cream'
          }`}
        >
          HTML
        </button>
        <button
          onClick={() => setActiveTab('css')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'css'
              ? 'bg-thread-paper text-thread-charcoal border-t-2 border-l-2 border-r-2 border-thread-sage'
              : 'text-thread-sage hover:text-thread-charcoal hover:bg-thread-cream'
          }`}
        >
          CSS
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'preview'
              ? 'bg-thread-paper text-thread-charcoal border-t-2 border-l-2 border-r-2 border-thread-sage'
              : 'text-thread-sage hover:text-thread-charcoal hover:bg-thread-cream'
          }`}
        >
          {useStandardLayout ? 'Preview CSS' : 'Preview'}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {/* HTML Editor Tab */}
        {activeTab === 'template' && (
          <div className="w-full flex flex-col">
            {/* Editor Toolbar - matching original seamless style */}
            <div className="bg-thread-cream border-b border-thread-sage/30 border-l-2 border-r-2 border-thread-sage px-4 py-3 -mt-px">
              {/* Getting Started Guide - only show when NOT in standard layout */}
              {!useStandardLayout && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold text-purple-900">Advanced Layout Mode</h3>
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">Full HTML Control</span>
                  </div>
                
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <button
                      onClick={useStandardLayoutOption}
                      className="p-4 rounded-lg border bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-left transition-all"
                    >
                      <div className="font-semibold">
                        🎨 Switch to Fresh Start
                      </div>
                      <div className="text-sm mt-1 opacity-80">
                        Use CSS styling instead
                      </div>
                    </button>
                    
                    <div className="p-4 rounded-lg border bg-purple-50 border-purple-200 text-left">
                      <div className="font-semibold text-purple-800">
                        Pick a Theme
                      </div>
                      <div className="text-sm mt-1 text-purple-700">
                        Choose from templates below
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-100 rounded-lg p-3 text-sm text-purple-900">
                    <strong>Advanced Mode:</strong> Full control! You can modify the page structure and use our components.
                  </div>
                </div>
              )}

              {/* Fresh Start Guide - only show when in standard layout */}
              {useStandardLayout && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold text-blue-900">Fresh Start Mode</h3>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">New to profile building? Start here! ⭐</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <button
                      onClick={loadDefaultTemplate}
                      disabled={loadingDefault}
                      className="p-4 rounded-lg border bg-white border-gray-300 hover:border-green-400 hover:bg-green-50 text-left transition-all"
                    >
                      <div className="font-semibold">
                        ⚙️ Advanced Layouts
                      </div>
                      <div className="text-sm mt-1 opacity-80">
                        {loadingDefault ? 'Loading...' : 'Edit HTML structure directly'}
                      </div>
                    </button>
                    
                    <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 text-left">
                      <div className="font-semibold text-blue-800">
                        Pick a Theme
                      </div>
                      <div className="text-sm mt-1 text-blue-700">
                        Choose from CSS templates below
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-100 rounded-lg p-3 text-sm text-blue-900">
                    <strong>Fresh Start Mode:</strong> Perfect for CSS styling! The page layout is handled for you - just add your custom styles in the CSS tab.
                    Great for beginners and those who want to focus on colors, fonts, and visual design.
                  </div>
                </div>
              )}

              {/* Template Gallery */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-thread-pine">
                    Template Gallery
                  </h4>
                  <div className="flex gap-2">
                    <select
                      onChange={(e) => {
                        const selectedTemplate = TEMPLATE_EXAMPLES[e.target.value as keyof typeof TEMPLATE_EXAMPLES];
                        if (selectedTemplate) {
                          showDataLossWarning(
                            "Load Component Template",
                            `This will replace your current HTML and CSS with the "${selectedTemplate.name || e.target.value}" template. Any unsaved changes will be lost.`,
                            () => {
                              setUseStandardLayout(false); // Switch to custom template mode
                              setTemplate(selectedTemplate.template);
                              setCustomCSS(selectedTemplate.css);
                              setCSSMode('disable');
                            }
                          );
                          e.target.value = ''; // Reset selector
                        }
                      }}
                      className="text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      defaultValue=""
                    >
                      <option value="">Modern Templates</option>
                      {Object.entries(TEMPLATE_EXAMPLES).map(([key, template]) => (
                        <option key={key} value={key}>
                          {template.name}
                        </option>
                      ))}
                    </select>

                    <select
                      onChange={(e) => {
                        const templateId = e.target.value;
                        if (templateId) {
                          const htmlTemplate = getHTMLTemplate(templateId);
                          const templateName = HTML_TEMPLATES.find(t => t.id === templateId)?.name || templateId;
                          
                          showDataLossWarning(
                            "Load Legacy Template",
                            `This will replace your current HTML and CSS with the "${templateName}" template. Any unsaved changes will be lost.`,
                            () => {
                              // Parse out the CSS from the HTML template
                              const styleMatch = htmlTemplate.match(/<style[^>]*>([\s\S]*?)<\/style>/);
                              const css = styleMatch ? styleMatch[1] : '';
                              const html = htmlTemplate.replace(/<style[^>]*>[\s\S]*?<\/style>/, '').trim();
                              
                              setUseStandardLayout(false); // Switch to custom template mode
                              setTemplate(html);
                              setCustomCSS(css);
                              setCSSMode('disable'); // HTML templates use disable mode
                            }
                          );
                          e.target.value = ''; // Reset selector
                        }
                      }}
                      className="text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      defaultValue=""
                    >
                      <option value="">Classic Templates</option>
                      {HTML_TEMPLATES.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Pick a template to get started quickly, then customize it to your liking!
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <a 
                    href="/design-tutorial" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                  >
                    Need Help?
                  </a>
                  
                  {saveMessage && (
                    <span className={`text-sm font-medium px-3 py-2 rounded-lg ${
                      saveMessage.includes('✓') 
                        ? 'text-green-700 bg-green-100' 
                        : 'text-red-700 bg-red-100'
                    }`}>
                      {saveMessage}
                    </span>
                  )}
                  
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save & Go Live!'}
                  </button>
                </div>
              </div>
            </div>

            {/* HTML Code Editor - matching original style */}
            <div className="w-full">
              <div className="px-4 py-4">
                {useStandardLayout ? (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                          Standard Layout Mode
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>Your profile uses ThreadStead&apos;s default layout with navigation, blog tabs, guestbook, and all standard components.</p>
                          <p className="mt-2"><strong>Navigation and site styling will work perfectly</strong> - no CSS loading issues!</p>
                          <p className="mt-2">To customize colors, fonts, or spacing, use the <strong>CSS tab</strong> to add your styles, then check the <strong>Preview CSS tab</strong> to see how it looks!</p>
                          <p className="mt-2 text-xs text-blue-600">Switch to &quot;Custom Template&quot; only if you need to modify the HTML structure or component layout.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="block mb-3">
                      <span className="thread-label text-lg">Custom Template HTML</span>
                      <span className="text-sm text-thread-sage ml-2">Use Tab/Shift+Tab for indentation</span>
                    </label>
                    <div className="mb-3 text-sm text-thread-sage bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                      <strong>Custom Template Mode:</strong> You can modify the HTML structure using Islands components. 
                      This creates an editable version of the default layout that you can customize.
                    </div>
                    
                    {/* Navigation Toggle for Custom Templates */}
                    <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="showNavigation"
                          checked={showNavigation}
                          onChange={(e) => setShowNavigation(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="showNavigation" className="text-sm font-medium text-blue-800">
                          Show Site Navigation
                        </label>
                      </div>
                      <p className="text-xs text-blue-600 mt-1 ml-7">
                        Check this to show the site navigation bar above your template. Uncheck for full template control.
                      </p>
                    </div>
                    <textarea
                      value={template}
                      onChange={(e) => setTemplate(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'template')}
                      className="code-editor-textarea w-full border border-thread-sage p-4 bg-thread-paper rounded font-mono text-sm resize-vertical focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                      placeholder="Enter your template HTML here..."
                      spellCheck={false}
                      rows={25}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CSS Editor Tab */}
        {activeTab === 'css' && (
          <div className="w-full flex flex-col">
            {/* CSS Editor Toolbar - matching original style */}
            <div className="bg-thread-cream border-b border-thread-sage/30 border-l-2 border-r-2 border-thread-sage px-4 py-2 -mt-px">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-thread-sage">
                    {useStandardLayout ? 'Style the standard layout' : 'Style your custom template'}
                  </span>
                  
                  {/* CSS Mode Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-thread-sage">Site-wide CSS:</span>
                    <select
                      value={cssMode}
                      onChange={(e) => setCSSMode(e.target.value as 'inherit' | 'override' | 'disable')}
                      className="text-xs px-2 py-1 border border-thread-sage rounded bg-thread-paper hover:bg-thread-cream"
                      disabled={useStandardLayout} // Standard layout should always inherit
                    >
                      <option value="inherit">Inherit (add styles to site defaults)</option>
                      <option value="override">Override (your CSS takes precedence)</option>
                      <option value="disable">Disable (complete CSS control)</option>
                    </select>
                  </div>
                  
                  {/* CSS Template Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-thread-sage">Template:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value === '') return;
                        const templateCSS = getDefaultTemplate(e.target.value as any);
                        setCustomCSS(templateCSS);
                        // Reset the selector
                        e.target.value = '';
                      }}
                      className="text-xs px-2 py-1 border border-thread-sage rounded bg-thread-paper hover:bg-thread-cream"
                    >
                      <option value="">Load Template...</option>
                      <option value="full">Classic (Colorful GeoCities)</option>
                      <option value="minimal">Minimal (Clean & Simple)</option>
                      <option value="dark">Dark Theme</option>
                      <option value="advanced">Advanced Layout</option>
                      <option value="gaming">Retro Gaming</option>
                      <option value="newspaper">Newspaper</option>
                      <option value="fantasy">Medieval Fantasy</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a 
                    href="/design-css-tutorial" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="thread-button-secondary text-sm"
                  >
                    CSS Guide
                  </a>
                  
                  {saveMessage && (
                    <span className={`text-sm ${saveMessage.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
                      {saveMessage}
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="thread-button text-sm"
                  >
                    {isSaving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>
            </div>

            {/* CSS Code Editor - matching original style */}
            <div className="w-full">
              <div className="px-4 py-4">
                <label className="block mb-3">
                  <span className="thread-label text-lg">
                    {useStandardLayout ? 'Custom CSS for Standard Layout' : 'Template CSS'}
                  </span>
                  <span className="text-sm text-thread-sage ml-2">Use Tab/Shift+Tab for indentation</span>
                </label>
                
                {/* CSS Mode Explanation */}
                <div className={`mb-3 text-sm p-3 rounded border-l-4 ${
                  cssMode === 'inherit' 
                    ? 'bg-green-50 border-green-400 text-green-700'
                    : cssMode === 'override'
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-700' 
                    : 'bg-red-50 border-red-400 text-red-700'
                }`}>
                  {cssMode === 'inherit' && (
                    <>
                      <strong>Inherit Mode:</strong> Your CSS will extend the site&apos;s default styles. 
                      Navigation, colors, and typography will use ThreadStead&apos;s design system. 
                      {useStandardLayout ? ' Perfect for styling the standard layout.' : ' Great for custom templates that want to feel integrated.'}
                    </>
                  )}
                  {cssMode === 'override' && (
                    <>
                      <strong>⚠️ Override Mode:</strong> Your CSS takes precedence over site styles. 
                      You can completely change colors, fonts, and layout while keeping navigation functional.
                      {useStandardLayout && ' Note: This affects the entire profile page appearance.'}
                      {!useStandardLayout && (
                        <>
                          <br/><br/>
                          <strong>💡 Styling Help:</strong> See the <a href="/examples/advanced-template-styling-guide.md" target="_blank" className="text-blue-600 hover:text-blue-800 underline">Advanced Template Styling Guide</a> for examples of how to style ThreadStead components.
                        </>
                      )}
                    </>
                  )}
                  {cssMode === 'disable' && (
                    <>
                      <strong>🚫 Disable Mode:</strong> Complete CSS control - site styles are disabled. 
                      You must style everything from scratch. Consider hiding navigation for full template control.
                      {useStandardLayout && ' Warning: Standard layout requires site CSS to function properly.'}
                      {!useStandardLayout && (
                        <>
                          <br/><br/>
                          <strong>💡 Styling Help:</strong> Check out our <a href="/examples/advanced-template-styling-guide.md" target="_blank" className="text-blue-600 hover:text-blue-800 underline">styling guide</a> and <a href="/examples/threadstead-component-styling.css" target="_blank" className="text-blue-600 hover:text-blue-800 underline">CSS examples</a> for ThreadStead components.
                        </>
                      )}
                    </>
                  )}
                </div>
                <textarea
                  value={customCSS}
                  onChange={(e) => setCustomCSS(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'css')}
                  className="code-editor-textarea w-full border border-thread-sage p-4 bg-thread-paper rounded font-mono text-sm resize-vertical focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                  placeholder={cssMode === 'inherit' ? 
                    `/* Site styles will be inherited - extend them here */

.profile-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  border-radius: 8px;
}

.blog-posts {
  margin-top: 2rem;
}` :
                    cssMode === 'override' ?
                    `/* Your CSS will override site styles */

.profile-header {
  background: #ffffff !important;
  border: 2px solid #000000 !important;
  padding: 1rem !important;
}

.blog-posts {
  font-family: 'Courier New', monospace !important;
}` :
                    `/* Complete control - no site CSS loaded */

body {
  font-family: Georgia, serif;
  background: #f8f9fa;
  margin: 0;
}

.profile-header {
  background: white;
  padding: 2rem;
  border: 1px solid #ddd;
  margin-bottom: 2rem;
}`
                  }
                  spellCheck={false}
                  rows={25}
                />
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab - Full Page */}
        {activeTab === 'preview' && (
          <div className="w-full flex flex-col">
            <div className="bg-thread-cream border-b border-thread-sage/30 border-l-2 border-r-2 border-thread-sage px-4 py-2 -mt-px">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="thread-label text-sm">Live Preview</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    🏝️ Islands Mode
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {saveMessage && (
                    <span className={`text-sm ${saveMessage.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
                      {saveMessage}
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="thread-button text-sm"
                  >
                    {isSaving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>
            </div>

            <div className={`editor-preview-container border border-thread-sage/30 mx-2 my-2 rounded overflow-hidden shadow-lg ${useStandardLayout ? 'bg-transparent' : 'bg-white'}`}>
              {!residentData && (
                <div className="p-4 text-center text-thread-sage">
                  Loading preview data... {user?.primaryHandle ? `for ${user.primaryHandle}` : ''}
                </div>
              )}
              {residentData && (
                <StandardLayoutPreview
                  user={user}
                  template={template}
                  customCSS={customCSS}
                  cssMode={cssMode}
                  useStandardLayout={useStandardLayout}
                  showNavigation={showNavigation}
                  residentData={residentData}
                  onCompile={handleCompile}
                  onError={handleError}
                  defaultTemplate={defaultTemplateForPreview}
                  loadingDefaultTemplate={loadingDefaultTemplate}
                  siteWideCSS={siteWideCSS}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Component reference - matching original footer */}
      <div className="editor-footer bg-thread-cream border-t border-thread-sage/30 p-4">
        <details className="text-sm">
          <summary className="cursor-pointer font-medium mb-2">Available Components</summary>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              'ProfilePhoto', 'DisplayName', 'Bio', 'BlogPosts', 'Guestbook',
              'FollowButton', 'FriendDisplay', 'WebsiteDisplay', 'ProfileHero',
              'Tabs', 'Tab', 'RetroTerminal', 'GradientBox', 'NeonBorder', 
              'PolaroidFrame', 'StickyNote', 'FloatingBadge'
            ].map(comp => (
              <code key={comp} className="bg-thread-paper px-2 py-1 rounded text-xs border border-thread-sage/20">
                &lt;{comp} /&gt;
              </code>
            ))}
          </div>
        </details>
      </div>

      {/* Data Loss Warning Dialog */}
      <DataLossWarning
        isOpen={warningDialog.isOpen}
        onClose={closeWarning}
        onConfirm={confirmWarningAction}
        title={warningDialog.title}
        message={warningDialog.message}
      />
    </div>
  );
}