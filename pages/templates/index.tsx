import React from "react";
import { GetServerSideProps } from "next";
import Link from "next/link";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";

interface TemplatesIndexProps {
  siteConfig: SiteConfig;
}

export default function TemplatesIndex({ siteConfig }: TemplatesIndexProps) {
  return (
    <Layout siteConfig={siteConfig} fullWidth={true}>
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-purple-50">
        <div className="w-full px-4 sm:px-6 py-8 sm:py-12 max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-6xl font-black mb-4 text-gray-900">
              🎨 Threadstead Templates
            </h1>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto mb-4">
              One powerful component library, two ways to build
            </p>
            <p className="text-sm text-gray-600 max-w-xl mx-auto">
              Choose drag-and-drop simplicity or code-based control. Either way, you get access to the same 200+ components.
            </p>
          </div>

          {/* New to Threadstead? */}
          <div className="mb-12">
            <RetroCard>
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-3 border-yellow-400 p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">👋</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black mb-2">New to Threadstead?</h2>
                    <p className="text-gray-700 mb-3">
                      Start with <strong>Visual Builder</strong> if you want to design without coding.
                      It&apos;s perfect for beginners and you can always add code later!
                    </p>
                    <p className="text-sm text-gray-600">
                      Already a developer? Jump straight to <strong>Template Language</strong> for full programming power.
                    </p>
                  </div>
                </div>
              </div>
            </RetroCard>
          </div>

          {/* Two Modes - Single Column */}
          <div className="space-y-8 mb-16">
            {/* Visual Builder Mode */}
            <RetroCard>
              <div className="text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h2 className="text-3xl font-black mb-3">Visual Builder</h2>
                <p className="text-gray-600 mb-6">
                  Use our drag-and-drop interface to build with the full component library. Perfect for quick designs and visual thinkers. Add custom code anytime.
                </p>

                <div className="space-y-3 mb-6 text-left max-w-md mx-auto">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm">Drag & drop interface</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm">Retro components (CRT, VHS, arcade buttons)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm">Real-time preview</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm">No coding required</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/design-tutorial"
                    className="px-6 py-3 bg-purple-200 border-3 border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] transition-all font-bold text-center"
                  >
                    📖 Visual Builder Guide
                  </Link>
                  <Link
                    href="/templates/components?filter=visual-builder"
                    className="px-6 py-3 bg-white border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium text-center"
                  >
                    Browse Components
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mt-3">(No code required)</p>
              </div>
            </RetroCard>

            {/* Template Language Mode */}
            <RetroCard>
              <div className="text-center">
                <div className="text-6xl mb-4">💻</div>
                <h2 className="text-3xl font-black mb-3">Template Language</h2>
                <p className="text-gray-600 mb-6">
                  Code directly with the same component library plus advanced programming features. Perfect for developers who want variables, conditionals, loops, and full interactivity.
                </p>

                <div className="space-y-3 mb-6 text-left max-w-md mx-auto">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm">XML-like syntax</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm">Variables, loops, conditionals</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm">Interactive components</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-sm">Full programming power</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/templates/tutorials/your-first-template"
                    className="px-6 py-3 bg-green-200 border-3 border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] transition-all font-bold text-center"
                  >
                    📚 Start Coding Tutorial
                  </Link>
                  <Link
                    href="/templates/components"
                    className="px-6 py-3 bg-white border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium text-center"
                  >
                    Component Reference
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mt-3">(Coding skills helpful)</p>
              </div>
            </RetroCard>
          </div>

          {/* Comparison Section */}
          <RetroCard title="Which Mode Should I Choose?">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left p-3 font-bold">Feature</th>
                    <th className="text-center p-3 font-bold">Visual Builder</th>
                    <th className="text-center p-3 font-bold">Template Language</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">No coding required</td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl">✓</span></td>
                    <td className="text-center p-3"><span className="text-gray-300">−</span></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">Variables & state</td>
                    <td className="text-center p-3"><span className="text-gray-300">−</span></td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl">✓</span></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">Conditionals & loops</td>
                    <td className="text-center p-3"><span className="text-gray-300">−</span></td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl">✓</span></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">Real-time preview</td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl">✓</span></td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl">✓</span></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">Custom CSS</td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl">✓</span></td>
                    <td className="text-center p-3"><span className="text-green-600 font-bold text-xl">✓</span></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-3">Learning time</td>
                    <td className="text-center p-3">~5 minutes</td>
                    <td className="text-center p-3">~30-60 minutes</td>
                  </tr>
                  <tr>
                    <td className="p-3">Best for</td>
                    <td className="text-center p-3 text-xs">Static profiles, quick designs</td>
                    <td className="text-center p-3 text-xs">Interactive apps, dynamic content</td>
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
                <h3 className="font-bold mb-2">Can I use both modes together?</h3>
                <p className="text-sm text-gray-700">
                  Absolutely! Visual Builder templates can have custom code added manually. Both modes use the same component library, so you can mix and match approaches freely.
                </p>
              </RetroCard>

              <RetroCard>
                <h3 className="font-bold mb-2">Can I switch from Visual Builder to Template Language?</h3>
                <p className="text-sm text-gray-700">
                  Visual Builder templates generate template language code behind the scenes. You can export your visual design as code and continue editing in the template editor.
                </p>
              </RetroCard>

              <RetroCard>
                <h3 className="font-bold mb-2">What&apos;s the difference in available components?</h3>
                <p className="text-sm text-gray-700">
                  Both modes share the same component library! Template Language adds advanced programming components (variables, conditionals, loops) that aren&apos;t available in the drag-and-drop interface, but can be added to Visual Builder templates manually via code.
                </p>
              </RetroCard>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<TemplatesIndexProps> = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    },
  };
};
