import React from 'react';

export default function RetroHeader() {
  return (
    <div className="text-center mb-12">
      {/* Main Title */}
      <div className="relative mb-8">
        <div className="inline-block bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 p-2 border-4 border-black shadow-[12px_12px_0_#000] transform -rotate-2">
          <h1 className="text-6xl font-black text-black px-6 py-4 bg-white border-4 border-black">
            TEMPLATE
            <br />
            <span className="text-4xl">DESIGN GUIDE</span>
          </h1>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 border-4 border-black rotate-45"></div>
        <div className="absolute -bottom-2 -left-6 w-6 h-6 bg-red-400 border-4 border-black rounded-full"></div>
      </div>

      {/* Subtitle */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-100 border-4 border-black shadow-[6px_6px_0_#000] p-6 transform rotate-1">
          <p className="text-xl text-gray-800 font-medium leading-relaxed">
            Create amazing personal pages with our drag-and-drop components! 
            Mix, match, and customize to build your perfect retro digital space.
          </p>
        </div>
      </div>

      {/* Syntax Primer */}
      <div className="mt-8 max-w-4xl mx-auto">
        <div className="bg-blue-100 border-4 border-black shadow-[6px_6px_0_#000] p-6 transform -rotate-1">
          <h2 className="text-2xl font-bold text-black mb-4">Syntax Primer</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-bold mb-2">Component Types:</div>
              <ul className="space-y-1 text-gray-700">
                <li>• Self-closing: <code className="bg-white px-1 border border-gray-300">&lt;DisplayName /&gt;</code></li>
                <li>• Container: <code className="bg-white px-1 border border-gray-300">&lt;Tabs&gt;...&lt;/Tabs&gt;</code></li>
                <li>• Boolean attrs: <code className="bg-white px-1 border border-gray-300">&quot;true&quot;</code> or <code className="bg-white px-1 border border-gray-300">&quot;false&quot;</code></li>
              </ul>
            </div>
            <div>
              <div className="font-bold mb-2">Safety & Content:</div>
              <ul className="space-y-1 text-gray-700">
                <li>• All HTML is sanitized automatically</li>
                <li>• Script tags and dangerous CSS removed</li>
                <li>• Only whitelisted HTML tags allowed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick tips */}
      <div className="mt-8 grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        <div className="bg-green-200 border-4 border-black shadow-[4px_4px_0_#000] p-4">
          <div className="font-bold text-black">Mix & Match</div>
          <div className="text-sm text-gray-700">Combine components freely</div>
        </div>
        <div className="bg-pink-200 border-4 border-black shadow-[4px_4px_0_#000] p-4">
          <div className="font-bold text-black">Custom Styling</div>
          <div className="text-sm text-gray-700">Override with your own CSS</div>
        </div>
        <div className="bg-cyan-200 border-4 border-black shadow-[4px_4px_0_#000] p-4">
          <div className="font-bold text-black">Mobile Ready</div>
          <div className="text-sm text-gray-700">Looks great everywhere</div>
        </div>
      </div>

      {/* Container Components Guide */}
      <div className="mt-8 max-w-4xl mx-auto">
        <div className="bg-purple-100 border-4 border-black shadow-[6px_6px_0_#000] p-6 transform rotate-1">
          <h2 className="text-2xl font-bold text-black mb-4">Container vs Self-Closing Components</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="font-bold mb-2">🔒 Self-Closing (Most Components):</div>
              <ul className="space-y-1 text-gray-700">
                <li>• <code className="bg-white px-1">&lt;DisplayName /&gt;</code></li>
                <li>• <code className="bg-white px-1">&lt;ProfilePhoto /&gt;</code></li>
                <li>• <code className="bg-white px-1">&lt;BlogPosts /&gt;</code></li>
                <li>• <code className="bg-white px-1">&lt;Guestbook /&gt;</code></li>
                <li>• <code className="bg-white px-1">&lt;FollowButton /&gt;</code></li>
              </ul>
            </div>
            <div>
              <div className="font-bold mb-2">📦 Container (Wrap Content):</div>
              <ul className="space-y-1 text-gray-700">
                <li>• <code className="bg-white px-1">&lt;FlexContainer&gt;...&lt;/FlexContainer&gt;</code></li>
                <li>• <code className="bg-white px-1">&lt;Tabs&gt;&lt;Tab /&gt;...&lt;/Tabs&gt;</code></li>
                <li>• <code className="bg-white px-1">&lt;Show&gt;...&lt;/Show&gt;</code></li>
                <li>• <code className="bg-white px-1">&lt;Choose&gt;&lt;When /&gt;...&lt;/Choose&gt;</code></li>
                <li>• <code className="bg-white px-1">&lt;NeonBorder&gt;...&lt;/NeonBorder&gt;</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quickstart block */}
      <div className="mt-8 max-w-4xl mx-auto">
        <div className="bg-yellow-200 border-4 border-black shadow-[6px_6px_0_#000] p-6 transform -rotate-1">
          <h2 className="text-2xl font-bold text-black mb-4">30-Second Quickstart</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="font-bold mb-2">Copy this starter template:</div>
              <div className="bg-white border-2 border-black p-3 text-xs font-mono overflow-x-auto">
                <div>&lt;ProfileHero layout=&quot;vertical&quot; /&gt;</div>
                <div>&lt;Bio headingText=&quot;About Me&quot; /&gt;</div>
                <div>&lt;BlogPosts limit=&quot;3&quot; /&gt;</div>
                <div>&lt;Guestbook maxEntries=&quot;10&quot; /&gt;</div>
              </div>
            </div>
            <div>
              <div className="font-bold mb-2">Then customize with CSS:</div>
              <div className="bg-white border-2 border-black p-3 text-xs font-mono overflow-x-auto">
                <div>.ts-profile-display-name &#123;</div>
                <div>&nbsp;&nbsp;color: #ff6b6b;</div>
                <div>&nbsp;&nbsp;font-size: 3rem;</div>
                <div>&#125;</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}