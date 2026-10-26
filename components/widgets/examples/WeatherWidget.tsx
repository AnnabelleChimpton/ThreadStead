import React, { useState, useEffect } from 'react';
import { WidgetProps, WidgetConfig } from '../types/widget';
import { PixelIcon } from '@/components/ui/PixelIcon';
import Button from '@/components/ui/Button';
import type { Weather, WeatherPlace } from '@/lib/weather/open-meteo';

const weatherConfig: WidgetConfig = {
  id: 'weather',
  title: 'Weather',
  description: 'The weather in a town you pick',
  category: 'utility',
  size: 'small',
  requiresAuth: false,
  defaultEnabled: true,
  refreshInterval: 1800000 // 30 minutes
};

/** The card's town, kept in this browser only (lib/weather/open-meteo.ts) */
const PLACE_STORAGE = 'ts-weather-place-v1';

function savedPlace(): WeatherPlace | null {
  try {
    const stored = JSON.parse(localStorage.getItem(PLACE_STORAGE) ?? 'null');
    return stored && typeof stored.latitude === 'number' && typeof stored.longitude === 'number' ? stored : null;
  } catch {
    return null;
  }
}

function savePlace(place: WeatherPlace | null) {
  try {
    if (place) localStorage.setItem(PLACE_STORAGE, JSON.stringify(place));
    else localStorage.removeItem(PLACE_STORAGE);
  } catch {
    // Private window: the card asks again next time
  }
}

type WeatherCardData = { place: null } | { place: WeatherPlace; weather: Weather };

/** The weather for a typed town, or why not */
async function weatherFor(query: string): Promise<{ place: WeatherPlace; weather: Weather }> {
  const res = await fetch(`/api/weather?place=${encodeURIComponent(query)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Couldn't get the weather just now.");
  return body;
}

// Helper function to determine if a country uses metric system
// Returns true for metric (Celsius/km/h), false for imperial (Fahrenheit/mph)
const shouldUseMetric = (countryCode?: string): boolean => {
  if (!countryCode) return true; // Default to metric for unknown locations

  // Only US, Liberia, and Myanmar use imperial system
  // US territories also use Fahrenheit
  const imperialCountries = ['US', 'LR', 'MM', 'PR', 'GU', 'VI', 'AS', 'MP'];

  return !imperialCountries.includes(countryCode.toUpperCase());
};

/** Asks for a town: nothing guesses where a visitor is */
function PlaceForm({ onPlace, onCancel }: { onPlace: () => void; onCancel?: () => void }) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const inputId = React.useId();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setProblem(null);
    try {
      const { place } = await weatherFor(query);
      savePlace(place);
      onPlace();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't get the weather just now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor={inputId} className="block text-sm text-nb-ink">Weather for which town?</label>
      <div className="flex gap-2">
        <input
          id={inputId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Portland"
          autoComplete="address-level2"
          maxLength={80}
          className="min-w-0 flex-1 px-2 py-1 text-sm border border-nb-ink-mid/40 rounded bg-white"
        />
        <Button type="submit" size="sm" disabled={busy || !query.trim()}>{busy ? 'Looking…' : 'Show'}</Button>
      </div>
      {problem && <p className="m-0 text-xs text-nb-rose-ink" role="status">{problem}</p>}
      <p className="m-0 text-xs text-nb-ink-mid">
        Only this browser remembers it.
        {onCancel && <> <button type="button" className="ts-bare underline" onClick={onCancel}>Keep the old one</button></>}
      </p>
    </form>
  );
}

function WeatherWidget({ data, isLoading, error, onRefresh }: WidgetProps & { data?: WeatherCardData }) {
  const [changing, setChanging] = useState(false);
  const place = data?.place ?? null;
  // °F or °C from the town's country, until the visitor flips it
  const [useMetric, setUseMetric] = useState(shouldUseMetric(place?.countryCode));
  useEffect(() => setUseMetric(shouldUseMetric(place?.countryCode)), [place?.countryCode]);

  const convertTemp = (fahrenheit: number) => {
    if (!useMetric) return `${fahrenheit}°F`;
    return `${Math.round((fahrenheit - 32) * 5 / 9)}°C`;
  };

  const convertSpeed = (mph: number) => {
    if (!useMetric) return `${mph} mph`;
    return `${Math.round(mph * 1.60934)} km/h`;
  };

  const picked = () => {
    setChanging(false);
    onRefresh?.();
  };

  if (isLoading && !data) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 bg-nb-ink-mid/15 rounded w-24"></div>
          <div className="h-8 bg-nb-ink-mid/15 rounded w-16"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-nb-ink-mid/15 rounded w-full"></div>
          <div className="h-4 bg-nb-ink-mid/15 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-nb-ink-mid">
        <p className="text-sm">Couldn&apos;t get the weather just now.</p>
      </div>
    );
  }

  if (!data || !('weather' in data) || changing) {
    return <PlaceForm onPlace={picked} onCancel={changing ? () => setChanging(false) : undefined} />;
  }

  const weatherData = { ...data.weather, location: data.place.name };

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Current Weather */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-nb-ink-mid m-0">
            {weatherData.location}{' '}
            <button type="button" className="ts-bare text-xs underline" onClick={() => setChanging(true)}>Change</button>
          </p>
          <button
            type="button"
            onClick={() => setUseMetric(!useMetric)}
            className="ts-icon-button text-xs"
            aria-label={useMetric ? 'Show °F' : 'Show °C'}
          >
            {useMetric ? '°F' : '°C'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <PixelIcon name={weatherData.icon} size={32} />
            <div>
              <div className="text-2xl font-bold text-nb-ink">
                {convertTemp(weatherData.temperature)}
              </div>
              <div className="text-xs text-nb-ink-mid">
                {weatherData.condition}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-nb-ink-mid">
            <div>H: {convertTemp(weatherData.high)}</div>
            <div>L: {convertTemp(weatherData.low)}</div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-wrap justify-between gap-2 text-xs text-nb-ink-mid py-2 border-t border-nb-ink-mid/30">
        <div className="flex items-center space-x-1">
          <PixelIcon name="drop" />
          <span>{weatherData.humidity}%</span>
        </div>
        <div className="flex items-center space-x-1">
          <PixelIcon name="sun" />
          <span>{convertSpeed(weatherData.windSpeed)}</span>
        </div>
      </div>

      {/* Mini Forecast */}
      <div className="space-y-2 pt-2 border-t border-nb-ink-mid/30">
        {weatherData.forecast.map((day, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <PixelIcon name={day.icon} size={16} className="flex-shrink-0" />
              <span className="text-nb-ink font-medium">{day.day}</span>
            </div>
            <div className="flex items-center space-x-1 text-nb-ink-mid">
              <span>{convertTemp(day.high)}</span>
              <span className="text-nb-ink-mid">/</span>
              <span className="text-nb-ink-mid">{convertTemp(day.low)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const weatherWidget = {
  config: weatherConfig,
  component: WeatherWidget as React.ComponentType<WidgetProps & { data?: any }>,
  // The town this browser picked, through this site's server; none picked: the card asks
  fetchData: async (): Promise<WeatherCardData> => {
    const place = savedPlace();
    if (!place) return { place: null };
    const res = await fetch(`/api/weather?lat=${place.latitude}&lon=${place.longitude}`);
    if (!res.ok) throw new Error("Couldn't get the weather just now.");
    const { weather } = await res.json();
    return { place, weather };
  }
};
