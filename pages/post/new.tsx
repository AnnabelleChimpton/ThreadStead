import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { markdownToSafeHtml } from "@/lib/sanitize";
import { markdownToSafeHtmlWithEmojis } from "@/lib/comment-markup";
import Preview from "@/components/forms/PreviewForm";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { validatePostTitle } from "@/lib/validation";
import EmojiPicker from "@/components/EmojiPicker";

interface PostEditorPageProps {
  siteConfig: SiteConfig;
}

type Visibility = "public" | "followers" | "friends" | "private";
type ThreadRingMembership = {
  id: string;
  name: string;
  slug: string;
  role: string;
  visibility: string;
};

const VIS_OPTS: { v: Visibility; label: string }[] = [
  { v: "public", label: "Public" },
  { v: "followers", label: "Followers" },
  { v: "friends", label: "Friends" },
  { v: "private", label: "Only Me" },
];

type PostIntent = "sharing" | "asking" | "feeling" | "announcing" | "showing" | "teaching" | "looking" | "celebrating" | "recommending";

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
  { label: "Horizontal Rule", icon: "—", action: "hr", markdown: "---" },
];

export default function PostEditorPage({ siteConfig }: PostEditorPageProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user: currentUser } = useCurrentUser();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [intent, setIntent] = useState<PostIntent | null>(null);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [contentWarning, setContentWarning] = useState("");
  
  const [threadRings, setThreadRings] = useState<ThreadRingMembership[]>([]);
  const [selectedRings, setSelectedRings] = useState<string[]>([]);
  const [ringsLoading, setRingsLoading] = useState(false);
  
  // Prompt response state
  const [respondingToPrompt, setRespondingToPrompt] = useState<{
    id: string;
    title: string;
    threadRingSlug: string;
  } | null>(null);
  
  // Site config for intent stamps
  const [intentStampsEnabled, setIntentStampsEnabled] = useState(true);
  const [postTitlesRequired, setPostTitlesRequired] = useState(true);
  
  // Comprehensive client-side title validation
  const validateTitle = (titleText: string) => {
    if (!titleText && postTitlesRequired) {
      return "Post title is required";
    }
    
    if (titleText) {
      // Use our comprehensive validation system
      const validation = validatePostTitle(titleText);
      if (!validation.ok) {
        return validation.message;
      }
    }
    
    return null;
  };
  
  // Validate title when it changes
  React.useEffect(() => {
    setTitleError(validateTitle(title));
  }, [title, postTitlesRequired]);
  
  const [previewHtml, setPreviewHtml] = useState("<p class='opacity-60'>(Nothing to preview)</p>");
  
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
          // Fallback to regular markdown without emojis
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
    fetchSiteConfig();
    handleUrlParameters();
     
    // Intentionally only run once on mount to initialize form from URL params
  }, []);

  const handleUrlParameters = () => {
    const { promptId, threadRing, promptTitle } = router.query;
    
    if (promptId && threadRing && promptTitle) {
      setRespondingToPrompt({
        id: String(promptId),
        title: String(promptTitle),
        threadRingSlug: String(threadRing)
      });
    }
  };

  // Update selected rings when prompt data is available and threadrings are loaded
  useEffect(() => {
    console.log('🔍 ThreadRing selection effect:', {
      hasPrompt: !!respondingToPrompt,
      promptSlug: respondingToPrompt?.threadRingSlug,
      threadRingsCount: threadRings.length,
      selectedRings
    });
    
    if (respondingToPrompt) {
      // In dev mode, if we have no memberships, just use the ThreadRing from the prompt
      if (threadRings.length === 0 && respondingToPrompt.threadRingSlug) {
        console.log('⚠️ No ThreadRing memberships found (dev mode issue), using prompt ThreadRing directly');
        setSelectedRings([respondingToPrompt.threadRingSlug]);
      } else if (threadRings.length > 0) {
        const ring = threadRings.find(r => r.slug === respondingToPrompt.threadRingSlug);
        console.log('🔍 Found matching ring:', ring?.slug);
        
        if (ring && !selectedRings.includes(ring.slug)) {
          console.log('✅ Setting selected rings to:', [ring.slug]);
          setSelectedRings([ring.slug]); // Use slug for Ring Hub compatibility
        }
      }
    }
  }, [respondingToPrompt, threadRings, selectedRings]);

  const fetchSiteConfig = async () => {
    try {
      const response = await fetch("/api/site-config");
      if (response.ok) {
        const { config } = await response.json();
        setIntentStampsEnabled(config.enable_intent_stamps === "true");
        setPostTitlesRequired(config.require_post_titles === "true");
      }
    } catch (error) {
      console.error("Failed to fetch site config:", error);
    }
  };

  const fetchThreadRingMemberships = async () => {
    setRingsLoading(true);
    try {
      const response = await fetch("/api/threadrings/my-memberships");
      if (response.ok) {
        const { rings } = await response.json();
        console.log('🔍 Loaded ThreadRings:', rings.map((tr: any) => ({ id: tr.id, name: tr.name, slug: tr.slug })));
        setThreadRings(rings);
      }
    } catch (error) {
      console.error("Failed to fetch ThreadRing memberships:", error);
    } finally {
      setRingsLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (15MB limit)
    if (file.size > 15 * 1024 * 1024) {
      setError('Image must be less than 15MB');
      return;
    }

    setUploadingImage(true);
    setUploadProgress(0);
    setError(null);

    try {
      // First, get a capability token for media upload
      const capRes = await fetch('/api/cap/media', { method: 'POST' });
      if (!capRes.ok) {
        throw new Error('Failed to get upload permission');
      }
      const { token } = await capRes.json();

      const formData = new FormData();
      formData.append('image', file);
      formData.append('cap', token);

      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      // Create a promise for the upload
      const uploadPromise = new Promise<{ success: boolean; media: { mediumUrl: string } }>((resolve, reject) => {
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
      xhr.send(formData);

      const response = await uploadPromise;
      
      // Insert the image markdown at cursor position
      const textarea = textareaRef.current;
      if (textarea && response.media?.mediumUrl) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        
        const imageMarkdown = `![${file.name}](${response.media.mediumUrl})`;
        const newValue = value.substring(0, start) + imageMarkdown + value.substring(end);
        
        setContent(newValue);
        
        // Set cursor position after the inserted markdown
        setTimeout(() => {
          textarea.focus();
          const newCursorPos = start + imageMarkdown.length;
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        }, 0);
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
    // Reset the input so the same file can be selected again
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
      // Upload the first image
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
        // Handle shift+tab for outdent
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
        // Handle tab for indent
        if (start === end) {
          // No selection, insert two spaces
          const newValue = value.substring(0, start) + "  " + value.substring(end);
          setContent(newValue);
          
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          }, 0);
        } else {
          // Selection exists, indent all selected lines
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

  // Handle emoji selection
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

    // Validate title requirement
    if (postTitlesRequired && !title.trim()) {
      setError("Post title is required");
      return;
    }

    // Validate intent requirement if enabled
    if (intentStampsEnabled && !intent) {
      setError("Please select an intent for your post");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const capRes = await fetch("/api/cap/post", { method: "POST" });
      if (capRes.status === 401) {
        setError("Please log in to post.");
        setBusy(false);
        return;
      }
      if (!capRes.ok) throw new Error(`cap mint failed: ${capRes.status}`);
      const { token } = await capRes.json();

      const payload: Record<string, any> = { 
        visibility, 
        cap: token,
        bodyMarkdown: body
      };
      
      // Title is now required
      payload.title = title.trim();
      
      // Add intent if provided
      if (intent) {
        payload.intent = intent;
      }
      
      // Add spoiler/content warning data
      if (isSpoiler) {
        payload.isSpoiler = true;
        payload.contentWarning = contentWarning.trim() || null;
      }
      
      // Debug selected rings
      console.log('🔍 Form submission - selectedRings:', selectedRings);
      console.log('🔍 Form submission - respondingToPrompt:', respondingToPrompt);
      
      if (selectedRings.length > 0) {
        payload.threadRingIds = selectedRings;
        console.log('✅ Added threadRingIds to payload:', selectedRings);
      } else {
        console.log('❌ No selected rings, threadRingIds not added to payload');
      }
      
      // Add prompt ID if responding to a prompt
      if (respondingToPrompt) {
        payload.promptId = respondingToPrompt.id;
        console.log('✅ Added promptId to payload:', respondingToPrompt.id);
      }

      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) throw new Error(`create failed: ${res.status}`);
      
      const { post } = await res.json();
      router.push(`/resident/${post.authorUsername}/post/${post.id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout siteConfig={siteConfig}>
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
      
      <div className="w-full p-4">
        <div className="post-editor-container p-6 mb-4 bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[3px_3px_0_#A18463]">
          <h1 className="thread-headline text-2xl font-bold mb-2">Create New Post</h1>
          <p className="text-[#A18463]">Write your post using Markdown formatting</p>
        </div>

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
                  className="border border-black bg-white px-3 py-1 text-sm"
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
                    className="border border-black bg-white px-3 py-1 text-sm rounded"
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
                className={`w-full border p-3 text-lg font-semibold ${
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
                      className="w-full border border-black p-2 text-sm rounded"
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
                <div className="border border-black bg-gray-50 p-2 mb-2 flex flex-wrap gap-1 items-center">
                  {TOOLBAR_ITEMS.map((item) => (
                    <button
                      key={item.action}
                      type="button"
                      className="px-2 py-1 border border-black bg-white hover:bg-yellow-100 text-sm font-mono shadow-[1px_1px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      onClick={() => insertMarkdown(item.action, item.markdown)}
                      title={item.label}
                      disabled={busy || uploadingImage}
                    >
                      {item.icon}
                    </button>
                  ))}
                  
                  {/* Emoji Picker */}
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  
                  <div className="ml-2 border-l border-black pl-2">
                    <button
                      type="button"
                      className="px-3 py-1 border border-black bg-white hover:bg-green-100 text-sm font-medium shadow-[1px_1px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload Image"
                      disabled={busy || uploadingImage}
                    >
                      {uploadingImage ? `Uploading... ${uploadProgress}%` : '📸 Upload Image'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Markdown Editor */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    className={`w-full border border-black p-3 font-mono text-sm leading-relaxed resize-vertical ${
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
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all ${
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
                      Join ThreadRings to share your posts with communities
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
              onClick={() => router.back()}
              disabled={busy}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="border border-black px-6 py-2 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium disabled:opacity-50"
              disabled={busy || !content.trim()}
            >
              {busy ? "Posting…" : "Publish Post"}
            </button>
          </div>

          {error && (
            <div className="border-t border-black bg-red-50 p-3">
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          )}
        </form>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<PostEditorPageProps> = async () => {
  const siteConfig = await getSiteConfig();
  
  return {
    props: {
      siteConfig,
    },
  };
};