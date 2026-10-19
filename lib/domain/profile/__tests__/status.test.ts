import { STATUS_MAX, cleanStatus } from '@/lib/domain/profile/status'

test('a status is one trimmed line, capped', () => {
  expect(cleanStatus('  knitting\n a scarf  ')).toBe('knitting a scarf')
  expect(cleanStatus('x'.repeat(STATUS_MAX + 20))).toHaveLength(STATUS_MAX)
})

test('empty clears it, and a missing field leaves it alone', () => {
  expect(cleanStatus('   ')).toBeNull()
  expect(cleanStatus('')).toBeNull()
  expect(cleanStatus(undefined)).toBeUndefined()
  expect(cleanStatus(42)).toBeNull()
})
