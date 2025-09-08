import React, { useState, useEffect, useMemo } from 'react';
import { TemplateEngine } from '@/lib/template-engine';
import { fetchResidentData, fetchCurrentUserResidentData } from '@/lib/template-data';
import { scopeCSS, generateScopeId } from '@/lib/css-scoping';
import HTMLTemplateSelector from './HTMLTemplateSelector';
import type { TemplateNode } from '@/lib/template-parser';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';

interface TemplateEditorProps {
  initialTemplate?: string;
  username?: string;
  customCSS?: string;
  onSave?: (template: string, ast: TemplateNode) => void;
  onAstChange?: (ast: TemplateNode | null) => void;
}

export default function TemplateEditor({ 
  initialTemplate = '', 
  username = 'testuser',
  customCSS = '',
  onSave,
  onAstChange
}: TemplateEditorProps) {
  // Start with multiple components test with self-closing tags
  const [template, setTemplate] = useState(initialTemplate || `<DisplayName />\n<Bio />`);
  const [mode, setMode] = useState<'custom-tags' | 'data-attributes'>('custom-tags');
  const [compiledAst, setCompiledAst] = useState<TemplateNode | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [residentData, setResidentData] = useState<ResidentData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Generate a unique ID for this preview instance to scope CSS
  const previewId = generateScopeId(React.useId());
  
  // Process custom CSS to scope it to this preview container
  const scopedCSS = useMemo(() => scopeCSS(customCSS || '', previewId), [customCSS, previewId]);

  // Sample templates for different modes
  const sampleTemplates = {
    'custom-tags': `<main>
  <ProfileHero variant="tape" />
  <section>
    <ProfilePhoto size="lg" shape="circle" />
    <DisplayName />
    <Bio />
  </section>
  <Tabs>
    <Tab title="Blog"><BlogPosts limit="5" /></Tab>
    <Tab title="Guestbook"><Guestbook /></Tab>
  </Tabs>
</main>`,
    'data-attributes': `<main>
  <div data-component="ProfileHero" data-variant="tape"></div>
  <section>
    <div data-component="ProfilePhoto" data-size="lg" data-shape="circle"></div>
    <div data-component="DisplayName"></div>
    <div data-component="Bio"></div>
  </section>
  <div data-component="Tabs">
    <div data-component="Tab" data-title="Blog">
      <div data-component="BlogPosts" data-limit="5"></div>
    </div>
    <div data-component="Tab" data-title="Guestbook">
      <div data-component="Guestbook"></div>
    </div>
  </div>
</main>`
  };

  // Fetch real resident data on component mount
  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      try {
        let data: ResidentData | null = null;
        
        if (username) {
          // Fetch specific user's data
          data = await fetchResidentData(username);
        } else {
          // Fetch current logged-in user's data
          data = await fetchCurrentUserResidentData();
        }
        
        if (!data) {
          // Fallback to mock data if real data fails
          data = TemplateEngine.createMockData(username || 'testuser');
        }
        
        setResidentData(data);
      } catch (error) {
        // Fallback to mock data
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
      onAstChange?.(result.ast);
    } else {
      setCompiledAst(null);
      onAstChange?.(null);
    }
  }, [template, mode]);

  const handleModeChange = (newMode: 'custom-tags' | 'data-attributes') => {
    setMode(newMode);
    // Optionally switch to sample template for the new mode
    if (!template.trim()) {
      setTemplate(sampleTemplates[newMode]);
    }
  };

  const loadSampleTemplate = () => {
    setTemplate(sampleTemplates[mode]);
  };

  const handleSave = () => {
    if (compiledAst && onSave) {
      onSave(template, compiledAst);
    }
  };

  const renderPreview = () => {
    if (dataLoading) {
      return (
        <div className="template-preview-loading text-center py-8 text-thread-sage">
          <p>Loading user data...</p>
        </div>
      );
    }

    if (!compiledAst) {
      return (
        <div className="template-preview-empty text-center py-8 text-thread-sage">
          <p className="mb-2">No valid template to preview</p>
          <button 
            onClick={loadSampleTemplate}
            className="thread-button text-sm"
          >
            Load Sample Template
          </button>
        </div>
      );
    }

    if (!residentData) {
      return (
        <div className="template-preview-error text-center py-8 text-red-600">
          <p>Failed to load user data</p>
        </div>
      );
    }

    try {
      const renderResult = TemplateEngine.render({
        ast: compiledAst,
        residentData: residentData,
        mode: 'preview'
      });

      if (!renderResult.success) {
        return (
          <div className="template-error p-4 bg-red-50 border border-red-200 rounded">
            <h4 className="font-medium text-red-800 mb-2">Render Error</h4>
            <ul className="text-red-700 text-sm">
              {renderResult.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        );
      }

      return (
        <div className="site-layout">
          <div className="site-main">
            <div className="profile-container">
              <div className="profile-content-wrapper">
                <div className="profile-main-content">
                  {renderResult.content}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      return (
        <div className="template-error p-4 bg-red-50 border border-red-200 rounded">
          <h4 className="font-medium text-red-800 mb-2">Preview Error</h4>
          <p className="text-red-700 text-sm">{String(error)}</p>
        </div>
      );
    }
  };

  return (
    <div className="template-editor bg-white border border-thread-sage/30 rounded-cozy shadow-cozySm">
      <div className="template-editor-header border-b border-thread-sage/30 p-4">
        <h3 className="thread-headline text-xl font-bold mb-3">Template Editor</h3>
        
        {/* Mode selector */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => handleModeChange('custom-tags')}
            className={`px-3 py-1 text-sm border rounded ${
              mode === 'custom-tags'
                ? 'bg-thread-pine text-white border-thread-pine'
                : 'bg-thread-paper border-thread-sage hover:bg-thread-cream'
            }`}
          >
            Custom Tags
          </button>
          <button
            onClick={() => handleModeChange('data-attributes')}
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
        <div className="mb-3">
          <HTMLTemplateSelector 
            currentTemplate={template}
            onTemplateChange={setTemplate}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={loadSampleTemplate} className="thread-button text-sm">
            Load Sample
          </button>
          <a 
            href="/design-tutorial" 
            target="_blank" 
            rel="noopener noreferrer"
            className="thread-button text-sm bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700"
          >
            🎨 Design Guide
          </a>
          {onSave && compiledAst && (
            <button onClick={handleSave} className="thread-button text-sm">
              Save Template
            </button>
          )}
        </div>
      </div>

      <div className="template-editor-content grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
        {/* Editor */}
        <div className="template-editor-input">
          <label className="block mb-2">
            <span className="thread-label">Template HTML</span>
            <span className="text-xs text-thread-sage ml-2">({mode})</span>
          </label>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full h-96 border border-thread-sage p-3 bg-thread-paper rounded font-mono text-sm resize-none focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
            placeholder={`Enter your template HTML using ${mode}...`}
          />
          
          {/* Stats */}
          {stats && (
            <div className="mt-2 text-xs text-thread-sage">
              {stats.nodeCount} nodes, {stats.maxDepth} levels deep, {stats.sizeKB.toFixed(1)}KB
              {Object.keys(stats.componentCounts).length > 0 && (
                <span className="ml-2">
                  Components: {Object.entries(stats.componentCounts).map(([name, count]) => `${name}(${count})`).join(', ')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="template-editor-preview">
          <div className="flex items-center justify-between mb-2">
            <span className="thread-label">Preview</span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPreviewMode}
                onChange={(e) => setIsPreviewMode(e.target.checked)}
                className="form-checkbox"
              />
              Show warnings
            </label>
          </div>
          <div className="template-preview-container bg-thread-cream border border-thread-sage/30 rounded p-4 h-96 overflow-auto">
            {/* Apply scoped custom CSS to preview */}
            {scopedCSS && (
              <style dangerouslySetInnerHTML={{ __html: scopedCSS }} />
            )}
            <div 
              id={previewId}
              className="template-preview-wrapper"
            >
              {renderPreview()}
            </div>
          </div>
        </div>
      </div>

      {/* Errors and Warnings */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="template-editor-messages border-t border-thread-sage/30 p-4">
          {errors.length > 0 && (
            <div className="template-errors mb-3">
              <h4 className="font-medium text-red-800 mb-2">Errors</h4>
              <ul className="text-red-700 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {warnings.length > 0 && (
            <div className="template-warnings">
              <h4 className="font-medium text-yellow-800 mb-2">Warnings</h4>
              <ul className="text-yellow-700 text-sm space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Component Reference */}
      <div className="template-editor-reference border-t border-thread-sage/30 p-4 text-sm">
        <div className="flex items-center justify-between mb-3">
          <details className="text-thread-sage flex-1">
            <summary className="cursor-pointer font-medium mb-2">Quick Component Reference</summary>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <h4 className="font-medium text-thread-charcoal">Profile</h4>
                <div><code>&lt;ProfilePhoto size=&quot;sm|md|lg&quot; /&gt;</code></div>
                <div><code>&lt;DisplayName /&gt;</code></div>
                <div><code>&lt;Bio /&gt;</code></div>
                <div><code>&lt;BlogPosts limit=&quot;1-20&quot; /&gt;</code></div>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-thread-charcoal">Layout</h4>
                <div><code>&lt;FlexContainer direction=&quot;row|column&quot; /&gt;</code></div>
                <div><code>&lt;GridLayout columns=&quot;1-6&quot; /&gt;</code></div>
                <div><code>&lt;CenteredBox maxWidth=&quot;lg&quot; /&gt;</code></div>
                <div><code>&lt;SplitLayout ratio=&quot;1:1&quot; /&gt;</code></div>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-thread-charcoal">Visual</h4>
                <div><code>&lt;GradientBox gradient=&quot;sunset&quot; /&gt;</code></div>
                <div><code>&lt;NeonBorder color=&quot;blue&quot; /&gt;</code></div>
                <div><code>&lt;RetroTerminal variant=&quot;green&quot; /&gt;</code></div>
                <div><code>&lt;WaveText text=&quot;Hello!&quot; /&gt;</code></div>
              </div>
            </div>
          </details>
          <a 
            href="/design-tutorial" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-4 text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            View Full Guide →
          </a>
        </div>
      </div>
    </div>
  );
}