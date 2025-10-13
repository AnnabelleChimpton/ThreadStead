import React, { useState } from "react";

interface CodeBlockProps {
  code: string;
  title?: string;
  language?: string;
  showLineNumbers?: boolean;
  allowCopy?: boolean;
}

export default function CodeBlock({
  code,
  title,
  language = 'template',
  showLineNumbers = false,
  allowCopy = true
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className="border-3 border-black shadow-[4px_4px_0_#000] overflow-hidden">
      {/* Header */}
      {(title || allowCopy) && (
        <div className="bg-gray-200 border-b-3 border-black px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {title && <span className="font-bold text-sm">{title}</span>}
            {language && (
              <span className="px-2 py-1 bg-white border-2 border-black text-xs font-mono">
                {language}
              </span>
            )}
          </div>
          {allowCopy && (
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 bg-cyan-200 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all text-xs font-bold"
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          )}
        </div>
      )}

      {/* Code Content */}
      <div className="bg-gray-900 text-green-400 p-4 overflow-x-auto">
        <pre className="font-mono text-sm">
          {showLineNumbers ? (
            <table className="w-full">
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="text-gray-600 select-none pr-4 text-right" style={{ width: '40px' }}>
                      {index + 1}
                    </td>
                    <td>
                      <code className="whitespace-pre-wrap">{line || ' '}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <code className="whitespace-pre-wrap">{code}</code>
          )}
        </pre>
      </div>
    </div>
  );
}
