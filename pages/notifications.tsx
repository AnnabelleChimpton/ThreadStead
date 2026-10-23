import React from "react";
import Layout from "../components/ui/layout/Layout";
import NotificationList from "../components/ui/feedback/NotificationList";
import ErrorDisplay from "../components/ui/feedback/ErrorDisplay";
import { getSessionUser } from "@/lib/auth/server";
import type { GetServerSideProps, NextApiRequest } from "next";
import PageMeta from "@/components/ui/layout/PageMeta";

interface NotificationsPageProps {
  user?: {
    id: string;
    handle: string;
    displayName?: string;
  } | null;
}

export default function NotificationsPage({ user }: NotificationsPageProps) {
  if (!user) {
    return (
      <Layout>
        <PageMeta title="Notifications" noIndex />
        <div className="max-w-2xl mx-auto">
          <ErrorDisplay
            variant="notice"
            icon="lock"
            title="Access Denied"
            message="You need to be logged in to view notifications."
            actionLabel="Log In"
            actionHref="/login"
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageMeta title="Notifications" noIndex />
      <div className="max-w-4xl mx-auto">
        <div className="thread-module p-4 sm:p-6">
          {/* NotificationList updates its own state optimistically on
              mark-as-read; remounting via a key caused a full refetch and
              scroll reset on every update. */}
          <NotificationList
            limit={50}
            showStatus={true}
          />
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const user = await getSessionUser(context.req as NextApiRequest);
    
    if (!user) {
      return {
        props: {
          user: null,
        },
      };
    }

    // Get the user's primary handle
    const handle = user.primaryHandle || user.id;

    return {
      props: {
        user: {
          id: user.id,
          handle,
          displayName: null, // We don't need this for the notifications page
        },
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    return {
      props: {
        user: null,
      },
    };
  }
};