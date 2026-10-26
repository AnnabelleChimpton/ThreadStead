import React, { useEffect, useMemo, useRef, useState } from "react";
import { GetServerSideProps } from "next";
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
import { BEGINNER_SECTIONS } from "@/lib/templates-docs/beginner-set";
import { searchComponents } from "@/lib/templates-docs/component-search";
import { getCachedTutorialsForComponent } from "@/lib/templates-docs/componentTutorialMap";
import PageMeta from "@/components/ui/layout/PageMeta";

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

/** Few enough settings to show straight away; more go behind "Settings" */
const OPEN_SETTINGS = 3;

function SettingsList({ settings }: { settings: ComponentPropDoc[] }) {
  return (
    <dl className="m-0 divide-y divide-thread-sage/20 text-sm">
      {settings.map((prop) => (
        <div key={prop.name} className="py-2 sm:grid sm:grid-cols-[minmax(7rem,max-content)_1fr] sm:gap-x-4">
          <dt className="flex flex-wrap items-baseline gap-x-2">
            <code className="font-mono font-semibold text-thread-pine">{prop.name}</code>
            {prop.required && <span className="text-nb-rose-ink font-semibold">needed</span>}
          </dt>
          <dd className="m-0 text-thread-charcoal">
            <span className="text-thread-sage">
              {valuesOf(prop)}
              {prop.default !== undefined && prop.type !== "string" && <>, normally {prop.default}</>}
            </span>
            {prop.description && <span className="block mt-0.5">{prop.description}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ComponentEntry({ doc, tutorials }: { doc: ComponentDoc; tutorials: TutorialLink[] }) {
  const settings = doc.props.filter((prop) => !prop.css);
  const cssSettings = doc.props.filter((prop) => prop.css);
  const open = settings.length > 0 && settings.length <= OPEN_SETTINGS;

  return (
    <article id={doc.id} className="scroll-mt-[calc(var(--nav-height,6rem)+1rem)] border border-thread-sage/40 bg-thread-paper rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-thread-cream border-b border-thread-sage/30">
        <div className="flex items-baseline gap-x-3 gap-y-0.5 flex-wrap min-w-0">
          <h3 className="m-0 font-mono text-lg font-bold text-thread-pine">&lt;{doc.name}&gt;</h3>
          {doc.parent && (
            <span className="text-sm text-thread-sage">
              goes inside{" "}
              <a href={`#${doc.parent.toLowerCase()}`} className="font-mono underline">
                &lt;{doc.parent}&gt;
              </a>
            </span>
          )}
        </div>
        <CopyButton text={doc.example} label={doc.name} />
      </div>

      <div className="p-4 space-y-3">
        {doc.description && <p className="m-0 text-thread-charcoal">{doc.description}</p>}

        <pre className="m-0 overflow-x-auto bg-white border border-thread-sage/30 rounded p-3 text-sm text-thread-charcoal">
          <code>{doc.example}</code>
        </pre>

        {open && <SettingsList settings={settings} />}
        {(!open && settings.length > 0) || cssSettings.length > 0 ? (
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-thread-pine">
              {open ? "More settings" : `Settings (${settings.length})`}
            </summary>
            <div className="mt-2 space-y-2">
              {!open && <SettingsList settings={settings} />}
              {cssSettings.length > 0 && (
                <p className="m-0 text-sm text-thread-sage">
                  Also takes CSS values as attributes: {cssSettings.map((prop) => prop.name).join(", ")}.
                </p>
              )}
            </div>
          </details>
        ) : null}

        {tutorials.length > 0 && (
          <p className="m-0 text-sm text-thread-sage">
            Used in{" "}
            {tutorials.map((tutorial, index) => (
              <React.Fragment key={tutorial.slug}>
                {index > 0 && ", "}
                <Link href={`/build/html/${tutorial.slug}`} className="underline hover:text-thread-pine">
                  {tutorial.title}
                </Link>
              </React.Fragment>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}

/** Calculations aren't a component, but every expression="…" is one: how they're written */
function CalculationsGuide() {
  const code = "font-mono bg-thread-cream px-1 rounded";
  const example = "block m-0 mt-1 overflow-x-auto bg-white border border-thread-sage/30 rounded p-2 text-sm text-thread-charcoal";
  return (
    <section id="calculations" className="scroll-mt-[calc(var(--nav-height,6rem)+1rem)]">
      <h2 className="text-2xl font-bold text-thread-pine">Calculations</h2>
      <p className="text-nb-ink mb-4">
        Anywhere a component takes an <code className={code}>expression=&quot;…&quot;</code> (Set, a computed Var,
        SetCSSVar and others), you can work something out from your page variables.
      </p>
      <div className="border border-thread-sage/40 bg-thread-paper rounded-lg p-4 space-y-4 text-thread-charcoal">
        <div>
          <h3 className="m-0 text-base font-bold text-thread-pine">Sums and comparisons</h3>
          <p className="m-0">
            Write a variable by its name, or as <code className={code}>$vars.name</code>. You can use{" "}
            <code className={code}>+ - * / %</code>, comparisons like <code className={code}>==</code> and{" "}
            <code className={code}>&gt;=</code>, <code className={code}>&amp;&amp;</code> and <code className={code}>||</code>, and{" "}
            <code className={code}>a ? b : c</code> for one thing or another.
          </p>
          <code className={example}>{'<Set var="score" expression="score + 10" />'}</code>
        </div>
        <div>
          <h3 className="m-0 text-base font-bold text-thread-pine">Numbers, text and chance</h3>
          <p className="m-0">
            Math.round, floor, ceil, min, max, abs, sqrt and pow work, and so do text methods like{" "}
            <code className={code}>.toUpperCase()</code> and <code className={code}>.includes()</code>.{" "}
            <code className={code}>random(1, 6)</code> rolls a dice, <code className={code}>pick(list)</code> picks one thing,
            and <code className={code}>$time.hour</code> is the visitor&apos;s clock.
          </p>
          <code className={example}>{'<Set var="roll" expression="random(1, 6)" />'}</code>
        </div>
        <div>
          <h3 className="m-0 text-base font-bold text-thread-pine">Checking a whole list</h3>
          <p className="m-0">
            Write an arrow to look at every item: <code className={code}>.some()</code> is true if any item passes,{" "}
            <code className={code}>.every()</code> if all of them do, <code className={code}>.filter()</code> keeps the ones that
            pass, <code className={code}>.map()</code> changes each one, and <code className={code}>.find()</code>,{" "}
            <code className={code}>.findIndex()</code> and <code className={code}>.reduce()</code> work too.
          </p>
          <code className={example}>{'<Var name="full" type="computed" expression="board.every(square => square != \'\')" />'}</code>
          <code className={example}>{'<Set var="stars" expression="stars.filter(star => star.y < 90)" />'}</code>
        </div>
        <div>
          <h3 className="m-0 text-base font-bold text-thread-pine">Inside a ForEach</h3>
          <p className="m-0">
            In text and attributes, the loop&apos;s item and position go in curly brackets:{" "}
            <code className={code}>{"{cell}"}</code>, <code className={code}>{"{i}"}</code>, even in class and style. In a
            calculation, write them as they are: <code className={code}>i</code>, <code className={code}>cell</code>.
          </p>
          <code className={example}>{'<div class="square {cell}" style="left: calc({i} * 2em)">'}</code>
          <code className={example}>{'<Set var="board" expression="board.slice(0, i).concat([turn]).concat(board.slice(i + 1))" />'}</code>
        </div>
        <p className="m-0 text-sm text-thread-sage">
          The Game Corner starter in the HTML editor uses all of these. It&apos;s a good one to read.
        </p>
      </div>
    </section>
  );
}

export default function ComponentsPage({ siteConfig, components, tutorials }: ComponentsPageProps) {
  const [query, setQuery] = useState("");
  // The ones to start with first; every component a click (or a search) away
  const [showAll, setShowAll] = useState(false);

  // Best match first (component-search.ts)
  const matches = useMemo(() => searchComponents(components, query), [components, query]);
  const searching = query.trim() !== "";
  // Typing in the sticky search box from far down the page: the results
  // are above, so go back up to their start
  const results = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const top = results.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) results.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
  }, [query]);

  const byName = new Map(components.map((doc) => [doc.name, doc]));
  const starting = !searching && !showAll;
  const sections = searching
    ? [{ id: "matches", title: "", blurb: "", components: matches }]
    : starting
      ? BEGINNER_SECTIONS.map((section) => ({
          id: section.id,
          title: section.title,
          blurb: section.blurb,
          components: section.components.map((name) => byName.get(name)).filter((doc): doc is ComponentDoc => !!doc),
        }))
      : COMPONENT_GROUPS.map((group) => ({
          ...group,
          components: components.filter((doc) => doc.group === group.id),
        })).filter((section) => section.components.length > 0);
  const startingCount = BEGINNER_SECTIONS.reduce((n, s) => n + s.components.length, 0);

  return (
    <Layout siteConfig={siteConfig}>
      <PageMeta title="Components" description="Every component you can use in a page of your own HTML, with what each one does and the options it takes." path="/build/templates/components" />
      <div className="w-full px-4 sm:px-6 py-8 max-w-6xl mx-auto">
        <nav className="mb-4 text-sm text-thread-sage" aria-label="Breadcrumb">
          <Link href="/build/html" className="underline hover:text-thread-pine">
            Your own HTML page
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

        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 lg:items-start">
          <aside className="mb-6 lg:mb-0 lg:sticky lg:top-[calc(var(--nav-height,0px)+1rem)] lg:max-h-[calc(100vh-var(--nav-height,0px)-2rem)] lg:overflow-y-auto p-3 bg-thread-cream border border-thread-sage/30 rounded-lg">
            <label className="sr-only" htmlFor="component-search">
              Search components
            </label>
            <input
              id="component-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search all ${components.length}`}
              className="w-full px-3 py-2 border border-thread-sage rounded bg-thread-paper focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
            />
            <p className="mt-1.5 mb-0 text-xs text-thread-sage">A name, or what you want: music, game, swipe.</p>

            {searching ? (
              <p className="mt-3 mb-0 text-sm text-nb-ink" role="status">
                {matches.length === 0 ? "Nothing matches." : `${matches.length} ${matches.length === 1 ? "match" : "matches"}, best first.`}
              </p>
            ) : (
              <>
                <button type="button" className="ts-bare mt-3 text-sm underline text-thread-pine" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? `Just the ${startingCount} to start with` : `Show all ${components.length}`}
                </button>
                <nav aria-label="Components on this page" className="mt-3 space-y-3 text-sm">
                  {sections.map((section) => (
                    <div key={section.id}>
                      <a href={`#group-${section.id}`} className="font-semibold text-thread-pine hover:underline">
                        {section.title}
                      </a>
                      <ul className="hidden lg:block list-none m-0 mt-1 p-0 space-y-0.5">
                        {section.components.map((doc) => (
                          <li key={doc.name}>
                            <a href={`#${doc.id}`} className="font-mono text-xs text-nb-ink hover:text-thread-pine hover:underline">
                              &lt;{doc.name}&gt;
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <a href="#calculations" className="block font-semibold text-thread-pine hover:underline">
                    Calculations
                  </a>
                </nav>
              </>
            )}
          </aside>

          <div ref={results} className="min-w-0 scroll-mt-[calc(var(--nav-height,6rem)+1rem)]">
            {starting && (
              <p className="mt-0 mb-6 text-sm text-nb-ink">
                These {startingCount} are the ones to start with. The rest are a click away, and search looks through all of them.
              </p>
            )}

            {searching && matches.length === 0 && (
              <p className="text-thread-charcoal">
                Nothing matches &quot;{query}&quot;. Try a tag name, like Guestbook, or what you want, like music.
              </p>
            )}

            <div className="space-y-10">
              {sections.map((section) => (
                <section key={section.id} id={`group-${section.id}`} className="scroll-mt-[calc(var(--nav-height,6rem)+1rem)]">
                  {section.title && <h2 className="text-2xl font-bold text-thread-pine">{section.title}</h2>}
                  {section.blurb && <p className="text-nb-ink mb-4">{section.blurb}</p>}
                  <div className="space-y-4">
                    {section.components.map((doc) => (
                      <ComponentEntry key={doc.name} doc={doc} tutorials={tutorials[doc.id] || []} />
                    ))}
                  </div>
                </section>
              ))}
              {!searching && <CalculationsGuide />}
            </div>
          </div>
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
