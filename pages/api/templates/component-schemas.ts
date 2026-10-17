import { componentRegistry } from '@/lib/templates/core/template-registry';
import { apiHandler } from '@/lib/api/handler';

// The editor's component autocomplete and palette are fed from here, so the
// registry stays the single source of truth — no hand-maintained tag lists
// that drift when components are added or renamed.
export default apiHandler(
  { methods: ['GET'], auth: 'none' },
  async (req, res) => {
    const components = Array.from(componentRegistry.getAllRegistrations().entries())
      .map(([name, reg]) => ({
        name,
        // No relationship metadata → treat as a leaf (inserted self-closing).
        acceptsChildren: reg.relationship ? reg.relationship.acceptsChildren !== false : false,
        props: Object.entries(reg.props).map(([propName, schema]) => ({
          name: propName,
          type: schema.type,
          required: !!schema.required,
          values:
            schema.type === 'enum' && schema.values
              ? [...schema.values]
              : schema.type === 'boolean'
                ? ['true', 'false']
                : undefined,
          default: schema.default !== undefined ? String(schema.default) : undefined,
        })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Static per deploy — let browsers and the CDN hold onto it.
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.status(200).json({ components });
  }
);
