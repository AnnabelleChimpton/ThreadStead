# How Markdown Works in ThreadStead Posts

Posts are written in **Markdown** (GitHub-Flavored). The raw markdown you type
is stored verbatim and re-rendered to HTML on every view, so fixing the renderer
retroactively fixes every existing post.

Pipeline: `your markdown` → footnotes → **marked** (GFM) → sanitize → task-list
polish. Implemented in `lib/utils/sanitization/html.ts` (`markdownToSafeHtml`).

---

## The one rule that surprises people: soft line breaks

We run marked with **`breaks: true`**. That means **a single newline becomes a
line break** (`<br>`) — you do *not* need a blank line to start a new line.

```
Line one
Line two
```
→ renders as two lines (not one paragraph). To start a new **paragraph** (with
spacing), leave a **blank line** between blocks.

Trade-off to know: because every newline is a break, if you press Enter *inside*
a single list item to wrap text, it can split the item. Keep one list item on one
line, or indent continuation lines.

---

## What's supported

| You write | You get |
|---|---|
| `# H1` … `###### H6` | Headings |
| `**bold**`, `*italic*`, `~~strike~~` | Emphasis |
| `1.` / `2.` / `3.` | Ordered list (starts at your first number) |
| `-`, `*`, `+` | Bullet list — **nesting works**: indent 2 spaces per level |
| `> quote` | Blockquote |
| `` `inline code` `` | Inline code |
| ` ```lang ` fenced block ` ``` ` | Code block (indentation & contents preserved) |
| 4-space / tab indent | Also a code block |
| `[text](https://url)` | Link |
| bare `https://url` | **Auto-linked** (marked GFM) — URLs inside code are left alone |
| `![alt](https://img)` | Image (https only) |
| `| a | b |` tables | Tables |
| `- [ ]` / `- [x]` | Task-list checkboxes |
| `[^1]` + `[^1]: note` | Footnotes (rendered in a footnotes section) |

Indentation, nested lists, and code-block whitespace are all preserved — marked
handles them. (Two old home-grown passes used to mangle these; they were removed.)

---

## Allowed HTML

You can also write raw HTML, but it's **sanitized** (DOMPurify) for safety. Only
these are kept:

- **Tags:** `b i em strong a p ul ol li blockquote code pre br h1–h6 img span
  table thead tbody tr th td input sup sub section div`
- **Attributes:** `href title alt src class align type checked disabled id`
- **Blocked:** `<script>`, `<style>`, `<iframe>`, inline `style=`, event handlers
- **Images:** `src` must be `https://…` or a base64 `data:image/…` — other `data:`
  URIs (e.g. `data:text/html`) are stripped.

Anything outside that list is removed silently on save/render.

---

## Gotchas

- **Single newline = line break** (see above) — the most common "why did it render
  like that?"
- **Tab key inserts 2 spaces** in the editor (it doesn't store a literal tab).
  Markdown indentation is space-based, so this is fine.
- **Raw markdown is the source of truth.** Editing a post loads your original
  markdown back, so round-trips are lossless. (Very old HTML-only posts predate
  this and may round-trip imperfectly.)
- If something renders unexpectedly, it's almost always standard GFM behavior
  interacting with `breaks: true` — reach for a blank line to separate blocks.
