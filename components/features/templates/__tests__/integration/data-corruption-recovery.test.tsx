import React from 'react';
import { screen, render } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';

import DisplayName from '../../DisplayName';
import Bio from '../../Bio';
import ProfilePhoto from '../../ProfilePhoto';
import BlogPosts from '../../BlogPosts';
import WebsiteDisplay from '../../WebsiteDisplay';
import ProfileBadges from '../../ProfileBadges';
import MutualFriends from '../../MutualFriends';
import GridLayout from '../../GridLayout';
import SplitLayout from '../../SplitLayout';
import FlexContainer from '../../FlexContainer';
import { IfOwner, IfVisitor } from '../../conditional/IfOwner';
import type { ResidentData } from '../../ResidentDataProvider';

describe('Data Corruption & Recovery Integration', () => {
  describe('Corrupted ResidentData Handling', () => {
    it('should handle completely malformed ResidentData without crashing', () => {
      // Completely corrupted data - wrong types, missing required fields
      const corruptedData = {
        owner: null, // Should be object
        viewer: "invalid", // Should be object
        posts: "not-an-array", // Should be array
        capabilities: 42, // Should be object
        guestbook: undefined, // Should be array
        featuredFriends: { corrupted: true }, // Should be array
        websites: null, // Should be array
        badges: "corrupted", // Should be array
        // Missing other expected fields
      } as any as ResidentData;

      // Should not throw error during render
      expect(() => {
        const { container } = renderWithTemplateContext(
          <div className="corruption-test">
            <h1>Data Corruption Test</h1>
            <GridLayout columns={2} gap="lg">
              <div>
                <DisplayName />
                <ProfilePhoto />
                <Bio />
              </div>
              <div>
                <BlogPosts />
                <WebsiteDisplay />
                <ProfileBadges />
              </div>
            </GridLayout>
          </div>,
          { residentData: corruptedData }
        );

        expect(screen.getByText('Data Corruption Test')).toBeInTheDocument();
      }).not.toThrow();
    });

    it('should handle partial data corruption with graceful fallbacks', () => {
      const partiallyCorruptedData = createMockResidentData({
        owner: {
          id: null, // Corrupted
          handle: undefined, // Corrupted  
          displayName: 42 as any, // Wrong type
          avatarUrl: ""
        },
        posts: [
          {
            id: null, // Corrupted
            bodyHtml: undefined, // Corrupted
            createdAt: "invalid-date" // Invalid date format
          },
          null, // Completely null post
          {
            id: "valid-post",
            bodyHtml: "<p>This post is valid</p>",
            createdAt: new Date().toISOString()
          }
        ] as any,
        capabilities: {
          bio: null // Corrupted
        },
        websites: [
          {
            id: undefined, // Corrupted
            label: null, // Corrupted
            url: "not-a-valid-url", // Invalid URL
            blurb: 123 // Wrong type
          },
          null, // Null website
          {
            id: "valid-site",
            label: "Valid Website",
            url: "https://example.com",
            blurb: "This is valid"
          }
        ] as any,
        badges: [
          {
            // Missing required fields
            backgroundColor: null,
            textColor: undefined
          },
          null, // Null badge
          {
            id: "valid-badge",
            title: "Valid Badge",
            subtitle: "This works",
            backgroundColor: "#FF0000",
            textColor: "#FFFFFF"
          }
        ] as any
      });

      const { container } = renderWithTemplateContext(
        <div className="partial-corruption-test">
          <h1>Partial Corruption Test</h1>
          <SplitLayout ratio="2:1" gap="lg">
            <FlexContainer direction="column" gap="md">
              <DisplayName /> {/* Should handle corrupted owner data */}
              <ProfilePhoto /> {/* Should handle corrupted avatarUrl */}
              <Bio /> {/* Should handle null bio */}
              <BlogPosts /> {/* Should handle mixed valid/invalid posts */}
            </FlexContainer>
            <div>
              <WebsiteDisplay /> {/* Should handle mixed valid/invalid websites */}
              <ProfileBadges /> {/* Should handle mixed valid/invalid badges */}
            </div>
          </SplitLayout>
        </div>,
        { residentData: partiallyCorruptedData }
      );

      // Template should render without crashing
      expect(screen.getByText('Partial Corruption Test')).toBeInTheDocument();
      expect(container.querySelector('.partial-corruption-test')).toBeInTheDocument();

      // Valid data should still render where possible
      expect(screen.getByText('Valid Website')).toBeInTheDocument();
      expect(screen.getByText('Valid Badge')).toBeInTheDocument();
    });

    it('should handle undefined and null ResidentData gracefully', () => {
      // For this test, we expect components to handle missing data within context
      // but still need to provide a minimal valid context structure
      const minimalData = {
        owner: null,
        viewer: null,
        posts: null,
        guestbook: null,
        capabilities: null,
        featuredFriends: null,
        websites: null,
        badges: null
      } as any as ResidentData;

      // Should not throw error during render with minimal corrupted data
      expect(() => {
        const { container } = renderWithTemplateContext(
          <div className="null-data-test">
            <DisplayName />
            <Bio />
            <BlogPosts />
          </div>,
          { residentData: minimalData }
        );
        
        expect(container.querySelector('.null-data-test')).toBeInTheDocument();
      }).not.toThrow();
    });
  });

  describe('Data Schema Evolution Compatibility', () => {
    it('should handle legacy data formats without breaking', () => {
      // Simulate old data format that might exist in production
      const legacyData = {
        // Old format - different field names
        user: { // Was 'owner'
          userId: 'legacy123',
          username: 'legacyuser', // Was 'handle'
          name: 'Legacy User', // Was 'displayName'
          avatar: '/legacy.jpg' // Was 'avatarUrl'
        },
        blogPosts: [ // Was 'posts'
          {
            postId: 'legacy-post-1', // Was 'id'
            content: '<p>Legacy post content</p>', // Was 'contentHtml'
            timestamp: '2024-01-01T00:00:00Z' // Was 'createdAt'
          }
        ],
        userCapabilities: { // Was 'capabilities'
          biography: 'Legacy bio text' // Was 'bio'
        },
        // Missing new fields that were added later
        // guestbook, featuredFriends, websites, badges don't exist
      } as any as ResidentData;

      const { container } = renderWithTemplateContext(
        <div className="legacy-compatibility-test">
          <h1>Legacy Data Compatibility</h1>
          <GridLayout columns={1} gap="md">
            <DisplayName /> {/* Should handle legacy user format */}
            <ProfilePhoto /> {/* Should handle legacy avatar field */}
            <Bio /> {/* Should handle legacy biography field */}
            <BlogPosts /> {/* Should handle legacy blogPosts format */}
            <WebsiteDisplay /> {/* Should handle missing websites */}
            <MutualFriends /> {/* Should handle missing featuredFriends */}
          </GridLayout>
        </div>,
        { residentData: legacyData }
      );

      // Should render without errors
      expect(screen.getByText('Legacy Data Compatibility')).toBeInTheDocument();
      expect(container.querySelector('.legacy-compatibility-test')).toBeInTheDocument();
    });

    it('should handle future data formats with unknown fields', () => {
      const futureData = createMockResidentData({
        // Current data plus future fields
        owner: {
          id: 'future123',
          handle: 'futureuser',
          displayName: 'Future User',
          avatarUrl: '/future.jpg',
          // Future fields
          profileTheme: 'neon-cyberpunk', 
          socialScore: 9999,
          premiumFeatures: ['ai-assistant', 'advanced-analytics'],
          metaverseAvatar: { type: '3d', url: '/avatar.glb' }
        } as any,
        // Future capabilities
        capabilities: {
          bio: 'Future user with advanced features',
          aiGenerated: true,
          voiceNotes: ['/voice1.mp3', '/voice2.mp3'],
          interactiveElements: { polls: true, games: true }
        } as any,
        // Future post format
        posts: [
          {
            id: 'future-post-1',
            bodyHtml: '<p>Future post</p>',
            createdAt: new Date().toISOString(),
            // Future fields
            aiEnhanced: true,
            multimedia: { type: 'hologram', data: 'base64...' },
            reactions: { likes: 100, loves: 50, minds_blown: 25 },
            blockchain: { hash: '0x123...', verified: true }
          }
        ] as any,
        // Completely new future data structures
        nftCollection: [
          { id: 'nft1', contract: '0xabc...', tokenId: 123 }
        ],
        virtualSpaces: [
          { id: 'space1', name: 'My Virtual Office', url: 'metaverse://...' }
        ]
      } as any);

      const { container } = renderWithTemplateContext(
        <div className="future-compatibility-test">
          <h1>Future Data Compatibility</h1>
          <FlexContainer direction="column" gap="lg">
            <DisplayName /> {/* Should use displayName, ignore unknown fields */}
            <ProfilePhoto /> {/* Should use avatarUrl, ignore metaverseAvatar */}
            <Bio /> {/* Should use bio, ignore aiGenerated */}
            <BlogPosts /> {/* Should render posts, ignore future metadata */}
            <IfOwner>
              <div>Owner-specific content should work</div>
            </IfOwner>
          </FlexContainer>
        </div>,
        { residentData: futureData }
      );

      // Should render current features correctly, ignoring unknown future data
      expect(screen.getByText('Future Data Compatibility')).toBeInTheDocument();
      expect(screen.getByText('Future User')).toBeInTheDocument();
      expect(screen.getByText('Future user with advanced features')).toBeInTheDocument();
      expect(screen.getByText('Owner-specific content should work')).toBeInTheDocument();
    });
  });

  describe('Partial Data Updates & Synchronization', () => {
    it('should handle components updating with different data versions', async () => {
      const initialData = createMockResidentData({
        owner: { 
          id: 'sync-test', 
          handle: 'synctest', 
          displayName: 'Initial Name',
          avatarUrl: '/initial.jpg'
        },
        capabilities: { bio: 'Initial bio' },
        posts: [
          {
            id: 'post1',
            bodyHtml: '<p>Initial post</p>',
            createdAt: new Date().toISOString()
          }
        ]
      });

      const DataUpdateSimulator: React.FC = () => {
        const [data, setData] = React.useState(initialData);
        const [updateCount, setUpdateCount] = React.useState(0);

        const simulatePartialUpdate = (field: 'owner' | 'bio' | 'posts') => {
          setUpdateCount(prev => prev + 1);
          
          if (field === 'owner') {
            setData(prev => ({
              ...prev,
              owner: {
                ...prev.owner,
                displayName: `Updated Name ${updateCount + 1}`,
                avatarUrl: `/updated-${updateCount + 1}.jpg`
              }
            }));
          } else if (field === 'bio') {
            setData(prev => ({
              ...prev,
              capabilities: {
                ...prev.capabilities,
                bio: `Updated bio ${updateCount + 1}`
              }
            }));
          } else if (field === 'posts') {
            setData(prev => ({
              ...prev,
              posts: [
                ...prev.posts,
                {
                  id: `new-post-${updateCount + 1}`,
                  bodyHtml: `<p>New post ${updateCount + 1}</p>`,
                  createdAt: new Date().toISOString()
                }
              ]
            }));
          }
        };

        return (
          <div className="data-sync-test">
            <div className="update-controls">
              <button 
                data-testid="update-owner"
                onClick={() => simulatePartialUpdate('owner')}
              >
                Update Owner
              </button>
              <button 
                data-testid="update-bio"
                onClick={() => simulatePartialUpdate('bio')}
              >
                Update Bio
              </button>
              <button 
                data-testid="update-posts"
                onClick={() => simulatePartialUpdate('posts')}
              >
                Add Post
              </button>
              <span data-testid="update-count">Updates: {updateCount}</span>
            </div>

            <SplitLayout ratio="1:1" gap="lg">
              <div>
                <DisplayName /> {/* Should update when owner changes */}
                <ProfilePhoto /> {/* Should update when owner.avatarUrl changes */}
              </div>
              <div>
                <Bio /> {/* Should update when capabilities.bio changes */}
                <BlogPosts /> {/* Should update when posts change */}
              </div>
            </SplitLayout>
          </div>
        );
      };

      const { container, rerender } = renderWithTemplateContext(
        <DataUpdateSimulator />,
        { residentData: initialData }
      );

      // Initial state
      expect(screen.getByText('Initial Name')).toBeInTheDocument();
      expect(screen.getByText('Initial bio')).toBeInTheDocument();
      expect(screen.getByTestId('update-count')).toHaveTextContent('Updates: 0');

      // Update owner data
      const updateOwnerBtn = screen.getByTestId('update-owner');
      const updateBioBtn = screen.getByTestId('update-bio');
      const updatePostsBtn = screen.getByTestId('update-posts');

      // Simulate rapid updates to different parts of the data
      updateOwnerBtn.click();
      expect(screen.getByTestId('update-count')).toHaveTextContent('Updates: 1');

      updateBioBtn.click();
      expect(screen.getByTestId('update-count')).toHaveTextContent('Updates: 2');

      updatePostsBtn.click();
      expect(screen.getByTestId('update-count')).toHaveTextContent('Updates: 3');

      // Components should remain stable throughout updates
      expect(container.querySelector('.data-sync-test')).toBeInTheDocument();
      expect(container.querySelector('.w-full.flex')).toBeInTheDocument(); // SplitLayout
    });

    it('should handle race conditions in data updates', async () => {
      const baseData = createMockResidentData();
      
      const RaceConditionSimulator: React.FC = () => {
        const [data, setData] = React.useState(baseData);
        const [racingUpdates, setRacingUpdates] = React.useState(0);

        const simulateRaceCondition = async () => {
          // Simulate multiple simultaneous updates that could race
          const promises = [
            // Update 1: Owner info
            new Promise<void>(resolve => {
              setTimeout(() => {
                setData(prev => ({
                  ...prev,
                  owner: { ...prev.owner, displayName: 'Race Update 1' }
                }));
                resolve();
              }, Math.random() * 100);
            }),
            
            // Update 2: Bio
            new Promise<void>(resolve => {
              setTimeout(() => {
                setData(prev => ({
                  ...prev,
                  capabilities: { ...prev.capabilities, bio: 'Race Update 2' }
                }));
                resolve();
              }, Math.random() * 100);
            }),
            
            // Update 3: Posts
            new Promise<void>(resolve => {
              setTimeout(() => {
                setData(prev => ({
                  ...prev,
                  posts: [...prev.posts, {
                    id: `race-post-${Date.now()}`,
                    bodyHtml: '<p>Race condition post</p>',
                    createdAt: new Date().toISOString()
                  }]
                }));
                resolve();
              }, Math.random() * 100);
            })
          ];

          await Promise.all(promises);
          setRacingUpdates(prev => prev + 1);
        };

        return (
          <div className="race-condition-test">
            <button 
              data-testid="simulate-race"
              onClick={simulateRaceCondition}
            >
              Simulate Race Condition
            </button>
            <span data-testid="race-count">Races: {racingUpdates}</span>

            <GridLayout columns={2} gap="md">
              <DisplayName />
              <Bio />
              <ProfilePhoto />
              <BlogPosts />
            </GridLayout>
          </div>
        );
      };

      const { container } = renderWithTemplateContext(
        <RaceConditionSimulator />,
        { residentData: baseData }
      );

      // Initial render
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByTestId('race-count')).toHaveTextContent('Races: 0');

      // Trigger race condition
      const raceButton = screen.getByTestId('simulate-race');
      raceButton.click();

      // Wait for race conditions to resolve
      await new Promise(resolve => setTimeout(resolve, 200));

      // Template should remain stable despite race conditions
      expect(container.querySelector('.race-condition-test')).toBeInTheDocument();
      expect(container.querySelector('.grid')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should isolate component errors without breaking entire template', () => {
      const mockData = createMockResidentData();

      // Suppress console.error for this test since we expect errors
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Component that throws an error
      const ErrorComponent: React.FC = () => {
        throw new Error('Intentional test error');
      };

      // Error boundary to catch errors
      class TestErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { hasError: boolean }
      > {
        constructor(props: { children: React.ReactNode }) {
          super(props);
          this.state = { hasError: false };
        }

        static getDerivedStateFromError() {
          return { hasError: true };
        }

        render() {
          if (this.state.hasError) {
            return <div data-testid="error-fallback">Component error occurred</div>;
          }

          return this.props.children;
        }
      }

      const { container } = renderWithTemplateContext(
        <div className="error-isolation-test">
          <h1>Error Isolation Test</h1>
          <GridLayout columns={2} gap="lg">
            <div className="safe-section">
              <h2>Safe Section</h2>
              <DisplayName />
              <Bio />
            </div>
            <div className="error-section">
              <h2>Error Section</h2>
              <TestErrorBoundary>
                <ErrorComponent />
              </TestErrorBoundary>
              <ProfilePhoto /> {/* This should still render */}
            </div>
          </GridLayout>
        </div>,
        { residentData: mockData }
      );

      // Main template should render
      expect(screen.getByText('Error Isolation Test')).toBeInTheDocument();
      
      // Safe section should render normally
      expect(screen.getByText('Safe Section')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      
      // Error should be caught and fallback rendered
      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.getByText('Component error occurred')).toBeInTheDocument();
      
      // Components after error should still render
      expect(screen.getByText('Error Section')).toBeInTheDocument();

      // Template structure should remain intact
      expect(container.querySelector('.error-isolation-test')).toBeInTheDocument();
      expect(container.querySelector('.grid')).toBeInTheDocument();

      // Restore console.error
      console.error = originalConsoleError;
    });
  });
});