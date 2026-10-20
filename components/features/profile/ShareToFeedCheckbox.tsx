import React, { useId } from 'react';

/**
 * "Share this update in the feed", next to a page editor's Save. Unticked
 * every time the editor opens: nothing goes in the feed unless the owner
 * asks on that save (lib/domain/profile/page-updates.ts).
 */
export default function ShareToFeedCheckbox({
  checked,
  onChange,
  disabled,
  className = '',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={`inline-flex items-center gap-1.5 text-sm cursor-pointer select-none ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      Share this update in the feed
    </label>
  );
}
