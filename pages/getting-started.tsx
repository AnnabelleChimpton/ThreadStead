import { useState } from "react";
import Layout from "../components/ui/layout/Layout";
import RetroCard from "../components/ui/layout/RetroCard";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";
import Link from "next/link";

interface GettingStartedProps {
  siteConfig: SiteConfig;
}

export default function GettingStarted({ siteConfig }: GettingStartedProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "threadrings" | "profiles" | "social" | "content">("overview");

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
        {/* Hero Section */}
        <RetroCard title="Welcome to Threadstead!">
          <div className="text-center py-4">
            <div className="text-4xl mb-4">🧵</div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">
              Getting Started with Threadstead
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-6">
              Threadstead is a retro-inspired social platform where you can create your own customizable profile, 
              join ThreadRing communities, and connect with others in a unique, decentralized way.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link 
                href="/onboarding" 
                className="inline-block border border-black px-5 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all text-sm font-medium"
              >
                Create Your Profile
              </Link>
              <Link 
                href="/threadrings" 
                className="inline-block border border-black px-5 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all text-sm font-medium"
              >
                Explore Communities
              </Link>
            </div>
          </div>
        </RetroCard>

        {/* Navigation Tabs */}
        <div className="bg-white border border-black shadow-[2px_2px_0_#000] p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <TabButton tabId="overview" label="Quick Start" icon="⚡" />
            <TabButton tabId="threadrings" label="ThreadRings" icon="🧵" />
            <TabButton tabId="profiles" label="Your Profile" icon="👤" />
            <TabButton tabId="social" label="Social Features" icon="💬" />
            <TabButton tabId="content" label="Creating Content" icon="✍️" />
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <RetroCard title="Quick Start Guide">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-200 border border-black w-8 h-8 flex items-center justify-center font-bold shadow-[2px_2px_0_#000] flex-shrink-0">1</div>
                    <div>
                      <h3 className="font-bold mb-1">Claim Your Username</h3>
                      <p className="text-sm text-gray-600">Choose a unique handle that will be your identity on the platform.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-200 border border-black w-8 h-8 flex items-center justify-center font-bold shadow-[2px_2px_0_#000] flex-shrink-0">2</div>
                    <div>
                      <h3 className="font-bold mb-1">Customize Your Profile</h3>
                      <p className="text-sm text-gray-600">Choose a theme, add a bio, photo, MIDI music, and even custom CSS to make your page unique.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-200 border border-black w-8 h-8 flex items-center justify-center font-bold shadow-[2px_2px_0_#000] flex-shrink-0">3</div>
                    <div>
                      <h3 className="font-bold mb-1">Join ThreadRings</h3>
                      <p className="text-sm text-gray-600">Find communities that interest you and become part of the conversation.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-200 border border-black w-8 h-8 flex items-center justify-center font-bold shadow-[2px_2px_0_#000] flex-shrink-0">4</div>
                    <div>
                      <h3 className="font-bold mb-1">Start Creating</h3>
                      <p className="text-sm text-gray-600">Share posts, leave comments, and connect with other users.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <Link 
                    href="/onboarding" 
                    className="w-full block text-center border border-black px-4 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
                  >
                    Let&apos;s Get Started!
                  </Link>
                </div>
              </RetroCard>

              <RetroCard title="What Makes Threadstead Special?">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">🎨</div>
                    <div>
                      <h3 className="font-bold mb-1">Full Customization</h3>
                      <p className="text-sm text-gray-600">Style your profile with custom CSS, just like the old web.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">🔐</div>
                    <div>
                      <h3 className="font-bold mb-1">Decentralized Identity</h3>
                      <p className="text-sm text-gray-600">Your identity belongs to you - no passwords, just cryptographic keys.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">🌳</div>
                    <div>
                      <h3 className="font-bold mb-1">Community Genealogy</h3>
                      <p className="text-sm text-gray-600">ThreadRings can fork and evolve, creating rich family trees of communities.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">📖</div>
                    <div>
                      <h3 className="font-bold mb-1">Retro Charm</h3>
                      <p className="text-sm text-gray-600">Experience the creativity and personal touch of the early internet.</p>
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
                      ThreadRings are the heart of Threadstead - they&apos;re community spaces where people with shared 
                      interests can gather, discuss, and create together. Think of them as specialized forums with a 
                      unique twist: they have genealogy!
                    </p>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <h3 className="font-bold text-blue-800 mb-2">Community Evolution</h3>
                      <p className="text-sm text-blue-700">
                        ThreadRings can &quot;fork&quot; just like code repositories. When a community grows and members want 
                        to explore new directions, they can create a new ThreadRing that branches off from the original, 
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
                        <div className="text-sm text-gray-600 mb-3">↓ forks into ↓</div>
                        <div className="flex justify-center gap-4 text-lg">
                          <span>📚 BookLovers</span>
                          <span>🎮 GameDevs</span>
                          <span>🌱 Gardening</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">...which can fork into more specialized communities</div>
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
                      <p className="text-gray-600">Click &quot;Join&quot; on any open ThreadRing to become a member.</p>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">3. Create Your Own</h4>
                      <p className="text-gray-600 mb-2">Start a new community around your passion.</p>
                      <Link 
                        href="/tr/spool/fork" 
                        className="block text-center border border-black px-3 py-1 bg-purple-100 hover:bg-purple-200 shadow-[1px_1px_0_#000] text-sm"
                      >
                        Create ThreadRing
                      </Link>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">4. Fork Existing Ones</h4>
                      <p className="text-gray-600">Create variations of communities you love while maintaining genealogical connections.</p>
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
                    Your Threadstead profile is your personal corner of the internet. Like the homepages of old, 
                    you have complete creative control over how it looks and what it contains.
                  </p>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <h3 className="font-bold text-yellow-800 mb-2">Profile Features</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• <strong>Custom CSS:</strong> Style your page however you want</li>
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

              <RetroCard title="Customization Power">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 p-4 rounded">
                    <h3 className="font-bold mb-2">Express Yourself</h3>
                    <p className="text-sm mb-3">
                      Threadstead brings back the creative freedom of personal websites. Start with a default theme 
                      or use CSS to create anything from minimalist modern designs to flashy retro masterpieces.
                    </p>
                    <div className="text-xs bg-white p-2 border font-mono">
                      <div>body {"{background: linear-gradient(...)}"}</div>
                      <div>.profile {"{animation: sparkle 2s infinite;}"}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">Profile Settings</h4>
                    <div className="space-y-2 text-sm">
                      <Link 
                        href="/settings/profile" 
                        className="block border border-black px-3 py-2 bg-blue-100 hover:bg-blue-200 shadow-[1px_1px_0_#000] text-center"
                      >
                        Edit Profile Settings
                      </Link>
                      <p className="text-gray-600 text-xs">
                        Our updated profile editor makes it easy to update your display name, bio, avatar, 
                        theme selection, and add background music with MIDI files.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">CSS Editor</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Access the full CSS editor to customize every aspect of your profile&apos;s appearance.
                    </p>
                    <Link 
                      href="/design-tutorial" 
                      className="block text-center border border-black px-3 py-1 bg-purple-100 hover:bg-purple-200 shadow-[1px_1px_0_#000] text-sm"
                    >
                      Design Tutorial
                    </Link>
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
                      Threadstead offers multiple secure ways to access your account. Choose what works best for you!
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
                    threadstead.com/resident/<strong>username</strong>
                  </div>
                  <p className="text-xs text-gray-600">
                    This is your permanent home on Threadstead - customize it to reflect who you are!
                  </p>
                </div>
              </RetroCard>
            </div>
          )}

          {activeTab === "social" && (
            <div className="space-y-6">
              <RetroCard title="Connect with Others">
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Threadstead offers various ways to connect and interact with fellow community members, 
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
                      Threadstead supports rich content creation with markdown formatting, media uploads, 
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
            <h2 className="text-xl font-bold mb-3">Ready to Join Threadstead?</h2>
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