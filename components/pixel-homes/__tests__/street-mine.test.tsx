/**
 * A newcomer finds their own house on the street: its sign says so
 * (signup audit #8). Nobody else's does.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import Street from '../Street'
import type { StreetHome } from '@/lib/pixel-homes/street'

jest.mock('../HouseSVG', () => () => null)

const home = (username: string, number: number) =>
  ({ userId: `u-${username}`, username, displayName: null, number, snapshotCardUrl: '/card.png', houseTemplate: 'cottage_v1', palette: 'thread_sage', houseCustomizations: {} }) as unknown as StreetHome

test("the viewer's lot says you live here, and only theirs", () => {
  render(<Street homes={[home('moss', 1), home('newbie', 2)]} mine="newbie" />)
  expect(screen.getByRole('link', { name: "2, newbie's house, where you live" })).toHaveTextContent('you live here')
  expect(screen.getByRole('link', { name: "1, moss's house" })).not.toHaveTextContent('you live here')
})

test('signed out, no lot is anyone\'s', () => {
  render(<Street homes={[home('moss', 1)]} />)
  expect(screen.queryByText(/you live here/)).toBeNull()
})
