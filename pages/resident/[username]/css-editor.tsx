import React, { useState, useEffect, useRef, useCallback } from "react";
import type { GetServerSideProps, NextApiRequest } from "next";
import { useRouter } from "next/router";
import Head from "next/head";

import Layout from "@/components/Layout";
import { fetchResidentData, fetchCurrentUserResidentData } from '@/lib/template-data';
import type { ResidentData } from '@/components/template/ResidentDataProvider';
import { useSiteConfig } from '@/hooks/useSiteConfig';

// Import CSS templates
import { DEFAULT_CSS_TEMPLATE } from '@/lib/templates/default';
import { MINIMAL_CSS_TEMPLATE } from '@/lib/templates/minimal';
import { DARK_THEME_TEMPLATE } from '@/lib/templates/dark';
import { RETRO_GAMING_TEMPLATE } from '@/lib/templates/gaming';
import { MEDIEVAL_FANTASY_TEMPLATE } from '@/lib/templates/medieval';
import { NEWSPAPER_TEMPLATE } from '@/lib/templates/newspaper';
import { ADVANCED_LAYOUT_TEMPLATE } from '@/lib/templates/advanced';

interface CSSEditorPageProps {
  username: string;
  isOwner: boolean;
  existingCSS?: string;
  templateMode?: 'default' | 'enhanced' | 'advanced';
  templateEnabled?: boolean;
  initialIncludeSiteCSS?: boolean;
}


export default function CSSEditorPage({
  username,
  isOwner,
  existingCSS = '',
  templateMode = 'default',
  templateEnabled = false,
  initialIncludeSiteCSS = true
}: CSSEditorPageProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { config: siteConfig } = useSiteConfig();
  
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [css, setCSS] = useState(existingCSS);
  const [residentData, setResidentData] = useState<ResidentData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [includeSiteCSS, setIncludeSiteCSS] = useState(initialIncludeSiteCSS);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  
  // Track the current layout mode
  const [layoutMode, setLayoutMode] = useState<'default' | 'custom-css'>(() => {
    if (templateEnabled) return 'custom-css'; // If template is enabled, default to enhanced mode for CSS editor
    return templateMode === 'enhanced' ? 'custom-css' : 'default';
  });

  // CSS Template selector state
  const [showTemplates, setShowTemplates] = useState(false);

  // Function to handle template selection with confirmation
  const handleTemplateSelect = (template: typeof cssTemplates[0]) => {
    const hasExistingCSS = css.trim() && css.trim() !== '/* Add your custom CSS here */';
    
    if (hasExistingCSS) {
      const confirmed = window.confirm(
        `You have existing CSS. Selecting "${template.name}" will replace your current CSS. Are you sure you want to continue?`
      );
      if (!confirmed) return;
    }
    
    setCSS(template.css);
    setShowTemplates(false);
  };

  const handleClearCSS = () => {
    const confirmed = window.confirm(
      'This will clear your CSS completely. Are you sure?'
    );
    if (confirmed) {
      setCSS('/* Add your custom CSS here */\n\n');
    }
  };

  // Check if current CSS matches any template
  const getCurrentTemplate = () => {
    return cssTemplates.find(template => css.trim() === template.css.trim());
  };

  // CSS Templates
  const cssTemplates = [
    {
      id: 'blank',
      name: 'Blank Canvas',
      description: 'Start from scratch with empty CSS',
      css: '/* Add your custom CSS here */\n\n'
    },
    {
      id: 'default',
      name: 'GeoCities Classic',
      description: '90s nostalgia with rainbow gradients and Comic Sans',
      css: DEFAULT_CSS_TEMPLATE
    },
    {
      id: 'minimal',
      name: 'Clean & Simple',
      description: 'Minimal design perfect for personal pages',
      css: MINIMAL_CSS_TEMPLATE
    },
    {
      id: 'dark',
      name: 'Hacker Terminal',
      description: 'Matrix-inspired dark theme with green text',
      css: DARK_THEME_TEMPLATE
    },
    {
      id: 'gaming',
      name: 'Retro Gaming',
      description: 'Pixel perfect gaming nostalgia',
      css: RETRO_GAMING_TEMPLATE
    },
    {
      id: 'medieval',
      name: 'Medieval Fantasy',
      description: 'Medieval scroll design with fantasy elements',
      css: MEDIEVAL_FANTASY_TEMPLATE
    },
    {
      id: 'newspaper',
      name: 'Daily Tribune',
      description: 'Classic newspaper layout',
      css: NEWSPAPER_TEMPLATE
    },
    {
      id: 'advanced',
      name: 'Modern Professional',
      description: 'Contemporary design with clean typography',
      css: ADVANCED_LAYOUT_TEMPLATE
    }
  ];

  // Fetch real resident data on component mount
  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      try {
        let data: ResidentData | null = null;
        
        if (username) {
          data = await fetchResidentData(username);
        } else {
          data = await fetchCurrentUserResidentData();
        }
        
        setResidentData(data);
      } catch (error) {
        console.error('Failed to load resident data:', error);
      } finally {
        setDataLoading(false);
      }
    }
    
    loadData();
  }, [username]);


  // Enhanced keyboard handling for tab indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (e.shiftKey) {
        // Shift+Tab: Remove indentation
        const lines = textarea.value.split('\n');
        const startLine = textarea.value.substring(0, start).split('\n').length - 1;
        const endLine = textarea.value.substring(0, end).split('\n').length - 1;
        
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
        setCSS(newValue);
        
        // Restore selection
        setTimeout(() => {
          textarea.selectionStart = Math.max(0, start - (startLine === endLine ? Math.min(removedChars, 2) : 0));
          textarea.selectionEnd = Math.max(0, end - removedChars);
        });
      } else {
        // Tab: Add indentation
        if (start === end) {
          // No selection, just insert tab
          const newValue = css.substring(0, start) + '  ' + css.substring(end);
          setCSS(newValue);
          
          // Move cursor
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          });
        } else {
          // Multiple lines selected, indent all
          const lines = textarea.value.split('\n');
          const startLine = textarea.value.substring(0, start).split('\n').length - 1;
          const endLine = textarea.value.substring(0, end).split('\n').length - 1;
          
          for (let i = startLine; i <= endLine; i++) {
            lines[i] = '  ' + lines[i];
          }
          
          const newValue = lines.join('\n');
          setCSS(newValue);
          
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

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      // First save the CSS
      const response = await fetch(`/api/profile/${username}/css`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customCSS: css }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || "Failed to save CSS"}`);
        return;
      }

      // Automatically set to enhanced mode when saving CSS (unless it's empty/default)
      const hasCustomCSS = css.trim() && css.trim() !== '/* Add your custom CSS here */';
      const autoLayoutMode = hasCustomCSS ? 'enhanced' : 'default';
      
      // Update layout mode to match CSS content
      setLayoutMode(hasCustomCSS ? 'custom-css' : 'default');
      
      // Save the layout mode preference and includeSiteCSS setting
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        setSaveMessage("Error: Please log in.");
        return;
      }
      const { token } = await capRes.json();

      const layoutResponse = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          templateMode: autoLayoutMode,
          includeSiteCSS: includeSiteCSS,
          cap: token 
        }),
      });

      if (!layoutResponse.ok) {
        const errorData = await layoutResponse.json();
        setSaveMessage(`Error: ${errorData.error || "Failed to save layout mode"}`);
        return;
      }

      const modeMessage = hasCustomCSS 
        ? "CSS saved and applied to your profile!" 
        : "CSS cleared - profile set to default layout!";
      setSaveMessage(modeMessage);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage(`Error: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  // Track preview error state
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Update iframe src to use dedicated preview page
  const updateIframeContent = useCallback(() => {
    if (!iframeRef.current || !residentData) {
      return;
    }

    try {
      const previewParams = new URLSearchParams({
        customCSS: css,
        includeSiteCSS: includeSiteCSS.toString(),
        bio: residentData.capabilities?.bio || 'Welcome to my profile!',
        photoUrl: residentData.owner.avatarUrl || '/assets/default-avatar.gif'
      });

      const previewUrl = `/resident/${username}/css-preview?${previewParams.toString()}`;
      
      // Check if URL is too long (likely to cause 431 error)  
      // Account for URL encoding expansion - be more generous with the limit
      if (previewUrl.length > 16000) {
        console.log('Preview URL too long:', previewUrl.length, 'characters');
        setPreviewError("CSS is too large to preview. Your CSS will still work on your actual profile page, but cannot be shown in the preview panel.");
        return;
      }

      // Clear any previous error
      setPreviewError(null);
      
      // Update iframe src to use preview page instead of srcdoc
      if (iframeRef.current) {
        // Add loading handler to detect successful loads
        const handleLoad = () => {
          // Clear any error state on successful load
          setPreviewError(null);
        };

        const handleError = () => {
          setPreviewError("Preview failed to load. Your CSS may be too large for the preview, but will still work on your profile.");
        };

        iframeRef.current.onload = handleLoad;
        iframeRef.current.onerror = handleError;
        iframeRef.current.src = previewUrl;
      }
    } catch (error) {
      console.error('Error updating iframe content:', error);
      setPreviewError("Error loading preview. Your CSS will still work on your profile.");
    }
  }, [residentData, css, includeSiteCSS, username]);

  // Update iframe when CSS, data, or includeSiteCSS changes and preview tab is active
  useEffect(() => {
    if (activeTab === 'preview') {
      updateIframeContent();
    }
  }, [css, residentData, activeTab, includeSiteCSS, updateIframeContent]);

  // Clear preview error when switching away from preview tab
  useEffect(() => {
    if (activeTab !== 'preview') {
      setPreviewError(null);
    }
  }, [activeTab]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettingsDropdown && !(event.target as Element).closest('.relative')) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsDropdown]);

  const renderPreview = () => {
    if (dataLoading) {
      return (
        <div className="flex items-center justify-center text-thread-sage" style={{ height: '800px' }}>
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-thread-pine border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading user data...</p>
          </div>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="flex items-center justify-center text-thread-sage bg-thread-paper" style={{ height: '800px' }}>
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-thread-pine mb-2">Preview Not Available</h3>
            <p className="text-thread-sage mb-4">{previewError}</p>
            <div className="text-sm text-thread-stone">
              <p className="mb-2">✅ Your CSS will still work on your profile</p>
              <p>💡 Try reducing the CSS size to enable preview</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <iframe
        ref={iframeRef}
        className="w-full border-0"
        style={{ 
          backgroundColor: 'white',
          height: '800px',
          width: '100%'
        }}
        sandbox="allow-scripts allow-same-origin"
        title="CSS Preview"
      />
    );
  };

  const handleBackToProfile = () => {
    router.push(`/resident/${username}`);
  };

  const handleBackToEdit = () => {
    router.push(`/resident/${username}/edit`);
  };

  if (!isOwner) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
              <p className="mb-4">You can only edit your own profile CSS.</p>
              <button onClick={handleBackToProfile} className="thread-button">
                Back to Profile
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>{`CSS Editor - ${username} | ThreadStead`}</title>
      </Head>
      <Layout fullWidth={true}>
        <div className="flex flex-col bg-white css-editor-page w-full" style={{ minHeight: '100vh', maxWidth: '100vw', margin: '0', padding: '0' }}>
          {/* Header - Streamlined */}
          <div className="bg-white border-b border-thread-sage/30 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">CSS Editor</h1>
                <span className="text-thread-sage text-sm">@{username}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleBackToEdit} 
                  className="thread-button-secondary text-xs px-2 py-1"
                >
                  ← Edit Profile
                </button>
                <button 
                  onClick={handleBackToProfile} 
                  className="thread-button text-xs px-2 py-1"
                >
                  View Profile
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'editor'
                    ? 'bg-thread-paper text-thread-charcoal border-t-2 border-l-2 border-r-2 border-thread-sage'
                    : 'text-thread-sage hover:text-thread-charcoal hover:bg-thread-cream'
                }`}
              >
                🎨 Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-thread-paper text-thread-charcoal border-t-2 border-l-2 border-r-2 border-thread-sage'
                    : 'text-thread-sage hover:text-thread-charcoal hover:bg-thread-cream'
                }`}
              >
                👁️ Preview
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Editor Tab */}
            {activeTab === 'editor' && (
              <div className="w-full flex flex-col">
                {/* Editor Toolbar - Seamlessly connected to tabs */}
                <div className="bg-thread-cream border-b border-thread-sage/30 border-l-2 border-r-2 border-thread-sage px-4 py-2 -mt-px">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <a 
                        href="/design-css-tutorial" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="thread-button-secondary text-xs px-2 py-1"
                      >
                        🎯 Guide
                      </a>
                      <a 
                        href="https://developer.mozilla.org/en-US/docs/Web/CSS" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="thread-button-secondary text-xs px-2 py-1"
                      >
                        📚 Docs
                      </a>
                      
                      {/* Settings Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                          className="thread-button-secondary text-xs px-2 py-1"
                        >
                          ⚙️ Settings
                        </button>
                        
                        {showSettingsDropdown && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-thread-sage rounded shadow-lg py-2 px-3 min-w-64 z-50">
                            <div className="space-y-3">
                              {/* Include Site CSS Toggle */}
                              <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={includeSiteCSS}
                                    onChange={(e) => setIncludeSiteCSS(e.target.checked)}
                                    className="w-4 h-4 text-thread-pine rounded border-thread-sage focus:ring-thread-pine"
                                  />
                                  <span className="text-sm font-medium text-thread-charcoal">Include site styles</span>
                                </label>
                                <p className="text-xs text-thread-sage mt-1 ml-6">
                                  {includeSiteCSS ? 'Includes admin customizations' : 'Clean canvas for full control'}
                                </p>
                              </div>
                              
                              {/* Layout Mode */}
                              <div>
                                <div className="text-sm font-medium text-thread-charcoal mb-2">Layout Mode:</div>
                                <div className="space-y-2 ml-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="cssLayoutMode"
                                      value="default"
                                      checked={layoutMode === 'default'}
                                      onChange={() => setLayoutMode('default')}
                                      className="text-thread-pine"
                                    />
                                    <span className="text-sm">Default Layout</span>
                                  </label>
                                  
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="cssLayoutMode"
                                      value="custom-css"
                                      checked={layoutMode === 'custom-css'}
                                      onChange={() => setLayoutMode('custom-css')}
                                      className="text-thread-pine"
                                    />
                                    <span className="text-sm">Default + Custom CSS</span>
                                  </label>
                                </div>
                                <p className="text-xs text-thread-sage mt-1 ml-2">
                                  {layoutMode === 'default' ? 'CSS saved but not applied' : 'CSS applied to your profile'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="thread-button text-sm"
                      >
                        {saving ? "Saving..." : "💾 Save"}
                      </button>
                    </div>
                  </div>
                  
                  {/* CSS Template Selector */}
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="px-3 py-1 text-xs border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all"
                      >
                        🎨 CSS Templates
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCSS}
                        className="px-3 py-1 text-xs border border-red-300 bg-red-100 hover:bg-red-200 text-red-700 rounded shadow-sm transition-all"
                      >
                        🗑️ Clear
                      </button>
                    </div>

                    {/* Template Selection Panel */}
                    {showTemplates && (
                      <div className="bg-thread-cream border border-thread-sage rounded-lg p-4 space-y-4">
                        <div>
                          <h3 className="thread-label text-sm mb-2">Choose a CSS template to get started:</h3>
                          <p className="text-xs text-gray-600 mb-3">
                            Templates provide pre-designed styles for the default profile layout. You can customize them after applying.
                          </p>
                        </div>

                        {/* Template Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {cssTemplates.map((template) => {
                            const isCurrentTemplate = getCurrentTemplate()?.id === template.id;
                            return (
                              <div
                                key={template.id}
                                className={`border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer ${
                                  isCurrentTemplate 
                                    ? 'border-thread-pine bg-thread-pine/10' 
                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                }`}
                                onClick={() => handleTemplateSelect(template)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-sm text-gray-800">{template.name}</h4>
                                  <span className={`px-2 py-0.5 text-xs rounded border ${
                                    isCurrentTemplate 
                                      ? 'bg-thread-pine text-white border-thread-pine' 
                                      : template.id === 'blank'
                                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                                        : 'bg-purple-100 text-purple-800 border-purple-200'
                                  }`}>
                                    {isCurrentTemplate ? '✓ Active' : template.id === 'blank' ? '📝 Custom' : '🎨 Template'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                                <div className="text-xs text-gray-500">
                                  {template.css.split('\n').length} lines of CSS
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Template Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
                          <h4 className="font-medium text-blue-800 mb-1">💡 CSS Template Tips:</h4>
                          <ul className="text-blue-700 space-y-1 ml-4 list-disc">
                            <li>Templates style the default profile layout components</li>
                            <li>You can mix and match styles from different templates</li>
                            <li>All templates are mobile-responsive</li>
                            <li>Use &quot;Clear&quot; to start with a blank stylesheet</li>
                          </ul>
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <p className="text-blue-600 font-medium">
                              📖 Check the <a href="/design-css-tutorial" target="_blank" className="underline hover:text-blue-800">Complete CSS Classes Guide</a> to learn which specific classes you can target!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                </div>

                {/* Code Editor - Natural Height */}
                <div className="w-full">
                  <div className="px-4 py-4">
                    <label className="block mb-3">
                      <span className="thread-label text-lg">Custom CSS</span>
                      <span className="text-sm text-thread-sage ml-2">Use Tab/Shift+Tab for indentation</span>
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={css}
                      onChange={(e) => setCSS(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full border border-thread-sage p-4 bg-thread-paper rounded font-mono text-sm resize-vertical focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                      placeholder="/* Add your custom CSS here */\n\n.profile-container {\n  /* Your styles */\n}"
                      spellCheck={false}
                      rows={25}
                      style={{ 
                        fontFamily: "'Fira Code', 'Consolas', 'Monaco', 'Menlo', monospace",
                        lineHeight: '1.5',
                        tabSize: 2
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Preview Tab - Expanded */}
            {activeTab === 'preview' && (
              <div className="w-full flex flex-col">
                <div className="bg-thread-cream border-b border-thread-sage/30 border-l-2 border-r-2 border-thread-sage px-4 py-2 -mt-px">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="thread-label text-sm">Live Preview</span>
                    </div>
                    
                    <button 
                      onClick={handleSave} 
                      disabled={saving}
                      className="thread-button text-sm"
                    >
                      {saving ? "Saving..." : "Save CSS"}
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-thread-sage/30 mx-2 my-2 rounded overflow-hidden shadow-lg" style={{ minHeight: '800px' }}>
                  {renderPreview()}
                </div>
              </div>
            )}

          </div>

          {/* Footer with messages - Full Width */}
          {saveMessage && (
            <div className="bg-white border-t border-thread-sage/30 px-4 py-4 shadow-sm">
              <div className={`p-3 rounded ${
                saveMessage.includes("Error") 
                  ? "bg-red-100 text-red-700 border border-red-300" 
                  : "bg-green-100 text-green-700 border border-green-300"
              }`}>
                {saveMessage}
              </div>
            </div>
          )}

        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<CSSEditorPageProps> = async ({ 
  params, 
  req
}) => {
  const username = Array.isArray(params?.username) ? params.username[0] : String(params?.username || "");
  if (!username) return { notFound: true };

  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  const host = req?.headers?.host || "localhost:3000";
  const base = `${proto}://${host}`;

  try {
    // Get current user session
    const { getSessionUser } = await import('@/lib/auth-server');
    const currentUser = await getSessionUser(req as NextApiRequest);

    if (!currentUser) {
      return {
        redirect: {
          destination: `/identity?redirect=${encodeURIComponent(`/resident/${username}/css-editor`)}`,
          permanent: false,
        },
      };
    }

    // Get profile data
    const profileRes = await fetch(`${base}/api/profile/${encodeURIComponent(username)}`);
    if (profileRes.status === 404) return { notFound: true };
    
    if (!profileRes.ok) {
      return {
        props: {
          username,
          isOwner: false,
        },
      };
    }

    const profileData = await profileRes.json();
    let currentUsername = null;
    if (currentUser.primaryHandle) {
      currentUsername = currentUser.primaryHandle.split("@")[0];
    }
    
    const isOwner = (
      (currentUsername && currentUsername.toLowerCase() === username.toLowerCase()) ||
      (currentUser.id && profileData.userId && currentUser.id === profileData.userId)
    );

    // Get existing CSS and template settings
    let existingCSS = "";
    let templateMode: 'default' | 'enhanced' | 'advanced' = 'default';
    let templateEnabled = false;
    let initialIncludeSiteCSS = true;
    
    if (isOwner) {
      existingCSS = profileData.profile?.customCSS || "";
      templateMode = profileData.profile?.templateMode || 'default';
      templateEnabled = profileData.profile?.templateEnabled || false;
      initialIncludeSiteCSS = profileData.profile?.includeSiteCSS !== false; // Default to true
    }

    return {
      props: {
        username,
        isOwner,
        existingCSS,
        templateMode,
        templateEnabled,
        initialIncludeSiteCSS,
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    return { notFound: true };
  }
};