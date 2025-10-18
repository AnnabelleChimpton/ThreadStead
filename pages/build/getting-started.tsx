import { useState } from "react";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import Link from "next/link";
import FeatureGate, { NewUserTooltip } from "@/components/features/onboarding/FeatureGate";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface GettingStartedProps {
  siteConfig: SiteConfig;
}

export default function GettingStarted({ siteConfig }: GettingStartedProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "visual-builder" | "threadrings" | "profiles" | "pixel-homes" | "social" | "content">("overview");
  const { user } = useCurrentUser();

  const TabButton = ({ 
    tabId, 
    label, 
    icon 
  }: { 
    tabId: typeof activeTab;
    label: string;
    icon: string;
  }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`px-3 py-2 text-sm border border-black font-medium transition-all ${
        activeTab === tabId
          ? "bg-yellow-200 text-black shadow-[3px_3px_0_#000]"
          : "bg-white hover:bg-gray-50 text-gray-700 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000]"
      }`}
    >
      <span className="mr-1">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{icon}</span>
    </button>
  );

  return (
    <Layout siteConfig={siteConfig}>
      <div className="space-y-6">
        {/* Hero Section - Simplified and Action-Focused */}
        <RetroCard title="Getting Started">
          <div className="text-center py-4">
            <div className="text-4xl mb-4">🚀</div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">
              Welcome to {siteConfig.site_name}!
            </h1>
            {!user ? (
              <>
                <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed mb-6">
                  A unique social platform where you create customizable profiles, join themed communities called <strong>ThreadRings</strong>, and connect with others.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Link 
                    href="/onboarding" 
                    className="inline-block border border-black px-6 py-3 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-bold"
                  >
                    Create Your Profile
                  </Link>
                  <Link 
                    href="/threadrings" 
                    className="inline-block border border-black px-5 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
                  >
                    Browse Communities
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed mb-6">
                  Great to see you here! Use this guide to explore all the features and make the most of your {siteConfig.site_name} experience.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Link 
                    href="/tr/welcome" 
                    className="inline-block border border-black px-6 py-3 bg-purple-200 hover:bg-purple-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-bold"
                  >
                    Start with Welcome Ring
                  </Link>
                  <Link 
                    href="/settings/profile" 
                    className="inline-block border border-black px-5 py-2 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
                  >
                    Customize Profile
                  </Link>
                </div>
              </>
            )}
          </div>
        </RetroCard>

        {/* Navigation Tabs */}
        <div className="bg-white border border-black shadow-[2px_2px_0_#000] p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <TabButton tabId="overview" label="Quick Start" icon="⚡" />
            <TabButton tabId="visual-builder" label="Visual Builder" icon="🎨" />
            <TabButton tabId="threadrings" label="ThreadRings" icon="🧵" />
            <TabButton tabId="profiles" label="Your Profile" icon="👤" />
            <TabButton tabId="pixel-homes" label="Pixel Homes" icon="🏠" />
            <TabButton tabId="social" label="Social Features" icon="💬" />
            <TabButton tabId="content" label="Creating Content" icon="✍️" />
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {!user ? (
                // New user journey
                <RetroCard title="Your First Steps">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-green-50 border-l-4 border-green-400">
                      <div className="text-2xl">👤</div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">1. Create Your Profile</h3>
                        <p className="text-sm text-gray-600">Choose a username and set up your personal space.</p>
                      </div>
                      <Link 
                        href="/onboarding" 
                        className="px-4 py-2 bg-green-200 hover:bg-green-300 border border-black shadow-[2px_2px_0_#000] font-medium text-sm"
                      >
                        Start
                      </Link>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border-l-4 border-blue-400">
                      <div className="text-2xl">🧵</div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">2. Join Communities</h3>
                        <p className="text-sm text-gray-600">Find ThreadRings that match your interests.</p>
                      </div>
                      <Link 
                        href="/threadrings" 
                        className="px-4 py-2 bg-blue-200 hover:bg-blue-300 border border-black shadow-[2px_2px_0_#000] font-medium text-sm"
                      >
                        Browse
                      </Link>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-purple-50 border-l-4 border-purple-400">
                      <div className="text-2xl">💬</div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">3. Start Connecting</h3>
                        <p className="text-sm text-gray-600">Share posts, leave comments, meet people.</p>
                      </div>
                    </div>
                  </div>
                </RetroCard>
              ) : (
                // Existing user journey
                <RetroCard title={`Make the Most of ${siteConfig.site_name}`}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="font-bold text-lg">Quick Actions</h3>
                      <div className="space-y-2">
                        <Link 
                          href="/tr/welcome" 
                          className="block p-3 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                        >
                          <div className="font-medium">🎓 Try Welcome Ring</div>
                          <div className="text-sm text-gray-600">Learn through guided activities</div>
                        </Link>
                        <Link 
                          href="/post/new" 
                          className="block p-3 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                        >
                          <div className="font-medium">✍️ Write a Post</div>
                          <div className="text-sm text-gray-600">Share your thoughts</div>
                        </Link>
                        <Link 
                          href="/threadrings" 
                          className="block p-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <div className="font-medium">🔍 Discover Rings</div>
                          <div className="text-sm text-gray-600">Find new communities</div>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="font-bold text-lg">Customize</h3>
                      <div className="space-y-2">
                        <Link
                          href="/settings/profile"
                          className="block p-3 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                        >
                          <div className="font-medium">🎨 Visual Builder</div>
                          <div className="text-sm text-gray-600">Drag-and-drop profile designer</div>
                        </Link>
                        {user ? (
                          <Link 
                            href={`/home/${user.primaryHandle?.split('@')[0]}/decorate`}
                            className="block p-3 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                          >
                            <div className="font-medium">🏠 Decorate Pixel Home</div>
                            <div className="text-sm text-gray-600">Customize your 8-bit house</div>
                          </Link>
                        ) : (
                          <Link 
                            href="/onboarding"
                            className="block p-3 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                          >
                            <div className="font-medium">🏠 Decorate Pixel Home</div>
                            <div className="text-sm text-gray-600">Sign up to create your 8-bit house</div>
                          </Link>
                        )}
                        <Link
                          href="/templates"
                          className="block p-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <div className="font-medium">📚 Templates & CSS</div>
                          <div className="text-sm text-gray-600">Visual Builder, Template Language & CSS guides</div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </RetroCard>
              )}

              <RetroCard title={`What Makes ${siteConfig.site_name} Special?`}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">🎨</div>
                    <div>
                      <h3 className="font-bold mb-1">Full Customization</h3>
                      <p className="text-sm text-gray-600">Style your profile with custom CSS, just like the old web.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">🏠</div>
                    <div>
                      <h3 className="font-bold mb-1">Pixel Homes</h3>
                      <p className="text-sm text-gray-600">Decorate your own customizable 8-bit house with gardens and atmosphere.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">🧵</div>
                    <div>
                      <h3 className="font-bold mb-1">Growing Communities</h3>
                      <p className="text-sm text-gray-600">ThreadRings can branch and evolve, creating rich family trees.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">🔐</div>
                    <div>
                      <h3 className="font-bold mb-1">Own Your Identity</h3>
                      <p className="text-sm text-gray-600">Your digital identity belongs to you, not a platform.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">📖</div>
                    <div>
                      <h3 className="font-bold mb-1">Retro Charm</h3>
                      <p className="text-sm text-gray-600">Experience the creativity of the early internet, modernized.</p>
                    </div>
                  </div>
                </div>
              </RetroCard>
            </div>
          )}

          {activeTab === "visual-builder" && (
            <div className="space-y-6">
              <RetroCard title="🎨 Visual Template Builder - Our Flagship Feature">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-l-4 border-purple-400 p-4 rounded">
                    <h3 className="font-bold text-purple-800 mb-2">🚀 Design Without Code</h3>
                    <p className="text-purple-700 leading-relaxed">
                      {siteConfig.site_name}&apos;s Visual Builder brings together retro aesthetics and modern drag-and-drop design.
                      Create stunning, professional profiles without writing a single line of CSS!
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-green-300 p-4 bg-green-50 rounded">
                      <h4 className="font-bold text-green-800 mb-2">✨ Drag & Drop Magic</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Intuitive drag-and-drop interface</li>
                        <li>• Smart drop zones with visual feedback</li>
                        <li>• Live preview as you build</li>
                        <li>• Grid and absolute positioning</li>
                        <li>• Professional keyboard shortcuts</li>
                      </ul>
                    </div>

                    <div className="border border-blue-300 p-4 bg-blue-50 rounded">
                      <h4 className="font-bold text-blue-800 mb-2">🎮 Retro Component Library</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• CRT Monitors with authentic scanlines</li>
                        <li>• Neon Signs with glow effects</li>
                        <li>• Arcade Buttons with 3D styling</li>
                        <li>• VHS Tapes and Cassette Players</li>
                        <li>• Matrix Rain backgrounds</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <h3 className="font-bold text-yellow-800 mb-2">🔧 Professional Workflow</h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      Built for both beginners and power users with advanced features:
                    </p>
                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <strong className="text-yellow-800">Multi-Select:</strong>
                        <div className="text-yellow-700">Ctrl+click, rubber band selection</div>
                      </div>
                      <div>
                        <strong className="text-yellow-800">Bulk Editing:</strong>
                        <div className="text-yellow-700">Change multiple components at once</div>
                      </div>
                      <div>
                        <strong className="text-yellow-800">Grouping:</strong>
                        <div className="text-yellow-700">Organize related components</div>
                      </div>
                    </div>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Getting Started with Visual Builder">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-4 rounded">
                    <h3 className="font-bold text-green-800 mb-3">🎯 Quick Start Guide</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                        <div>
                          <strong className="text-green-800">Open Visual Builder:</strong>
                          <p className="text-green-700">Go to Profile Settings → Template Editor → &quot;Switch to Visual Builder&quot;</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                        <div>
                          <strong className="text-green-800">Browse Components:</strong>
                          <p className="text-green-700">Search the component palette for content, retro effects, and layouts</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                        <div>
                          <strong className="text-green-800">Drag & Drop:</strong>
                          <p className="text-green-700">Drag components onto the canvas and position them exactly where you want</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                        <div>
                          <strong className="text-green-800">Customize:</strong>
                          <p className="text-green-700">Click components to edit colors, text, styles, and effects in real-time</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">5</span>
                        <div>
                          <strong className="text-green-800">Publish:</strong>
                          <p className="text-green-700">Click &quot;Save Template&quot; and your beautiful profile goes live instantly!</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    {user ? (
                      <Link
                        href="/settings/profile"
                        className="inline-block border border-black px-6 py-3 bg-purple-200 hover:bg-purple-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-bold"
                      >
                        🎨 Open Visual Builder
                      </Link>
                    ) : (
                      <Link
                        href="/onboarding"
                        className="inline-block border border-black px-6 py-3 bg-purple-200 hover:bg-purple-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-bold"
                      >
                        🎨 Sign Up to Try Visual Builder
                      </Link>
                    )}
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Why Visual Builder?">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold mb-3 text-green-700">✅ Visual Builder Benefits</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span><strong>No coding required</strong> - Anyone can create beautiful profiles</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span><strong>Instant results</strong> - See changes in real-time</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span><strong>Professional quality</strong> - Polished, responsive designs</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span><strong>Retro components</strong> - Authentic vintage design elements</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span><strong>Fast workflow</strong> - Multi-select, bulk editing, and shortcuts</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold mb-3 text-blue-700">⚙️ For Advanced Users</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span><strong>CSS Export</strong> - Generate clean CSS from your visual design</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span><strong>Code View</strong> - Switch between visual and code editing</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span><strong>Custom CSS</strong> - Add your own styles and overrides</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span><strong>Component Inspector</strong> - See generated HTML and styles</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span><strong>Template Sharing</strong> - Export and import template files</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 p-4 rounded">
                    <h3 className="font-bold text-pink-800 mb-2">🎭 Express Your Digital Identity</h3>
                    <p className="text-sm text-pink-700">
                      The Visual Builder brings back the creative freedom of the early web, where personal expression
                      mattered more than conformity. Create something uniquely yours with authentic retro components
                      and modern design tools.
                    </p>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Need Help Getting Started?">
                <div className="space-y-4">
                  <p className="text-gray-700">
                    New to visual design tools? No problem! We&apos;ve made the Visual Builder intuitive and beginner-friendly.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-blue-300 p-4 bg-blue-50 rounded">
                      <h4 className="font-bold text-blue-800 mb-2">📚 Learn More</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Check out our comprehensive design tutorial for detailed guides and component references.
                      </p>
                      <Link
                        href="/templates"
                        className="block text-center border border-black px-3 py-2 bg-blue-100 hover:bg-blue-200 shadow-[1px_1px_0_#000] text-sm"
                      >
                        View Templates Hub
                      </Link>
                    </div>

                    <div className="border border-green-300 p-4 bg-green-50 rounded">
                      <h4 className="font-bold text-green-800 mb-2">💡 Still Prefer CSS?</h4>
                      <p className="text-sm text-green-700 mb-3">
                        Power users can still edit CSS directly. The Visual Builder and CSS editor work together seamlessly.
                      </p>
                      <div className="text-center text-sm bg-gray-100 border px-3 py-2">
                        Available in Profile Settings
                      </div>
                    </div>
                  </div>
                </div>
              </RetroCard>
            </div>
          )}

          {activeTab === "threadrings" && (
            <div className="space-y-6">
                <RetroCard title="Understanding ThreadRings">
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      ThreadRings are the heart of {siteConfig.site_name} - they&apos;re community spaces where people with shared 
                      interests can gather, discuss, and create together. Think of them as specialized forums with a 
                      unique twist: they have genealogy!
                    </p>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <h3 className="font-bold text-blue-800 mb-2">Community Evolution</h3>
                      <p className="text-sm text-blue-700">
                        ThreadRings can branch and evolve! When a community grows and members want 
                        to explore new directions, they can start a new Ring that branches off from the original, 
                        maintaining a genealogical connection while allowing for independent growth.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-6">
                      <div className="border border-gray-300 p-4 bg-gray-50">
                        <h4 className="font-bold mb-2">Join Types</h4>
                        <ul className="text-sm space-y-1">
                          <li><strong>Open:</strong> Anyone can join instantly</li>
                          <li><strong>Invite:</strong> Members must be invited</li>
                          <li><strong>Closed:</strong> No new members accepted</li>
                        </ul>
                      </div>
                      
                      <div className="border border-gray-300 p-4 bg-gray-50">
                        <h4 className="font-bold mb-2">Visibility</h4>
                        <ul className="text-sm space-y-1">
                          <li><strong>Public:</strong> Everyone can see it</li>
                          <li><strong>Unlisted:</strong> Only findable by direct link</li>
                          <li><strong>Private:</strong> Members only</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </RetroCard>
                
                <RetroCard title="The Genealogy System">
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      Every ThreadRing is part of a family tree that traces back to &quot;The Spool&quot; - the ancestral 
                      root of all communities. This creates fascinating lineages and connections between related communities.
                    </p>
                    
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-4 rounded">
                      <div className="text-center">
                        <div className="text-3xl mb-2">🧵 The Spool</div>
                        <div className="text-sm text-gray-600 mb-3">↓ branches into ↓</div>
                        <div className="flex justify-center gap-4 text-lg">
                          <span>📚 BookLovers</span>
                          <span>🎮 GameDevs</span>
                          <span>🌱 Gardening</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">...which can branch into more specialized communities</div>
                      </div>
                    </div>
                    
                    <Link 
                      href="/threadrings/genealogy" 
                      className="block text-center border border-black px-4 py-2 bg-green-100 hover:bg-green-200 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
                    >
                      Explore the Full Family Tree
                    </Link>
                  </div>
                </RetroCard>

                <RetroCard title="Getting Started with ThreadRings">
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-bold mb-2">1. Browse Communities</h4>
                      <p className="text-gray-600 mb-2">Discover ThreadRings that match your interests.</p>
                      <Link 
                        href="/threadrings" 
                        className="block text-center border border-black px-3 py-1 bg-blue-100 hover:bg-blue-200 shadow-[1px_1px_0_#000] text-sm"
                      >
                        Browse ThreadRings
                      </Link>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">2. Join Open Communities</h4>
                      <p className="text-gray-600">Click &quot;Join&quot; on any open Ring to become a member.</p>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">3. Create Your Own</h4>
                      <p className="text-gray-600 mb-2">Start a new community around your passion.</p>
                      <FeatureGate 
                        requiresRegularUser 
                        user={user} 
                        fallback={<NewUserTooltip feature="creating new rings" />}
                      >
                        <Link 
                          href="/tr/spool/fork" 
                          className="block text-center border border-black px-3 py-1 bg-purple-100 hover:bg-purple-200 shadow-[1px_1px_0_#000] text-sm"
                        >
                          Branch from The Spool
                        </Link>
                      </FeatureGate>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">4. Branch from Existing Ones</h4>
                      <p className="text-gray-600">Start new Rings based on communities you love while maintaining genealogical connections.</p>
                    </div>
                  </div>
                </RetroCard>

                <div>
                <RetroCard title="ThreadRing Badges">
                  <div className="text-center space-y-3">
                    <div className="bg-gray-100 border border-gray-400 w-[88px] h-[31px] mx-auto flex items-center justify-center text-xs">
                      88x31 Badge
                    </div>
                    <p className="text-sm text-gray-600">
                      Each ThreadRing can have an official 88x31 badge - a throwback to the classic web button era! 
                      Share your community&apos;s badge on websites and profiles.
                    </p>
                  </div>
                </RetroCard>
                </div>
            </div>
          )}

          {activeTab === "profiles" && (
            <div className="space-y-6">
              <RetroCard title="Your Personal Space">
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Your {siteConfig.site_name} profile is your personal corner of the internet. Like the homepages of old, 
                    you have complete creative control over how it looks and what it contains.
                  </p>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-400 p-4">
                    <h3 className="font-bold text-purple-800 mb-2">🎨 Design Your Profile</h3>
                    <p className="text-sm text-purple-700 mb-3">
                      Choose between our intuitive Visual Builder or direct CSS editing for complete creative control:
                    </p>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="bg-white p-3 border border-purple-200 rounded">
                        <strong className="text-purple-800">Visual Builder (Recommended)</strong>
                        <div className="text-purple-700">Drag-and-drop design with retro components</div>
                      </div>
                      <div className="bg-white p-3 border border-purple-200 rounded">
                        <strong className="text-purple-800">CSS Editor (Advanced)</strong>
                        <div className="text-purple-700">Direct code editing for power users</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <h3 className="font-bold text-yellow-800 mb-2">Profile Features</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• <strong>Visual Design:</strong> Drag-and-drop builder with unique retro components</li>
                      <li>• <strong>Photo Gallery:</strong> Share your favorite images</li>
                      <li>• <strong>Music Player:</strong> Add MIDI files to create a soundtrack for your profile</li>
                      <li>• <strong>Guestbook:</strong> Let visitors leave messages</li>
                      <li>• <strong>Blog Posts:</strong> Share your thoughts and stories</li>
                      <li>• <strong>Friend Lists:</strong> Display your connections</li>
                      <li>• <strong>Website Links:</strong> Connect to your other online spaces</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold">Default Themes</h4>
                    <p className="text-sm text-gray-600">Get started quickly with professionally designed themes, then customize to make them your own:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100">
                        <div className="text-lg mb-1">🎨</div>
                        <div className="font-bold text-xs">Abstract Art</div>
                        <div className="text-xs text-gray-600 mt-1">Colorful & artistic</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gray-900 text-white">
                        <div className="text-lg mb-1">🖤</div>
                        <div className="font-bold text-xs text-green-400 font-mono">Charcoal Nights</div>
                        <div className="text-xs text-green-300 mt-1">Terminal aesthetic</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gradient-to-br from-pink-200 to-purple-100">
                        <div className="text-lg mb-1">🌸</div>
                        <div className="font-bold text-xs text-pink-700">Pixel Petals</div>
                        <div className="text-xs text-pink-600 mt-1">Kawaii paradise</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gradient-to-br from-blue-100 to-purple-100">
                        <div className="text-lg mb-1">📱</div>
                        <div className="font-bold text-xs text-blue-700">Retro Social</div>
                        <div className="text-xs text-blue-600 mt-1">MySpace vibes</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3" style={{background: 'repeating-linear-gradient(45deg, #f5f5f0, #f5f5f0 10px, #fafaf5 10px, #fafaf5 20px)'}}>
                        <div className="text-lg mb-1">🧵</div>
                        <div className="font-bold text-xs text-amber-800">Classic Linen</div>
                        <div className="text-xs text-amber-700 mt-1">Vintage elegance</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-white">
                        <div className="text-lg mb-1">✨</div>
                        <div className="font-bold text-xs">Start Fresh</div>
                        <div className="text-xs text-gray-600 mt-1">Build from scratch</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Select a theme during profile setup or change it anytime in settings!</p>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Design Your Profile Your Way">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 p-4 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-bold">SIMPLEST</span>
                      <h3 className="font-bold">✨ CSS Styling - Start Here!</h3>
                    </div>
                    <p className="text-sm mb-3">
                      Just want to change colors and fonts? Start with simple CSS styling on your default layout!
                      No drag-and-drop, no layout building - just quick customization in minutes.
                    </p>
                    <div className="text-xs text-green-700">
                      Perfect for: Quick styling • Beginners • Just changing colors/fonts
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-bold mb-2 text-sm">✨ CSS Styling</h4>
                      <div className="space-y-2 text-sm">
                        <Link
                          href="/settings?tab=appearance"
                          className="block border-2 border-green-500 px-3 py-2 bg-green-100 hover:bg-green-200 shadow-[2px_2px_0_#000] text-center font-medium"
                        >
                          Open CSS Editor
                        </Link>
                        <p className="text-gray-600 text-xs">
                          Change colors, fonts, spacing on default layout. Simple text editor with class reference.
                        </p>
                        <div className="text-xs text-gray-500">⏱ 5 minutes</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2 text-sm">🎨 Visual Builder</h4>
                      <div className="space-y-2 text-sm">
                        <Link
                          href="/settings/profile"
                          className="block border border-black px-3 py-2 bg-purple-100 hover:bg-purple-200 shadow-[1px_1px_0_#000] text-center"
                        >
                          Open Visual Builder
                        </Link>
                        <p className="text-gray-600 text-xs">
                          Drag-and-drop custom layouts with grid positioning. Build unique page structures.
                        </p>
                        <div className="text-xs text-gray-500">⏱ 30 minutes</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2 text-sm">💻 Template Code</h4>
                      <div className="space-y-2 text-sm">
                        <Link
                          href="/templates/tutorials/your-first-template"
                          className="block text-center border border-black px-3 py-2 bg-blue-100 hover:bg-blue-200 shadow-[1px_1px_0_#000]"
                        >
                          Coding Tutorial
                        </Link>
                        <p className="text-gray-600 text-xs">
                          Code dynamic features with variables, loops, and conditionals. For developers.
                        </p>
                        <div className="text-xs text-gray-500">⏱ 1+ hour</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">Profile Settings</h4>
                    <div className="space-y-2 text-sm">
                      <Link
                        href="/settings/profile"
                        className="block border border-black px-3 py-2 bg-green-100 hover:bg-green-200 shadow-[1px_1px_0_#000] text-center"
                      >
                        ⚙️ Edit Profile Settings
                      </Link>
                      <p className="text-gray-600 text-xs">
                        Update your display name, bio, avatar, theme selection, and add background music with MIDI files.
                      </p>
                    </div>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Profile Music with MIDI">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-400 p-4">
                    <h3 className="font-bold text-purple-800 mb-2">Add a Soundtrack to Your Profile</h3>
                    <p className="text-sm text-purple-700">
                      Bring back the nostalgic web experience with background music! Upload MIDI files to create 
                      the perfect ambiance for visitors exploring your profile.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">Music Features</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <strong>MIDI Support:</strong> Upload classic MIDI files for authentic retro vibes</li>
                      <li>• <strong>Auto-play Controls:</strong> Visitors can easily play/pause your music</li>
                      <li>• <strong>Volume Settings:</strong> Respectful default volume levels</li>
                      <li>• <strong>Visual Player:</strong> Stylish music player that matches your theme</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                    <p className="text-xs text-yellow-800">
                      <strong>Pro Tip:</strong> Choose MIDI files that match your profile&apos;s vibe - from classic game 
                      soundtracks to original compositions!
                    </p>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Your Digital Identity">
                <div className="space-y-4">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4">
                    <h3 className="font-bold text-green-800 mb-2">Flexible Authentication Options</h3>
                    <p className="text-sm text-green-700">
                      {siteConfig.site_name} offers multiple secure ways to access your account. Choose what works best for you!
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="border border-green-300 p-3 bg-green-50 rounded">
                      <h4 className="font-bold text-green-800 mb-2">Password</h4>
                      <p className="text-xs text-green-700">
                        Traditional and familiar! Sign in with a secure username and password combination.
                      </p>
                      <div className="mt-2 text-xs text-green-600">
                        ✓ Easy to use<br/>
                        ✓ Can be changed<br/>
                        ✓ Recommended
                      </div>
                    </div>
                    
                    <div className="border border-blue-300 p-3 bg-blue-50 rounded">
                      <h4 className="font-bold text-blue-800 mb-2">Email Login</h4>
                      <p className="text-xs text-blue-700">
                        Quick and convenient! Get a magic link sent to your email address.
                      </p>
                      <div className="mt-2 text-xs text-blue-600">
                        ✓ No password needed<br/>
                        ✓ Secure links<br/>
                        ✓ Fast access
                      </div>
                    </div>
                    
                    <div className="border border-purple-300 p-3 bg-purple-50 rounded">
                      <h4 className="font-bold text-purple-800 mb-2">Seed Phrase</h4>
                      <p className="text-xs text-purple-700">
                        Maximum security with a 12-word recovery phrase for full control.
                      </p>
                      <div className="mt-2 text-xs text-purple-600">
                        ✓ Most secure<br/>
                        ✓ Full ownership<br/>
                        ✓ Advanced users
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                    <p className="text-xs text-yellow-800">
                      <strong>Note:</strong> All authentication methods use decentralized identifiers (DIDs) under the hood, 
                      ensuring you always maintain true ownership of your identity. You can switch between methods anytime!
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">Benefits of Our System</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <strong>True Ownership:</strong> Your identity belongs to you, not us</li>
                      <li>• <strong>Multiple Options:</strong> Choose the security level that fits your needs</li>
                      <li>• <strong>Privacy First:</strong> Minimal data collection, maximum control</li>
                      <li>• <strong>Recovery Options:</strong> Never lose access to your account</li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <Link 
                      href="/settings" 
                      className="block text-center border border-black px-3 py-2 bg-green-100 hover:bg-green-200 shadow-[1px_1px_0_#000] font-medium text-sm"
                    >
                      Account Settings
                    </Link>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Profile URL Structure">
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    Your profile lives at a clean URL that&apos;s easy to remember and share:
                  </p>
                  <div className="bg-gray-100 border p-3 font-mono text-sm text-center">
                    /resident/<strong>username</strong>
                  </div>
                  <p className="text-xs text-gray-600">
                    This is your permanent home on {siteConfig.site_name} - customize it to reflect who you are!
                  </p>
                </div>
              </RetroCard>
            </div>
          )}

          {activeTab === "pixel-homes" && (
            <div className="space-y-6">
              <RetroCard title="Your Digital Pixel Home">
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Every {siteConfig.site_name} user gets their own customizable pixel home - a charming 8-bit style house 
                    that serves as a visual representation of your digital space. Think of it as your own little 
                    corner of a virtual neighborhood!
                  </p>

                  <div className="bg-gradient-to-br from-green-50 to-blue-50 border-l-4 border-green-400 p-4 rounded">
                    <h3 className="font-bold text-green-800 mb-2">✨ What Makes Pixel Homes Special</h3>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• <strong>Multiple House Templates:</strong> Choose from cottage, townhouse, modern loft, or log cabin styles</li>
                      <li>• <strong>Complete Customization:</strong> Change colors, door styles, windows, roof trim, and more</li>
                      <li>• <strong>Garden Decorations:</strong> Add plants, paths, seasonal decorations, and special features</li>
                      <li>• <strong>Atmosphere Control:</strong> Set the sky, weather, and time of day around your home</li>
                      <li>• <strong>House Signage:</strong> Add custom text to welcome visitors to your space</li>
                      <li>• <strong>Interactive Elements:</strong> Mailbox, guestbook, and music player integration</li>
                    </ul>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-gray-300 p-4 bg-blue-50 rounded">
                      <h4 className="font-bold text-blue-800 mb-2">🏠 House Templates</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li><strong>Cottage:</strong> Classic cozy home with pitched roof</li>
                        <li><strong>Townhouse:</strong> Modern city dwelling with flat roof</li>
                        <li><strong>Modern Loft:</strong> Contemporary style with angular design</li>
                        <li><strong>Log Cabin:</strong> Rustic wooden retreat</li>
                      </ul>
                    </div>
                    
                    <div className="border border-gray-300 p-4 bg-purple-50 rounded">
                      <h4 className="font-bold text-purple-800 mb-2">🎨 Customization Options</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li><strong>Colors:</strong> Walls, roof, trim, windows, details</li>
                        <li><strong>Doors:</strong> Default, arched, double, cottage styles</li>
                        <li><strong>Windows:</strong> Round, arched, bay window options</li>
                        <li><strong>Roof Trim:</strong> Simple, ornate, or gabled styles</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Decorating Your Pixel Home">
                <div className="space-y-4">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <h3 className="font-bold text-yellow-800 mb-2">🌱 Garden & Yard Decorations</h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      Transform your front yard into a personalized garden space with a wide variety of decorative elements:
                    </p>
                    <div className="grid md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <strong className="text-yellow-800">Plants:</strong>
                        <div className="text-yellow-700">Trees, flowers, bushes, succulents, herb gardens</div>
                      </div>
                      <div>
                        <strong className="text-yellow-800">Paths:</strong>
                        <div className="text-yellow-700">Stone walkways, brick paths, wooden planks</div>
                      </div>
                      <div>
                        <strong className="text-yellow-800">Features:</strong>
                        <div className="text-yellow-700">Fountains, benches, lanterns, garden gnomes</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
                    <h3 className="font-bold text-orange-800 mb-2">🍂 Seasonal Decorations</h3>
                    <p className="text-sm text-orange-700">
                      Celebrate the seasons with special decorations that automatically appear during holidays 
                      and special times of year - or add them manually to create year-round festive vibes!
                    </p>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <h3 className="font-bold text-blue-800 mb-2">🌤️ Atmosphere & Ambiance</h3>
                    <p className="text-sm text-blue-700 mb-2">
                      Set the perfect mood for your home with atmospheric controls:
                    </p>
                    <div className="grid md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <strong className="text-blue-800">Sky Types:</strong>
                        <div className="text-blue-700">Sunny, sunset, cloudy, starry night</div>
                      </div>
                      <div>
                        <strong className="text-blue-800">Weather:</strong>
                        <div className="text-blue-700">Clear, rain, snow, fog</div>
                      </div>
                      <div>
                        <strong className="text-blue-800">Time of Day:</strong>
                        <div className="text-blue-700">Dawn, midday, dusk, night</div>
                      </div>
                    </div>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Getting Started with Your Pixel Home">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 p-4 rounded">
                    <h3 className="font-bold text-purple-800 mb-2">🎯 Quick Start Guide</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                        <div>
                          <strong className="text-purple-800">Visit Your Home:</strong>
                          <p className="text-purple-700">Go to your profile and click &quot;Decorate Home&quot; to access the pixel home editor</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                        <div>
                          <strong className="text-purple-800">Choose a Template:</strong>
                          <p className="text-purple-700">Select from cottage, townhouse, loft, or cabin to match your style</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                        <div>
                          <strong className="text-purple-800">Customize Your House:</strong>
                          <p className="text-purple-700">Change colors, doors, windows, and roof trim to make it uniquely yours</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                        <div>
                          <strong className="text-purple-800">Decorate the Yard:</strong>
                          <p className="text-purple-700">Drag and drop plants, paths, and features to create your perfect garden</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">5</span>
                        <div>
                          <strong className="text-purple-800">Set the Scene:</strong>
                          <p className="text-purple-700">Choose your sky, weather, and time of day to complete the atmosphere</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {user ? (
                    <div className="text-center">
                      <Link 
                        href={`/home/${user.primaryHandle?.split('@')[0]}/decorate`}
                        className="inline-block border border-black px-6 py-3 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-bold"
                      >
                        🎨 Decorate Your Home Now
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Link 
                        href="/onboarding"
                        className="inline-block border border-black px-6 py-3 bg-purple-200 hover:bg-purple-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-bold"
                      >
                        🎨 Sign Up to Create Your Home
                      </Link>
                    </div>
                  )}
                </div>
              </RetroCard>

              <RetroCard title="Share Your Pixel Home">
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Your pixel home is visible to all visitors on your profile, serving as a welcoming 
                    digital front door that reflects your personality and creativity.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-gray-300 p-4 bg-green-50 rounded">
                      <h4 className="font-bold text-green-800 mb-2">👥 Visitor Experience</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Interactive elements show activity status</li>
                        <li>• Mailbox indicates guestbook messages</li>
                        <li>• Music notes appear when profile music plays</li>
                        <li>• Atmospheric effects create immersive experience</li>
                      </ul>
                    </div>
                    
                    <div className="border border-gray-300 p-4 bg-blue-50 rounded">
                      <h4 className="font-bold text-blue-800 mb-2">🏘️ Neighborhood Views</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Appears in community neighborhood pages</li>
                        <li>• Part of the broader {siteConfig.site_name} community</li>
                        <li>• Showcases your unique design choices</li>
                        <li>• Inspires others with creative decorations</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-pink-50 border-l-4 border-pink-400 p-4">
                    <h3 className="font-bold text-pink-800 mb-2">💡 Pro Tips</h3>
                    <ul className="text-sm text-pink-700 space-y-1">
                      <li>• <strong>Seasonal Updates:</strong> Change decorations to match holidays and seasons</li>
                      <li>• <strong>Personal Themes:</strong> Match your home style to your profile theme</li>
                      <li>• <strong>Experiment:</strong> Try different combinations - you can always change things!</li>
                      <li>• <strong>Less Can Be More:</strong> Sometimes a few well-placed decorations work better than crowding</li>
                    </ul>
                  </div>
                </div>
              </RetroCard>
            </div>
          )}

          {activeTab === "social" && (
            <div className="space-y-6">
              <RetroCard title="Connect with Others">
                <div className="space-y-4">
                  <p className="text-gray-700">
                    {siteConfig.site_name} offers various ways to connect and interact with fellow community members, 
                    from casual conversations to deep community engagement.
                  </p>

                  <div className="grid gap-4">
                    <div className="border border-gray-300 p-3 bg-blue-50">
                      <h4 className="font-bold text-blue-800 mb-1">Following & Friends</h4>
                      <p className="text-sm text-blue-700">
                        Follow users you find interesting to see their posts in your feed. Build your network 
                        of connections and discover new perspectives.
                      </p>
                    </div>

                    <div className="border border-gray-300 p-3 bg-green-50">
                      <h4 className="font-bold text-green-800 mb-1">Guestbooks</h4>
                      <p className="text-sm text-green-700">
                        Leave messages on other users&apos; profiles! Guestbooks are a classic way to show 
                        appreciation and start conversations.
                      </p>
                    </div>

                    <div className="border border-gray-300 p-3 bg-purple-50">
                      <h4 className="font-bold text-purple-800 mb-1">Comments & Discussions</h4>
                      <p className="text-sm text-purple-700">
                        Engage with posts through threaded comments. Share your thoughts, ask questions, 
                        and contribute to meaningful discussions.
                      </p>
                    </div>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Stay Connected">
                <div className="space-y-4">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <h3 className="font-bold text-yellow-800 mb-2">Notifications</h3>
                    <p className="text-sm text-yellow-700">
                      Get notified when people interact with your content, join your ThreadRings, 
                      or mention you in discussions.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">Activity Feed</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Your personalized feed shows posts from users you follow and ThreadRings you&apos;ve joined.
                    </p>
                    <Link 
                      href="/feed" 
                      className="block text-center border border-black px-3 py-2 bg-blue-100 hover:bg-blue-200 shadow-[1px_1px_0_#000]"
                    >
                      View Your Feed
                    </Link>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">User Directory</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Browse all users on the platform to find interesting people to follow and connect with.
                    </p>
                    <Link 
                      href="/directory" 
                      className="block text-center border border-black px-3 py-2 bg-green-100 hover:bg-green-200 shadow-[1px_1px_0_#000]"
                    >
                      Browse Users
                    </Link>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Community Participation Tips">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold mb-3 text-green-700">Do&apos;s</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Be respectful and kind in all interactions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Contribute meaningful content to discussions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Help newcomers feel welcome</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Follow ThreadRing-specific guidelines</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>Use clear, descriptive post titles</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold mb-3 text-red-700">Don&apos;ts</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-red-600">✗</span>
                          <span>Share others&apos; private information</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600">✗</span>
                          <span>Post spam or off-topic content</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600">✗</span>
                          <span>Engage in harassment or bullying</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600">✗</span>
                          <span>Share inappropriate or harmful content</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600">✗</span>
                          <span>Impersonate other users</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </RetroCard>
            </div>
          )}

          {activeTab === "content" && (
            <div className="space-y-6">
              <RetroCard title="Creating Great Content">
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      {siteConfig.site_name} supports rich content creation with markdown formatting, media uploads, 
                      and flexible posting options. Whether you&apos;re sharing quick thoughts or detailed articles, 
                      you have the tools to express yourself fully.
                    </p>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <h3 className="font-bold text-blue-800 mb-2">Markdown Support</h3>
                      <p className="text-sm text-blue-700 mb-3">
                        Format your posts with markdown for rich typography, links, lists, and more:
                      </p>
                      <div className="bg-white border p-3 font-mono text-xs">
                        <div>**Bold text** and *italic text*</div>
                        <div>[Links](https://example.com)</div>
                        <div>- Bullet points</div>
                        <div>1. Numbered lists</div>
                        <div>`code snippets`</div>
                        <div>&gt; Blockquotes</div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="border border-gray-300 p-4 bg-green-50">
                        <h4 className="font-bold text-green-800 mb-2">Media Uploads</h4>
                        <p className="text-sm text-green-700">
                          Add images to your posts and maintain photo galleries on your profile. 
                          Share visual stories and memories with your community.
                        </p>
                      </div>
                      
                      <div className="border border-gray-300 p-4 bg-purple-50">
                        <h4 className="font-bold text-purple-800 mb-2">ThreadRing Posts</h4>
                        <p className="text-sm text-purple-700">
                          Share content within specific ThreadRing communities. Each ring has its own 
                          feed and discussion space focused on that community&apos;s interests.
                        </p>
                      </div>
                    </div>
                  </div>
                </RetroCard>

                <RetroCard title="Content Types & Ideas">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold mb-3">Post Ideas</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Show &amp; Tell:</strong> Share projects you&apos;re working on</li>
                        <li>• <strong>Questions:</strong> Ask for advice or start discussions</li>
                        <li>• <strong>Resources:</strong> Share useful links and tools</li>
                        <li>• <strong>Stories:</strong> Tell personal experiences</li>
                        <li>• <strong>Updates:</strong> Keep your community informed</li>
                        <li>• <strong>Photos:</strong> Share visual content with context</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold mb-3">Profile Content</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Bio:</strong> Tell visitors about yourself</li>
                        <li>• <strong>Photo Gallery:</strong> Curate your favorite images</li>
                        <li>• <strong>Blog Posts:</strong> Long-form writing and thoughts</li>
                        <li>• <strong>Friend Lists:</strong> Showcase your connections</li>
                        <li>• <strong>Website Links:</strong> Connect to your other projects</li>
                        <li>• <strong>Custom Design:</strong> Express your personality</li>
                      </ul>
                    </div>
                  </div>
                </RetroCard>

              <RetroCard title="Start Creating">
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-bold mb-2">Write a Post</h4>
                      <p className="text-gray-600 mb-2">Share your thoughts with the community.</p>
                      <Link 
                        href="/post/new" 
                        className="block text-center border border-black px-3 py-2 bg-green-100 hover:bg-green-200 shadow-[1px_1px_0_#000]"
                      >
                        New Post
                      </Link>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">Upload Media</h4>
                      <p className="text-gray-600 mb-2">Add images and MIDI files to your profile.</p>
                      <div className="text-center text-gray-500 text-xs bg-gray-100 border px-3 py-2">
                        Upload via Profile Settings
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">Writing Tips</h4>
                      <ul className="text-gray-600 space-y-1 text-xs">
                        <li>&bull; Use descriptive titles</li>
                        <li>&bull; Break up long text with headers</li>
                        <li>&bull; Include relevant images</li>
                        <li>&bull; Engage with comments</li>
                        <li>&bull; Post consistently</li>
                      </ul>
                    </div>
                  </div>
                </RetroCard>

              <RetroCard title="Featured Content">
                  <div className="space-y-3 text-sm">
                    <div className="bg-yellow-100 border border-yellow-300 p-3 rounded">
                      <h4 className="font-bold text-yellow-800 mb-1">Get Noticed</h4>
                      <p className="text-yellow-700 text-xs">
                        Quality content that sparks discussion and helps the community tends to get more engagement.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">Best Practices</h4>
                      <ul className="text-gray-600 space-y-1 text-xs">
                        <li>• Be authentic and genuine</li>
                        <li>• Contribute to discussions</li>
                        <li>• Help answer questions</li>
                        <li>• Share unique perspectives</li>
                        <li>• Support other creators</li>
                      </ul>
                    </div>
                  </div>
                </RetroCard>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <RetroCard title="">
          <div className="text-center py-4">
            <h2 className="text-xl font-bold mb-3">Ready to Join {siteConfig.site_name}?</h2>
            <p className="text-gray-600 mb-4">
              Start your journey on this unique social platform where creativity meets community.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href="/onboarding" 
                className="inline-block border border-black px-6 py-3 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all text-base font-bold"
              >
                Create Your Profile
              </Link>
              <Link 
                href="/feed" 
                className="inline-block border border-black px-6 py-3 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all text-base font-medium"
              >
                Explore the Feed
              </Link>
            </div>
          </div>
        </RetroCard>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<GettingStartedProps> = async () => {
  const siteConfig = await getSiteConfig();
  
  return {
    props: {
      siteConfig,
    },
  };
};