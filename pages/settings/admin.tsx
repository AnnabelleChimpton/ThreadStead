import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import RetroCard from "@/components/layout/RetroCard";
import { useMe } from "@/hooks/useMe";
import { getSiteTemplate, SITE_TEMPLATE_INFO } from "@/lib/site-css-templates";
import { getDefaultProfileTemplate, DEFAULT_PROFILE_TEMPLATE_INFO } from "@/lib/default-profile-templates";

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false,
  icon = "📋"
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  icon?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <RetroCard title="">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 border border-black bg-gray-100 hover:bg-gray-50 shadow-[2px_2px_0_#000] mb-4"
      >
        <span className="font-bold text-left flex items-center gap-2">
          {icon} {title}
        </span>
        <span className="text-lg font-mono">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </RetroCard>
  );
}

// Page Form Component
function PageForm({ 
  page, 
  onSave, 
  onCancel,
  saving = false
}: { 
  page: CustomPage | null; 
  onSave: (pageData: Partial<CustomPage>) => void; 
  onCancel: () => void; 
  saving?: boolean;
}) {
  const [formData, setFormData] = useState({
    slug: page?.slug || "",
    title: page?.title || "",
    content: page?.content || "",
    published: page?.published || false,
    showInNav: page?.showInNav || false,
    navOrder: page?.navOrder || 0,
    navDropdown: page?.navDropdown || null,
    hideNavbar: page?.hideNavbar || false,
    isHomepage: page?.isHomepage || false,
  });

  // Update form data when page prop changes
  useEffect(() => {
    setFormData({
      slug: page?.slug || "",
      title: page?.title || "",
      content: page?.content || "",
      published: page?.published || false,
      showInNav: page?.showInNav || false,
      navOrder: page?.navOrder || 0,
      navDropdown: page?.navDropdown || null,
      hideNavbar: page?.hideNavbar || false,
      isHomepage: page?.isHomepage || false,
    });
  }, [page]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.slug || !formData.title) {
      alert("Slug and title are required");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="border border-black p-4 bg-yellow-50">
      <h4 className="font-bold mb-3">{page ? "Edit Page" : "Create New Page"}</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Slug (URL)</label>
            <input
              type="text"
              className="w-full border border-black p-2 bg-white text-sm"
              value={formData.slug}
              onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")})}
              placeholder="about"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Letters, numbers, and hyphens only</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              className="w-full border border-black p-2 bg-white text-sm"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="About Us"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Content (HTML)</label>
          <textarea
            className="w-full border border-black p-2 bg-white text-sm font-mono"
            rows={12}
            value={formData.content}
            onChange={(e) => setFormData({...formData, content: e.target.value})}
            placeholder="<div style='min-height: 100vh; padding: 2rem; background: linear-gradient(45deg, #ff6b6b, #4ecdc4);'>
  <h1 style='color: white; text-align: center; font-size: 3rem;'>Welcome</h1>
  <p style='color: white; text-align: center;'>You have complete control over this page!</p>
</div>"
          />
          <div className="text-xs text-gray-600 mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="font-medium mb-2">🎨 Full Creative Control:</p>
            <ul className="space-y-1">
              <li>• Use any HTML, CSS, and inline styles</li>
              <li>• Create custom layouts, colors, and backgrounds</li>
              <li>• Toggle navbar visibility for full-screen experiences</li>
              <li>• Footer stays at the bottom of the page regardless of content height</li>
              <li>• No post-style containers - complete design freedom!</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({...formData, published: e.target.checked})}
              />
              <span className="text-sm">Published</span>
            </label>
            <p className="text-xs text-gray-500">Make page publicly accessible</p>
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.showInNav}
                onChange={(e) => setFormData({...formData, showInNav: e.target.checked})}
              />
              <span className="text-sm">Show in Navigation</span>
            </label>
            <p className="text-xs text-gray-500">Add to main navigation menu</p>
            
            {formData.showInNav && (
              <div className="mt-2 ml-6">
                <label className="block text-sm font-medium mb-1">Navigation Placement</label>
                <select
                  value={formData.navDropdown || ''}
                  onChange={(e) => setFormData({...formData, navDropdown: e.target.value || null})}
                  className="w-full px-2 py-1 border border-black"
                >
                  <option value="">Top Level (no dropdown)</option>
                  <option value="discovery">Discovery Dropdown</option>
                  <option value="help">Help Dropdown</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Choose where this page appears in the navigation</p>
              </div>
            )}
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.hideNavbar}
                onChange={(e) => setFormData({...formData, hideNavbar: e.target.checked})}
              />
              <span className="text-sm">Hide Navigation Bar</span>
            </label>
            <p className="text-xs text-gray-500">Remove navbar for full-screen design</p>
          </div>
          
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isHomepage}
                onChange={(e) => setFormData({...formData, isHomepage: e.target.checked})}
              />
              <span className="text-sm font-bold text-orange-700">🏠 Use as Homepage</span>
            </label>
            <p className="text-xs text-gray-500">Override the default homepage with this page</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Nav Order</label>
            <input
              type="number"
              className="w-full border border-black p-2 bg-white text-sm"
              value={formData.navOrder}
              onChange={(e) => setFormData({...formData, navOrder: parseInt(e.target.value) || 0})}
              min="0"
            />
            <p className="text-xs text-gray-500">Lower numbers appear first</p>
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="border border-black px-4 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : (page ? "Update Page" : "Create Page")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="border border-black px-4 py-2 bg-gray-200 hover:bg-gray-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

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

type CustomPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  published: boolean;
  showInNav: boolean;
  navOrder: number;
  navDropdown: string | null;
  hideNavbar: boolean;
  isHomepage: boolean;
  createdAt: string;
  updatedAt: string;
};

type PolicyDocuments = {
  terms_simple: string;
  terms_full: string;
  privacy_simple: string;
  privacy_full: string;
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
  
  // Custom pages state
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [editingPage, setEditingPage] = useState<CustomPage | null>(null);
  const [showPageForm, setShowPageForm] = useState(false);
  const [savingPage, setSavingPage] = useState(false);
  
  // Site CSS state
  const [siteCSS, setSiteCSS] = useState("");
  const [loadingCSS, setLoadingCSS] = useState(false);
  const [savingCSS, setSavingCSS] = useState(false);
  const [cssMessage, setCSSMessage] = useState<string | null>(null);
  const [showCSSTemplates, setShowCSSTemplates] = useState(false);
  
  // Default homepage state
  const [disableDefaultHome, setDisableDefaultHome] = useState(false);
  const [loadingHomeSetting, setLoadingHomeSetting] = useState(false);
  const [savingHomeSetting, setSavingHomeSetting] = useState(false);
  const [homeMessage, setHomeMessage] = useState<string | null>(null);
  
  // Default profile CSS state
  const [defaultProfileCSS, setDefaultProfileCSS] = useState("");
  const [loadingDefaultProfileCSS, setLoadingDefaultProfileCSS] = useState(false);
  const [savingDefaultProfileCSS, setSavingDefaultProfileCSS] = useState(false);
  const [defaultProfileMessage, setDefaultProfileMessage] = useState<string | null>(null);
  const [showDefaultProfileTemplates, setShowDefaultProfileTemplates] = useState(false);
  
  // Seed phrase generation state
  const [generatedSeedPhrase, setGeneratedSeedPhrase] = useState<string | null>(null);
  const [generatedSeedUser, setGeneratedSeedUser] = useState<{id: string, displayName: string | null, primaryHandle: string | null} | null>(null);
  const [generatingSeed, setGeneratingSeed] = useState<string | null>(null);

  // Policy documents state
  const [policies, setPolicies] = useState<PolicyDocuments | null>(null);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [savingPolicies, setSavingPolicies] = useState(false);
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (me?.loggedIn && me.user?.role === "admin") {
      loadUsers();
      loadSiteConfig();
      loadCustomPages();
      loadSiteCSS();
      loadHomeSetting();
      loadDefaultProfileCSS();
      loadPolicies();
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

  async function loadCustomPages() {
    setLoadingPages(true);
    try {
      const res = await fetch("/api/admin/custom-pages");
      if (res.ok) {
        const data = await res.json();
        setCustomPages(data.pages);
      }
    } catch (error) {
      console.error("Failed to load custom pages:", error);
    } finally {
      setLoadingPages(false);
    }
  }

  async function saveCustomPage(pageData: Partial<CustomPage>) {
    if (savingPage) return; // Prevent multiple submissions
    
    setSavingPage(true);
    try {
      const url = editingPage 
        ? `/api/admin/custom-pages/${editingPage.id}`
        : "/api/admin/custom-pages";
      const method = editingPage ? "PUT" : "POST";
      
      // Saving page data
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(pageData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      // Response received

      if (res.ok) {
        await loadCustomPages();
        setEditingPage(null);
        setShowPageForm(false);
        alert(editingPage ? "Page updated successfully" : "Page created successfully");
      } else {
        let errorMessage;
        try {
          const error = await res.json();
          errorMessage = error.error || `Failed to save page (${res.status})`;
        } catch (jsonError) {
          const errorText = await res.text();
          errorMessage = `Failed to save page (${res.status}): ${errorText || 'Unknown error'}`;
        }
        console.error("Save failed with error:", errorMessage);
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Failed to save page:", error);
      alert(`Failed to save page: ${error instanceof Error ? error.message : 'Network or connection error'}`);
    } finally {
      setSavingPage(false);
    }
  }

  async function deleteCustomPage(pageId: string, title: string) {
    if (!confirm(`Are you sure you want to delete the page "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/custom-pages/${pageId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadCustomPages();
        alert("Page deleted successfully");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete page");
      }
    } catch (error) {
      console.error("Failed to delete page:", error);
      alert("Failed to delete page");
    }
  }

  async function loadSiteCSS() {
    setLoadingCSS(true);
    try {
      const res = await fetch("/api/admin/site-css");
      if (res.ok) {
        const data = await res.json();
        setSiteCSS(data.css);
      }
    } catch (error) {
      console.error("Failed to load site CSS:", error);
      setCSSMessage("Failed to load site CSS");
    } finally {
      setLoadingCSS(false);
    }
  }

  async function saveSiteCSS() {
    setSavingCSS(true);
    setCSSMessage(null);
    try {
      const res = await fetch("/api/admin/site-css", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ css: siteCSS }),
      });

      if (res.ok) {
        setCSSMessage("✅ Site CSS saved successfully! Refreshing...");
        // Auto-refresh the page to show the new styles immediately
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const error = await res.json();
        setCSSMessage(`❌ ${error.error || "Failed to save CSS"}`);
        setSavingCSS(false);
      }
    } catch (error) {
      console.error("Failed to save site CSS:", error);
      setCSSMessage("❌ Failed to save site CSS");
      setSavingCSS(false);
    }
    // Note: Don't set setSavingCSS(false) on success since we're refreshing
  }

  async function handleSiteTemplateSelect(type: 'default' | 'minimal' | 'dark' | 'colorful' | 'clear') {
    let newCSS = '';
    if (type !== 'clear') {
      newCSS = getSiteTemplate(type);
    }
    
    setSiteCSS(newCSS);
    setShowCSSTemplates(false);
    
    // Auto-save the template and refresh
    setSavingCSS(true);
    setCSSMessage("Applying template...");
    
    try {
      const res = await fetch("/api/admin/site-css", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ css: newCSS }),
      });

      if (res.ok) {
        setCSSMessage("✅ Template applied successfully! Refreshing...");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const error = await res.json();
        setCSSMessage(`❌ ${error.error || "Failed to apply template"}`);
        setSavingCSS(false);
      }
    } catch (error) {
      console.error("Failed to apply template:", error);
      setCSSMessage("❌ Failed to apply template");
      setSavingCSS(false);
    }
  }

  async function handleRestoreSiteDefault() {
    const confirmed = window.confirm(
      'This will replace your current CSS with the default template and refresh the page. Are you sure?'
    );
    if (confirmed) {
      const defaultCSS = getSiteTemplate('default');
      setSiteCSS(defaultCSS);
      
      // Auto-save and refresh
      setSavingCSS(true);
      setCSSMessage("Restoring default template...");
      
      try {
        const res = await fetch("/api/admin/site-css", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ css: defaultCSS }),
        });

        if (res.ok) {
          setCSSMessage("✅ Default template restored! Refreshing...");
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          const error = await res.json();
          setCSSMessage(`❌ ${error.error || "Failed to restore default"}`);
          setSavingCSS(false);
        }
      } catch (error) {
        console.error("Failed to restore default:", error);
        setCSSMessage("❌ Failed to restore default");
        setSavingCSS(false);
      }
    }
  }

  async function loadHomeSetting() {
    setLoadingHomeSetting(true);
    try {
      const res = await fetch("/api/admin/site-config");
      if (res.ok) {
        const data = await res.json();
        setDisableDefaultHome(data.config.disable_default_home === "true");
      }
    } catch (error) {
      console.error("Failed to load home setting:", error);
    } finally {
      setLoadingHomeSetting(false);
    }
  }

  async function saveHomeSetting() {
    setSavingHomeSetting(true);
    setHomeMessage(null);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          config: { 
            disable_default_home: disableDefaultHome ? "true" : "false" 
          } 
        }),
      });

      if (res.ok) {
        setHomeMessage("✅ Homepage setting saved successfully!");
        setTimeout(() => setHomeMessage(null), 3000);
      } else {
        const error = await res.json();
        setHomeMessage(`❌ ${error.error || "Failed to save setting"}`);
      }
    } catch (error) {
      console.error("Failed to save home setting:", error);
      setHomeMessage("❌ Failed to save homepage setting");
    } finally {
      setSavingHomeSetting(false);
    }
  }

  async function loadDefaultProfileCSS() {
    setLoadingDefaultProfileCSS(true);
    try {
      const res = await fetch("/api/admin/site-config");
      if (res.ok) {
        const data = await res.json();
        setDefaultProfileCSS(data.config.default_profile_css || "");
      }
    } catch (error) {
      console.error("Failed to load default profile CSS:", error);
    } finally {
      setLoadingDefaultProfileCSS(false);
    }
  }

  async function saveDefaultProfileCSS() {
    setSavingDefaultProfileCSS(true);
    setDefaultProfileMessage(null);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          config: { 
            default_profile_css: defaultProfileCSS 
          } 
        }),
      });

      if (res.ok) {
        setDefaultProfileMessage("✅ Default profile CSS saved successfully!");
        setTimeout(() => setDefaultProfileMessage(null), 3000);
      } else {
        const error = await res.json();
        setDefaultProfileMessage(`❌ ${error.error || "Failed to save CSS"}`);
      }
    } catch (error) {
      console.error("Failed to save default profile CSS:", error);
      setDefaultProfileMessage("❌ Failed to save default profile CSS");
    } finally {
      setSavingDefaultProfileCSS(false);
    }
  }

  async function handleDefaultProfileTemplateSelect(type: 'default' | 'minimal' | 'dark' | 'colorful' | 'clear') {
    const newCSS = getDefaultProfileTemplate(type);
    setDefaultProfileCSS(newCSS);
    setShowDefaultProfileTemplates(false);
    
    // Auto-save the template
    setSavingDefaultProfileCSS(true);
    setDefaultProfileMessage("Applying template...");
    
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          config: { 
            default_profile_css: newCSS 
          } 
        }),
      });

      if (res.ok) {
        setDefaultProfileMessage("✅ Template applied successfully!");
        setTimeout(() => setDefaultProfileMessage(null), 3000);
      } else {
        const error = await res.json();
        setDefaultProfileMessage(`❌ ${error.error || "Failed to apply template"}`);
      }
    } catch (error) {
      console.error("Failed to apply template:", error);
      setDefaultProfileMessage("❌ Failed to apply template");
    } finally {
      setSavingDefaultProfileCSS(false);
    }
  }

  async function generateSeedPhraseForUser(userId: string) {
    console.log("Generating seed phrase for user:", userId);
    setGeneratingSeed(userId);
    try {
      const res = await fetch("/api/admin/generate-user-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      console.log("API response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("API response data:", data);
        setGeneratedSeedPhrase(data.seedPhrase);
        setGeneratedSeedUser(data.user);
      } else {
        const error = await res.json();
        console.log("API error response:", error);
        alert(error.error || "Failed to generate seed phrase");
      }
    } catch (error) {
      console.error("Failed to generate seed phrase:", error);
      alert("Failed to generate seed phrase");
    } finally {
      setGeneratingSeed(null);
    }
  }

  async function loadPolicies() {
    setLoadingPolicies(true);
    try {
      const res = await fetch("/api/admin/policies");
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies);
      }
    } catch (error) {
      console.error("Failed to load policies:", error);
      setPolicyMessage("Failed to load policy documents");
    } finally {
      setLoadingPolicies(false);
    }
  }

  async function savePolicies() {
    if (!policies) return;
    
    setSavingPolicies(true);
    setPolicyMessage(null);
    try {
      const res = await fetch("/api/admin/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policies }),
      });

      if (res.ok) {
        setPolicyMessage("✅ Policy documents saved successfully!");
        setTimeout(() => setPolicyMessage(null), 3000);
      } else {
        const error = await res.json();
        setPolicyMessage(`❌ ${error.error || "Failed to save policies"}`);
      }
    } catch (error) {
      console.error("Failed to save policies:", error);
      setPolicyMessage("❌ Failed to save policy documents");
    } finally {
      setSavingPolicies(false);
    }
  }

  function updatePolicyField(key: keyof PolicyDocuments, value: string) {
    if (!policies) return;
    setPolicies({
      ...policies,
      [key]: value,
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    }).catch(() => {
      alert("Failed to copy to clipboard");
    });
  }

  function downloadSeedPhrase(phrase: string, userInfo: string) {
    const blob = new Blob([`Seed Phrase for ${userInfo}:\n\n${phrase}\n\nGenerated on: ${new Date().toLocaleString()}\n\nIMPORTANT: Keep this phrase secure and private.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seed-phrase-${userInfo.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          <p>Welcome to the admin panel. Manage your site&apos;s content, appearance, and users with the organized sections below.</p>
        </RetroCard>

        {/* CONTENT MANAGEMENT */}
        <CollapsibleSection title="Content Management" defaultOpen={false} icon="📝">
          
          {/* Custom Pages */}
          <div className="border border-gray-300 rounded p-4 bg-gray-50">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              📄 Custom Pages
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Create fully customizable pages with complete design freedom. Pages appear with navbar and footer but no containers - you control everything else! Published pages can be accessed at /page/[slug].
            </p>
            
            <div className="border border-blue-300 bg-blue-50 p-3 rounded mb-4">
              <h4 className="font-bold text-blue-800 mb-2">🏠 Homepage Control</h4>
              <p className="text-sm text-blue-700 mb-3">
                Create a custom page and check &quot;🏠 Use as Homepage&quot; to override the default homepage, or use the setting below to redirect visitors directly to /feed.
              </p>
              
              {loadingHomeSetting ? (
                <div className="text-sm">Loading homepage setting...</div>
              ) : (
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={disableDefaultHome}
                      onChange={(e) => setDisableDefaultHome(e.target.checked)}
                    />
                    <span className="text-sm font-medium">Disable default welcome page - redirect directly to /feed</span>
                  </label>
                  <p className="text-xs text-blue-600">
                    When enabled, visitors to your homepage will be redirected straight to the community feed instead of seeing a welcome page.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={saveHomeSetting}
                      disabled={savingHomeSetting}
                      className="border border-black px-3 py-1 bg-green-200 hover:bg-green-100 shadow-[1px_1px_0_#000] text-sm disabled:opacity-50"
                    >
                      {savingHomeSetting ? "Saving..." : "Save Homepage Setting"}
                    </button>
                    {homeMessage && (
                      <span className="text-sm">{homeMessage}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setEditingPage(null);
                  setShowPageForm(!showPageForm);
                }}
                className="border border-black px-3 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000]"
              >
                {showPageForm ? "Cancel" : "Add New Page"}
              </button>
              
              <button
                onClick={loadCustomPages}
                disabled={loadingPages}
                className="border border-black px-3 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
              >
                {loadingPages ? "Loading..." : "Refresh"}
              </button>
            </div>

            {(showPageForm || editingPage) && (
              <PageForm
                page={editingPage}
                onSave={saveCustomPage}
                saving={savingPage}
                onCancel={() => {
                  setEditingPage(null);
                  setShowPageForm(false);
                }}
              />
            )}

            {loadingPages ? (
              <div>Loading pages...</div>
            ) : (
              <div className="space-y-2">
                {customPages.length === 0 ? (
                  <p className="text-gray-500 italic">No custom pages created yet.</p>
                ) : (
                  customPages.map(page => (
                    <div key={page.id} className="border border-black p-3 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold">{page.title}</h4>
                          <p className="text-sm text-gray-600">/page/{page.slug}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded ${page.published ? 'bg-green-200' : 'bg-gray-200'}`}>
                              {page.published ? 'Published' : 'Draft'}
                            </span>
                            {page.showInNav && (
                              <span className="text-xs px-2 py-1 rounded bg-blue-200">
                                {page.navDropdown ? `In ${page.navDropdown} dropdown` : 'In Navigation'}
                              </span>
                            )}
                            {page.hideNavbar && (
                              <span className="text-xs px-2 py-1 rounded bg-purple-200">
                                No Navbar
                              </span>
                            )}
                            {page.isHomepage && (
                              <span className="text-xs px-2 py-1 rounded bg-orange-200 text-orange-800 font-bold">
                                🏠 Homepage
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingPage(page);
                              setShowPageForm(true);
                            }}
                            className="border border-black px-2 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[1px_1px_0_#000] text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCustomPage(page.id, page.title)}
                            className="border border-black px-2 py-1 bg-red-200 hover:bg-red-100 shadow-[1px_1px_0_#000] text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          {/* Site Configuration */}
          <div className="border border-gray-300 rounded p-4 bg-gray-50">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              ⚙️ Site Configuration
            </h3>
            <p className="text-sm text-gray-600 mb-4">
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
          
          {/* Policy Documents */}
          <div className="border border-gray-300 rounded p-4 bg-gray-50">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              📋 Terms & Privacy Policy
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Manage your site&apos;s Terms and Conditions and Privacy Policy. Users will see the simple versions during signup with links to the full versions. Both versions are required for legal compliance.
            </p>
            
            {loadingPolicies ? (
              <div>Loading policy documents...</div>
            ) : policies ? (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Terms of Service - Simple */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      📝 Terms of Service (Simple Version)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Brief, user-friendly version shown during signup. Keep it concise and accessible.
                    </p>
                    <textarea
                      className="w-full border border-black p-2 bg-white text-sm"
                      rows={4}
                      value={policies.terms_simple}
                      onChange={(e) => updatePolicyField("terms_simple", e.target.value)}
                      placeholder="By creating an account, you agree to use our platform respectfully..."
                    />
                  </div>

                  {/* Privacy Policy - Simple */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      🔒 Privacy Policy (Simple Version)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Brief, user-friendly version shown during signup. Explain data handling simply.
                    </p>
                    <textarea
                      className="w-full border border-black p-2 bg-white text-sm"
                      rows={4}
                      value={policies.privacy_simple}
                      onChange={(e) => updatePolicyField("privacy_simple", e.target.value)}
                      placeholder="We collect minimal personal information to provide our service..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Terms of Service - Full */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      📑 Terms of Service (Full Legal Version)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Complete legal document. Users can access this via a link from the simple version. Supports Markdown formatting.
                    </p>
                    <textarea
                      className="w-full border border-black p-2 bg-white text-sm font-mono"
                      rows={8}
                      value={policies.terms_full}
                      onChange={(e) => updatePolicyField("terms_full", e.target.value)}
                      placeholder="# Terms and Conditions

## 1. Acceptance of Terms
By creating an account on this platform..."
                    />
                  </div>

                  {/* Privacy Policy - Full */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      🔐 Privacy Policy (Full Legal Version)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Complete privacy policy. Users can access this via a link from the simple version. Supports Markdown formatting.
                    </p>
                    <textarea
                      className="w-full border border-black p-2 bg-white text-sm font-mono"
                      rows={8}
                      value={policies.privacy_full}
                      onChange={(e) => updatePolicyField("privacy_full", e.target.value)}
                      placeholder="# Privacy Policy

## 1. Information We Collect
We collect information you provide when creating an account..."
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={savePolicies}
                    disabled={savingPolicies}
                    className="border border-black px-4 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
                  >
                    {savingPolicies ? "Saving..." : "Save Policy Documents"}
                  </button>
                  {policyMessage && (
                    <span className="text-sm">{policyMessage}</span>
                  )}
                </div>

                <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="flex items-start gap-2">
                    <span>ℹ️</span>
                    <div>
                      <strong>How it works:</strong> During signup, users will see the simple versions with checkboxes to agree. 
                      Each simple version will include a link to &quot;Read the full version&quot; that opens the complete legal document. 
                      Both checkboxes must be checked before users can create an account.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>Failed to load policy documents</div>
            )}
          </div>
        </CollapsibleSection>

        {/* APPEARANCE & STYLING */}
        <CollapsibleSection title="Appearance & Styling" defaultOpen={false} icon="🎨">
          <div className="border border-gray-300 rounded p-4 bg-gray-50">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              🎨 Site-wide CSS
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add custom CSS that will be applied across the entire site. Use this to customize the look and feel beyond the built-in themes.
            </p>
            
            {/* Header with controls */}
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">
                🎨 Site CSS Editor
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCSSTemplates(!showCSSTemplates)}
                  className="px-3 py-1 text-xs border border-black bg-blue-200 hover:bg-blue-100 rounded shadow-[1px_1px_0_#000] transition-all"
                >
                  📚 Templates
                </button>
                <button
                  onClick={handleRestoreSiteDefault}
                  disabled={savingCSS}
                  className="px-3 py-1 text-xs border border-black bg-yellow-200 hover:bg-yellow-100 rounded shadow-[1px_1px_0_#000] transition-all disabled:opacity-50"
                >
                  🔄 Restore Default
                </button>
              </div>
            </div>

            {/* Templates dropdown */}
            {showCSSTemplates && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium">Choose a starting template:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.entries(SITE_TEMPLATE_INFO).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => handleSiteTemplateSelect(key as any)}
                      className="p-3 text-xs border border-gray-300 bg-white hover:bg-gray-50 rounded transition-all text-left"
                    >
                      <div className="font-semibold text-gray-800">{info.name}</div>
                      <div className="text-gray-600 mt-1">{info.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {loadingCSS ? (
              <div>Loading CSS...</div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    className="w-full border border-black p-3 bg-white text-sm font-mono"
                    rows={12}
                    value={siteCSS}
                    onChange={(e) => setSiteCSS(e.target.value)}
                    placeholder="/* Add your custom CSS here or use a template above! */
.custom-header {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
}

.retro-button:hover {
  transform: translateY(-1px);
}"
                  />
                  {/* Character count */}
                  <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {siteCSS.length} characters
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveSiteCSS}
                    disabled={savingCSS}
                    className="border border-black px-4 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
                  >
                    {savingCSS ? "Saving..." : "Save CSS"}
                  </button>
                  {cssMessage && (
                    <span className="text-sm">{cssMessage}</span>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">
                  <div className="flex items-start gap-2">
                    <span>💡</span>
                    <div>
                      <strong>Preview your changes:</strong> Save your CSS and refresh any page to see changes applied site-wide.
                      Changes take effect immediately after saving.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Default Profile CSS */}
          <div className="border border-gray-300 rounded p-4 bg-gray-50">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              👤 Default Profile CSS (Admin Only)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Set a default CSS theme for user profiles when they haven&apos;t customized their own. This provides visual cohesion while respecting user choice.
            </p>
            
            {loadingDefaultProfileCSS ? (
              <div>Loading default profile CSS...</div>
            ) : (
              <div className="space-y-3">
                {/* Header with template controls */}
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">
                    Default Profile CSS Editor
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDefaultProfileTemplates(!showDefaultProfileTemplates)}
                      className="px-3 py-1 text-xs border border-black bg-blue-200 hover:bg-blue-100 rounded shadow-[1px_1px_0_#000] transition-all"
                    >
                      📚 Templates
                    </button>
                  </div>
                </div>

                {/* Templates dropdown */}
                {showDefaultProfileTemplates && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-medium">Choose a default profile template:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(DEFAULT_PROFILE_TEMPLATE_INFO).map(([key, info]) => (
                        <button
                          key={key}
                          onClick={() => handleDefaultProfileTemplateSelect(key as any)}
                          className="p-3 text-xs border border-gray-300 bg-white hover:bg-gray-50 rounded transition-all text-left"
                        >
                          <div className="font-semibold text-gray-800">{info.name}</div>
                          <div className="text-gray-600 mt-1">{info.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="relative">
                  <textarea
                    className="w-full border border-black p-3 bg-white text-sm font-mono"
                    rows={8}
                    value={defaultProfileCSS}
                    onChange={(e) => setDefaultProfileCSS(e.target.value)}
                    placeholder="/* Default CSS for user profiles without custom styling */
.profile-container {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}

.profile-display-name {
  color: #2c3e50;
  font-family: Georgia, serif;
}"
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {defaultProfileCSS.length} characters
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveDefaultProfileCSS}
                    disabled={savingDefaultProfileCSS}
                    className="border border-black px-4 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
                  >
                    {savingDefaultProfileCSS ? "Saving..." : "Save Default Profile CSS"}
                  </button>
                  {defaultProfileMessage && (
                    <span className="text-sm">{defaultProfileMessage}</span>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="flex items-start gap-2">
                    <span>ℹ️</span>
                    <div>
                      <strong>How it works:</strong> Users without custom CSS will see this default styling. 
                      Once a user adds their own CSS, this default is completely overridden. 
                      This feature is admin-only and not accessible to regular users.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* USER & ACCESS MANAGEMENT */}
        <CollapsibleSection title="User & Access Management" defaultOpen={false} icon="👥">
          
          {/* Beta Key Management */}
          <div className="border border-gray-300 rounded p-4 bg-gray-50">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              🔑 Beta Key Management
            </h3>
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
          </div>
          
          {/* User Management */}
          <div className="border border-gray-300 rounded p-4 bg-gray-50">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              👤 User Management
            </h3>
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
                          <div className="flex gap-1">
                            <button
                              onClick={() => generateSeedPhraseForUser(user.id)}
                              disabled={generatingSeed === user.id}
                              className="border border-black px-2 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[1px_1px_0_#000] text-xs disabled:opacity-50"
                              title="Generate new seed phrase for user recovery"
                            >
                              {generatingSeed === user.id ? "Generating..." : "🔑 Seed"}
                            </button>
                            {user.role !== "admin" && (
                              <button
                                onClick={() => deleteUser(user.id, user.displayName)}
                                disabled={deletingUserId === user.id}
                                className="border border-black px-2 py-1 bg-red-200 hover:bg-red-100 shadow-[1px_1px_0_#000] text-xs disabled:opacity-50"
                              >
                                {deletingUserId === user.id ? "Deleting..." : "Delete"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Seed Phrase Modal */}
        {generatedSeedPhrase && generatedSeedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-2 border-black rounded-lg max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="text-center">
                <h2 className="font-bold text-xl mb-2">🔑 Generated Seed Phrase</h2>
                <p className="text-gray-600">
                  Recovery seed phrase for user: <strong>{generatedSeedUser.displayName || generatedSeedUser.primaryHandle || 'Unknown User'}</strong>
                </p>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                  <span>⚠️</span>
                  ADMIN SECURITY WARNING
                </h3>
                <p className="text-sm text-red-700 mb-2">
                  This seed phrase grants FULL ACCESS to the user&apos;s account and will immediately update their identity. Handle with extreme care:
                </p>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Only share this with the locked-out user through secure channels</li>
                  <li>• Do not store this phrase in plain text</li>
                  <li>• Verify user identity before providing access</li>
                  <li>• This phrase cannot be retrieved again</li>
                  <li>• <strong>User will be logged out of all existing sessions</strong></li>
                  <li>• <strong>Their old recovery phrase will no longer work</strong></li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <span>🔐</span>
                  12-Word Recovery Phrase
                </h3>
                <div className="bg-white border border-gray-300 rounded p-4 mb-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {generatedSeedPhrase.split(' ').map((word, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-100 rounded border text-sm">
                        <span className="text-xs text-gray-600 font-medium min-w-[20px]">{index + 1}.</span>
                        <span className="font-mono font-medium text-gray-800">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => copyToClipboard(generatedSeedPhrase)}
                    className="flex-1 px-4 py-2 text-sm bg-blue-200 border border-black hover:bg-blue-100 rounded shadow-[2px_2px_0_#000] transition-all flex items-center justify-center gap-2"
                  >
                    <span>📋</span>
                    Copy Seed Phrase
                  </button>
                  <button
                    onClick={() => downloadSeedPhrase(generatedSeedPhrase, generatedSeedUser.displayName || generatedSeedUser.primaryHandle || 'Unknown')}
                    className="flex-1 px-4 py-2 text-sm bg-green-200 border border-black hover:bg-green-100 rounded shadow-[2px_2px_0_#000] transition-all flex items-center justify-center gap-2"
                  >
                    <span>💾</span>
                    Download Backup
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => {
                      setGeneratedSeedPhrase(null);
                      setGeneratedSeedUser(null);
                    }}
                    className="bg-gray-300 hover:bg-gray-200 border border-black px-6 py-2 rounded shadow-[2px_2px_0_#000] transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}