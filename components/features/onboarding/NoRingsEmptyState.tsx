import Link from 'next/link';
import { useState } from 'react';

export default function NoRingsEmptyState() {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-dashed border-purple-200 relative overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute top-4 right-4 text-2xl opacity-50 animate-pulse">✨</div>
      <div className="absolute bottom-4 left-4 text-2xl opacity-50 animate-bounce" style={{ animationDelay: '0.5s' }}>🌟</div>
      
      {/* Main icon with hover effect */}
      <div 
        className="text-6xl mb-4 transition-transform duration-300"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{ transform: isHovering ? 'scale(1.1) rotate(5deg)' : 'scale(1)' }}
      >
        ⌂
      </div>
      
      <h3 className="text-xl font-bold mb-2 text-purple-800">
        Your Ring neighborhood is empty!
      </h3>
      <p className="text-purple-600 mb-6 max-w-md mx-auto">
        ThreadRings are like cozy corners of the internet where people with shared interests hang out. Ready to find your people?
      </p>
      
      <div className="space-y-3">
        <Link href="/tr/welcome">
          <button className="bg-purple-200 hover:bg-purple-300 px-6 py-3 rounded-lg border-2 border-purple-400 shadow-[3px_3px_0_#7c3aed] font-bold transition-all hover:translate-y-[-2px] hover:shadow-[4px_4px_0_#7c3aed] transform">
            Start with Welcome Ring
          </button>
        </Link>
        
        <div className="text-purple-500">or</div>
        
        <Link href="/threadrings">
          <button className="bg-white hover:bg-gray-50 px-6 py-3 rounded-lg border-2 border-purple-200 shadow-[2px_2px_0_#e5e7eb] transition-all hover:translate-y-[-1px]">
            Browse All Rings
          </button>
        </Link>
      </div>
    </div>
  );
}