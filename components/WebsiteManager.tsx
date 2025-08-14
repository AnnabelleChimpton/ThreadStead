import React, { useState } from "react";

export interface Website {
  id: string;
  label: string;
  url: string;
  blurb?: string;
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

  function isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Website Recommendations</h3>
        <button
          onClick={addWebsite}
          disabled={websites.length >= maxWebsites}
          className="border border-black px-3 py-1 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Website
        </button>
      </div>

      {websites.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-gray-300 bg-gray-50">
          <p>No websites added yet.</p>
          <p className="text-sm">Click &ldquo;Add Website&rdquo; to share your favorite links!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {websites.map((website, index) => (
            <div
              key={website.id}
              className="border border-black bg-white p-4 shadow-[2px_2px_0_#000]"
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
                        className="border border-black p-2 bg-white w-full"
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
                        className={`border border-black p-2 bg-white w-full ${
                          website.url && !isValidUrl(website.url) ? 'border-red-500' : ''
                        }`}
                      />
                      {website.url && !isValidUrl(website.url) && (
                        <p className="text-red-600 text-xs mt-1">Please enter a valid URL</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description (optional)</label>
                    <textarea
                      value={website.blurb || ""}
                      onChange={(e) => updateWebsite(website.id, { blurb: e.target.value })}
                      placeholder="A short description of this website..."
                      className="border border-black p-2 bg-white w-full resize-none"
                      rows={2}
                      maxLength={200}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {(website.blurb || "").length}/200 characters
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      disabled={!website.label.trim() || !website.url.trim() || !isValidUrl(website.url)}
                      className="border border-black px-3 py-1 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] text-sm disabled:opacity-50"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => deleteWebsite(website.id)}
                      className="border border-black px-3 py-1 bg-red-200 hover:bg-red-100 shadow-[2px_2px_0_#000] text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-blue-600 hover:text-blue-800">
                        <a 
                          href={website.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {website.label || "Untitled"}
                        </a>
                      </h4>
                      <span className="text-xs text-gray-500">
                        {website.url}
                      </span>
                    </div>
                    {website.blurb && (
                      <p className="text-sm text-gray-700">{website.blurb}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="border border-black px-2 py-1 bg-gray-200 hover:bg-gray-100 shadow-[1px_1px_0_#000] text-xs disabled:opacity-50"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === websites.length - 1}
                      className="border border-black px-2 py-1 bg-gray-200 hover:bg-gray-100 shadow-[1px_1px_0_#000] text-xs disabled:opacity-50"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => setEditingId(website.id)}
                      className="border border-black px-2 py-1 bg-blue-200 hover:bg-blue-100 shadow-[1px_1px_0_#000] text-xs"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => deleteWebsite(website.id)}
                      className="border border-black px-2 py-1 bg-red-200 hover:bg-red-100 shadow-[1px_1px_0_#000] text-xs"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-600">
        <p>• Add up to {maxWebsites} websites</p>
        <p>• Use the ↑↓ buttons to reorder them</p>
        <p>• Descriptions are optional but help visitors understand what each site is about</p>
      </div>
    </div>
  );
}