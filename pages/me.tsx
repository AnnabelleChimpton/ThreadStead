// pages/me.tsx
import type { GetServerSideProps } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth-server";

const db = new PrismaClient();

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const user = await getSessionUser(req as any);
  if (!user) {
    return { redirect: { destination: "/", permanent: false } };
  }

  if (user.primaryHandle) {
    const username = user.primaryHandle.split("@")[0];
    return { redirect: { destination: `/${username}`, permanent: false } };
  }

  // No handle yet → onboarding
  return { redirect: { destination: "/onboarding", permanent: false } };
};

export default function MeRedirect() {
  return null;
}
