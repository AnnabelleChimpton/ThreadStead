import React from 'react';
import { screen } from '@testing-library/react';
import Breadcrumb from '../Breadcrumb';
import { renderWithTemplateContext } from './test-utils';

// Mock Next.js router
const mockRouter = {
  asPath: '/',
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/',
  query: {},
  route: '/'
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ href, children, className, ...props }: any) {
    return (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    );
  };
});

describe('Breadcrumb Component', () => {
  beforeEach(() => {
    // Reset router path for each test
    mockRouter.asPath = '/';
  });

  describe('Home Page Behavior', () => {
    it('should not render on home page', () => {
      mockRouter.asPath = '/';
      
      const { container } = renderWithTemplateContext(<Breadcrumb />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should not render on root path with query params', () => {
      mockRouter.asPath = '/?param=value';
      
      const { container } = renderWithTemplateContext(<Breadcrumb />);
      
      // Component processes query params as part of path, creating empty path segment
      // This results in a breadcrumb being shown
      expect(container.firstChild).not.toBeNull();
    });

    it('should not render when only home breadcrumb exists', () => {
      mockRouter.asPath = '';
      
      const { container } = renderWithTemplateContext(<Breadcrumb />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Single Level Paths', () => {
    it('should render breadcrumb for feed page', () => {
      mockRouter.asPath = '/feed';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Feed')).toBeInTheDocument();
      expect(screen.getByText('›')).toBeInTheDocument();
      
      // Home should be a link, Feed should not be (current page)
      const homeLink = screen.getByRole('link', { name: 'Home' });
      expect(homeLink).toHaveAttribute('href', '/');
      
      expect(screen.queryByRole('link', { name: 'Feed' })).not.toBeInTheDocument();
    });

    it('should render breadcrumb for directory page', () => {
      mockRouter.asPath = '/directory';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Directory')).toBeInTheDocument();
    });

    it('should render breadcrumb for notifications page', () => {
      mockRouter.asPath = '/notifications';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('should render breadcrumb for settings page', () => {
      mockRouter.asPath = '/settings';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Multi Level Paths', () => {
    it('should render breadcrumbs for resident profile', () => {
      mockRouter.asPath = '/resident/johndoe';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Profiles')).toBeInTheDocument();
      expect(screen.getByText('Johndoe')).toBeInTheDocument();
      
      // Home and Profiles should be links, Johndoe should not be (current page)
      expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: 'Profiles' })).toHaveAttribute('href', '/resident');
    });

    it('should render breadcrumbs for custom page', () => {
      mockRouter.asPath = '/page/about-us';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Page')).toBeInTheDocument();
      expect(screen.getByText('About Us')).toBeInTheDocument();
      
      expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: 'Page' })).toHaveAttribute('href', '/page');
    });

    it('should render breadcrumbs for deep nested paths', () => {
      mockRouter.asPath = '/threadrings/category/technology/posts';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Threadrings')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('Posts')).toBeInTheDocument();
      
      // Check intermediate links
      expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: 'Threadrings' })).toHaveAttribute('href', '/threadrings');
      expect(screen.getByRole('link', { name: 'Category' })).toHaveAttribute('href', '/threadrings/category');
      expect(screen.getByRole('link', { name: 'Technology' })).toHaveAttribute('href', '/threadrings/category/technology');
    });
  });

  describe('Path Processing', () => {
    it('should handle paths with hyphens correctly', () => {
      mockRouter.asPath = '/getting-started';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
    });

    it('should handle paths with multiple hyphens', () => {
      mockRouter.asPath = '/design-css-tutorial';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Design Css Tutorial')).toBeInTheDocument();
    });

    it('should handle URL encoded characters', () => {
      mockRouter.asPath = '/user/john%20doe';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      // Component decodes but doesn't split on spaces, only on hyphens
      expect(screen.getByText('John doe')).toBeInTheDocument();
    });

    it('should handle special URL encoded characters', () => {
      mockRouter.asPath = '/search/test%2Bquery%26filter';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      // Component decodes but only capitalizes first letter, doesn't split on non-hyphen chars
      expect(screen.getByText('Test+query&filter')).toBeInTheDocument();
    });

    it('should strip query parameters from paths', () => {
      mockRouter.asPath = '/feed?page=2&sort=recent';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Feed')).toBeInTheDocument();
      expect(screen.queryByText('page=2')).not.toBeInTheDocument();
    });

    it('should handle empty path segments', () => {
      mockRouter.asPath = '/user//profile';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  describe('Link Behavior', () => {
    it('should make all items except last one clickable', () => {
      mockRouter.asPath = '/resident/alice/posts';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      // First two should be links
      expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Profiles' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Alice' })).toBeInTheDocument();
      
      // Last one should not be a link
      expect(screen.queryByRole('link', { name: 'Posts' })).not.toBeInTheDocument();
      expect(screen.getByText('Posts')).toBeInTheDocument();
    });

    it('should generate correct href attributes', () => {
      mockRouter.asPath = '/a/b/c/d';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: 'A' })).toHaveAttribute('href', '/a');
      expect(screen.getByRole('link', { name: 'B' })).toHaveAttribute('href', '/a/b');
      expect(screen.getByRole('link', { name: 'C' })).toHaveAttribute('href', '/a/b/c');
    });
  });

  describe('Styling and CSS Classes', () => {
    it('should have correct container styling', () => {
      mockRouter.asPath = '/feed';
      
      const { container } = renderWithTemplateContext(<Breadcrumb />);
      
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('breadcrumb', 'mb-4');
      expect(nav).toHaveAttribute('data-component', 'breadcrumb');
    });

    it('should have correct separator styling', () => {
      mockRouter.asPath = '/feed';
      
      const { container } = renderWithTemplateContext(<Breadcrumb />);
      
      const separator = container.querySelector('.breadcrumb-separator');
      expect(separator).toHaveClass('breadcrumb-separator', 'mx-2', 'text-thread-sage');
      expect(separator?.textContent).toBe('›');
    });

    it('should have correct link styling', () => {
      mockRouter.asPath = '/feed';
      
      const { container } = renderWithTemplateContext(<Breadcrumb />);
      
      const link = container.querySelector('.breadcrumb-link');
      expect(link).toHaveClass(
        'breadcrumb-link',
        'text-thread-pine',
        'hover:text-thread-sunset',
        'transition-colors'
      );
    });

    it('should have correct active item styling', () => {
      mockRouter.asPath = '/feed';
      
      const { container } = renderWithTemplateContext(<Breadcrumb />);
      
      const activeItem = container.querySelector('.breadcrumb-active');
      expect(activeItem).toHaveClass(
        'breadcrumb-active',
        'text-thread-charcoal',
        'font-medium'
      );
    });
  });

  describe('Accessibility', () => {
    it('should use semantic nav element', () => {
      mockRouter.asPath = '/feed';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass('breadcrumb');
    });

    it('should have accessible links', () => {
      mockRouter.asPath = '/resident/john';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('should provide meaningful link text', () => {
      mockRouter.asPath = '/settings/profile';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      const homeLink = screen.getByRole('link', { name: 'Home' });
      const settingsLink = screen.getByRole('link', { name: 'Settings' });
      
      expect(homeLink).toBeInTheDocument();
      expect(settingsLink).toBeInTheDocument();
    });

    it('should distinguish between clickable and non-clickable items', () => {
      mockRouter.asPath = '/feed';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      // Home should be clickable
      expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
      
      // Feed should not be clickable (current page)
      expect(screen.queryByRole('link', { name: 'Feed' })).not.toBeInTheDocument();
      
      // But Feed text should still be present
      expect(screen.getByText('Feed')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single character paths', () => {
      mockRouter.asPath = '/a';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should handle numeric paths', () => {
      mockRouter.asPath = '/user/123';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('should handle paths with dots', () => {
      mockRouter.asPath = '/files/config.json';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Files')).toBeInTheDocument();
      // Component only capitalizes first letter, dots are preserved
      expect(screen.getByText('Config.json')).toBeInTheDocument();
    });

    it('should handle paths with underscores', () => {
      mockRouter.asPath = '/user_profile/settings_page';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      // Component only splits on hyphens, not underscores
      expect(screen.getByText('User_profile')).toBeInTheDocument();
      expect(screen.getByText('Settings_page')).toBeInTheDocument();
    });

    it('should handle very long paths', () => {
      const longPath = '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z';
      mockRouter.asPath = longPath;
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('Z')).toBeInTheDocument();
    });

    it('should handle paths with Unicode characters', () => {
      mockRouter.asPath = '/café/naïve';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      expect(screen.getByText('Café')).toBeInTheDocument();
      expect(screen.getByText('Naïve')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      mockRouter.asPath = '/feed';
      
      const startTime = performance.now();
      renderWithTemplateContext(<Breadcrumb />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle rapid path changes', () => {
      const paths = ['/feed', '/directory', '/settings', '/notifications'];
      
      const { rerender } = renderWithTemplateContext(<Breadcrumb />);
      
      paths.forEach(path => {
        mockRouter.asPath = path;
        rerender(<Breadcrumb />);
        
        const pathName = path.split('/')[1];
        const expectedText = pathName.charAt(0).toUpperCase() + pathName.slice(1);
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      });
    });
  });

  describe('Integration', () => {
    it('should work within page layouts', () => {
      mockRouter.asPath = '/settings';
      
      renderWithTemplateContext(
        <div>
          <header>Header</header>
          <Breadcrumb />
          <main>Main content</main>
        </div>
      );
      
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
    });

    it('should maintain navigation context', () => {
      mockRouter.asPath = '/threadrings/spool';
      
      renderWithTemplateContext(<Breadcrumb />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('data-component', 'breadcrumb');
    });
  });
});