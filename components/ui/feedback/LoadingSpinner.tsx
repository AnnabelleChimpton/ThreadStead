import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  emoji?: string;
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  message = 'Loading...',
  emoji = '🌀',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const messageSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <div className={`animate-spin ${sizeClasses[size]}`}>
        {emoji}
      </div>
      <div className={`text-gray-600 ${messageSizeClasses[size]} font-medium`}>
        {message}
      </div>
    </div>
  );
}

// Specialized loading components for common use cases
export function PageLoading({ message = 'Loading page...' }: { message?: string }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingSpinner size="lg" message={message} emoji="📄" />
    </div>
  );
}

export function ButtonLoading({ message = 'Processing...' }: { message?: string }) {
  return (
    <LoadingSpinner size="sm" message={message} emoji="⏳" className="px-2 py-1" />
  );
}

export function HomeLoading({ message = 'Building your pixel home...' }: { message?: string }) {
  return (
    <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-4 sm:p-8 text-center min-h-[250px] sm:min-h-[300px] flex items-center justify-center">
      <div className="space-y-3">
        <LoadingSpinner size="lg" message={message} emoji="🏠" />
        <div className="text-xs text-gray-500">This might take a moment</div>
      </div>
    </div>
  );
}