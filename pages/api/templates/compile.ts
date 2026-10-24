// Builds a draft for the editor: the live preview renders the artifact this
// returns, the problems panel shows its warnings. It never writes; a save
// (POST /api/profile/[username]/template) stores the same artifact, from the
// same compileForEditor, so what the preview shows is what gets stored.
import { apiHandler } from '@/lib/api/handler';
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor';
import { sourceTooLong } from '@/lib/templates/limits';

export default apiHandler(
  {
    methods: ['POST'],
    auth: 'user',
    // Compiling a big page is real work for the server (security audit H1)
    rateLimit: 'template_compile',
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
      artifact: result.artifact,
      errors: [],
      warnings: result.warnings,
      strippedComponents: result.strippedComponents,
      stats: result.stats,
    });
  }
);
