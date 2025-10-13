import React from 'react';
import Link from 'next/link';

export default function RetroHeader() {
  return (
    <div className="text-center mb-12">
      {/* Main Title */}
      <div className="relative mb-8">
        <div className="inline-block bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 p-2 border-4 border-black shadow-[8px_8px_0_#000]">
          <h1 className="text-6xl font-black text-black px-6 py-4 bg-white border-4 border-black">
            VISUAL BUILDER
            <br />
            <span className="text-4xl">GUIDE</span>
          </h1>
        </div>
      </div>

      {/* Subtitle */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-100 border-4 border-black shadow-[4px_4px_0_#000] p-6">
          <p className="text-xl text-gray-800 font-medium leading-relaxed">
            Learn to use the drag-and-drop Visual Builder to create amazing profile pages.
            No code required – just creativity!
          </p>
        </div>
      </div>

      {/* Getting Started: 3 Steps */}
      <div className="mt-12 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black mb-6">🚀 Getting Started: 3 Simple Steps</h2>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-purple-200 border-4 border-black shadow-[3px_3px_0_#000] p-6">
            <div className="text-4xl mb-3">1️⃣</div>
            <h3 className="text-xl font-black mb-2">Open the Builder</h3>
            <p className="text-sm text-gray-700">
              Go to Profile Settings → Template Editor → &quot;Switch to Visual Builder&quot;
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-cyan-200 border-4 border-black shadow-[3px_3px_0_#000] p-6">
            <div className="text-4xl mb-3">2️⃣</div>
            <h3 className="text-xl font-black mb-2">Drag Components</h3>
            <p className="text-sm text-gray-700">
              Browse the component palette and drag elements onto your canvas
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-pink-200 border-4 border-black shadow-[3px_3px_0_#000] p-6">
            <div className="text-4xl mb-3">3️⃣</div>
            <h3 className="text-xl font-black mb-2">Customize & Save</h3>
            <p className="text-sm text-gray-700">
              Click components to edit properties, then save your masterpiece!
            </p>
          </div>
        </div>
      </div>

      {/* Visual Builder Features */}
      <div className="mt-12 max-w-4xl mx-auto">
        <div className="bg-blue-100 border-4 border-black shadow-[4px_4px_0_#000] p-8">
          <h2 className="text-3xl font-black mb-6">✨ Visual Builder Features</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-black text-lg mb-3">🎨 Component Palette</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>Search by name</strong> to find components quickly</li>
                <li>• <strong>Browse by category</strong> (Content, Retro, Layout, Visual)</li>
                <li>• <strong>Mark favorites</strong> for quick access</li>
                <li>• <strong>View recently used</strong> components</li>
              </ul>
            </div>

            <div>
              <h3 className="font-black text-lg mb-3">⚡ Smart Canvas</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>Visual drop zones</strong> show where components will land</li>
                <li>• <strong>Grid snapping</strong> for precise alignment</li>
                <li>• <strong>Real-time preview</strong> of your profile</li>
                <li>• <strong>Responsive breakpoints</strong> for mobile/desktop</li>
              </ul>
            </div>

            <div>
              <h3 className="font-black text-lg mb-3">🎯 Properties Panel</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>Click any component</strong> to edit its settings</li>
                <li>• <strong>Change colors, text, sizes</strong> instantly</li>
                <li>• <strong>Toggle visibility</strong> and layout options</li>
                <li>• <strong>Add custom CSS</strong> for advanced styling</li>
              </ul>
            </div>

            <div>
              <h3 className="font-black text-lg mb-3">🔥 Advanced Tools</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>Ctrl+Click</strong> to select multiple components</li>
                <li>• <strong>Drag to select</strong> groups with rubber band</li>
                <li>• <strong>Bulk edit</strong> multiple components at once</li>
                <li>• <strong>Group components</strong> for organization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="mt-12 grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        <div className="bg-green-200 border-3 border-black shadow-[3px_3px_0_#000] p-6">
          <div className="text-2xl mb-2">💡</div>
          <div className="font-bold text-black mb-1">Start Simple</div>
          <div className="text-sm text-gray-700">Add a few components first, then expand your design</div>
        </div>
        <div className="bg-orange-200 border-3 border-black shadow-[3px_3px_0_#000] p-6">
          <div className="text-2xl mb-2">🎨</div>
          <div className="font-bold text-black mb-1">Use the Grid</div>
          <div className="text-sm text-gray-700">Enable grid snapping for perfect alignment</div>
        </div>
        <div className="bg-yellow-200 border-3 border-black shadow-[3px_3px_0_#000] p-6">
          <div className="text-2xl mb-2">📱</div>
          <div className="font-bold text-black mb-1">Test Mobile</div>
          <div className="text-sm text-gray-700">Toggle responsive preview to see how it looks on phones</div>
        </div>
      </div>

      {/* Need More Power? */}
      <div className="mt-12 max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-cyan-100 to-purple-100 border-3 border-black shadow-[4px_4px_0_#000] p-6">
          <h3 className="text-xl font-black mb-2">💻 Need More Power?</h3>
          <p className="text-sm text-gray-700 mb-3">
            Visual Builder is great for beautiful static profiles. For interactive features like counters,
            forms, and dynamic content, check out <strong>Template Language</strong> with variables, conditionals, and loops.
          </p>
          <Link
            href="/templates/tutorials/your-first-template"
            className="inline-block px-4 py-2 bg-purple-400 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] font-bold text-sm transition-all"
          >
            📚 Try Template Language Tutorial →
          </Link>
        </div>
      </div>
    </div>
  );
}
