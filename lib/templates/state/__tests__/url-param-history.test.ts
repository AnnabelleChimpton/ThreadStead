/**
 * A urlParam variable follows Back and Forward: SetURLParam pushes a history
 * step, and going back used to leave the newer value showing (template audit
 * 16 #4d).
 */
import { globalTemplateStateManager as manager } from '../TemplateStateManager'

test('Back brings the earlier value back; a missing param falls back to the default', () => {
  window.history.replaceState({}, '', '/?p=1')
  manager.registerVariable({ name: 'page', type: 'urlParam', initial: undefined, param: 'p', coerce: 'number', default: 1 } as any)
  expect(manager.getVariable('page')).toBe(1)

  window.history.pushState({}, '', '/?p=3')
  window.dispatchEvent(new PopStateEvent('popstate'))
  expect(manager.getVariable('page')).toBe(3)

  window.history.replaceState({}, '', '/')
  window.dispatchEvent(new PopStateEvent('popstate'))
  expect(manager.getVariable('page')).toBe(1)
  manager.unregisterVariable('page')
})
