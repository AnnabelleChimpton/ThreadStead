import React from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import Layout from "@/components/ui/layout/Layout";
import TutorialLayout from "@/components/templates-docs/TutorialLayout";
import TutorialStep from "@/components/templates-docs/TutorialStep";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import {
  Tutorial,
  getTutorialBySlug,
  getAllTutorialSlugs,
} from "@/lib/templates-docs/tutorialContent";

interface TutorialPageProps {
  tutorial: Tutorial;
  siteConfig: SiteConfig;
}

export default function TutorialPage({ tutorial, siteConfig }: TutorialPageProps) {
  return (
    <Layout siteConfig={siteConfig} fullWidth={true}>
      <TutorialLayout currentTutorial={tutorial}>
        {tutorial.steps.map((step, index) => (
          <TutorialStep key={step.id} step={step} stepNumber={index + 1} />
        ))}
      </TutorialLayout>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllTutorialSlugs();

  return {
    paths: slugs.map((slug) => ({
      params: { slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<TutorialPageProps> = async ({ params }) => {
  const slug = params?.slug as string;
  const tutorial = getTutorialBySlug(slug);

  if (!tutorial) {
    return {
      notFound: true,
    };
  }

  const siteConfig = await getSiteConfig();

  return {
    props: {
      tutorial,
      siteConfig,
    },
  };
};
