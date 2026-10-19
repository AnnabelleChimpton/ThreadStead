import { useState } from 'react';
import Link from 'next/link';
import HousePicker from './HousePicker';
import { PixelIcon } from '@/components/ui/PixelIcon';
import type { DecorationItem } from '@/lib/pixel-homes/decoration-data';
import { DEMO_TERRAIN, DEMO_YARD } from '@/lib/pixel-homes/demo-yard';
import { DEFAULT_HOUSE_CHOICE, HouseChoice, houseChoiceQuery, saveHouseChoice } from '@/lib/pixel-homes/house-choice';

/**
 * The homepage demo house for visitors, in a lived-in yard. The house and
 * colors they pick go with them to signup ("Create This Home").
 * `decorations` is the demo yard with its catalog art, from the server.
 */
export default function VisitorPixelHome({ decorations = DEMO_YARD }: { decorations?: DecorationItem[] }) {
  const [isNight, setIsNight] = useState(false);
  const [choice, setChoice] = useState<HouseChoice>(DEFAULT_HOUSE_CHOICE);

  const atmosphere = {
    sky: isNight ? ('night' as const) : ('sunny' as const),
    weather: 'clear' as const,
    timeOfDay: isNight ? ('night' as const) : ('midday' as const),
  };

  return (
    <div className="relative">
      <div className="text-center mb-4">
        <p className="text-sm text-nb-ink font-medium mb-1">
          This could be your house. Everyone on the street gets one.
        </p>
        <p className="text-xs text-nb-ink-mid">
          Pick a house, paint it, plant a garden.
        </p>
      </div>

      <HousePicker
        value={choice}
        onChange={setChoice}
        atmosphere={atmosphere}
        decorations={decorations}
        terrain={DEMO_TERRAIN}
      />

      <div className="flex flex-wrap justify-center items-center gap-3 mt-5">
        <button
          onClick={() => setIsNight(!isNight)}
          className="thread-button-secondary btn btn--secondary text-xs"
        >
          <PixelIcon name={isNight ? 'sun' : 'moon'} size={12} className="inline-block align-[-1px] mr-1.5" />
          <span>{isNight ? 'Day' : 'Night'}</span>
        </button>
        <Link
          href={`/signup?${houseChoiceQuery(choice)}`}
          onClick={() => saveHouseChoice(choice)}
          className="btn btn--primary inline-block px-5 py-2 text-sm font-bold no-underline bg-thread-cream text-thread-pine border-2 border-thread-sage rounded-md shadow-cozy-sm"
        >
          <PixelIcon name="home" className="inline-block align-[-3px] mr-1.5" /> Create This Home
        </Link>
      </div>
      <div className="mt-2 text-center text-xs text-nb-ink-mid">
        Free, and you can repaint it any time.
      </div>
    </div>
  );
}
