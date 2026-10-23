// Every stop in a ring is the ring street's people list now, and the host's
// say on members' own sites is Manage › Stops.
import type { GetServerSideProps } from "next";

export default function RingSitesRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = encodeURIComponent(String(params?.slug ?? ""));
  return { redirect: { destination: `/neighborhood/ring/${slug}#people`, permanent: false } };
};
