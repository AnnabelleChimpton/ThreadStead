// Compiles template source for the editor: the live preview and the problems
// panel both come from here. It never writes; POST /api/profile/[username]/
// template saves, through the same compileForEditor, so what the preview
// shows is what gets stored.
import { apiHandler } from '@/lib/api/handler';
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor';
import { sourceTooLong } from '@/lib/templates/limits';

export default apiHandler(
  {
    methods: ['POST'],
    auth: 'user',
    // Changes nothing, so a cross-site post gains nothing
    csrf: false,
  },
  async (req, res) => {
    const { template } = req.body ?? {};
    if (typeof template !== 'string') {
      return res.status(400).json({ success: false, errors: ['Send the template as text.'], warnings: [] });
    }
    const tooLong = sourceTooLong('template', template);
    if (tooLong) return res.status(413).json({ success: false, errors: [tooLong], warnings: [] });

    const result = await compileForEditor(template);
    if (!result.ok) return res.status(400).json(result.body);

    return res.status(200).json({
      success: true,
      compiled: result.compiled,
      errors: [],
      warnings: result.compiled.warnings,
      strippedComponents: result.compiled.strippedComponents,
      stats: result.stats,
    });
  }
);
