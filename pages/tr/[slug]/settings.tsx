// A ring's settings are Manage › Ring now (pages/tr/[slug]/manage.tsx).
import type { GetServerSideProps } from "next";

export default function RingSettingsRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = encodeURIComponent(String(params?.slug ?? ""));
  return { redirect: { destination: `/tr/${slug}/manage?tab=ring`, permanent: false } };
};
