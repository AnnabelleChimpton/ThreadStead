import React from 'react'

interface DecorationLoadingStateProps {
  isMobile?: boolean
}

export default function DecorationLoadingState({ isMobile = false }: DecorationLoadingStateProps) {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar Skeleton */}
      <div className={`bg-white border-b border-gray-200 shadow-sm ${
        isMobile ? 'px-4 py-3' : 'px-6 py-4'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="skeleton-loader h-8 w-32 rounded" />
            {!isMobile && <div className="skeleton-loader h-6 w-40 rounded-full" />}
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton-loader h-10 w-24 rounded-lg" />
            <div className="skeleton-loader h-10 w-20 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Canvas Area Skeleton */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          {/* House Canvas Skeleton */}
          <div className="skeleton-loader w-[500px] h-[350px] rounded-lg">
            <div className="flex items-center justify-center h-full">
              <div className="loading-spinner" />
            </div>
          </div>
          
          {/* Status Badge Skeleton */}
          <div className="absolute top-4 left-4">
            <div className="skeleton-loader h-8 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Bottom Palette Skeleton */}
      <div className={`bg-white border-t border-gray-200 shadow-lg ${
        isMobile ? 'h-80' : 'h-auto'
      }`}>
        {isMobile ? (
          /* Mobile Palette Skeleton */
          <div className="flex flex-col h-full">
            <div className="flex overflow-x-auto px-2 py-1 border-b border-gray-200">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex-shrink-0 mx-1">
                  <div className="skeleton-loader w-[70px] h-16 rounded-lg" />
                </div>
              ))}
            </div>
            <div className="flex-1 p-4">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="skeleton-loader aspect-square rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Palette Skeleton */
          <>
            <div className="flex border-b border-gray-200 px-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="py-3 px-6">
                  <div className="skeleton-loader h-5 w-16 rounded" />
                </div>
              ))}
            </div>
            <div className="p-4">
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="skeleton-loader w-20 h-20 rounded-lg" />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}