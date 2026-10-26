/**
 * Following someone, coming from their own address (lib/act/actions.ts).
 * The result shows here: their address can't see who follows them (it never
 * sees a session), so their button there always just says Follow.
 */
import React, { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { ActShell, ConfirmButton, SignedInAs, SignedOut } from '@/components/features/act/ActShell';
import { loadActPage, type ActPageProps } from '@/lib/act/act-page';
import { finishUrl, navigate } from '@/lib/act/finish';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { db } from '@/lib/config/database/connection';

type Props = ActPageProps & { following: boolean };

export default function FollowPage(props: Props) {
  const { target, viewer, backUrl, canSee, popup } = props;
  const [following, setFollowing] = useState(props.following);
  const [justFollowed, setJustFollowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const title = `Follow ${target.name}`;
  const nextPath = `/act/follow/${encodeURIComponent(target.username)}${popup ? '?via=popup' : ''}`;

  const send = async (method: 'POST' | 'DELETE') => {
    setBusy(true);
    setProblem(null);
    try {
      const res = await csrfFetch(`/api/follow/${encodeURIComponent(target.username)}`, { method });
      if (res.status === 401) {
        navigate(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      if (!res.ok) {
        setProblem("That didn't go through. Try again in a moment.");
        return;
      }
      setFollowing(method === 'POST');
      setJustFollowed(method === 'POST');
    } catch {
      setProblem("That didn't go through. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  // In a pop-up, Close goes through act-done.html, which tells their page and closes
  const back = popup
    ? <a href={finishUrl(props, 'follow')} className="thread-button">Close</a>
    : <a href={backUrl} className="thread-button">Back to {target.name}&apos;s page</a>;

  if (!viewer) {
    return <ActShell title={title} target={target}><SignedOut what={`follow ${target.name}`} nextPath={nextPath} /></ActShell>;
  }
  if (viewer.id === target.id) {
    return <ActShell title={title} target={target}><p className="m-0">This is you.</p><p className="m-0">{back}</p></ActShell>;
  }
  if (!canSee) {
    return <ActShell title={title} target={target}><p className="m-0">You can&apos;t follow {target.name}.</p><p className="m-0">{back}</p></ActShell>;
  }
  return (
    <ActShell title={title} target={target}>
      <SignedInAs verb="Following" viewer={viewer} />
      {justFollowed ? (
        <p className="m-0" role="status">You follow {target.name} now.</p>
      ) : following ? (
        <p className="m-0">
          You already follow {target.name}.{' '}
          <button type="button" className="ts-bare underline text-sm" disabled={busy} onClick={() => void send('DELETE')}>Unfollow</button>
        </p>
      ) : (
        <>
          <p className="m-0">Their posts will show up in your feed.</p>
          <ConfirmButton onConfirm={() => void send('POST')} busy={busy}>{busy ? 'Following…' : 'Follow'}</ConfirmButton>
        </>
      )}
      {problem && <p className="m-0 text-thread-sunset" role="alert">{problem}</p>}
      <p className="m-0">{back}</p>
    </ActShell>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const loaded = await loadActPage(context);
  if ('notFound' in loaded) return loaded;
  const { viewer, target } = loaded.props;
  const follow = viewer && viewer.id !== target.id
    ? await db.follow.findUnique({ where: { followerId_followeeId: { followerId: viewer.id, followeeId: target.id } }, select: { status: true } })
    : null;
  return { props: { ...loaded.props, following: follow?.status === 'accepted' } };
};
