import React from 'react';
import { useResidentData } from './ResidentDataProvider';

export default function Bio() {
  const { capabilities } = useResidentData();
  
  // Get bio from capabilities or use a default
  const bio = capabilities?.bio || "Welcome to my profile!";

  return (
    <div className="ts-profile-bio-section mb-4">
      <h3 className="thread-headline text-xl font-bold mb-2 text-thread-pine">
        About Me
      </h3>
      <p className="ts-profile-bio text-thread-charcoal leading-relaxed">
        {bio}
      </p>
    </div>
  );
}