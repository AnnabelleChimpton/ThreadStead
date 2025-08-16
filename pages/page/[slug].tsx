import React from "react";
import { GetServerSideProps } from "next";
import Layout from "@/components/Layout";
import RetroCard from "@/components/RetroCard";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type Props = {
  page: {
    id: string;
    slug: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  error?: string;
};

export default function CustomPage({ page, error }: Props) {
  if (error) {
    return (
      <Layout>
        <RetroCard title="Page Not Found">
          <p>The page you&apos;re looking for doesn&apos;t exist or isn&apos;t published.</p>
        </RetroCard>
      </Layout>
    );
  }

  if (!page) {
    return (
      <Layout>
        <RetroCard title="Page Not Found">
          <p>The page you&apos;re looking for doesn&apos;t exist.</p>
        </RetroCard>
      </Layout>
    );
  }

  return (
    <Layout>
      <RetroCard title={page.title}>
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
        <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
          Last updated: {new Date(page.updatedAt).toLocaleDateString()}
        </div>
      </RetroCard>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params!;

  if (typeof slug !== "string") {
    return {
      props: {
        page: null,
        error: "Invalid page slug"
      }
    };
  }

  try {
    const page = await db.customPage.findFirst({
      where: { 
        slug,
        published: true 
      },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!page) {
      return {
        props: {
          page: null,
          error: "Page not found"
        }
      };
    }

    return {
      props: {
        page: {
          ...page,
          createdAt: page.createdAt.toISOString(),
          updatedAt: page.updatedAt.toISOString(),
        }
      }
    };
  } catch (error) {
    console.error("Error fetching custom page:", error);
    return {
      props: {
        page: null,
        error: "Failed to load page"
      }
    };
  }
};