import React, { useState, useRef } from "react";
import EmojiPicker from "../feedback/EmojiPicker";
import { csrfFetch, getCsrfToken } from '@/lib/api/client/csrf-fetch';
import imageCompression from 'browser-image-compression';

export type CommentWire = {
  id: string;
  content: string;
  createdAt?: string;
  author?: { id?: string | null; handle?: string | null; avatarUrl?: string | null } | null;
  parentId?: string | null;
};

type Props = {
  postId: string;
  parentId?: string;
  onCommentAdded?: (c: CommentWire) => void;
  placeholder?: string;
};

export default function NewCommentForm({ postId, parentId, onCommentAdded, placeholder = "Write a comment…" }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePickerRef = useRef<HTMLDivElement>(null);

  const disabled = loading || !content.trim();

  // Helper function to insert text at cursor position
  const insertAtCursor = (beforeText: string, afterText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newContent = 
      content.substring(0, start) + 
      beforeText + 
      selectedText + 
      afterText + 
      content.substring(end);
    
    setContent(newContent);
    
    // Restore cursor position
    setTimeout(() => {
      const newCursorPos = start + beforeText.length + selectedText.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handle emoji selection
  const handleEmojiSelect = (emojiName: string) => {
    insertAtCursor(`:${emojiName}:`);
  };

  const formatActions = [
    {
      label: 'Bold',
      icon: 'B',
      action: () => insertAtCursor('**', '**'),
      title: 'Bold text (**text**)'
    },
    {
      label: 'Italic',
      icon: 'I',
      action: () => insertAtCursor('*', '*'),
      title: 'Italic text (*text*)'
    },
    {
      label: 'Strikethrough',
      icon: 'S̶',
      action: () => insertAtCursor('~~', '~~'),
      title: 'Strikethrough (~~text~~)'
    },
    {
      label: 'Code',
      icon: '</>',
      action: () => insertAtCursor('`', '`'),
      title: 'Inline code (`code`)'
    },
    {
      label: 'Link',
      icon: '🔗',
      action: () => insertAtCursor('[', '](https://example.com)'),
      title: 'Add link ([text](url))'
    },
    {
      label: 'Quote',
      icon: '"',
      action: () => insertAtCursor('> ', ''),
      title: 'Add quote (> text)'
    },
    {
      label: 'List',
      icon: '•',
      action: () => insertAtCursor('- ', ''),
      title: 'Add bullet point (- text)'
    },
    {
      label: 'Numbered',
      icon: '1.',
      action: () => insertAtCursor('1. ', ''),
      title: 'Add numbered list (1. text)'
    }
  ];

  // Image upload validation
  const isValidImageFile = (file: File): boolean => {
    if (file.type.startsWith('image/')) {
      return true;
    }
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
    return validExtensions.some(ext => fileName.endsWith(ext));
  };

  // Image upload handler
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
        setUploadProgress(10);
        const options = {
          maxSizeMB: 3,
          maxWidthOrHeight: 2400,
          useWebWorker: true,
          fileType: 'image/jpeg' as const
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

  // Handle inserting image URL
  const handleInsertImageUrl = () => {
    if (!imageUrl.trim()) return;

    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const imageMarkdown = `![image](${imageUrl.trim()})`;
      const newValue = value.substring(0, start) + imageMarkdown + value.substring(end);

      setContent(newValue);

      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + imageMarkdown.length;
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      }, 0);
    }

    setImageUrl("");
    setShowImagePicker(false);
  };

  // Close image picker when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (imagePickerRef.current && !imagePickerRef.current.contains(event.target as Node)) {
        setShowImagePicker(false);
        setImageUrl("");
      }
    };

    if (showImagePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImagePicker]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);

    try {
      const capRes = await fetch(`/api/cap/comments/${encodeURIComponent(postId)}`, { method: "POST" });
      if (capRes.status === 401) { setError("Please log in to comment."); return; }
      if (!capRes.ok) { setError(`Couldn't get permission (status ${capRes.status}).`); return; }
      const { token } = await capRes.json();

      const res = await csrfFetch(`/api/comments/${encodeURIComponent(postId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, cap: token, parentId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || `Failed (status ${res.status}).`); return; }

      setContent("");
      if (data?.comment) onCommentAdded?.(data.comment as CommentWire);
      else onCommentAdded?.({ 
        id: crypto.randomUUID(), 
        content: text, 
        parentId,
        createdAt: new Date().toISOString()
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="comment-form flex flex-col gap-2">
      {/* Formatting toolbar */}
      <div className="formatting-toolbar flex flex-wrap gap-1 p-2 bg-gray-50 border border-gray-300 rounded-t">
        {formatActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.action}
            title={action.title}
            className="formatting-button px-2 py-1 text-xs border border-gray-400 bg-white hover:bg-gray-100 rounded font-mono"
          >
            {action.icon}
          </button>
        ))}
        
        {/* Emoji Picker */}
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />

        {/* Image Picker */}
        <div className="relative" ref={imagePickerRef}>
          <button
            type="button"
            onClick={() => setShowImagePicker(!showImagePicker)}
            title="Add image"
            disabled={uploadingImage || loading}
            className="formatting-button px-2 py-1 text-xs border border-gray-400 bg-white hover:bg-gray-100 rounded font-mono disabled:opacity-50"
          >
            {uploadingImage ? `${uploadProgress}%` : '📷'}
          </button>

          {showImagePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 w-64">
              <div className="p-2 border-b border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">Image URL</div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleInsertImageUrl();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleInsertImageUrl}
                    disabled={!imageUrl.trim()}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowImagePicker(false);
                  }}
                  className="w-full text-xs px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded text-left flex items-center gap-2"
                >
                  <span>📤</span>
                  <span>Upload from device</span>
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          title="Formatting help"
          className="formatting-help-button px-2 py-1 text-xs border border-gray-400 bg-blue-50 hover:bg-blue-100 rounded ml-auto"
        >
          ?
        </button>
      </div>

      {/* Help text */}
      {showHelp && (
        <div className="formatting-help text-xs bg-blue-50 border border-blue-200 rounded p-3">
          <div className="font-medium mb-2">Formatting options:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-gray-700">
            <div><code>**bold text**</code> → <strong>bold text</strong></div>
            <div><code>*italic text*</code> → <em>italic text</em></div>
            <div><code>~~strikethrough~~</code> → <del className="line-through">strikethrough</del></div>
            <div><code>`code`</code> → <code className="bg-gray-100 px-1 rounded text-red-600">code</code></div>
            <div><code>[link text](url)</code> → <a href="#" className="text-blue-600 underline">link text</a></div>
            <div><code>&gt; quote text</code> → blockquote</div>
            <div><code>- list item</code> → • list item</div>
            <div><code>1. numbered</code> → 1. numbered</div>
          </div>
          <div className="mt-2 text-gray-600">
            Tip: Drag & drop images or click 📷 to upload
          </div>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          className={`comment-form-textarea border border-black md:border-black p-2 md:p-2 bg-white rounded-b w-full ${
            isDragging ? 'border-green-500 bg-green-50' : ''
          }`}
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          disabled={loading || uploadingImage}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />

        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-green-100 border-2 border-green-500 rounded-lg p-2 shadow-lg">
              <p className="text-green-800 font-medium text-xs">Drop image to upload</p>
            </div>
          </div>
        )}

        {uploadingImage && (
          <div className="absolute bottom-2 right-2 bg-white border border-black rounded p-2 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-3 w-3 border-2 border-gray-300 border-t-black rounded-full"></div>
              <span className="text-xs font-medium">Uploading... {uploadProgress}%</span>
            </div>
            <div className="mt-1 w-24 bg-gray-200 rounded-full h-1">
              <div
                className="bg-green-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      <div className="comment-form-actions flex gap-2 items-center">
        <button
          type="submit"
          disabled={disabled}
          className="comment-submit-button border border-black md:border-black px-3 py-1 md:px-3 md:py-1 bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000] disabled:opacity-60"
          aria-busy={loading}
        >
          {loading ? "Posting…" : "Post Comment"}
        </button>
        {error && <span className="comment-error text-red-700 text-sm">{error}</span>}
      </div>
    </form>
  );
}
