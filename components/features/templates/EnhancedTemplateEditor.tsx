// Enhanced template editor with islands support
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { fetchResidentData } from '@/lib/templates/core/template-data';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import type { CompiledTemplate } from '@/lib/templates/compilation/compiler';
import { getDefaultProfileTemplate, DEFAULT_PROFILE_TEMPLATE_INFO } from '@/lib/templates/default-profile-templates';
import TemplatePanelSelector from './TemplatePanelSelector';
import { TEMPLATE_EXAMPLES } from '@/lib/templates/default-profile-template';
import { HTML_TEMPLATES, getHTMLTemplate } from '@/lib/templates/default-html-templates';
import Link from 'next/link';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { generatePreviewCSS, type CSSMode, type TemplateMode } from '@/lib/utils/css/layers';
import { useSiteCSS } from '@/hooks/useSiteCSS';
import NavigationPreview from '@/components/features/templates/NavigationPreview';
import VisualTemplateBuilder from './visual-builder/VisualTemplateBuilder';
import { parseExistingTemplate } from '@/lib/templates/visual-builder/template-parser-reverse';
import { extractLegacyValues, generateConvertedTemplate, generateConvertedCSS, generateConvertedTemplateWithCSS, validateExtractedValues, generateConversionSummary, generateGlobalSettingsFromLegacy } from '@/lib/utils/css/legacy-conversion';

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
                  ✅ Will be preserved
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
                  🗑️ Will be cleared
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

// Component to handle preview for both standard layout and custom template modes
interface StandardLayoutPreviewProps {
  user: any;
  template: string;
  customCSS: string;
  cssMode: 'inherit' | 'override' | 'disable';
  useStandardLayout: boolean;
  hideNavigation: boolean;
  residentData: ResidentData;
  onCompile: (compiledTemplate: CompiledTemplate | null) => void;
  onError: (error: string) => void;
  defaultTemplate?: string | null;
  loadingDefaultTemplate: boolean;
  siteWideCSS?: string;
}

// REMOVED: PreviewNavBar - now handled inside Shadow DOM in TemplatePreview.tsx

function StandardLayoutPreview({
  user,
  template,
  customCSS,
  cssMode,
  useStandardLayout,
  hideNavigation,
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
      {/* Apply user CSS GLOBALLY for advanced templates like ProfileModeRenderer does */}
      {!useStandardLayout && customCSS && (
        <style dangerouslySetInnerHTML={{ __html: `
          /* User CSS applied globally like ProfileModeRenderer does */
          ${customCSS}
        ` }} />
      )}
      
      {/* Helpful info for standard layout users */}
      {useStandardLayout && (
        <div className="p-3 bg-blue-50 border-b border-blue-200 text-sm text-blue-700">
          <strong>Preview:</strong> This shows how your CSS will look with the standard layout including navigation and footer.
          The layout structure cannot be modified, but your CSS styling is applied.
        </div>
      )}
      
      {/* Preview is now handled by popup window - no inline preview */}
      <div className="preview-placeholder bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-gray-500">
          <div className="text-xl mb-2">🔍</div>
          <div className="font-medium">Template Preview</div>
          <div className="text-sm mt-1">Use the &quot;Preview Pop Up&quot; button to see your template</div>
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
  onSave?: (template: string, css: string, compiledTemplate?: CompiledTemplate, cssMode?: 'inherit' | 'override' | 'disable', hideNavigation?: boolean) => void;
}

export default function EnhancedTemplateEditor({
  user,
  initialTemplate = '',
  initialCSS = '',
  initialCSSMode = 'inherit',
  initialTemplateMode = 'default',
  initialShowNavigation = true,
  onSave
}: EnhancedTemplateEditorProps) {
  // AUTO-FIX: Detect and unwrap flow templates that were incorrectly wrapped
  // This fixes templates corrupted by the previous auto-wrap bug
  const unwrappedTemplate = React.useMemo(() => {
    // Check if template has the wrapper AND flow components
    const hasWrapper = initialTemplate.includes('pure-absolute-container');
    const hasFlowComponents = initialTemplate.includes('<GradientBox') ||
                              initialTemplate.includes('<CenteredBox') ||
                              initialTemplate.includes('<FlexBox') ||
                              initialTemplate.includes('<Card') ||
                              initialTemplate.includes('<RetroCard');

    if (hasWrapper && hasFlowComponents) {
      // Extract content from inside the pure-absolute-container div
      const containerMatch = initialTemplate.match(/<div[^>]*class="[^"]*pure-absolute-container[^"]*"[^>]*>([\s\S]*)<\/div>\s*$/);
      if (containerMatch && containerMatch[1]) {
        const unwrapped = containerMatch[1].trim();
        return unwrapped;
      }
    }

    return initialTemplate;
  }, [initialTemplate]);

  const [template, setTemplate] = useState(unwrappedTemplate);

  const [customCSS, setCustomCSS] = useState(initialCSS);
  const [cssMode, setCSSMode] = useState<'inherit' | 'override' | 'disable'>(initialCSSMode);
  
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
  // Smart default tab selection based on layout mode
  const [activeTab, setActiveTab] = useState<'template' | 'css' | 'visual'>(() => {
    // If starting in standard layout mode, default to CSS tab since there's no HTML template to edit
    return useStandardLayout ? 'css' : 'template';
  });
  const [editorMode, setEditorMode] = useState<'code' | 'visual'>('code');
  // Set to true to always show welcome on Visual Builder open (for testing)
  const [showVisualBuilderWelcome, setShowVisualBuilderWelcome] = useState(true);

  // Legacy template conversion warning
  const [showLegacyWarning, setShowLegacyWarning] = useState(false);
  const [conversionSummary, setConversionSummary] = useState<{ preserved: string[]; cleared: string[] } | null>(null);

  // Detect if current template is legacy (no Visual Builder wrapper)
  const isLegacyTemplate = useCallback(() => {
    const fullTemplate = `${template}${customCSS.trim() ? `\n<style>\n${customCSS}\n</style>` : ''}`;

    // Check for Visual Builder HTML markers
    const hasVBHtmlMarkers = fullTemplate.includes('pure-absolute-container') &&
                            (fullTemplate.includes('vb-theme-') ||
                             fullTemplate.includes('vb-pattern-') ||
                             fullTemplate.includes('vb-effect-'));

    // Check for Visual Builder CSS markers - indicates generated or converted VB content
    const hasVBCssMarkers = customCSS.includes('Visual Builder Generated CSS') ||
                           customCSS.includes('Visual Builder\'s theme system') ||
                           customCSS.includes('vb-theme-custom') ||
                           customCSS.includes('--global-bg-color') ||
                           customCSS.includes('--global-bg-gradient') ||
                           customCSS.includes(':root');

    // Check for Visual Builder empty template - generated when no components are placed
    const isVBEmptyTemplate = template.includes('template-empty') ||
                             template.includes('No components placed');

    // It's a Visual Builder template if it has any VB markers OR is an empty VB template
    const isVisualBuilderTemplate = hasVBHtmlMarkers || hasVBCssMarkers || isVBEmptyTemplate;

    // It's legacy only if it has content but no VB markers
    return !isVisualBuilderTemplate && template.trim().length > 0;
  }, [template, customCSS]);

  // Save state management
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error' | 'pending'>('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle template changes from visual builder
  const handleVisualTemplateChange = useCallback((html: string) => {
    // When Visual Builder returns HTML, we need to separate CSS and HTML
    // Check if the HTML contains style tags
    const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);

    if (styleMatches && styleMatches.length > 0) {
      // Extract CSS from style tags
      let newCSS = '';
      let userCSS = customCSS || '';

      styleMatches.forEach(styleTag => {
        const cssMatch = styleTag.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (cssMatch && cssMatch[1]) {
          const css = cssMatch[1].trim();

          // Check if this is Visual Builder CSS
          const isVisualBuilderCSS =
            css.includes('Visual Builder Generated CSS') ||
            css.includes('VB_GENERATED_CSS') || // New marker
            css.includes('CSS Custom Properties for easy editing') ||
            css.includes('CSS Classes for styling') ||
            css.includes('--global-bg-color') ||
            css.includes('--vb-bg-type') ||
            css.includes('--vb-pattern-type') ||
            css.includes('--vb-pattern-primary') ||
            css.includes('--global-font-family') ||
            css.includes('--global-typography-scale') ||
            css.includes('.vb-theme-') ||
            css.includes('.vb-effect-') ||
            css.includes('.vb-pattern-') ||
            // Check for any CSS that contains multiple VB variables
            (css.match(/--(?:vb-|global-)/g) || []).length > 2;

          if (isVisualBuilderCSS) {
            // For Visual Builder CSS, completely replace (not append)
            // We'll generate fresh CSS each time instead of trying to deduplicate
            newCSS = css;
          } else {
            // Keep other CSS as user CSS
            if (!userCSS.includes(css)) {
              userCSS += userCSS ? '\n\n' + css : css;
            }
          }
        }
      });

      // Update CSS tab with ONLY user CSS + new Visual Builder CSS (complete replacement)
      // First, strip out any existing Visual Builder CSS from current CSS
      let cleanUserCSS = customCSS || '';

      // Remove all existing Visual Builder CSS blocks
      const vbRemovalPatterns = [
        /\/\* Visual Builder Generated CSS.*?\*\/[\s\S]*?(?=(?:\/\*(?!.*Visual Builder)|\s*$))/g,
        /\/\* CSS Custom Properties for easy editing \*\/[\s\S]*?(?=(?:\/\*(?!.*CSS Custom Properties)|\s*$))/g,
        /\/\* CSS Classes for styling \*\/[\s\S]*?(?=(?:\/\*(?!.*CSS Classes)|\s*$))/g
      ];

      vbRemovalPatterns.forEach(pattern => {
        cleanUserCSS = cleanUserCSS.replace(pattern, '').trim();
      });

      // Clean up multiple newlines
      cleanUserCSS = cleanUserCSS.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

      // Combine clean user CSS with new Visual Builder CSS
      const combinedCSS = newCSS ?
        (cleanUserCSS ? `${cleanUserCSS}\n\n/* Visual Builder Generated CSS */\n${newCSS}` : `/* Visual Builder Generated CSS */\n${newCSS}`) :
        cleanUserCSS;

      if (combinedCSS !== customCSS) {
        setCustomCSS(combinedCSS);
      }
    }

    // Remove style tags from HTML for the template tab
    const cleanedHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
    setTemplate(cleanedHtml);
  }, [customCSS]);

  // Handle mode switching between code and visual
  const handleModeSwitch = useCallback((newMode: 'code' | 'visual') => {
    // REMOVED: Legacy template conversion to positioned mode
    // Templates should only use positioned mode if they have pure-absolute-container
    // All other templates render in flow mode automatically

    setEditorMode(newMode);
    if (newMode === 'visual') {
      setActiveTab('visual');
    } else {
      setActiveTab('template');
    }
  }, []);

  // Handle legacy template conversion confirmation
  const handleLegacyConversion = useCallback(() => {
    setShowLegacyWarning(false);

    // Extract values from current CSS for conversion
    const rawExtracted = extractLegacyValues(customCSS);
    const extractedValues = validateExtractedValues(rawExtracted);

    // Generate complete template with CSS for Visual Builder parsing
    // This allows the Visual Builder to understand the global settings
    const convertedTemplateWithCSS = generateConvertedTemplateWithCSS(extractedValues);

    // For the template tab, we want just the clean HTML
    const cleanTemplate = generateConvertedTemplate();

    // For the CSS tab, we want the proper Visual Builder CSS
    const convertedCSS = generateConvertedCSS(extractedValues);

    // Set both template and CSS
    setTemplate(convertedTemplateWithCSS); // This will be parsed by Visual Builder
    setCustomCSS(convertedCSS); // This shows in the CSS tab for editing

    // Switch to Visual Builder mode
    setEditorMode('visual');
    setActiveTab('visual');
  }, [customCSS]);

  const handleLegacyCancel = useCallback(() => {
    setShowLegacyWarning(false);
    // Stay in code mode
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadingDefault, setLoadingDefault] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
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
          // User not authenticated - Visual Builder will continue to work
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
        // Network connectivity issue - Visual Builder will continue to work
      }

      // Don't throw the error, just return null to allow Visual Builder to continue working
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
      '/preview-temp',
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
      alert('Pop-up blocked! Please allow pop-ups for this site to use the preview feature.');
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
        setSaveMessage('✓ Standard layout saved!');
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
          setSaveMessage('⚠️ Please preview the template first, then save');
          return;
        }
        
        await onSave(previewTemplate || '', previewCSS || '', templateToSave, previewCSSMode || 'inherit', previewHideNavigation !== undefined ? previewHideNavigation : false);
        setSaveMessage('✓ Advanced template saved!');
      }
      
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

        // If compilation failed, Visual Builder continues to work
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
  }, [useStandardLayout, activeTab, editorMode]);

  // Track changes for auto-save
  useEffect(() => {
    setHasUnsavedChanges(true);
    setSaveState('pending');

    // Clear existing timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // Set new auto-save timer (3 seconds after last change)
    autoSaveTimer.current = setTimeout(() => {
      if (hasUnsavedChanges && saveState === 'pending') {
        handleAutoSave();
      }
    }, 3000);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [template, customCSS, useStandardLayout, cssMode, hideNavigation]);

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

  // Auto-save function
  const handleAutoSave = useCallback(async () => {
    if (!onSave) return;

    setSaveState('saving');
    try {
      const compiledTemplateData = compiledTemplate || (await compileTemplateForPreview(true));
      await onSave(template, customCSS, compiledTemplateData || undefined, cssMode, hideNavigation);
      setSaveState('saved');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveState('error');
      // Auto-retry after 10 seconds
      setTimeout(() => {
        if (saveState === 'error') {
          handleAutoSave();
        }
      }, 10000);
    }
  }, [onSave, template, customCSS, compiledTemplate, compileTemplateForPreview, cssMode, hideNavigation, saveState]);

  // Manual save function (enhanced)
  const handleManualSave = useCallback(async () => {
    if (!onSave) return;

    setSaveState('saving');
    setHasUnsavedChanges(false);

    try {
      const compiledTemplateData = compiledTemplate || (await compileTemplateForPreview(true));
      await onSave(template, customCSS, compiledTemplateData || undefined, cssMode, hideNavigation);
      setSaveState('saved');
      setSaveMessage('✓ Template saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Manual save failed:', error);
      setSaveState('error');
      setSaveMessage('❌ Save failed - please try again');
      setTimeout(() => setSaveMessage(null), 5000);
    }
  }, [onSave, template, customCSS, compiledTemplate, compileTemplateForPreview, cssMode, hideNavigation]);

  // Use the enhanced manual save as handleSave
  const handleSave = handleManualSave;

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
              <button
                onClick={useStandardLayout ? loadDefaultTemplate : useStandardLayoutOption}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  useStandardLayout
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                Switch to {useStandardLayout ? 'Custom Template' : 'Standard Layout'}
              </button>

              {/* Save State Indicator */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                saveState === 'saved' ? 'bg-green-100 text-green-700' :
                saveState === 'saving' ? 'bg-blue-100 text-blue-700' :
                saveState === 'error' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {saveState === 'saved' && (
                  <><span>✅</span><span>Saved</span></>
                )}
                {saveState === 'saving' && (
                  <><span className="animate-spin">⏳</span><span>Saving...</span></>
                )}
                {saveState === 'error' && (
                  <><span>❌</span><span>Error</span></>
                )}
                {saveState === 'pending' && (
                  <><span>●</span><span>Unsaved</span></>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-between items-center px-4 py-2 bg-thread-cream border-b border-thread-sage">
        <div className="flex gap-1">
          <button
            onClick={() => handleModeSwitch('code')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              editorMode === 'code'
                ? 'bg-thread-sage text-white'
                : 'text-thread-sage hover:text-thread-charcoal hover:bg-thread-paper'
            }`}
          >
            {useStandardLayout ? 'CSS Editor' : 'Code Editor'}
          </button>
          <button
            onClick={() => {
              // If in standard layout, upgrade to custom template first
              if (useStandardLayout) {
                loadDefaultTemplate(); // This switches to custom template mode
                setTimeout(() => handleModeSwitch('visual'), 100); // Then open Visual Builder
              } else {
                handleModeSwitch('visual');
              }
            }}
            className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all transform hover:scale-105 ${
              editorMode === 'visual'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 shadow-md hover:shadow-lg'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <div className="flex flex-col items-start">
                <span className="font-semibold">Visual Builder</span>
                <span className="text-xs opacity-90">{useStandardLayout ? 'Unlock full design' : 'Design visually'}</span>
              </div>
            </div>
          </button>
        </div>
        <div className="text-xs text-thread-sage">
          {useStandardLayout
            ? 'Customize the standard layout with CSS'
            : editorMode === 'visual'
            ? 'Drag & drop visual editing'
            : 'Direct HTML/CSS editing'
          }
        </div>
      </div>

      {/* Tab Navigation - exactly matching original style */}
      <div className="flex gap-1 px-4">
        {editorMode === 'code' ? (
          <>
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
          </>
        ) : (
          <div className="px-4 py-2 text-sm font-medium text-thread-charcoal bg-thread-paper border-t-2 border-l-2 border-r-2 border-thread-sage rounded-t-lg">
            Visual Builder
          </div>
        )}
        {/* Only show preview button for standard layout (not custom templates) */}
        {useStandardLayout && (
          <button
            onClick={openPopupPreview}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2 ml-auto"
          >
            <span>🔍</span>
            Open Preview
          </button>
        )}
      </div>

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
                  <span className="font-semibold text-thread-pine">
                    {useStandardLayout ? '🎨 CSS Theme Gallery' : '📦 HTML Template Gallery'}
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
                            <option value="abstract-art">🎨 Abstract Art</option>
                            <option value="charcoal-nights">🖤 Charcoal Nights</option>
                            <option value="pixel-petals">🌸 Pixel Petals</option>
                            <option value="retro-social">📱 Retro Social</option>
                            <option value="classic-linen">🧵 Classic Linen</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-thread-charcoal mb-2">Modern HTML Templates</h5>
                        <p className="text-sm text-gray-600 mb-3">
                          Complete templates with HTML structure and styling using ThreadStead components.
                        </p>
                        <select
                          onChange={(e) => {
                            const selectedTemplate = TEMPLATE_EXAMPLES[e.target.value as keyof typeof TEMPLATE_EXAMPLES];
                            if (selectedTemplate) {
                              showDataLossWarning(
                                "Load Modern Template",
                                `This will replace your current HTML and CSS with the "${selectedTemplate.name || e.target.value}" template. Any unsaved changes will be lost.`,
                                () => {
                                  setUseStandardLayout(false);
                                  setTemplate(selectedTemplate.template);
                                  setCustomCSS(selectedTemplate.css);
                                  setCSSMode('disable');
                                }
                              );
                              e.target.value = '';
                            }
                          }}
                          className="text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 w-full"
                          defaultValue=""
                        >
                          <option value="">Choose a modern template...</option>
                          {Object.entries(TEMPLATE_EXAMPLES).map(([key, template]) => (
                            <option key={key} value={key}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <h5 className="font-medium text-thread-charcoal mb-2">Classic HTML Templates</h5>
                        <p className="text-sm text-gray-600 mb-3">
                          Legacy templates with complete HTML and CSS for reference and starting points.
                        </p>
                        <select
                          onChange={(e) => {
                            const templateId = e.target.value;
                            if (templateId) {
                              const htmlTemplate = getHTMLTemplate(templateId);
                              const templateName = HTML_TEMPLATES.find(t => t.id === templateId)?.name || templateId;

                              showDataLossWarning(
                                "Load Classic Template",
                                `This will replace your current HTML and CSS with the "${templateName}" template. Any unsaved changes will be lost.`,
                                () => {
                                  const styleMatch = htmlTemplate.match(/<style[^>]*>([\s\S]*?)<\/style>/);
                                  const css = styleMatch ? styleMatch[1] : '';
                                  const html = htmlTemplate.replace(/<style[^>]*>[\s\S]*?<\/style>/, '').trim();

                                  setUseStandardLayout(false);
                                  setTemplate(html);
                                  setCustomCSS(css);
                                  setCSSMode('disable');
                                }
                              );
                              e.target.value = '';
                            }
                          }}
                          className="text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 w-full"
                          defaultValue=""
                        >
                          <option value="">Choose a classic template...</option>
                          {HTML_TEMPLATES.map(template => (
                            <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <p className="text-xs text-gray-600">
                      💡 Templates provide starting points - customize them to match your style!
                    </p>
                  </div>
                </div>
              </details>

              {/* Action Bar */}
              <div className="flex items-center justify-between">
                <a
                  href="/design-tutorial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                >
                  📚 Design Guide
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
                    {isSaving ? 'Saving...' : 'Save & Go Live!'}
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
                      <span className="text-sm text-thread-sage ml-2">Use Tab/Shift+Tab for indentation</span>
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
                    <textarea
                      value={template}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        
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
                      }}
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
                      <span>🎨</span>
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
                        <option value="abstract-art">🎨 Abstract Art</option>
                        <option value="charcoal-nights">🖤 Charcoal Nights</option>
                        <option value="pixel-petals">🌸 Pixel Petals</option>
                        <option value="retro-social">📱 Retro Social</option>
                        <option value="classic-linen">🧵 Classic Linen</option>
                        <option value="clear">🗑️ Clear CSS</option>
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
                  <span className="text-sm text-thread-sage ml-2">Use Tab/Shift+Tab for indentation</span>
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
                      {cssMode === 'inherit' && '✅ Inherit Mode'}
                      {cssMode === 'override' && '⚠️ Override Mode'}
                      {cssMode === 'disable' && '🚫 Disable Mode'}
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
                      <p><strong>Best for:</strong> {useStandardLayout ? 'NOT RECOMMENDED for standard layout' : 'Custom templates with complete visual control (Visual Builder uses this mode)'}</p>
                      <p><strong>Result:</strong> You must style buttons, navigation, layouts from scratch. Complete creative freedom but more work</p>
                      {useStandardLayout && (
                        <div className="bg-red-100 border border-red-200 rounded p-2 mt-2">
                          <p className="text-red-900 font-medium">⚠️ Warning: Standard layout needs ThreadStead CSS to function properly. Consider switching to Custom Template mode instead.</p>
                        </div>
                      )}
                    </div>
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

        {/* Visual Builder Tab - Premium Full-Screen Experience */}
        {activeTab === 'visual' && editorMode === 'visual' && (
          <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col z-[9999]">
            {/* Premium Visual Builder Header */}
            <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-purple-200 px-6 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleModeSwitch('code')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all text-sm font-medium"
                  >
                    <span>←</span>
                    <span>Exit Builder</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    <div>
                      <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                        Visual Template Builder
                      </h3>
                      <span className="text-xs text-gray-600">Professional design tools at your fingertips</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      30+ Components
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Responsive Design
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Live Preview
                    </span>
                    {/* Dev Testing Button - Remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                      <button
                        onClick={() => setShowVisualBuilderWelcome(true)}
                        className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium hover:bg-yellow-200"
                        title="Show welcome modal again (dev only)"
                      >
                        🔄 Show Welcome
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Enhanced Save State Display for Visual Builder */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    saveState === 'saved' ? 'bg-green-100 text-green-800 border border-green-200' :
                    saveState === 'saving' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    saveState === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                    'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {saveState === 'saved' && (
                      <><span>✅</span><span>All changes saved</span></>
                    )}
                    {saveState === 'saving' && (
                      <><span className="animate-spin">⏳</span><span>Saving changes...</span></>
                    )}
                    {saveState === 'error' && (
                      <><span>❌</span><span>Save failed - retrying...</span></>
                    )}
                    {saveState === 'pending' && hasUnsavedChanges && (
                      <><span className="animate-pulse">●</span><span>Unsaved changes</span></>
                    )}
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saveState === 'saving'}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg text-sm ${
                      saveState === 'error'
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                        : hasUnsavedChanges
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {saveState === 'saving' ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Saving...
                      </span>
                    ) : saveState === 'error' ? (
                      <span className="flex items-center gap-2">
                        <span>🔄</span>
                        Retry Save
                      </span>
                    ) : hasUnsavedChanges ? (
                      <span className="flex items-center gap-2">
                        <span>💾</span>
                        Save Now
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>✅</span>
                        Saved
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Welcome Modal for First-Time Users - Press 'W' key to show again in dev mode */}
            {showVisualBuilderWelcome && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-slideUp">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">✨</span>
                      <div>
                        <h2 className="text-2xl font-bold">Welcome to Visual Builder Pro</h2>
                        <p className="opacity-90">Design your perfect profile - no coding required</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-3xl mb-2">🎨</div>
                        <h3 className="font-semibold mb-1">Drag & Drop</h3>
                        <p className="text-sm text-gray-600">Simply drag components onto your canvas</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl mb-2">⚡</div>
                        <h3 className="font-semibold mb-1">Live Preview</h3>
                        <p className="text-sm text-gray-600">See changes instantly as you design</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl mb-2">📱</div>
                        <h3 className="font-semibold mb-1">Responsive</h3>
                        <p className="text-sm text-gray-600">Automatically adapts to all screen sizes</p>
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-purple-900 mb-2">Quick Start Options:</h4>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="start" defaultChecked className="text-purple-600" />
                          <span className="text-sm">Start with a professional template</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="start" className="text-purple-600" />
                          <span className="text-sm">Start from scratch</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowVisualBuilderWelcome(false)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                      >
                        Get Started
                      </button>
                      <button
                        onClick={() => setShowVisualBuilderWelcome(false)}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Builder - Full Screen Space */}
            <div className={`flex-1 min-h-0 overflow-hidden transition-all ${
              showVisualBuilderWelcome ? 'blur-sm pointer-events-none' : ''
            }`}>
              <VisualTemplateBuilder
                initialTemplate={customCSS && customCSS.trim() && !customCSS.includes('/* Add your custom CSS here */')
                  ? `<style>\n${customCSS}\n</style>\n${template}`
                  : template}
                onTemplateChange={handleVisualTemplateChange}
                residentData={residentData || undefined}
                className="h-full w-full"
                hideNavigation={hideNavigation}
                onNavigationToggle={setHideNavigation}
              />
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

      {/* Legacy Template Conversion Warning */}
      <DataLossWarning
        isOpen={showLegacyWarning}
        onClose={handleLegacyCancel}
        onConfirm={handleLegacyConversion}
        title="🔄 Convert to Visual Builder"
        message="This legacy template will be converted to Visual Builder format. We'll preserve your key styling choices and provide a clean slate for Visual Builder development."
        confirmText="Convert & Preserve Styling"
        preservedItems={conversionSummary?.preserved}
        clearedItems={conversionSummary?.cleared}
      />
    </div>
    </>
  );
}