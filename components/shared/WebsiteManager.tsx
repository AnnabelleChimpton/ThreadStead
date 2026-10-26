import React, { useState } from "react";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { isHttpUrl } from "@/lib/utils/validation/url";

export interface Website {
  id: string;
  label: string;
  url: string;
  blurb?: string;
  /** "This is my site": the Indie Index lists it as this resident's own. */
  mine?: boolean;
}

interface WebsiteManagerProps {
  websites: Website[];
  onChange: (websites: Website[]) => void;
  maxWebsites?: number;
}

export default function WebsiteManager({ 
  websites, 
  onChange, 
  maxWebsites = 10 
}: WebsiteManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function addWebsite() {
    const newWebsite: Website = {
      id: Date.now().toString(),
      label: "",
      url: "",
      blurb: ""
    };
    onChange([...websites, newWebsite]);
    setEditingId(newWebsite.id);
  }

  function updateWebsite(id: string, updates: Partial<Website>) {
    onChange(websites.map(w => w.id === id ? { ...w, ...updates } : w));
  }

  function deleteWebsite(id: string) {
    onChange(websites.filter(w => w.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const newWebsites = [...websites];
    [newWebsites[index - 1], newWebsites[index]] = [newWebsites[index], newWebsites[index - 1]];
    onChange(newWebsites);
  }

  function moveDown(index: number) {
    if (index === websites.length - 1) return;
    const newWebsites = [...websites];
    [newWebsites[index], newWebsites[index + 1]] = [newWebsites[index + 1], newWebsites[index]];
    onChange(newWebsites);
  }


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Website Recommendations</h3>
        <button
          onClick={addWebsite}
          disabled={websites.length >= maxWebsites}
          className="thread-button btn btn--primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Website
        </button>
      </div>

      {websites.length === 0 ? (
        <div className="text-center py-8 text-nb-ink-mid border border-nb-ink-mid/40 bg-nb-ink-mid/5">
          <p>No websites added yet.</p>
          <p className="text-sm">Click &ldquo;Add Website&rdquo; to share your favorite links!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {websites.map((website, index) => (
            <div
              key={website.id}
              className="border-2 border-nb-ink-mid bg-white p-4 shadow-nb-sm"
            >
              {editingId === website.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Website Name</label>
                      <input
                        type="text"
                        value={website.label}
                        onChange={(e) => updateWebsite(website.id, { label: e.target.value })}
                        placeholder="e.g., Cool Blog, My Portfolio"
                        className="border-2 border-nb-ink-mid p-2 bg-white w-full"
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">URL</label>
                      <input
                        type="url"
                        value={website.url}
                        onChange={(e) => updateWebsite(website.id, { url: e.target.value })}
                        placeholder="https://example.com"
                        className={`border border-nb-ink-mid p-2 bg-white w-full ${
                          website.url && !isHttpUrl(website.url) ? 'border-red-500' : ''
                        }`}
                      />
                      {website.url && !isHttpUrl(website.url) && (
                        <p className="text-red-600 text-xs mt-1">A web address starting with https:// or http://</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description (optional)</label>
                    <textarea
                      value={website.blurb || ""}
                      onChange={(e) => updateWebsite(website.id, { blurb: e.target.value })}
                      placeholder="A short description of this website..."
                      className="border-2 border-nb-ink-mid p-2 bg-white w-full resize-none"
                      rows={2}
                      maxLength={200}
                    />
                    <div className="text-xs text-nb-ink-mid mt-1">
                      {(website.blurb || "").length}/200 characters
                    </div>
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!website.mine}
                      onChange={(e) => updateWebsite(website.id, { mine: e.target.checked })}
                      className="mt-1"
                    />
                    <span>
                      This is my site
                      <span className="block text-xs text-nb-ink-mid">
                        Your page links back to it as yours. That&apos;s what Mastodon checks before it shows your page
                        with a verified tick. It also goes in the Indie Index, where search can find your posts.
                      </span>
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      disabled={!website.label.trim() || !website.url.trim() || !isHttpUrl(website.url)}
                      className="thread-button btn btn--primary text-sm disabled:opacity-50"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => deleteWebsite(website.id)}
                      className="thread-button-secondary btn btn--secondary text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-nb-ink hover:text-nb-ink">
                        <a 
                          href={website.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {website.label || "Untitled"}
                        </a>
                      </h4>
                      <span className="text-xs text-nb-ink-mid">
                        {website.url}
                      </span>
                      {website.mine && (
                        <span className="text-xs font-semibold text-nb-ink border border-nb-ink-mid/50 rounded px-1">My site</span>
                      )}
                    </div>
                    {website.blurb && (
                      <p className="text-sm text-nb-ink">{website.blurb}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="thread-button-secondary btn btn--secondary text-xs disabled:opacity-50"
                      title="Move up"
                      aria-label={`Move ${website.label || website.url} up`}
                    >
                      <PixelIcon name="arrow-up" size={12} />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === websites.length - 1}
                      className="thread-button-secondary btn btn--secondary text-xs disabled:opacity-50"
                      title="Move down"
                      aria-label={`Move ${website.label || website.url} down`}
                    >
                      <PixelIcon name="arrow-down" size={12} />
                    </button>
                    <button
                      onClick={() => setEditingId(website.id)}
                      className="thread-button-secondary btn btn--secondary text-xs"
                      title="Edit"
                      aria-label={`Edit ${website.label || website.url}`}
                    >
                      <PixelIcon name="edit" size={12} />
                    </button>
                    <button
                      onClick={() => deleteWebsite(website.id)}
                      className="thread-button-secondary btn btn--secondary text-xs"
                      title="Delete"
                      aria-label={`Delete ${website.label || website.url}`}
                    >
                      <PixelIcon name="close" size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-nb-ink-mid">
        <p>• Add up to {maxWebsites} websites</p>
        <p>• Use the arrow buttons to reorder them</p>
        <p>• Descriptions are optional but help visitors understand what each site is about</p>
      </div>
    </div>
  );
}