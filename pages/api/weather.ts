// The homepage weather card (components/widgets/examples/WeatherWidget.tsx):
// ?place=<town> finds the town and its weather, ?lat=&lon= the weather at a
// place found before. Asked of Open-Meteo by this server (lib/weather/open-meteo.ts).
import { apiHandler } from '@/lib/api/handler';
import { ApiError } from '@/lib/api/errors';
import { findPlace, weatherAt } from '@/lib/weather/open-meteo';

export default apiHandler({ methods: ['GET'], auth: 'none', rateLimit: 'reads' }, async (req, res) => {
  const place = typeof req.query.place === 'string' ? req.query.place.trim() : '';
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  try {
    if (place) {
      const found = await findPlace(place);
      if (!found) throw new ApiError(404, `I couldn't find "${place.slice(0, 80)}". Try a nearby town, or add the country.`);
      return res.status(200).json({ place: found, weather: await weatherAt(found.latitude, found.longitude) });
    }
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return res.status(200).json({ weather: await weatherAt(lat, lon) });
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, "Couldn't get the weather just now.");
  }
  throw new ApiError(400, 'Which town? Send place, or lat and lon.');
});
