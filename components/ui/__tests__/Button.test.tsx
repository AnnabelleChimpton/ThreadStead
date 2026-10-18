import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import Button from '../Button';
import { buttonClasses } from '../ButtonLink';

describe('Button', () => {
  it('is a plain button by default, so it never submits a form by accident', () => {
    const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Save</Button>
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits when asked to', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
  });

  it('uses the site theme hooks for each variant', () => {
    render(
      <>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Delete</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveClass('btn', 'btn--primary');
    expect(screen.getByRole('button', { name: 'Primary' })).not.toHaveClass('ts-btn-danger');
    expect(screen.getByRole('button', { name: 'Secondary' })).toHaveClass('btn', 'btn--secondary');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('btn', 'btn--primary', 'ts-btn-danger');
  });

  it('sizes: sm shrinks the text, lg adds the theme hook', () => {
    render(
      <>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('text-sm');
    expect(screen.getByRole('button', { name: 'Large' })).toHaveClass('btn--lg', 'text-lg');
  });

  it('leaves display to the caller and keeps their classes', () => {
    render(<Button className="w-full flex items-center">Wide</Button>);
    const button = screen.getByRole('button', { name: 'Wide' });
    expect(button).toHaveClass('btn', 'w-full', 'flex');
    expect(button).not.toHaveClass('inline-block');
  });

  it('forwards ref and other props', () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = jest.fn();
    render(<Button ref={ref} disabled onClick={onClick} aria-label="Join">Join</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBeDisabled();
    fireEvent.click(ref.current!);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('buttonClasses', () => {
  it('keeps inline-block for links', () => {
    expect(buttonClasses('primary').split(' ')).toContain('inline-block');
    expect(buttonClasses('primary', 'md', { inline: false }).split(' ')).not.toContain('inline-block');
  });
});
