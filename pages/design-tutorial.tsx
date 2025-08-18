import React, { useState, useEffect } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";

// Import layout components
import FlexContainer from "@/components/template/FlexContainer";
import GridLayout from "@/components/template/GridLayout";
import SplitLayout from "@/components/template/SplitLayout";
import CenteredBox from "@/components/template/CenteredBox";

// Import visual components
import GradientBox from "@/components/template/GradientBox";
import NeonBorder from "@/components/template/NeonBorder";
import RetroTerminal from "@/components/template/RetroTerminal";
import PolaroidFrame from "@/components/template/PolaroidFrame";
import StickyNote from "@/components/template/StickyNote";

// Import interactive components
import RevealBox from "@/components/template/RevealBox";
import WaveText from "@/components/template/WaveText";
import GlitchText from "@/components/template/GlitchText";

// Import social components (they need ResidentDataProvider)
import { ResidentDataProvider } from "@/components/template/ResidentDataProvider";
import FriendBadge from "@/components/template/FriendBadge";

// Import conditional components
import Show from "@/components/template/conditional/Show";
import Choose, { When, Otherwise } from "@/components/template/conditional/Choose";
import IfOwner, { IfVisitor } from "@/components/template/conditional/IfOwner";

// Import image component
import UserImage from "@/components/template/UserImage";

// Import documentation helpers
import { generateAllComponentDocs, getAvailableDataFields, type ComponentDocumentation, type DataField } from "@/lib/component-docs";

export default function DesignTutorialPage() {
  const [activeCategory, setActiveCategory] = useState('layout');
  const [activeExample, setActiveExample] = useState(0);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showDataReference, setShowDataReference] = useState(false);

  // Mock data for components that need ResidentDataProvider
  const mockResidentData = {
    owner: {
      id: "demo-user",
      handle: "demo@example.com",
      displayName: "Demo User",
      avatarUrl: "/assets/default-avatar.gif"
    },
    viewer: {
      id: "viewer-123"
    },
    posts: [],
    guestbook: [],
    featuredFriends: [
      {
        id: "friend1",
        handle: "alice",
        displayName: "Alice Smith",
        avatarUrl: "/assets/default-avatar.gif"
      },
      {
        id: "friend2", 
        handle: "bob",
        displayName: "Bob Johnson",
        avatarUrl: "/assets/default-avatar.gif"
      }
    ],
    websites: [
      {
        id: "site1",
        label: "My Portfolio",
        url: "https://example.com",
        blurb: "Check out my work!"
      }
    ],
    images: [
      {
        id: "img1",
        url: "https://picsum.photos/300/200?random=1",
        alt: "Sample image 1",
        caption: "Beautiful landscape",
        createdAt: new Date().toISOString()
      },
      {
        id: "img2", 
        url: "https://picsum.photos/300/200?random=2",
        alt: "Sample image 2",
        caption: "City view",
        createdAt: new Date().toISOString()
      }
    ],
    profileImages: [
      {
        id: "profile1",
        url: "https://picsum.photos/150/150?random=3",
        alt: "Profile banner",
        type: "banner" as const
      }
    ]
  };

  // Generate component documentation
  const allComponentDocs = generateAllComponentDocs();
  const availableDataFields = getAvailableDataFields();

  // Group components by category
  const categorizedComponents = allComponentDocs.reduce((acc, component) => {
    if (!acc[component.category]) {
      acc[component.category] = [];
    }
    acc[component.category].push(component);
    return acc;
  }, {} as Record<string, ComponentDocumentation[]>);

  // Get current user for edit link
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.loggedIn && data.user?.primaryHandle) {
          const username = data.user.primaryHandle.split('@')[0];
          setCurrentUser(username);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Render detailed component information with props
  const renderComponentInfo = (component: ComponentDocumentation) => {
    return (
      <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Component Info */}
          <div>
            <h3 className="text-xl font-bold text-purple-600 mb-2">
              &lt;{component.name} /&gt;
            </h3>
            <p className="text-gray-700 mb-4">{component.description}</p>
            
            {/* Props Documentation */}
            {component.props.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">Props:</h4>
                <div className="space-y-2">
                  {component.props.map((prop, propIndex) => (
                    <div key={propIndex} className="bg-gray-50 rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono text-purple-600">{prop.name}</code>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          prop.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {prop.type}{prop.required ? ' (required)' : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{prop.description}</p>
                      {prop.values && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {prop.values.map((value, valueIndex) => (
                            <span key={valueIndex} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              {value}
                            </span>
                          ))}
                        </div>
                      )}
                      {prop.default !== undefined && (
                        <p className="text-xs text-gray-500">Default: <code>{String(prop.default)}</code></p>
                      )}
                      {prop.constraints && (
                        <p className="text-xs text-gray-500">{prop.constraints}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-green-400 text-sm">
                <code>{component.example}</code>
              </pre>
            </div>
          </div>
          
          {/* Live Preview */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">🔥 Live Preview</h4>
            {renderComponentPreview(component.name)}
          </div>
        </div>
      </div>
    );
  };

  // Component preview renderer
  const renderComponentPreview = (componentName: string) => {
    const previewStyle = "border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[120px] flex items-center justify-center";
    
    switch (componentName) {
      case "FlexContainer":
        return (
          <div className={previewStyle}>
            <FlexContainer direction="row" justify="between" gap="md">
              <div className="bg-blue-200 p-2 rounded">Item 1</div>
              <div className="bg-green-200 p-2 rounded">Item 2</div>
              <div className="bg-purple-200 p-2 rounded">Item 3</div>
            </FlexContainer>
          </div>
        );
      case "GridLayout":
        return (
          <div className={previewStyle}>
            <GridLayout columns={3} gap="sm">
              <div className="bg-red-200 p-2 rounded text-center">A</div>
              <div className="bg-yellow-200 p-2 rounded text-center">B</div>
              <div className="bg-blue-200 p-2 rounded text-center">C</div>
            </GridLayout>
          </div>
        );
      case "SplitLayout":
        return (
          <div className={previewStyle}>
            <SplitLayout ratio="2:1" gap="md">
              <div className="bg-indigo-200 p-3 rounded">Main Content (2/3)</div>
              <div className="bg-pink-200 p-3 rounded">Sidebar (1/3)</div>
            </SplitLayout>
          </div>
        );
      case "CenteredBox":
        return (
          <div className={previewStyle}>
            <CenteredBox maxWidth="md" padding="md">
              <div className="bg-cyan-200 p-2 rounded text-center">Centered Content</div>
            </CenteredBox>
          </div>
        );
      case "GradientBox":
        return (
          <div className={previewStyle}>
            <GradientBox gradient="sunset" direction="br" padding="md">
              <div className="text-white font-bold">Beautiful Gradient!</div>
            </GradientBox>
          </div>
        );
      case "NeonBorder":
        return (
          <div className={previewStyle + " bg-gray-900"}>
            <NeonBorder color="cyan" intensity="medium" padding="md">
              <div className="text-white">Glowing Border Effect</div>
            </NeonBorder>
          </div>
        );
      case "RetroTerminal":
        return (
          <div className={previewStyle}>
            <RetroTerminal variant="green" showHeader={true} padding="sm">
              <div>$ echo &quot;Hello World&quot;</div>
              <div>Hello World</div>
            </RetroTerminal>
          </div>
        );
      case "PolaroidFrame":
        return (
          <div className={previewStyle}>
            <PolaroidFrame caption="Demo Photo" rotation={3}>
              <div className="w-24 h-16 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs">
                📷 Photo
              </div>
            </PolaroidFrame>
          </div>
        );
      case "StickyNote":
        return (
          <div className={previewStyle}>
            <StickyNote color="yellow" size="md" rotation={-2}>
              <div className="text-sm">
                <div>📝 Reminder:</div>
                <div>Don&apos;t forget!</div>
              </div>
            </StickyNote>
          </div>
        );
      case "RevealBox":
        return (
          <div className={previewStyle}>
            <RevealBox buttonText="Click me!" variant="fade" buttonStyle="button">
              <div className="bg-green-200 p-2 rounded mt-2">🎉 Surprise content!</div>
            </RevealBox>
          </div>
        );
      case "FloatingBadge":
        return (
          <div className={`${previewStyle} relative overflow-hidden`}>
            <div className="text-center">Component preview area</div>
            <div className="absolute top-2 right-2">
              <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                NEW!
              </div>
            </div>
          </div>
        );
      case "WaveText":
        return (
          <div className={previewStyle}>
            <WaveText text="Hello World!" speed="medium" amplitude="medium" />
          </div>
        );
      case "GlitchText":
        return (
          <div className={previewStyle}>
            <GlitchText text="GLITCH" intensity="medium" />
          </div>
        );
      case "FriendBadge":
        return (
          <div className={previewStyle}>
            <ResidentDataProvider data={mockResidentData}>
              <FriendBadge />
            </ResidentDataProvider>
          </div>
        );
      case "Show":
        return (
          <div className={previewStyle}>
            <ResidentDataProvider data={mockResidentData}>
              <Show data="featuredFriends">
                <div className="bg-green-200 p-2 rounded text-sm">✅ User has friends!</div>
              </Show>
              <Show data="posts.length" equals="0">
                <div className="bg-yellow-200 p-2 rounded text-sm">⚠️ No posts found</div>
              </Show>
            </ResidentDataProvider>
          </div>
        );
      case "Choose":
        return (
          <div className={previewStyle}>
            <ResidentDataProvider data={mockResidentData}>
              <Choose>
                <When data="featuredFriends">
                  <div className="bg-blue-200 p-2 rounded text-sm">📱 Has friends</div>
                </When>
                <When data="posts">
                  <div className="bg-purple-200 p-2 rounded text-sm">📝 Has posts</div>
                </When>
                <Otherwise>
                  <div className="bg-gray-200 p-2 rounded text-sm">📭 Nothing to show</div>
                </Otherwise>
              </Choose>
            </ResidentDataProvider>
          </div>
        );
      case "IfOwner":
        return (
          <div className={previewStyle}>
            <ResidentDataProvider data={{...mockResidentData, viewer: { id: "demo-user" }}}>
              <IfOwner>
                <div className="bg-blue-200 p-2 rounded text-sm">👑 Owner content</div>
              </IfOwner>
            </ResidentDataProvider>
          </div>
        );
      case "IfVisitor":
        return (
          <div className={previewStyle}>
            <ResidentDataProvider data={mockResidentData}>
              <IfVisitor>
                <div className="bg-green-200 p-2 rounded text-sm">👋 Visitor content</div>
              </IfVisitor>
            </ResidentDataProvider>
          </div>
        );
      case "Image":
        return (
          <div className={previewStyle}>
            <ResidentDataProvider data={mockResidentData}>
              <div className="space-y-2">
                <UserImage src="https://picsum.photos/100/100?random=4" alt="External image" size="sm" rounded="md" />
                <UserImage data="images" alt="User image" size="sm" rounded="full" border={true} />
              </div>
            </ResidentDataProvider>
          </div>
        );
      case "SiteBranding":
        return (
          <div className={previewStyle}>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">Site Name</div>
              <div className="text-sm text-gray-600">Site tagline</div>
            </div>
          </div>
        );
      case "NavigationLinks":
        return (
          <div className={previewStyle}>
            <div className="flex gap-4 text-sm">
              <span className="text-purple-600 font-medium">Home</span>
              <span className="text-purple-600 font-medium">Feed</span>
              <span className="text-purple-600 font-medium">Directory</span>
            </div>
          </div>
        );
      case "Breadcrumb":
        return (
          <div className={previewStyle}>
            <div className="text-sm text-gray-600">
              Home › Profile › Edit
            </div>
          </div>
        );
      case "NotificationCenter":
        return (
          <div className={previewStyle}>
            <div className="flex items-center gap-2">
              <span>🔔</span>
              <span className="text-sm">Notification Center</span>
            </div>
          </div>
        );
      case "NotificationBell":
        return (
          <div className={previewStyle}>
            <div className="relative">
              <span className="text-xl">🔔</span>
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                3
              </div>
            </div>
          </div>
        );
      case "UserAccount":
        return (
          <div className={previewStyle}>
            <div className="text-sm bg-blue-100 px-3 py-1 rounded">
              Account Controls
            </div>
          </div>
        );
      case "FollowButton":
        return (
          <div className={previewStyle}>
            <div className="bg-blue-500 text-white px-4 py-2 rounded text-sm">
              Follow
            </div>
          </div>
        );
      case "MutualFriends":
        return (
          <div className={previewStyle}>
            <div className="bg-blue-200 border border-black px-2 py-1 text-xs rounded flex items-center gap-1">
              <span>🫂</span>
              <span>Mutual friends: 5</span>
            </div>
          </div>
        );
      case "FriendDisplay":
        return (
          <div className={previewStyle}>
            <div className="text-sm">
              <div className="font-bold mb-2">Friends</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-100 p-2 rounded text-xs">Friend 1</div>
                <div className="bg-gray-100 p-2 rounded text-xs">Friend 2</div>
              </div>
            </div>
          </div>
        );
      case "WebsiteDisplay":
        return (
          <div className={previewStyle}>
            <div className="text-sm">
              <div className="font-bold mb-2">Websites</div>
              <div className="border-l-4 border-blue-400 pl-2">
                <div className="text-blue-600 font-semibold">My Portfolio</div>
                <div className="text-xs text-gray-500">example.com</div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className={`${previewStyle} text-gray-500`}>
            Preview not available
          </div>
        );
    }
  };

  const categories = {
    layout: {
      title: "🏗️ Layout Components",
      description: "Structure and organize your content",
      components: [
        {
          name: "FlexContainer",
          description: "Flexible box layouts with customizable direction, alignment, and spacing",
          props: ["direction", "align", "justify", "wrap", "gap"],
          example: `<FlexContainer direction="row" justify="between" gap="lg">
  <div>Left content</div>
  <div>Right content</div>
</FlexContainer>`
        },
        {
          name: "GridLayout",
          description: "Responsive CSS grids with configurable columns",
          props: ["columns", "gap", "responsive"],
          example: `<GridLayout columns="3" gap="md" responsive="true">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</GridLayout>`
        },
        {
          name: "SplitLayout",
          description: "Two-panel layouts with adjustable ratios",
          props: ["ratio", "vertical", "gap"],
          example: `<SplitLayout ratio="2:1" gap="lg">
  <div>Main content (2/3)</div>
  <div>Sidebar (1/3)</div>
</SplitLayout>`
        },
        {
          name: "CenteredBox",
          description: "Perfect centering with optional max-width",
          props: ["maxWidth", "padding"],
          example: `<CenteredBox maxWidth="lg" padding="xl">
  <h1>Centered Content</h1>
</CenteredBox>`
        }
      ]
    },
    visual: {
      title: "🎨 Visual Components",
      description: "Add style and personality to your content",
      components: [
        {
          name: "GradientBox",
          description: "Beautiful gradient backgrounds in various styles",
          props: ["gradient", "direction", "padding", "rounded"],
          example: `<GradientBox gradient="sunset" direction="br" padding="lg">
  <h2>Beautiful Gradient Background</h2>
</GradientBox>`
        },
        {
          name: "NeonBorder",
          description: "Glowing animated neon borders",
          props: ["color", "intensity", "padding", "rounded"],
          example: `<NeonBorder color="pink" intensity="bright" padding="md">
  <p>Glowing neon content!</p>
</NeonBorder>`
        },
        {
          name: "RetroTerminal",
          description: "Old-school computer terminal styling",
          props: ["variant", "showHeader", "padding"],
          example: `<RetroTerminal variant="green" showHeader="true">
  <p>$ echo "Hello World"</p>
  <p>Hello World</p>
</RetroTerminal>`
        },
        {
          name: "PolaroidFrame",
          description: "Photo-style frames with captions and rotation",
          props: ["caption", "rotation", "shadow"],
          example: `<PolaroidFrame caption="Summer 2024" rotation="3" shadow="true">
  <img src="/photo.jpg" alt="Memory" />
</PolaroidFrame>`
        },
        {
          name: "StickyNote",
          description: "Post-it note styling in various colors",
          props: ["color", "size", "rotation"],
          example: `<StickyNote color="yellow" size="md" rotation="-2">
  <p>Don't forget to...</p>
</StickyNote>`
        }
      ]
    },
    interactive: {
      title: "⚡ Interactive Components",
      description: "Add dynamic effects and animations",
      components: [
        {
          name: "RevealBox",
          description: "Click-to-reveal content with animations",
          props: ["buttonText", "revealText", "variant", "buttonStyle"],
          example: `<RevealBox buttonText="Click me!" variant="fade">
  <p>Hidden content revealed!</p>
</RevealBox>`
        },
        {
          name: "FloatingBadge",
          description: "Animated floating badges",
          props: ["color", "size", "animation", "position"],
          example: `<FloatingBadge color="red" animation="bounce" position="top-right">
  New!
</FloatingBadge>`
        },
        {
          name: "WaveText",
          description: "Animated wavy text effect",
          props: ["text", "speed", "amplitude", "color"],
          example: `<WaveText text="Welcome!" speed="medium" amplitude="large" />`
        },
        {
          name: "GlitchText",
          description: "Retro glitch text effects",
          props: ["text", "intensity", "color", "glitchColor1", "glitchColor2"],
          example: `<GlitchText text="SYSTEM ERROR" intensity="high" />`
        }
      ]
    },
    social: {
      title: "👥 Social Components",
      description: "Display social connections and interactions",
      components: [
        {
          name: "FollowButton",
          description: "Follow button for the current profile owner",
          props: [],
          example: `<FollowButton />`
        },
        {
          name: "MutualFriends",
          description: "Shows mutual friends with the viewer",
          props: [],
          example: `<MutualFriends />`
        },
        {
          name: "FriendDisplay",
          description: "Grid of featured friends",
          props: [],
          example: `<FriendDisplay />`
        },
        {
          name: "WebsiteDisplay",
          description: "Recommended websites list",
          props: [],
          example: `<WebsiteDisplay />`
        },
        {
          name: "FriendBadge",
          description: "Simple friend status indicator",
          props: [],
          example: `<FriendBadge />`
        }
      ]
    },
    conditional: {
      title: "🔀 Conditional Components",
      description: "Show/hide content based on user data and preferences",
      components: [
        {
          name: "Show",
          description: "Display content based on data conditions",
          props: ["when", "data", "equals", "exists"],
          example: `<Show data="posts">
  <h3>My Posts</h3>
  <BlogPosts limit="5" />
</Show>

<Show data="posts.length" equals="0">
  <p>No posts yet!</p>
</Show>`
        },
        {
          name: "Choose",
          description: "Multi-condition rendering with fallbacks",
          props: [],
          example: `<Choose>
  <When data="posts">
    <BlogPosts limit="3" />
  </When>
  <When data="guestbook">
    <Guestbook />
  </When>
  <Otherwise>
    <p>Welcome to my profile!</p>
  </Otherwise>
</Choose>`
        },
        {
          name: "IfOwner",
          description: "Show content only to the profile owner",
          props: [],
          example: `<IfOwner>
  <p>This is your profile!</p>
  <FollowButton />
</IfOwner>`
        },
        {
          name: "IfVisitor",
          description: "Show content only to visitors (not owner)",
          props: [],
          example: `<IfVisitor>
  <p>Welcome! Sign my guestbook!</p>
  <Guestbook />
</IfVisitor>`
        }
      ]
    },
    navigation: {
      title: "🧭 Navigation Components",
      description: "Site navigation and user interface elements",
      components: [
        {
          name: "SiteBranding",
          description: "Site name and tagline",
          props: [],
          example: `<SiteBranding />`
        },
        {
          name: "NavigationLinks",
          description: "Main site navigation menu",
          props: [],
          example: `<NavigationLinks />`
        },
        {
          name: "Breadcrumb",
          description: "Auto-generated breadcrumb navigation",
          props: [],
          example: `<Breadcrumb />`
        },
        {
          name: "NotificationCenter",
          description: "Full notification dropdown",
          props: [],
          example: `<NotificationCenter />`
        },
        {
          name: "NotificationBell",
          description: "Simple notification bell with count",
          props: [],
          example: `<NotificationBell />`
        },
        {
          name: "UserAccount",
          description: "Login/user account controls",
          props: [],
          example: `<UserAccount />`
        }
      ]
    }
  };

  const examples = [
    {
      title: "Hero Section with Gradient",
      description: "Create a stunning hero section with gradients and animated text",
      code: `<GradientBox gradient="neon" direction="br" padding="xl">
  <CenteredBox maxWidth="lg">
    <WaveText text="Welcome to My Profile!" speed="medium" />
    <p>Discover amazing content and connect with me!</p>
    <FollowButton />
  </CenteredBox>
</GradientBox>`
    },
    {
      title: "Terminal-Style About Section",
      description: "Retro terminal design with glitch effects",
      code: `<RetroTerminal variant="green" showHeader="true">
  <GlitchText text="SYSTEM STATUS: ONLINE" intensity="medium" />
  <p>$ whoami</p>
  <p>Creative developer and digital artist</p>
  <p>$ ls -la skills/</p>
  <p>React, TypeScript, Design, Photography</p>
</RetroTerminal>`
    },
    {
      title: "Social Grid Layout",
      description: "Organize social elements in a responsive grid",
      code: `<GridLayout columns="2" gap="lg" responsive="true">
  <div>
    <h3>Friends</h3>
    <FriendDisplay />
  </div>
  <div>
    <h3>Connections</h3>
    <MutualFriends />
  </div>
  <div>
    <h3>Websites</h3>
    <WebsiteDisplay />
  </div>
  <div>
    <StickyNote color="pink" rotation="5">
      Thanks for visiting! 💕
    </StickyNote>
  </div>
</GridLayout>`
    },
    {
      title: "Interactive Memory Wall",
      description: "Polaroid-style photo gallery with reveal boxes",
      code: `<FlexContainer direction="row" wrap="true" gap="md" justify="center">
  <PolaroidFrame caption="Summer 2023" rotation="2">
    <img src="/photo1.jpg" alt="Memory" />
  </PolaroidFrame>
  <PolaroidFrame caption="Concert" rotation="-3">
    <img src="/photo2.jpg" alt="Concert" />
  </PolaroidFrame>
  <RevealBox buttonText="More photos..." variant="grow">
    <PolaroidFrame caption="Hidden gem" rotation="1">
      <img src="/photo3.jpg" alt="Secret" />
    </PolaroidFrame>
  </RevealBox>
</FlexContainer>`
    },
    {
      title: "Neon Gaming Setup",
      description: "Cyberpunk-style layout with neon borders",
      code: `<SplitLayout ratio="2:1" gap="lg">
  <NeonBorder color="cyan" intensity="bright">
    <h2>Gaming Setup</h2>
    <p>Check out my latest streaming setup!</p>
  </NeonBorder>
  <div>
    <FloatingBadge color="green" animation="pulse" position="top-right">
      LIVE
    </FloatingBadge>
    <NeonBorder color="purple" intensity="medium">
      <p>Currently playing: Cyberpunk 2077</p>
    </NeonBorder>
  </div>
</SplitLayout>`
    },
    {
      title: "Smart Profile Layout",
      description: "Dynamic layout that adapts based on available content",
      code: `<div>
  <ProfileHero variant="tape" />
  
  <Choose>
    <When data="capabilities.bio">
      <Bio />
    </When>
    <Otherwise>
      <IfOwner>
        <StickyNote color="yellow" rotation="2">
          Add a bio to tell visitors about yourself!
        </StickyNote>
      </IfOwner>
    </Otherwise>
  </Choose>
  
  <Show data="posts">
    <h2>Recent Posts</h2>
    <BlogPosts limit="3" />
  </Show>
  
  <IfVisitor>
    <Show data="guestbook">
      <GradientBox gradient="ocean" padding="md">
        <h2>Guestbook</h2>
        <Guestbook />
      </GradientBox>
    </Show>
  </IfVisitor>
</div>`
    },
    {
      title: "Conditional Content Showcase",
      description: "Different layouts for users with different content types",
      code: `<Choose>
  <When data="featuredFriends">
    <SplitLayout ratio="2:1" gap="lg">
      <div>
        <Show data="posts">
          <BlogPosts limit="5" />
        </Show>
      </div>
      <div>
        <h3>Featured Friends</h3>
        <FriendDisplay />
        
        <Show data="websites">
          <div className="mt-4">
            <h4>My Websites</h4>
            <WebsiteDisplay />
          </div>
        </Show>
      </div>
    </SplitLayout>
  </When>
  <When data="posts">
    <CenteredBox maxWidth="lg">
      <BlogPosts limit="5" />
      <IfVisitor>
        <RevealBox buttonText="More about me...">
          <p>Thanks for reading my posts!</p>
        </RevealBox>
      </IfVisitor>
    </CenteredBox>
  </When>
  <Otherwise>
    <CenteredBox maxWidth="md">
      <WaveText text="Welcome!" />
      <p>This profile is just getting started!</p>
      <IfOwner>
        <p>Start by adding some posts or customizing your bio.</p>
      </IfOwner>
    </CenteredBox>
  </Otherwise>
</Choose>`
    },
    {
      title: "Image Gallery Layout",
      description: "Showcase user images with conditional display",
      code: `<div>
  <h2>My Photo Gallery</h2>
  
  <Show data="images">
    <GridLayout columns="3" gap="sm" responsive="true">
      <Image data="images" alt="Gallery image" size="full" rounded="lg" shadow="md" />
      <Image src="https://example.com/photo1.jpg" alt="External photo" size="full" rounded="lg" shadow="md" />
      <RevealBox buttonText="More photos..." variant="fade">
        <Image data="profileImages" alt="Profile image" size="full" rounded="lg" />
      </RevealBox>
    </GridLayout>
  </Show>
  
  <Show data="images.length" equals="0">
    <CenteredBox maxWidth="md" padding="lg">
      <StickyNote color="blue" rotation="2">
        No photos yet! Upload some images to get started.
      </StickyNote>
    </CenteredBox>
  </Show>
</div>`
    }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              🎨 Design Tutorial
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Learn how to use our powerful template components to create stunning, unique profile pages. 
              Mix and match these components to express your creativity!
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {Object.keys(categorizedComponents).map((categoryKey) => {
              const categoryTitles: Record<string, string> = {
                layout: '🏗️ Layout Components',
                visual: '🎨 Visual Components', 
                interactive: '⚡ Interactive Components',
                social: '👥 Social Components',
                conditional: '🔀 Conditional Components',
                navigation: '🧭 Navigation Components'
              };
              
              return (
                <button
                  key={categoryKey}
                  onClick={() => setActiveCategory(categoryKey)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    activeCategory === categoryKey
                      ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                      : 'bg-white text-gray-700 hover:bg-purple-100 shadow-md'
                  }`}
                >
                  {categoryTitles[categoryKey] || categoryKey}
                </button>
              );
            })}
            <button
              onClick={() => setShowDataReference(!showDataReference)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                showDataReference
                  ? 'bg-green-600 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-green-100 shadow-md'
              }`}
            >
              📊 Data Reference
            </button>
          </div>

          {/* Component Reference or Data Reference */}
          {showDataReference ? (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">📊 Available Data for Conditionals</h2>
                <p className="text-gray-600 text-lg">
                  Reference for data paths you can use with conditional components like Show, When, and Choose.
                </p>
              </div>

              <div className="grid gap-4">
                {availableDataFields.map((field, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-lg font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {field.path}
                      </code>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                        {field.type}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{field.description}</p>
                    <div className="bg-gray-900 rounded p-3">
                      <pre className="text-green-400 text-sm">
                        <code>{`<Show data="${field.example}">\n  Content shown when ${field.path} exists\n</Show>`}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <h3 className="text-xl font-bold text-blue-800 mb-3">💡 Conditional Examples</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Existence Checks:</h4>
                    <ul className="space-y-1 text-blue-700">
                      <li><code>data=&quot;posts&quot;</code> - Shows if user has any posts</li>
                      <li><code>data=&quot;capabilities.bio&quot;</code> - Shows if user has a bio</li>
                      <li><code>data=&quot;featuredFriends&quot;</code> - Shows if user has featured friends</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Value Comparisons:</h4>
                    <ul className="space-y-1 text-blue-700">
                      <li><code>data=&quot;posts.length&quot; equals=&quot;0&quot;</code> - Shows if no posts</li>
                      <li><code>data=&quot;owner.handle&quot; equals=&quot;john&quot;</code> - Shows for specific user</li>
                      <li><code>data=&quot;viewer.id&quot; equals=&quot;null&quot;</code> - Shows for anonymous visitors</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {Object.keys(categorizedComponents).includes(activeCategory) ? 
                    `${activeCategory.charAt(0).toUpperCase()}${activeCategory.slice(1)} Components` : 
                    'Components'
                  }
                </h2>
                <p className="text-gray-600 text-lg">
                  {activeCategory === 'layout' && 'Structure and organize your content'}
                  {activeCategory === 'visual' && 'Add style and personality to your content'}
                  {activeCategory === 'interactive' && 'Add dynamic effects and animations'}
                  {activeCategory === 'social' && 'Display social connections and interactions'}
                  {activeCategory === 'conditional' && 'Show/hide content based on user data and preferences'}
                  {activeCategory === 'navigation' && 'Site navigation and user interface elements'}
                </p>
              </div>

              <div className="grid gap-6">
                {categorizedComponents[activeCategory]?.map((component, index) => 
                  <div key={component.name || index}>
                    {renderComponentInfo(component)}
                  </div>
                ) || <p className="text-gray-500">No components found in this category.</p>}
              </div>
            </div>
          )}

          {/* Examples Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              🚀 Creative Examples
            </h2>
            <p className="text-gray-600 mb-8">
              See how you can combine multiple components to create amazing layouts and effects.
            </p>

            {/* Example Navigation */}
            <div className="flex flex-wrap gap-2 mb-6">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setActiveExample(index)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeExample === index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                  }`}
                >
                  {example.title}
                </button>
              ))}
            </div>

            {/* Active Example */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {examples[activeExample].title}
              </h3>
              <p className="text-gray-600 mb-4">
                {examples[activeExample].description}
              </p>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-green-400 text-sm">
                  <code>{examples[activeExample].code}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-8 mt-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">💡 Pro Tips</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="font-bold text-lg mb-2">🎨 Color Harmony</h3>
                <p className="text-gray-700">
                  Use consistent color schemes across components. If you use a blue gradient, 
                  consider blue neon borders or blue badges for cohesion.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="font-bold text-lg mb-2">📱 Mobile First</h3>
                <p className="text-gray-700">
                  Test your designs on different screen sizes. Use responsive grid layouts 
                  and appropriate padding for mobile devices.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="font-bold text-lg mb-2">⚡ Performance</h3>
                <p className="text-gray-700">
                  Animated components like GlitchText and WaveText are eye-catching, 
                  but use them sparingly to maintain good performance.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="font-bold text-lg mb-2">🎯 Purpose</h3>
                <p className="text-gray-700">
                  Every component should serve a purpose. Use visual effects to enhance 
                  your content, not distract from it.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="font-bold text-lg mb-2">🔀 Smart Conditionals</h3>
                <p className="text-gray-700">
                  Use conditional components to create personalized experiences. Show different 
                  content to visitors vs. owners, or adapt layouts based on available data.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="font-bold text-lg mb-2">🎨 Progressive Enhancement</h3>
                <p className="text-gray-700">
                  Start with basic content, then use Show/Choose components to enhance the 
                  experience when users have more data like posts, friends, or bio content.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 p-6 bg-white rounded-xl shadow-md">
            <h3 className="text-xl font-bold mb-2">Ready to Create?</h3>
            <p className="text-gray-600 mb-4">
              Head over to your profile editor and start building your unique page!
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {currentUser ? (
                <Link 
                  href={`/resident/${currentUser}/edit`}
                  className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  🎨 Start Designing
                </Link>
              ) : (
                <Link 
                  href="/identity"
                  className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  🔐 Login to Design
                </Link>
              )}
              <Link 
                href="/template-selector-test"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                🧪 Test Templates
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}