import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import RetroCard from "@/components/RetroCard";
import { useMe } from "@/hooks/useMe";

type User = {
  id: string;
  did: string;
  role: string;
  createdAt: string;
  displayName: string | null;
  primaryHandle: string | null;
  handles: string[];
  postCount: number;
  commentCount: number;
};

type SiteConfig = {
  site_name: string;
  site_tagline: string;
  user_status_text: string;
  welcome_message: string;
  directory_title: string;
  directory_empty_message: string;
  feed_empty_message: string;
  footer_text: string;
  welcome_dialog_title: string;
  guestbook_prompt: string;
  site_description: string;
};

export default function AdminPage() {
  const { me, isLoading } = useMe();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  useEffect(() => {
    if (me?.loggedIn && me.user?.role === "admin") {
      loadUsers();
      loadSiteConfig();
    }
  }, [me]);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function generateBetaKey() {
    setGeneratingKey(true);
    try {
      const res = await fetch("/api/admin/generate-beta-key", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.key);
      } else {
        alert("Failed to generate beta key");
      }
    } catch (error) {
      console.error("Failed to generate beta key:", error);
      alert("Failed to generate beta key");
    } finally {
      setGeneratingKey(false);
    }
  }

  async function deleteUser(userId: string, displayName: string | null) {
    const confirmMessage = `Are you sure you want to delete user "${displayName || 'Unknown'}"? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    setDeletingUserId(userId);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        alert("User deleted successfully");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  }

  async function loadSiteConfig() {
    setLoadingConfig(true);
    try {
      const res = await fetch("/api/admin/site-config");
      if (res.ok) {
        const data = await res.json();
        setSiteConfig(data.config);
      }
    } catch (error) {
      console.error("Failed to load site config:", error);
      setConfigMessage("Failed to load site configuration");
    } finally {
      setLoadingConfig(false);
    }
  }

  async function saveSiteConfig() {
    if (!siteConfig) return;
    
    setSavingConfig(true);
    setConfigMessage(null);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: siteConfig }),
      });

      if (res.ok) {
        const data = await res.json();
        setSiteConfig(data.config);
        setConfigMessage("✅ Site configuration saved successfully!");
        setTimeout(() => setConfigMessage(null), 3000);
      } else {
        const error = await res.json();
        setConfigMessage(`❌ ${error.error || "Failed to save configuration"}`);
      }
    } catch (error) {
      console.error("Failed to save site config:", error);
      setConfigMessage("❌ Failed to save site configuration");
    } finally {
      setSavingConfig(false);
    }
  }

  function updateConfigField(key: keyof SiteConfig, value: string) {
    if (!siteConfig) return;
    setSiteConfig({
      ...siteConfig,
      [key]: value,
    });
  }

  if (isLoading) {
    return <Layout><div>Loading...</div></Layout>;
  }

  if (!me?.loggedIn || me.user?.role !== "admin") {
    return (
      <Layout>
        <RetroCard title="Access Denied">
          <p>You need admin privileges to access this page.</p>
        </RetroCard>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <RetroCard title="Admin Dashboard">
          <p>Welcome to the admin panel. Here you can manage users and generate beta keys.</p>
        </RetroCard>

        <RetroCard title="Beta Key Management">
          <div className="space-y-3">
            <button
              onClick={generateBetaKey}
              disabled={generatingKey}
              className="border border-black px-3 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
            >
              {generatingKey ? "Generating..." : "Generate New Beta Key"}
            </button>
            
            {generatedKey && (
              <div className="p-3 border border-black bg-yellow-100">
                <strong>New Beta Key:</strong>
                <div className="font-mono text-sm mt-1 p-2 bg-white border border-gray-300">
                  {generatedKey}
                </div>
                <p className="text-xs mt-1 text-gray-600">
                  Save this key - it won&apos;t be shown again!
                </p>
              </div>
            )}
          </div>
        </RetroCard>

        <RetroCard title="Site Configuration">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Customize your site&apos;s branding and messaging. Changes will appear site-wide.
            </p>
            
            {loadingConfig ? (
              <div>Loading configuration...</div>
            ) : siteConfig ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Site Name</label>
                    <input
                      type="text"
                      className="w-full border border-black p-2 bg-white text-sm"
                      value={siteConfig.site_name}
                      onChange={(e) => updateConfigField("site_name", e.target.value)}
                      placeholder="ThreadStead"
                    />
                    <p className="text-xs text-gray-500 mt-1">Main site name in header</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Site Tagline</label>
                    <input
                      type="text"
                      className="w-full border border-black p-2 bg-white text-sm"
                      value={siteConfig.site_tagline}
                      onChange={(e) => updateConfigField("site_tagline", e.target.value)}
                      placeholder="@ ThreadStead"
                    />
                    <p className="text-xs text-gray-500 mt-1">Appears under site name</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">User Status Text</label>
                    <input
                      type="text"
                      className="w-full border border-black p-2 bg-white text-sm"
                      value={siteConfig.user_status_text}
                      onChange={(e) => updateConfigField("user_status_text", e.target.value)}
                      placeholder="threadstead resident"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default status on user profiles</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Welcome Message</label>
                    <input
                      type="text"
                      className="w-full border border-black p-2 bg-white text-sm"
                      value={siteConfig.welcome_message}
                      onChange={(e) => updateConfigField("welcome_message", e.target.value)}
                      placeholder="Welcome to ThreadStead"
                    />
                    <p className="text-xs text-gray-500 mt-1">Main page headline</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Directory Title</label>
                    <input
                      type="text"
                      className="w-full border border-black p-2 bg-white text-sm"
                      value={siteConfig.directory_title}
                      onChange={(e) => updateConfigField("directory_title", e.target.value)}
                      placeholder="ThreadStead Directory"
                    />
                    <p className="text-xs text-gray-500 mt-1">User directory page title</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Footer Text</label>
                    <input
                      type="text"
                      className="w-full border border-black p-2 bg-white text-sm"
                      value={siteConfig.footer_text}
                      onChange={(e) => updateConfigField("footer_text", e.target.value)}
                      placeholder="ThreadStead"
                    />
                    <p className="text-xs text-gray-500 mt-1">Copyright text in footer</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Directory Empty Message</label>
                    <textarea
                      className="w-full border border-black p-2 bg-white text-sm"
                      rows={2}
                      value={siteConfig.directory_empty_message}
                      onChange={(e) => updateConfigField("directory_empty_message", e.target.value)}
                      placeholder="No residents have joined ThreadStead yet. Be the first!"
                    />
                    <p className="text-xs text-gray-500 mt-1">Shown when no users exist</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Feed Empty Message</label>
                    <textarea
                      className="w-full border border-black p-2 bg-white text-sm"
                      rows={2}
                      value={siteConfig.feed_empty_message}
                      onChange={(e) => updateConfigField("feed_empty_message", e.target.value)}
                      placeholder="Be the first to share something on ThreadStead!"
                    />
                    <p className="text-xs text-gray-500 mt-1">Shown when feed is empty</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Welcome Dialog Title</label>
                    <input
                      type="text"
                      className="w-full border border-black p-2 bg-white text-sm"
                      value={siteConfig.welcome_dialog_title}
                      onChange={(e) => updateConfigField("welcome_dialog_title", e.target.value)}
                      placeholder="🎉 Welcome to Retro Social!"
                    />
                    <p className="text-xs text-gray-500 mt-1">Title for first-time user dialog</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Guestbook Prompt</label>
                    <input
                      type="text"
                      className="w-full border border-black p-2 bg-white text-sm"
                      value={siteConfig.guestbook_prompt}
                      onChange={(e) => updateConfigField("guestbook_prompt", e.target.value)}
                      placeholder="Share a friendly thought or memory…"
                    />
                    <p className="text-xs text-gray-500 mt-1">Placeholder text for guestbook messages</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Site Description</label>
                    <textarea
                      className="w-full border border-black p-2 bg-white text-sm"
                      rows={2}
                      value={siteConfig.site_description}
                      onChange={(e) => updateConfigField("site_description", e.target.value)}
                      placeholder="A cozy corner of the internet for thoughtful conversations and creative expression."
                    />
                    <p className="text-xs text-gray-500 mt-1">General site description for meta tags</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={saveSiteConfig}
                    disabled={savingConfig}
                    className="border border-black px-4 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
                  >
                    {savingConfig ? "Saving..." : "Save Configuration"}
                  </button>
                  {configMessage && (
                    <span className="text-sm">{configMessage}</span>
                  )}
                </div>
              </div>
            ) : (
              <div>Failed to load configuration</div>
            )}
          </div>
        </RetroCard>

        <RetroCard title="User Management">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Users ({users.length})</h3>
              <button
                onClick={loadUsers}
                disabled={loadingUsers}
                className="border border-black px-2 py-1 bg-blue-200 hover:bg-blue-100 shadow-[1px_1px_0_#000] text-sm disabled:opacity-50"
              >
                {loadingUsers ? "Loading..." : "Refresh"}
              </button>
            </div>

            {loadingUsers ? (
              <div>Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-black text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left">User</th>
                      <th className="border border-black p-2 text-left">Handle</th>
                      <th className="border border-black p-2 text-left">Role</th>
                      <th className="border border-black p-2 text-left">Posts</th>
                      <th className="border border-black p-2 text-left">Comments</th>
                      <th className="border border-black p-2 text-left">Joined</th>
                      <th className="border border-black p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="border border-black p-2">
                          {user.displayName || "No display name"}
                        </td>
                        <td className="border border-black p-2">
                          {user.primaryHandle || user.handles[0] || "No handle"}
                        </td>
                        <td className="border border-black p-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            user.role === "admin" 
                              ? "bg-red-200 text-red-800" 
                              : "bg-blue-200 text-blue-800"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="border border-black p-2">{user.postCount}</td>
                        <td className="border border-black p-2">{user.commentCount}</td>
                        <td className="border border-black p-2">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="border border-black p-2">
                          {user.role !== "admin" && (
                            <button
                              onClick={() => deleteUser(user.id, user.displayName)}
                              disabled={deletingUserId === user.id}
                              className="border border-black px-2 py-1 bg-red-200 hover:bg-red-100 shadow-[1px_1px_0_#000] text-xs disabled:opacity-50"
                            >
                              {deletingUserId === user.id ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </RetroCard>
      </div>
    </Layout>
  );
}