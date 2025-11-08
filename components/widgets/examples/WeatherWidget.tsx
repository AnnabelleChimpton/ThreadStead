import React, { useState, useEffect } from 'react';
import { WidgetProps, WidgetConfig } from '../types/widget';

const weatherConfig: WidgetConfig = {
  id: 'weather',
  title: 'Weather',
  description: 'Local weather conditions',
  category: 'utility',
  size: 'small',
  requiresAuth: false,
  defaultEnabled: true,
  refreshInterval: 1800000 // 30 minutes
};

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  emoji: string;
  high: number;
  low: number;
  humidity: number;
  windSpeed: number;
  countryCode?: string; // ISO country code for unit detection
  forecast: {
    day: string;
    high: number;
    low: number;
    condition: string;
    emoji: string;
  }[];
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

// Mock weather data for demo
const mockWeatherData: WeatherData = {
  location: 'Threadstead',
  temperature: 72,
  condition: 'Partly Cloudy',
  emoji: '⛅',
  high: 78,
  low: 65,
  humidity: 45,
  windSpeed: 8,
  forecast: [
    { day: 'Tomorrow', high: 75, low: 62, condition: 'Sunny', emoji: '☀️' },
    { day: 'Thursday', high: 73, low: 60, condition: 'Rainy', emoji: '🌧️' },
    { day: 'Friday', high: 76, low: 64, condition: 'Cloudy', emoji: '☁️' }
  ]
};

function WeatherWidget({ data, isLoading, error }: WidgetProps & { data?: WeatherData }) {
  // Use mock data if no real data provided
  const weatherData = data || mockWeatherData;

  // Determine default unit based on country code (smart default)
  const [useMetric, setUseMetric] = useState(shouldUseMetric(weatherData.countryCode));

  const convertTemp = (fahrenheit: number) => {
    if (!useMetric) return `${fahrenheit}°F`;
    return `${Math.round((fahrenheit - 32) * 5/9)}°C`;
  };

  const convertSpeed = (mph: number) => {
    if (!useMetric) return `${mph} mph`;
    return `${Math.round(mph * 1.60934)} km/h`;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 bg-gray-200 rounded w-24"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Unable to load weather</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Current Weather */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">{weatherData.location}</h3>
          <button
            onClick={() => setUseMetric(!useMetric)}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            {useMetric ? '°F' : '°C'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{weatherData.emoji}</span>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {convertTemp(weatherData.temperature)}
              </div>
              <div className="text-xs text-gray-500">
                {weatherData.condition}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-gray-500">
            <div>H: {convertTemp(weatherData.high)}</div>
            <div>L: {convertTemp(weatherData.low)}</div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex justify-between text-xs text-gray-600 py-2 border-t border-gray-100">
        <div className="flex items-center space-x-1">
          <span>💧</span>
          <span>{weatherData.humidity}%</span>
        </div>
        <div className="flex items-center space-x-1">
          <span>💨</span>
          <span>{convertSpeed(weatherData.windSpeed)}</span>
        </div>
      </div>

      {/* Mini Forecast */}
      <div className="space-y-1 pt-2 border-t border-gray-100">
        {weatherData.forecast.map((day, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 flex-1">
              <span>{day.emoji}</span>
              <span className="text-gray-600">{day.day}</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-500">
              <span>{convertTemp(day.low)}</span>
              <div className="w-12 bg-gray-200 rounded-full h-1 relative">
                <div
                  className="absolute bg-blue-400 h-1 rounded-full"
                  style={{
                    left: `${((day.low - 55) / 30) * 100}%`,
                    width: `${((day.high - day.low) / 30) * 100}%`
                  }}
                ></div>
              </div>
              <span>{convertTemp(day.high)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Weather code to condition mapping for Open-Meteo
const getWeatherCondition = (weatherCode: number, isDay: boolean) => {
  const conditions: Record<number, { condition: string; emoji: string; day?: string; night?: string }> = {
    0: { condition: 'Clear', emoji: isDay ? '☀️' : '🌙' },
    1: { condition: 'Mostly Clear', emoji: isDay ? '🌤️' : '🌙' },
    2: { condition: 'Partly Cloudy', emoji: isDay ? '⛅' : '☁️' },
    3: { condition: 'Overcast', emoji: '☁️' },
    45: { condition: 'Foggy', emoji: '🌫️' },
    48: { condition: 'Foggy', emoji: '🌫️' },
    51: { condition: 'Light Drizzle', emoji: '🌦️' },
    53: { condition: 'Drizzle', emoji: '🌦️' },
    55: { condition: 'Heavy Drizzle', emoji: '🌧️' },
    61: { condition: 'Light Rain', emoji: '🌦️' },
    63: { condition: 'Rain', emoji: '🌧️' },
    65: { condition: 'Heavy Rain', emoji: '🌧️' },
    71: { condition: 'Light Snow', emoji: '🌨️' },
    73: { condition: 'Snow', emoji: '❄️' },
    75: { condition: 'Heavy Snow', emoji: '❄️' },
    80: { condition: 'Rain Showers', emoji: '🌦️' },
    81: { condition: 'Rain Showers', emoji: '🌧️' },
    82: { condition: 'Heavy Rain Showers', emoji: '🌧️' },
    95: { condition: 'Thunderstorm', emoji: '⛈️' },
    96: { condition: 'Thunderstorm', emoji: '⛈️' },
    99: { condition: 'Severe Thunderstorm', emoji: '⛈️' }
  };

  return conditions[weatherCode] || { condition: 'Unknown', emoji: '❓' };
};

export const weatherWidget = {
  config: weatherConfig,
  component: WeatherWidget as React.ComponentType<WidgetProps & { data?: any }>,
  fetchData: async (user?: any) => {
    try {
      let latitude = user?.latitude;
      let longitude = user?.longitude;
      let locationName = user?.location;
      let countryCode: string | undefined;

      // If no user location data, try IP geolocation
      if (!latitude || !longitude) {
        try {
          // Using ipapi.co - free service with generous limits
          const geoResponse = await fetch('https://ipapi.co/json/');
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            latitude = geoData.latitude;
            longitude = geoData.longitude;
            countryCode = geoData.country_code; // ISO 2-letter country code
            locationName = geoData.city && geoData.region
              ? `${geoData.city}, ${geoData.region}`
              : geoData.city || geoData.region || 'Your Location';
          }
        } catch (geoError) {
          console.warn('IP geolocation failed:', geoError);
        }
      }

      // Final fallback to New York if geolocation fails
      if (!latitude || !longitude) {
        latitude = 40.7128;
        longitude = -74.0060;
        locationName = 'New York';
        countryCode = 'US'; // Default to US for New York fallback
      }

      // Fetch current weather and 3-day forecast from Open-Meteo
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`
      );

      if (!response.ok) {
        throw new Error('Weather API request failed');
      }

      const data = await response.json();

      // Process current weather
      const current = data.current;
      const currentCondition = getWeatherCondition(current.weather_code, current.is_day);

      // Process daily forecast
      const daily = data.daily;
      const forecast = [];

      // Skip today (index 0) and get next 3 days
      for (let i = 1; i <= 3; i++) {
        const date = new Date(daily.time[i]);
        const dayName = i === 1 ? 'Tomorrow' :
          date.toLocaleDateString('en-US', { weekday: 'long' });

        const condition = getWeatherCondition(daily.weather_code[i], true); // Use day version for forecast

        forecast.push({
          day: dayName,
          high: Math.round(daily.temperature_2m_max[i] * 9/5 + 32), // Convert C to F
          low: Math.round(daily.temperature_2m_min[i] * 9/5 + 32), // Convert C to F
          condition: condition.condition,
          emoji: condition.emoji
        });
      }

      return {
        location: locationName,
        temperature: Math.round(current.temperature_2m * 9/5 + 32), // Convert C to F
        condition: currentCondition.condition,
        emoji: currentCondition.emoji,
        high: Math.round(daily.temperature_2m_max[0] * 9/5 + 32), // Today's high
        low: Math.round(daily.temperature_2m_min[0] * 9/5 + 32), // Today's low
        humidity: Math.round(current.relative_humidity_2m),
        windSpeed: Math.round(current.wind_speed_10m * 0.621371), // Convert km/h to mph
        countryCode, // Include country code for unit detection
        forecast
      };

    } catch (error) {
      console.error('Error fetching weather data:', error);

      // Fallback to mock data if API fails
      const conditions = [
        { condition: 'Partly Cloudy', emoji: '⛅' },
        { condition: 'Sunny', emoji: '☀️' },
        { condition: 'Cloudy', emoji: '☁️' }
      ];

      const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
      const baseTemp = 65 + Math.floor(Math.random() * 20);

      return {
        location: user?.location || 'Threadstead',
        temperature: baseTemp,
        condition: randomCondition.condition,
        emoji: randomCondition.emoji,
        high: baseTemp + 8,
        low: baseTemp - 12,
        humidity: 45,
        windSpeed: 7,
        forecast: [
          { day: 'Tomorrow', high: baseTemp + 2, low: baseTemp - 10, ...randomCondition },
          { day: 'Thursday', high: baseTemp - 1, low: baseTemp - 13, ...randomCondition },
          { day: 'Friday', high: baseTemp + 4, low: baseTemp - 8, ...randomCondition }
        ]
      };
    }
  }
};