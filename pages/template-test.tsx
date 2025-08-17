import React, { useState } from 'react';
import Layout from '@/components/Layout';
import TemplateEditor from '@/components/TemplateEditor';
import type { TemplateNode } from '@/lib/template-parser';

export default function TemplateTestPage() {
  const [savedTemplates, setSavedTemplates] = useState<Array<{
    id: string;
    name: string;
    template: string;
    ast: TemplateNode;
    createdAt: string;
  }>>([]);

  const handleSaveTemplate = (template: string, ast: TemplateNode) => {
    const newTemplate = {
      id: Date.now().toString(),
      name: `Template ${savedTemplates.length + 1}`,
      template,
      ast,
      createdAt: new Date().toISOString()
    };
    setSavedTemplates(prev => [...prev, newTemplate]);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="thread-headline text-3xl font-bold mb-2">Template System Test</h1>
            <p className="text-thread-sage">
              Test the user-templated profile system. Create templates using semantic HTML with 
              allow-listed components to render profile pages safely.
            </p>
          </div>

          {/* Template Editor */}
          <div className="mb-8">
            <TemplateEditor
              onSave={handleSaveTemplate}
            />
          </div>

          {/* Saved Templates */}
          {savedTemplates.length > 0 && (
            <div className="bg-white border border-thread-sage/30 rounded-cozy shadow-cozySm p-4">
              <h2 className="thread-headline text-xl font-bold mb-4">Saved Templates</h2>
              <div className="space-y-3">
                {savedTemplates.map((saved) => (
                  <div 
                    key={saved.id}
                    className="bg-thread-cream border border-thread-sage/30 rounded p-3"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{saved.name}</h3>
                      <span className="text-xs text-thread-sage">
                        {new Date(saved.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-thread-sage">
                        View template code
                      </summary>
                      <pre className="mt-2 p-2 bg-thread-paper border border-thread-sage/30 rounded text-xs overflow-auto">
                        <code>{saved.template}</code>
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documentation */}
          <div className="mt-8 bg-white border border-thread-sage/30 rounded-cozy shadow-cozySm p-6">
            <h2 className="thread-headline text-xl font-bold mb-4">System Overview</h2>
            
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium mb-2">Security Features</h3>
                <ul className="list-disc list-inside space-y-1 text-thread-sage">
                  <li>Templates treated as data, not code</li>
                  <li>Component whitelist with prop validation</li>
                  <li>HTML sanitization with rehype-sanitize</li>
                  <li>Size and complexity limits enforced</li>
                  <li>No inline scripts or arbitrary styles allowed</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-2">Data Access</h3>
                <ul className="list-disc list-inside space-y-1 text-thread-sage">
                  <li>Components read profile data from context</li>
                  <li>Templates only control presentation props (size, variant, etc.)</li>
                  <li>ResidentDataProvider supplies owner, posts, guestbook data</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-2">Processing Pipeline</h3>
                <ol className="list-decimal list-inside space-y-1 text-thread-sage">
                  <li>Parse HTML using unified + rehype-parse</li>
                  <li>Sanitize with custom schema for allowed tags/attributes</li>
                  <li>Validate size, depth, and component limits</li>
                  <li>Transform custom tags to React components</li>
                  <li>Render with ResidentDataProvider context</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// No getServerSideProps needed - we'll fetch current user data on client side