/**
 * The homepage weather card asks nothing about a visitor until they pick a
 * town, and then asks only this site (pages/api/weather.ts), which asks
 * Open-Meteo itself (signup audit #12: it used to send every visitor's IP to
 * ipapi.co, then show made-up weather when that failed).
 */
import { weatherWidget } from '../examples/WeatherWidget'
import { findPlace, weatherAt, forgetWeather } from '@/lib/weather/open-meteo'

const FORECAST = {
  current: { temperature_2m: 10, relative_humidity_2m: 80, weather_code: 63, wind_speed_10m: 16, is_day: 1 },
  daily: {
    time: ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'],
    weather_code: [63, 0, 3, 95],
    temperature_2m_max: [12, 15, 14, 13],
    temperature_2m_min: [5, 6, 7, 8],
  },
}

let fetched: string[]
beforeEach(() => {
  localStorage.clear()
  forgetWeather()
  fetched = []
  ;(globalThis as { fetch?: unknown }).fetch = jest.fn(async (url: string) => {
    fetched.push(String(url))
    if (String(url).includes('geocoding-api')) {
      return { ok: true, json: async () => ({ results: [{ name: 'Portland', admin1: 'Oregon', latitude: 45.52345, longitude: -122.67621, country_code: 'US' }] }) }
    }
    if (String(url).startsWith('https://api.open-meteo.com')) return { ok: true, json: async () => FORECAST }
    return { ok: true, json: async () => ({ weather: { temperature: 50 } }) }
  })
})

describe('the card', () => {
  test('with no town picked, it asks for one and fetches nothing', async () => {
    expect(await weatherWidget.fetchData()).toEqual({ place: null })
    expect(fetched).toEqual([])
  })

  test('with a town picked in this browser, it asks only this site', async () => {
    localStorage.setItem('ts-weather-place-v1', JSON.stringify({ name: 'Portland, Oregon', latitude: 45.5, longitude: -122.7, countryCode: 'US' }))
    const data = await weatherWidget.fetchData()
    expect(fetched).toEqual(['/api/weather?lat=45.5&lon=-122.7'])
    expect(data).toEqual({ place: expect.objectContaining({ name: 'Portland, Oregon' }), weather: { temperature: 50 } })
  })

  test('a failure says so: no made-up weather', async () => {
    localStorage.setItem('ts-weather-place-v1', JSON.stringify({ name: 'X', latitude: 1, longitude: 2 }))
    ;(globalThis.fetch as jest.Mock).mockImplementationOnce(async () => ({ ok: false, json: async () => ({}) }))
    await expect(weatherWidget.fetchData()).rejects.toThrow("Couldn't get the weather")
  })
})

describe('the server side', () => {
  test('finds a town by name and rounds where it asks for weather', async () => {
    const place = await findPlace(' Portland ')
    expect(place).toEqual({ name: 'Portland, Oregon', latitude: 45.52345, longitude: -122.67621, countryCode: 'US' })
    const weather = await weatherAt(place!.latitude, place!.longitude)
    expect(fetched[1]).toContain('latitude=45.5&longitude=-122.7')
    expect(weather).toMatchObject({ temperature: 50, condition: 'Rain', humidity: 80, windSpeed: 10, high: 54, low: 41 })
    expect(weather.forecast.map((day) => day.day)).toEqual(['Tomorrow', 'Wednesday', 'Thursday'])
  })

  test('asks once per place in a while, not once per visitor', async () => {
    await weatherAt(45.52, -122.68)
    await weatherAt(45.48, -122.71)
    expect(fetched.filter((url) => url.includes('api.open-meteo.com'))).toHaveLength(1)
  })

  test('nothing here asks a location service about the visitor', () => {
    const source = require('fs').readFileSync(require.resolve('../examples/WeatherWidget'), 'utf8')
    expect(source).not.toMatch(/ipapi|geolocation|open-meteo\.com/)
  })
})
