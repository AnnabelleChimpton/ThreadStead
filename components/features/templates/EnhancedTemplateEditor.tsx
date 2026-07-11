// Enhanced template editor with islands support
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { html as htmlLang } from '@codemirror/lang-html';
import { css as cssLang } from '@codemirror/lang-css';
import type { EditorView } from '@codemirror/view';
import {
  fetchComponentSchemas,
  buildExtraTags,
  type ComponentSchema,
} from '@/lib/templates/editor/component-autocomplete';
import ComponentPalette from '@/components/features/templates/ComponentPalette';
import { fetchResidentData } from '@/lib/templates/core/template-data';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import type { CompiledTemplate } from '@/lib/templates/compilation/compiler';
import { getDefaultProfileTemplate, DEFAULT_PROFILE_TEMPLATE_INFO } from '@/lib/templates/default-profile-templates';
import TemplatePanelSelector from './TemplatePanelSelector';
import StarterTemplateGallery from './StarterTemplateGallery';
import Link from 'next/link';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { generatePreviewCSS, type CSSMode, type TemplateMode } from '@/lib/utils/css/layers';
import { useSiteCSS } from '@/hooks/useSiteCSS';
import NavigationPreview from '@/components/features/templates/NavigationPreview';
import ValidationFeedbackPanel from './ValidationFeedbackPanel';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { useRouter } from 'next/router';
import { PixelIcon } from '@/components/ui/PixelIcon';
import DraftRestoreBanner from '@/components/ui/feedback/DraftRestoreBanner';
import { useLocalDraft } from '@/hooks/useLocalDraft';
import TemplateHistoryPanel, { type FullRevision } from '@/components/features/templates/TemplateHistoryPanel';
import ViewSourceToggle from '@/components/features/templates/ViewSourceToggle';

// CodeMirror is editor-page-only — loaded dynamically so it never lands in
// the shared bundle (same pattern as css-editor.tsx).
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => (
    <div className="w-full p-4 font-mono text-sm text-gray-400 border border-thread-sage rounded bg-thread-paper">
      Loading editor…
    </div>
  ),
});

// Warning dialog for data loss prevention
interface DataLossWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  // Enhanced properties for legacy conversion
  preservedItems?: string[];
  clearedItems?: string[];
}

function DataLossWarning({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Yes, Continue",
  preservedItems,
  clearedItems
}: DataLossWarningProps) {
  if (!isOpen) return null;

  const hasConversionDetails = preservedItems && clearedItems;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 border-2 border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed mb-4">{message}</p>

          {hasConversionDetails && (
            <div className="space-y-4">
              {/* Preserved Items */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <PixelIcon name="check" size={14} /> Will be preserved
                </h4>
                {preservedItems.length > 0 ? (
                  <ul className="text-sm text-green-700 space-y-1">
                    {preservedItems.map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-green-600 rounded-full"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-green-700 italic">No convertible styles found</p>
                )}
              </div>

              {/* Cleared Items */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <PixelIcon name="trash" size={14} /> Will be cleared
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {clearedItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
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
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EnhancedTemplateEditorProps {
  user: any; // User with profile
  initialTemplate?: string;
  initialCSS?: string;
  initialCSSMode?: 'inherit' | 'override' | 'disable';
  initialTemplateMode?: 'default' | 'enhanced' | 'advanced';
  initialShowNavigation?: boolean;
  initialEditorMode?: 'template' | 'css'; // URL mode parameter
  onSave?: (template: string, css: string, compiledTemplate?: CompiledTemplate, cssMode?: 'inherit' | 'override' | 'disable', hideNavigation?: boolean, templateMode?: 'default' | 'enhanced' | 'advanced') => void;
}

export default function EnhancedTemplateEditor({
  user,
  initialTemplate = '',
  initialCSS = '',
  initialCSSMode = 'inherit',
  initialTemplateMode = 'default',
  initialShowNavigation = true,
  initialEditorMode,
  onSave
}: EnhancedTemplateEditorProps) {
  const router = useRouter();

  // AUTO-FIX: Detect and unwrap flow templates that were incorrectly wrapped
  // This fixes templates corrupted by the previous auto-wrap bug
  // CRITICAL: Only unwrap if components have NO positioning attributes (true flow mode)
  const unwrappedTemplate = React.useMemo(() => {
    const hasWrapper = initialTemplate.includes('pure-absolute-container');

    if (hasWrapper) {
      // Extract content between wrapper tags
      const wrapperContentMatch = initialTemplate.match(
        /<div[^>]*class="[^"]*pure-absolute-container[^"]*"[^>]*>([\s\S]*)<\/div>\s*$/
      );

      if (!wrapperContentMatch) {
        return initialTemplate;
      }

      const innerContent = wrapperContentMatch[1].trim();

      // Check if first component is a flow-capable component
      const firstComponentMatch = innerContent.match(/^\s*<([A-Z][a-zA-Z0-9]*)/);

      if (!firstComponentMatch) {
        return initialTemplate;
      }

      const componentType = firstComponentMatch[1];

      // Only check components that can be used in both modes
      const flowCapableComponents = ['GradientBox', 'CenteredBox', 'FlexBox', 'Card', 'RetroCard'];

      if (!flowCapableComponents.includes(componentType)) {
        // Not a flow-capable component, keep wrapper
        return initialTemplate;
      }

      // Check if the component has positioning attributes
      // Look for: style="...position: absolute..." OR data-position OR data-positioning-mode
      const componentTagMatch = innerContent.match(
        new RegExp(`^\\s*<${componentType}[^>]*>`, 's')
      );

      if (componentTagMatch) {
        const componentTag = componentTagMatch[0];

        const hasAbsoluteStyle = /style="[^"]*position:\s*absolute/.test(componentTag);
        const hasDataPosition = /data-position=/.test(componentTag);
        const hasPositioningMode = /data-positioning-mode=/.test(componentTag);
        const hasPixelPosition = /data-pixel-position=/.test(componentTag);

        // If ANY positioning attributes found, this is a valid positioned template
        if (hasAbsoluteStyle || hasDataPosition || hasPositioningMode || hasPixelPosition) {
          return initialTemplate; // Keep wrapper - it's positioned mode!
        }

        // No positioning found - this is likely a flow template that was incorrectly wrapped
        // Unwrap it
        return innerContent;
      }
    }

    return initialTemplate;
  }, [initialTemplate]);

  const [template, setTemplate] = useState(unwrappedTemplate);

  const [customCSS, setCustomCSS] = useState(initialCSS);
  const [cssMode, setCSSMode] = useState<'inherit' | 'override' | 'disable'>(initialCSSMode);
  const [currentTemplateMode, setCurrentTemplateMode] = useState<'default' | 'enhanced' | 'advanced'>(initialTemplateMode);

  // Pop-up preview window management
  const [previewWindow, setPreviewWindow] = useState<Window | null>(null);
  
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
    // First, respect the saved template mode from the database
    if (initialTemplateMode === 'advanced') {
      // User has explicitly saved in advanced mode, respect that
      return false;
    } else if (initialTemplateMode === 'enhanced' || initialTemplateMode === 'default') {
      // User is in standard/enhanced mode
      return true;
    }
    
    // Fallback to content-based detection for backwards compatibility
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
  const [hideNavigation, setHideNavigation] = useState(!initialShowNavigation);

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

  const resetToDefaultTemplate = () => {
    showDataLossWarning(
      "Reset to Default Template",
      "This will remove all your customizations and return your profile to the admin's default template. Your custom CSS and HTML will be cleared and you'll use the site's default styling.",
      async () => {
        // Get username from user prop
        const username = user.primaryHandle?.split('@')[0] || user.handles?.[0]?.handle?.split('@')[0];
        if (!username) {
          setSaveMessage('✗ Could not determine username');
          setTimeout(() => setSaveMessage(null), 3000);
          return;
        }

        // Clear all customizations in local state
        setUseStandardLayout(true);
        setTemplate('');
        setCustomCSS('');
        setCSSMode('inherit');
        setHideNavigation(false);
        setHasUnsavedChanges(false);
        setSaveState('saving');

        try {
          // 1. Clear CSS via CSS API
          await csrfFetch(`/api/profile/${username}/css`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customCSS: '', cssMode: 'inherit' }),
          });

          // 2. Clear template via template API
          await csrfFetch(`/api/profile/${username}/template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ template: '', customCSS: '' }),
          });

          // 3. Set mode to 'default'
          const capRes = await csrfFetch("/api/cap/profile", { method: "POST" });
          const { token } = await capRes.json();

          await csrfFetch("/api/profile/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateMode: 'default', cap: token }),
          });

          setSaveState('saved');
          setSaveMessage('✓ Reset to default template');
          markSaved(JSON.stringify({
            template: '',
            customCSS: '',
            cssMode: 'inherit',
            useStandardLayout: true,
            hideNavigation: false
          }));

          // Refresh page data to show updated mode without full reload
          setTimeout(() => {
            router.replace(router.asPath);
          }, 500);
        } catch (error) {
          setSaveState('error');
          setSaveMessage('✗ Failed to reset to default');
          setTimeout(() => setSaveMessage(null), 3000);
        }
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
          setSaveMessage('✓ Editable default template loaded');
        } else {
          setSaveMessage('✗ Failed to load default template');
        }
      } catch (error) {
        console.error('Failed to load default template:', error);
        setSaveMessage('✗ Failed to load default template');
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
  // Smart default tab selection based on URL mode param or layout mode
  const [activeTab, setActiveTab] = useState<'template' | 'css'>(() => {
    // Priority 1: URL parameter
    if (initialEditorMode === 'template') return 'template';
    if (initialEditorMode === 'css') return 'css';

    // Priority 2: If starting in standard layout mode, default to CSS tab
    return useStandardLayout ? 'css' : 'template';
  });


  // Save state management
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error' | 'pending'>('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Validation feedback state
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    strippedComponents?: Array<{
      name: string;
      line?: number;
      reason?: string;
    }>;
    stats?: {
      nodeCount: number;
      maxDepth: number;
      componentCounts: Record<string, number>;
    };
  } | null>(null);
  const [showValidationPanel, setShowValidationPanel] = useState(false);


  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadingDefault, setLoadingDefault] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  
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
  
  // Smart check for whether content is essentially empty
  const isContentEmpty = () => {
    const isTemplateEmpty = !template || template.trim() === '';
    const isCSSEmpty = !customCSS || customCSS.trim() === '' || 
      customCSS.trim() === '/* Add your custom CSS here */' ||
      customCSS.trim() === '/* Add your custom CSS here to style the standard layout */';
    return isTemplateEmpty && isCSSEmpty;
  };

  const showDataLossWarning = (title: string, message: string, confirmAction: () => void) => {
    // Skip warning if content is empty or matches initial values
    if (isContentEmpty() || !hasUnsavedContent()) {
      confirmAction();
    } else {
      setWarningDialog({
        isOpen: true,
        title,
        message,
        confirmAction
      });
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

  // Removed parseTemplateForIslands function - now using real compilation API

  // Track last compiled template to avoid unnecessary recompilation
  const [lastCompiledTemplate, setLastCompiledTemplate] = useState<string>('');

  // Compile template function (using real compilation API like production)
  const compileTemplateForPreview = useCallback(async (forceCompile: boolean = false) => {
    // Force compile when saving, even if in standard layout mode
    if (!template.trim() || (!forceCompile && useStandardLayout)) {
      setCompiledTemplate(null);
      setLastCompiledTemplate('');
      return null;
    }

    // Skip compilation if template hasn't changed and not forcing
    if (!forceCompile && template === lastCompiledTemplate && compiledTemplate) {
      return compiledTemplate;
    }

    try {
      // Validate user.id before making the request
      if (!user?.id) {
        return null;
      }

      // Call the same compilation API that production uses
      const response = await fetch('/api/templates/compile-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent with the request
        body: JSON.stringify({
          userId: user.id,
          mode: 'advanced',
          customTemplate: template,
          customCSS: customCSS,
          force: true // Always recompile for preview
        })
      });

      if (!response.ok) {
        // Handle specific status codes
        if (response.status === 401) {
          // User not authenticated
          return null;
        }

        // Try to get more details from the response
        try {
          const errorData = await response.json();
        } catch (parseError) {
          // Could not parse error response
        }
        return null;
      }

      const result = await response.json();

      if (!result.success || !result.compiled) {
        return null;
      }

      setCompiledTemplate(result.compiled);
      setLastCompiledTemplate(template); // Track what we compiled
      return result.compiled;
    } catch (error) {
      // Check if it's a network error specifically
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network connectivity issue
      }

      // Don't throw the error, just return null
      return null;
    }
  }, [template, useStandardLayout, user.id, customCSS, lastCompiledTemplate, compiledTemplate]);

  // Send preview data to popup window
  const sendPreviewData = useCallback((targetWindow: Window) => {
    if (!residentData) {
      return;
    }
    
    // Determine template mode based on layout type, not CSS presence
    // Standard layout = enhanced mode, Custom HTML = advanced mode
    const templateMode = useStandardLayout ? 'enhanced' : 'advanced';
    
    const previewData = {
      user: {
        id: user.id,
        handle: user.primaryHandle || 'preview-user',
        profile: {
          templateMode: templateMode,
          customCSS: customCSS,
          customTemplate: template,
          cssMode: cssMode,
          compiledTemplate: compiledTemplate,
          templateCompiledAt: new Date(),
          hideNavigation: hideNavigation // Add navigation toggle setting
        }
      },
      residentData: residentData,
      customCSS: customCSS,
      useStandardLayout: useStandardLayout,
      hideNavigation: hideNavigation, // Also add at top level for easy access
      template: template, // Add template data for save functionality
      cssMode: cssMode // Add CSS mode for save functionality
    };
    
    targetWindow.postMessage({ 
      type: 'PREVIEW_DATA', 
      payload: previewData 
    }, window.location.origin);
  }, [user, customCSS, template, cssMode, compiledTemplate, residentData, useStandardLayout, hideNavigation]);

  // Pop-up preview management
  const openPopupPreview = useCallback(async () => {
    // Check if essential data is available
    if (!residentData) {
      alert('Preview data is still loading. Please wait a moment and try again.');
      return;
    }

    // For advanced templates, compile if needed
    if (!useStandardLayout && template.trim()) {
      if (!compiledTemplate) {
        // Compile the template before opening preview
        const compiled = await compileTemplateForPreview();
        if (!compiled) {
          alert('Failed to compile template. Please check your template syntax.');
          return;
        }
      }
    }

    // Close existing preview window if open
    if (previewWindow && !previewWindow.closed) {
      previewWindow.close();
    }

    // Open new preview window
    const newWindow = window.open(
      '/template-preview',
      'template-preview',
      'width=1200,height=800,scrollbars=yes,resizable=yes,status=yes,location=yes'
    );

    if (newWindow) {
      setPreviewWindow(newWindow);
      
      // Listen for messages from preview window
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'PREVIEW_READY') {
          // Send initial preview data
          sendPreviewData(newWindow);
        }
        
        if (event.data.type === 'SAVE_REQUEST') {
          // Handle save request from preview window
          handleSaveFromPreview(event.data.data);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Cleanup when window closes
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          setPreviewWindow(null);
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);
    } else {
      alert('Pop-up blocked — allow pop-ups for this site to use the preview.');
    }
  }, [previewWindow, residentData, useStandardLayout, template, compiledTemplate, sendPreviewData, compileTemplateForPreview]);

  // Send CSS updates to preview window when CSS changes
  useEffect(() => {
    if (previewWindow && !previewWindow.closed) {
      previewWindow.postMessage({ 
        type: 'CSS_UPDATE', 
        customCSS: customCSS 
      }, window.location.origin);
    }
  }, [customCSS, previewWindow]);

  // Send template updates to preview window when template changes
  useEffect(() => {
    if (previewWindow && !previewWindow.closed && residentData) {
      sendPreviewData(previewWindow);
    }
  }, [template, previewWindow, residentData, sendPreviewData]);

  // ── Embedded live preview pane ──
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [showPreviewPane, setShowPreviewPane] = useState(false);
  const [previewFrameReady, setPreviewFrameReady] = useState(false);

  // Default the pane open on wide screens (decided after mount so SSR and
  // first client render agree).
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
      setShowPreviewPane(true);
    }
  }, []);

  // Handshake: the iframe posts PREVIEW_READY when it can accept data.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const frameWin = previewFrameRef.current?.contentWindow;
      if (!frameWin || event.source !== frameWin) return;
      if (event.data.type === 'PREVIEW_READY') {
        setPreviewFrameReady(true);
        if (residentData) {
          sendPreviewData(frameWin);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [residentData, sendPreviewData]);

  // Push editor state into the pane as it changes. Debounced: every push is a
  // full re-render (and possible island hydration) inside the preview.
  useEffect(() => {
    if (!showPreviewPane || !previewFrameReady || !residentData) return;
    const frameWin = previewFrameRef.current?.contentWindow;
    if (!frameWin) return;
    const timer = setTimeout(() => sendPreviewData(frameWin), 400);
    return () => clearTimeout(timer);
  }, [showPreviewPane, previewFrameReady, residentData, sendPreviewData]);

  // The iframe unmounts when the pane closes; forget its readiness.
  useEffect(() => {
    if (!showPreviewPane) setPreviewFrameReady(false);
  }, [showPreviewPane]);

  // ── Component autocomplete + palette (registry-fed) ──
  // Captured via onCreateEditor: next/dynamic doesn't forward refs, so a
  // ref on the <CodeMirror> wrapper would stay null forever.
  const templateViewRef = useRef<EditorView | null>(null);
  const [componentSchemas, setComponentSchemas] = useState<ComponentSchema[] | null>(null);

  useEffect(() => {
    fetchComponentSchemas()
      .then(setComponentSchemas)
      .catch(() => {
        // Autocomplete quietly degrades to plain HTML completion.
      });
  }, []);

  const templateExtensions = React.useMemo(
    () => [htmlLang(componentSchemas ? { extraTags: buildExtraTags(componentSchemas) } : {})],
    [componentSchemas]
  );

  // Drop a snippet in at the cursor (or append if the editor isn't mounted).
  const insertIntoTemplate = useCallback((snippet: string) => {
    const view = templateViewRef.current;
    if (view) {
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
      });
      view.focus();
    } else {
      handleTemplateChange(template ? `${template}\n${snippet}` : snippet);
    }
  }, [template]);

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
              { id: '1', bodyHtml: 'This is a test post from the enhanced editor', createdAt: new Date().toISOString() },
              { id: '2', bodyHtml: 'Another test post with some content', createdAt: new Date(Date.now() - 86400000).toISOString() }
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
              { id: '1', bodyHtml: 'This is a sample post for template preview', createdAt: new Date().toISOString() },
              { id: '2', bodyHtml: 'Another sample post to show multiple entries', createdAt: new Date(Date.now() - 86400000).toISOString() }
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
            { id: '1', bodyHtml: 'This is a test post', createdAt: new Date().toISOString() }
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


  // Handle save requests from preview window
  const handleSaveFromPreview = async (saveData: any) => {
    if (!onSave) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const { template: previewTemplate, customCSS: previewCSS, cssMode: previewCSSMode, hideNavigation: previewHideNavigation, useStandardLayout: previewUseStandardLayout } = saveData;

      // Update local state to match what's being saved
      setTemplate(previewTemplate || '');
      setCustomCSS(previewCSS || '');
      setCSSMode(previewCSSMode || 'inherit');
      setHideNavigation(previewHideNavigation !== undefined ? previewHideNavigation : false);
      setUseStandardLayout(previewUseStandardLayout !== undefined ? previewUseStandardLayout : true);

      // Handle standard layout mode differently
      if (previewUseStandardLayout) {
        // For standard layout, we save with empty template to indicate using default layout
        // Standard layout always shows navigation (hideNavigation = false)
        await onSave('', previewCSS || '', undefined, previewCSSMode || 'inherit', false);
        setSaveMessage('✓ Standard layout saved');
      } else {
        // For advanced templates, we need compiled template data
        // Use existing compiled template or compile the preview template
        let templateToSave = compiledTemplate;
        
        if (!templateToSave && previewTemplate && previewTemplate.trim()) {
          // Try to compile the preview template
          const compiled = await compileTemplateForPreview();
          templateToSave = compiled;
        }
        
        if (!templateToSave) {
          setSaveMessage('Preview the template first, then save');
          return;
        }
        
        await onSave(previewTemplate || '', previewCSS || '', templateToSave, previewCSSMode || 'inherit', previewHideNavigation !== undefined ? previewHideNavigation : false);
        setSaveMessage('✓ Advanced template saved');
      }

      markSaved(JSON.stringify({
        template: previewTemplate || '',
        customCSS: previewCSS || '',
        cssMode: previewCSSMode || 'inherit',
        useStandardLayout: previewUseStandardLayout !== undefined ? previewUseStandardLayout : true,
        hideNavigation: previewHideNavigation !== undefined ? previewHideNavigation : false
      }));
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage('✗ Failed to save template from preview');
      console.error('Save from preview error:', error);
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

  // Auto-compile template when it changes (for advanced templates)
  useEffect(() => {
    if (!useStandardLayout && template.trim()) {
      // Only recompile if template content actually changed
      const timer = setTimeout(async () => {
        const result = await compileTemplateForPreview();

        // If compilation failed, editor continues to work
        if (result === null && template.trim()) {
          // Could show a toast notification here if needed
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (useStandardLayout) {
      // Clear compiled template when switching to standard layout
      setCompiledTemplate(null);
    }
  }, [template, useStandardLayout]); // Removed compileTemplateForPreview from deps to avoid recreation issues

  // Auto-switch tabs when switching between layout modes
  useEffect(() => {
    if (useStandardLayout && activeTab === 'template') {
      // Switch to CSS tab when switching to standard layout (no HTML template to edit)
      setActiveTab('css');
    }
    // Removed the problematic auto-switch from CSS to template tab
    // Users should be able to manually navigate to CSS tab in advanced mode
  }, [useStandardLayout, activeTab]);

  // Handle initial mode from URL parameter — ONCE. loadDefaultTemplate is a
  // plain function (new identity every render), so without the ref guard this
  // effect fired on every render and looped the page: each call opened the
  // data-loss dialog via setState, which re-rendered, which re-fired the
  // effect ("Maximum update depth exceeded" + endless default-template
  // fetches).
  const initialModeHandledRef = useRef(false);
  useEffect(() => {
    if (initialModeHandledRef.current) return;
    if (initialEditorMode === 'template' && useStandardLayout) {
      initialModeHandledRef.current = true;
      // User wants Template Code but is in standard layout
      // Need to switch to advanced mode first
      loadDefaultTemplate();
    }
  }, [initialEditorMode, useStandardLayout, loadDefaultTemplate]);

  // Track changes against the last-saved snapshot (manual save required now).
  // Comparing to a snapshot (instead of blindly marking dirty) keeps a fresh
  // page, a just-saved page, and a just-reset page all reading as clean.
  const currentSnapshot = JSON.stringify({ template, customCSS, cssMode, useStandardLayout, hideNavigation });
  const savedSnapshotRef = useRef<string | null>(null);
  useEffect(() => {
    if (savedSnapshotRef.current === null) {
      savedSnapshotRef.current = currentSnapshot;
      return;
    }
    const dirty = currentSnapshot !== savedSnapshotRef.current;
    setHasUnsavedChanges(dirty);
    setSaveState(prev => {
      if (prev === 'saving') return prev;
      return dirty ? 'pending' : 'saved';
    });
  }, [currentSnapshot]);

  // Crash/navigation recovery: mirror unsaved work into localStorage.
  const draftData = React.useMemo(
    () => ({ template, customCSS, cssMode, useStandardLayout, hideNavigation }),
    [template, customCSS, cssMode, useStandardLayout, hideNavigation]
  );
  const { pendingDraft, clearDraft } = useLocalDraft(
    `threadstead:draft:template-editor:${user?.id || 'anon'}`,
    draftData,
    hasUnsavedChanges
  );

  // Record the current editor contents as the saved state.
  const markSaved = useCallback((snapshot?: string) => {
    savedSnapshotRef.current = snapshot ?? JSON.stringify(draftData);
    setHasUnsavedChanges(false);
    clearDraft();
  }, [draftData, clearDraft]);

  // Warn user about unsaved changes before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Validate template and update validation result
  // Returns the full validation data so caller can check warnings/stripped components
  const handleValidate = useCallback(async (): Promise<{ isValid: boolean; hasWarnings: boolean; hasStripped: boolean }> => {
    // Don't validate empty templates or standard layout
    if (!template.trim() || useStandardLayout) {
      setValidationResult(null);
      return { isValid: true, hasWarnings: false, hasStripped: false };
    }

    try {
      // Extract username from user handle for API call
      const fullHandle = user.primaryHandle || user.handles?.[0]?.handle;
      const username = fullHandle ? fullHandle.split('@')[0] : null;

      if (!username) {
        const errorData = {
          isValid: false,
          errors: ['Unable to determine username for validation'],
          warnings: []
        };
        setValidationResult(errorData);
        return { isValid: false, hasWarnings: false, hasStripped: false };
      }

      // Use the compilation API to get validation results
      const response = await fetch(`/api/users/${username}/templates/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          customCSS,
          mode: 'advanced'
        })
      });

      if (!response.ok) {
        // Try to extract error details from response body
        let errors = ['Failed to validate template'];
        let warnings: string[] = [];

        try {
          const errorData = await response.json();

          // Check if the response contains structured error information
          if (errorData.errors && Array.isArray(errorData.errors)) {
            errors = errorData.errors;
          } else if (errorData.error) {
            errors = [errorData.error];
          } else if (errorData.message) {
            errors = [errorData.message];
          }

          // Also extract warnings if present
          if (errorData.warnings && Array.isArray(errorData.warnings)) {
            warnings = errorData.warnings;
          }
        } catch (jsonError) {
          // Response body wasn't JSON or couldn't be parsed
          // Try to get text error message
          try {
            const errorText = await response.text();
            if (errorText && errorText.length > 0 && errorText.length < 500) {
              errors = [errorText];
            }
          } catch (textError) {
            // Give up, use generic error
          }
        }

        const errorValidation = {
          isValid: false,
          errors,
          warnings
        };
        setValidationResult(errorValidation);
        return { isValid: false, hasWarnings: warnings.length > 0, hasStripped: false };
      }

      const result = await response.json();

      // Extract validation information
      const validationData = {
        isValid: result.success && (!result.errors || result.errors.length === 0),
        errors: result.errors || [],
        warnings: result.warnings || [],
        strippedComponents: result.strippedComponents || [],
        stats: result.validation?.stats
      };

      setValidationResult(validationData);

      return {
        isValid: validationData.isValid,
        hasWarnings: validationData.warnings.length > 0,
        hasStripped: (validationData.strippedComponents?.length || 0) > 0
      };
    } catch (error) {
      console.error('Validation failed:', error);
      const errorValidation = {
        isValid: false,
        errors: ['Validation error: ' + (error instanceof Error ? error.message : 'Unknown error')],
        warnings: []
      };
      setValidationResult(errorValidation);
      return { isValid: false, hasWarnings: false, hasStripped: false };
    }
  }, [template, customCSS, user.id, useStandardLayout]);

  // Internal save function (called after validation passes)
  // Takes optional validation info to avoid relying on stale state
  const performSave = useCallback(async (validationInfo?: { hasWarnings: boolean; hasStripped: boolean }) => {
    if (!onSave) return;

    setSaveState('saving');
    setHasUnsavedChanges(false);

    try {
      const compiledTemplateData = compiledTemplate || (await compileTemplateForPreview(true));
      await onSave(template, customCSS, compiledTemplateData || undefined, cssMode, hideNavigation);
      setSaveState('saved');
      markSaved();

      // Update template mode - saving moves from 'default' to advanced/enhanced
      const newMode = useStandardLayout ? 'enhanced' : 'advanced';
      setCurrentTemplateMode(newMode);

      // Check if we have warnings or stripped components
      // Use passed validationInfo first (most current), fall back to state
      const hasIssues = validationInfo
        ? (validationInfo.hasWarnings || validationInfo.hasStripped)
        : (validationResult && (
            validationResult.warnings.length > 0 ||
            (validationResult.strippedComponents?.length || 0) > 0
          ));

      // Only show generic success message if there are no issues
      // Otherwise, keep the specific warning message that was already set
      if (!hasIssues) {
        setSaveMessage('✓ Template saved');
        setTimeout(() => setSaveMessage(null), 3000);
        setShowValidationPanel(false);
      }
      // If there are issues, panel stays open with the warning message from handleSave
    } catch (error) {
      console.error('Save failed:', error);
      setSaveState('error');
      setHasUnsavedChanges(true); // Restore unsaved state on error

      // Extract error message and display in ValidationFeedbackPanel
      const errorMessage = error instanceof Error ? error.message : 'Save failed - please try again';

      // Create validation result to display in panel
      setValidationResult({
        isValid: false,
        errors: [errorMessage],
        warnings: []
      });

      // Show the validation panel with the error
      setShowValidationPanel(true);

      // Also show toast for quick feedback
      setSaveMessage('✗ Save failed - see details in validation panel');
      setTimeout(() => setSaveMessage(null), 5000);
    }
  }, [onSave, template, customCSS, compiledTemplate, compileTemplateForPreview, cssMode, hideNavigation, validationResult, markSaved]);

  // Main save handler with validation
  const handleSave = useCallback(async () => {
    // Validate template first
    const validationInfo = await handleValidate();

    // If validation has errors, block save and show panel
    if (!validationInfo.isValid) {
      setShowValidationPanel(true);
      setSaveMessage('Cannot save yet - fix the validation errors first');
      setTimeout(() => setSaveMessage(null), 5000);
      return;
    }

    // If validation passed but has warnings or stripped components, show panel but allow save
    if (validationInfo.hasWarnings || validationInfo.hasStripped) {
      setShowValidationPanel(true);

      // Show appropriate message based on what was found
      if (validationInfo.hasStripped) {
        setSaveMessage('Some components were removed - see details in panel');
      } else {
        setSaveMessage('Template saved with warnings - see details in panel');
      }
      setTimeout(() => setSaveMessage(null), 8000);

      // Still proceed with save - pass validation info to prevent stale state issues
      try {
        await performSave(validationInfo);
      } catch (error) {
        // Error is already handled by performSave's internal catch block
        console.error('Error in handleSave:', error);
      }
      return;
    }

    // Validation passed with no warnings - save directly
    try {
      await performSave(validationInfo);
    } catch (error) {
      // Error is already handled by performSave's internal catch block
      console.error('Error in handleSave:', error);
    }
  }, [handleValidate, performSave]);

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

  // Template edits: extract pasted <style> blocks into the CSS field and
  // auto-switch to advanced mode when HTML shows up in standard-layout mode.
  const handleTemplateChange = (newValue: string) => {
    // Check if the pasted/typed content has embedded style tags
    const styleMatch = newValue.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatch) {
      // Extract all CSS from style tags
      let extractedCSS = '';
      styleMatch.forEach(styleTag => {
        const cssMatch = styleTag.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (cssMatch && cssMatch[1]) {
          extractedCSS += cssMatch[1].trim() + '\n\n';
        }
      });

      // Remove style tags from HTML
      const cleanedHTML = newValue.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();

      // Set the cleaned HTML
      setTemplate(cleanedHTML);

      // Append extracted CSS to existing CSS (don't overwrite)
      if (extractedCSS) {
        const existingCSS = customCSS || '';
        const combinedCSS = existingCSS.trim()
          ? `${existingCSS}\n\n/* Extracted from HTML */\n${extractedCSS.trim()}`
          : extractedCSS.trim();
        setCustomCSS(combinedCSS);
        setSaveMessage('✓ Extracted CSS from <style> tags and moved to CSS tab');
        setTimeout(() => setSaveMessage(null), 3000);
      }

      // Switch to advanced mode
      if (useStandardLayout) {
        setUseStandardLayout(false);
        if (cssMode === 'inherit') {
          setCSSMode('disable');
        }
      }
    } else {
      // No style tags, just set the template as-is
      setTemplate(newValue);

      // Auto-detect when user types HTML and switch to advanced mode
      if (useStandardLayout && newValue.trim()) {
        // Check if the user is typing HTML-like content
        const hasHTMLTags = /<[^>]+>/.test(newValue);
        const hasIslandTags = /\{\{[^}]+\}\}/.test(newValue);

        if (hasHTMLTags || hasIslandTags) {
          // User is typing HTML/template content, switch to advanced mode
          // Match gallery behavior exactly
          setUseStandardLayout(false);
          // Set CSS mode to 'disable' for full control, like gallery templates
          if (cssMode === 'inherit') {
            setCSSMode('disable');
          }
          setSaveMessage('✓ Switched to Advanced Template mode');
          setTimeout(() => setSaveMessage(null), 3000);
        }
      }
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>

      <div className="enhanced-template-editor w-full">
      {/* Unified Mode Status Indicator */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900">Profile Mode:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                useStandardLayout
                  ? 'bg-green-100 text-green-800'
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {useStandardLayout ? 'Standard Layout' : 'Custom Template'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900">CSS Mode:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                cssMode === 'inherit'
                  ? 'bg-green-100 text-green-800'
                  : cssMode === 'override'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {cssMode}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-600">
              Database: {initialTemplateMode} → {useStandardLayout ? 'enhanced' : 'advanced'}
            </span>
            <div className="flex items-center gap-2">
              {/* History Button */}
              <button
                onClick={() => setShowHistoryPanel(true)}
                className="px-2 py-1 text-xs rounded font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                title="Load an earlier version of your page"
              >
                <span className="inline-flex items-center gap-1"><PixelIcon name="clock" size={12} /> History</span>
              </button>

              {/* Reset to Default Template Button */}
              <button
                onClick={resetToDefaultTemplate}
                className="px-2 py-1 text-xs rounded font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                title="Remove all customizations and return to site default"
              >
                <span className="inline-flex items-center gap-1"><PixelIcon name="reload" size={12} /> Reset to Default</span>
              </button>

              {/* Save State Indicator */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                saveState === 'saved' ? 'bg-green-100 text-green-700' :
                saveState === 'saving' ? 'bg-blue-100 text-blue-700' :
                saveState === 'error' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {saveState === 'saved' && (
                  <><PixelIcon name="check" size={12} /><span>Saved</span></>
                )}
                {saveState === 'saving' && (
                  <><span className="animate-spin"><PixelIcon name="reload" size={12} /></span><span>Saving...</span></>
                )}
                {saveState === 'error' && (
                  <><PixelIcon name="close" size={12} /><span>Error</span></>
                )}
                {saveState === 'pending' && (
                  <><span>●</span><span>Unsaved</span></>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Draft recovery */}
      {pendingDraft && (
        <DraftRestoreBanner
          savedAt={pendingDraft.savedAt}
          onRestore={() => {
            const draft = pendingDraft.data;
            setTemplate(draft.template);
            setCustomCSS(draft.customCSS);
            setCSSMode(draft.cssMode);
            setUseStandardLayout(draft.useStandardLayout);
            setHideNavigation(draft.hideNavigation);
            clearDraft();
          }}
          onDiscard={clearDraft}
        />
      )}

      {/* Mode Selector */}
      <div className="flex justify-between items-center px-4 py-2 bg-thread-cream border-b border-thread-sage">
        <div className="flex gap-1">
          <span className="px-3 py-1 text-sm font-medium rounded bg-thread-sage text-white">
            {useStandardLayout ? 'CSS Editor' : 'Code Editor'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ViewSourceToggle username={user.primaryHandle?.split('@')[0] || user.handles?.[0]?.handle?.split('@')[0] || ''} />
          <div className="text-xs text-thread-sage">
            {useStandardLayout
              ? 'Customize the standard layout with CSS'
              : 'Direct HTML/CSS editing'
            }
          </div>
        </div>
      </div>

      {/* Default Mode Warning Banner */}
      {currentTemplateMode === 'default' && (
        <div className="mx-4 mt-3 mb-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <PixelIcon name="info-box" size={24} />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">Profile in Default Mode</h4>
              <p className="text-sm text-blue-800 leading-relaxed">
                Your profile is currently using the site&apos;s default template. Any changes you save here will automatically switch your profile to <strong>Advanced Template Mode</strong>, giving you full control over your design.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation - exactly matching original style */}
      <div className="flex gap-1 px-4">
        {!useStandardLayout && (
          <button
            onClick={() => setActiveTab('template')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'template'
                ? 'bg-thread-paper text-thread-charcoal border-t-2 border-l-2 border-r-2 border-thread-sage'
                : 'text-thread-sage hover:text-thread-charcoal hover:bg-thread-cream'
            }`}
          >
            HTML Template
          </button>
        )}
        <button
          onClick={() => setActiveTab('css')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'css'
              ? 'bg-thread-paper text-thread-charcoal border-t-2 border-l-2 border-r-2 border-thread-sage'
              : 'text-thread-sage hover:text-thread-charcoal hover:bg-thread-cream'
          }`}
        >
          {useStandardLayout ? 'CSS Styling' : 'CSS Styles'}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowPreviewPane(v => !v)}
            className="hidden lg:flex px-4 py-2 text-sm font-medium rounded-lg bg-thread-pine hover:opacity-90 text-white transition-opacity items-center gap-2"
          >
            <PixelIcon name="search" size={16} />
            {showPreviewPane ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            onClick={openPopupPreview}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2"
            title="Open the preview in its own window"
          >
            <PixelIcon name="external-link" size={16} />
            Pop Out
          </button>
        </div>
      </div>

      {/* Editor + live preview split */}
      <div className="flex items-stretch">
      <div className="flex-1 min-w-0">

      {/* Tab Content */}
      <div className="flex-1">
        {/* HTML Editor Tab */}
        {activeTab === 'template' && (
          <div className="w-full flex flex-col">
            {/* Editor Toolbar - matching original seamless style */}
            <div className="bg-thread-cream border-b border-thread-sage/30 border-l-2 border-r-2 border-thread-sage px-4 py-3 -mt-px">

              {/* Template Gallery with Progressive Disclosure */}
              <details className="mb-4">
                <summary className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                  <PixelIcon name={useStandardLayout ? 'paint-bucket' : 'folder'} size={16} />
                  <span className="font-semibold text-thread-pine">
                    {useStandardLayout ? 'CSS Theme Gallery' : 'HTML Template Gallery'}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">Click to expand</span>
                </summary>

                <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  {useStandardLayout ? (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-thread-charcoal mb-2">CSS Themes for Standard Layout</h5>
                        <p className="text-sm text-gray-600 mb-3">
                          These themes add beautiful styling to your standard layout without changing the structure.
                        </p>
                        <div className="flex gap-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value === '') return;
                              showDataLossWarning(
                                "Apply CSS Theme",
                                `This will replace your current CSS with the theme. Any unsaved changes will be lost.`,
                                () => {
                                  const templateCSS = getDefaultProfileTemplate(e.target.value as any);
                                  setCustomCSS(templateCSS);
                                  setCSSMode('inherit'); // Themes work with inherit mode
                                }
                              );
                              e.target.value = '';
                            }}
                            className="text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
                          >
                            <option value="">Choose a CSS theme...</option>
                            <option value="abstract-art">Abstract Art</option>
                            <option value="charcoal-nights">Charcoal Nights</option>
                            <option value="pixel-petals">Pixel Petals</option>
                            <option value="retro-social">Retro Social</option>
                            <option value="classic-linen">Classic Linen</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <StarterTemplateGallery
                      onSelect={(starterTemplate, starterCSS, name) => {
                        showDataLossWarning(
                          "Load Starter",
                          `This will replace your current HTML and CSS with "${name}". Any unsaved changes will be lost.`,
                          () => {
                            setUseStandardLayout(false);
                            setTemplate(starterTemplate);
                            setCustomCSS(starterCSS);
                            setCSSMode('disable');
                          }
                        );
                      }}
                    />
                  )}
                </div>
              </details>

              {/* Action Bar */}
              <div className="flex items-center justify-between">
                <a
                  href="/design-css-tutorial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                >
                  <PixelIcon name="article" size={16} /> Design Guide
                </a>

                <div className="flex items-center gap-3">
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
                    {isSaving ? 'Saving...' : 'Save & Go Live'}
                  </button>
                </div>
              </div>
            </div>

            {/* HTML Code Editor - matching original style */}
            <div className="w-full">
              <div className="px-4 py-4">
                {!useStandardLayout && (
                  <>
                    <label className="block mb-3">
                      <span className="thread-label text-lg">Custom Template HTML</span>
                      <span className="text-sm text-thread-sage ml-2">Plain HTML plus ThreadStead components</span>
                    </label>

                    {/* Navigation Toggle */}
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hideNavigation"
                        checked={!hideNavigation}
                        onChange={(e) => setHideNavigation(!e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="hideNavigation" className="text-sm text-thread-sage">
                        Show site navigation
                      </label>
                    </div>
                    <div className="border border-thread-sage rounded overflow-hidden focus-within:border-thread-pine focus-within:ring-1 focus-within:ring-thread-pine">
                      <CodeMirror
                        onCreateEditor={(view) => { templateViewRef.current = view; }}
                        value={template}
                        onChange={handleTemplateChange}
                        extensions={templateExtensions}
                        height="560px"
                        style={{ fontSize: '13px' }}
                        placeholder="Write your page here — plain HTML works, and so do components like <ProfilePhoto /> or <RetroCard>…</RetroCard>"
                        basicSetup={{
                          lineNumbers: true,
                          foldGutter: true,
                          autocompletion: true,
                          highlightActiveLine: true,
                        }}
                      />
                    </div>
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
                      className="text-xs px-2 py-1 border border-thread-sage rounded bg-thread-paper hover:bg-thread-cream focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
                    >
                      <option value="inherit">Inherit (add styles to site defaults)</option>
                      <option value="override">Override (your CSS takes precedence)</option>
                      <option value="disable">Disable (complete CSS control)</option>
                    </select>
                  </div>


                  {/* CSS Template Selector */}
                  {useStandardLayout ? (
                    <button
                      onClick={() => setShowTemplateSelector(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      <PixelIcon name="paint-bucket" size={16} />
                      Choose Theme
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-thread-sage">Template:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value === '') return;
                          showDataLossWarning(
                            "Load CSS Template",
                            `This will replace your current CSS with the template. Any unsaved changes will be lost.`,
                            () => {
                              const templateCSS = getDefaultProfileTemplate(e.target.value as any);
                              setCustomCSS(templateCSS);
                            }
                          );
                          // Reset the selector
                          e.target.value = '';
                        }}
                        className="text-xs px-2 py-1 border border-thread-sage rounded bg-thread-paper hover:bg-thread-cream"
                      >
                        <option value="">Load Template...</option>
                        <option value="abstract-art">Abstract Art</option>
                        <option value="charcoal-nights">Charcoal Nights</option>
                        <option value="pixel-petals">Pixel Petals</option>
                        <option value="retro-social">Retro Social</option>
                        <option value="classic-linen">Classic Linen</option>
                        <option value="clear">Clear CSS</option>
                      </select>
                    </div>
                  )}
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
                  {useStandardLayout && customCSS && (() => {
                    // Detect current template
                    const templates: Array<{id: string, name: string}> = [
                      {id: 'abstract-art', name: 'Abstract Art'},
                      {id: 'charcoal-nights', name: 'Charcoal Nights'},
                      {id: 'pixel-petals', name: 'Pixel Petals'},
                      {id: 'retro-social', name: 'Retro Social'},
                      {id: 'classic-linen', name: 'Classic Linen'}
                    ];
                    
                    for (const template of templates) {
                      const templateCSS = getDefaultProfileTemplate(template.id as any);
                      const normalize = (str: string) => str.replace(/\s+/g, ' ').trim().substring(0, 200);
                      if (normalize(customCSS).includes(normalize(templateCSS).substring(0, 100))) {
                        return (
                          <span className="ml-3 px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
                            ✓ {template.name} Theme Applied
                          </span>
                        );
                      }
                    }
                    return null;
                  })()}
                </label>
                
                {/* Enhanced CSS Mode Explainer */}
                <div className={`mb-3 text-sm p-4 rounded-lg border-2 ${
                  cssMode === 'inherit'
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : cssMode === 'override'
                    ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                    : 'bg-red-50 border-red-300 text-red-800'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-base">
                      {cssMode === 'inherit' && 'Inherit Mode'}
                      {cssMode === 'override' && 'Override Mode'}
                      {cssMode === 'disable' && 'Disable Mode'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      cssMode === 'inherit'
                        ? 'bg-green-100 text-green-700'
                        : cssMode === 'override'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {useStandardLayout ? 'Standard Layout' : 'Custom Template'}
                    </span>
                  </div>

                  {cssMode === 'inherit' && (
                    <div className="space-y-2">
                      <p><strong>How it works:</strong> Your CSS adds to ThreadStead&apos;s base styles</p>
                      <p><strong>Best for:</strong> {useStandardLayout ? 'Styling the standard layout with colors, fonts, and effects' : 'Custom templates that want to feel integrated with the site'}</p>
                      <p><strong>Result:</strong> Navigation, buttons, and layout components keep their ThreadStead styling while your customizations are applied on top</p>
                    </div>
                  )}

                  {cssMode === 'override' && (
                    <div className="space-y-2">
                      <p><strong>How it works:</strong> Your CSS takes priority over ThreadStead&apos;s styles</p>
                      <p><strong>Best for:</strong> Major visual redesigns while keeping site functionality</p>
                      <p><strong>Result:</strong> You can completely change colors, fonts, and layout appearance. Navigation remains functional but styled by you</p>
                      {useStandardLayout && <p className="text-yellow-900"><strong>Note:</strong> This affects the entire profile page appearance including navigation</p>}
                    </div>
                  )}

                  {cssMode === 'disable' && (
                    <div className="space-y-2">
                      <p><strong>How it works:</strong> All ThreadStead CSS is disabled - you style everything</p>
                      <p><strong>Best for:</strong> {useStandardLayout ? 'NOT RECOMMENDED for standard layout' : 'Custom templates with complete visual control'}</p>
                      <p><strong>Result:</strong> You must style buttons, navigation, layouts from scratch. Complete creative freedom but more work</p>
                      {useStandardLayout && (
                        <div className="bg-red-100 border border-red-200 rounded p-2 mt-2">
                          <p className="text-red-900 font-medium">Warning: Standard layout needs ThreadStead CSS to function properly. Consider switching to Custom Template mode instead.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="border border-thread-sage rounded overflow-hidden focus-within:border-thread-pine focus-within:ring-1 focus-within:ring-thread-pine">
                  <CodeMirror
                    value={customCSS}
                    onChange={(value: string) => setCustomCSS(value)}
                    extensions={[cssLang()]}
                    height="560px"
                    style={{ fontSize: '13px' }}
                    placeholder={cssMode === 'inherit' ?
                      `/* Site styles will be inherited - extend them here */

.site-header {
  background: linear-gradient(135deg, #2E4B3F 0%, #4FAF6D 100%);
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
                    basicSetup={{
                      lineNumbers: true,
                      foldGutter: true,
                      autocompletion: true,
                      highlightActiveLine: true,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}


      </div>

      {/* Component palette - registry-fed, insert at cursor */}
      {activeTab === 'template' && !useStandardLayout && (
        <div className="editor-footer bg-thread-cream border-t border-thread-sage/30 p-4">
          <details className="text-sm" open>
            <summary className="cursor-pointer font-medium mb-2 flex items-center gap-2">
              <PixelIcon name="folder" size={14} /> Components
              <span className="text-xs text-thread-sage font-normal">
                — hover for props, autocomplete knows them too
              </span>
            </summary>
            <div className="mt-2">
              <ComponentPalette schemas={componentSchemas} onInsert={insertIntoTemplate} />
            </div>
          </details>
        </div>
      )}

      </div>{/* end editor column */}

      {/* Live preview pane */}
      {showPreviewPane && (
        <div className="hidden lg:flex flex-col w-[46%] flex-shrink-0 border-l-2 border-thread-sage bg-white sticky top-0 self-start h-screen">
          <div className="flex items-center justify-between px-3 py-2 bg-thread-cream border-b border-thread-sage flex-shrink-0">
            <span className="text-sm font-medium text-thread-charcoal flex items-center gap-2">
              <PixelIcon name="search" size={14} /> Live preview
            </span>
            <span className="text-xs text-thread-sage">
              {previewFrameReady ? 'Updates as you type' : 'Warming up…'}
            </span>
          </div>
          <iframe
            ref={previewFrameRef}
            src="/template-preview?embed=1"
            title="Live preview of your page"
            className="flex-1 w-full bg-white"
          />
        </div>
      )}
      </div>{/* end editor + preview split */}

      {/* Template Selector Modal - only for Standard Layout */}
      {showTemplateSelector && useStandardLayout && (
        <TemplatePanelSelector
          currentCSS={customCSS}
          onSelectTemplate={(css, templateName) => {
            showDataLossWarning(
              "Apply Template",
              `This will replace your current CSS with the "${templateName}" template. Any unsaved changes will be lost.`,
              () => {
                setCustomCSS(css);
                setCSSMode('inherit'); // Templates work best with inherit mode
                setSaveMessage(`✓ Applied ${templateName} template`);
                setTimeout(() => setSaveMessage(null), 3000);
              }
            );
            setShowTemplateSelector(false);
          }}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
      
      {/* Data Loss Warning Dialog */}
      <DataLossWarning
        isOpen={warningDialog.isOpen}
        onClose={closeWarning}
        onConfirm={confirmWarningAction}
        title={warningDialog.title}
        message={warningDialog.message}
      />


      {/* Revision History Panel */}
      {showHistoryPanel && (
        <TemplateHistoryPanel
          username={user.primaryHandle?.split('@')[0] || user.handles?.[0]?.handle?.split('@')[0] || ''}
          onClose={() => setShowHistoryPanel(false)}
          onLoadRevision={(rev: FullRevision) => {
            showDataLossWarning(
              "Load This Version",
              "This will replace what's in the editor with the version you picked. Any unsaved changes will be lost — your live page stays as-is until you save.",
              () => {
                setTemplate(rev.customTemplate || '');
                setCustomCSS(rev.customCSS || '');
                setCSSMode(rev.cssMode);
                setUseStandardLayout(rev.templateMode !== 'advanced');
                setHideNavigation(rev.hideNavigation);
                setShowHistoryPanel(false);
                setSaveMessage('✓ Version loaded into the editor');
                setTimeout(() => setSaveMessage(null), 3000);
              }
            );
          }}
        />
      )}

      {/* Validation Feedback Panel */}
      {showValidationPanel && validationResult && (
        <ValidationFeedbackPanel
          validationResult={validationResult}
          onDismiss={() => setShowValidationPanel(false)}
          onSaveAnyway={validationResult.errors.length === 0 ? performSave : undefined}
        />
      )}
    </div>
    </>
  );
}