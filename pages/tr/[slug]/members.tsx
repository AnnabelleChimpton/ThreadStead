// A ring's people: Manage › People for those who look after them, the ring
// street's list for everyone else (a ring that isn't public has no street,
// so its ring page). Read as the viewer, like the pages it sends them to.
import type { GetServerSideProps } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { raceHubCall, HUB_TIMEOUT } from "@/lib/api/ringhub/ringhub-ssr";
import { readRingAs } from "@/lib/domain/threadrings/ring-access";
import { manageRights } from "@/lib/rings/manage";

export default function RingMembersRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = String(context.params?.slug ?? "");
  const ringHref = `/tr/${encodeURIComponent(slug)}`;
  const viewer = await getSessionUser(context.req);
  const access = await raceHubCall(readRingAs(viewer, slug));
  if (access === HUB_TIMEOUT) return { redirect: { destination: ringHref, permanent: false } };
  if (!access) return { notFound: true };

  const destination =
    viewer && manageRights(access, viewer.role).tabs.includes("people")
      ? `${ringHref}/manage?tab=people`
      : access.ring.visibility === "PUBLIC"
        ? `/neighborhood/ring/${encodeURIComponent(slug)}#people`
        : ringHref;
  return { redirect: { destination, permanent: false } };
};
