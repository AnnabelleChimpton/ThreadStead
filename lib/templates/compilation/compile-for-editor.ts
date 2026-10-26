/**
 * The one build of a page of your own HTML: the editor's live preview and
 * problems panel, a save, the recompile script and a visit to a page with
 * no stored copy all call this, and get the same artifact
 * (lib/templates/rendering/page-artifact.ts). The preview renders that
 * artifact; a save stores it. It never writes.
 */
import { compileTemplateToArtifacts, TemplateCompilationError, type StrippedComponentReport } from './compile-pipeline';
import { getCompiledTemplateWithMetrics, type CompilationResult } from './template-cache';
import { artifactFor, type PageArtifact } from '@/lib/templates/rendering/page-artifact';
import { cleanCustomHtmlIslands } from './custom-html';
import { stripNavigationFromTemplate } from '@/lib/templates/utils/navigation-stripper';
import { parseTemplateError, formatTemplateErrorForAPI } from '@/lib/templates/errors/template-error-handler';

export type EditorCompile =
  | {
      ok: true;
      /** The source as stored: site navigation tags taken out */
      template: string;
      /** What the page renders from: stored by a save, rendered by the preview */
      artifact: PageArtifact;
      /** For the editor to say, never stored */
      warnings: string[];
      strippedComponents: StrippedComponentReport[];
      stats?: CompilationResult['stats'];
    }
  | {
      ok: false;
      /** The 400 body: every error, plus the first one explained with its line */
      body: { success: false; errors: string[]; warnings: string[] } & ReturnType<typeof formatTemplateErrorForAPI>;
    };

/**
 * `positions`: the editor's live preview, which marks where each word and
 * tag is in `source` (source-positions.ts) so words typed on the preview go
 * back into the code. Cached apart, and never asked for by a save, so no
 * stored page carries them.
 */
export async function compileForEditor(source: string, { positions = false }: { positions?: boolean } = {}): Promise<EditorCompile> {
  const template = stripNavigationFromTemplate(source);
  try {
    // Cached by source, so a save right after a check doesn't compile twice
    const result = await getCompiledTemplateWithMetrics(positions ? `positions\n${source}` : template, async () => {
      const artifacts = compileTemplateToArtifacts(template, positions ? { positionsIn: source } : {});
      return {
        ast: artifacts.ast,
        islands: artifacts.islands,
        staticHTML: artifacts.staticHTML,
        warnings: artifacts.warnings,
        strippedComponents: artifacts.strippedComponents,
        stats: artifacts.stats,
      };
    });
    return {
      ok: true,
      template,
      artifact: withCleanCustomHtml(artifactFor(result)),
      warnings: result.warnings ?? [],
      strippedComponents: result.strippedComponents ?? [],
      stats: result.stats,
    };
  } catch (error) {
    const errors =
      error instanceof TemplateCompilationError ? error.errors : [error instanceof Error ? error.message : String(error)];
    const warnings = error instanceof TemplateCompilationError ? error.warnings : [];
    if (!(error instanceof TemplateCompilationError)) console.error('Template compile failed:', error);
    return {
      ok: false,
      body: {
        ...formatTemplateErrorForAPI(parseTemplateError(errors[0] || 'Template compilation failed')),
        success: false,
        errors,
        warnings,
      },
    };
  }
}

/** CustomHTMLElement's HTML props, cleaned once here instead of in every browser (custom-html.ts) */
function withCleanCustomHtml(artifact: PageArtifact): PageArtifact {
  return { ...artifact, islands: cleanCustomHtmlIslands(artifact.islands) };
}
