/**
 * The palette's preview: the example compiled by the editor's compile route
 * and rendered with your own page's data, as its owner sees it.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor';
import { createMockResidentData } from './test-utils';

jest.mock('@noble/ed25519', () => ({ getPublicKey: jest.fn(), getPublicKeyAsync: jest.fn(), sign: jest.fn(), verify: jest.fn(), utils: {}, etc: {} }));
jest.mock('next/dynamic', () => require('@/tests/template-engine/sync-dynamic').syncDynamic);
jest.mock('@/lib/api/client/csrf-fetch', () => ({
  csrfFetch: jest.fn(async (_url: string, init: { body: string }) => {
    const result = await compileForEditor(JSON.parse(init.body).template);
    return { ok: result.ok, json: async () => (result.ok ? { success: true, artifact: result.artifact } : result.body) };
  }),
}));

import ComponentPreview from '../ComponentPreview';

test('runs the example with your own data', async () => {
  const residentData = createMockResidentData({ capabilities: { bio: 'I collect old radios.' } });
  render(<ComponentPreview example='<p>Hello from <Bio /></p>' residentData={residentData} />);
  expect(await screen.findByText('I collect old radios.')).toBeInTheDocument();
  expect(screen.getByText(/Hello from/)).toBeInTheDocument();
});
