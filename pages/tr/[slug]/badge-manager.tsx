// A ring's badge is Manage › Badge now (pages/tr/[slug]/manage.tsx).
import type { GetServerSideProps } from "next";

export default function RingBadgeRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = encodeURIComponent(String(params?.slug ?? ""));
  return { redirect: { destination: `/tr/${slug}/manage?tab=badge`, permanent: false } };
};
