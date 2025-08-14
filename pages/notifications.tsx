import React, { useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import NotificationList from "../components/NotificationList";
import { getSessionUser } from "@/lib/auth-server";
import type { GetServerSideProps, NextApiRequest } from "next";

interface NotificationsPageProps {
  user?: {
    id: string;
    handle: string;
    displayName?: string;
  } | null;
}

export default function NotificationsPage({ user }: NotificationsPageProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNotificationUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!user) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-thread-paper border border-thread-sage/30 p-8 rounded-cozy shadow-cozySm text-center">
            <h1 className="text-2xl font-bold text-thread-pine mb-4">Access Denied</h1>
            <p className="text-thread-sage mb-6">You need to be logged in to view notifications.</p>
            <Link
              href="/auth/login"
              className="inline-block px-6 py-2 bg-thread-sunset text-white border border-black shadow-[2px_2px_0_#000] hover:shadow-[1px_1px_0_#000] transition-all"
            >
              Log In
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-thread-paper border border-thread-sage/30 p-6 rounded-cozy shadow-cozySm">
          <NotificationList 
            key={refreshKey}
            limit={50}
            showStatus={true}
            onNotificationUpdate={handleNotificationUpdate}
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