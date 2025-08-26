import React, { useState, useEffect, useRef } from "react";
import { renderToString } from "react-dom/server";
import type { GetServerSideProps, NextApiRequest } from "next";
import { useRouter } from "next/router";
import Head from "next/head";

import Layout from "@/components/Layout";
import { TemplateEngine } from '@/lib/template-engine';
import { renderTemplate } from '@/lib/template-renderer';
import { fetchResidentData, fetchCurrentUserResidentData } from '@/lib/template-data';
import HTMLTemplateSelector from '@/components/HTMLTemplateSelector';
import type { TemplateNode } from '@/lib/template-parser';
import type { ResidentData } from '@/components/template/ResidentDataProvider';
import { ResidentDataProvider } from '@/components/template/ResidentDataProvider';

interface TemplateEditorPageProps {
  username: string;
  isOwner: boolean;
  existingTemplate?: string;
  customCSS?: string;
  templateEnabled?: boolean;
}

export default function TemplateEditorPage({
  username,
  isOwner,
  existingTemplate,
  templateEnabled = false
}: TemplateEditorPageProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'preview'>('html');
  // Separate HTML and CSS content
  const [htmlContent, setHtmlContent] = useState(() => {
    // Extract HTML content (remove style tags)
    const cleanHTML = (existingTemplate || `<DisplayName />\n<Bio />`)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .trim();
    return cleanHTML || `<DisplayName />\n<Bio />`;
  });
  
  const [cssContent, setCssContent] = useState(() => {
    // Extract CSS from style tags
    const styleMatch = (existingTemplate || '').match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    return styleMatch ? styleMatch[1].trim() : '/* Add your custom CSS here */\n\n';
  });
  
  // Combine HTML and CSS for processing
  const template = `${htmlContent}${cssContent.trim() ? `\n<style>\n${cssContent}\n</style>` : ''}`;
  const [mode, setMode] = useState<'custom-tags' | 'data-attributes'>('custom-tags');
  const [compiledAst, setCompiledAst] = useState<TemplateNode | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [residentData, setResidentData] = useState<ResidentData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
        
        if (!data) {
          data = TemplateEngine.createMockData(username || 'testuser');
        }
        
        setResidentData(data);
      } catch (error) {
        console.error('Failed to load resident data:', error);
        setResidentData(TemplateEngine.createMockData(username || 'testuser'));
      } finally {
        setDataLoading(false);
      }
    }
    
    loadData();
  }, [username]);

  // Compile template whenever it changes
  useEffect(() => {
    if (!template.trim()) {
      setCompiledAst(null);
      setErrors([]);
      setWarnings([]);
      setStats(null);
      return;
    }

    const validation = TemplateEngine.validate(template);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setCompiledAst(null);
      return;
    }

    const result = TemplateEngine.compile({ html: template, mode });
    
    setErrors(result.errors);
    setWarnings(result.warnings);
    setStats(result.stats);
    
    if (result.success && result.ast) {
      setCompiledAst(result.ast);
    } else {
      setCompiledAst(null);
    }
  }, [template, mode]);

  // Enhanced keyboard handling for tab indentation (works with both HTML and CSS)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, contentType: 'html' | 'css') => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = contentType === 'html' ? htmlContent : cssContent;
      const setter = contentType === 'html' ? setHtmlContent : setCssContent;
      
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

  const handleSave = async () => {
    if (!compiledAst) return;
    
    setSaving(true);
    setSaveMessage(null);

    try {
      // Save the template
      const response = await fetch(`/api/profile/${username}/template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template,
          ast: compiledAst
          // Note: customCSS is NOT sent with templates - it's only for default layouts
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || "Failed to save template"}`);
        return;
      }

      // Automatically enable template mode and set to advanced
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        setSaveMessage("Template saved, but failed to update layout mode. Please check Layout Settings.");
        setTimeout(() => setSaveMessage(null), 5000);
        return;
      }
      const { token } = await capRes.json();

      // Enable template and set mode to advanced
      const layoutResponse = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          templateMode: 'advanced',
          cap: token 
        }),
      });

      if (!layoutResponse.ok) {
        setSaveMessage("Template saved, but failed to enable template mode. Please check Layout Settings.");
        setTimeout(() => setSaveMessage(null), 5000);
        return;
      }

      // Also enable the template
      const templateToggleResponse = await fetch(`/api/profile/${username}/template-toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });

      if (!templateToggleResponse.ok) {
        setSaveMessage("Template saved and mode set, but failed to enable template. Please check Layout Settings.");
        setTimeout(() => setSaveMessage(null), 5000);
        return;
      }

      setSaveMessage("Template saved and activated on your profile!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage(`Error: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  // Update iframe content with rendered template
  const updateIframeContent = () => {
    if (!iframeRef.current || !compiledAst || !residentData) {
      console.log('updateIframeContent: Missing dependencies', {
        hasIframe: !!iframeRef.current,
        hasAst: !!compiledAst,
        hasData: !!residentData
      });
      return;
    }

    try {
      console.log('updateIframeContent: Rendering template', { ast: compiledAst, residentData });
      
      // Use the CSS from the CSS tab
      const allCSS = cssContent || '';

      // Try to render the template directly with data provider context
      let htmlContent = '';
      try {
        console.log('Step 1: About to call renderTemplate');
        const reactContent = renderTemplate({ ast: compiledAst, residentData });
        console.log('Step 2: renderTemplate succeeded, result:', reactContent);
        
        if (reactContent) {
          console.log('Step 3: About to wrap in ResidentDataProvider');
          // Wrap in ResidentDataProvider for context
          const wrappedContent = (
            <ResidentDataProvider data={residentData}>
              {reactContent}
            </ResidentDataProvider>
          );
          
          console.log('Step 4: About to call renderToString');
          htmlContent = renderToString(wrappedContent);
          console.log('Step 5: renderToString succeeded, HTML length:', htmlContent.length);
        } else {
          console.log('Step 3 failed: reactContent is null/undefined');
        }
      } catch (renderError) {
        console.error('Error at some step in template rendering:', renderError);
        console.error('Error stack:', (renderError as Error).stack);
        htmlContent = `<div style="color: red; padding: 20px;">
          <h4>Error rendering template:</h4>
          <p>${String(renderError)}</p>
          <details><summary>Stack trace</summary><pre>${(renderError as Error).stack || 'No stack trace'}</pre></details>
        </div>`;
      }

      console.log('HTML content before fallback:', htmlContent);
      
      // If still empty, try a basic fallback render without context
      if (!htmlContent.trim()) {
        try {
          console.log('Fallback: Trying basic renderToString without context');
          const basicContent = renderTemplate({ ast: compiledAst, residentData });
          if (basicContent) {
            htmlContent = renderToString(basicContent);
            console.log('Fallback succeeded, HTML length:', htmlContent.length);
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
      
      // Final fallback - show debug content
      if (!htmlContent.trim()) {
        htmlContent = `
          <div style="padding: 20px; border: 2px dashed #ccc; text-align: center;">
            <h3>Debug: Template Content</h3>
            <p>Template: ${template.substring(0, 100)}${template.length > 100 ? '...' : ''}</p>
            <p>AST exists: ${compiledAst ? 'Yes' : 'No'}</p>
            <p>CSS length: ${allCSS.length} chars</p>
            <p>Resident data: ${residentData ? 'Loaded' : 'Missing'}</p>
            <p>Check console for detailed error logs</p>
          </div>
        `;
      }
      
      console.log('Final HTML content:', {htmlContent, allCSS});
  
      
      // Create complete HTML document for iframe
      const iframeHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              /* Reset and base styles */
              * { box-sizing: border-box; }
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: system-ui, sans-serif; 
                font-size: 16px; 
                line-height: 1.5; 
                background: white; 
                color: black; 
              }
              
              /* Template CSS - no scoping needed in iframe */
              ${allCSS}
            </style>
          </head>
          <body>
            ${htmlContent}
            <script>
              // Allow parent to receive resize events
              const resizeObserver = new ResizeObserver(() => {
                parent.postMessage({ 
                  type: 'iframe-resize', 
                  height: document.body.scrollHeight 
                }, '*');
              });
              resizeObserver.observe(document.body);
            </script>
          </body>
        </html>
      `;

      // Safely update iframe content
      if (iframeRef.current) {
        iframeRef.current.srcdoc = iframeHtml;
      } else {
        console.error('iframeRef.current is null - iframe not mounted yet');
      }
    } catch (error) {
      console.error('Error updating iframe content:', error);
      const errorHtml = `
        <html>
          <body style="font-family: system-ui; padding: 20px;">
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px;">
              <h4 style="color: #dc2626; margin: 0 0 8px 0;">Preview Error</h4>
              <p style="color: #b91c1c; font-size: 14px; margin: 0;">${String(error)}</p>
            </div>
          </body>
        </html>
      `;
      iframeRef.current.srcdoc = errorHtml;
    }
  };

  // Update iframe when template or data changes and preview tab is active
  useEffect(() => {
    if (activeTab === 'preview') {
      updateIframeContent();
    }
  }, [compiledAst, residentData, template, cssContent, activeTab]);

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

    if (!compiledAst) {
      return (
        <div className="flex items-center justify-center text-thread-sage" style={{ height: '800px' }}>
          <div className="text-center">
            <p className="mb-4">No valid template to preview</p>
            <p className="text-sm">Write some template HTML in the editor to see a preview</p>
          </div>
        </div>
      );
    }

    if (!residentData) {
      return (
        <div className="flex items-center justify-center text-red-600" style={{ height: '800px' }}>
          <p>Failed to load user data</p>
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
        title="Template Preview"
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
              <p className="mb-4">You can only edit your own profile.</p>
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
        <title>{`Template Editor - ${username} | ThreadStead`}</title>
      </Head>
      <Layout fullWidth={true}>
        <div className="flex flex-col bg-white template-editor-page w-full" style={{ minHeight: '100vh', maxWidth: '100vw', margin: '0', padding: '0' }}>
          {/* Header - Streamlined */}
          <div className="bg-white border-b border-thread-sage/30 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">Template Editor</h1>
                <span className="text-thread-sage text-sm">@{username}</span>
                {templateEnabled && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                    Template Active
                  </span>
                )}
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
                onClick={() => setActiveTab('html')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'html'
                    ? 'bg-thread-paper text-thread-charcoal border-t-2 border-l-2 border-r-2 border-thread-sage'
                    : 'text-thread-sage hover:text-thread-charcoal hover:bg-thread-cream'
                }`}
              >
                📝 HTML
              </button>
              <button
                onClick={() => setActiveTab('css')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'css'
                    ? 'bg-thread-paper text-thread-charcoal border-t-2 border-l-2 border-r-2 border-thread-sage'
                    : 'text-thread-sage hover:text-thread-charcoal hover:bg-thread-cream'
                }`}
              >
                🎨 CSS
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
            
            {/* HTML Editor Tab */}
            {activeTab === 'html' && (
              <div className="w-full flex flex-col">
                {/* Editor Toolbar - Seamlessly connected to tabs */}
                <div className="bg-thread-cream border-b border-thread-sage/30 border-l-2 border-r-2 border-thread-sage px-4 py-2 -mt-px">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      {/* Mode selector */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setMode('custom-tags')}
                          className={`px-3 py-1 text-sm border rounded ${
                            mode === 'custom-tags'
                              ? 'bg-thread-pine text-white border-thread-pine'
                              : 'bg-thread-paper border-thread-sage hover:bg-thread-cream'
                          }`}
                        >
                          Custom Tags
                        </button>
                        <button
                          onClick={() => setMode('data-attributes')}
                          className={`px-3 py-1 text-sm border rounded ${
                            mode === 'data-attributes'
                              ? 'bg-thread-pine text-white border-thread-pine'
                              : 'bg-thread-paper border-thread-sage hover:bg-thread-cream'
                          }`}
                        >
                          Data Attributes
                        </button>
                      </div>

                      {/* Template Selector */}
                      <div>
                        <HTMLTemplateSelector 
                          currentTemplate={htmlContent}
                          onTemplateChange={(newTemplate) => {
                            // Extract HTML and CSS from the new template
                            const cleanHTML = newTemplate.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
                            const styleMatch = newTemplate.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
                            setHtmlContent(cleanHTML || `<DisplayName />\n<Bio />`);
                            if (styleMatch && styleMatch[1]) {
                              setCssContent(styleMatch[1].trim());
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a 
                        href="/design-tutorial" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="thread-button-secondary text-sm"
                      >
                        🎨 Design Guide
                      </a>
                      
                      {compiledAst && (
                        <button 
                          onClick={handleSave} 
                          disabled={saving}
                          className="thread-button text-sm"
                        >
                          {saving ? "Saving..." : "Save Template"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  {stats && (
                    <div className="mt-2 text-xs text-thread-sage">
                      {stats.nodeCount} nodes, {stats.maxDepth} levels deep, {stats.sizeKB.toFixed(1)}KB
                      {Object.keys(stats.componentCounts).length > 0 && (
                        <span className="ml-4">
                          Components: {Object.entries(stats.componentCounts).map(([name, count]) => `${name}(${count})`).join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Code Editor - Natural Height */}
                <div className="w-full">
                  <div className="px-4 py-4">
                    <label className="block mb-3">
                      <span className="thread-label text-lg">Template HTML</span>
                      <span className="text-sm text-thread-sage ml-2">({mode}) - Use Tab/Shift+Tab for indentation</span>
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'html')}
                      className="w-full border border-thread-sage p-4 bg-thread-paper rounded font-mono text-sm resize-vertical focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                      placeholder={`Enter your template HTML using ${mode}...`}
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

            {/* CSS Editor Tab */}
            {activeTab === 'css' && (
              <div className="w-full flex flex-col">
                {/* CSS Editor Toolbar - Seamlessly connected to tabs */}
                <div className="bg-thread-cream border-b border-thread-sage/30 border-l-2 border-r-2 border-thread-sage px-4 py-2 -mt-px">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-thread-sage">
                        Style your template components
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a 
                        href="/design-css-tutorial" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="thread-button-secondary text-sm"
                      >
                        🎨 CSS Guide
                      </a>
                      
                      {compiledAst && (
                        <button 
                          onClick={handleSave} 
                          disabled={saving}
                          className="thread-button text-sm"
                        >
                          {saving ? "Saving..." : "Save Template"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* CSS Code Editor - Natural Height */}
                <div className="w-full">
                  <div className="px-4 py-4">
                    <label className="block mb-3">
                      <span className="thread-label text-lg">Template CSS</span>
                      <span className="text-sm text-thread-sage ml-2">Use Tab/Shift+Tab for indentation</span>
                    </label>
                    <textarea
                      value={cssContent}
                      onChange={(e) => setCssContent(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'css')}
                      className="w-full border border-thread-sage p-4 bg-thread-paper rounded font-mono text-sm resize-vertical focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                      placeholder="/* Add your custom CSS here */

.profile-bio {
  font-size: 18px;
  color: #333;
}

.profile-name {
  font-weight: bold;
  color: #1e40af;
}"
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
                    
                    {compiledAst && (
                      <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="thread-button text-sm"
                      >
                        {saving ? "Saving..." : "Save Template"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-thread-sage/30 mx-2 my-2 rounded overflow-hidden shadow-lg" style={{ minHeight: '800px' }}>
                  {renderPreview()}
                </div>
              </div>
            )}

          </div>

          {/* Footer with messages and errors - Full Width */}
          {(saveMessage || errors.length > 0 || warnings.length > 0) && (
            <div className="bg-white border-t border-thread-sage/30 px-4 py-4 shadow-sm">
              {saveMessage && (
                <div className={`mb-3 p-3 rounded ${
                  saveMessage.includes("Error") 
                    ? "bg-red-100 text-red-700 border border-red-300" 
                    : "bg-green-100 text-green-700 border border-green-300"
                }`}>
                  {saveMessage}
                </div>
              )}

              {errors.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-medium text-red-800 mb-2">❌ Errors</h4>
                  <ul className="text-red-700 text-sm space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {warnings.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ Warnings</h4>
                  <ul className="text-yellow-700 text-sm space-y-1">
                    {warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<TemplateEditorPageProps> = async ({ 
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
          destination: `/identity?redirect=${encodeURIComponent(`/resident/${username}/template-editor`)}`,
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

    // Try to get existing template
    let existingTemplate = "";
    let customCSS = "";
    let templateEnabled = false;

    if (isOwner) {
      try {
        const templateRes = await fetch(`${base}/api/profile/${username}/template`, {
          headers: {
            cookie: req.headers.cookie || "",
          },
        });
        if (templateRes.ok) {
          const templateData = await templateRes.json();
          existingTemplate = templateData.template || "";
        }
      } catch (error) {
        console.error("Failed to fetch existing template:", error);
      }

      customCSS = profileData.profile?.customCSS || "";
      templateEnabled = profileData.profile?.templateEnabled || false;
    }

    return {
      props: {
        username,
        isOwner,
        existingTemplate,
        customCSS,
        templateEnabled,
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    return { notFound: true };
  }
};