import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';

/** A snippet to copy: a label (HTML, CSS), the code in a cream box, and Copy */
export default function CodeBox({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const { showError } = useToast();
  const failed = () => {
    setCopied(false);
    showError("Couldn't copy that. Select the code and copy it yourself.");
  };
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="thread-label">{label}</span>
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Copy the ${label}`}
          onClick={() => {
            // No clipboard outside https (and in some embedded browsers)
            if (!navigator.clipboard) return failed();
            navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }, failed);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="m-0 p-3 overflow-x-auto bg-thread-cream border border-thread-sage/40 rounded text-sm font-mono text-nb-ink whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}
