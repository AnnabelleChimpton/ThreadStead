import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }));
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));

import SiteCSSSection, { EMPTY_SAVE_PROMPT } from '../SiteCSSSection';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

const mockCsrfFetch = csrfFetch as jest.Mock;

function jsonResponse(body: any, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

function mockLoad(body: { css: string; isDefault: boolean }) {
  global.fetch = jest.fn().mockResolvedValue(jsonResponse(body));
}

async function renderLoaded(body: { css: string; isDefault: boolean }) {
  mockLoad(body);
  const onApplied = jest.fn();
  render(<SiteCSSSection onApplied={onApplied} />);
  await screen.findByRole('textbox');
  return { onApplied };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('theme status', () => {
  test('shows the default theme and disables the reset button', async () => {
    await renderLoaded({ css: '/* bundled */', isDefault: true });
    expect(screen.getByTestId('site-theme-status')).toHaveTextContent('Default theme');
    expect(screen.getByRole('button', { name: /Use the default theme/ })).toBeDisabled();
  });

  test('shows custom CSS', async () => {
    await renderLoaded({ css: 'body{color:red}', isDefault: false });
    expect(screen.getByTestId('site-theme-status')).toHaveTextContent('Custom CSS');
    expect(screen.getByRole('button', { name: /Use the default theme/ })).toBeEnabled();
  });

  test('shows off for a saved empty value', async () => {
    await renderLoaded({ css: '', isDefault: false });
    expect(screen.getByTestId('site-theme-status')).toHaveTextContent('Off');
  });
});

describe('saving an empty box', () => {
  test('asks first and sends nothing', async () => {
    await renderLoaded({ css: 'body{color:red}', isDefault: false });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save CSS' }));

    expect(screen.getByRole('alertdialog')).toHaveTextContent(EMPTY_SAVE_PROMPT);
    expect(mockCsrfFetch).not.toHaveBeenCalled();
  });

  test('"Use the default theme" deletes the saved row', async () => {
    const { onApplied } = await renderLoaded({ css: 'body{color:red}', isDefault: false });
    mockCsrfFetch.mockResolvedValue(jsonResponse({ success: true, css: '/* bundled */', isDefault: true }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save CSS' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Use the default theme' }));

    await waitFor(() => expect(screen.getByTestId('site-theme-status')).toHaveTextContent('Default theme'));
    expect(mockCsrfFetch).toHaveBeenCalledWith('/api/admin/site-css', { method: 'DELETE' });
    await waitFor(() => expect(onApplied).toHaveBeenCalled());
  });

  test('"Turn the theme off" saves the empty value', async () => {
    await renderLoaded({ css: 'body{color:red}', isDefault: false });
    mockCsrfFetch.mockResolvedValue(jsonResponse({ success: true, css: '', isDefault: false }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save CSS' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Turn the theme off' }));

    await waitFor(() => expect(screen.getByTestId('site-theme-status')).toHaveTextContent('Off'));
    const [url, init] = mockCsrfFetch.mock.calls[0];
    expect(url).toBe('/api/admin/site-css');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ css: '' });
  });

  test('Cancel closes the prompt without saving', async () => {
    await renderLoaded({ css: 'body{color:red}', isDefault: false });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save CSS' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockCsrfFetch).not.toHaveBeenCalled();
  });

  test('the Empty template also asks first', async () => {
    await renderLoaded({ css: 'body{color:red}', isDefault: false });
    fireEvent.click(screen.getByRole('button', { name: /Templates/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Empty/ }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(mockCsrfFetch).not.toHaveBeenCalled();
  });
});

test('non-empty CSS saves without asking', async () => {
  await renderLoaded({ css: '/* bundled */', isDefault: true });
  mockCsrfFetch.mockResolvedValue(jsonResponse({ success: true, css: 'body{}', isDefault: false }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'body{}' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save CSS' }));

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByTestId('site-theme-status')).toHaveTextContent('Custom CSS'));
  expect(mockCsrfFetch.mock.calls[0][1].method).toBe('PUT');
});

test('switching from custom CSS to the default asks to confirm', async () => {
  await renderLoaded({ css: 'body{color:red}', isDefault: false });
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(screen.getByRole('button', { name: /Use the default theme/ }));
  expect(confirmSpy).toHaveBeenCalled();
  expect(mockCsrfFetch).not.toHaveBeenCalled();
  confirmSpy.mockRestore();
});
