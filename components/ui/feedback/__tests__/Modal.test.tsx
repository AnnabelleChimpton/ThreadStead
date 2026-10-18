import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-testid={`pixel-icon-${name}`} />,
}));

import Modal from '../Modal';

function Harness({ onClose = () => {}, children }: { onClose?: () => void; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open it</button>
      <Modal
        isOpen={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="Report this post"
      >
        {children ?? (
          <>
            <input aria-label="Reason" />
            <button>Send report</button>
          </>
        )}
      </Modal>
    </div>
  );
}

function openModal() {
  const opener = screen.getByRole('button', { name: 'Open it' });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe('Modal', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders nothing while closed', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a labelled modal dialog rendered into <body>', () => {
    const { container } = render(<Harness />);
    openModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Report this post');
    // Portalled: not inside the component's own container
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it('moves focus into the dialog on open, to the first control in the body', () => {
    render(<Harness />);
    openModal();
    expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveFocus();
  });

  it('focuses initialFocusRef when given', () => {
    function WithRef() {
      const ref = React.useRef<HTMLButtonElement>(null);
      return (
        <Modal isOpen onClose={() => {}} title="T" initialFocusRef={ref}>
          <input aria-label="First" />
          <button ref={ref}>Target</button>
        </Modal>
      );
    }
    render(<WithRef />);
    expect(screen.getByRole('button', { name: 'Target' })).toHaveFocus();
  });

  it('closes on Escape and gives focus back to the opener', () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);
    const opener = openModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes on the close button and on a backdrop click, not on a click inside', () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);
    openModal();
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = document.querySelector('.ts-modal-backdrop') as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);

    openModal();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps Tab inside the dialog (wraps both ways)', () => {
    render(<Harness />);
    openModal();
    const close = screen.getByRole('button', { name: 'Close' });
    const send = screen.getByRole('button', { name: 'Send report' });

    send.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus(); // last → first

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(send).toHaveFocus(); // first → last
  });

  it('pulls focus back in when it lands outside the dialog', () => {
    render(<Harness />);
    const opener = openModal();
    act(() => opener.focus());
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('locks page scroll while open and restores it after', () => {
    render(<Harness />);
    openModal();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
  });

  it('only the top dialog answers Escape when two are open', () => {
    const outerClose = jest.fn();
    const innerClose = jest.fn();
    render(
      <>
        <Modal isOpen onClose={outerClose} title="Outer"><button>a</button></Modal>
        <Modal isOpen onClose={innerClose} title="Inner"><button>b</button></Modal>
      </>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(innerClose).toHaveBeenCalledTimes(1);
    expect(outerClose).not.toHaveBeenCalled();
  });

  it("stops Escape from reaching the page's own Esc handlers", () => {
    const pageEsc = jest.fn();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') pageEsc(); };
    document.addEventListener('keydown', onKey);
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose} title="T"><button>a</button></Modal>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'a' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(pageEsc).not.toHaveBeenCalled();
    document.removeEventListener('keydown', onKey);
  });

  it('supports alertdialog, describedBy and a hidden title', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Image viewer" hideTitle role="alertdialog" describedBy="desc">
        <p id="desc">A photo</p>
      </Modal>
    );
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Image viewer');
    expect(dialog).toHaveAccessibleDescription('A photo');
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});
