import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FirstStepsChecklist, { FIRST_STEPS_HIDDEN_COOKIE } from '../FirstStepsChecklist';

jest.mock('next/link', () => {
  return function MockLink({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) {
    return <a href={href} className={className}>{children}</a>;
  };
});
jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-icon={name} />,
}));
jest.mock('@/components/widgets', () => ({ widgetFrameClassName: 'widget-container' }));

const none = { house: false, yard: false, page: false, post: false, guestbook: false };
const allLocal = { house: true, yard: true, page: true, post: true, guestbook: true };

function mockRings(rings: unknown[] | null) {
  global.fetch = jest.fn().mockResolvedValue(
    rings ? { ok: true, json: async () => ({ rings }) } : { ok: false, status: 503, json: async () => ({}) }
  ) as any;
}

// Render and let the membership fetch settle
async function renderList(ui: React.ReactElement) {
  const result = render(ui);
  await act(async () => {});
  return result;
}

afterEach(() => {
  document.cookie = `${FIRST_STEPS_HIDDEN_COOKIE}=; max-age=0; path=/`;
});

describe('FirstStepsChecklist', () => {
  it('links every unfinished step', async () => {
    mockRings([]);
    await renderList(<FirstStepsChecklist username="newbie" steps={none} />);
    expect(global.fetch).toHaveBeenCalledWith('/api/threadrings/my-memberships');

    expect(screen.getByText('0 of 6')).toBeInTheDocument();
    expect(screen.getByText('Pick your house').closest('a')).toHaveAttribute('href', '/home/newbie/decorate');
    expect(screen.getByText('Decorate your yard').closest('a')).toHaveAttribute('href', '/home/newbie/decorate');
    expect(screen.getByText('Make your page yours').closest('a')).toHaveAttribute('href', '/settings?tab=appearance');
    expect(screen.getByText('Write a first post').closest('a')).toHaveAttribute('href', '/post/new');
    expect(screen.getByText("Sign a neighbor's guestbook").closest('a')).toHaveAttribute('href', '/neighborhood');
    expect(screen.getByText('Join a ring').closest('a')).toHaveAttribute('href', '/threadrings');
    expect(screen.queryByText('Hide this list')).not.toBeInTheDocument();
  });

  it('ticks done steps and stops linking them', async () => {
    mockRings([]);
    await renderList(<FirstStepsChecklist username="newbie" steps={{ ...none, house: true, page: true, post: true }} />);
    expect(screen.getByText('3 of 6')).toBeInTheDocument();
    expect(screen.getByText('Pick your house').closest('a')).toBeNull();
    expect(screen.getByText('Make your page yours').closest('a')).toBeNull();
    expect(screen.getAllByText('(done)')).toHaveLength(3);
  });

  it('ticks the ring step from Ring Hub memberships', async () => {
    mockRings([{ slug: 'local-test' }]);
    await renderList(<FirstStepsChecklist username="newbie" steps={allLocal} />);
    expect(screen.getByText('6 of 6')).toBeInTheDocument();
  });

  it("can't be hidden while the hub can't confirm a ring", async () => {
    mockRings(null);
    await renderList(<FirstStepsChecklist username="newbie" steps={allLocal} />);
    expect(screen.getByText('5 of 6')).toBeInTheDocument();
    expect(screen.queryByText('Hide this list')).not.toBeInTheDocument();
  });

  it('hides once everything is done, and remembers it for the server', async () => {
    mockRings([{ slug: 'local-test' }]);
    const { container } = await renderList(<FirstStepsChecklist username="newbie" steps={allLocal} />);
    fireEvent.click(screen.getByText('Hide this list'));
    expect(container).toBeEmptyDOMElement();
    expect(document.cookie).toContain(`${FIRST_STEPS_HIDDEN_COOKIE}=newbie`);
  });

  it('shows the founder’s note when given', async () => {
    mockRings([]);
    await renderList(<FirstStepsChecklist username="newbie" steps={none} foundersNote="Glad you're here." />);
    expect(screen.getByText("Glad you're here.")).toBeInTheDocument();
  });
});
