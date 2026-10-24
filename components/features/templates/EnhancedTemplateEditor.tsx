// Enhanced template editor with islands support
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { html as htmlLang, htmlLanguage } from '@codemirror/lang-html';
import { css as cssLang } from '@codemirror/lang-css';
import type { EditorView } from '@codemirror/view';
import {
  fetchComponentSchemas,
  buildExtraTags,
  nicknameCompletions,
  type ComponentSchema,
} from '@/lib/templates/editor/component-autocomplete';
import ComponentPalette from '@/components/features/templates/ComponentPalette';
import ImagePicker, { type ImagePane } from '@/components/features/templates/ImagePicker';
import { fetchResidentData } from '@/lib/templates/core/template-data';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import type { CompiledTemplate } from '@/lib/templates/compilation/compiler';
import { getDefaultProfileTemplate } from '@/lib/templates/default-profile-templates';
import { THEMES, detectTheme } from '@/lib/templates/appearance';
import TemplatePanelSelector from './TemplatePanelSelector';
import StarterTemplateGallery from './StarterTemplateGallery';
import { STARTERS, splitStarter } from '@/lib/templates/starters';
import LearnPanel from '@/components/features/lessons/LearnPanel';
import { getLesson, type LessonStep } from '@/lib/templates-docs/lessons';
import type { CheckablePage } from '@/lib/templates-docs/lesson-checks';
import Link from 'next/link';
import { useSiteConfig } from '@/hooks/useSiteConfig';
import { useSiteCSS } from '@/hooks/useSiteCSS';
import NavigationPreview from '@/components/features/templates/NavigationPreview';
import ValidationFeedbackPanel, { hasStrippedNeedingAttention, type StrippedEntry } from './ValidationFeedbackPanel';
import { cssProblems } from '@/lib/utils/css/css-problems';
import ProblemsStrip, { NO_PROBLEMS, firstProblemLine, type LiveProblems } from './ProblemsStrip';
import { movePastedStyles } from '@/lib/templates/editor/pasted-styles';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { requestCapability } from '@/lib/api/client/capability';
import { useRouter } from 'next/router';
import { PixelIcon } from '@/components/ui/PixelIcon';
import Modal from '@/components/ui/feedback/Modal';
import Button from '@/components/ui/Button';
import DraftRestoreBanner from '@/components/ui/feedback/DraftRestoreBanner';
import { useLocalDraft } from '@/hooks/useLocalDraft';
import { useToast } from '@/contexts/ToastContext';
import TemplateHistoryPanel, { type FullRevision } from '@/components/features/templates/TemplateHistoryPanel';
import ViewSourceToggle from '@/components/features/templates/ViewSourceToggle';
import EditorWorkspace, {
  EditorMenu,
  EditorToolbar,
  LivePreviewPane,
  MenuItem,
  PhoneOnly,
  SaveNoteText,
  SaveStatus,
  type SaveNote,
  useEmbeddedPreview,
  type WorkspaceTab,
} from '@/components/features/templates/editor/EditorWorkspace';
import ShareToFeedCheckbox from '@/components/features/profile/ShareToFeedCheckbox';
import { layoutFields, layoutOf, siteStylesCSSMode } from '@/lib/domain/profile/layout';

/**
 * Where an insert at `pos` goes: `pos` itself, or just past the tag it's
 * inside (`<img src="cat.png" alt="|">` → after the `>`).
 */
export function afterEnclosingTag(html: string, pos: number): number {
  const open = html.slice(0, pos).search(/<[a-zA-Z/!][^<>]*$/);
  if (open === -1) return pos;
  const close = html.indexOf('>', pos);
  return close === -1 ? pos : close + 1;
}

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

// CSS of the person's own, past the editor's empty-stylesheet comment
function hasOwnCSS(css: string | undefined): boolean {
  const trimmed = (css || '').trim();
  return trimmed !== '' && trimmed !== '/* Add your custom CSS here */';
}

function DataLossWarning({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Replace it",
  preservedItems,
  clearedItems
}: DataLossWarningProps) {
  const hasConversionDetails = preservedItems && clearedItems;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      role="alertdialog"
      maxWidth="max-w-lg"
      footer={
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn btn--secondary">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="btn btn--primary">
            {confirmText}
          </button>
        </div>
      }
    >
      <p className="text-nb-ink leading-relaxed mb-4">{message}</p>

      {hasConversionDetails && (
        <div className="space-y-4">
          {/* Preserved Items */}
          <div className="border-2 border-nb-ink-mid/40 border-l-8 border-l-thread-meadow rounded-md p-4">
            <h4 className="text-sm font-semibold text-nb-ink mb-2 flex items-center gap-2">
              <PixelIcon name="check" size={14} /> Will be preserved
            </h4>
            {preservedItems.length > 0 ? (
              <ul className="text-sm text-nb-ink list-disc pl-5 space-y-1">
                {preservedItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-nb-ink-mid italic">No convertible styles found</p>
            )}
          </div>

          {/* Cleared Items */}
          <div className="border-2 border-nb-ink-mid/40 border-l-8 border-l-thread-sunset rounded-md p-4">
            <h4 className="text-sm font-semibold text-nb-ink mb-2 flex items-center gap-2">
              <PixelIcon name="trash" size={14} /> Will be cleared
            </h4>
            <ul className="text-sm text-nb-ink list-disc pl-5 space-y-1">
              {clearedItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}

type EditorTab = 'template' | 'css' | 'starters' | 'components';

interface EnhancedTemplateEditorProps {
  user: any; // User with profile
  initialTemplate?: string;
  initialCSS?: string;
  initialCSSMode?: 'inherit' | 'override' | 'disable';
  initialTemplateMode?: 'default' | 'enhanced' | 'advanced';
  initialShowNavigation?: boolean;
  initialEditorMode?: 'template' | 'css'; // URL mode parameter
  /**
   * The initial contents aren't what's saved (a page started from someone
   * else's): the editor opens unsaved, so it warns before leaving and keeps a
   * draft. savedCSS is the CSS that is saved, for the "old look" note.
   */
  startsUnsaved?: boolean;
  savedCSS?: string;
  /** Under the toolbar, e.g. "Started from @someone's page" */
  notice?: React.ReactNode;
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
  startsUnsaved = false,
  savedCSS: savedCSSProp,
  notice,
  onSave
}: EnhancedTemplateEditorProps) {
  const router = useRouter();

  // A lesson beside the code (?learn=<lesson>&step=<n>, from a lesson page
  // or the "Write your own HTML page" door)
  const [learn, setLearn] = useState<{ slug: string; step: number } | null>(null);
  useEffect(() => {
    const slug = router.query.learn;
    if (typeof slug === 'string' && getLesson(slug)) {
      setLearn({ slug, step: Number(router.query.step) || 1 });
    }
  }, [router.query.learn, router.query.step]);
  const { showError, showInfo, showSuccess } = useToast();

  // AUTO-FIX: Detect and unwrap flow templates that were incorrectly wrapped
  // This fixes templates corrupted by the previous auto-wrap bug
  // CRITICAL: Only unwrap if the component isn't absolutely positioned (true flow mode)
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

      // Check if the component is absolutely positioned: style="...position: absolute..."
      const componentTagMatch = innerContent.match(
        new RegExp(`^\\s*<${componentType}[^>]*>`, 's')
      );

      if (componentTagMatch) {
        const componentTag = componentTagMatch[0];

        const hasAbsoluteStyle = /style="[^"]*position:\s*absolute/.test(componentTag);

        // Positioned, so this is a valid positioned template
        if (hasAbsoluteStyle) {
          return initialTemplate; // Keep wrapper - it's positioned mode!
        }

        // Not positioned - this is likely a flow template that was incorrectly wrapped
        // Unwrap it
        return innerContent;
      }
    }

    return initialTemplate;
  }, [initialTemplate]);

  const [template, setTemplate] = useState(unwrappedTemplate);

  const [customCSS, setCustomCSS] = useState(initialCSS);
  // The CSS live on the page right now. Every save keeps the old version as a
  // revision, so when a save would change it the editor says so.
  const [savedCSS, setSavedCSS] = useState(savedCSSProp ?? initialCSS);
  const cssWillChange = savedCSS.trim() !== '' && customCSS.trim() !== savedCSS.trim();
  // Site styles on ('inherit') or off ('disable'); an older 'override' reads as on
  const [cssMode, setCSSMode] = useState<'inherit' | 'disable'>(siteStylesCSSMode(initialCSSMode));
  // The standard layout with no CSS of its own shows the site's default look
  const [showsDefaultLook, setShowsDefaultLook] = useState(
    () => layoutOf(initialTemplateMode) === 'standard' && !hasOwnCSS(initialCSS)
  );

  // Pop-up preview window management. The ref is what the message listener
  // checks event.source against (see the popup listener effect below).
  const [previewWindow, setPreviewWindow] = useState<Window | null>(null);
  const popupWindowRef = useRef<Window | null>(null);
  
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
  
  // Whether the saved page is on the standard layout (no HTML of its own)
  const [savedOnStandardLayout] = useState(() => {
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
  // Opened as the HTML editor, it starts in HTML mode even when the saved page
  // is on the standard layout; the default layout is loaded into it below.
  // It used to start on the standard layout and switch only once that fetch
  // came back, so until then it was a CSS-only editor with no HTML tab.
  const [useStandardLayout, setUseStandardLayout] = useState(
    () => initialEditorMode === 'template' ? false : savedOnStandardLayout
  );
  
  
  // Load default template for preview when needed
  const [defaultTemplateForPreview, setDefaultTemplateForPreview] = useState<string | null>(null);
  const [loadingDefaultTemplate, setLoadingDefaultTemplate] = useState(false);
  
  // Navigation toggle for custom templates
  const [hideNavigation, setHideNavigation] = useState(!initialShowNavigation);

  // Always use islands mode - legacy mode removed
  const [residentData, setResidentData] = useState<ResidentData | null>(null);
  
  const useStandardLayoutOption = () => {
    showDataLossWarning(
      "Switch to the standard layout?",
      "This swaps your HTML and CSS for the standard layout. Anything you haven't saved goes.",
      () => {
        setUseStandardLayout(true);
        setTemplate(''); // Clear template since we're using standard layout
        setCustomCSS('/* Add your custom CSS here to style the standard layout */\n\n');
        setCSSMode('inherit');
        setSaveMessage({ text: 'Switched to Standard Layout mode', tone: 'ok' });
        setTimeout(() => setSaveMessage(null), 3000);
      }
    );
  };

  const resetToDefaultTemplate = () => {
    // Always asks: this saves straight away, so "nothing unsaved" doesn't
    // mean nothing is lost.
    showDataLossWarning(
      "Reset your page?",
      "Your page goes back to the standard layout and the site's default look, and this takes effect right away. Your current HTML and CSS stay in History.",
      async () => {
        // Get username from user prop
        const username = user.primaryHandle?.split('@')[0] || user.handles?.[0]?.handle?.split('@')[0];
        if (!username) {
          setSaveMessage({ text: 'Could not determine username', tone: 'error' });
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
            body: JSON.stringify({ customCSS: '', ...layoutFields({ siteStyles: true }) }),
          });

          // 2. Clear template via template API
          await csrfFetch(`/api/profile/${username}/template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ template: '', customCSS: '' }),
          });

          // 3. Back to the standard layout
          const token = await requestCapability('profile');
          const layoutRes = await csrfFetch("/api/profile/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...layoutFields({ layout: 'standard' }), cap: token }),
          });
          if (!layoutRes.ok) throw new Error((await layoutRes.json().catch(() => ({}))).error || 'Failed to reset to default');

          setSaveState('saved');
          setSavedCSS('');
          setShowsDefaultLook(true);
          setSaveMessage({ text: 'Reset to default template', tone: 'ok' });
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
          setSaveMessage({ text: error instanceof Error ? error.message : 'Failed to reset to default', tone: 'error' });
          setTimeout(() => setSaveMessage(null), 3000);
        }
      },
      { always: true }
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
          setActiveTab('template');
          // Only the layout is replaced. The CSS already in the editor (the
          // saved theme, plus any unsaved edits) stays; it used to be swapped
          // for a blank stylesheet, so one save dropped the person's theme.
          if (!customCSS.trim()) {
            setCustomCSS(data.css);
            setCSSMode(siteStylesCSSMode(data.cssMode));
          }
          setSaveMessage({ text: 'Default layout loaded. Your CSS is unchanged.', tone: 'ok' });
        } else {
          setSaveMessage({ text: 'Failed to load default template', tone: 'error' });
        }
      } catch (error) {
        console.error('Failed to load default template:', error);
        setSaveMessage({ text: 'Failed to load default template', tone: 'error' });
      } finally {
        setLoadingDefault(false);
        setTimeout(() => setSaveMessage(null), 3000);
      }
    };

    showDataLossWarning(
      "Load the default layout?",
      "This replaces your HTML with the default layout. Your CSS stays as it is. HTML you haven't saved goes.",
      doLoad
    );
  };
  const [isLoading, setIsLoading] = useState(true);
  const [compiledTemplate, setCompiledTemplate] = useState<CompiledTemplate | null>(null);
  // Smart default tab selection based on URL mode param or layout mode
  const [activeTab, setActiveTab] = useState<EditorTab>(() => {
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
    strippedComponents?: StrippedEntry[];
    stats?: {
      nodeCount: number;
      maxDepth: number;
      componentCounts: Record<string, number>;
    };
  } | null>(null);
  const [showValidationPanel, setShowValidationPanel] = useState(false);


  const [isSaving, setIsSaving] = useState(false);
  // "Share this update in the feed": unticked each time the editor opens
  const [shareToFeed, setShareToFeed] = useState(false);
  const [saveMessage, setSaveMessage] = useState<SaveNote | null>(null);
  const [loadingDefault, setLoadingDefault] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  
  // Data loss warning state
  const [warningDialog, setWarningDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmAction: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmAction: () => {}
  });

  // Smart check for whether content is essentially empty
  const isContentEmpty = () => {
    const isTemplateEmpty = !template || template.trim() === '';
    const isCSSEmpty = !customCSS || customCSS.trim() === '' || 
      customCSS.trim() === '/* Add your custom CSS here */' ||
      customCSS.trim() === '/* Add your custom CSS here to style the standard layout */';
    return isTemplateEmpty && isCSSEmpty;
  };

  const showDataLossWarning = (
    title: string,
    message: string,
    confirmAction: () => void,
    { always = false, confirmText }: { always?: boolean; confirmText?: string } = {}
  ) => {
    // Skip warning if content is empty or nothing's changed since the last save
    // (the same test as the Save button's: the starter a new page opens on isn't an edit)
    if (!always && (isContentEmpty() || !hasUnsavedChanges)) {
      confirmAction();
    } else {
      setWarningDialog({
        isOpen: true,
        title,
        message,
        confirmText,
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

  // What the live compile found, shown under the code as you type
  const [liveProblems, setLiveProblems] = useState<LiveProblems>(NO_PROBLEMS);
  // A blocked save's panel goes once the live check finds the page fixed: it
  // kept listing the old errors (template audit 07 #9)
  const liveStatus = liveProblems.status;
  useEffect(() => {
    if (liveStatus === 'ok' && validationResult && !validationResult.isValid) setShowValidationPanel(false);
  }, [liveStatus, validationResult]);
  // The CSS's own problems, checked here as you type (nothing to compile)
  const deferredCSS = React.useDeferredValue(customCSS);
  const cssProblemList = React.useMemo<LiveProblems>(
    () => (deferredCSS.trim() ? { ...NO_PROBLEMS, status: 'ok', warnings: cssProblems(deferredCSS) } : NO_PROBLEMS),
    [deferredCSS]
  );

  // Compile template function (using real compilation API like production)
  const compileTemplateForPreview = useCallback(async (forceCompile: boolean = false) => {
    // Force compile when saving, even if in standard layout mode
    if (!template.trim() || (!forceCompile && useStandardLayout)) {
      setCompiledTemplate(null);
      setLastCompiledTemplate('');
      setLiveProblems(NO_PROBLEMS);
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

      // The same compile a save runs, so the preview is what gets stored
      const response = await csrfFetch('/api/templates/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent with the request
        body: JSON.stringify({ template })
      });

      if (!response.ok) {
        // Handle specific status codes
        if (response.status === 401) {
          // User not authenticated
          return null;
        }

        // The page can't be compiled as it is: say why. The preview keeps
        // showing the last version that worked.
        try {
          const errorData = await response.json();
          if (Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
            setLiveProblems({
              status: 'failed',
              errors: errorData.errors,
              warnings: Array.isArray(errorData.warnings) ? errorData.warnings : [],
              stripped: [],
            });
          }
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
      setLiveProblems({
        status: 'ok',
        errors: [],
        warnings: Array.isArray(result.warnings) ? result.warnings : [],
        stripped: Array.isArray(result.strippedComponents) ? result.strippedComponents : [],
      });
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
      showInfo('Preview data is still loading. Please wait a moment and try again.');
      return;
    }

    // For advanced templates, compile if needed
    if (!useStandardLayout && template.trim()) {
      if (!compiledTemplate) {
        // Compile the template before opening preview
        const compiled = await compileTemplateForPreview();
        if (!compiled) {
          showError('Failed to compile template. Please check your template syntax.');
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
      popupWindowRef.current = newWindow;
      setPreviewWindow(newWindow);

      // Cleanup when window closes
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          if (popupWindowRef.current === newWindow) popupWindowRef.current = null;
          setPreviewWindow(null);
          clearInterval(checkClosed);
        }
      }, 1000);
    } else {
      showError('Pop-up blocked — allow pop-ups for this site to use the preview.');
    }
  }, [previewWindow, residentData, useStandardLayout, template, compiledTemplate, compileTemplateForPreview, showError, showInfo]);

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
  const [showPreviewPane, setShowPreviewPane] = useState(false);
  const { frameRef: previewFrameRef, ready: previewFrameReady } = useEmbeddedPreview({
    enabled: showPreviewPane,
    hasData: !!residentData,
    send: sendPreviewData,
  });

  // Open beside the code wherever there's room for it (decided after mount
  // so SSR and the first client render agree).
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setShowPreviewPane(true);
    }
  }, []);

  // ── Component autocomplete + palette (registry-fed) ──
  // Captured via onCreateEditor: next/dynamic doesn't forward refs, so a
  // ref on the <CodeMirror> wrapper would stay null forever.
  const templateViewRef = useRef<EditorView | null>(null);
  const cssViewRef = useRef<EditorView | null>(null);
  // A problem's "Line N": put the cursor at the start of that line, in view
  const jumpTo = useCallback((view: EditorView | null, lineNumber: number) => {
    if (!view) return;
    const line = view.state.doc.line(Math.min(Math.max(lineNumber, 1), view.state.doc.lines));
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
    view.focus();
  }, []);
  const jumpToLine = useCallback((line: number) => jumpTo(templateViewRef.current, line), [jumpTo]);
  const jumpToCssLine = useCallback((line: number) => jumpTo(cssViewRef.current, line), [jumpTo]);
  const [componentSchemas, setComponentSchemas] = useState<ComponentSchema[] | null>(null);

  useEffect(() => {
    fetchComponentSchemas()
      .then(setComponentSchemas)
      .catch(() => {
        // Autocomplete quietly degrades to plain HTML completion.
      });
  }, []);

  const templateExtensions = React.useMemo(
    () => [
      htmlLang(componentSchemas ? { extraTags: buildExtraTags(componentSchemas) } : {}),
      htmlLanguage.data.of({ autocomplete: nicknameCompletions }),
    ],
    [componentSchemas]
  );

  // Drop a snippet in at the cursor (or append if the editor isn't mounted).
  // `cursor` is where the cursor lands, counted from the snippet's start.
  const insertAtCursor = useCallback((pane: ImagePane, snippet: string, cursor = snippet.length) => {
    const view = (pane === 'html' ? templateViewRef : cssViewRef).current;
    if (view) {
      let { from, to } = view.state.selection.main;
      // A cursor inside a tag (Insert image leaves it in alt="") puts the
      // snippet after that tag, not in the middle of it
      if (pane === 'html' && from === to) from = to = afterEnclosingTag(view.state.doc.toString(), from);
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + cursor },
      });
      view.focus();
    } else if (pane === 'html') {
      handleTemplateChange(template ? `${template}\n${snippet}` : snippet);
    } else {
      setCustomCSS(customCSS ? `${customCSS}\n${snippet}` : snippet);
    }
  }, [template, customCSS]);

  const insertIntoTemplate = useCallback((snippet: string) => insertAtCursor('html', snippet), [insertAtCursor]);

  // ── Image picker (your own media, into the HTML or CSS pane) ──
  const [imagePickerPane, setImagePickerPane] = useState<ImagePane | null>(null);
  const [pendingImage, setPendingImage] = useState<{ pane: ImagePane; text: string; cursor: number } | null>(null);
  const pickImage = useCallback((pane: ImagePane, snippet: { text: string; cursor: number }) => {
    setImagePickerPane(null);
    setPendingImage({ pane, ...snippet });
  }, []);
  // Inserted once the picker has closed and handed focus back, so the
  // cursor ends up in the code (inside alt="" when there's alt text to write).
  useEffect(() => {
    if (!pendingImage) return;
    insertAtCursor(pendingImage.pane, pendingImage.text, pendingImage.cursor);
    setPendingImage(null);
  }, [pendingImage, insertAtCursor]);

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
      const { template: previewTemplate, customCSS: previewCSS, cssMode: previewCSSMode, useStandardLayout: previewUseStandardLayout } = saveData;
      // Popups from before the hideNavigation fix send `showNavigation`
      // instead, and it was always false (they never received the setting),
      // so its value means nothing: keep the editor's own setting for them.
      // The fallback can go once no popup that old can still be open.
      const previewHideNavigation: boolean =
        typeof saveData.hideNavigation === 'boolean' ? saveData.hideNavigation : hideNavigation;

      // Update local state to match what's being saved
      setTemplate(previewTemplate || '');
      setCustomCSS(previewCSS || '');
      setCSSMode(siteStylesCSSMode(previewCSSMode));
      setHideNavigation(previewHideNavigation);
      setUseStandardLayout(previewUseStandardLayout !== undefined ? previewUseStandardLayout : true);

      // Handle standard layout mode differently
      if (previewUseStandardLayout) {
        // For standard layout, we save with empty template to indicate using default layout
        // Standard layout always shows navigation (hideNavigation = false)
        await onSave('', previewCSS || '', undefined, previewCSSMode || 'inherit', false);
        setSaveMessage({ text: 'Saved.', tone: 'ok' });
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
          setSaveMessage({ text: "I couldn't build the page to save it. Check the preview for what's wrong.", tone: 'warn' });
          return;
        }
        
        await onSave(previewTemplate || '', previewCSS || '', templateToSave, previewCSSMode || 'inherit', previewHideNavigation);
        setSaveMessage({ text: 'Saved.', tone: 'ok' });
      }

      if (savedCSS.trim() !== '' && (previewCSS || '').trim() !== savedCSS.trim()) {
        setSaveMessage({ text: 'Saved. Your old look is in History.', tone: 'ok' });
      }
      setSavedCSS(previewCSS || '');
      markSaved(JSON.stringify({
        template: previewTemplate || '',
        customCSS: previewCSS || '',
        cssMode: previewCSSMode || 'inherit',
        useStandardLayout: previewUseStandardLayout !== undefined ? previewUseStandardLayout : true,
        hideNavigation: previewHideNavigation
      }));
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ text: 'Failed to save template from preview', tone: 'error' });
      console.error('Save from preview error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Messages from the pop-out preview. Attached once; the handlers are read
  // through a ref so a save always sees the latest editor state. (They used
  // to be captured when the popup opened, so saving from the popup could
  // save stale content.) Only the editor's own popup is listened to.
  const popupHandlersRef = useRef({ sendPreviewData, handleSaveFromPreview });
  popupHandlersRef.current = { sendPreviewData, handleSaveFromPreview };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const popup = popupWindowRef.current;
      if (!popup || event.source !== popup) return;

      if (event.data?.type === 'PREVIEW_READY') {
        popupHandlersRef.current.sendPreviewData(popup);
      }
      if (event.data?.type === 'SAVE_REQUEST') {
        popupHandlersRef.current.handleSaveFromPreview(event.data.data);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
    if (useStandardLayout && activeTab !== 'css') {
      // The standard layout has no HTML to edit, so CSS is the only tab
      setActiveTab('css');
    }
    // Removed the problematic auto-switch from CSS to template tab
    // Users should be able to manually navigate to CSS tab in advanced mode
  }, [useStandardLayout, activeTab]);

  // Opened as the HTML editor on a page with no HTML yet: start from the
  // Plain page starter (never a blank box). Once, guarded by the ref. Nothing
  // is saved until Save, and the page's old CSS stays in History then.
  const initialModeHandledRef = useRef(false);
  // The starter's HTML, until the change tracking below takes it as the starting point
  const starterBaselineRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialModeHandledRef.current) return;
    if (initialEditorMode === 'template' && savedOnStandardLayout && !template.trim()) {
      initialModeHandledRef.current = true;
      const { html, css } = splitStarter(STARTERS[0].template);
      starterBaselineRef.current = html;
      setTemplate(html);
      setCustomCSS(css);
      setCSSMode('disable');
      // A page with no HTML of its own yet opens on the starter pages
      // (straight to the code during a lesson)
      setActiveTab(typeof router.query.learn === 'string' ? 'template' : 'starters');
    }
  }, [initialEditorMode, savedOnStandardLayout, template, router.query.learn]);

  // Track changes against the last-saved snapshot (manual save required now).
  // Comparing to a snapshot (instead of blindly marking dirty) keeps a fresh
  // page, a just-saved page, and a just-reset page all reading as clean.
  const currentSnapshot = JSON.stringify({ template, customCSS, cssMode, useStandardLayout, hideNavigation });
  const savedSnapshotRef = useRef<string | null>(null);
  useEffect(() => {
    // The starter a page with no HTML opens on is where it starts, not an
    // edit: no "unsaved" state, draft or data-loss warnings until the person
    // changes something (template audit 07 #2, 09 J1)
    if (starterBaselineRef.current !== null && template === starterBaselineRef.current) {
      starterBaselineRef.current = null;
      savedSnapshotRef.current = currentSnapshot;
      setHasUnsavedChanges(false);
      return;
    }
    if (savedSnapshotRef.current === null) {
      // A started-from page is never the saved one, so it opens unsaved
      savedSnapshotRef.current = startsUnsaved ? '' : currentSnapshot;
      if (!startsUnsaved) return;
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
      // The same compile the preview and a save use
      const response = await csrfFetch('/api/templates/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template })
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
        stats: result.stats
      };

      setValidationResult(validationData);

      return {
        isValid: validationData.isValid,
        hasWarnings: validationData.warnings.length > 0,
        // Document wrappers from a pasted whole page are expected, not a problem
        hasStripped: hasStrippedNeedingAttention(validationData.strippedComponents)
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

  // The save request comes from the page that hosts this editor, so the
  // share is a second request once the save has worked. The server only
  // shares when the page changed in the last few minutes.
  const sharePageUpdate = useCallback(async () => {
    try {
      const res = await csrfFetch('/api/user/page-update', { method: 'POST' });
      if (!res.ok) throw new Error('share');
      const { shared } = await res.json();
      if (shared) {
        setShareToFeed(false);
        showSuccess('Shared in the feed.');
      } else {
        showInfo("Nothing changed, so there's nothing to share.");
      }
    } catch {
      showError("Saved, but it didn't reach the feed.");
    }
  }, [showSuccess, showInfo, showError]);

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
      if (shareToFeed) await sharePageUpdate();
      const replacedCSS = cssWillChange;
      setSavedCSS(customCSS);

      setShowsDefaultLook(useStandardLayout && !hasOwnCSS(customCSS));

      // Check if we have warnings or stripped components
      // Use passed validationInfo first (most current), fall back to state
      const hasIssues = validationInfo
        ? (validationInfo.hasWarnings || validationInfo.hasStripped)
        : (validationResult && (
            validationResult.warnings.length > 0 ||
            hasStrippedNeedingAttention(validationResult.strippedComponents)
          ));

      setShowValidationPanel(false);
      if (hasIssues) {
        setSaveMessage({ text: "Saved. A few things won't work as written; they're listed under the code.", tone: 'ok' });
        setTimeout(() => setSaveMessage(null), 8000);
      } else {
        setSaveMessage({ text: replacedCSS ? 'Saved. Your old look is in History.' : 'Saved.', tone: 'ok' });
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (error) {
      console.error('Save failed:', error);
      setSaveState('error');
      setHasUnsavedChanges(true); // Restore unsaved state on error

      // Extract error message and display in ValidationFeedbackPanel
      const errorMessage = error instanceof Error ? error.message : "That didn't save. Try again in a moment.";

      // Create validation result to display in panel
      setValidationResult({
        isValid: false,
        errors: [errorMessage],
        warnings: []
      });

      // Show the validation panel with the error
      setShowValidationPanel(true);

      // Also show toast for quick feedback
      setSaveMessage({ text: "That didn't save. What went wrong is under the code.", tone: 'error' });
      setTimeout(() => setSaveMessage(null), 5000);
    }
  }, [onSave, template, customCSS, compiledTemplate, compileTemplateForPreview, cssMode, hideNavigation, validationResult, markSaved, cssWillChange, shareToFeed, sharePageUpdate]);

  // Main save handler with validation
  const handleSave = useCallback(async () => {
    // Validate template first
    const validationInfo = await handleValidate();

    // If validation has errors, block save and show panel
    if (!validationInfo.isValid) {
      setShowValidationPanel(true);
      setSaveMessage({ text: "Not saved yet: fix what's listed first.", tone: 'warn' });
      setTimeout(() => setSaveMessage(null), 5000);
      return;
    }

    // Warnings or taken-out tags don't stop a save: it goes ahead, and the
    // list under the code says what won't work (it used to open a panel
    // offering "Save Anyway" for a save that had already happened)
    if (validationInfo.hasWarnings || validationInfo.hasStripped) {
      // Pass validation info to prevent stale state issues
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

  // Cmd/Ctrl+S saves, as in any editor: it opened the browser's "Save page
  // as" instead (template audit 07 #7)
  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // Template edits: move pasted <style> blocks and Google Fonts <link>s into
  // the CSS field and auto-switch to advanced mode when HTML shows up in
  // standard-layout mode.
  // Leaving the standard layout: typing HTML makes this an own-HTML page
  const switchToOwnHTML = () => {
    if (!useStandardLayout) return false;
    setUseStandardLayout(false);
    // Set CSS mode to 'disable' for full control, like gallery templates
    if (cssMode === 'inherit') setCSSMode('disable');
    return true;
  };

  const handleTemplateChange = (newValue: string) => {
    setTemplate(newValue);
    if (newValue.trim() && /<[^>]+>|\{\{[^}]+\}\}/.test(newValue) && switchToOwnHTML()) {
      setSaveMessage({ text: 'This is your own HTML page now.', tone: 'ok' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  // A paste with <style> blocks or Google Fonts links: they go to the CSS tab
  // and the rest goes in as one edit, so one undo takes it back
  // (lib/templates/editor/pasted-styles.ts). Caught before CodeMirror's own
  // paste handling, on the way down.
  const handleTemplatePaste = (event: React.ClipboardEvent) => {
    const moved = movePastedStyles(event.clipboardData.getData('text/plain'), customCSS);
    if (!moved) return;
    event.preventDefault();
    event.stopPropagation();
    const view = templateViewRef.current;
    if (view) {
      view.dispatch(view.state.replaceSelection(moved.html), { scrollIntoView: true });
    } else {
      handleTemplateChange(template ? `${template}\n${moved.html}` : moved.html);
    }
    switchToOwnHTML();
    if (moved.css === customCSS) return;
    setCustomCSS(moved.css);
    setSaveMessage({
      text: moved.movedStyles && moved.movedFonts
        ? 'Moved your <style> CSS and Google Fonts links to the CSS tab'
        : moved.movedStyles
          ? 'Extracted CSS from <style> tags and moved to CSS tab'
          : 'Moved your Google Fonts links to the CSS tab as @import lines',
      tone: 'ok',
    });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const username = user.primaryHandle?.split('@')[0] || user.handles?.[0]?.handle?.split('@')[0] || '';
  const startedFromTheme = useStandardLayout ? THEMES.find((t) => t.id === detectTheme(customCSS)) : undefined;

  const htmlTab: WorkspaceTab = {
    id: 'template',
    label: 'HTML',
    fill: true,
    content: (
      <>
        {learn && (
          <div className="px-3 pt-3 flex-shrink-0 max-h-[60%] lg:max-h-[45%] overflow-auto overscroll-contain border-b border-thread-sage/40">
            <LearnPanel
              slug={learn.slug}
              step={learn.step}
              onStep={(step) => setLearn({ slug: learn.slug, step })}
              // A page that doesn't compile right now can't be checked
              page={liveProblems.status === 'failed' ? null : (compiledTemplate as unknown as CheckablePage | null)}
              onShowMe={(step: LessonStep) =>
                showDataLossWarning(
                  'Show me',
                  "This puts the step's code in the editor in place of yours. Unsaved changes will be lost.",
                  () => {
                    setUseStandardLayout(false);
                    setTemplate(step.code);
                    if (step.css) setCustomCSS(step.css);
                    setActiveTab('template');
                  }
                )
              }
              onClose={() => {
                setLearn(null);
                const { learn: _learn, step: _step, ...rest } = router.query;
                router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
              }}
            />
          </div>
        )}
        <div className="ts-editor-tools flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-1.5 border-b border-thread-sage/40 flex-shrink-0 text-sm text-nb-ink">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!hideNavigation}
              onChange={(e) => setHideNavigation(!e.target.checked)}
              className="h-4 w-4"
            />
            Show site navigation
          </label>
          <Button
            variant="secondary"
            size="sm"
            aria-haspopup="dialog"
            onClick={() => setImagePickerPane('html')}
            aria-label="Insert image"
            className="ts-icon-only ml-auto inline-flex items-center gap-2"
          >
            <PixelIcon name="image" size={14} /> <span className="hidden sm:inline">Insert image</span>
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden bg-white" onPasteCapture={handleTemplatePaste}>
          <CodeMirror
            onCreateEditor={(view) => { templateViewRef.current = view; }}
            value={template}
            onChange={handleTemplateChange}
            extensions={templateExtensions}
            height="100%"
            style={{ height: '100%', fontSize: '13px' }}
            placeholder={loadingDefault
              ? 'Loading the default layout…'
              : 'Write your page here. Plain HTML works, and so do components like <ProfilePhoto /> or <RetroCard>…</RetroCard>'}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              autocompletion: true,
              highlightActiveLine: true,
            }}
          />
        </div>
        <ProblemsStrip problems={liveProblems} onJump={jumpToLine} />
      </>
    ),
  };

  const cssTab: WorkspaceTab = {
    id: 'css',
    label: 'CSS',
    fill: true,
    content: (
      <>
        <div className="ts-editor-tools flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-1.5 border-b border-thread-sage/40 flex-shrink-0 text-sm text-nb-ink">
          {useStandardLayout ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTemplateSelector(true)}
              className="inline-flex items-center gap-2"
            >
              <PixelIcon name="paint-bucket" size={14} /> Choose a theme
            </Button>
          ) : (
            <select
              aria-label="Load a theme"
              onChange={(e) => {
                if (e.target.value === '') return;
                const themeId = e.target.value;
                showDataLossWarning(
                  "Load a theme",
                  `This replaces the CSS in the editor with the theme. Unsaved changes will be lost.`,
                  () => {
                    setCustomCSS(getDefaultProfileTemplate(themeId as any));
                  }
                );
                // Back to the prompt
                e.target.value = '';
              }}
              className="text-sm px-2 py-1 border border-thread-sage rounded bg-thread-paper"
            >
              <option value="">Load a theme…</option>
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
              <option value="clear">Blank</option>
            </select>
          )}
          <label className="inline-flex items-center gap-2">
            Site styles
            <select
              id="editor-site-styles"
              value={cssMode}
              onChange={(e) => setCSSMode(siteStylesCSSMode(e.target.value))}
              className="text-sm px-2 py-1 border border-thread-sage rounded bg-thread-paper"
            >
              <option value="inherit">On</option>
              <option value="disable">Off</option>
            </select>
          </label>
          <Button
            variant="secondary"
            size="sm"
            aria-haspopup="dialog"
            onClick={() => setImagePickerPane('css')}
            aria-label="Insert image"
            className="ts-icon-only ml-auto inline-flex items-center gap-2"
          >
            <PixelIcon name="image" size={14} /> <span className="hidden sm:inline">Insert image</span>
          </Button>
        </div>
        <p className="m-0 px-3 py-1.5 text-xs text-nb-ink-mid border-b border-thread-sage/40 flex-shrink-0">
          {cssMode === 'inherit'
            ? "Site styles on: your CSS adds to the site's, so the nav, buttons and boxes keep their look until you change them."
            : 'Site styles off: only your CSS applies, so you style everything, buttons and nav included.'}
          {useStandardLayout && cssMode === 'disable' && ' The standard layout needs the site styles to look right.'}
          {startedFromTheme && ` Started from ${startedFromTheme.name}.`}
        </p>
        <div className="flex-1 min-h-0 overflow-hidden bg-white">
          <CodeMirror
            onCreateEditor={(view) => { cssViewRef.current = view; }}
            value={customCSS}
            onChange={(value: string) => setCustomCSS(value)}
            extensions={[cssLang()]}
            height="100%"
            style={{ height: '100%', fontSize: '13px' }}
            placeholder={cssMode === 'inherit'
              ? `/* Site styles are on: add to them here */

.ts-profile-header {
  background: linear-gradient(135deg, #2E4B3F 0%, #4FAF6D 100%);
  padding: 2rem;
  border-radius: 8px;
}`
              : `/* Site styles are off: you style everything */

body {
  font-family: Georgia, serif;
  background: #f8f9fa;
  margin: 0;
}`}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              autocompletion: true,
              highlightActiveLine: true,
            }}
          />
        </div>
        <ProblemsStrip problems={cssProblemList} onJump={jumpToCssLine} where="CSS" />
      </>
    ),
  };

  const startersTab: WorkspaceTab = {
    id: 'starters',
    label: 'Starter pages',
    content: (
      <div className="p-4">
        <StarterTemplateGallery
          onSelect={(starterTemplate, starterCSS, name) => {
            showDataLossWarning(
              "Start from a starter page",
              `This replaces the HTML and CSS in the editor with ${name}. Unsaved changes will be lost.`,
              () => {
                setUseStandardLayout(false);
                setTemplate(starterTemplate);
                setCustomCSS(starterCSS);
                setCSSMode('disable');
                setActiveTab('template');
              }
            );
          }}
        />
      </div>
    ),
  };

  const componentsTab: WorkspaceTab = {
    id: 'components',
    label: 'Components',
    content: (
      <div className="p-4 text-sm text-nb-ink">
        <p className="mt-0 mb-3 text-nb-ink-mid">
          Point at one to see what it does. Typing &lt; in the code suggests them too.
        </p>
        <ComponentPalette
          schemas={componentSchemas}
          onInsert={(snippet) => {
            insertIntoTemplate(snippet);
            setActiveTab('template');
          }}
        />
      </div>
    ),
  };

  const tabs = useStandardLayout ? [cssTab] : [htmlTab, cssTab, startersTab, componentsTab];

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

      <div className="enhanced-template-editor flex flex-col flex-1 min-h-0 w-full">
      <EditorWorkspace
        toolbar={
          <EditorToolbar
            title={useStandardLayout ? 'Your page' : 'Your own HTML page'}
            handle={username}
            status={<SaveStatus state={saveState} />}
            message={saveMessage && <SaveNoteText note={saveMessage} />}
            share={<ShareToFeedCheckbox checked={shareToFeed} onChange={setShareToFeed} disabled={isSaving} className="text-nb-ink" />}
            laptopOnly={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowHistoryPanel(true)}
                title="Load an earlier version of your page"
                className="inline-flex items-center gap-1"
              >
                <PixelIcon name="clock" size={12} /> History
              </Button>
            }
            save={
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save & Go Live'}
              </Button>
            }
          >
            <EditorMenu>
              {(close) => (
                <>
                  <PhoneOnly>
                    <MenuItem onClick={() => { close(); setShowHistoryPanel(true); }}>
                      <PixelIcon name="clock" size={12} /> History
                    </MenuItem>
                    {activeTab === 'css' ? (
                      <MenuItem href="/build/css" newTab>
                        <PixelIcon name="article" size={12} /> CSS guide
                      </MenuItem>
                    ) : (
                      <MenuItem href="/build/html" newTab>
                        <PixelIcon name="article" size={12} /> Lessons
                      </MenuItem>
                    )}
                    <MenuItem href="/build/what-works-here" newTab>
                      <PixelIcon name="info-box" size={12} /> What works here
                    </MenuItem>
                  </PhoneOnly>
                  <MenuItem href={`/resident/${encodeURIComponent(username)}`}>
                    <PixelIcon name="home" size={12} /> View my page
                  </MenuItem>
                  <MenuItem onClick={() => { close(); openPopupPreview(); }}>
                    <PixelIcon name="external-link" size={12} /> Preview in its own window
                  </MenuItem>
                  <div className="px-2 py-1.5">
                    <ViewSourceToggle username={username} />
                  </div>
                  <MenuItem href="/settings?tab=appearance">
                    <PixelIcon name="sliders" size={12} /> Appearance settings
                  </MenuItem>
                  <hr className="my-1 border-thread-sage/40" />
                  <MenuItem onClick={() => { close(); resetToDefaultTemplate(); }}>
                    <PixelIcon name="reload" size={12} /> Reset to default
                  </MenuItem>
                </>
              )}
            </EditorMenu>
          </EditorToolbar>
        }
        notices={
          <>
            {notice}
            {pendingDraft && (
              <DraftRestoreBanner
                savedAt={pendingDraft.savedAt}
                onRestore={() => {
                  const draft = pendingDraft.data;
                  setTemplate(draft.template);
                  setCustomCSS(draft.customCSS);
                  setCSSMode(siteStylesCSSMode(draft.cssMode));
                  setUseStandardLayout(draft.useStandardLayout);
                  setHideNavigation(draft.hideNavigation);
                  clearDraft();
                }}
                onDiscard={clearDraft}
              />
            )}
            {(showsDefaultLook || cssWillChange) && (
              <p className="ts-editor-note m-0 px-4 py-1.5 flex flex-wrap gap-x-3 text-sm bg-thread-cream border-b border-thread-sage text-nb-ink flex-shrink-0">
                {showsDefaultLook && (
                  <span>
                    <strong>Your page has the site&apos;s default look.</strong>{' '}
                    {useStandardLayout
                      ? 'Saving here puts your CSS on the standard layout.'
                      : 'Saving here switches your page to this HTML layout.'}
                  </span>
                )}
                {cssWillChange && (
                  <span className="text-nb-ink-mid">Saving changes how your page looks. The old look stays in History.</span>
                )}
              </p>
            )}
          </>
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as EditorTab)}
        tabsEnd={
          <>
            {activeTab === 'css' ? (
              <a href="/build/css" target="_blank" rel="noopener noreferrer" className="underline text-nb-ink">CSS guide</a>
            ) : (
              <a href="/build/html" target="_blank" rel="noopener noreferrer" className="underline text-nb-ink">Lessons</a>
            )}
            <a href="/build/what-works-here" target="_blank" rel="noopener noreferrer" className="underline text-nb-ink">What works here</a>
            {!showPreviewPane && (
              <button type="button" className="ts-bare hidden lg:inline underline text-nb-ink" onClick={() => setShowPreviewPane(true)}>
                Show preview
              </button>
            )}
          </>
        }
        preview={showPreviewPane ? (
          <LivePreviewPane
            frameRef={previewFrameRef}
            status={previewFrameReady ? 'Updates as you type' : 'Warming up…'}
            notice={liveProblems.status === 'failed' && (
              <p role="status" className="m-0 px-3 py-2 text-sm bg-thread-paper border-b border-thread-sage text-nb-ink flex-shrink-0">
                Showing your last working version.{' '}
                {firstProblemLine(liveProblems)
                  ? <>Line {firstProblemLine(liveProblems)} has a problem; it&apos;s listed under the code.</>
                  : <>Something in the code has a problem; it&apos;s listed under the code.</>}
              </p>
            )}
            onPopOut={openPopupPreview}
            onHide={() => setShowPreviewPane(false)}
          />
        ) : null}
      />

      <ImagePicker
        pane={imagePickerPane}
        username={username}
        onClose={() => setImagePickerPane(null)}
        onPick={pickImage}
      />


      {/* Template Selector Modal - only for Standard Layout */}
      {showTemplateSelector && useStandardLayout && (
        <TemplatePanelSelector
          currentCSS={customCSS}
          onSelectTemplate={(css, templateName) => {
            showDataLossWarning(
              "Use this theme?",
              `This replaces your CSS with "${templateName}". Anything you haven't saved goes.`,
              () => {
                setCustomCSS(css);
                setCSSMode('inherit'); // Templates work best with inherit mode
                setSaveMessage({ text: `Applied ${templateName} template`, tone: 'ok' });
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
        confirmText={warningDialog.confirmText}
      />


      {/* Revision History Panel */}
      {showHistoryPanel && (
        <TemplateHistoryPanel
          username={user.primaryHandle?.split('@')[0] || user.handles?.[0]?.handle?.split('@')[0] || ''}
          onClose={() => setShowHistoryPanel(false)}
          onLoadRevision={(rev: FullRevision) => {
            showDataLossWarning(
              "Load this version?",
              "This puts the version you picked in the editor. Anything you haven't saved goes; your live page stays as it is until you save.",
              () => {
                setTemplate(rev.customTemplate || '');
                setCustomCSS(rev.customCSS || '');
                setCSSMode(siteStylesCSSMode(rev.cssMode));
                setUseStandardLayout(rev.templateMode !== 'advanced');
                setHideNavigation(rev.hideNavigation);
                setShowHistoryPanel(false);
                setSaveMessage({ text: 'Version loaded into the editor', tone: 'ok' });
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
          onSaveAnyway={undefined}
        />
      )}
    </div>
    </>
  );
}