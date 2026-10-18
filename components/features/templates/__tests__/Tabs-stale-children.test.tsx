import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Tabs, { Tab } from '../Tabs';

// The tabs memo was keyed on the child COUNT, so a re-render with the same
// number of tabs kept the old titles and content: navigating client-side
// between two residents on the same template showed the first resident's tab
// content, and the template editor preview didn't update on edits.
describe('Tabs re-render with the same number of tabs', () => {
  it('shows new titles and content', () => {
    const { rerender } = render(
      <Tabs>
        <Tab title="Blog">{"alice's posts"}</Tab>
        <Tab title="Guestbook">{"alice's guestbook"}</Tab>
      </Tabs>
    );
    expect(screen.getByText("alice's posts")).toBeInTheDocument();

    rerender(
      <Tabs>
        <Tab title="Writing">{"bob's posts"}</Tab>
        <Tab title="Guestbook">{"bob's guestbook"}</Tab>
      </Tabs>
    );
    expect(screen.getByRole('tab', { name: 'Writing' })).toBeInTheDocument();
    expect(screen.getByText("bob's posts")).toBeInTheDocument();
    expect(screen.queryByText("alice's posts")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Guestbook' }));
    expect(screen.getByText("bob's guestbook")).toBeInTheDocument();
  });
});
