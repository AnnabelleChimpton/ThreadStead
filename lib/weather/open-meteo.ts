/**
 * The homepage weather card's data, from Open-Meteo, asked for by this
 * server: a visitor's IP never reaches a weather or location service
 * (signup audit #12). The place is one the visitor typed; nothing guesses
 * where they are. Answers are cached, so a busy page asks rarely.
 */
import type { PixelIconName } from '@/components/ui/PixelIcon';

export interface WeatherPlace {
  name: string;
  latitude: number;
  longitude: number;
  /** ISO country code, for °F or °C */
  countryCode?: string;
}

export interface WeatherDay {
  day: string;
  high: number;
  low: number;
  condition: string;
  icon: PixelIconName;
}

/** Temperatures in °F and wind in mph; the card converts for °C */
export interface Weather {
  temperature: number;
  condition: string;
  icon: PixelIconName;
  high: number;
  low: number;
  humidity: number;
  windSpeed: number;
  forecast: WeatherDay[];
}

const TIMEOUT_MS = 5000;
const FORECAST_TTL_MS = 30 * 60 * 1000;
const PLACE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHED = 500;

const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await load();
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
}

/** The first place Open-Meteo knows by that name, or null */
export function findPlace(name: string): Promise<WeatherPlace | null> {
  const query = name.trim().slice(0, 80);
  return cached(`place:${query.toLowerCase()}`, PLACE_TTL_MS, async () => {
    const data = await getJson(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(query)}`);
    const hit = data?.results?.[0];
    if (!hit || typeof hit.latitude !== 'number' || typeof hit.longitude !== 'number') return null;
    const region = hit.admin1 && hit.admin1 !== hit.name ? `, ${hit.admin1}` : '';
    return { name: `${hit.name}${region}`, latitude: hit.latitude, longitude: hit.longitude, countryCode: hit.country_code };
  });
}

/** About 11 km: as close as the weather needs, and what the cache is keyed by */
export const roundCoordinate = (value: number) => Math.round(value * 10) / 10;

const CONDITIONS: Record<number, [string, PixelIconName, PixelIconName?]> = {
  0: ['Clear', 'sun', 'cloud-moon'],
  1: ['Mostly Clear', 'cloud', 'cloud-moon'],
  2: ['Partly Cloudy', 'cloud'],
  3: ['Overcast', 'cloud'],
  45: ['Foggy', 'cloud'],
  48: ['Foggy', 'cloud'],
  51: ['Light Drizzle', 'cloud'],
  53: ['Drizzle', 'cloud'],
  55: ['Heavy Drizzle', 'drop'],
  61: ['Light Rain', 'cloud'],
  63: ['Rain', 'drop'],
  65: ['Heavy Rain', 'drop'],
  71: ['Light Snow', 'cloud'],
  73: ['Snow', 'cloud'],
  75: ['Heavy Snow', 'cloud'],
  80: ['Rain Showers', 'cloud'],
  81: ['Rain Showers', 'drop'],
  82: ['Heavy Rain Showers', 'drop'],
  95: ['Thunderstorm', 'zap'],
  96: ['Thunderstorm', 'zap'],
  99: ['Severe Thunderstorm', 'zap'],
};

function condition(code: number, isDay: boolean): { condition: string; icon: PixelIconName } {
  const [name, day, night] = CONDITIONS[code] ?? ['Unknown', 'sun'];
  return { condition: name, icon: !isDay && night ? night : day };
}

const fahrenheit = (celsius: number) => Math.round((celsius * 9) / 5 + 32);

/** Now and the next three days at a place (rounded first) */
export function weatherAt(latitude: number, longitude: number): Promise<Weather> {
  const lat = roundCoordinate(latitude);
  const lon = roundCoordinate(longitude);
  return cached(`weather:${lat},${lon}`, FORECAST_TTL_MS, async () => {
    const data = await getJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`
    );
    const { current, daily } = data;
    const forecast: WeatherDay[] = [1, 2, 3].map((i) => ({
      day: i === 1 ? 'Tomorrow' : new Date(`${daily.time[i]}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }),
      high: fahrenheit(daily.temperature_2m_max[i]),
      low: fahrenheit(daily.temperature_2m_min[i]),
      ...condition(daily.weather_code[i], true),
    }));
    return {
      temperature: fahrenheit(current.temperature_2m),
      ...condition(current.weather_code, Boolean(current.is_day)),
      high: fahrenheit(daily.temperature_2m_max[0]),
      low: fahrenheit(daily.temperature_2m_min[0]),
      humidity: Math.round(current.relative_humidity_2m),
      windSpeed: Math.round(current.wind_speed_10m * 0.621371),
      forecast,
    };
  });
}

/** For tests */
export function forgetWeather() {
  cache.clear();
}
