/**
 * Persisted variables are kept per page. The key was one per name for the
 * whole site, so two residents' "visits" counters were one counter in a
 * visitor's browser (template audit 06 #5).
 */
import { globalTemplateStateManager as manager } from '../TemplateStateManager'

beforeEach(() => localStorage.clear())

test("each resident's page keeps its own saved value", () => {
  manager.setStoragePage('u_ann')
  manager.registerVariable({ name: 'visits', type: 'number', initial: 0, persist: true })
  manager.setVariable('visits', 5)

  manager.setStoragePage('u_bo')
  manager.unregisterVariable('visits')
  manager.registerVariable({ name: 'visits', type: 'number', initial: 0, persist: true })
  expect(manager.getVariable('visits')).toBe(0)

  expect(localStorage.getItem('threadstead_template_u_ann_visits')).toBe('5')
  expect(localStorage.getItem('threadstead_template_visits')).toBeNull()
})
