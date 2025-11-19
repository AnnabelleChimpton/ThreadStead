import React, { useMemo } from "react";
import Link from "next/link";
import CodeBlock from "./CodeBlock";
import { TutorialStep as TutorialStepType } from "@/lib/templates-docs/tutorialContent";
import { autoLinkComponents, autoLinkComponentsInArray } from "@/lib/templates-docs/tutorialLinkProcessor";
import { markdownToSafeHtml } from "@/lib/utils/sanitization/html";

interface TutorialStepProps {
  step: TutorialStepType;
  stepNumber: number;
}

export default function TutorialStep({ step, stepNumber }: TutorialStepProps) {
  // Process explanation text with auto-linked component mentions
  const processedExplanation = useMemo(() => {
    const linkedMarkdown = autoLinkComponents(step.explanation);
    return markdownToSafeHtml(linkedMarkdown);
  }, [step.explanation]);

  // Process tips array with auto-linked component mentions
  const processedTips = useMemo(() => {
    if (!step.tips) return null;
    return autoLinkComponentsInArray(step.tips).map((tip) => markdownToSafeHtml(tip));
  }, [step.tips]);

  return (
    <div className="mb-8">
      {/* Step Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-12 h-12 bg-purple-200 border-3 border-black shadow-[3px_3px_0_#000] flex items-center justify-center">
          <span className="text-2xl font-black">{stepNumber}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-2xl font-black mb-2">{step.title}</h3>
          <div
            className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: processedExplanation }}
          />
        </div>
      </div>

      {/* Code Example */}
      <div className="mb-4">
        <CodeBlock
          code={step.code}
          title={`Step ${stepNumber} Code`}
          language="template"
          allowCopy={true}
        />
      </div>

      {/* Concepts Covered */}
      {step.concepts.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300">
          <h4 className="font-bold mb-2 flex items-center gap-2">
            <span>Components Used:</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {step.concepts.map((concept, index) => {
              const componentId = concept.toLowerCase();
              return (
                <Link
                  key={index}
                  href={`/templates/components#${componentId}`}
                  className="px-3 py-1 bg-white border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] text-sm font-mono font-bold transition-all"
                >
                  {concept}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tips */}
      {processedTips && processedTips.length > 0 && (
        <div className="p-4 bg-yellow-50 border-3 border-yellow-400 shadow-[3px_3px_0_#000]">
          <h4 className="font-bold mb-2 flex items-center gap-2">
            <span>Pro Tips:</span>
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {processedTips.map((tip, index) => (
              <li
                key={index}
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: tip }}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
