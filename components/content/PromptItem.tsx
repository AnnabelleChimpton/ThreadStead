import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface PromptItemProps {
  post: {
    id: string;
    ringSlug: string;
    ringName: string;
    uri: string;
    submittedAt: string;
    metadata: {
      type: 'threadring_prompt';
      prompt: {
        promptId: string;
        title: string;
        description: string;
        startsAt: string;
        endsAt?: string;
        isActive: boolean;
        isPinned: boolean;
        responseCount: number;
        tags?: string[];
      };
    };
    pinned: boolean;
  };
}

export default function PromptItem({ post }: PromptItemProps) {
  const prompt = post.metadata.prompt;
  const isExpired = prompt.endsAt && new Date(prompt.endsAt) < new Date();
  const isActive = prompt.isActive && !isExpired;

  return (
    <article className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Prompt Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💭</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-gray-900">ThreadRing Challenge</h3>
              {isActive && (
                <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full animate-pulse">
                  Active
                </span>
              )}
              {isExpired && (
                <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full">
                  Ended
                </span>
              )}
              {post.pinned && (
                <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
                  📌 Pinned
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link
                href={`/tr/${post.ringSlug}`}
                className="font-medium text-purple-600 hover:text-purple-800 hover:underline"
              >
                {post.ringName}
              </Link>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(prompt.startsAt))} ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Content */}
      <div className="mb-4">
        <h4 className="text-xl font-semibold mb-2 text-gray-800">
          {prompt.title}
        </h4>
        <p className="text-gray-700 whitespace-pre-wrap line-clamp-3">
          {prompt.description}
        </p>
      </div>

      {/* Prompt Meta */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          {prompt.endsAt && !isExpired && (
            <span className="text-orange-600 font-medium">
              ⏰ Ends {formatDistanceToNow(new Date(prompt.endsAt), { addSuffix: true })}
            </span>
          )}
          
          <span className="text-purple-600 font-medium">
            📝 {prompt.responseCount} {prompt.responseCount === 1 ? 'response' : 'responses'}
          </span>

          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex gap-1">
              {prompt.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-gray-200 text-xs rounded">
                  {tag}
                </span>
              ))}
              {prompt.tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-200 text-xs rounded">
                  +{prompt.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href={`/tr/${post.ringSlug}/prompts/${prompt.promptId}/responses`}
            className="tr-prompt-host-purple inline-flex items-center px-3 py-2 text-sm bg-white border-2 border-purple-600 font-medium rounded-lg hover:bg-purple-50 transition-colors shadow-sm no-underline hover:no-underline"
          >
            📝 View Responses
          </Link>
          
          {isActive && (
            <Link
              href={`/post/new?promptId=${prompt.promptId}&threadRing=${post.ringSlug}&promptTitle=${encodeURIComponent(prompt.title)}`}
              className="tr-prompt-button-white inline-flex items-center px-3 py-2 text-sm bg-purple-600 font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm no-underline hover:no-underline"
            >
              ✍️ Respond
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}