/**
 * Every action gets what it takes, in its own order. They were all called
 * (props, templateState, residentData, forEachContext, element), so inside a
 * ForEach RemoveAt got residentData as its loop and did nothing (the shipped
 * "Cross one off" lesson), and AddClass target="this" got the template
 * state as its element (template audit 06 #1).
 */
import React from 'react'
import { executeActions } from '../ActionExecutor'
import RemoveAt from '@/components/features/templates/state/actions/RemoveAt'
import AddClass from '@/components/features/templates/state/actions/AddClass'
import ConditionalAttr from '@/components/features/templates/state/actions/ConditionalAttr'

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}))
afterEach(() => jest.restoreAllMocks())

function stateWith(books: string[]) {
  const setVariable = jest.fn()
  return { templateState: { variables: { books: { value: books } }, setVariable, getVariable: () => books } as any, setVariable }
}

test("RemoveAt in a ForEach removes the loop's own item", () => {
  const { templateState, setVariable } = stateWith(['a', 'b', 'c'])
  executeActions(<RemoveAt var="books" index={undefined as unknown as number} />, templateState, { owner: {}, viewer: {} }, { index: 1, scopeId: 's1' })
  expect(setVariable).toHaveBeenCalledWith('books', ['a', 'c'])
})

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

test('AddClass target="this" reaches the element the event happened on', async () => {
  const { templateState } = stateWith([])
  const button = document.createElement('button')
  executeActions(<AddClass target="this" className="pressed" />, templateState, {}, null, button)
  await nextFrame()
  expect(button.className).toBe('pressed')
})

// Template audit 06 §3: a <Set> that shows an element, then <AddClass> for it,
// in one click: the class actions run once React has drawn it
test('AddClass reaches an element the same click put on the page', async () => {
  const { templateState } = stateWith([])
  document.body.innerHTML = '<div data-template-root></div>'
  executeActions(<AddClass target="#late" className="lit" />, templateState, {}, null)
  // what React draws for the click, after the actions ran
  document.querySelector('[data-template-root]')!.innerHTML = '<p id="user-content-late"></p>'
  await nextFrame()
  expect(document.querySelector('#user-content-late')!.className).toBe('lit')
})

test('ConditionalAttr gets the resident data, not the template state', () => {
  const { templateState } = stateWith([])
  document.body.innerHTML = '<div data-template-root><p id="user-content-p"></p></div>'
  executeActions(<ConditionalAttr element="#p" attribute="aria-expanded" value="true" when="1 === 1" />, templateState, { owner: {}, viewer: {} })
  expect(document.querySelector('p')!.getAttribute('aria-expanded')).toBe('true')
})

test('SetURLParam sets the address, written key="…" as in the docs (template audit 06 #4)', async () => {
  // React keeps `key` for itself; the registry hands it over as param
  const { compileTemplateToArtifacts } = await import('@/lib/templates/compilation/compile-pipeline')
  const { islands } = compileTemplateToArtifacts('<Button><OnClick><SetURLParam key="tab" value="guestbook" /></OnClick>Go</Button>')
  const all = islands.flatMap((island) => [island, ...(island.children ?? [])])
  const props = all.find((island) => island.component.toLowerCase() === 'seturlparam')!._precomputed!.componentProps
  expect(props.param).toBe('tab')

  const { default: SetURLParam } = await import('@/components/features/templates/state/actions/SetURLParam')
  const { templateState } = stateWith([])
  executeActions(React.createElement(SetURLParam, props as never), templateState, {})
  expect(new URL(window.location.href).searchParams.get('tab')).toBe('guestbook')
})

describe('Push (template audit 06 #10)', () => {
  const push = async (props: Record<string, unknown>) => {
    const { executePushAction } = await import('@/components/features/templates/state/actions/Push')
    const setVariable = jest.fn()
    const templateState = { variables: { notes: { value: [], type: 'array' } }, setVariable, getVariable: () => [] } as any
    jest.spyOn(console, 'error').mockImplementation(() => {})
    executePushAction({ var: 'notes', ...props } as never, templateState)
    return setVariable.mock.calls[0]?.[1]
  }

  test('a JSON object in expression= is pushed as an object', async () => {
    expect(await push({ expression: '{"text": "hi"}' })).toEqual([{ text: 'hi' }])
  })
  test('a calculation is worked out, even without $vars', async () => {
    expect(await push({ expression: '1 + 2' })).toEqual([3])
  })
  test('an object written out, with page variables in it, is pushed as an object', async () => {
    const { globalTemplateStateManager } = await import('@/lib/templates/state/TemplateStateManager')
    globalTemplateStateManager.registerVariable({ name: 'draft', type: 'string', initial: 'hello' })
    expect(await push({ expression: '{ text: $vars.draft }' })).toEqual([{ text: 'hello' }])
    globalTemplateStateManager.unregisterVariable('draft')
  })
  test("what can't be read adds nothing, rather than its own text", async () => {
    expect(await push({ expression: '{ text: ' })).toBeUndefined()
  })
  test('value= is pushed as written', async () => {
    expect(await push({ value: '{hello}' })).toEqual(['{hello}'])
  })
})
