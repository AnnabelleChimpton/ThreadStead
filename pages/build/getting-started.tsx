import { useState } from "react";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import Link from "next/link";
import FeatureGate, { NewUserTooltip } from "@/components/features/onboarding/FeatureGate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PixelIcon } from "@/components/ui/PixelIcon";

interface GettingStartedProps {
  siteConfig: SiteConfig;
}

export default function GettingStarted({ siteConfig }: GettingStartedProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "threadrings" | "profiles" | "pixel-homes" | "social" | "content">("overview");
  const { user } = useCurrentUser();

  const TabButton = ({
    tabId,
    label,
    icon
  }: {
    tabId: typeof activeTab;
    label: string;
    icon: React.ReactNode;
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
            <div className="text-4xl mb-4"><PixelIcon name="zap" size={48} /></div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">
              Getting started on {siteConfig.site_name}
            </h1>
            {!user ? (
              <>
                <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed mb-6">
                  You get a page you can restyle, a pixel house on a shared street, and a way into small topic groups called <strong>ThreadRings</strong>.
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
                    Browse Rings
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed mb-6">
                  Each tab below covers one part of the site: rings, your page, your house, the social bits, and posting.
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
            <TabButton tabId="overview" label="Quick Start" icon={<PixelIcon name="zap" size={14} />} />
            <TabButton tabId="threadrings" label="ThreadRings" icon={<PixelIcon name="link" size={14} />} />
            <TabButton tabId="profiles" label="Your Profile" icon={<PixelIcon name="user" size={14} />} />
            <TabButton tabId="pixel-homes" label="Pixel Homes" icon={<PixelIcon name="home" size={14} />} />
            <TabButton tabId="social" label="Social Features" icon={<PixelIcon name="chat" size={14} />} />
            <TabButton tabId="content" label="Creating Content" icon={<PixelIcon name="edit" size={14} />} />
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
                      <div className="text-2xl"><PixelIcon name="user" size={24} /></div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">1. Create Your Profile</h3>
                        <p className="text-sm text-gray-600">Pick a username. You get a page and a house.</p>
                      </div>
                      <Link 
                        href="/onboarding" 
                        className="px-4 py-2 bg-green-200 hover:bg-green-300 border border-black shadow-[2px_2px_0_#000] font-medium text-sm"
                      >
                        Start
                      </Link>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border-l-4 border-blue-400">
                      <div className="text-2xl"><PixelIcon name="link" size={24} /></div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">2. Join a ring</h3>
                        <p className="text-sm text-gray-600">Find a ring about something you care about.</p>
                      </div>
                      <Link 
                        href="/threadrings" 
                        className="px-4 py-2 bg-blue-200 hover:bg-blue-300 border border-black shadow-[2px_2px_0_#000] font-medium text-sm"
                      >
                        Browse
                      </Link>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-purple-50 border-l-4 border-purple-400">
                      <div className="text-2xl"><PixelIcon name="chat" size={24} /></div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">3. Say something</h3>
                        <p className="text-sm text-gray-600">Write a post, leave a comment, sign a guestbook.</p>
                      </div>
                    </div>
                  </div>
                </RetroCard>
              ) : (
                // Existing user journey
                <RetroCard title="Where to next">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="font-bold text-lg">Quick Actions</h3>
                      <div className="space-y-2">
                        <Link 
                          href="/tr/welcome" 
                          className="block p-3 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                        >
                          <div className="font-medium">Try Welcome Ring</div>
                          <div className="text-sm text-gray-600">A five-step tour of how rings work</div>
                        </Link>
                        <Link 
                          href="/post/new" 
                          className="block p-3 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                        >
                          <div className="font-medium">Write a Post</div>
                          <div className="text-sm text-gray-600">It goes on your page, and into any ring you pick</div>
                        </Link>
                        <Link 
                          href="/threadrings" 
                          className="block p-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <div className="font-medium">Browse Rings</div>
                          <div className="text-sm text-gray-600">Every ring on the site</div>
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
                          <div className="font-medium">Profile Settings</div>
                          <div className="text-sm text-gray-600">Name, bio, avatar, theme, music</div>
                        </Link>
                        {user ? (
                          <Link 
                            href={`/home/${user.primaryHandle?.split('@')[0]}/decorate`}
                            className="block p-3 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                          >
                            <div className="font-medium">Decorate Pixel Home</div>
                            <div className="text-sm text-gray-600">Paint the house, plant the yard</div>
                          </Link>
                        ) : (
                          <Link 
                            href="/onboarding"
                            className="block p-3 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                          >
                            <div className="font-medium">Decorate Pixel Home</div>
                            <div className="text-sm text-gray-600">Sign up to get a house</div>
                          </Link>
                        )}
                        <Link
                          href="/templates"
                          className="block p-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <div className="font-medium">Templates & CSS</div>
                          <div className="text-sm text-gray-600">Template Language & CSS guides</div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </RetroCard>
              )}

              <RetroCard title="What&apos;s here">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0"><PixelIcon name="paint-bucket" size={24} /></div>
                    <div>
                      <h3 className="font-bold mb-1">Your own CSS</h3>
                      <p className="text-sm text-gray-600">Restyle your page with CSS, or write its HTML with the template language.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0"><PixelIcon name="home" size={24} /></div>
                    <div>
                      <h3 className="font-bold mb-1">Pixel Homes</h3>
                      <p className="text-sm text-gray-600">An 8-bit house on a street with everyone else&apos;s. Paint it, plant a garden, set the sky.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0"><PixelIcon name="link" size={24} /></div>
                    <div>
                      <h3 className="font-bold mb-1">Rings with family trees</h3>
                      <p className="text-sm text-gray-600">Any ring can be forked into a new one, and the site keeps track of who came from whom.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0"><PixelIcon name="lock" size={24} /></div>
                    <div>
                      <h3 className="font-bold mb-1">Sign in your way</h3>
                      <p className="text-sm text-gray-600">Password, email link, or a 12-word seed phrase.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0"><PixelIcon name="script" size={24} /></div>
                    <div>
                      <h3 className="font-bold mb-1">Old-web parts</h3>
                      <p className="text-sm text-gray-600">Guestbooks, MIDI music, 88×31 badges.</p>
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
                      A ThreadRing is a small group around one topic. Members post to it, the ring has its own feed,
                      and anyone in it can reply. Rings also have parents and children: see the family tree below.
                    </p>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <h3 className="font-bold text-blue-800 mb-2">Forking</h3>
                      <p className="text-sm text-blue-700">
                        When a ring wants to split off a narrower topic, someone forks it. The new ring runs on its
                        own, with its own host and members, but stays linked to the ring it came from.
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
                      Every ring traces back to &quot;The Spool&quot;, the first ring. Fork a ring and yours becomes its child
                      in the tree.
                    </p>
                    
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-4 rounded">
                      <div className="text-center">
                        <div className="text-3xl mb-2">The Spool</div>
                        <div className="text-sm text-gray-600 mb-3">↓ branches into ↓</div>
                        <div className="flex justify-center gap-4 text-lg">
                          <span>BookLovers</span>
                          <span>GameDevs</span>
                          <span>Gardening</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">...which can branch into more specialized communities</div>
                      </div>
                    </div>
                    
                    <Link 
                      href="/threadrings/genealogy" 
                      className="block text-center border border-black px-4 py-2 bg-green-100 hover:bg-green-200 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium"
                    >
                      See the family tree
                    </Link>
                  </div>
                </RetroCard>

                <RetroCard title="Getting Started with ThreadRings">
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-bold mb-2">1. Browse</h4>
                      <p className="text-gray-600 mb-2">Look through the rings list.</p>
                      <Link 
                        href="/threadrings" 
                        className="block text-center border border-black px-3 py-1 bg-blue-100 hover:bg-blue-200 shadow-[1px_1px_0_#000] text-sm"
                      >
                        Browse ThreadRings
                      </Link>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">2. Join an open ring</h4>
                      <p className="text-gray-600">Click &quot;Join Ring&quot; on any open ring.</p>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">3. Start your own</h4>
                      <p className="text-gray-600 mb-2">A new ring starts as a fork of The Spool.</p>
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
                      <h4 className="font-bold mb-2">4. Or fork an existing one</h4>
                      <p className="text-gray-600">Fork any ring to make a narrower one. It shows up as its child in the tree.</p>
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
                      Each ring can have an 88×31 badge, the little buttons old sites linked each other with.
                      Put your ring&apos;s badge on your page or your own website.
                    </p>
                  </div>
                </RetroCard>
                </div>
            </div>
          )}

          {activeTab === "profiles" && (
            <div className="space-y-6">
              <RetroCard title="Your page">
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Your page is the one behind your house&apos;s front door. You decide how it looks and what goes on it.
                  </p>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-400 p-4">
                    <h3 className="font-bold text-purple-800 mb-2">Design Your Profile</h3>
                    <p className="text-sm text-purple-700 mb-3">
                      Two ways to change it:
                    </p>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="bg-white p-3 border border-purple-200 rounded">
                        <strong className="text-purple-800">CSS Styling (Recommended)</strong>
                        <div className="text-purple-700">Change colors, fonts and spacing on the standard page</div>
                      </div>
                      <div className="bg-white p-3 border border-purple-200 rounded">
                        <strong className="text-purple-800">Template Language (Advanced)</strong>
                        <div className="text-purple-700">Write the page&apos;s HTML yourself</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <h3 className="font-bold text-yellow-800 mb-2">Profile Features</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• <strong>Custom Styling:</strong> CSS editor and template language</li>
                      <li>• <strong>Photo Gallery:</strong> Upload photos to a gallery on your page</li>
                      <li>• <strong>Music Player:</strong> Add a MIDI file that plays on your page</li>
                      <li>• <strong>Guestbook:</strong> Visitors can sign it</li>
                      <li>• <strong>Blog Posts:</strong> Your posts, newest first</li>
                      <li>• <strong>Friend Lists:</strong> Show the people you&apos;re friends with</li>
                      <li>• <strong>Website Links:</strong> Link to your other sites</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold">Default Themes</h4>
                    <p className="text-sm text-gray-600">Pick one to start from, then change whatever you like:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100">
                        <div className="text-lg mb-1"><PixelIcon name="paint-bucket" size={18} /></div>
                        <div className="font-bold text-xs">Abstract Art</div>
                        <div className="text-xs text-gray-600 mt-1">Bright and loud</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gray-900 text-white">
                        <div className="text-lg mb-1"><PixelIcon name="heart" size={18} /></div>
                        <div className="font-bold text-xs text-green-400 font-mono">Charcoal Nights</div>
                        <div className="text-xs text-green-300 mt-1">Terminal aesthetic</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gradient-to-br from-pink-200 to-purple-100">
                        <div className="text-lg mb-1"><PixelIcon name="drop" size={18} /></div>
                        <div className="font-bold text-xs text-pink-700">Pixel Petals</div>
                        <div className="text-xs text-pink-600 mt-1">Pink and soft</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gradient-to-br from-blue-100 to-purple-100">
                        <div className="text-lg mb-1"><PixelIcon name="users" size={18} /></div>
                        <div className="font-bold text-xs text-blue-700">Retro Social</div>
                        <div className="text-xs text-blue-600 mt-1">Profile boxes, MySpace-style</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3" style={{background: 'repeating-linear-gradient(45deg, #f5f5f0, #f5f5f0 10px, #fafaf5 10px, #fafaf5 20px)'}}>
                        <div className="text-lg mb-1"><PixelIcon name="link" size={18} /></div>
                        <div className="font-bold text-xs text-amber-800">Classic Linen</div>
                        <div className="text-xs text-amber-700 mt-1">Paper and ink</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-white">
                        <div className="text-lg mb-1"><PixelIcon name="zap" size={18} /></div>
                        <div className="font-bold text-xs">Start Fresh</div>
                        <div className="text-xs text-gray-600 mt-1">A blank page</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">You pick one at signup and can change it any time in settings.</p>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Changing how your page looks">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 p-4 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-bold">SIMPLEST</span>
                      <h3 className="font-bold">CSS styling: start here</h3>
                    </div>
                    <p className="text-sm mb-3">
                      Want different colors and fonts? Write a little CSS against the standard layout. The class
                      reference lists every element you can target.
                    </p>
                    <div className="text-xs text-green-700">
                      Good for: colors, fonts, spacing, a first try
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold mb-2 text-sm">CSS Styling</h4>
                      <div className="space-y-2 text-sm">
                        <Link
                          href="/settings?tab=appearance"
                          className="block border-2 border-green-500 px-3 py-2 bg-green-100 hover:bg-green-200 shadow-[2px_2px_0_#000] text-center font-medium"
                        >
                          Open CSS Editor
                        </Link>
                        <p className="text-gray-600 text-xs">
                          Colors, fonts and spacing on the standard layout, with a class reference beside the editor.
                        </p>
                        <div className="text-xs text-gray-500"> 5 minutes</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2 text-sm">Template Code</h4>
                      <div className="space-y-2 text-sm">
                        <Link
                          href="/templates/tutorials/your-first-template"
                          className="block text-center border border-black px-3 py-2 bg-blue-100 hover:bg-blue-200 shadow-[1px_1px_0_#000]"
                        >
                          Coding Tutorial
                        </Link>
                        <p className="text-gray-600 text-xs">
                          Write the page&apos;s HTML with variables, loops and conditionals.
                        </p>
                        <div className="text-xs text-gray-500"> 1+ hour</div>
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
                        Edit Profile Settings
                      </Link>
                      <p className="text-gray-600 text-xs">
                        Display name, bio, avatar, theme, and a MIDI file for background music.
                      </p>
                    </div>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Profile Music with MIDI">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-400 p-4">
                    <h3 className="font-bold text-purple-800 mb-2">Background music</h3>
                    <p className="text-sm text-purple-700">
                      Upload a MIDI file and it plays when someone visits your page. The music guide in Help
                      covers where to find files and how to make your own.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">How it works</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <strong>MIDI Support:</strong> Upload .mid files</li>
                      <li>• <strong>Play controls:</strong> Visitors can play or pause it</li>
                      <li>• <strong>Volume:</strong> Visitors set their own</li>
                      <li>• <strong>Player:</strong> A small player sits on your page</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                    <p className="text-xs text-yellow-800">
                      <strong>Tip:</strong> Old game soundtracks and your own compositions both work.
                    </p>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Signing in">
                <div className="space-y-4">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4">
                    <h3 className="font-bold text-green-800 mb-2">Three ways in</h3>
                    <p className="text-sm text-green-700">
                      Pick one when you sign up.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="border border-green-300 p-3 bg-green-50 rounded">
                      <h4 className="font-bold text-green-800 mb-2">Password</h4>
                      <p className="text-xs text-green-700">
                        Username and password.
                      </p>
                      <div className="mt-2 text-xs text-green-600">
                        - Familiar<br/>
                        - Can be changed<br/>
                        - Recommended
                      </div>
                    </div>
                    
                    <div className="border border-blue-300 p-3 bg-blue-50 rounded">
                      <h4 className="font-bold text-blue-800 mb-2">Email Login</h4>
                      <p className="text-xs text-blue-700">
                        You get a sign-in link by email.
                      </p>
                      <div className="mt-2 text-xs text-blue-600">
                        - No password to remember<br/>
                        - Needs a verified email
                      </div>
                    </div>
                    
                    <div className="border border-purple-300 p-3 bg-purple-50 rounded">
                      <h4 className="font-bold text-purple-800 mb-2">Seed Phrase</h4>
                      <p className="text-xs text-purple-700">
                        A 12-word phrase that is your key.
                      </p>
                      <div className="mt-2 text-xs text-purple-600">
                        - Nothing stored but the key<br/>
                        - Keep the words somewhere safe<br/>
                        - For people who like that trade
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                    <p className="text-xs text-yellow-800">
                      <strong>Note:</strong> Every account has a decentralized identifier (DID) underneath, whichever way
                      you sign in.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">Why three</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <strong>Your choice:</strong> Familiar password, no password, or a key only you hold</li>
                      <li>• <strong>Little stored:</strong> A seed-phrase account doesn&apos;t even need an email</li>
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
                    Your page&apos;s address:
                  </p>
                  <div className="bg-gray-100 border p-3 font-mono text-sm text-center">
                    /resident/<strong>username</strong>
                  </div>
                  <p className="text-xs text-gray-600">
                    It stays the same as long as your username does.
                  </p>
                </div>
              </RetroCard>
            </div>
          )}

          {activeTab === "pixel-homes" && (
            <div className="space-y-6">
              <RetroCard title="Your pixel house">
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Everyone on {siteConfig.site_name} gets an 8-bit house on a shared street. Neighbors walk past it,
                    and clicking the door takes them to your page.
                  </p>

                  <div className="bg-gradient-to-br from-green-50 to-blue-50 border-l-4 border-green-400 p-4 rounded">
                    <h3 className="font-bold text-green-800 mb-2">What you can change</h3>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• <strong>House type:</strong> Cottage, townhouse, loft or log cabin</li>
                      <li>• <strong>The house itself:</strong> Colors, door, windows, roof trim</li>
                      <li>• <strong>The yard:</strong> Plants, paths, seasonal pieces, odds and ends</li>
                      <li>• <strong>The sky:</strong> Sky, weather and time of day</li>
                      <li>• <strong>A sign:</strong> Your own words out front</li>
                      <li>• <strong>Things that do something:</strong> Mailbox, guestbook, music</li>
                    </ul>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-gray-300 p-4 bg-blue-50 rounded">
                      <h4 className="font-bold text-blue-800 mb-2">House Templates</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li><strong>Cottage:</strong> Pitched roof, front porch</li>
                        <li><strong>Townhouse:</strong> Flat roof, taller</li>
                        <li><strong>Loft:</strong> Angular, big windows</li>
                        <li><strong>Log cabin:</strong> Wood all the way round</li>
                      </ul>
                    </div>
                    
                    <div className="border border-gray-300 p-4 bg-purple-50 rounded">
                      <h4 className="font-bold text-purple-800 mb-2">Customization Options</h4>
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
                    <h3 className="font-bold text-yellow-800 mb-2">Garden & Yard Decorations</h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      Drag pieces into the front yard. There&apos;s a 100-decoration limit, which sounds like a lot until you start.
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
                    <h3 className="font-bold text-orange-800 mb-2">Seasonal Decorations</h3>
                    <p className="text-sm text-orange-700">
                      The decoration picker has a seasonal section. Put things up for a holiday and take them down
                      after, or leave them up all year.
                    </p>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <h3 className="font-bold text-blue-800 mb-2">Sky and weather</h3>
                    <p className="text-sm text-blue-700 mb-2">
                      Set what&apos;s going on above the roof:
                    </p>
                    <div className="grid md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <strong className="text-blue-800">Sky Types:</strong>
                        <div className="text-blue-700">Sunny, cloudy, sunset, night</div>
                      </div>
                      <div>
                        <strong className="text-blue-800">Weather:</strong>
                        <div className="text-blue-700">Clear, rain, snow</div>
                      </div>
                      <div>
                        <strong className="text-blue-800">Time of Day:</strong>
                        <div className="text-blue-700">Morning, midday, evening, night</div>
                      </div>
                    </div>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Setting up your house">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 p-4 rounded">
                    <h3 className="font-bold text-purple-800 mb-2">In order</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                        <div>
                          <strong className="text-purple-800">Visit Your Home:</strong>
                          <p className="text-purple-700">Go to your house and click &quot;Decorate&quot; to open the editor</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                        <div>
                          <strong className="text-purple-800">Choose a Template:</strong>
                          <p className="text-purple-700">Cottage, townhouse, loft or cabin</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                        <div>
                          <strong className="text-purple-800">Customize Your House:</strong>
                          <p className="text-purple-700">Colors, door, windows, roof trim</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                        <div>
                          <strong className="text-purple-800">Decorate the Yard:</strong>
                          <p className="text-purple-700">Drag plants, paths and the rest into the yard</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">5</span>
                        <div>
                          <strong className="text-purple-800">Set the Scene:</strong>
                          <p className="text-purple-700">Pick the sky, weather and time of day</p>
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
                        Decorate your house
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Link 
                        href="/onboarding"
                        className="inline-block border border-black px-6 py-3 bg-purple-200 hover:bg-purple-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-bold"
                      >
                        Sign up to get a house
                      </Link>
                    </div>
                  )}
                </div>
              </RetroCard>

              <RetroCard title="Who sees it">
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Anyone walking the neighborhood sees your house, and it&apos;s the front door to your page.
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border border-gray-300 p-4 bg-green-50 rounded">
                      <h4 className="font-bold text-green-800 mb-2">What visitors notice</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Small details change when you&apos;ve been active lately</li>
                        <li>• Mailbox indicates guestbook messages</li>
                        <li>• Music notes appear when profile music plays</li>
                        <li>• Rain, snow and night skies if you set them</li>
                      </ul>
                    </div>
                    
                    <div className="border border-gray-300 p-4 bg-blue-50 rounded">
                      <h4 className="font-bold text-blue-800 mb-2">In the neighborhood</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Shows up in street, grid and map views</li>
                        <li>• Turns up when someone hits the random button</li>
                        <li>• Filterable by house type and palette</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-pink-50 border-l-4 border-pink-400 p-4">
                    <h3 className="font-bold text-pink-800 mb-2">Tips</h3>
                    <ul className="text-sm text-pink-700 space-y-1">
                      <li>• <strong>Seasons:</strong> Swap decorations when the weather turns</li>
                      <li>• <strong>Match:</strong> Paint the house like your page</li>
                      <li>• <strong>Try things:</strong> Nothing is permanent</li>
                      <li>• <strong>Leave some grass:</strong> A few pieces can beat a crowded yard</li>
                    </ul>
                  </div>
                </div>
              </RetroCard>
            </div>
          )}

          {activeTab === "social" && (
            <div className="space-y-6">
              <RetroCard title="Other people">
                <div className="space-y-4">
                  <p className="text-gray-700">
                    The ways people find and talk to each other here:
                  </p>

                  <div className="grid gap-4">
                    <div className="border border-gray-300 p-3 bg-blue-50">
                      <h4 className="font-bold text-blue-800 mb-1">Following and friends</h4>
                      <p className="text-sm text-blue-700">
                        Follow someone and their posts land in your feed.
                      </p>
                    </div>

                    <div className="border border-gray-300 p-3 bg-green-50">
                      <h4 className="font-bold text-green-800 mb-1">Guestbooks</h4>
                      <p className="text-sm text-green-700">
                        Every page has a guestbook. Sign your neighbors&apos; — it&apos;s the old-web way to say hi.
                      </p>
                    </div>

                    <div className="border border-gray-300 p-3 bg-purple-50">
                      <h4 className="font-bold text-purple-800 mb-1">Comments</h4>
                      <p className="text-sm text-purple-700">
                        Comments are threaded, so you can reply to a reply.
                      </p>
                    </div>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Keeping up">
                <div className="space-y-4">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <h3 className="font-bold text-yellow-800 mb-2">Notifications</h3>
                    <p className="text-sm text-yellow-700">
                      You get a notification when someone comments or replies, signs your guestbook,
                      follows you, or joins or forks a ring you host.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">Your feed</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Posts from people you follow and rings you&apos;ve joined, newest first. Nobody ranks it.
                    </p>
                    <Link 
                      href="/feed" 
                      className="block text-center border border-black px-3 py-2 bg-blue-100 hover:bg-blue-200 shadow-[1px_1px_0_#000]"
                    >
                      View Your Feed
                    </Link>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">Residents</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Everyone who lives here, searchable by name, handle or bio.
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

              <RetroCard title="House rules, short version">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold mb-3 text-green-700">Do&apos;s</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600"><PixelIcon name="check" size={12} /></span>
                          <span>Be kind</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600"><PixelIcon name="check" size={12} /></span>
                          <span>Post your own stuff</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600"><PixelIcon name="check" size={12} /></span>
                          <span>Say hi to new neighbors</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600"><PixelIcon name="check" size={12} /></span>
                          <span>Follow each ring&apos;s own rules</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600"><PixelIcon name="check" size={12} /></span>
                          <span>Keep it all-ages</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold mb-3 text-red-700">Don&apos;ts</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-red-600"><PixelIcon name="close" size={12} /></span>
                          <span>Share others&apos; private information</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600"><PixelIcon name="close" size={12} /></span>
                          <span>Post spam or off-topic stuff</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600"><PixelIcon name="close" size={12} /></span>
                          <span>Harass or bully anyone</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600"><PixelIcon name="close" size={12} /></span>
                          <span>Post hate or anything harmful</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600"><PixelIcon name="close" size={12} /></span>
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
              <RetroCard title="Posting">
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      Posts are written in markdown and can include images. A post lives on your page, and you can
                      also share it to any ring you&apos;re in.
                    </p>

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                      <h3 className="font-bold text-blue-800 mb-2">Markdown</h3>
                      <p className="text-sm text-blue-700 mb-3">
                        The basics:
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
                        <h4 className="font-bold text-green-800 mb-2">Images</h4>
                        <p className="text-sm text-green-700">
                          Add images to a post, or upload them to the photo gallery on your page.
                        </p>
                      </div>
                      
                      <div className="border border-gray-300 p-4 bg-purple-50">
                        <h4 className="font-bold text-purple-800 mb-2">Posting to a ring</h4>
                        <p className="text-sm text-purple-700">
                          Pick one or more rings when you write a post. It shows up in each ring&apos;s feed
                          as well as on your page.
                        </p>
                      </div>
                    </div>
                  </div>
                </RetroCard>

                <RetroCard title="Ideas">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold mb-3">Post Ideas</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Show &amp; Tell:</strong> Share projects you&apos;re working on</li>
                        <li>• <strong>Questions:</strong> Ask for advice or start discussions</li>
                        <li>• <strong>Resources:</strong> Share useful links and tools</li>
                        <li>• <strong>Stories:</strong> Tell personal experiences</li>
                        <li>• <strong>Updates:</strong> What you&apos;ve been up to</li>
                        <li>• <strong>Photos:</strong> With a line about where they&apos;re from</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold mb-3">On your page</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Bio:</strong> A few lines about you</li>
                        <li>• <strong>Photo gallery:</strong> Your pictures</li>
                        <li>• <strong>Posts:</strong> Short or long</li>
                        <li>• <strong>Friends:</strong> Who you&apos;re friends with</li>
                        <li>• <strong>Links:</strong> Your other sites</li>
                        <li>• <strong>Your design:</strong> CSS or a template</li>
                      </ul>
                    </div>
                  </div>
                </RetroCard>

              <RetroCard title="Where to do it">
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-bold mb-2">Write a Post</h4>
                      <p className="text-gray-600 mb-2">Goes on your page, and into any rings you pick.</p>
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
                        <li>&bull; Reply to the comments you get</li>
                        <li>&bull; Come back now and then</li>
                      </ul>
                    </div>
                  </div>
                </RetroCard>

              <RetroCard title="Getting replies">
                  <div className="space-y-3 text-sm">
                    <div className="bg-yellow-100 border border-yellow-300 p-3 rounded">
                      <h4 className="font-bold text-yellow-800 mb-1">No algorithm</h4>
                      <p className="text-yellow-700 text-xs">
                        Feeds are newest first, so nothing gets boosted. Posts that ask a question tend to get answers.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">What helps</h4>
                      <ul className="text-gray-600 space-y-1 text-xs">
                        <li>• Comment on other people&apos;s posts</li>
                        <li>• Answer questions you know the answer to</li>
                        <li>• Sign guestbooks</li>
                        <li>• Join a ring or two and post there</li>
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
            <h2 className="text-xl font-bold mb-3">Not signed up yet?</h2>
            <p className="text-gray-600 mb-4">
              It&apos;s free. Bring a lawn chair.
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
                Read the feed
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