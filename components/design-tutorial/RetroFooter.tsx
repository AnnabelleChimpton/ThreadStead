import React from 'react';
import Link from 'next/link';

interface RetroFooterProps {
  isCSSPage?: boolean;
}

export default function RetroFooter({ isCSSPage= false }: RetroFooterProps) {
  return (
    <div className="text-center mt-16">
      {/* Ready to create section */}
      <div className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 border-4 border-black shadow-[12px_12px_0_#000] p-8 mb-8 transform -rotate-1">
        <div className="bg-white border-4 border-black p-6 transform rotate-1">
          <h3 className="text-3xl font-black text-black mb-4">
            READY TO CREATE?
          </h3>
          <p className="text-lg text-gray-700 mb-6 font-medium">
            Your retro digital space awaits! Start building something awesome.
          </p>
          
          {!isCSSPage ? (
            <Link
              href="/design-tutorial?category=css-classes"
              className="inline-flex items-center px-8 py-4 bg-purple-400 text-black font-black text-lg border-4 border-black shadow-[4px_4px_0_#000] hover:bg-purple-300 hover:shadow-[6px_6px_0_#000] transform hover:-translate-x-1 hover:-translate-y-1 transition-all"
            >
              CSS CLASSES GUIDE
            </Link>
            ) : (
            <Link
              href="/templates/components?filter=visual-builder"
              className="inline-flex items-center px-8 py-4 bg-purple-400 text-black font-black text-lg border-4 border-black shadow-[4px_4px_0_#000] hover:bg-purple-300 hover:shadow-[6px_6px_0_#000] transform hover:-translate-x-1 hover:-translate-y-1 transition-all"
            >
              BROWSE ALL COMPONENTS
            </Link>
            )}
        </div>
      </div>

      {!isCSSPage ? (
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div className="bg-blue-200 border-4 border-black shadow-[6px_6px_0_#000] p-6">
          <h4 className="font-black text-black text-xl mb-3">Pro Tips</h4>
          <ul className="text-left space-y-2 text-gray-800">
            <li>• Start simple, then add more components</li>
            <li>• Use Advanced mode for complete control</li>
            <li>• Mix layout and visual components</li>
            <li>• Test on mobile devices too</li>
          </ul>
        </div>
        <div className="bg-orange-200 border-4 border-black shadow-[6px_6px_0_#000] p-6">
          <h4 className="font-black text-black text-xl mb-3">🔥 Hot Features</h4>
          <ul className="text-left space-y-2 text-gray-800">
            <li>• Custom CSS overrides anything</li>
            <li>• Conditional content with Show/Hide</li>
            <li>• Responsive grid and flex layouts</li>
            <li>• Animated visual effects</li>
          </ul>
        </div>
      </div>
      ) : (
      <div className="bg-orange-300 border-4 border-black shadow-[6px_6px_0_#000] p-6 mt-12 transform -rotate-1">
        <h3 className="text-2xl font-black text-black mb-4">💡 Pro Tips</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div className="bg-white border-2 border-black p-4 shadow-[2px_2px_0_#000]">
            <h4 className="font-bold mb-2">Using !important</h4>
            <p className="text-gray-700">
              Use <code className="bg-yellow-200 px-1 border border-black">!important</code> to override default styles completely. 
              This ensures your custom styles take precedence.
            </p>
          </div>
          <div className="bg-white border-2 border-black p-4 shadow-[2px_2px_0_#000]">
            <h4 className="font-bold mb-2">Browser Developer Tools</h4>
            <p className="text-gray-700">
              Press F12 to inspect elements and see which classes are applied. 
              This helps you target the right elements for styling.
            </p>
          </div>
          <div className="bg-white border-2 border-black p-4 shadow-[2px_2px_0_#000]">
            <h4 className="font-bold mb-2">Mobile-First Design</h4>
            <p className="text-gray-700">
              Use media queries to ensure your styles work on all devices. 
              Start with mobile styles, then enhance for larger screens.
            </p>
          </div>
          <div className="bg-white border-2 border-black p-4 shadow-[2px_2px_0_#000]">
            <h4 className="font-bold mb-2">Color Consistency</h4>
            <p className="text-gray-700">
              Use the platform color palette for designs that feel native and cohesive. 
              Combine colors thoughtfully for accessible contrast.
            </p>
          </div>
        </div>
      </div>
      )
      }
      {/* Pro tips */}
    </div>
  );
}