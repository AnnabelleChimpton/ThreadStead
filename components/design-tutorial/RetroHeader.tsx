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
    </div>
  );
}