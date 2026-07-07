import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { markdownToSafeHtmlWithEmojis } from "@/lib/comment-markup";
import { markdownToSafeHtml } from "@/lib/utils/sanitization/html";
import Preview from "@/components/ui/forms/PreviewForm";
import { validatePostTitle } from "@/lib/domain/validation";
import EmojiPicker from "@/components/ui/feedback/EmojiPicker";
import SmartUrlShortener from "@/components/ui/forms/SmartUrlShortener";
import Link from "next/link";
import { getCsrfToken } from '@/lib/api/client/csrf-fetch';
import imageCompression from 'browser-image-compression';
import { PixelIcon } from '@/components/ui/PixelIcon';

type Visibility = "public" | "followers" | "friends" | "private";
type PostIntent = "sharing" | "asking" | "feeling" | "announcing" | "showing" | "teaching" | "looking" | "celebrating" | "recommending";

type ThreadRingMembership = {
  id: string;
  name: string;
  slug: string;
  role: string;
  visibility: string;
};

interface PostEditorProps {
  mode?: "create" | "edit";
  initialData?: {
    id?: string;
    title?: string;
    content?: string;
    visibility?: Visibility;
    intent?: PostIntent | null;
    isSpoiler?: boolean;
    contentWarning?: string;
    selectedRings?: string[];
    metadata?: {
      mood?: string;
      listeningTo?: string;
      reading?: string;
      drinking?: string;
      location?: string;
    };
  };
  onSubmit?: (data: any) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  intentStampsEnabled?: boolean;
  postTitlesRequired?: boolean;
  respondingToPrompt?: {
    id: string;
    title: string;
    threadRingSlug: string;
  } | null;
}

const VIS_OPTS: { v: Visibility; label: string }[] = [
  { v: "public", label: "Public" },
  { v: "followers", label: "Followers" },
  { v: "friends", label: "Friends" },
  { v: "private", label: "Only Me" },
];

const INTENT_OPTS: { v: PostIntent; label: string; description: string }[] = [
  { v: "sharing", label: "sharing", description: "Share something interesting" },
  { v: "asking", label: "asking", description: "Ask for help or advice" },
  { v: "feeling", label: "feeling", description: "Express emotions or mood" },
  { v: "announcing", label: "announcing", description: "Make an announcement" },
  { v: "showing", label: "showing", description: "Show off something cool" },
  { v: "teaching", label: "teaching", description: "Teach or explain something" },
  { v: "looking", label: "looking for", description: "Looking for something" },
  { v: "celebrating", label: "celebrating", description: "Celebrate achievements" },
  { v: "recommending", label: "recommending", description: "Recommend something great" },
];

const TOOLBAR_ITEMS = [
  { label: "Bold", icon: <span className="font-bold">B</span>, action: "bold", markdown: "**" },
  { label: "Italic", icon: <span className="italic">I</span>, action: "italic", markdown: "*" },
  { label: "Heading 1", icon: "H1", action: "h1", markdown: "# " },
  { label: "Heading 2", icon: "H2", action: "h2", markdown: "## " },
  { label: "Heading 3", icon: "H3", action: "h3", markdown: "### " },
  { label: "Quote", icon: <PixelIcon name="article" size={16} />, action: "quote", markdown: "> " },
  { label: "Code", icon: <PixelIcon name="code" size={16} />, action: "code", markdown: "`" },
  { label: "Code Block", icon: <PixelIcon name="code" size={16} />, action: "codeblock", markdown: "```" },
  { label: "Link", icon: <PixelIcon name="link" size={16} />, action: "link", markdown: "[text](url)" },
  { label: "Image", icon: <PixelIcon name="image" size={16} />, action: "image", markdown: "![alt](url)" },
  { label: "Bullet List", icon: <PixelIcon name="more-horizontal" size={16} />, action: "ul", markdown: "- " },
  { label: "Numbered List", icon: "1.", action: "ol", markdown: "1. " },
  { label: "Task List", icon: <PixelIcon name="check" size={16} />, action: "tasklist", markdown: "- [ ] " },
  { label: "Table", icon: <PixelIcon name="chart" size={16} />, action: "table", markdown: "| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |" },
  { label: "Footnote", icon: "¹", action: "footnote", markdown: "[^1]" },
  { label: "Horizontal Rule", icon: <PixelIcon name="minus" size={16} />, action: "hr", markdown: "---" },
];

export default function PostEditor({
  mode = "create",
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
  intentStampsEnabled = true,
  postTitlesRequired = true,
  respondingToPrompt,
}: PostEditorProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [visibility, setVisibility] = useState<Visibility>(initialData?.visibility || "public");
  const [intent, setIntent] = useState<PostIntent | null>(initialData?.intent || null);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpoiler, setIsSpoiler] = useState(initialData?.isSpoiler || false);
  const [contentWarning, setContentWarning] = useState(initialData?.contentWarning || "");
  const [draftSaved, setDraftSaved] = useState(false);
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);

  const [threadRings, setThreadRings] = useState<ThreadRingMembership[]>([]);
  const [selectedRings, setSelectedRings] = useState<string[]>(initialData?.selectedRings || []);
  const [ringsLoading, setRingsLoading] = useState(false);

  // Journal Metadata State
  const [mood, setMood] = useState(initialData?.metadata?.mood || "");
  const [listeningTo, setListeningTo] = useState(initialData?.metadata?.listeningTo || "");
  const [reading, setReading] = useState(initialData?.metadata?.reading || "");
  const [drinking, setDrinking] = useState(initialData?.metadata?.drinking || "");
  const [location, setLocation] = useState(initialData?.metadata?.location || "");

  const [previewHtml, setPreviewHtml] = useState("<p class='opacity-60'>(Nothing to preview)</p>");

  // Auto-save key
  const DRAFT_KEY = "threadstead_post_draft";

  // Load draft on mount
  useEffect(() => {
    if (mode === "create" && !initialData) {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        try {
          const { title: sTitle, content: sContent, intent: sIntent } = JSON.parse(saved);
          if (sTitle) setTitle(sTitle);
          if (sContent) setContent(sContent);
          if (sIntent) setIntent(sIntent);
        } catch (e) {
          console.error("Failed to load draft", e);
        }
      }
    }
  }, [mode, initialData]);

  // Save draft on change
  useEffect(() => {
    if (mode === "create" && !initialData) {
      const timeout = setTimeout(() => {
        if (title || content || intent) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content, intent }));
          setDraftSaved(true);
          setTimeout(() => setDraftSaved(false), 2000);
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [title, content, intent, mode, initialData]);

  // Clear draft on unmount or submit (handled in submit)
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  // Warn on unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((title || content) && !busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [title, content, busy]);

  // Comprehensive client-side title validation
  const validateTitle = (titleText: string) => {
    if (!titleText && postTitlesRequired) {
      return "Post title is required";
    }

    if (titleText) {
      const validation = validatePostTitle(titleText);
      if (!validation.ok) {
        return validation.message;
      }
    }

    return null;
  };

  // Validate title when it changes
  useEffect(() => {
    setTitleError(validateTitle(title));
  }, [title, postTitlesRequired]);

  // Update preview when content changes
  useEffect(() => {
    let cancelled = false;

    async function updatePreview() {
      if (!content.trim()) {
        setPreviewHtml("<p class='opacity-60'>(Nothing to preview)</p>");
        return;
      }

      try {
        const html = await markdownToSafeHtmlWithEmojis(content);
        if (!cancelled) {
          setPreviewHtml(html);
        }
      } catch (error) {
        console.error('Failed to process preview:', error);
        if (!cancelled) {
          setPreviewHtml(markdownToSafeHtml(content));
        }
      }
    }

    updatePreview();

    return () => {
      cancelled = true;
    };
  }, [content]);

  useEffect(() => {
    fetchThreadRingMemberships();
  }, []);

  // Update selected rings when prompt data is available and threadrings are loaded
  useEffect(() => {
    if (respondingToPrompt) {
      if (threadRings.length === 0 && respondingToPrompt.threadRingSlug) {
        setSelectedRings([respondingToPrompt.threadRingSlug]);
      } else if (threadRings.length > 0) {
        const ring = threadRings.find(r => r.slug === respondingToPrompt.threadRingSlug);

        if (ring && !selectedRings.includes(ring.slug)) {
          setSelectedRings([ring.slug]);
        }
      }
    }
  }, [respondingToPrompt, threadRings, selectedRings]);

  const fetchThreadRingMemberships = async () => {
    setRingsLoading(true);
    try {
      const response = await fetch("/api/threadrings/my-memberships");
      if (response.ok) {
        const { rings } = await response.json();
        setThreadRings(rings);
      }
    } catch (error) {
      console.error("Failed to fetch ThreadRing memberships:", error);
    } finally {
      setRingsLoading(false);
    }
  };

  const isValidImageFile = (file: File): boolean => {
    // Check MIME type first
    if (file.type.startsWith('image/')) {
      return true;
    }

    // For files with missing/incorrect MIME types (common with HEIC on mobile),
    // check file extension as fallback
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
    return validExtensions.some(ext => fileName.endsWith(ext));
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    if (!isValidImageFile(file)) {
      setError('Please select an image file (JPEG, PNG, GIF, WebP, or HEIC)');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('Image must be less than 25MB');
      return;
    }

    setUploadingImage(true);
    setUploadProgress(0);
    setError(null);

    // Compress image (handles HEIC conversion automatically, preserves GIFs)
    let fileToUpload = file;
    const isGif = file.type === 'image/gif';

    if (!isGif) {
      try {
        setUploadProgress(10); // Show progress during compression
        const options = {
          maxSizeMB: 3,          // Target 3MB max
          maxWidthOrHeight: 2400, // High quality for displays
          useWebWorker: true,     // Don't block UI
          fileType: 'image/jpeg'  // Convert to JPEG (handles HEIC conversion)
        };

        fileToUpload = await imageCompression(file, options);
        setUploadProgress(20);
      } catch (compressionError: any) {
        setError(`Failed to compress image: ${compressionError?.message || 'Unknown error'}. Try a smaller photo or different format.`);
        setUploadingImage(false);
        setUploadProgress(0);
        return;
      }
    }

    try {
      const capRes = await fetch('/api/cap/media', { method: 'POST' });
      if (!capRes.ok) {
        const errorText = await capRes.text();
        throw new Error(`Failed to get upload permission (${capRes.status}). Please refresh and try again.`);
      }
      const { token } = await capRes.json();

      const formData = new FormData();
      formData.append('image', fileToUpload);
      formData.append('cap', token);
      formData.append('context', 'post_embed');

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      const uploadPromise = new Promise<{ success: boolean; media: { mediumUrl: string; id: string;[key: string]: any } }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } else {
            let errorMsg = 'Upload failed';
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMsg = errorData.error || errorMsg;
            } catch {
              // If response is not JSON, use status text
              errorMsg = xhr.statusText || errorMsg;
            }
            reject(new Error(`Upload failed (${xhr.status}): ${errorMsg}`));
          }
        };
        xhr.onerror = () => {
          reject(new Error('Network error - check your internet connection and try again'));
        };
      });

      xhr.open('POST', '/api/media/upload');

      // Add CSRF token header
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
      }

      xhr.send(formData);

      const response = await uploadPromise;

      const textarea = textareaRef.current;
      if (textarea && response.success && response.media?.mediumUrl) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;

        const imageMarkdown = `![${fileToUpload.name}](${response.media.mediumUrl})`;
        const newValue = value.substring(0, start) + imageMarkdown + value.substring(end);

        setContent(newValue);

        setTimeout(() => {
          textarea.focus();
          const newCursorPos = start + imageMarkdown.length;
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        }, 0);
      } else {
        throw new Error('Upload succeeded but no media URL returned');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      await handleImageUpload(imageFiles[0]);
    }
  };

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      if (e.shiftKey) {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const lineEnd = value.indexOf("\n", end);
        const endPos = lineEnd === -1 ? value.length : lineEnd;

        const lines = value.substring(lineStart, endPos).split("\n");
        const outdentedLines = lines.map(line =>
          line.startsWith("  ") ? line.substring(2) : line
        );

        const newValue =
          value.substring(0, lineStart) +
          outdentedLines.join("\n") +
          value.substring(endPos);

        setContent(newValue);

        setTimeout(() => {
          const diff = value.length - newValue.length;
          textarea.selectionStart = Math.max(lineStart, start - (start === lineStart ? 0 : 2));
          textarea.selectionEnd = Math.max(lineStart, end - diff);
        }, 0);
      } else {
        if (start === end) {
          const newValue = value.substring(0, start) + "  " + value.substring(end);
          setContent(newValue);

          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          }, 0);
        } else {
          const lineStart = value.lastIndexOf("\n", start - 1) + 1;
          const lineEnd = value.indexOf("\n", end);
          const endPos = lineEnd === -1 ? value.length : lineEnd;

          const lines = value.substring(lineStart, endPos).split("\n");
          const indentedLines = lines.map(line => "  " + line);

          const newValue =
            value.substring(0, lineStart) +
            indentedLines.join("\n") +
            value.substring(endPos);

          setContent(newValue);

          setTimeout(() => {
            textarea.selectionStart = lineStart;
            textarea.selectionEnd = endPos + (lines.length * 2);
          }, 0);
        }
      }
    }
  };

  const insertMarkdown = useCallback((action: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();

    const value = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    // Replace [from,to) with `text`, preserving native undo (execCommand), then
    // select [selFrom,selTo). Falls back to a state splice if execCommand is
    // unavailable. execCommand fires an input event, so React's onChange keeps
    // `content` in sync.
    const applyEdit = (from: number, to: number, text: string, selFrom: number, selTo: number) => {
      textarea.setSelectionRange(from, to);
      let ok = false;
      try { ok = document.execCommand("insertText", false, text); } catch { ok = false; }
      if (ok) {
        textarea.setSelectionRange(selFrom, selTo);
      } else {
        const nv = textarea.value.substring(0, from) + text + textarea.value.substring(to);
        setContent(nv);
        requestAnimationFrame(() => textarea.setSelectionRange(selFrom, selTo));
      }
    };

    // Wrap the selection with `marker` (e.g. ** ), or toggle it off if already
    // wrapped. With no selection, insert `marker placeholder marker` and select
    // the placeholder so the user can type over it.
    const wrapInline = (marker: string, placeholder: string) => {
      const m = marker.length;
      if (value.substring(start - m, start) === marker && value.substring(end, end + m) === marker) {
        applyEdit(start - m, end + m, selectedText, start - m, end - m); // markers just outside
        return;
      }
      if (selectedText.length >= m * 2 && selectedText.startsWith(marker) && selectedText.endsWith(marker)) {
        const inner = selectedText.slice(m, -m); // markers inside selection
        applyEdit(start, end, inner, start, start + inner.length);
        return;
      }
      const body = selectedText || placeholder;
      applyEdit(start, end, marker + body + marker, start + m, start + m + body.length);
    };

    // Add `prefix` to every line touched by the selection, or remove it if every
    // line already has it (toggle). Selects the affected block afterward.
    const prefixLines = (prefix: string) => {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const nlAfter = value.indexOf("\n", end);
      const blockEnd = nlAfter === -1 ? value.length : nlAfter;
      const lines = value.substring(lineStart, blockEnd).split("\n");
      const allHave = lines.every((l) => l.startsWith(prefix));
      const block = (allHave ? lines.map((l) => l.slice(prefix.length)) : lines.map((l) => prefix + l)).join("\n");
      applyEdit(lineStart, blockEnd, block, lineStart, lineStart + block.length);
    };

    switch (action) {
      case "bold": return wrapInline("**", "text");
      case "italic": return wrapInline("*", "text");
      case "code": return wrapInline("`", "code");

      case "h1": return prefixLines("# ");
      case "h2": return prefixLines("## ");
      case "h3": return prefixLines("### ");
      case "quote": return prefixLines("> ");
      case "ul": return prefixLines("- ");
      case "ol": return prefixLines("1. ");
      case "tasklist": return prefixLines("- [ ] ");

      case "codeblock": {
        const inner = selectedText || "code here";
        const innerFrom = start + 5; // after "\n```\n"
        return applyEdit(start, end, `\n\`\`\`\n${inner}\n\`\`\`\n`, innerFrom, innerFrom + inner.length);
      }
      case "link": {
        if (selectedText) {
          const urlFrom = start + selectedText.length + 3; // after "[sel]("
          return applyEdit(start, end, `[${selectedText}](url)`, urlFrom, urlFrom + 3); // select "url"
        }
        return applyEdit(start, end, "[link text](url)", start + 1, start + 10); // select "link text"
      }
      case "image":
        return applyEdit(start, end, "![alt](url)", start + 2, start + 5); // select "alt"

      case "table": {
        const h1From = start + 3; // after "\n| "
        return applyEdit(start, end, "\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n", h1From, h1From + 8);
      }
      case "footnote": {
        if (selectedText) {
          applyEdit(start, end, "[^1]", start + 4, start + 4);
          const len = textarea.value.length;
          return applyEdit(len, len, `\n\n[^1]: ${selectedText}`, len + 6, len + 6);
        }
        return applyEdit(start, end, "[^1]", start + 2, start + 3); // select the "1" to rename
      }
      case "hr": {
        const pos = start + 5;
        return applyEdit(start, end, "\n---\n", pos, pos);
      }
      default:
        return;
    }
  }, []);

  // Cmd/Ctrl+B / I / K formatting shortcuts, then fall through to tab handling.
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "b") { e.preventDefault(); insertMarkdown("bold"); return; }
      if (k === "i") { e.preventDefault(); insertMarkdown("italic"); return; }
      if (k === "k") { e.preventDefault(); insertMarkdown("link"); return; }
    }
    handleTabKey(e);
  }, [insertMarkdown]);

  const handleEmojiSelect = useCallback((emojiName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const emojiText = `:${emojiName}:`;

    const newValue = value.substring(0, start) + emojiText + value.substring(end);
    setContent(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + emojiText.length;
    }, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = content.trim();

    if (!body) {
      setError("Post content is required");
      return;
    }

    if (postTitlesRequired && !title.trim()) {
      setError("Post title is required");
      return;
    }

    if (intentStampsEnabled && !intent) {
      setError("Please select an intent for your post");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        visibility,
        bodyMarkdown: body
      };

      if (mode === "edit" && initialData?.id) {
        payload.id = initialData.id;
      }

      payload.title = title.trim();

      if (intent) {
        payload.intent = intent;
      }

      // Add metadata if any field is populated
      if (mood || listeningTo || reading || drinking || location) {
        payload.metadata = {
          mood: mood.trim() || undefined,
          listeningTo: listeningTo.trim() || undefined,
          reading: reading.trim() || undefined,
          drinking: drinking.trim() || undefined,
          location: location.trim() || undefined,
        };
      }

      if (isSpoiler) {
        payload.isSpoiler = true;
        payload.contentWarning = contentWarning.trim() || null;
      }

      if (selectedRings.length > 0) {
        payload.threadRingIds = selectedRings;
      }

      if (respondingToPrompt) {
        payload.promptId = respondingToPrompt.id;
      }

      if (onSubmit) {
        await onSubmit(payload);
        clearDraft(); // Clear draft on success
      }
    } catch (e: any) {
      setError(e?.message || `Failed to ${mode === "edit" ? "update" : "create"} post`);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <div className="w-full">
      {/* Prompt Response Banner */}
      {respondingToPrompt && (
        <div className="w-full bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-blue-400 p-4 mb-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <PixelIcon name="chat" size={24} className="text-blue-600" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Responding to Challenge
                </h3>
                <p className="text-blue-700 font-medium">
                  &quot;{respondingToPrompt.title}&quot;
                </p>
                <p className="text-sm text-gray-600">
                  Your post will be automatically linked to this prompt in the {respondingToPrompt.threadRingSlug} ThreadRing
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="post-editor-container border border-black bg-white shadow-[4px_4px_0_#000] relative">
        {/* Tab Navigation */}
        <div className="border-b border-black bg-gray-50 p-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex gap-2">
            <button
              type="button"
              className={`px-4 py-2 border border-black text-sm font-medium shadow-[2px_2px_0_#000] transition-all flex items-center gap-2 ${activeTab === "write"
                ? "bg-yellow-200 translate-y-0"
                : "bg-white hover:bg-gray-100"
                }`}
              onClick={() => setActiveTab("write")}
            >
              <PixelIcon name="edit" size={16} /> Write
            </button>
            <button
              type="button"
              className={`px-4 py-2 border border-black text-sm font-medium shadow-[2px_2px_0_#000] transition-all flex items-center gap-2 ${activeTab === "preview"
                ? "bg-yellow-200 translate-y-0"
                : "bg-white hover:bg-gray-100"
                }`}
              onClick={() => setActiveTab("preview")}
            >
              <PixelIcon name="eye" size={16} /> Preview
            </button>
            {
              draftSaved && (
                <span className="ml-2 text-xs text-thread-sage flex items-center animate-fade-in gap-1">
                  <PixelIcon name="check" size={14} /> Draft saved
                </span>
              )
            }
          </div >

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Visibility:</label>
              <select
                className="form-select border border-black bg-white px-3 py-1 text-sm"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                disabled={busy}
              >
                {VIS_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div >

        {/* Editor Content */}
        < div className="p-4 sm:p-6" >
          {/* Intent + Title Input */}
          < div className="mb-6 space-y-4" >
            {intentStampsEnabled && (
              <div className="flex items-center gap-3">
                <span className="text-base text-gray-600 font-medium">I am</span>
                <select
                  className="form-select border border-black bg-white px-4 py-2 text-base rounded shadow-sm focus:ring-2 focus:ring-yellow-200 outline-none"
                  value={intent || ""}
                  onChange={(e) => setIntent(e.target.value as PostIntent || null)}
                  disabled={busy}
                  required={intentStampsEnabled}
                >
                  <option value="">choose an intent...</option>
                  {INTENT_OPTS.map((o) => (
                    <option key={o.v} value={o.v} title={o.description}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )
            }

            <div>
              <input
                type="text"
                className={`form-input w-full border-b-2 bg-transparent p-2 text-3xl font-bold placeholder-gray-300 focus:border-black focus:outline-none transition-colors ${titleError ? 'border-red-500' : 'border-gray-200'
                  }`}
                placeholder={postTitlesRequired ? "Give your post a title..." : "Post title (optional)"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={busy}
                required={postTitlesRequired}
                maxLength={200}
              />
              {titleError && (
                <div className="text-red-600 text-sm mt-1 font-medium">{titleError}</div>
              )}
            </div>
          </div >

          {/* Spoiler/Content Warning Section */}
          <div className="mb-6 border border-dashed border-thread-sage/40 p-4 bg-thread-cream/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <PixelIcon name="alert" size={20} className="text-orange-600" />
              <h3 className="text-sm font-bold text-gray-800">Content Warning</h3>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSpoiler}
                  onChange={(e) => {
                    setIsSpoiler(e.target.checked);
                    if (!e.target.checked) {
                      setContentWarning("");
                    }
                  }}
                  disabled={busy}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-800 font-medium">
                  Mark this post as containing spoilers
                </span>
              </label>

              {isSpoiler && (
                <div className="mt-2 animate-in slide-in-from-top-2">
                  <input
                    type="text"
                    className="form-input w-full border border-black p-2 text-sm rounded shadow-sm"
                    placeholder="Warning description (e.g. Episode 5 spoilers, Season 2 finale)"
                    value={contentWarning}
                    onChange={(e) => setContentWarning(e.target.value)}
                    disabled={busy}
                    maxLength={100}
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    This will blur the post content until readers choose to reveal it
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Journal Metadata Section */}
          <div className="mb-6 border border-black bg-white shadow-[4px_4px_0_#000]">
            <button
              type="button"
              onClick={() => setIsMetadataOpen(!isMetadataOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <PixelIcon name="script" size={20} />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Journal Metadata</h3>
              </div>
              <PixelIcon name={isMetadataOpen ? "chevron-up" : "chevron-down"} size={16} />
            </button>

            {isMetadataOpen && (
              <div className="p-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mood</label>
                  <div className="flex items-center gap-2 border-b-2 border-gray-200 focus-within:border-black transition-colors">
                    <PixelIcon name="heart" size={16} className="text-gray-400" />
                    <input
                      type="text"
                      className="w-full py-1 bg-transparent outline-none text-sm"
                      placeholder="How are you feeling?"
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Listening To</label>
                  <div className="flex items-center gap-2 border-b-2 border-gray-200 focus-within:border-black transition-colors">
                    <PixelIcon name="music" size={16} className="text-gray-400" />
                    <input
                      type="text"
                      className="w-full py-1 bg-transparent outline-none text-sm"
                      placeholder="Song, album, or artist"
                      value={listeningTo}
                      onChange={(e) => setListeningTo(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reading</label>
                  <div className="flex items-center gap-2 border-b-2 border-gray-200 focus-within:border-black transition-colors">
                    <PixelIcon name="article" size={16} className="text-gray-400" />
                    <input
                      type="text"
                      className="w-full py-1 bg-transparent outline-none text-sm"
                      placeholder="Book or article"
                      value={reading}
                      onChange={(e) => setReading(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Drinking</label>
                  <div className="flex items-center gap-2 border-b-2 border-gray-200 focus-within:border-black transition-colors">
                    <PixelIcon name="drop" size={16} className="text-gray-400" />
                    <input
                      type="text"
                      className="w-full py-1 bg-transparent outline-none text-sm"
                      placeholder="Coffee, tea, etc."
                      value={drinking}
                      onChange={(e) => setDrinking(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                  <div className="flex items-center gap-2 border-b-2 border-gray-200 focus-within:border-black transition-colors">
                    <PixelIcon name="map" size={16} className="text-gray-400" />
                    <input
                      type="text"
                      className="w-full py-1 bg-transparent outline-none text-sm"
                      placeholder="Where are you posting from?"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeTab === "write" ? (
            <>
              {/* Markdown Toolbar */}
              <div className="sticky top-[60px] z-10 border border-black bg-gray-50 p-2 mb-4 flex flex-wrap gap-1 items-center shadow-md rounded-lg mx-[-8px]">
                {TOOLBAR_ITEMS.map((item) => (
                  <button
                    key={item.action}
                    type="button"
                    className="toolbar-button px-2 py-1.5 border border-transparent hover:border-black hover:bg-white rounded text-sm font-mono transition-all"
                    onClick={() => insertMarkdown(item.action)}
                    title={item.label}
                    disabled={busy || uploadingImage}
                  >
                    {item.icon}
                  </button>
                ))}

                <EmojiPicker onEmojiSelect={handleEmojiSelect} />

                <div className="ml-2 border-l border-black pl-2">
                  <button
                    type="button"
                    className="toolbar-button px-3 py-1 border border-black bg-white hover:bg-green-100 text-sm font-medium shadow-[1px_1px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Image"
                    disabled={busy || uploadingImage}
                  >
                    {uploadingImage ? `Uploading...${uploadProgress}% ` : (
                      <span className="flex items-center gap-1">
                        <PixelIcon name="camera" size={16} /> Upload Image
                      </span>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Smart URL Shortener */}
              <div className="mb-4">
                <SmartUrlShortener
                  content={content}
                  onContentChange={setContent}
                  className="mb-3"
                />
              </div>

              {/* Markdown Editor */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  className={`w-full border border-black p-3 font-mono text-sm leading-relaxed resize-vertical ${isDragging ? 'border-green-500 bg-green-50' : ''
                    }`}
                  rows={20}
                  placeholder="Write your post in Markdown format...

# Heading 1
## Heading 2

**Bold text** and *italic text*

- Bullet point
- Another point

1. Numbered list
2. Second item

> Blockquote

`inline code` and code blocks:

```
code block
    ```

[Link text](https://example.com)
![Image alt](image-url)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  disabled={busy || uploadingImage}
                />

                {isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 shadow-lg flex items-center gap-2">
                      <PixelIcon name="camera" size={24} className="text-green-800" />
                      <p className="text-green-800 font-medium">Drop image to upload</p>
                    </div>
                  </div>
                )}

                {uploadingImage && (
                  <div className="absolute bottom-4 right-4 bg-white border-2 border-black rounded-lg p-3 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-black rounded-full"></div>
                      <span className="text-sm font-medium">Uploading... {uploadProgress}%</span>
                    </div>
                    <div className="mt-2 w-48 bg-gray-200 rounded-full h-2">
                      <div
                        className="upload-progress-bar bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress} % ` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                <PixelIcon name="lightbulb" size={14} /> Tips: Use Tab to indent, Shift+Tab to outdent. Drag & drop or click Upload Image to add pictures.
              </div>
            </>
          ) : (
            <div className="border border-black p-4 min-h-[400px] bg-white">
              {title && (
                <h1 className="text-2xl font-bold mb-4 pb-2 border-b border-gray-300">
                  {title}
                </h1>
              )}
              <Preview content={previewHtml} />
            </div>
          )}

          {/* ThreadRing Selection - only available during post creation */}
          {
            mode === "create" && (
              <div className="mt-6 border border-black p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center gap-2 mb-3">
                  <PixelIcon name="link" size={20} />
                  <h3 className="text-base font-semibold text-gray-800">Share to ThreadRings</h3>
                  {respondingToPrompt ? (
                    <span className="ml-auto text-xs bg-green-200 px-2 py-1 rounded-full font-medium">
                      Auto-selected
                    </span>
                  ) : selectedRings.length > 0 && (
                    <span className="ml-auto text-xs bg-blue-200 px-2 py-1 rounded-full font-medium">
                      {selectedRings.length} selected
                    </span>
                  )}
                </div>

                {respondingToPrompt && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-medium">📍</span>
                      <span className="text-sm text-green-800">
                        This post will be shared to <strong>{respondingToPrompt.threadRingSlug}</strong> as a prompt response
                      </span>
                    </div>
                  </div>
                )}

                <div className="border border-black p-3 bg-white rounded max-h-40 overflow-y-auto">
                  {ringsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
                      Loading your ThreadRings...
                    </div>
                  ) : threadRings.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">
                      You&apos;re not a member of any ThreadRings yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {threadRings.map((ring) => (
                        <label
                          key={ring.id}
                          className={`checkbox - label flex items - center gap - 3 p - 2 rounded cursor - pointer transition - all ${selectedRings.includes(ring.slug)
                            ? 'bg-blue-100 border border-blue-300'
                            : 'hover:bg-gray-50 border border-transparent'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRings.includes(ring.slug)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRings([...selectedRings, ring.slug]);
                              } else {
                                setSelectedRings(selectedRings.filter(id => id !== ring.slug));
                              }
                            }}
                            disabled={busy || uploadingImage || !!respondingToPrompt}
                            className={`w - 4 h - 4 text - blue - 600 rounded focus: ring - blue - 500 ${respondingToPrompt ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{ring.name}</span>
                            {ring.visibility && (
                              <span className="ml-2 text-xs text-gray-500">({ring.visibility})</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {ring.role === "curator" && (
                              <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-medium">
                                Curator
                              </span>
                            )}
                            {ring.role === "moderator" && (
                              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-medium">
                                Moderator
                              </span>
                            )}
                            {ring.role === "member" && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                                Member
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {selectedRings.length > 0 && (
                  <div className="mt-3 p-2 bg-blue-100 border border-blue-200 rounded text-sm">
                    <div className="flex items-center gap-1 text-blue-800">
                      <PixelIcon name="check" size={16} />
                      <span>This post will be shared to <strong>{selectedRings.length}</strong> ThreadRing{selectedRings.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}

                {threadRings.length === 0 && !ringsLoading && (
                  <div className="text-center py-4">
                    <div className="text-gray-500 text-sm mb-2">
                      Join Rings to share your posts with communities
                    </div>
                    <Link
                      href="/threadrings"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                    >
                      Browse ThreadRings →
                    </Link>
                  </div>
                )}
              </div>
            )
          }
        </div >

        {/* Action Buttons */}
        < div className="border-t border-black bg-gray-50 p-4 flex items-center justify-between" >
          <button
            type="button"
            className="border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
            onClick={handleCancel}
            disabled={busy}
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {uploadingImage && (
              <span className="text-sm text-gray-600" role="status">
                Uploading image… please wait
              </span>
            )}
            <button
              type="submit"
              className="border border-black px-6 py-2 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium disabled:opacity-50"
              disabled={busy || uploadingImage || !content.trim()}
            >
              {busy ? `${mode === "edit" ? "Updating" : "Publishing"}…` : (submitLabel || `${mode === "edit" ? "Update" : "Publish"} Post`)}
            </button>
          </div>
        </div >

        {error && (
          <div className="border-t border-black bg-red-50 p-3">
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}
      </form >
    </div >
  );
}