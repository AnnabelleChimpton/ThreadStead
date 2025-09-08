import React, { useState } from 'react';
import { DEFAULT_PROFILE_TEMPLATE_INFO, ProfileTemplateType, getDefaultProfileTemplate } from '@/lib/templates/default-profile-templates';
import { getTemplatePreviewStyle, getTemplateGradientOverlay, TEMPLATE_PREVIEW_STYLES } from '@/lib/templates/rendering/template-preview-styles';

interface TemplatePanelSelectorProps {
  currentCSS?: string;
  onSelectTemplate: (css: string, templateName: string) => void;
  onClose: () => void;
}

export default function TemplatePanelSelector({ 
  currentCSS, 
  onSelectTemplate,
  onClose 
}: TemplatePanelSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ProfileTemplateType | 'clear' | null>(null);
  
  // Try to detect if current CSS matches a template
  const detectCurrentTemplate = (): ProfileTemplateType | null => {
    if (!currentCSS) return null;
    
    // Check each template to see if current CSS contains its signature styles
    const templates: ProfileTemplateType[] = ['abstract-art', 'charcoal-nights', 'pixel-petals', 'retro-social', 'classic-linen'];
    
    for (const templateType of templates) {
      const templateCSS = getDefaultProfileTemplate(templateType);
      // Check if the first 200 chars match (accounting for whitespace differences)
      const normalize = (str: string) => str.replace(/\s+/g, ' ').trim().substring(0, 200);
      if (normalize(currentCSS).includes(normalize(templateCSS).substring(0, 100))) {
        return templateType;
      }
    }
    return null;
  };
  
  const currentTemplate = detectCurrentTemplate();
  
  const handleApplyTemplate = () => {
    if (selectedTemplate === 'clear') {
      onSelectTemplate('/* Add your custom CSS here */\n\n', 'Clear CSS');
    } else if (selectedTemplate) {
      const css = getDefaultProfileTemplate(selectedTemplate);
      const templateInfo = DEFAULT_PROFILE_TEMPLATE_INFO[selectedTemplate];
      onSelectTemplate(css, templateInfo.name);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Choose a Theme</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Select a pre-designed theme to style your profile
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Template Grid */}
        <div className="p-4">
          {currentTemplate && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              <strong>Current Theme:</strong> {DEFAULT_PROFILE_TEMPLATE_INFO[currentTemplate].name}
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {(['abstract-art', 'charcoal-nights', 'pixel-petals', 'retro-social', 'classic-linen'] as ProfileTemplateType[]).map((templateType) => {
              const templateInfo = DEFAULT_PROFILE_TEMPLATE_INFO[templateType];
              const previewStyle = getTemplatePreviewStyle(templateType);
              const isSelected = selectedTemplate === templateType;
              const isCurrent = currentTemplate === templateType;
              
              return (
                <button
                  key={templateType}
                  onClick={() => setSelectedTemplate(templateType)}
                  className={`relative border-2 ${
                    isSelected ? 'border-blue-500 shadow-lg scale-[1.02]' : 
                    isCurrent ? 'border-green-500' : 
                    'border-gray-300 hover:border-gray-400'
                  } rounded-lg p-3 transition-all text-left overflow-hidden group`}
                  style={{
                    ...previewStyle,
                    borderColor: isSelected ? '#3B82F6' : isCurrent ? '#10B981' : undefined
                  }}
                >
                  {/* Gradient Overlay */}
                  <div style={getTemplateGradientOverlay(templateType)} />
                  
                  {/* Selection/Current Badges */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold z-10">
                      Selected
                    </div>
                  )}
                  {isCurrent && !isSelected && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold z-10">
                      Current
                    </div>
                  )}
                  
                  {/* Template Content */}
                  <div className="relative z-10">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-2xl">{templateInfo.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold mb-1 truncate" style={{ color: TEMPLATE_PREVIEW_STYLES[templateType]?.primaryColor }}>
                          {templateInfo.name}
                        </h3>
                        <p className="text-xs opacity-80 leading-tight" style={{ color: TEMPLATE_PREVIEW_STYLES[templateType]?.secondaryColor }}>
                          {templateInfo.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Preview Elements */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <div 
                        className="px-1.5 py-0.5 text-xs font-medium rounded"
                        style={{
                          backgroundColor: TEMPLATE_PREVIEW_STYLES[templateType]?.primaryColor + '20',
                          color: TEMPLATE_PREVIEW_STYLES[templateType]?.primaryColor,
                          borderStyle: TEMPLATE_PREVIEW_STYLES[templateType]?.borderStyle,
                          borderWidth: '1px',
                          borderColor: TEMPLATE_PREVIEW_STYLES[templateType]?.primaryColor
                        }}
                      >
                        Button
                      </div>
                      <div 
                        className="px-1.5 py-0.5 text-xs font-medium rounded"
                        style={{
                          backgroundColor: TEMPLATE_PREVIEW_STYLES[templateType]?.secondaryColor + '20',
                          color: TEMPLATE_PREVIEW_STYLES[templateType]?.secondaryColor,
                          borderStyle: TEMPLATE_PREVIEW_STYLES[templateType]?.borderStyle,
                          borderWidth: '1px',
                          borderColor: TEMPLATE_PREVIEW_STYLES[templateType]?.secondaryColor
                        }}
                      >
                        Link
                      </div>
                      {TEMPLATE_PREVIEW_STYLES[templateType]?.accentColor && (
                        <div 
                          className="px-1.5 py-0.5 text-xs font-medium rounded"
                          style={{
                            backgroundColor: TEMPLATE_PREVIEW_STYLES[templateType].accentColor + '20',
                            color: TEMPLATE_PREVIEW_STYLES[templateType].accentColor,
                            borderStyle: TEMPLATE_PREVIEW_STYLES[templateType]?.borderStyle,
                            borderWidth: '1px',
                            borderColor: TEMPLATE_PREVIEW_STYLES[templateType].accentColor
                          }}
                        >
                          Accent
                        </div>
                      )}
                    </div>
                    
                    {/* Hover effect */}
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
                  </div>
                </button>
              );
            })}
            
            {/* Clear/None Option */}
            <button
              onClick={() => setSelectedTemplate('clear')}
              className={`relative border-2 ${
                selectedTemplate === 'clear' ? 'border-blue-500 shadow-lg scale-[1.02]' : 
                'border-gray-300 hover:border-gray-400'
              } rounded-lg p-3 transition-all text-left bg-gray-50 group`}
            >
              {selectedTemplate === 'clear' && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold z-10">
                  Selected
                </div>
              )}
              
              <div className="relative z-10">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-2xl">🎨</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold mb-1 text-gray-700">
                      Start Fresh
                    </h3>
                    <p className="text-xs text-gray-600 leading-tight">
                      Clear all CSS and start with a blank canvas
                    </p>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Perfect for creating your own unique design
                </div>
              </div>
              
              {/* Hover effect */}
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate}
              className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {selectedTemplate === 'clear' ? 'Clear CSS' : 'Apply Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}