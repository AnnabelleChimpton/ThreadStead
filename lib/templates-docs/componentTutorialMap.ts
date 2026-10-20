// Which lessons use each component, for the components page's "Used in"
// links: read from the components each step's code actually writes.
import { lessons, type Lesson } from './lessons';

export interface ComponentTutorialInfo {
  tutorial: Lesson;
  /** Step numbers (from 1) whose code uses it */
  appearsInSteps: number[];
}

/** Component names written in a piece of code, lowercased (component ids) */
function componentsIn(code: string): Set<string> {
  return new Set([...code.matchAll(/<([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1].toLowerCase()));
}

export function buildComponentTutorialMap(): Map<string, ComponentTutorialInfo[]> {
  const map = new Map<string, ComponentTutorialInfo[]>();
  for (const lesson of lessons) {
    const steps = new Map<string, number[]>();
    lesson.steps.forEach((step, index) => {
      for (const id of componentsIn(step.code)) steps.set(id, [...(steps.get(id) ?? []), index + 1]);
    });
    for (const [id, appearsInSteps] of steps) {
      map.set(id, [...(map.get(id) ?? []), { tutorial: lesson, appearsInSteps }]);
    }
  }
  return map;
}

let cache: Map<string, ComponentTutorialInfo[]> | null = null;

/** The lessons that use a component (by id, like "guestbook") */
export function getCachedTutorialsForComponent(componentId: string): ComponentTutorialInfo[] {
  cache ??= buildComponentTutorialMap();
  return cache.get(componentId.toLowerCase()) ?? [];
}
