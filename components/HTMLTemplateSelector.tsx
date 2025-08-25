import React, { useState } from 'react';
import { HTML_TEMPLATES, getHTMLTemplate, type HTMLTemplateInfo } from '@/lib/default-html-templates';

interface HTMLTemplateSelectorProps {
  currentTemplate: string;
  onTemplateChange: (template: string) => void;
}

export default function HTMLTemplateSelector({ currentTemplate: _currentTemplate, onTemplateChange }: HTMLTemplateSelectorProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'minimal' | 'modern' | 'classic'>('all');

  const handleTemplateSelect = (templateId: string) => {
    const template = getHTMLTemplate(templateId);
    onTemplateChange(template);
    setShowTemplates(false);
  };

  const handleRestoreDefault = () => {
    const confirmed = window.confirm(
      'This will replace your current template with a simple default layout. Are you sure?'
    );
    if (confirmed) {
      onTemplateChange(getHTMLTemplate('simple-default'));
    }
  };

  const handleClearTemplate = () => {
    const confirmed = window.confirm(
      'This will clear your template completely. You\'ll need to build your layout from scratch. Are you sure?'
    );
    if (confirmed) {
      onTemplateChange('');
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? HTML_TEMPLATES 
    : HTML_TEMPLATES.filter(t => t.category === selectedCategory);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'minimal': return '📝';
      case 'modern': return '✨';
      case 'classic': return '🖥️';
      default: return '📄';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'minimal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'modern': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'classic': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-2">
      {/* Template Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowTemplates(!showTemplates)}
          className="px-3 py-1 text-xs border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all"
        >
          🎨 Templates
        </button>
        <button
          type="button"
          onClick={handleRestoreDefault}
          className="px-3 py-1 text-xs border border-gray-300 bg-gray-100 hover:bg-gray-200 rounded shadow-sm transition-all"
        >
          🔄 Default
        </button>
        <button
          type="button"
          onClick={handleClearTemplate}
          className="px-3 py-1 text-xs border border-red-300 bg-red-100 hover:bg-red-200 text-red-700 rounded shadow-sm transition-all"
        >
          🗑️ Clear
        </button>
      </div>

      {/* Template Selection Panel */}
      {showTemplates && (
        <div className="bg-thread-cream border border-thread-sage rounded-lg p-4 space-y-4">
          <div>
            <h3 className="thread-label text-sm mb-2">Choose a template to get started:</h3>
            <p className="text-xs text-gray-600 mb-3">
              Templates provide pre-built layouts using our components. You can customize them after applying.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-1 text-xs rounded border transition-all ${
                selectedCategory === 'all' 
                  ? 'bg-thread-sage text-white border-thread-sage' 
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              All Templates
            </button>
            {(['minimal', 'modern', 'classic'] as const).map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-2 py-1 text-xs rounded border transition-all ${
                  selectedCategory === category 
                    ? 'bg-thread-sage text-white border-thread-sage' 
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map((template: HTMLTemplateInfo) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer bg-white"
                onClick={() => handleTemplateSelect(template.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm text-gray-800">{template.name}</h4>
                  <span className={`px-2 py-0.5 text-xs rounded border ${getCategoryColor(template.category)}`}>
                    {getCategoryIcon(template.category)} {template.category}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                {template.preview && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                    {template.preview}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Template Info */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
            <h4 className="font-medium text-blue-800 mb-1">💡 Template Tips:</h4>
            <ul className="text-blue-700 space-y-1 ml-4 list-disc">
              <li><strong>Minimal:</strong> Simple layouts focusing on content</li>
              <li><strong>Modern:</strong> Interactive elements with visual effects</li>
              <li><strong>Classic:</strong> Nostalgic designs with retro styling</li>
            </ul>
            <p className="text-blue-600 mt-2">
              After applying a template, you can customize it by editing the HTML directly or adding your own components.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}