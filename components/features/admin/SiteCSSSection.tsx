import React, { useEffect, useState } from "react";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { getSiteTemplate, SITE_TEMPLATE_INFO } from "@/lib/templates/site-css-templates";

type SiteTemplateType = keyof typeof SITE_TEMPLATE_INFO;

/**
 * What the site is serving right now:
 *  - default  no saved row; the bundled theme (styles/site-theme.default.css)
 *  - custom   saved CSS
 *  - off      a saved empty value; no site CSS at all
 */
export type SiteThemeMode = "default" | "custom" | "off";

export const EMPTY_SAVE_PROMPT = "This turns the site theme off. Use the default theme instead?";

const MODE_LABEL: Record<SiteThemeMode, string> = {
  default: "Default theme",
  custom: "Custom CSS",
  off: "Off",
};

const MODE_HINT: Record<SiteThemeMode, string> = {
  default: "The site uses the built-in theme. Saving here replaces it with your own copy.",
  custom: "The site uses the CSS saved below.",
  off: "The site has no theme, only base styles.",
};

function modeFrom(data: { css?: string; isDefault?: boolean }): SiteThemeMode {
  if (data.isDefault) return "default";
  return (data.css ?? "").trim() === "" ? "off" : "custom";
}

export default function SiteCSSSection({
  onApplied = () => window.location.reload(),
}: {
  /** Runs after a change is stored. Reloads so the new theme renders. */
  onApplied?: () => void;
}) {
  const [css, setCSS] = useState("");
  const [mode, setMode] = useState<SiteThemeMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  // CSS waiting on the "turn the theme off?" answer
  const [confirmingEmpty, setConfirmingEmpty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/site-css");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCSS(data.css ?? "");
        setMode(modeFrom(data));
      } catch (error) {
        console.error("Failed to load site CSS:", error);
        setMessage("Couldn't load site CSS.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function send(method: "PUT" | "DELETE", body: string | null, doneMessage: string) {
    setBusy(true);
    setMessage(null);
    setConfirmingEmpty(false);
    try {
      const res = await csrfFetch("/api/admin/site-css", {
        method,
        ...(body === null
          ? {}
          : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ css: body }) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(`Error: ${data.error || "Couldn't save site CSS"}`);
        setBusy(false);
        return;
      }
      setCSS(data.css ?? body ?? "");
      setMode(modeFrom(data));
      setMessage(`${doneMessage} Reloading…`);
      // Stay busy: the page is about to reload
      setTimeout(onApplied, 800);
    } catch (error) {
      console.error("Failed to save site CSS:", error);
      setMessage("Error: Couldn't save site CSS");
      setBusy(false);
    }
  }

  /** Saves CSS, but an empty value has to be confirmed first. */
  function save(value: string) {
    if (value.trim() === "") {
      setMessage(null);
      setConfirmingEmpty(true);
      return;
    }
    send("PUT", value, "Saved.");
  }

  function switchToDefault() {
    if (mode === "custom" && !window.confirm("Switch to the default theme? Your custom CSS will be removed.")) {
      return;
    }
    send("DELETE", null, "Switched to the default theme.");
  }

  function applyTemplate(type: SiteTemplateType) {
    const value = type === "clear" ? "" : getSiteTemplate(type);
    setCSS(value);
    setShowTemplates(false);
    save(value);
  }

  return (
    <div className="border border-gray-300 rounded p-4 bg-gray-50">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        <PixelIcon name="paint-bucket" /> Site-wide CSS
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        CSS applied across the whole site.
      </p>

      {mode && (
        <div className="mb-4 text-sm border border-gray-300 bg-white rounded p-3" data-testid="site-theme-status">
          <div>
            Site theme: <strong>{MODE_LABEL[mode]}</strong>
          </div>
          <div className="text-gray-600 mt-1">{MODE_HINT[mode]}</div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label htmlFor="site-css-editor" className="block text-sm font-medium">
          Site CSS
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            disabled={busy}
            className="px-3 py-1 text-xs border border-black bg-blue-200 hover:bg-blue-100 rounded shadow-[1px_1px_0_#000] transition-all disabled:opacity-50"
          >
            <PixelIcon name="script" className="inline-block align-middle" /> Templates
          </button>
          <button
            onClick={switchToDefault}
            disabled={busy || mode === "default"}
            className="px-3 py-1 text-xs border border-black bg-yellow-200 hover:bg-yellow-100 rounded shadow-[1px_1px_0_#000] transition-all disabled:opacity-50"
          >
            <PixelIcon name="reload" className="inline-block align-middle" /> Use the default theme
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3 mt-3">
          <h3 className="text-sm font-medium">Start from a template (saves right away):</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(Object.entries(SITE_TEMPLATE_INFO) as [SiteTemplateType, { name: string; description: string }][]).map(
              ([key, info]) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key)}
                  className="p-3 text-xs border border-gray-300 bg-white hover:bg-gray-50 rounded transition-all text-left"
                >
                  <div className="font-semibold text-gray-800">{info.name}</div>
                  <div className="text-gray-600 mt-1">{info.description}</div>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-3">Loading CSS…</div>
      ) : (
        <div className="space-y-3 mt-3">
          <div className="relative">
            <textarea
              id="site-css-editor"
              className="w-full border border-black p-3 bg-white text-sm font-mono"
              rows={12}
              value={css}
              onChange={(e) => setCSS(e.target.value)}
              placeholder="/* Empty. Saving this turns the site theme off. */"
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {css.length} characters
            </div>
          </div>

          {confirmingEmpty && (
            <div role="alertdialog" aria-label="Turn the site theme off?" className="border border-black bg-yellow-50 rounded p-3 space-y-3">
              <p className="text-sm">{EMPTY_SAVE_PROMPT}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => send("DELETE", null, "Switched to the default theme.")}
                  className="border border-black px-3 py-1 text-sm bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000]"
                >
                  Use the default theme
                </button>
                <button
                  onClick={() => send("PUT", "", "Site theme is off.")}
                  className="border border-black px-3 py-1 text-sm bg-white hover:bg-gray-100"
                >
                  Turn the theme off
                </button>
                <button
                  onClick={() => setConfirmingEmpty(false)}
                  className="px-3 py-1 text-sm underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => save(css)}
              disabled={busy || confirmingEmpty}
              className="border border-black px-4 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save CSS"}
            </button>
            {message && <span className="text-sm" role="status">{message}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
