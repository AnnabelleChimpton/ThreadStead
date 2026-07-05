/**
 * THE single compilation entry point for advanced templates (G2).
 *
 * Before this existed, the parse → island-detection → static-HTML pipeline
 * was hand-orchestrated in three places with divergent error handling:
 * pages/api/profile/[username]/template.ts (friendly errors),
 * pages/api/templates/compile-profile.ts (generic errors), and implicitly in
 * lib/templates/compilation/compiler/profile-modes.ts. Divergent copies of
 * the pipeline are how the boundary bugs of 2026-07 stayed invisible.
 *
 * All compilation of user template source MUST go through this function so
 * behavior (and its golden-test coverage — see tests/template-engine/) stays
 * uniform.
 */
import { compileTemplate, type TemplateNode } from './template-parser'
import { identifyIslandsWithTransform } from './compiler/island-detector'
import { generateStaticHTML } from './compiler/html-optimizer'
import type { Island } from './compiler/types'

export interface StrippedComponentReport {
  name: string
  line?: number
  reason?: string
}

export interface CompiledTemplateArtifacts {
  ast: TemplateNode
  islands: Island[]
  staticHTML: string
  warnings: string[]
  /**
   * Elements removed during sanitization (unknown components, disallowed
   * tags). Surfacing these is the anti-silent-failure contract: a user whose
   * component vanished must be told, not left staring at a blank spot.
   */
  strippedComponents: StrippedComponentReport[]
}

export class TemplateCompilationError extends Error {
  constructor(
    public errors: string[],
    public warnings: string[] = []
  ) {
    super(errors[0] || 'Template compilation failed')
    this.name = 'TemplateCompilationError'
  }
}

/**
 * Compile advanced-template source into render-ready artifacts.
 * Throws TemplateCompilationError (with ALL collected errors) on failure —
 * callers surface them via lib/templates/errors/template-error-handler.
 */
export function compileTemplateToArtifacts(template: string): CompiledTemplateArtifacts {
  const parsed = compileTemplate(template)

  if (!parsed.success || !parsed.ast) {
    throw new TemplateCompilationError(
      parsed.errors && parsed.errors.length ? parsed.errors : ['Template compilation failed'],
      parsed.validation?.warnings ?? []
    )
  }

  const { islands, transformedAst } = identifyIslandsWithTransform(parsed.ast)
  const staticHTML = generateStaticHTML(transformedAst, islands)

  return {
    ast: transformedAst,
    islands,
    staticHTML,
    warnings: parsed.validation?.warnings ?? [],
    strippedComponents:
      (parsed as { strippedComponents?: StrippedComponentReport[] }).strippedComponents ?? [],
  }
}
