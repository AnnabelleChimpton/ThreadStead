import { componentRegistry } from '@/lib/templates/core/template-registry';
import { buildComponentDocs } from '@/lib/templates-docs/component-docs';
import { apiHandler } from '@/lib/api/handler';

// The editor's component autocomplete and palette are fed from here, so the
// registry stays the single source of truth — no hand-maintained tag lists
// that drift when components are added or renamed. Same data as the public
// component reference (/build/templates/components), in the same order.
export default apiHandler(
  { methods: ['GET'], auth: 'none' },
  async (req, res) => {
    const components = buildComponentDocs(componentRegistry.getAllRegistrations());

    // Static per deploy — let browsers and the CDN hold onto it.
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.status(200).json({ components });
  }
);
