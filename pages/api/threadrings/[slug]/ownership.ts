import { apiHandler, ApiError } from '@/lib/api/handler';
import { readRingAs } from '@/lib/domain/threadrings/ring-access';

/**
 * Is the viewer this ring's Host? Ring Hub says (Ring.ownerDid), read signed
 * as them so a private ring's Host gets an answer; the local owner row can
 * lag a hand-over. `isCurator` stays for older callers and is always false:
 * a local ring's curator no longer exists with Ring Hub on.
 */
export default apiHandler({ methods: ['GET'], auth: 'user' }, async (req, res, { user }) => {
  const slug = req.query.slug;
  if (typeof slug !== 'string') throw new ApiError(400, 'Invalid slug parameter');

  let access;
  try {
    access = await readRingAs(user, slug);
  } catch (error) {
    console.error(`Couldn't read ${slug} for its owner check:`, error);
    throw new ApiError(503, "We can't reach Ring Hub right now. Try again in a minute.", { degraded: true });
  }
  if (!access) throw new ApiError(404, 'Ring not found');

  res.json({
    isOwner: access.isHost,
    isCurator: false,
    isSteward: access.isSteward,
    ownershipSource: access.isHost ? 'ringhub_owner_did' : null,
    userInfo: { id: user.id, did: access.viewerDid },
  });
});
