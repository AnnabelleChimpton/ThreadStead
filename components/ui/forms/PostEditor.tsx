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
  { label: "Bold", icon: "B", action: "bold", markdown: "**" },
  { label: "Italic", icon: "I", action: "italic", markdown: "_" },
  { label: "Heading 1", icon: "H1", action: "h1", markdown: "# " },
  { label: "Heading 2", icon: "H2", action: "h2", markdown: "## " },
  { label: "Heading 3", icon: "H3", action: "h3", markdown: "### " },
  { label: "Quote", icon: "❝", action: "quote", markdown: "> " },
  { label: "Code", icon: "</>", action: "code", markdown: "`" },
  { label: "Code Block", icon: "[ ]", action: "codeblock", markdown: "```" },
  { label: "Link", icon: "🔗", action: "link", markdown: "[text](url)" },
  { label: "Image", icon: "📷", action: "image", markdown: "![alt](url)" },
  { label: "Bullet List", icon: "•", action: "ul", markdown: "- " },
  { label: "Numbered List", icon: "1.", action: "ol", markdown: "1. " },
  { label: "Task List", icon: "☑", action: "tasklist", markdown: "- [ ] " },
  { label: "Table", icon: "⊞", action: "table", markdown: "| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |" },
  { label: "Footnote", icon: "¹", action: "footnote", markdown: "[^1]" },
  { label: "Horizontal Rule", icon: "—", action: "hr", markdown: "---" },
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

  const [threadRings, setThreadRings] = useState<ThreadRingMembership[]>([]);
  const [selectedRings, setSelectedRings] = useState<string[]>(initialData?.selectedRings || []);
  const [ringsLoading, setRingsLoading] = useState(false);

  const [previewHtml, setPreviewHtml] = useState("<p class='opacity-60'>(Nothing to preview)</p>");

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

  const isHeicFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    return fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
           file.type === 'image/heic' || file.type === 'image/heif';
  };

  const convertHeicToJpeg = async (file: File): Promise<File> => {
    try {
      // Dynamic import to reduce bundle size
      const heic2any = (await import('heic2any')).default;

      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9
      }) as Blob;

      // Create a new File object from the converted blob
      const convertedFile = new File(
        [convertedBlob],
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        { type: 'image/jpeg' }
      );

      return convertedFile;
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw new Error('Failed to convert HEIC image. Please try a different image or convert to JPEG first.');
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    if (!isValidImageFile(file)) {
      setError('Please select an image file (JPEG, PNG, GIF, WebP, or HEIC)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Image must be less than 15MB');
      return;
    }

    setUploadingImage(true);
    setUploadProgress(0);
    setError(null);

    // Handle HEIC conversion if needed
    let fileToUpload = file;
    if (isHeicFile(file)) {
      try {
        setUploadProgress(10); // Show some progress during conversion
        fileToUpload = await convertHeicToJpeg(file);
        setUploadProgress(20);
      } catch (conversionError: any) {
        setError(conversionError.message);
        setUploadingImage(false);
        setUploadProgress(0);
        return;
      }
    }

    try {
      const capRes = await fetch('/api/cap/media', { method: 'POST' });
      if (!capRes.ok) {
        throw new Error('Failed to get upload permission');
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

      const uploadPromise = new Promise<{ success: boolean; media: { mediumUrl: string; id: string; [key: string]: any } }>((resolve, reject) => {
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
              // If response is not JSON, use default message
            }
            reject(new Error(errorMsg));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
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
      setError(err?.message || 'Failed to upload image');
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

  const insertMarkdown = useCallback((action: string, markdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selectedText = value.substring(start, end);

    let newValue = "";
    let newCursorPos = start;

    switch (action) {
      case "bold":
      case "italic":
      case "code":
        const wrapper = markdown;
        if (selectedText) {
          newValue = value.substring(0, start) + wrapper + selectedText + wrapper + value.substring(end);
          newCursorPos = end + wrapper.length * 2;
        } else {
          const placeholder = action === "code" ? "code" : "text";
          newValue = value.substring(0, start) + wrapper + placeholder + wrapper + value.substring(end);
          newCursorPos = start + wrapper.length;
        }
        break;

      case "h1":
      case "h2":
      case "h3":
      case "quote":
      case "ul":
      case "ol":
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const linePrefix = markdown;
        newValue = value.substring(0, lineStart) + linePrefix + value.substring(lineStart);
        newCursorPos = lineStart + linePrefix.length;
        break;

      case "codeblock":
        const codeBlock = selectedText
          ? `\n\`\`\`\n${selectedText}\n\`\`\`\n`
          : "\n```\ncode here\n```\n";
        newValue = value.substring(0, start) + codeBlock + value.substring(end);
        newCursorPos = selectedText ? end + 8 : start + 4;
        break;

      case "link":
        const linkText = selectedText || "link text";
        newValue = value.substring(0, start) + `[${linkText}](url)` + value.substring(end);
        newCursorPos = start + linkText.length + 3;
        break;

      case "image":
        newValue = value.substring(0, start) + "![alt text](image-url)" + value.substring(end);
        newCursorPos = start + 2;
        break;

      case "tasklist":
        const taskLineStart = value.lastIndexOf("\n", start - 1) + 1;
        newValue = value.substring(0, taskLineStart) + "- [ ] " + value.substring(taskLineStart);
        newCursorPos = taskLineStart + 6;
        break;

      case "table":
        const tableMarkdown = "\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n";
        newValue = value.substring(0, start) + tableMarkdown + value.substring(end);
        newCursorPos = start + 11; // Position cursor after "| Header 1"
        break;

      case "footnote":
        if (selectedText) {
          // If text is selected, create both reference and definition
          const footnoteRef = `[^1]`;
          const footnoteDefinition = `\n\n[^1]: ${selectedText}`;
          newValue = value.substring(0, start) + footnoteRef + value.substring(end) + footnoteDefinition;
          newCursorPos = start + footnoteRef.length;
        } else {
          // Just insert a footnote reference
          newValue = value.substring(0, start) + "[^1]" + value.substring(end);
          newCursorPos = start + 3; // Position cursor after "[^1"
        }
        break;

      case "hr":
        newValue = value.substring(0, start) + "\n---\n" + value.substring(end);
        newCursorPos = start + 5;
        break;

      default:
        return;
    }

    setContent(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    }, 0);
  }, []);

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
              <span className="text-2xl">💭</span>
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

      <form onSubmit={handleSubmit} className="post-editor-container border border-black bg-white shadow-[4px_4px_0_#000]">
        {/* Tab Navigation */}
        <div className="border-b border-black bg-gray-50 p-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              className={`px-4 py-2 border border-black text-sm font-medium shadow-[2px_2px_0_#000] transition-all ${
                activeTab === "write"
                  ? "bg-yellow-200 translate-y-0"
                  : "bg-white hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("write")}
            >
              ✏️ Write
            </button>
            <button
              type="button"
              className={`px-4 py-2 border border-black text-sm font-medium shadow-[2px_2px_0_#000] transition-all ${
                activeTab === "preview"
                  ? "bg-yellow-200 translate-y-0"
                  : "bg-white hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("preview")}
            >
              👁️ Preview
            </button>
          </div>

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
        </div>

        {/* Editor Content */}
        <div className="p-4">
          {/* Intent + Title Input */}
          <div className="mb-4">
            {intentStampsEnabled && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600 font-medium">I am</span>
                <select
                  className="form-select border border-black bg-white px-3 py-1 text-sm rounded"
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
            )}

            <input
              type="text"
              className={`form-input w-full border p-3 text-lg font-semibold ${
                titleError ? 'border-red-500' : 'border-black'
              }`}
              placeholder={postTitlesRequired ? "Post title (required)" : "Post title (optional)"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              required={postTitlesRequired}
              maxLength={200}
            />
            {titleError && (
              <div className="text-red-600 text-sm mt-1">{titleError}</div>
            )}
          </div>

          {/* Spoiler/Content Warning Section */}
          <div className="mb-4 border border-black p-3 bg-orange-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚠️</span>
              <h3 className="text-sm font-semibold text-gray-800">Content Warning</h3>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2">
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
                <span className="text-sm text-gray-800">
                  Mark this post as containing spoilers
                </span>
              </label>

              {isSpoiler && (
                <div className="mt-2">
                  <input
                    type="text"
                    className="form-input w-full border border-black p-2 text-sm rounded"
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

          {activeTab === "write" ? (
            <>
              {/* Markdown Toolbar */}
              <div className="mobile-full-width border border-black bg-gray-50 p-2 mb-2 flex flex-wrap gap-1 items-center">
                {TOOLBAR_ITEMS.map((item) => (
                  <button
                    key={item.action}
                    type="button"
                    className="toolbar-button px-2 py-1 border border-black bg-white hover:bg-yellow-100 text-sm font-mono shadow-[1px_1px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    onClick={() => insertMarkdown(item.action, item.markdown)}
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
                    {uploadingImage ? `Uploading... ${uploadProgress}%` : '📸 Upload Image'}
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
                  className={`mobile-textarea w-full border border-black p-3 font-mono text-sm leading-relaxed resize-vertical ${
                    isDragging ? 'border-green-500 bg-green-50' : ''
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
                  onKeyDown={handleTabKey}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  disabled={busy || uploadingImage}
                />

                {isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 shadow-lg">
                      <p className="text-green-800 font-medium">📸 Drop image to upload</p>
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
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-600 mt-2">
                💡 Tips: Use Tab to indent, Shift+Tab to outdent. Drag & drop or click Upload Image to add pictures.
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

          {/* ThreadRing Selection */}
          <div className="mt-6 border border-black p-4 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔗</span>
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
                        className={`checkbox-label flex items-center gap-3 p-2 rounded cursor-pointer transition-all ${
                          selectedRings.includes(ring.slug)
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
                          className={`w-4 h-4 text-blue-600 rounded focus:ring-blue-500 ${
                            respondingToPrompt ? 'opacity-50 cursor-not-allowed' : ''
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
                    <span>✓</span>
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
        </div>

        {/* Action Buttons */}
        <div className="border-t border-black bg-gray-50 p-4 flex items-center justify-between">
          <button
            type="button"
            className="border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
            onClick={handleCancel}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="border border-black px-6 py-2 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium disabled:opacity-50"
            disabled={busy || !content.trim()}
          >
            {busy ? `${mode === "edit" ? "Updating" : "Publishing"}…` : (submitLabel || `${mode === "edit" ? "Update" : "Publish"} Post`)}
          </button>
        </div>

        {error && (
          <div className="border-t border-black bg-red-50 p-3">
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}
      </form>
    </div>
  );
}