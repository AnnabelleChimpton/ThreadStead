import React from 'react';
import Link from 'next/link';

interface RetroFooterProps {
  currentUser?: string | null;
}

export default function RetroFooter({ currentUser }: RetroFooterProps) {
  return (
    <div className="text-center mt-16">
      {/* Ready to create section */}
      <div className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 border-4 border-black shadow-[12px_12px_0_#000] p-8 mb-8 transform -rotate-1">
        <div className="bg-white border-4 border-black p-6 transform rotate-1">
          <h3 className="text-3xl font-black text-black mb-4">
            🚀 READY TO CREATE?
          </h3>
          <p className="text-lg text-gray-700 mb-6 font-medium">
            Your retro digital space awaits! Start building something awesome.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            {currentUser ? (
              <Link 
                href={`/resident/${currentUser}/edit`}
                className="inline-flex items-center px-8 py-4 bg-green-400 text-black font-black text-lg border-4 border-black shadow-[4px_4px_0_#000] hover:bg-green-300 hover:shadow-[6px_6px_0_#000] transform hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                🎨 START DESIGNING
              </Link>
            ) : (
              <Link 
                href="/identity"
                className="inline-flex items-center px-8 py-4 bg-yellow-400 text-black font-black text-lg border-4 border-black shadow-[4px_4px_0_#000] hover:bg-yellow-300 hover:shadow-[6px_6px_0_#000] transform hover:-translate-x-1 hover:-translate-y-1 transition-all"
              >
                🔐 LOGIN TO START
              </Link>
            )}
            <Link 
              href="/template-selector-test"
              className="inline-flex items-center px-8 py-4 bg-cyan-400 text-black font-black text-lg border-4 border-black shadow-[4px_4px_0_#000] hover:bg-cyan-300 hover:shadow-[6px_6px_0_#000] transform hover:-translate-x-1 hover:-translate-y-1 transition-all"
            >
              🧪 TEST TEMPLATES
            </Link>
          </div>
        </div>
      </div>

      {/* Pro tips */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div className="bg-blue-200 border-4 border-black shadow-[6px_6px_0_#000] p-6">
          <h4 className="font-black text-black text-xl mb-3">💡 Pro Tips</h4>
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
    </div>
  );
}