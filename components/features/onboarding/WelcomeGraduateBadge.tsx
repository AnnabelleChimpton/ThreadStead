import { isWelcomeGraduate } from '@/lib/welcome/progress';

interface WelcomeGraduateBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showAlways?: boolean;
}

export default function WelcomeGraduateBadge({ 
  size = 'small', 
  showAlways = false 
}: WelcomeGraduateBadgeProps) {
  // Only show if user is a graduate
  if (!showAlways && !isWelcomeGraduate()) {
    return null;
  }

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1.5',
    large: 'text-base px-4 py-2'
  };

  return (
    <div 
      className={`inline-flex items-center gap-1 bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-400 rounded-full font-bold text-green-700 shadow-[2px_2px_0_#000] ${sizeClasses[size]}`}
      title="Completed the Welcome Ring tutorial!"
    >
      <span>🎓</span>
      <span>Welcome Graduate</span>
    </div>
  );
}

// Mini badge for profile displays
export function WelcomeGraduateMiniBadge() {
  if (!isWelcomeGraduate()) {
    return null;
  }

  return (
    <span 
      className="inline-block text-lg"
      title="Welcome Ring Graduate"
    >
      🎓
    </span>
  );
}