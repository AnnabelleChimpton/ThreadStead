/**
 * The one compile behind the template editor. Checking (the live preview and
 * the problems panel) and saving both call this, so the preview shows exactly
 * what a save would store. It never writes; only the save route stores the
 * result, as the profile's single compiled copy.
 */
import { compileTemplateToArtifacts, TemplateCompilationError, type StrippedComponentReport } from './compile-pipeline';
import { getCompiledTemplateWithMetrics, type CompilationResult } from './template-cache';
import type { TemplateNode } from './template-parser';
import type { Island } from './compiler/types';
import { stripNavigationFromTemplate } from '@/lib/templates/utils/navigation-stripper';
import { parseTemplateError, formatTemplateErrorForAPI } from '@/lib/templates/errors/template-error-handler';

/** What Profile.compiledTemplate holds, and what the preview renders */
export interface CompiledPage {
  mode: 'advanced';
  staticHTML: string;
  islands: Island[];
  ast: TemplateNode;
  warnings: string[];
  strippedComponents: StrippedComponentReport[];
  compiledAt: string;
}

export type EditorCompile =
  | {
      ok: true;
      /** The source as stored: site navigation tags taken out */
      template: string;
      compiled: CompiledPage;
      stats?: CompilationResult['stats'];
    }
  | {
      ok: false;
      /** The 400 body: every error, plus the first one explained with its line */
      body: { success: false; errors: string[]; warnings: string[] } & ReturnType<typeof formatTemplateErrorForAPI>;
    };

export async function compileForEditor(source: string): Promise<EditorCompile> {
  const template = stripNavigationFromTemplate(source);
  try {
    // Cached by source, so a save right after a check doesn't compile twice
    const result = await getCompiledTemplateWithMetrics(template, async () => {
      const artifacts = compileTemplateToArtifacts(template);
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
      compiled: {
        mode: 'advanced',
        staticHTML: result.staticHTML,
        islands: result.islands,
        ast: result.ast,
        warnings: result.warnings ?? [],
        strippedComponents: result.strippedComponents ?? [],
        compiledAt: new Date().toISOString(),
      },
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
