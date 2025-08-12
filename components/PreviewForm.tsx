import { useEffect, useState } from "react";
import hljs from "highlight.js";
import { markdownToSafeHtml } from "../lib/sanitize";  // Import your markdownToSafeHtml function

const Preview = ({ content }: { content: string }) => {
  const [htmlContent, setHtmlContent] = useState<string>("");

  useEffect(() => {
    // Convert Markdown to HTML and sanitize it
    const safeHtml = markdownToSafeHtml(content);
    setHtmlContent(safeHtml);
  }, [content]);

  useEffect(() => {
    // Apply syntax highlighting after rendering the content
    const blocks = document.querySelectorAll("pre code");
    blocks.forEach((block) => hljs.highlightElement(block as HTMLElement));
  }, [htmlContent]);

  return (
    <div
      className="preview-content"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default Preview;
