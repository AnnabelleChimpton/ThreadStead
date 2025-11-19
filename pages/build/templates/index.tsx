import React from "react";
import { GetServerSideProps, NextApiRequest } from "next";
import Link from "next/link";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { PixelIcon } from "@/components/ui/PixelIcon";

interface TemplatesIndexProps {
  siteConfig: SiteConfig;
  username: string | null;
}

export default function TemplatesIndex({ siteConfig, username }: TemplatesIndexProps) {
  return (
    <Layout siteConfig={siteConfig} fullWidth={true}>
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-purple-50">
        <div className="w-full px-4 sm:px-6 py-8 sm:py-12 max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-6xl font-black mb-4 text-gray-900">
              <PixelIcon name="paint-bucket" size={48} className="inline-block align-middle mr-2" /> Customize Your Profile
            </h1>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto mb-4">
              Three ways to make your profile unique
            </p>
            <p className="text-sm text-gray-600 max-w-xl mx-auto">
              Start simple with CSS styling, or go advanced with our Visual Builder and Template Language.
            </p>
          </div>

          {/* New to Threadstead? */}
          <div className="mb-12">
            <RetroCard>
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-3 border-yellow-400 p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl"><PixelIcon name="human-handsup" size={32} /></div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black mb-2">New to Threadstead?</h2>
                    <p className="text-gray-700 mb-3">
                      Start with <strong>CSS Styling</strong> if you just want to change colors and fonts on your profile.
                      It&apos;s the simplest way to customize!
                    </p>
                    <p className="text-sm text-gray-600">
                      Want custom layouts? Try <strong>Visual Builder</strong> (drag & drop) or <strong>Template Language</strong> (for developers).
                    </p>
                  </div>
                </div>
              </div>
            </RetroCard>
          </div>

          {/* Three Customization Paths */}
          <div className="space-y-8 mb-16">
            {/* CSS Styling - SIMPLEST PATH */}
            <RetroCard>
              <div className="text-center">
                <div className="bg-green-100 border-2 border-green-500 rounded-lg px-4 py-2 inline-block mb-3">
                  <span className="text-green-800 font-bold text-sm"><PixelIcon name="bookmark" className="inline-block align-middle mr-1" /> SIMPLEST - Start Here!</span>
                </div>
                <div className="text-6xl mb-4"><PixelIcon name="paint-bucket" size={48} /></div>
                <h2 className="text-3xl font-black mb-3">CSS Styling</h2>
                <p className="text-gray-600 mb-6">
                  Just want to change colors, fonts, and spacing? Style your default profile layout without touching complex systems. Perfect for quick customization.
                </p>

                <div className="space-y-3 mb-6 text-left max-w-md mx-auto">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">Simple text editor with CSS</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">Built-in class reference</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">Live preview of changes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">No layout building required</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href={username ? `/resident/${username}/css-editor` : "/settings?tab=appearance"}
                    className="px-6 py-3 bg-green-200 border-3 border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] transition-all font-bold text-center"
                  >
                    <PixelIcon name="edit" className="inline-block align-middle mr-1" /> Start CSS Styling
                  </Link>
                  <Link
                    href="/design-css-tutorial"
                    className="px-6 py-3 bg-white border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium text-center"
                  >
                    CSS Class Reference
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mt-3">(5 minutes - just style what&apos;s already there)</p>
              </div>
            </RetroCard>

            {/* Visual Builder Mode */}
            <RetroCard>
              <div className="text-center">
                <div className="text-6xl mb-4"><PixelIcon name="drag-and-drop" size={48} /></div>
                <h2 className="text-3xl font-black mb-3">Visual Builder</h2>
                <p className="text-gray-600 mb-6">
                  Build completely custom layouts with drag-and-drop. Create unique page structures without code. Perfect for creative designs.
                </p>

                <div className="space-y-3 mb-6 text-left max-w-md mx-auto">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">Drag & drop interface</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">200+ retro components</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">Grid positioning system</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">Custom page layouts</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href={username ? `/resident/${username}/template-editor?mode=visual` : "/settings?tab=appearance"}
                    className="px-6 py-3 bg-purple-200 border-3 border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] transition-all font-bold text-center"
                  >
                    <PixelIcon name="paint-bucket" size={16} className="inline-block align-middle mr-1" /> Open Visual Builder
                  </Link>
                  <Link
                    href="/templates/components?filter=visual-builder"
                    className="px-6 py-3 bg-white border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium text-center"
                  >
                    Browse Components
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mt-3">(30 minutes - build custom layouts visually)</p>
              </div>
            </RetroCard>

            {/* Template Language Mode */}
            <RetroCard>
              <div className="text-center">
                <div className="text-6xl mb-4"><PixelIcon name="code" size={48} /></div>
                <h2 className="text-3xl font-black mb-3">Template Language</h2>
                <p className="text-gray-600 mb-6">
                  Build dynamic, interactive features with code. Perfect for developers who want variables, loops, conditionals, and full programming control.
                </p>

                <div className="space-y-3 mb-6 text-left max-w-md mx-auto">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">XML-like syntax</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">Variables, loops, conditionals</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">Interactive components</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold"><PixelIcon name="check" size={14} /></span>
                    <span className="text-sm">Dynamic content generation</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href={username ? `/resident/${username}/template-editor?mode=template` : "/settings?tab=appearance"}
                    className="px-6 py-3 bg-blue-200 border-3 border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] transition-all font-bold text-center"
                  >
                    <PixelIcon name="code" size={16} className="inline-block align-middle mr-1" /> Open Template Editor
                  </Link>
                  <Link
                    href="/templates/tutorials/your-first-template"
                    className="px-6 py-3 bg-white border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium text-center"
                  >
                    <PixelIcon name="script" size={16} className="inline-block align-middle mr-1" /> Coding Tutorial
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mt-3">(1+ hour - requires coding knowledge)</p>
              </div>
            </RetroCard>
          </div>

          {/* Comparison Section */}
          <RetroCard title="Which Path Should I Choose?">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left p-3 font-bold">Feature</th>
                    <th className="text-center p-3 font-bold bg-green-50">CSS Styling</th>
                    <th className="text-center p-3 font-bold">Visual Builder</th>
                    <th className="text-center p-3 font-bold">Template Language</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">No coding required</td>
                    <td className="text-center p-3 bg-green-50"><span className="text-green-600 font-bold text-xl"><PixelIcon name="check" size={20} /></span></td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl"><PixelIcon name="check" size={20} /></span></td>
                    <td className="text-center p-3"><span className="text-gray-300">−</span></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">Change colors & fonts</td>
                    <td className="text-center p-3 bg-green-50"><span className="text-green-600 font-bold text-xl"><PixelIcon name="check" size={20} /></span></td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl"><PixelIcon name="check" size={20} /></span></td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl"><PixelIcon name="check" size={20} /></span></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">Custom layouts</td>
                    <td className="text-center p-3 bg-green-50"><span className="text-gray-300">−</span></td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl"><PixelIcon name="check" size={20} /></span></td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl"><PixelIcon name="check" size={20} /></span></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">Variables & state</td>
                    <td className="text-center p-3 bg-green-50"><span className="text-gray-300">−</span></td>
                    <td className="text-center p-3"><span className="text-gray-300">−</span></td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl"><PixelIcon name="check" size={20} /></span></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">Conditionals & loops</td>
                    <td className="text-center p-3 bg-green-50"><span className="text-gray-300">−</span></td>
                    <td className="text-center p-3"><span className="text-gray-300">−</span></td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl"><PixelIcon name="check" size={20} /></span></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">Learning time</td>
                    <td className="text-center p-3 bg-green-50">5 minutes</td>
                    <td className="text-center p-3">30 minutes</td>
                    <td className="text-center p-3">1+ hour</td>
                  </tr>
                  <tr>
                    <td className="p-3">Best for</td>
                    <td className="text-center p-3 text-xs bg-green-50">Quick styling, beginners</td>
                    <td className="text-center p-3 text-xs">Static custom layouts</td>
                    <td className="text-center p-3 text-xs">Dynamic interactive content</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </RetroCard>

          {/* FAQ Section */}
          <div className="mt-12">
            <h2 className="text-3xl font-black mb-6 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <RetroCard>
                <h3 className="font-bold mb-2">I just want to change colors - which should I use?</h3>
                <p className="text-sm text-gray-700">
                  Start with <strong>CSS Styling</strong>! It&apos;s the simplest path - just add CSS to style your default profile layout without building custom layouts. Perfect for changing colors, fonts, and spacing.
                </p>
              </RetroCard>

              <RetroCard>
                <h3 className="font-bold mb-2">Can I combine CSS Styling with Visual Builder?</h3>
                <p className="text-sm text-gray-700">
                  Yes! CSS Styling works with any layout option. You can use CSS Styling alone on the default layout, or combine it with Visual Builder custom layouts, or with Template Language code.
                </p>
              </RetroCard>

              <RetroCard>
                <h3 className="font-bold mb-2">Can I switch from Visual Builder to Template Language?</h3>
                <p className="text-sm text-gray-700">
                  Visual Builder templates generate template language code behind the scenes. You can export your visual design as code and continue editing in the template editor to add advanced features.
                </p>
              </RetroCard>

              <RetroCard>
                <h3 className="font-bold mb-2">Do I need to know CSS to customize my profile?</h3>
                <p className="text-sm text-gray-700">
                  Not required! You can use Visual Builder (drag & drop) without any code knowledge. However, basic CSS knowledge lets you do quick styling changes. Check out our CSS Class Reference for beginner-friendly examples.
                </p>
              </RetroCard>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<TemplatesIndexProps> = async ({ req }) => {
  const siteConfig = await getSiteConfig();

  // Get current user to provide direct editor links
  let username: string | null = null;
  try {
    const { getSessionUser } = await import('@/lib/auth/server');
    const user = await getSessionUser(req as NextApiRequest);
    if (user?.primaryHandle) {
      username = user.primaryHandle.split('@')[0];
    }
  } catch (error) {
    // If user fetch fails, links will fall back to settings page
  }

  return {
    props: {
      siteConfig,
      username,
    },
  };
};
