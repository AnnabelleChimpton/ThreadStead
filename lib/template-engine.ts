// Complete template compilation and rendering pipeline
import { compileTemplate, type CompilationResult, type TemplateNode } from './template-parser';
import { renderTemplate, PreviewRenderer, type RenderOptions } from './template-renderer';
import type { ResidentData } from '@/components/template/ResidentDataProvider';

export interface TemplateCompileRequest {
  html: string;
  mode: 'custom-tags' | 'data-attributes';
}

export interface TemplateCompileResponse {
  success: boolean;
  ast?: TemplateNode;
  errors: string[];
  warnings: string[];
  stats?: {
    nodeCount: number;
    maxDepth: number;
    componentCounts: Record<string, number>;
    sizeKB: number;
  };
}

export interface TemplateRenderRequest {
  ast: TemplateNode;
  residentData: ResidentData;
  mode?: 'production' | 'preview';
}

export interface TemplateRenderResponse {
  success: boolean;
  content?: React.ReactElement;
  errors: string[];
}

// Main compilation function
export function compileTemplateFromRequest(request: TemplateCompileRequest): TemplateCompileResponse {
  const { html, mode } = request;
  
  // Convert data-attributes syntax to custom-tags if needed
  let processedHtml = html;
  if (mode === 'data-attributes') {
    processedHtml = convertDataAttributesToCustomTags(html);
  }
  
  const result = compileTemplate(processedHtml);
  
  const sizeKB = new Blob([html]).size / 1024;
  
  return {
    success: result.success,
    ast: result.ast,
    errors: result.errors,
    warnings: result.validation?.warnings || [],
    stats: result.validation ? {
      ...result.validation.stats,
      sizeKB
    } : undefined
  };
}

// Convert data-attribute syntax to custom tags
function convertDataAttributesToCustomTags(html: string): string {
  // Simple regex-based conversion for data-component attributes
  return html.replace(
    /<(\w+)([^>]*?)data-component=["']([^"']+)["']([^>]*?)>/g,
    (match, tagName, beforeAttrs, componentName, afterAttrs) => {
      // Extract data-* attributes and convert them to regular attributes
      const dataAttrRegex = /data-(\w+)=["']([^"']+)["']/g;
      let convertedAttrs = '';
      let dataMatch;
      
      const allAttrs = beforeAttrs + afterAttrs;
      while ((dataMatch = dataAttrRegex.exec(allAttrs)) !== null) {
        const [, attrName, attrValue] = dataMatch;
        if (attrName !== 'component') {
          convertedAttrs += ` ${attrName}="${attrValue}"`;
        }
      }
      
      return `<${componentName}${convertedAttrs}>`;
    }
  );
}

// Main rendering function
export function renderTemplateFromRequest(request: TemplateRenderRequest): TemplateRenderResponse {
  console.log('Render request:', request);
  try {
    const { ast, residentData, mode = 'production' } = request;
    
    let content: React.ReactElement;
    
    if (mode === 'preview') {
      content = PreviewRenderer({ 
        ast, 
        residentData, 
        showWarnings: true 
      });
    } else {
      content = renderTemplate({ ast, residentData });
    }
    
    return {
      success: true,
      content,
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Render error: ${error}`]
    };
  }
}

// Utility function to create mock resident data for testing
export function createMockResidentData(username: string = 'testuser'): ResidentData {
  return {
    owner: {
      id: '1',
      handle: username,
      displayName: username.charAt(0).toUpperCase() + username.slice(1),
      avatarUrl: '/assets/default-avatar.gif'
    },
    viewer: {
      id: null
    },
    posts: [
      {
        id: '1',
        contentHtml: '<p>This is my first blog post! Welcome to my profile.</p>',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        contentHtml: '<p>Here\'s another post with some <strong>formatted content</strong>.</p>',
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ],
    guestbook: [
      {
        id: '1',
        message: 'Great profile!',
        authorUsername: 'friend1',
        createdAt: new Date().toISOString()
      }
    ],
    capabilities: {
      bio: 'Welcome to my corner of the internet! I love sharing thoughts and connecting with others.'
    },
    images: [
      {
        id: '1',
        url: 'https://picsum.photos/300/200?random=1',
        alt: 'Sample image',
        caption: 'A beautiful landscape',
        createdAt: new Date().toISOString()
      }
    ],
    profileImages: [
      {
        id: '1',
        url: 'https://picsum.photos/150/150?random=2',
        alt: 'Profile banner',
        type: 'banner' as const
      }
    ]
  };
}

// Template validation helpers
export function validateTemplateString(html: string): { isValid: boolean; errors: string[] } {
  if (!html || html.trim().length === 0) {
    return { isValid: false, errors: ['Template cannot be empty'] };
  }
  
  if (html.length > 65536) {
    return { isValid: false, errors: ['Template too large (max 64KB)'] };
  }
  
  // Basic HTML structure validation
  const openTags = (html.match(/<[^/][^>]*>/g) || []).length;
  const closeTags = (html.match(/<\/[^>]+>/g) || []).length;
  const selfClosing = (html.match(/<[^>]*\/>/g) || []).length;
  
  if (openTags - selfClosing !== closeTags) {
    return { isValid: false, errors: ['Mismatched HTML tags'] };
  }
  
  return { isValid: true, errors: [] };
}

// Export the complete pipeline
export const TemplateEngine = {
  compile: compileTemplateFromRequest,
  render: renderTemplateFromRequest,
  validate: validateTemplateString,
  createMockData: createMockResidentData
} as const;