import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/feedback/Modal';
import { ProfileTemplateType } from '@/lib/templates/default-profile-templates';

interface WelcomeHomeOverlayProps {
  username: string;
  selectedTheme?: ProfileTemplateType;
  onComplete?: () => void;
}

export default function WelcomeHomeOverlay({
  username,
  onComplete
}: WelcomeHomeOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [foundersNote, setFoundersNote] = useState<string>('');

  // Fetch founder's note from admin settings
  useEffect(() => {
    fetch('/api/admin/founders-note')
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          setFoundersNote(data.message);
        }
      })
      .catch(err => console.error('Failed to fetch founders note:', err));
  }, []);

  useEffect(() => {
    // Show welcome message after brief delay
    const welcomeTimer = setTimeout(() => {
      setShowWelcome(true);
    }, 500);

    return () => {
      clearTimeout(welcomeTimer);
    };
  }, []);

  const handleClose = () => {
    // The welcome music keeps playing; only the dialog goes away
    setShowWelcome(false);
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) return null;

  const firstSteps = [
    { href: '/post/new', label: 'Write a first post' },
    { href: '/neighborhood/explore/all', label: 'Walk the neighborhood' },
    { href: '/threadrings', label: 'Join a ThreadRing' },
    { href: `/home/${username}`, label: 'Decorate your house' },
  ];

  return (
    <Modal
      isOpen={showWelcome}
      onClose={handleClose}
      title={`Welcome Home, ${username}`}
      maxWidth="max-w-xl"
      closeLabel="Close welcome message"
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-nb-ink">New to ThreadRings?</span>
          <Link
            href="/tr/welcome"
            className="btn btn--primary inline-block px-4 py-2 text-sm font-bold no-underline bg-thread-cream text-thread-pine border-2 border-thread-sage rounded-md shadow-cozy-sm"
          >
            Start the tour
          </Link>
          <Link
            href="/threadrings"
            className="btn btn--secondary inline-block px-4 py-2 text-sm font-bold no-underline bg-thread-paper text-thread-pine border-2 border-thread-sage rounded-md shadow-cozy-sm"
          >
            Browse Rings
          </Link>
        </div>
      }
    >
      {foundersNote && (
        <section className="mb-5">
          <h3 className="thread-label mb-1">A Note from the Founder</h3>
          <p className="text-sm leading-relaxed text-nb-ink">{foundersNote}</p>
        </section>
      )}

      <section>
        <h3 className="thread-label mb-2">First steps</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm font-medium">
          {firstSteps.map(step => (
            <li key={step.href}>
              <Link href={step.href} onClick={handleClose}>{step.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </Modal>
  );
}
