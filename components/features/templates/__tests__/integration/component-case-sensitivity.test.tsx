/**
 * Test to verify case-insensitive component resolution works correctly.
 *
 * The HTML parser lowercases tag names (e.g. <ProfileHero> becomes
 * "profilehero"), so the template renderer and component registry must
 * resolve component tags case-insensitively.
 *
 * NOTE: The unified/rehype parsing pipeline itself is stubbed out globally in
 * jest.setup.js (the real packages are ESM-only), so this suite exercises the
 * post-parse pipeline: TemplateNode AST -> transformNodeToReact -> React DOM.
 */

// The component registry transitively imports the DID client, whose
// @noble/ed25519 dependency is ESM-only and cannot be parsed by jest.
jest.mock('@/lib/api/did/did-client', () => ({}));

import React from 'react';
import { render } from '@testing-library/react';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { transformNodeToReact } from '@/lib/templates/rendering/template-renderer';
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';
import { ResidentDataProvider } from '../../ResidentDataProvider';
import { createMockResidentData } from '../test-utils';

function renderAst(ast: TemplateNode) {
  const residentData = createMockResidentData();
  return render(
    <ResidentDataProvider data={residentData}>
      {transformNodeToReact(ast)}
    </ResidentDataProvider>
  );
}

const el = (
  tagName: string,
  properties: Record<string, unknown> = {},
  children: TemplateNode[] = []
): TemplateNode => ({ type: 'element', tagName, properties, children });

describe('Component Case Sensitivity Test', () => {
  test('registry resolves PascalCase components from lowercased tag names', () => {
    // What the HTML parser actually emits for <ProfileHero>, <SkillChart>, etc.
    expect(componentRegistry.get('profilehero')?.name).toBe('ProfileHero');
    expect(componentRegistry.get('centeredbox')?.name).toBe('CenteredBox');
    expect(componentRegistry.get('skillchart')?.name).toBe('SkillChart');
    expect(componentRegistry.get('skill')?.name).toBe('Skill');
    expect(componentRegistry.get('gridlayout')?.name).toBe('GridLayout');
  });

  test('should render components from lowercase tag names (as produced by the HTML parser)', () => {
    const ast: TemplateNode = {
      type: 'root',
      children: [
        el('gridlayout', { columns: '2' }, [
          el('displayname'),
          el('gradientbox', { gradient: 'ocean' }, [el('bio')])
        ])
      ]
    };

    const { container, getByText } = renderAst(ast);

    // GridLayout resolved from "gridlayout"
    expect(container.querySelector('.grid')).toBeInTheDocument();

    // DisplayName resolved from "displayname" and rendered with resident data
    expect(getByText('Test User')).toBeInTheDocument();

    // GradientBox resolved from "gradientbox" with its gradient prop applied
    expect(container.querySelector('.bg-gradient-to-br.from-blue-400')).toBeInTheDocument();
  });

  test('should render components from exact PascalCase tag names too', () => {
    const ast: TemplateNode = {
      type: 'root',
      children: [
        el('GridLayout', { columns: '2' }, [el('DisplayName')])
      ]
    };

    const { container, getByText } = renderAst(ast);

    expect(container.querySelector('.grid')).toBeInTheDocument();
    expect(getByText('Test User')).toBeInTheDocument();
  });

  test('should handle deeply nested lowercase components', () => {
    const ast: TemplateNode = {
      type: 'root',
      children: [
        el('centeredbox', {}, [
          el('flexcontainer', { direction: 'column' }, [
            el('gradientbox', { gradient: 'sunset' }, [
              el('displayname'),
              el('bio')
            ])
          ])
        ])
      ]
    };

    const { container, getByText } = renderAst(ast);

    expect(container.querySelector('.mx-auto')).toBeInTheDocument(); // CenteredBox
    expect(container.querySelector('.flex.flex-col')).toBeInTheDocument(); // FlexContainer
    expect(container.querySelector('.bg-gradient-to-br.from-orange-400')).toBeInTheDocument(); // GradientBox
    expect(getByText('Test User')).toBeInTheDocument(); // DisplayName leaf
  });

  test('should ignore unknown components without crashing', () => {
    const ast: TemplateNode = {
      type: 'root',
      children: [
        el('notarealcomponent', {}, [
          { type: 'text', value: 'hidden content' }
        ]),
        el('displayname')
      ]
    };

    const { queryByText, getByText } = renderAst(ast);

    // Unknown tags render nothing (not their children, not an error)
    expect(queryByText('hidden content')).not.toBeInTheDocument();

    // Siblings still render
    expect(getByText('Test User')).toBeInTheDocument();
  });
});
