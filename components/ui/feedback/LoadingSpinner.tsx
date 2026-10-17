import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  message = 'Loading...',
  className = ''
}: LoadingSpinnerProps) {
  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32
  };

  const messageSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <div className="animate-spin">
        <PixelIcon name="reload" size={iconSizes[size]} />
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
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
}

export function ButtonLoading({ message = 'Processing...' }: { message?: string }) {
  return (
    <LoadingSpinner size="sm" message={message} className="px-2 py-1" />
  );
}

export function HomeLoading({ message = 'Building your pixel home...' }: { message?: string }) {
  return (
    <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-4 sm:p-8 text-center min-h-[250px] sm:min-h-[300px] flex items-center justify-center">
      <div className="space-y-3">
        <LoadingSpinner size="lg" message={message} />
        <div className="text-xs text-gray-500">This might take a moment</div>
      </div>
    </div>
  );
}