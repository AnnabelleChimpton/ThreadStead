// pages/me.tsx
import type { GetServerSideProps, NextApiRequest } from "next";
import { getSessionUser } from "@/lib/auth-server";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const user = await getSessionUser(req as NextApiRequest);
  if (!user) {
    return { redirect: { destination: "/", permanent: false } };
  }

  if (user.primaryHandle) {
    const username = user.primaryHandle.split("@")[0];
    return { redirect: { destination: `/resident/${username}`, permanent: false } };
  }

  // No handle yet → onboarding
  return { redirect: { destination: "/onboarding", permanent: false } };
};

export default function MeRedirect() {
  return null;
}
