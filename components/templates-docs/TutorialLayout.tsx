import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import RetroCard from "@/components/ui/layout/RetroCard";
import { Tutorial, tutorials } from "@/lib/templates-docs/tutorialContent";

interface TutorialLayoutProps {
  currentTutorial: Tutorial;
  children: React.ReactNode;
}

export default function TutorialLayout({ currentTutorial, children }: TutorialLayoutProps) {
  const router = useRouter();

  // Find previous and next tutorials
  const currentIndex = tutorials.findIndex(t => t.slug === currentTutorial.slug);
  const previousTutorial = currentIndex > 0 ? tutorials[currentIndex - 1] : null;
  const nextTutorial = currentIndex < tutorials.length - 1 ? tutorials[currentIndex + 1] : null;

  // Calculate progress
  const completedCount = currentIndex + 1;
  const totalCount = tutorials.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-200';
      case 'intermediate':
        return 'bg-yellow-200';
      case 'advanced':
        return 'bg-red-200';
      default:
        return 'bg-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-cyan-50">
      {/* Progress Bar */}
      <div className="w-full h-3 bg-gray-200 border-b-2 border-black">
        <div
          className="h-full bg-purple-400 border-r-2 border-black transition-all"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="w-full px-4 sm:px-6 py-8 sm:py-12 max-w-6xl mx-auto">
        {/* Mode Banner */}
        <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Template Language Mode</span>
          </div>
          <Link
            href="/templates"
            className="text-xs px-3 py-1 bg-white border border-blue-400 hover:bg-blue-100 transition-colors rounded"
          >
            Switch to Visual Builder →
          </Link>
        </div>

        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/templates" className="hover:underline font-medium">
            Templates
          </Link>
          <span>→</span>
          <span className="text-gray-600">Template Language</span>
          <span>→</span>
          <Link href="/templates/tutorials/your-first-template" className="hover:underline font-medium">
            Tutorials
          </Link>
          <span>→</span>
          <span className="font-bold">{currentTutorial.title}</span>
        </div>

        {/* Tutorial Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <span>Tutorials</span>
            </h2>
            <div className="text-xs text-gray-600">
              {completedCount}/{totalCount}
            </div>
          </div>

          {/* Horizontal Tutorial Cards */}
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <div className="flex gap-2 min-w-min">
              {tutorials.map((tutorial, index) => {
                const isActive = tutorial.slug === currentTutorial.slug;
                const isCompleted = index < currentIndex;

                return (
                  <Link
                    key={tutorial.slug}
                    href={`/templates/tutorials/${tutorial.slug}`}
                    className={`flex-shrink-0 w-40 p-4 border-2 border-black transition-all ${
                      isActive
                        ? `${tutorial.color} shadow-[2px_2px_0_#000]`
                        : isCompleted
                        ? 'bg-gray-100 hover:bg-gray-50 shadow-[1px_1px_0_#000]'
                        : 'bg-white hover:bg-gray-50 shadow-[1px_1px_0_#000]'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-6 h-6 flex items-center justify-center border-2 border-black bg-white text-xs font-bold mb-2">
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      <div className="text-2xl mb-2">{tutorial.icon}</div>
                      <h3 className={`text-xs ${isActive ? 'font-bold' : 'font-semibold'} leading-snug mb-2 break-words`}>
                        {tutorial.title}
                      </h3>
                      <div className="text-[10px] text-gray-600">
                        {tutorial.estimatedTime.replace(' minutes', 'm')}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main>
            <RetroCard>
              {/* Tutorial Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{currentTutorial.icon}</span>
                    <div>
                      <h1 className="text-3xl sm:text-4xl font-black">{currentTutorial.title}</h1>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-3 py-1 border-2 border-black ${getDifficultyColor(currentTutorial.difficulty)} text-sm font-bold`}>
                          {currentTutorial.difficulty}
                        </span>
                        <span className="text-sm text-gray-600">⏱️ {currentTutorial.estimatedTime}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-lg text-gray-700">{currentTutorial.description}</p>
                </div>

                {/* Learning Objectives */}
                <div className="mb-8 p-4 bg-blue-50 border-3 border-blue-300 shadow-[3px_3px_0_#000]">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <span>What You&apos;ll Learn:</span>
                  </h3>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {currentTutorial.learningObjectives.map((objective, index) => (
                      <li key={index}>{objective}</li>
                    ))}
                  </ul>
                </div>

                {/* Prerequisites */}
                {currentTutorial.prerequisites.length > 0 && (
                  <div className="mb-8 p-4 bg-yellow-50 border-2 border-yellow-300">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <span>Prerequisites:</span>
                    </h3>
                    <p className="text-sm text-gray-700">
                      Complete these tutorials first:{' '}
                      {currentTutorial.prerequisites.map((prereq, index) => {
                        const prereqTutorial = tutorials.find(t => t.slug === prereq);
                        return (
                          <span key={prereq}>
                            <Link href={`/templates/tutorials/${prereq}`} className="underline font-bold hover:text-purple-600">
                              {prereqTutorial?.title || prereq}
                            </Link>
                            {index < currentTutorial.prerequisites.length - 1 ? ', ' : ''}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                )}

                {/* Tutorial Steps */}
                <div className="mb-8">
                  {children}
                </div>

                {/* Summary */}
                <div className="mb-8 p-6 bg-gradient-to-br from-green-100 to-cyan-100 border-3 border-black shadow-[4px_4px_0_#000]">
                  <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                    <span>Summary</span>
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{currentTutorial.summary}</p>
                </div>

                {/* Related Components */}
                {currentTutorial.relatedComponents.length > 0 && (
                  <div className="mb-8 p-4 bg-purple-50 border-2 border-purple-300">
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                      <span>Related Components:</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {currentTutorial.relatedComponents.map((componentId) => (
                        <Link
                          key={componentId}
                          href={`/templates/components#${componentId}`}
                          className="px-3 py-1 bg-white border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all text-sm font-mono font-bold"
                        >
                          {componentId}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Want Visual Design? */}
                <div className="mb-8 p-6 bg-gradient-to-r from-purple-100 to-pink-100 border-3 border-black shadow-[4px_4px_0_#000]">
                  <h3 className="text-xl font-black mb-2">Prefer Visual Design?</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Template Language is powerful but requires coding. If you want a no-code experience,
                    try <strong>Visual Builder</strong> with drag-and-drop components and real-time preview.
                  </p>
                  <Link
                    href="/design-tutorial"
                    className="inline-block px-4 py-2 bg-purple-400 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] font-bold text-sm transition-all"
                  >
                    Try Visual Builder Guide →
                  </Link>
                </div>

                {/* Navigation */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {previousTutorial ? (
                    <button
                      onClick={() => router.push(`/templates/tutorials/${previousTutorial.slug}`)}
                      className="px-6 py-4 bg-purple-200 border-3 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] transition-all text-left"
                    >
                      <div className="text-xs text-gray-600 mb-1">← Previous</div>
                      <div className="font-bold">{previousTutorial.title}</div>
                    </button>
                  ) : (
                    <div />
                  )}
                  {nextTutorial ? (
                    <button
                      onClick={() => router.push(`/templates/tutorials/${nextTutorial.slug}`)}
                      className="px-6 py-4 bg-green-200 border-3 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] transition-all text-right"
                    >
                      <div className="text-xs text-gray-600 mb-1">Next →</div>
                      <div className="font-bold">{nextTutorial.title}</div>
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push('/templates/components')}
                      className="px-6 py-4 bg-cyan-200 border-3 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] transition-all text-right font-bold"
                    >
                      Browse Components →
                    </button>
                  )}
                </div>
            </RetroCard>
          </main>
      </div>
    </div>
  );
}
