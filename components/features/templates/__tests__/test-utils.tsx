import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ResidentDataProvider, type ResidentData } from '../ResidentDataProvider';

// Default mock resident data for testing - simplified version
export const createMockResidentData = (overrides: Partial<ResidentData> = {}): ResidentData => ({
  owner: {
    id: 'test-user-123',
    handle: 'testuser',
    displayName: 'Test User',
    avatarUrl: '/assets/default-avatar.gif'
  },
  viewer: { id: null },
  posts: [
    {
      id: 'post-1',
      bodyHtml: '<p>This is a test post with <strong>formatting</strong>.</p>',
      createdAt: new Date().toISOString()
    },
    {
      id: 'post-2',
      bodyHtml: '<p>Another test post for testing purposes.</p>',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  guestbook: [
    {
      id: 'guest-1',
      message: 'Hello from a test visitor!',
      authorUsername: 'visitor1',
      createdAt: new Date().toISOString()
    }
  ],
  relationships: {},
  capabilities: {
    bio: 'This is a test user bio for template testing.'
  },
  images: [
    {
      id: 'img-1',
      url: '/test-images/sample.jpg',
      alt: 'Test image',
      caption: 'A test image',
      createdAt: new Date().toISOString()
    }
  ],
  profileImages: [
    {
      id: 'profile-img-1',
      url: '/test-images/banner.jpg',
      alt: 'Profile banner',
      type: 'banner' as const
    }
  ],
  ...overrides
});

// Wrapper component that provides template context
interface TemplateTestWrapperProps {
  children: React.ReactNode;
  residentData?: ResidentData;
}

export const TemplateTestWrapper: React.FC<TemplateTestWrapperProps> = ({ 
  children, 
  residentData = createMockResidentData() 
}) => {
  return (
    <ResidentDataProvider data={residentData}>
      {children}
    </ResidentDataProvider>
  );
};

// Custom render function that includes template context
export const renderWithTemplateContext = (
  ui: React.ReactElement,
  options: {
    residentData?: ResidentData;
    renderOptions?: Omit<RenderOptions, 'wrapper'>;
  } = {}
): RenderResult => {
  const { residentData = createMockResidentData(), renderOptions = {} } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <TemplateTestWrapper residentData={residentData}>
        {children}
      </TemplateTestWrapper>
    ),
    ...renderOptions,
  });
};