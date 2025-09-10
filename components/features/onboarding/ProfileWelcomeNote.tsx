import { useState } from 'react';
import Link from 'next/link';
import { isNewUser } from '@/lib/welcome/user-status';

interface ProfileWelcomeNoteProps {
  user?: any;
  isOwnProfile?: boolean;
  onDismiss?: () => void;
}

export default function ProfileWelcomeNote({ 
  user, 
  isOwnProfile = false,
  onDismiss 
}: ProfileWelcomeNoteProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show for new users on their own profile
  if (!isOwnProfile || !isNewUser(user) || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleJoinWelcomeRing = () => {
    // Redirect to Welcome Ring page where they can join if needed
    window.location.href = '/tr/welcome';
  };

  return (
    <div className="mb-6 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 border-2 border-dashed border-rainbow p-6 rounded-xl shadow-[3px_3px_0_#000]">
      {/* Dismiss button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          title="Dismiss"
        >
          ×
        </button>
      </div>

      <div className="text-center">
        <div className="text-5xl mb-4">👋</div>
        <h3 className="text-xl font-bold text-gray-800 mb-3">
          Welcome to Threadstead, {user?.primaryHandle?.split('@')[0] || 'friend'}!
        </h3>
        <p className="text-gray-700 mb-4 leading-relaxed">
          Your profile is all set up! Ready to explore?<br/>
          <strong>The Welcome Ring has a fun tutorial to get you started with ThreadRings.</strong>
        </p>

        <div className="bg-white/80 border border-purple-200 rounded-lg p-4 mb-4 mx-auto max-w-md">
          <h4 className="font-bold text-purple-800 mb-2">🎓 Learn the basics:</h4>
          <div className="text-sm text-purple-700 space-y-1">
            <div>• How communities work</div>
            <div>• Posting and commenting</div>
            <div>• Finding your people</div>
            <div>• The Ring family tree</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={handleJoinWelcomeRing}
            className="px-6 py-3 bg-gradient-to-r from-green-200 to-blue-200 hover:from-green-300 hover:to-blue-300 border-2 border-green-400 shadow-[3px_3px_0_#16a34a] hover:shadow-[4px_4px_0_#16a34a] font-bold text-green-800 transition-all hover:translate-y-[-2px] rounded-lg"
          >
            🎯 Join Welcome Ring
          </button>
          
          <div className="text-gray-500 text-sm">or</div>
          
          <Link
            href="/threadrings"
            className="px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 shadow-[2px_2px_0_#6b7280] font-medium text-gray-700 transition-all rounded-lg"
          >
            Browse All Rings
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-3 italic">
          This tutorial takes about 5 minutes and you&apos;ll get a graduate badge! 🎓
        </p>
      </div>
    </div>
  );
}