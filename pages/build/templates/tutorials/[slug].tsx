import React from "react";
import { GetServerSideProps } from "next";
import Layout from "@/components/ui/layout/Layout";
import TutorialLayout from "@/components/templates-docs/TutorialLayout";
import TutorialStep from "@/components/templates-docs/TutorialStep";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { Tutorial, getTutorialBySlug } from "@/lib/templates-docs/tutorialContent";

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

// Rendered per request, like the other Build pages: the site name and theme
// come from the database, and a page built ahead of time kept whatever they
// were at deploy (or nothing, when the build couldn't reach the database).
export const getServerSideProps: GetServerSideProps<TutorialPageProps> = async ({ params }) => {
  const tutorial = getTutorialBySlug(String(params?.slug ?? ''));
  if (!tutorial) return { notFound: true };
  const siteConfig = await getSiteConfig();
  return { props: { tutorial, siteConfig } };
};
