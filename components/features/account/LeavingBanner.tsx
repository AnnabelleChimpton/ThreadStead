import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { useToast } from '@/contexts/ToastContext';
import { leavingDay } from './leaving-day';

/**
 * Across the top of every page while your account is set to be deleted
 * (lib/domain/users/leaving.ts), with the way to stay. `raised` keeps it above
 * a page of someone's own HTML, like the footer.
 */
export default function LeavingBanner({ raised = false }: { raised?: boolean }) {
  const { user } = useCurrentUser();
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);
  if (!user?.deletesAt) return null;

  const stay = async () => {
    setBusy(true);
    const res = await csrfFetch('/api/account/leave', { method: 'DELETE' });
    if (res.ok) return window.location.reload();
    setBusy(false);
    showError("That didn't work. Try again?");
  };

  return (
    <div className={`ts-leaving-banner bg-thread-cream border-b-2 border-thread-sunset px-6 py-2${raised ? ' relative z-[10000]' : ''}`}>
      <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-2 text-sm text-thread-charcoal">
        <span>
          Your account will be deleted on {leavingDay(user.deletesAt)}. Your page is hidden until then.
        </span>
        <Button variant="secondary" size="sm" onClick={stay} disabled={busy}>
          Keep my account
        </Button>
      </div>
    </div>
  );
}
