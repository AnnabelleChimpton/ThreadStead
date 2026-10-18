import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-testid={`pixel-icon-${name}`} />,
}));

import { ToastProvider, useToast, getGlobalToast } from '../ToastContext';

function Buttons() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.showSuccess('Saved.')}>ok</button>
      <button onClick={() => toast.showError("Couldn't save.")}>fail</button>
    </>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('announces toasts in a polite live region', () => {
    render(<ToastProvider><Buttons /></ToastProvider>);
    fireEvent.click(screen.getByText('ok'));
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('Saved.');
  });

  it('dismisses on its own after a while, and on the Dismiss button', () => {
    render(<ToastProvider><Buttons /></ToastProvider>);
    fireEvent.click(screen.getByText('ok'));
    act(() => jest.advanceTimersByTime(5100));
    expect(screen.queryByText('Saved.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('fail'));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText("Couldn't save.")).not.toBeInTheDocument();
  });

  it('shows the same message once even if fired twice', () => {
    render(<ToastProvider><Buttons /></ToastProvider>);
    fireEvent.click(screen.getByText('fail'));
    fireEvent.click(screen.getByText('fail'));
    expect(screen.getAllByText("Couldn't save.")).toHaveLength(1);
  });

  it('a nested provider reuses the outer one, and getGlobalToast reaches it', () => {
    render(
      <ToastProvider>
        <ToastProvider>
          <Buttons />
        </ToastProvider>
      </ToastProvider>
    );
    expect(screen.getAllByRole('status')).toHaveLength(1);
    act(() => getGlobalToast()?.showInfo('Link copied'));
    expect(screen.getByRole('status')).toHaveTextContent('Link copied');
  });
});
