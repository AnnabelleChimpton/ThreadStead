import React from 'react';
import { useResidentData } from './ResidentDataProvider';

interface ProfileHeroProps {
  variant?: 'tape' | 'plain';
}

export default function ProfileHero({ variant = 'plain' }: ProfileHeroProps) {
  const { owner } = useResidentData();

  const baseClasses = "ts-profile-hero w-full p-6 mb-6 text-center";
  
  const variantClasses = {
    tape: "bg-gradient-to-r from-yellow-200 to-yellow-300 border-2 border-black shadow-[4px_4px_0_#000] transform -rotate-1",
    plain: "bg-thread-cream border border-thread-sage/30 rounded-cozy"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      <h1 className="text-4xl font-bold text-thread-pine mb-2">
        {owner.displayName}
      </h1>
      <p className="text-thread-charcoal opacity-80">
        Welcome to my corner of the internet
      </p>
    </div>
  );
}