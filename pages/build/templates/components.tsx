import React, { useMemo, useState } from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Layout from "@/components/ui/layout/Layout";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import {
  COMPONENT_GROUPS,
  buildComponentDocs,
  type ComponentDoc,
  type ComponentPropDoc,
} from "@/lib/templates-docs/component-docs";
// Used only in getServerSideProps, so they stay out of the page's JS
import { componentRegistry } from "@/lib/templates/core/template-registry";
import { getCachedTutorialsForComponent } from "@/lib/templates-docs/componentTutorialMap";

interface TutorialLink {
  slug: string;
  title: string;
}

interface ComponentsPageProps {
  siteConfig: SiteConfig;
  /** Every registered component, in reference order (from the registry) */
  components: ComponentDoc[];
  /** Component id → the tutorials that use it */
  tutorials: Record<string, TutorialLink[]>;
}

function listOf(values: string[]): string {
  return values.length <= 1 ? values.join("") : `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}

/** What a setting takes, in words: "pink, blue or green", "a number, 1 to 20". */
function valuesOf(prop: ComponentPropDoc): string {
  if (prop.type === "boolean") return "true or false";
  if (prop.values) return listOf(prop.values);
  if (prop.type === "number") {
    if (prop.min !== undefined && prop.max !== undefined) return `a number, ${prop.min} to ${prop.max}`;
    if (prop.min !== undefined) return `a number, at least ${prop.min}`;
    return "a number";
  }
  return "text";
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const { showError } = useToast();
  const failed = () => {
    setCopied(false);
    showError("Couldn't copy that. Select the snippet and copy it yourself.");
  };
  return (
    <Button
      variant="secondary"
      size="sm"
      aria-label={`Copy the ${label} snippet`}
      onClick={() => {
        // No clipboard outside https (and in some embedded browsers)
        if (!navigator.clipboard) return failed();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }, failed);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function ComponentEntry({ doc, tutorials }: { doc: ComponentDoc; tutorials: TutorialLink[] }) {
  const settings = doc.props.filter((prop) => !prop.css);
  const cssSettings = doc.props.filter((prop) => prop.css);

  return (
    <article id={doc.id} className="scroll-mt-24 border border-thread-sage/40 bg-thread-paper rounded p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-x-3 gap-y-1 flex-wrap">
        <h3 className="font-mono text-lg font-bold text-thread-pine">&lt;{doc.name}&gt;</h3>
        {doc.parent && (
          <span className="text-sm text-thread-sage">
            Goes inside{" "}
            <a href={`#${doc.parent.toLowerCase()}`} className="font-mono underline">
              &lt;{doc.parent}&gt;
            </a>
          </span>
        )}
      </div>

      {doc.description && <p className="text-thread-charcoal">{doc.description}</p>}

      <div className="flex items-start gap-2">
        <pre className="flex-1 min-w-0 overflow-x-auto bg-thread-cream border border-thread-sage/30 rounded p-3 text-sm text-thread-charcoal">
          <code>{doc.example}</code>
        </pre>
        <CopyButton text={doc.example} label={doc.name} />
      </div>

      {settings.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-thread-pine">
            Settings ({settings.length})
          </summary>
          <dl className="mt-2 divide-y divide-thread-sage/20 text-sm">
            {settings.map((prop) => (
              <div key={prop.name} className="py-2">
                <dt className="flex flex-wrap items-baseline gap-x-2">
                  <code className="font-mono font-semibold text-thread-pine">{prop.name}</code>
                  <span className="text-thread-sage">
                    {valuesOf(prop)}
                    {prop.default !== undefined && prop.type !== "string" && <>, normally {prop.default}</>}
                  </span>
                  {prop.required && <span className="text-nb-rose-ink font-semibold">needed</span>}
                </dt>
                {prop.description && <dd className="text-thread-charcoal mt-0.5">{prop.description}</dd>}
              </div>
            ))}
          </dl>
        </details>
      )}

      {cssSettings.length > 0 && (
        <p className="text-sm text-thread-sage">
          Also takes CSS values as attributes: {cssSettings.map((prop) => prop.name).join(", ")}.
        </p>
      )}

      {tutorials.length > 0 && (
        <p className="text-sm text-thread-sage">
          Used in{" "}
          {tutorials.map((tutorial, index) => (
            <React.Fragment key={tutorial.slug}>
              {index > 0 && ", "}
              <Link href={`/build/templates/tutorials/${tutorial.slug}`} className="underline hover:text-thread-pine">
                {tutorial.title}
              </Link>
            </React.Fragment>
          ))}
        </p>
      )}
    </article>
  );
}

export default function ComponentsPage({ siteConfig, components, tutorials }: ComponentsPageProps) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return components;
    return components.filter(
      (doc) =>
        doc.name.toLowerCase().includes(q) ||
        (doc.description ?? "").toLowerCase().includes(q) ||
        doc.props.some((prop) => prop.name.toLowerCase().includes(q))
    );
  }, [components, query]);

  const sections = COMPONENT_GROUPS.map((group) => ({
    ...group,
    components: matches.filter((doc) => doc.group === group.id),
  })).filter((section) => section.components.length > 0);

  return (
    <Layout siteConfig={siteConfig}>
      <Head>
        <title>{`Components | ${siteConfig.site_name}`}</title>
      </Head>
      <div className="w-full px-4 sm:px-6 py-8 max-w-4xl mx-auto">
        <nav className="mb-4 text-sm text-thread-sage" aria-label="Breadcrumb">
          <Link href="/build/templates" className="underline hover:text-thread-pine">
            Templates
          </Link>{" "}
          → Components
        </nav>

        <header className="mb-6 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-thread-pine">Components</h1>
          <p className="text-thread-charcoal max-w-2xl">
            Tags you can put anywhere in your page&apos;s HTML. Write them with a capital letter, like{" "}
            <code className="font-mono bg-thread-cream px-1 rounded">&lt;Guestbook /&gt;</code>, and the rest of your
            page stays the HTML you wrote. Copy a snippet, paste it in, then change its settings.
          </p>
        </header>

        <div className="mb-6 p-3 bg-thread-cream border border-thread-sage/30 rounded">
          <label className="sr-only" htmlFor="component-search">
            Search components
          </label>
          <input
            id="component-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${components.length} components`}
            className="w-full px-3 py-2 border border-thread-sage rounded bg-thread-paper focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
          />
          {!query && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {sections.map((section) => (
                <a key={section.id} href={`#group-${section.id}`} className="text-thread-pine underline">
                  {section.title} ({section.components.length})
                </a>
              ))}
            </div>
          )}
        </div>

        {sections.length === 0 && (
          <p className="text-thread-charcoal">
            Nothing matches &quot;{query}&quot;. Try a tag name, like Guestbook, or what you want, like music.
          </p>
        )}

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={`group-${section.id}`} className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-thread-pine">{section.title}</h2>
              <p className="text-nb-ink mb-4">{section.blurb}</p>
              <div className="space-y-4">
                {section.components.map((doc) => (
                  <ComponentEntry key={doc.name} doc={doc} tutorials={tutorials[doc.id] || []} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<ComponentsPageProps> = async () => {
  const siteConfig = await getSiteConfig();
  const components = buildComponentDocs(componentRegistry.getAllRegistrations());

  const tutorials: Record<string, TutorialLink[]> = {};
  for (const doc of components) {
    const found = getCachedTutorialsForComponent(doc.id).map(({ tutorial }) => ({ slug: tutorial.slug, title: tutorial.title }));
    if (found.length > 0) tutorials[doc.id] = found;
  }

  return { props: { siteConfig, components, tutorials } };
};
