import React from "react";

/** The notebook form bits the Manage tabs share, in /settings' style. */
export const FIELD =
  "w-full border-2 border-nb-ink-mid/60 rounded-md p-3 bg-white text-nb-ink focus:outline-none focus:border-nb-ink-mid";
export const SELECT =
  "border-2 border-nb-ink-mid/60 rounded-md py-1.5 pl-2 pr-7 bg-white text-sm text-nb-ink focus:outline-none focus:border-nb-ink-mid";
export const HELP = "text-sm text-nb-ink-mid m-0 mb-2";
// !: the site theme indents list items on phones
export const ROWS = "m-0 !p-0 list-none divide-y-2 divide-dotted divide-nb-ink-mid/30 [&>li]:!ml-0 [&>li]:!pl-0";

export function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`font-headline text-xl font-bold text-nb-ink m-0 mb-1 ${className}`}>{children}</h2>;
}

export function Label({ htmlFor, children, optional }: { htmlFor?: string; children: React.ReactNode; optional?: boolean }) {
  const Tag = htmlFor ? "label" : "span";
  return (
    <Tag htmlFor={htmlFor} className="block font-bold text-nb-ink mb-1.5">
      {children}
      {optional && <span className="font-normal text-nb-ink-mid"> (optional)</span>}
    </Tag>
  );
}

export interface Choice<T extends string> {
  id: T;
  label: string;
  /** One plain line on what it means */
  note?: string;
}

/** Radio cards, one per choice, like /settings' visibility cards. */
export function ChoiceCards<T extends string>({
  legend,
  name,
  choices,
  value,
  onChange,
  disabled,
  plain,
}: {
  legend?: React.ReactNode;
  name: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Labels in plain weight, for choices that are whole sentences */
  plain?: boolean;
}) {
  return (
    <fieldset className="mx-0 p-0 border-0 min-w-0">
      {legend && (
        <legend className="p-0">
          <Heading>{legend}</Heading>
        </legend>
      )}
      <div className="space-y-2 mt-3 max-w-xl">
        {choices.map((choice) => {
          const on = choice.id === value;
          return (
            <label
              key={choice.id}
              className={`flex items-start gap-3 p-3 border-2 rounded-md bg-white cursor-pointer ${
                on ? "border-nb-ink shadow-nb-sm" : "border-nb-ink-mid/45 hover:border-nb-ink-mid"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={choice.id}
                checked={on}
                disabled={disabled}
                onChange={() => onChange(choice.id)}
                className="mt-0.5 w-[18px] h-[18px] shrink-0 accent-nb-ink"
              />
              <span className="min-w-0">
                <span className={`block text-nb-ink ${plain ? "" : "font-bold"}`}>{choice.label}</span>
                {choice.note && <span className="block text-sm text-nb-ink-mid">{choice.note}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
