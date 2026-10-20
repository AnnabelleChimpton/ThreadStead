import { useState } from "react";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import PageHeader from '@/components/ui/layout/PageHeader';
import ButtonLink, { buttonClasses } from '@/components/ui/ButtonLink';
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import Link from "next/link";
import Head from "next/head";
import FeatureGate, { NewUserTooltip } from "@/components/features/onboarding/FeatureGate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { useWelcomeRingMissing, WELCOME_RING_PATH } from "@/components/features/onboarding/useWelcomeRing";

interface GettingStartedProps {
  siteConfig: SiteConfig;
}

export default function GettingStarted({ siteConfig }: GettingStartedProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "threadrings" | "profiles" | "pixel-homes" | "social" | "content">("overview");
  const { user } = useCurrentUser();
  const welcomeRingMissing = useWelcomeRingMissing();

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
      role="tab"
      aria-selected={activeTab === tabId}
      aria-label={label}
      className="ts-tab inline-flex items-center gap-1 text-sm"
    >
      <span aria-hidden="true">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <Layout siteConfig={siteConfig}>
      <Head>
        <title>{`Getting started | ${siteConfig.site_name}`}</title>
      </Head>
      <div className="space-y-6">
        <PageHeader title={`Getting started on ${siteConfig.site_name}`} className="mb-0 sm:mb-0">
          {!user ? (
            <>
              <p>
                Everyone here gets a pixel house on the street and a page you can make look however you want, and you can join little groups called <strong>ThreadRings</strong>. This page walks through all of it.
              </p>
              <p className="flex flex-wrap gap-3 pt-2">
                <ButtonLink href="/onboarding">Make an account</ButtonLink>
                <ButtonLink href="/threadrings" variant="secondary">Browse Rings</ButtonLink>
              </p>
            </>
          ) : (
            <>
              <p>
                Each tab covers one part of the site, so jump to whatever you&apos;re curious about.
              </p>
              <p className="flex flex-wrap gap-3 pt-2">
                {welcomeRingMissing ? (
                  <ButtonLink href="/threadrings">Browse Rings</ButtonLink>
                ) : (
                  <ButtonLink href={WELCOME_RING_PATH}>Start with Welcome Ring</ButtonLink>
                )}
                <ButtonLink href="/settings?tab=appearance" variant="secondary">Customize Profile</ButtonLink>
              </p>
            </>
          )}
        </PageHeader>

        {/* Navigation Tabs */}
        <div className="thread-module">
          <div className="flex flex-wrap gap-1 justify-center border-b-2 border-dotted border-nb-ink-mid/40" role="tablist">
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
                    <div className="flex items-center gap-3 border-l-4 border-nb-lav pl-3 py-1">
                      <div className="text-2xl"><PixelIcon name="user" size={24} /></div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">1. Make an account</h3>
                        <p className="text-sm text-nb-ink-mid">Pick a username and you get a page and a house.</p>
                      </div>
                      <Link 
                        href="/onboarding" 
                        className="thread-button btn btn--primary text-sm"
                      >
                        Start
                      </Link>
                    </div>
                    
                    <div className="flex items-center gap-3 border-l-4 border-nb-lav pl-3 py-1">
                      <div className="text-2xl"><PixelIcon name="link" size={24} /></div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">2. Join a ring</h3>
                        <p className="text-sm text-nb-ink-mid">Find a ring about something you care about.</p>
                      </div>
                      <Link 
                        href="/threadrings" 
                        className="thread-button btn btn--secondary text-sm"
                      >
                        Browse
                      </Link>
                    </div>
                    
                    <div className="flex items-center gap-3 border-l-4 border-nb-lav pl-3 py-1">
                      <div className="text-2xl"><PixelIcon name="chat" size={24} /></div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1">3. Say hi</h3>
                        <p className="text-sm text-nb-ink-mid">Write a post or sign someone&apos;s guestbook.</p>
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
                        {!welcomeRingMissing && (
                          <Link
                            href={WELCOME_RING_PATH}
                            className="ts-card-link block p-3 border-2 border-dotted border-nb-ink-mid/60 rounded-md hover:border-solid hover:border-nb-ink-mid"
                          >
                            <div className="font-medium">Try Welcome Ring</div>
                            <div className="text-sm text-nb-ink-mid">A five-step tour of how rings work</div>
                          </Link>
                        )}
                        <Link 
                          href="/post/new" 
                          className="ts-card-link block p-3 border-2 border-dotted border-nb-ink-mid/60 rounded-md hover:border-solid hover:border-nb-ink-mid"
                        >
                          <div className="font-medium">Write a Post</div>
                          <div className="text-sm text-nb-ink-mid">It goes on your page, and into any ring you pick</div>
                        </Link>
                        <Link 
                          href="/threadrings" 
                          className="ts-card-link block p-3 border-2 border-dotted border-nb-ink-mid/60 rounded-md hover:border-solid hover:border-nb-ink-mid"
                        >
                          <div className="font-medium">Browse Rings</div>
                          <div className="text-sm text-nb-ink-mid">Every ring on the site</div>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="font-bold text-lg">Customize</h3>
                      <div className="space-y-2">
                        <Link
                          href="/settings"
                          className="ts-card-link block p-3 border-2 border-dotted border-nb-ink-mid/60 rounded-md hover:border-solid hover:border-nb-ink-mid"
                        >
                          <div className="font-medium">Profile Settings</div>
                          <div className="text-sm text-nb-ink-mid">Name, bio, photo, friends and links</div>
                        </Link>
                        {user ? (
                          <Link 
                            href={`/home/${user.primaryHandle?.split('@')[0]}/decorate`}
                            className="ts-card-link block p-3 border-2 border-dotted border-nb-ink-mid/60 rounded-md hover:border-solid hover:border-nb-ink-mid"
                          >
                            <div className="font-medium">Decorate Pixel Home</div>
                            <div className="text-sm text-nb-ink-mid">Paint the house, plant the yard</div>
                          </Link>
                        ) : (
                          <Link 
                            href="/onboarding"
                            className="ts-card-link block p-3 border-2 border-dotted border-nb-ink-mid/60 rounded-md hover:border-solid hover:border-nb-ink-mid"
                          >
                            <div className="font-medium">Decorate Pixel Home</div>
                            <div className="text-sm text-nb-ink-mid">Sign up to get a house</div>
                          </Link>
                        )}
                        <Link
                          href="/build/templates"
                          className="ts-card-link block p-3 border-2 border-dotted border-nb-ink-mid/60 rounded-md hover:border-solid hover:border-nb-ink-mid"
                        >
                          <div className="font-medium">Templates & CSS</div>
                          <div className="text-sm text-nb-ink-mid">Template Language & CSS guides</div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </RetroCard>
              )}

              <RetroCard title="What&apos;s here">
                <p className="text-nb-ink leading-relaxed">
                  Your house sits on a street with everyone else&apos;s, and you can paint it and fill up the yard however
                  you like. Behind the front door is your page, which you can restyle with CSS or write from scratch with a
                  template. Rings are small groups around one topic, and any ring can branch into a new one, so they all
                  fit in one big family tree. There&apos;s the old-web stuff too, like guestbooks, MIDI music and 88×31 badges.
                </p>
              </RetroCard>
            </div>
          )}

          {activeTab === "threadrings" && (
            <div className="space-y-6">
                <RetroCard title="How rings work">
                  <div className="space-y-4">
                    <p className="text-nb-ink leading-relaxed">
                      A ThreadRing is a small group around one topic. Members post to it, the posts show up in the
                      ring&apos;s feed, and everyone can reply. If you want a narrower version of a ring, you can branch it.
                      The new ring has its own host and members, but it stays linked to the ring it came from. Anyone with
                      an account can branch a ring, unless it&apos;s private.
                    </p>

                    <div className="grid md:grid-cols-2 gap-4 mt-6">
                      <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
                        <h4 className="font-bold mb-2">Join Types</h4>
                        <ul className="text-sm space-y-1">
                          <li><strong>Open:</strong> Anyone can join instantly</li>
                          <li><strong>Invite:</strong> The host or a moderator invites you</li>
                          <li><strong>Closed:</strong> No new members accepted</li>
                        </ul>
                      </div>
                      
                      <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
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
                
                <RetroCard title="The family tree">
                  <div className="space-y-4">
                    <p className="text-nb-ink">
                      Every ring traces back to The Spool, the very first one. Branch a ring and yours shows up as its
                      child in the tree.
                    </p>
                    
                    <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
                      <div className="text-center">
                        <div className="text-3xl mb-2">The Spool</div>
                        <div className="text-sm text-nb-ink-mid mb-3">↓ branches into ↓</div>
                        <div className="flex justify-center gap-4 text-lg">
                          <span>BookLovers</span>
                          <span>GameDevs</span>
                          <span>Gardening</span>
                        </div>
                        <div className="text-sm text-nb-ink-mid mt-2">...which can branch into more specialized communities</div>
                      </div>
                    </div>
                    
                    <Link 
                      href="/threadrings/genealogy" 
                      className={`${buttonClasses("primary", "sm")} block text-center`}
                    >
                      See the family tree
                    </Link>
                  </div>
                </RetroCard>

                <RetroCard title="Getting Started with ThreadRings">
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-bold mb-2">1. Browse</h4>
                      <p className="text-nb-ink-mid mb-2">Look through the rings list.</p>
                      <Link 
                        href="/threadrings" 
                        className={`${buttonClasses("secondary", "sm")} block text-center`}
                      >
                        Browse ThreadRings
                      </Link>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">2. Join an open ring</h4>
                      <p className="text-nb-ink-mid">Click &quot;Join Ring&quot; on any open ring.</p>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">3. Start your own</h4>
                      <p className="text-nb-ink-mid mb-2">A brand new ring is a branch off The Spool.</p>
                      <FeatureGate 
                        requiresRegularUser 
                        user={user} 
                        fallback={<NewUserTooltip feature="creating new rings" />}
                      >
                        <Link 
                          href="/tr/spool/fork" 
                          className={`${buttonClasses("secondary", "sm")} block text-center`}
                        >
                          Branch from The Spool
                        </Link>
                      </FeatureGate>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">4. Or branch an existing one</h4>
                      <p className="text-nb-ink-mid">Use Branch This Ring on any ring&apos;s page to make a narrower one.</p>
                    </div>
                  </div>
                </RetroCard>

                <div>
                <RetroCard title="ThreadRing Badges">
                  <div className="text-center space-y-3">
                    <div className="bg-nb-paper border border-nb-ink-mid w-[88px] h-[31px] mx-auto flex items-center justify-center text-xs">
                      88x31 Badge
                    </div>
                    <p className="text-sm text-nb-ink-mid">
                      Each ring has an 88×31 badge, the tiny buttons old sites used to link to each other. You can show
                      the badges of rings you&apos;re in on your page from Settings → Badges.
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
                  <p className="text-nb-ink leading-relaxed">
                    Your page is what&apos;s behind your house&apos;s front door, and it&apos;s yours to do whatever you want with.
                    It has tabs for your posts, your photos, your friends and favorite websites, your ring badges and your
                    guestbook.
                  </p>

                  <div className="border-l-4 border-nb-lav pl-4 py-1">
                    <h3 className="font-bold text-nb-ink mb-2">Design Your Profile</h3>
                    <p className="text-sm text-nb-ink mb-3">
                      Two ways to change it:
                    </p>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3">
                        <strong className="text-nb-ink">CSS Styling</strong>
                        <div className="text-nb-ink">Change colors, fonts and spacing on the standard page</div>
                      </div>
                      <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3">
                        <strong className="text-nb-ink">Template Language</strong>
                        <div className="text-nb-ink">Write the page&apos;s HTML yourself</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold">Default Themes</h4>
                    <p className="text-sm text-nb-ink-mid">Pick one to start from, then change whatever you like:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100">
                        <div className="text-lg mb-1"><PixelIcon name="paint-bucket" size={18} /></div>
                        <div className="font-bold text-xs">Abstract Art</div>
                        <div className="text-xs text-nb-ink-mid mt-1">Bright and loud</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gray-900 text-white">
                        <div className="text-lg mb-1"><PixelIcon name="heart" size={18} /></div>
                        <div className="font-bold text-xs text-green-400 font-mono">Charcoal Nights</div>
                        <div className="text-xs text-green-300 mt-1">Terminal aesthetic</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gradient-to-br from-pink-200 to-purple-100">
                        <div className="text-lg mb-1"><PixelIcon name="drop" size={18} /></div>
                        <div className="font-bold text-xs text-nb-ink">Pixel Petals</div>
                        <div className="text-xs text-pink-600 mt-1">Pink and soft</div>
                      </div>
                      <div className="border-2 border-black shadow-[2px_2px_0_#000] p-3 bg-gradient-to-br from-blue-100 to-purple-100">
                        <div className="text-lg mb-1"><PixelIcon name="users" size={18} /></div>
                        <div className="font-bold text-xs text-nb-ink">Retro Social</div>
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
                        <div className="text-xs text-nb-ink-mid mt-1">A blank page</div>
                      </div>
                    </div>
                    <p className="text-xs text-nb-ink-mid">When you sign up, your page colors are matched to the house you pick. You can switch to any of these later with Browse Themes in the CSS editor.</p>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Changing how your page looks">
                <div className="space-y-4">
                  <div className="bg-nb-paper border-2 border-nb-ink-mid rounded-cozy shadow-nb-sm p-4">
                    <h3 className="font-bold mb-2">CSS styling: start here</h3>
                    <p className="text-sm mb-3">
                      If you want different colors and fonts, a little CSS on the normal layout goes a long way. The
                      class reference lists every part of the page you can style.
                    </p>
                    <div className="text-xs text-nb-ink">
                      Good for: colors, fonts, spacing, a first try
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold mb-2 text-sm">CSS Styling</h4>
                      <div className="space-y-2 text-sm">
                        <Link
                          href="/settings?tab=appearance"
                          className={`${buttonClasses("primary", "sm")} block text-center`}
                        >
                          Open CSS Editor
                        </Link>
                        <p className="text-nb-ink-mid text-xs">
                          Colors, fonts and spacing on the standard layout, with a class reference beside the editor.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2 text-sm">Template Code</h4>
                      <div className="space-y-2 text-sm">
                        <Link
                          href="/build/templates/tutorials/make-it-yours"
                          className={`${buttonClasses("secondary", "sm")} block text-center`}
                        >
                          First tutorial
                        </Link>
                        <p className="text-nb-ink-mid text-xs">
                          Write the page&apos;s HTML with variables, loops and conditionals.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">Profile Settings</h4>
                    <div className="space-y-2 text-sm">
                      <Link
                        href="/settings"
                        className={`${buttonClasses("primary", "sm")} block text-center`}
                      >
                        Edit Profile Settings
                      </Link>
                      <p className="text-nb-ink-mid text-xs">
                        Your display name, bio, photo, featured friends and website links.
                      </p>
                    </div>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Profile Music with MIDI">
                <p className="text-nb-ink leading-relaxed">
                  Upload a MIDI file in Settings → Music and you get a little player in the corner of your page. Visitors
                  can start and stop it and change the volume. It only starts by itself if you turn on autoplay, and even
                  then most browsers wait until the visitor clicks something. The{' '}
                  <Link href="/help/music-guide" className="underline">music guide</Link> has places to find MIDIs and tips
                  for making your own.
                </p>
              </RetroCard>

              <RetroCard title="Signing in">
                <div className="space-y-4">
                  <p className="text-nb-ink leading-relaxed">
                    When you sign up you choose between a password and a 12-word seed phrase. If you add an email and
                    verify it, you can also sign in with a link sent to your inbox. A seed phrase account can add a password
                    later in Settings → Account &amp; Security, and you don&apos;t need to give an email at all. Whichever you
                    pick, every account has a decentralized identifier (DID) underneath.
                  </p>

                  <div className="border-t pt-4">
                    <Link 
                      href="/settings" 
                      className={`${buttonClasses("primary", "sm")} block text-center`}
                    >
                      Account Settings
                    </Link>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="Your address">
                <div className="space-y-3">
                  <p className="text-sm text-nb-ink">
                    Your page lives at:
                  </p>
                  <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3 font-mono text-sm text-center">
                    /resident/<strong>username</strong>
                  </div>
                  <p className="text-xs text-nb-ink-mid">
                    Usernames can&apos;t be changed right now, so it won&apos;t move.
                  </p>
                </div>
              </RetroCard>
            </div>
          )}

          {activeTab === "pixel-homes" && (
            <div className="space-y-6">
              <RetroCard title="Your pixel house">
                <div className="space-y-4">
                  <p className="text-nb-ink leading-relaxed">
                    Everyone on {siteConfig.site_name} gets an 8-bit house on a shared street. Neighbors walk past it,
                    and clicking the door takes them to your page.
                  </p>

                  <p className="text-nb-ink leading-relaxed">
                    You can pick one of four houses (a cottage, townhouse, loft or log cabin), change its colors, door,
                    windows and roof trim, and add things like a chimney, welcome mat, lights and a house number. The Text
                    tab lets you give your house a title and paint a short sign on it.
                  </p>
                </div>
              </RetroCard>

              <RetroCard title="The yard">
                <p className="text-nb-ink leading-relaxed">
                  Drag pieces into the yard from the Decor tab. There are roses and sunflowers and little trees, garden
                  benches and lanterns, ponds and fountains, a wishing well, and yes, garden gnomes. Terrain lets you paint
                  the ground itself, from grass to cobblestone, and My Art is for uploading your own pixel art. The sky can
                  be sunny, cloudy, sunset or night. There&apos;s a 100-decoration limit, which sounds like a lot until you
                  start.
                </p>
                <div className="mt-4">
                  {user ? (
                    <div className="text-center">
                      <Link 
                        href={`/home/${user.primaryHandle?.split('@')[0]}/decorate`}
                        className={buttonClasses("primary")}
                      >
                        Decorate your house
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Link 
                        href="/onboarding"
                        className={buttonClasses("secondary")}
                      >
                        Sign up to get a house
                      </Link>
                    </div>
                  )}
                </div>
              </RetroCard>

              <RetroCard title="Who sees it">
                <div className="space-y-4">
                  <p className="text-nb-ink leading-relaxed">
                    Anyone walking the neighborhood sees your house. It shows up in the street, grid and map views, people
                    can filter for it by house style and palette, and it might come up when someone hits Random.
                  </p>
                  <p className="text-nb-ink leading-relaxed">
                    A tip: painting your house to match your page is a nice touch, and a few pieces can look better than a
                    crowded yard. Nothing is permanent, so try things!
                  </p>
                </div>
              </RetroCard>
            </div>
          )}

          {activeTab === "social" && (
            <div className="space-y-6">
              <RetroCard title="Other people">
                <p className="text-nb-ink leading-relaxed">
                  Follow someone and their posts land in your Following feed. If they follow you back, you&apos;re friends.
                  Every page has a guestbook, and signing your neighbors&apos; is the old-web way to say hi. Comments on
                  posts are threaded, so you can reply to a reply.
                </p>
              </RetroCard>

              <RetroCard title="Keeping up">
                <div className="space-y-4">
                  <div className="border-l-4 border-nb-lav pl-4 py-1">
                    <h3 className="font-bold text-nb-ink mb-2">Notifications</h3>
                    <p className="text-sm text-nb-ink">
                      You get a notification when someone comments on your post or replies to you, signs your
                      guestbook, follows you, or invites you to a ring.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">Your feed</h4>
                    <p className="text-sm text-nb-ink-mid mb-3">
                      The Following tab has posts from people you follow, newest first, and I don&apos;t rank it.
                      Recent has everyone&apos;s public posts.
                    </p>
                    <Link 
                      href="/feed" 
                      className={`${buttonClasses("secondary", "sm")} block text-center`}
                    >
                      View Your Feed
                    </Link>
                  </div>

                  <div>
                    <h4 className="font-bold mb-2">Residents</h4>
                    <p className="text-sm text-nb-ink-mid mb-3">
                      Everyone here with a public page. You can search by name, username or bio.
                    </p>
                    <Link 
                      href="/neighborhood/residents"
                      className={`${buttonClasses("primary", "sm")} block text-center`}
                    >
                      Browse residents
                    </Link>
                  </div>
                </div>
              </RetroCard>

              <RetroCard title="House rules, short version">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold mb-3 text-nb-ink">Do&apos;s</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-nb-ink-mid"><PixelIcon name="check" size={12} /></span>
                          <span>Be kind</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-nb-ink-mid"><PixelIcon name="check" size={12} /></span>
                          <span>Post your own stuff</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-nb-ink-mid"><PixelIcon name="check" size={12} /></span>
                          <span>Say hi to new neighbors</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-nb-ink-mid"><PixelIcon name="check" size={12} /></span>
                          <span>Follow each ring&apos;s own rules</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-nb-ink-mid"><PixelIcon name="check" size={12} /></span>
                          <span>Keep it all-ages</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold mb-3 text-nb-ink">Don&apos;ts</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-nb-ink-mid"><PixelIcon name="close" size={12} /></span>
                          <span>Share others&apos; private information</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-nb-ink-mid"><PixelIcon name="close" size={12} /></span>
                          <span>Post spam or off-topic stuff</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-nb-ink-mid"><PixelIcon name="close" size={12} /></span>
                          <span>Harass or bully anyone</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-nb-ink-mid"><PixelIcon name="close" size={12} /></span>
                          <span>Post hate or anything harmful</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-nb-ink-mid"><PixelIcon name="close" size={12} /></span>
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
                    <p className="text-nb-ink">
                      You write posts in Markdown, and there&apos;s a toolbar if you don&apos;t know it, plus a preview.
                      To add a picture, click Upload Image or drag it into the post. Every post lives on your page, and you
                      can send it to any rings you&apos;re in too.
                    </p>

                    <div className="border-l-4 border-nb-lav pl-4 py-1">
                      <h3 className="font-bold text-nb-ink mb-2">Markdown</h3>
                      <p className="text-sm text-nb-ink mb-3">
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

                    <div>
                      <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
                        <h4 className="font-bold text-nb-ink mb-2">Images</h4>
                        <p className="text-sm text-nb-ink">
                          Add images to a post, or upload them to the photo gallery on your page.
                        </p>
                      </div>
                      
                      <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
                        <h4 className="font-bold text-nb-ink mb-2">Posting to a ring</h4>
                        <p className="text-sm text-nb-ink">
                          Pick one or more rings when you write a post. It shows up in each ring&apos;s feed
                          as well as on your page.
                        </p>
                      </div>
                    </div>
                  </div>
                </RetroCard>

              <RetroCard title="Where to do it">
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-bold mb-2">Write a Post</h4>
                      <p className="text-nb-ink-mid mb-2">Goes on your page, and into any rings you pick.</p>
                      <Link 
                        href="/post/new" 
                        className={`${buttonClasses("primary", "sm")} block text-center`}
                      >
                        New Post
                      </Link>
                    </div>

                    <div>
                      <h4 className="font-bold mb-2">Upload Media</h4>
                      <p className="text-nb-ink-mid mb-0">Photos go on the Media tab of your page, and MIDI goes in Settings → Music.</p>
                    </div>
                  </div>
                </RetroCard>

              <RetroCard title="Getting replies">
                  <p className="text-nb-ink leading-relaxed">
                    Following and Recent are newest first, so nothing gets boosted. Honestly the easiest way to get
                    replies is to reply to other people, and posting in a ring or two helps a lot.
                  </p>
                </RetroCard>
            </div>
          )}
        </div>

        {!user && (
        <RetroCard title="">
          <div className="text-center py-4">
            <h2 className="text-xl font-bold mb-3">Not signed up yet?</h2>
            <p className="text-nb-ink-mid mb-4">
              It&apos;s free! Grab a tea and come meet the neighbors &lt;3
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href="/onboarding" 
                className={buttonClasses("primary")}
              >
                Make an account
              </Link>
              <Link 
                href="/feed" 
                className={buttonClasses("secondary")}
              >
                Read the feed
              </Link>
            </div>
          </div>
        </RetroCard>
        )}
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