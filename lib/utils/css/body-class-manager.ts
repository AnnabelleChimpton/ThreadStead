/**
 * Body class manager for applying Visual Builder pattern classes to the body element
 * This enables full-page pattern coverage for Visual Builder templates
 */

export class BodyClassManager {
  private static appliedPatternClass: string | null = null;

  /**
   * Apply a pattern class to the body element and remove any previously applied pattern class
   */
  static applyPatternClass(patternClass: string): void {
    if (typeof window === 'undefined') return; // SSR guard

    // Remove previously applied pattern class
    if (this.appliedPatternClass) {
      document.body.classList.remove(this.appliedPatternClass);
    }

    // Apply new pattern class
    document.body.classList.add(patternClass);
    this.appliedPatternClass = patternClass;
  }

  /**
   * Remove the currently applied pattern class from body
   */
  static removePatternClass(): void {
    if (typeof window === 'undefined') return; // SSR guard

    if (this.appliedPatternClass) {
      document.body.classList.remove(this.appliedPatternClass);
      this.appliedPatternClass = null;
    }
  }

  /**
   * Extract pattern classes from Visual Builder class list
   */
  static extractPatternClasses(visualBuilderClasses: string[]): string[] {
    return visualBuilderClasses.filter(className =>
      className.includes('pattern-') && !className.includes('bg-')
    );
  }

  /**
   * Get the currently applied pattern class
   */
  static getCurrentPatternClass(): string | null {
    return this.appliedPatternClass;
  }
}