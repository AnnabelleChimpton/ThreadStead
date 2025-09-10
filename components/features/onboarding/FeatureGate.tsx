import { ReactNode } from 'react';
import { isNewUser } from '@/lib/welcome/user-status';

interface FeatureGateProps {
  requiresRegularUser?: boolean;
  user?: any;
  fallback?: ReactNode;
  children: ReactNode;
}

export default function FeatureGate({ 
  requiresRegularUser = false, 
  user, 
  fallback, 
  children 
}: FeatureGateProps) {
  // If feature requires regular user and current user is new
  if (requiresRegularUser && isNewUser(user)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Tooltip component for new users
export function NewUserTooltip({ feature = "this feature" }: { feature?: string }) {
  return (
    <div className="relative inline-block">
      <button 
        disabled 
        className="opacity-50 cursor-not-allowed border border-black px-4 py-2 bg-gray-100"
        title={`Join a few Rings first, then you can use ${feature}!`}
      >
        Start a New Ring
      </button>
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-400 px-3 py-1 rounded text-sm whitespace-nowrap">
        🌱 Join a few Rings first!
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-100 border-r border-b border-yellow-400 rotate-45"></div>
      </div>
    </div>
  );
}