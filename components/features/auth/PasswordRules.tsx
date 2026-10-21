import { PixelIcon } from '@/components/ui/PixelIcon';

const RULES: { label: string; met: (password: string) => boolean }[] = [
  { label: 'At least 8 characters', met: (p) => p.length >= 8 },
  { label: 'One lowercase letter', met: (p) => /[a-z]/.test(p) },
  { label: 'One uppercase letter', met: (p) => /[A-Z]/.test(p) },
  { label: 'One number', met: (p) => /[0-9]/.test(p) },
];

/** The password checklist on signup and in Settings. A met rule gets a solid check, the rest a faint one. */
export default function PasswordRules({ password, className = 'p-3' }: { password: string; className?: string }) {
  return (
    <div className={`border-2 border-dotted border-nb-ink-mid/60 rounded-md ${className}`}>
      <p className="text-sm font-bold text-nb-ink mb-2">Password Requirements:</p>
      <ul className="text-sm space-y-1">
        {RULES.map(({ label, met }) => {
          const ok = met(password);
          return (
            <li key={label} className={`flex items-center gap-1 ${ok ? 'text-nb-ink font-medium' : 'text-nb-ink-mid'}`}>
              <PixelIcon name="check" size={24} className={`shrink-0 -my-1 -ml-1 ${ok ? '' : 'opacity-30'}`} />
              <span>{label}{ok && <span className="sr-only"> (done)</span>}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
