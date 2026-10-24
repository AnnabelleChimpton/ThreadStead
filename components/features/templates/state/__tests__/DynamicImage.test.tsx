/**
 * DynamicImage shows a picture's address only: a variable a link can set
 * (?var=…) could otherwise put anything in src (template audit 04 L1).
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import DynamicImage from '../DynamicImage'
import { GlobalTemplateStateProvider } from '@/lib/templates/state/TemplateStateProvider'

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => <span /> }))

function showing(initial: string) {
  render(
    <GlobalTemplateStateProvider declared={[{ name: 'pic', type: 'string', initial }]} page="p">
      <DynamicImage var="pic" alt="my picture" />
    </GlobalTemplateStateProvider>
  )
}

test.each(['https://img.example/a.png', '/uploads/a.png', 'data:image/png;base64,AAAA'])('%s shows', (url) => {
  showing(url)
  expect(screen.getByAltText('my picture')).toHaveAttribute('src', url)
})

test.each(['ftp://files.example/a.png', '//elsewhere.example/a.png', 'data:text/plain,hi'])("%s doesn't", (url) => {
  showing(url)
  expect(screen.queryByAltText('my picture')).toBeNull()
  expect(screen.getByText('No image')).toBeInTheDocument()
})
