import React from "react";
import Link from "next/link";

export default function TemplatesHero() {
  return (
    <div className="bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100 border-4 border-black shadow-[8px_8px_0_#000] p-8 sm:p-12 rounded-none">
      <div className="text-center">
        {/* Icon/Emoji */}
        <div className="text-6xl sm:text-8xl mb-6 animate-bounce">
          📝
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 text-gray-900 tracking-tight">
          Template Components
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto mb-8 leading-relaxed">
          Build <span className="font-bold text-purple-600">interactive</span>,{" "}
          <span className="font-bold text-pink-600">dynamic</span>, and{" "}
          <span className="font-bold text-yellow-600">powerful</span> profile pages
          with our declarative template language.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <span className="px-4 py-2 bg-white border-2 border-black shadow-[3px_3px_0_#000] text-sm font-medium">
            ⚡ 72+ Components
          </span>
          <span className="px-4 py-2 bg-white border-2 border-black shadow-[3px_3px_0_#000] text-sm font-medium">
            🎨 No Coding Required
          </span>
          <span className="px-4 py-2 bg-white border-2 border-black shadow-[3px_3px_0_#000] text-sm font-medium">
            🚀 Instant Preview
          </span>
          <span className="px-4 py-2 bg-white border-2 border-black shadow-[3px_3px_0_#000] text-sm font-medium">
            📱 Mobile Friendly
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/templates/tutorials/your-first-template"
            className="inline-block border-3 border-black px-8 py-4 bg-green-300 hover:bg-green-200 shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] transition-all font-black text-lg"
          >
            🎓 Start Tutorial
          </Link>
          <Link
            href="/templates/components"
            className="inline-block border-3 border-black px-8 py-4 bg-cyan-300 hover:bg-cyan-200 shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] transition-all font-black text-lg"
          >
            📚 Browse Components
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
          <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0_#000]">
            <div className="text-3xl font-black text-purple-600">72+</div>
            <div className="text-xs text-gray-600 font-medium">Components</div>
          </div>
          <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0_#000]">
            <div className="text-3xl font-black text-pink-600">20+</div>
            <div className="text-xs text-gray-600 font-medium">Actions</div>
          </div>
          <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0_#000]">
            <div className="text-3xl font-black text-yellow-600">10+</div>
            <div className="text-xs text-gray-600 font-medium">Events</div>
          </div>
          <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0_#000]">
            <div className="text-3xl font-black text-green-600">7+</div>
            <div className="text-xs text-gray-600 font-medium">Tutorials</div>
          </div>
        </div>
      </div>
    </div>
  );
}
