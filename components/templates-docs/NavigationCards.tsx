import React from "react";
import Link from "next/link";

interface NavCard {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  hoverColor: string;
}

const navigationCards: NavCard[] = [
  {
    title: "Component Library",
    description: "Browse all 72+ components with examples and documentation",
    icon: "📚",
    href: "/templates/components",
    color: "bg-purple-200",
    hoverColor: "hover:bg-purple-100",
  },
  {
    title: "Tutorials",
    description: "Step-by-step guides from beginner to advanced concepts",
    icon: "🎓",
    href: "/templates/tutorials/your-first-template",
    color: "bg-pink-200",
    hoverColor: "hover:bg-pink-100",
  },
  {
    title: "Examples",
    description: "Complete template projects you can learn from and fork",
    icon: "✨",
    href: "/templates/examples/todo-list",
    color: "bg-yellow-200",
    hoverColor: "hover:bg-yellow-100",
  },
  {
    title: "Template Editor",
    description: "Start building your own interactive template right now",
    icon: "🎨",
    href: "/resident/me/template-editor",
    color: "bg-green-200",
    hoverColor: "hover:bg-green-100",
  },
];

export default function NavigationCards() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {navigationCards.map((card, index) => (
        <Link
          key={index}
          href={card.href}
          className={`block border-3 border-black ${card.color} ${card.hoverColor} p-6 shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] transition-all group`}
        >
          <div className="text-center">
            {/* Icon */}
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
              {card.icon}
            </div>

            {/* Title */}
            <h3 className="text-xl font-black mb-2 text-gray-900">
              {card.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-700 leading-relaxed">
              {card.description}
            </p>

            {/* Arrow */}
            <div className="mt-4 text-2xl group-hover:translate-x-1 transition-transform inline-block">
              →
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
