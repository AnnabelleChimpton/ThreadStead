// The picker's live preview: compiles what's in the forms exactly as a save
// would, and writes nothing.
import { apiHandler } from '@/lib/api/handler';
import { compileWidgetSlot, islandsPlaySong, slotInputFromBody } from '@/lib/domain/profile/widget-slot/compile';

export default apiHandler(
  { methods: ['POST'], auth: 'user', rateLimit: 'default' },
  async (req, res) => {
    const input = slotInputFromBody(req.body);
    if (!input.ok) return res.status(input.status).json({ error: input.error });

    const compiled = compileWidgetSlot(input.source);
    if (!compiled.ok) {
      return res.status(compiled.status).json({ error: compiled.error, details: compiled.details });
    }
    return res.status(200).json({
      source: input.source,
      compiled: { staticHTML: compiled.staticHTML, islands: compiled.islands, playsSong: islandsPlaySong(compiled.islands) },
      strippedComponents: compiled.strippedComponents,
      warnings: compiled.warnings,
    });
  }
);
