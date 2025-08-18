import React from 'react';
import { NextPage } from 'next';
import { TemplateEngine } from '@/lib/template-engine';
import { renderTemplate } from '@/lib/template-renderer';

const ConditionalTemplateTest: NextPage = () => {
  // Test template with conditional rendering
  const testTemplate = `
    <div>
      <h1>Conditional Template Test</h1>
      
      <Show data="posts">
        <h2>User has posts!</h2>
        <BlogPosts limit="3" />
      </Show>
      
      <Show data="posts.length" equals="0">
        <p>No posts found</p>
      </Show>
      
      <IfOwner>
        <p>Welcome back, owner!</p>
      </IfOwner>
      
      <IfVisitor>
        <p>Welcome, visitor!</p>
      </IfVisitor>
      
      <Choose>
        <When data="capabilities.bio">
          <h3>About Me</h3>
          <Bio />
        </When>
        <When data="posts">
          <h3>Recent Posts</h3>
          <BlogPosts limit="2" />
        </When>
        <Otherwise>
          <p>Nothing to show yet!</p>
        </Otherwise>
      </Choose>
    </div>
  `;

  // Mock data for testing
  const mockData = TemplateEngine.createMockData('testuser');

  try {
    const compiled = TemplateEngine.compile({
      html: testTemplate,
      mode: 'custom-tags'
    });

    if (!compiled.success || !compiled.ast) {
      return (
        <div className="p-8">
          <h1>Template Compilation Failed</h1>
          <div className="bg-red-100 p-4 rounded">
            <h3>Errors:</h3>
            <ul>
              {compiled.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    const rendered = TemplateEngine.render({
      ast: compiled.ast,
      residentData: mockData,
      mode: 'preview'
    });

    if (!rendered.success) {
      return (
        <div className="p-8">
          <h1>Template Rendering Failed</h1>
          <div className="bg-red-100 p-4 rounded">
            <h3>Errors:</h3>
            <ul>
              {rendered.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8">
        <div className="mb-8">
          <h1>Conditional Template Test</h1>
          <p>Testing conditional rendering components with mock data.</p>
        </div>
        
        <div className="mb-8">
          <h2>Mock Data Summary:</h2>
          <ul className="list-disc list-inside">
            <li>Posts: {mockData.posts.length} items</li>
            <li>Guestbook: {mockData.guestbook.length} items</li>
            <li>Bio: {mockData.capabilities?.bio ? 'Present' : 'Missing'}</li>
            <li>Viewer ID: {mockData.viewer.id || 'null (visitor)'}</li>
            <li>Owner ID: {mockData.owner.id}</li>
          </ul>
        </div>

        <div className="border-2 border-gray-300 p-4 rounded">
          <h2>Rendered Template:</h2>
          {rendered.content}
        </div>

        <div className="mt-8">
          <h2>Template Stats:</h2>
          {compiled.stats && (
            <ul className="list-disc list-inside">
              <li>Nodes: {compiled.stats.nodeCount}</li>
              <li>Max Depth: {compiled.stats.maxDepth}</li>
              <li>Size: {compiled.stats.sizeKB.toFixed(2)}KB</li>
            </ul>
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-8">
        <h1>Test Error</h1>
        <div className="bg-red-100 p-4 rounded">
          <p>{String(error)}</p>
        </div>
      </div>
    );
  }
};

export default ConditionalTemplateTest;