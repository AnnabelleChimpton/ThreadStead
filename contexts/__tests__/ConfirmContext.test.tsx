import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-testid={`pixel-icon-${name}`} />,
}));

import { ConfirmProvider, useConfirm, type ConfirmOptions } from '../ConfirmContext';

function Asker({ options }: { options: ConfirmOptions | string }) {
  const confirm = useConfirm();
  const [answer, setAnswer] = useState('none');
  return (
    <>
      <button onClick={async () => setAnswer(String(await confirm(options)))}>Ask</button>
      <output>{answer}</output>
    </>
  );
}

const deleteOpts: ConfirmOptions = {
  title: 'Delete this post?',
  message: "This can't be undone.",
  confirmText: 'Delete',
  variant: 'danger',
};

function setup(options: ConfirmOptions | string = deleteOpts) {
  render(
    <ConfirmProvider>
      <Asker options={options} />
    </ConfirmProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
  return screen.getByRole('alertdialog');
}

describe('useConfirm', () => {
  it('shows the question as a labelled, described alertdialog', () => {
    const dialog = setup();
    expect(dialog).toHaveAccessibleName('Delete this post?');
    expect(dialog).toHaveAccessibleDescription("This can't be undone.");
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('resolves true on confirm', async () => {
    const dialog = setup();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('true'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('resolves false on Cancel', async () => {
    const dialog = setup();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cancel' })[0]);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('false'));
  });

  it('resolves false on Escape', async () => {
    setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('false'));
  });

  it('lands on Cancel for a destructive question, on the confirm button otherwise', () => {
    const dialog = setup();
    expect(within(dialog).getAllByRole('button', { name: 'Cancel' }).at(-1)).toHaveFocus();
  });

  it('focuses the confirm button for a neutral question, and accepts a plain string', () => {
    const dialog = setup('Load this theme?');
    expect(dialog).toHaveAccessibleName('Load this theme?');
    expect(within(dialog).getByRole('button', { name: 'OK' })).toHaveFocus();
  });

  it('asks queued questions one at a time, in order', async () => {
    function TwoAsks() {
      const confirm = useConfirm();
      const [log, setLog] = useState<string[]>([]);
      return (
        <>
          <button
            onClick={() => {
              confirm({ title: 'First?' }).then((v) => setLog((l) => [...l, `first:${v}`]));
              confirm({ title: 'Second?' }).then((v) => setLog((l) => [...l, `second:${v}`]));
            }}
          >
            Ask twice
          </button>
          <output>{log.join(',')}</output>
        </>
      );
    }
    render(
      <ConfirmProvider>
        <TwoAsks />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ask twice' }));
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('First?');
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Second?'));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('first:true,second:false'));
  });

  it('falls back to window.confirm when no provider is mounted', async () => {
    const spy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Asker options={deleteOpts} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('true'));
    expect(spy).toHaveBeenCalledWith("Delete this post?\n\nThis can't be undone.");
    spy.mockRestore();
  });
});
