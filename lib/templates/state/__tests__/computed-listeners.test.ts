/**
 * A computed variable that changes tells those watching just it (an <If>
 * on it subscribes to that one name), not only everyone: it used to stay
 * as it was. refresh() works computed variables out again, which is how
 * $time in an expression moves on each minute.
 */
import { globalTemplateStateManager as manager } from '../TemplateStateManager'
import { goLive } from '../expression-evaluator'

beforeEach(() => manager.clear())

test('watchers of a computed variable hear when it changes', () => {
  manager.registerVariable({ name: 'likes', type: 'number', initial: 1 })
  manager.registerVariable({ name: 'double', type: 'computed', computed: '$vars.likes * 2' })
  const heard = jest.fn()
  manager.subscribeToVariables(heard, ['double'])

  manager.setVariable('likes', 5)
  expect(manager.getVariable('double')).toBe(10)
  expect(heard).toHaveBeenCalled()
})

test('refresh() works computed variables out again: what changes by itself moves on', () => {
  goLive()
  manager.registerVariable({ name: 'roll', type: 'computed', computed: 'random(1, 1000000)' })
  const first = manager.getVariable('roll')
  const heard = jest.fn()
  manager.subscribeToVariables(heard, ['roll'])
  manager.refresh()
  expect(manager.getVariable('roll')).not.toBe(first)
  expect(heard).toHaveBeenCalled()
})
