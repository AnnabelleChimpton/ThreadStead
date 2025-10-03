/**
 * CSS Animations for Visual Builder Canvas
 * Keyframe animations and effects for component interactions
 */

import React from 'react';

export default function CanvasAnimations() {
  return (
    <style jsx global>{`
      @keyframes scaleInBounce {
        0% {
          transform: scale(0);
          opacity: 0;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.8;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes scaleOut {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(0);
          opacity: 0;
        }
      }

      .animate-scale-in {
        animation: scaleInBounce 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
      }

      .animate-scale-out {
        animation: scaleOut 0.2s ease-in forwards;
      }

      /* Enhanced hover effects */
      .cursor-move:hover {
        transform: translateY(-1px) !important;
        transition: transform 0.2s ease-out, box-shadow 0.2s ease-out !important;
      }

      /* Selection pulse animation */
      .ring-blue-400 {
        animation: selection-pulse 2s infinite;
      }

      @keyframes selection-pulse {
        0%, 100% {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
        }
        50% {
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
        }
      }

      /* Success feedback for component drops */
      @keyframes sparkle {
        0% {
          opacity: 0;
          transform: scale(0) rotate(0deg);
        }
        50% {
          opacity: 1;
          transform: scale(1) rotate(180deg);
        }
        100% {
          opacity: 0;
          transform: scale(0) rotate(360deg);
        }
      }
    `}</style>
  );
}
