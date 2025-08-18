import React, { useState } from 'react';
import { NextPage } from 'next';
import { TemplateEngine } from '@/lib/template-engine';
import HTMLTemplateSelector from '@/components/HTMLTemplateSelector';
import { getHTMLTemplate } from '@/lib/default-html-templates';

const TemplateSelectorTest: NextPage = () => {
  const [currentTemplate, setCurrentTemplate] = useState(getHTMLTemplate('simple-default'));
  const [renderResult, setRenderResult] = useState<any>(null);

  // Mock data for testing
  const mockData = TemplateEngine.createMockData('testuser');

  const handleTemplateChange = (newTemplate: string) => {
    setCurrentTemplate(newTemplate);
    
    // Try to compile and render the new template
    try {
      const compiled = TemplateEngine.compile({
        html: newTemplate,
        mode: 'custom-tags'
      });

      if (compiled.success && compiled.ast) {
        const rendered = TemplateEngine.render({
          ast: compiled.ast,
          residentData: mockData,
          mode: 'preview'
        });
        setRenderResult(rendered);
      } else {
        setRenderResult({ success: false, errors: compiled.errors });
      }
    } catch (error) {
      setRenderResult({ success: false, errors: [String(error)] });
    }
  };

  // Initial render
  React.useEffect(() => {
    handleTemplateChange(currentTemplate);
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Template Selector Test</h1>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Template Selector */}
        <div>
          <h2 className="text-xl font-bold mb-4">Template Selection</h2>
          <HTMLTemplateSelector 
            currentTemplate={currentTemplate}
            onTemplateChange={handleTemplateChange}
          />
          
          <div className="mt-6">
            <h3 className="font-bold mb-2">Current Template Source:</h3>
            <textarea
              value={currentTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full h-40 p-3 border border-gray-300 rounded font-mono text-sm"
              placeholder="Template HTML..."
            />
          </div>
        </div>

        {/* Right: Preview */}
        <div>
          <h2 className="text-xl font-bold mb-4">Live Preview</h2>
          <div className="border border-gray-300 rounded-lg p-4 min-h-96 bg-gray-50">
            {renderResult?.success ? (
              <div className="bg-white rounded p-4">
                {renderResult.content}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <h4 className="font-bold text-red-800 mb-2">Render Error</h4>
                <ul className="text-red-700 text-sm">
                  {renderResult?.errors?.map((error: string, i: number) => (
                    <li key={i}>• {error}</li>
                  )) || ['Unknown error']}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Statistics */}
      {renderResult?.success && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">Template Info</h3>
          <div className="text-blue-700 text-sm grid md:grid-cols-3 gap-4">
            <div>
              <strong>Template Size:</strong> {currentTemplate.length} characters
            </div>
            <div>
              <strong>Status:</strong> {renderResult.success ? '✅ Valid' : '❌ Invalid'}
            </div>
            <div>
              <strong>Components:</strong> Rendered successfully
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelectorTest;