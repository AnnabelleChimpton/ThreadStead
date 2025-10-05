import React from 'react';
import { screen } from '@testing-library/react';
import Show from '../Show';
import { renderWithTemplateContext, createMockResidentData } from '../../__tests__/test-utils';

describe('Show Component - Enhanced Operators', () => {
  describe('Comparison Operators', () => {
    describe('greaterThan', () => {
      it('should show content when value is greater than threshold', () => {
        const residentData = createMockResidentData({
          posts: [{}, {}, {}] // 3 posts
        });

        renderWithTemplateContext(
          <Show data="posts.length" greaterThan="2">
            <div data-testid="content">Many posts!</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should not show content when value equals threshold', () => {
        const residentData = createMockResidentData({
          posts: [{}, {}] // 2 posts
        });

        renderWithTemplateContext(
          <Show data="posts.length" greaterThan="2">
            <div data-testid="content">Many posts!</div>
          </Show>,
          { residentData }
        );

        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      });

      it('should handle numeric string comparison', () => {
        const residentData = createMockResidentData({
          posts: [{}, {}, {}, {}, {}] // 5 posts
        });

        renderWithTemplateContext(
          <Show data="posts.length" greaterThan={3}>
            <div data-testid="content">More than 3</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });
    });

    describe('lessThan', () => {
      it('should show content when value is less than threshold', () => {
        const residentData = createMockResidentData({
          posts: [{}] // 1 post
        });

        renderWithTemplateContext(
          <Show data="posts.length" lessThan="3">
            <div data-testid="content">Few posts</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should not show content when value equals threshold', () => {
        const residentData = createMockResidentData({
          posts: [{}, {}, {}] // 3 posts
        });

        renderWithTemplateContext(
          <Show data="posts.length" lessThan="3">
            <div data-testid="content">Few posts</div>
          </Show>,
          { residentData }
        );

        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      });
    });

    describe('greaterThanOrEqual', () => {
      it('should show content when value is greater than threshold', () => {
        const residentData = createMockResidentData({
          posts: [{}, {}, {}, {}] // 4 posts
        });

        renderWithTemplateContext(
          <Show data="posts.length" greaterThanOrEqual="3">
            <div data-testid="content">At least 3</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should show content when value equals threshold', () => {
        const residentData = createMockResidentData({
          posts: [{}, {}, {}] // 3 posts
        });

        renderWithTemplateContext(
          <Show data="posts.length" greaterThanOrEqual="3">
            <div data-testid="content">At least 3</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });
    });

    describe('lessThanOrEqual', () => {
      it('should show content when value is less than threshold', () => {
        const residentData = createMockResidentData({
          posts: [{}] // 1 post
        });

        renderWithTemplateContext(
          <Show data="posts.length" lessThanOrEqual="3">
            <div data-testid="content">At most 3</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should show content when value equals threshold', () => {
        const residentData = createMockResidentData({
          posts: [{}, {}, {}] // 3 posts
        });

        renderWithTemplateContext(
          <Show data="posts.length" lessThanOrEqual="3">
            <div data-testid="content">At most 3</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });
    });

    describe('notEquals', () => {
      it('should show content when value does not equal comparison', () => {
        const residentData = createMockResidentData({
          owner: { id: '1', handle: 'john', displayName: 'John Doe' }
        });

        renderWithTemplateContext(
          <Show data="owner.displayName" notEquals="Jane Doe">
            <div data-testid="content">Not Jane</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should not show content when value equals comparison', () => {
        const residentData = createMockResidentData({
          owner: { id: '1', handle: 'john', displayName: 'John Doe' }
        });

        renderWithTemplateContext(
          <Show data="owner.displayName" notEquals="John Doe">
            <div data-testid="content">Not John</div>
          </Show>,
          { residentData }
        );

        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      });
    });
  });

  describe('String Operators', () => {
    describe('contains', () => {
      it('should show content when string contains substring', () => {
        const residentData = createMockResidentData({
          capabilities: { bio: 'I am a software developer' }
        });

        renderWithTemplateContext(
          <Show data="capabilities.bio" contains="developer">
            <div data-testid="content">Is developer</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should not show content when string does not contain substring', () => {
        const residentData = createMockResidentData({
          capabilities: { bio: 'I am a designer' }
        });

        renderWithTemplateContext(
          <Show data="capabilities.bio" contains="developer">
            <div data-testid="content">Is developer</div>
          </Show>,
          { residentData }
        );

        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      });
    });

    describe('startsWith', () => {
      it('should show content when string starts with prefix', () => {
        const residentData = createMockResidentData({
          owner: { id: '1', handle: 'admin_user', displayName: 'Admin' }
        });

        renderWithTemplateContext(
          <Show data="owner.handle" startsWith="admin">
            <div data-testid="content">Is admin</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should not show content when string does not start with prefix', () => {
        const residentData = createMockResidentData({
          owner: { id: '1', handle: 'user_admin', displayName: 'User' }
        });

        renderWithTemplateContext(
          <Show data="owner.handle" startsWith="admin">
            <div data-testid="content">Is admin</div>
          </Show>,
          { residentData }
        );

        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      });
    });

    describe('endsWith', () => {
      it('should show content when string ends with suffix', () => {
        const residentData = createMockResidentData({
          owner: { id: '1', handle: 'user_test', displayName: 'Test User' }
        });

        renderWithTemplateContext(
          <Show data="owner.handle" endsWith="test">
            <div data-testid="content">Is test account</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });
    });

    describe('matches (regex)', () => {
      it('should show content when string matches pattern', () => {
        const residentData = createMockResidentData({
          owner: { id: '1', handle: 'user123', displayName: 'User' }
        });

        renderWithTemplateContext(
          <Show data="owner.handle" matches="user\d+">
            <div data-testid="content">Matches pattern</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should not show content when string does not match pattern', () => {
        const residentData = createMockResidentData({
          owner: { id: '1', handle: 'username', displayName: 'User' }
        });

        renderWithTemplateContext(
          <Show data="owner.handle" matches="user\d+">
            <div data-testid="content">Matches pattern</div>
          </Show>,
          { residentData }
        );

        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Logical Operators', () => {
    describe('and', () => {
      it('should show content when all conditions are truthy', () => {
        const residentData = createMockResidentData({
          posts: [{}],
          capabilities: { bio: 'Test bio' }
        });

        renderWithTemplateContext(
          <Show and="posts,capabilities.bio">
            <div data-testid="content">Has both</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should not show content when one condition is falsy', () => {
        const residentData = createMockResidentData({
          posts: [],
          capabilities: { bio: 'Test bio' }
        });

        renderWithTemplateContext(
          <Show and="posts,capabilities.bio">
            <div data-testid="content">Has both</div>
          </Show>,
          { residentData }
        );

        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      });

      it('should not show content when all conditions are falsy', () => {
        const residentData = createMockResidentData({
          posts: [],
          capabilities: {}
        });

        renderWithTemplateContext(
          <Show and="posts,capabilities.bio">
            <div data-testid="content">Has both</div>
          </Show>,
          { residentData }
        );

        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      });
    });

    describe('or', () => {
      it('should show content when at least one condition is truthy', () => {
        const residentData = createMockResidentData({
          posts: [],
          capabilities: { bio: 'Test bio' }
        });

        renderWithTemplateContext(
          <Show or="posts,capabilities.bio">
            <div data-testid="content">Has at least one</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should show content when all conditions are truthy', () => {
        const residentData = createMockResidentData({
          posts: [{}],
          capabilities: { bio: 'Test bio' }
        });

        renderWithTemplateContext(
          <Show or="posts,capabilities.bio">
            <div data-testid="content">Has at least one</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should not show content when all conditions are falsy', () => {
        const residentData = createMockResidentData({
          posts: [],
          capabilities: {}
        });

        renderWithTemplateContext(
          <Show or="posts,capabilities.bio">
            <div data-testid="content">Has at least one</div>
          </Show>,
          { residentData }
        );

        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      });
    });

    describe('not', () => {
      it('should show content when condition is falsy', () => {
        const residentData = createMockResidentData({
          posts: []
        });

        renderWithTemplateContext(
          <Show not="posts">
            <div data-testid="content">No posts</div>
          </Show>,
          { residentData }
        );

        expect(screen.getByTestId('content')).toBeInTheDocument();
      });

      it('should not show content when condition is truthy', () => {
        const residentData = createMockResidentData({
          posts: [{}]
        });

        renderWithTemplateContext(
          <Show not="posts">
            <div data-testid="content">No posts</div>
          </Show>,
          { residentData }
        );

        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Backwards Compatibility', () => {
    it('should still support basic data truthy check', () => {
      const residentData = createMockResidentData({
        posts: [{}]
      });

      renderWithTemplateContext(
        <Show data="posts">
          <div data-testid="content">Has posts</div>
        </Show>,
        { residentData }
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should still support when expression', () => {
      const residentData = createMockResidentData({
        posts: [{}]
      });

      renderWithTemplateContext(
        <Show when="posts">
          <div data-testid="content">Has posts</div>
        </Show>,
        { residentData }
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should still support has: prefix', () => {
      const residentData = createMockResidentData({
        capabilities: { bio: 'Test' }
      });

      renderWithTemplateContext(
        <Show when="has:capabilities.bio">
          <div data-testid="content">Has bio</div>
        </Show>,
        { residentData }
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should still support negation with !', () => {
      const residentData = createMockResidentData({
        posts: []
      });

      renderWithTemplateContext(
        <Show when="!posts">
          <div data-testid="content">No posts</div>
        </Show>,
        { residentData }
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('Real-world Use Cases', () => {
    it('should show veteran badge for users with many posts', () => {
      const residentData = createMockResidentData({
        posts: new Array(100).fill({})
      });

      renderWithTemplateContext(
        <Show data="posts.length" greaterThanOrEqual="50">
          <div data-testid="veteran-badge">⭐ Veteran Poster</div>
        </Show>,
        { residentData }
      );

      expect(screen.getByTestId('veteran-badge')).toBeInTheDocument();
    });

    it('should show admin badge for admin users', () => {
      const residentData = createMockResidentData({
        owner: { id: '1', handle: 'admin_john', displayName: 'Admin John' }
      });

      renderWithTemplateContext(
        <Show data="owner.handle" startsWith="admin">
          <div data-testid="admin-badge">🛡️ Admin</div>
        </Show>,
        { residentData }
      );

      expect(screen.getByTestId('admin-badge')).toBeInTheDocument();
    });

    it('should show complete profile message when user has both posts and bio', () => {
      const residentData = createMockResidentData({
        posts: [{}],
        capabilities: { bio: 'Developer' }
      });

      renderWithTemplateContext(
        <Show and="posts,capabilities.bio">
          <div data-testid="complete-profile">✓ Complete Profile</div>
        </Show>,
        { residentData }
      );

      expect(screen.getByTestId('complete-profile')).toBeInTheDocument();
    });
  });
});
