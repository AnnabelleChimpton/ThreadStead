// The widget slot under the profile header (lib/domain/profile/widget-slot).
// Renders the slot's stored, already-compiled fragment with the same islands
// renderer as a whole custom page. Nothing is compiled here.
import React from "react";
import type { Island } from "@/lib/templates/compilation/compiler/types";
import type { ResidentData } from "@/components/features/templates/ResidentDataProvider";
import { ResidentDataProvider } from "@/components/features/templates/ResidentDataProvider";
import { GlobalTemplateStateProvider } from "@/lib/templates/state/TemplateStateProvider";
import TemplateErrorBoundary from "@/components/features/templates/TemplateErrorBoundary";
import { preloadTemplateComponents } from "@/lib/templates/core/dynamic-registry";
import { StaticHTMLWithIslands } from "./HTMLIslandHydration";

export interface WidgetSlotContent {
  staticHTML: string;
  islands: Island[];
}

interface WidgetSlotProps {
  slot: WidgetSlotContent;
  residentData: ResidentData;
  /**
   * Inside the picker: "card" keeps the slot's card without the page margin,
   * "bare" drops the card (the gallery's small previews).
   */
  preview?: "card" | "bare";
}

// Layout for the widgets inside the slot. Utilities (layered), so a theme's
// own CSS for .ts-widget… still wins.
const ITEMS = [
  "ts-widget-slot-items flex flex-wrap items-start justify-center gap-4 sm:gap-6",
  "[&_.ts-widget]:flex [&_.ts-widget]:justify-center [&_.ts-widget]:min-w-0 [&_.ts-widget]:max-w-full",
  "[&_.ts-widget]:flex-[0_1_auto]",
  // Text widgets take a reading width; the marquee takes the whole row
  "[&_.ts-widget--textbox]:flex-[1_1_18rem] [&_.ts-widget--now]:flex-[1_1_14rem] [&_.ts-widget--marquee]:basis-full",
  "[&_.ts-widget--textbox]:justify-start [&_.ts-widget--now]:justify-start",
  // The song player fills its share of the row, up to its own max width
  "[&_.ts-widget--music]:flex-[1_1_16rem]",
  "[&_.ts-widget-buttons]:flex [&_.ts-widget-buttons]:flex-wrap [&_.ts-widget-buttons]:justify-center [&_.ts-widget-buttons]:gap-1 [&_.ts-widget-buttons]:max-w-[37rem]",
  "[&_.ts-widget-buttons_img]:block [&_.ts-widget-buttons_img]:[image-rendering:pixelated]",
  "[&_.ts-widget-marquee]:block [&_.ts-widget-marquee]:w-full",
  "[&_.ts-widget-now_ul]:list-none [&_.ts-widget-now_ul]:p-0 [&_.ts-widget-now_ul]:m-0 [&_.ts-widget-now_li]:my-1",
  "[&_.ts-widget-guestbook]:text-center",
  "[&_.ts-widget_h3]:font-bold [&_.ts-widget_h3]:mb-2 [&_.ts-widget_p]:my-1",
  "[&_.ts-widget--polaroid_img]:block [&_.ts-widget--polaroid_img]:w-56 [&_.ts-widget--polaroid_img]:max-w-full [&_.ts-widget--polaroid_img]:h-auto",
].join(" ");

export default function WidgetSlot({
  slot,
  residentData,
  preview,
}: WidgetSlotProps) {
  // Same order as a custom page: load the slot's components, then hydrate.
  // Until then (and on the server) the static HTML shows, so text never waits.
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    setReady(false);
    preloadTemplateComponents(slot.islands)
      .catch((error) => console.error("[WidgetSlot] preload failed:", error))
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slot.islands]);

  const noop = React.useCallback(() => {}, []);

  const content = (
    <TemplateErrorBoundary
      componentName="WidgetSlot"
      fallbackMessage="These widgets couldn't be shown right now."
    >
      <GlobalTemplateStateProvider>
        <ResidentDataProvider data={residentData}>
          <div className={ITEMS}>
            {ready && slot.islands.length > 0 ? (
              <StaticHTMLWithIslands
                staticHTML={slot.staticHTML}
                islands={slot.islands}
                residentData={residentData}
                onIslandRender={noop}
                onIslandError={noop}
              />
            ) : (
              // The compiled HTML is the sanitizer's output, stored at save time
              <div
                className="contents"
                dangerouslySetInnerHTML={{ __html: slot.staticHTML }}
              />
            )}
          </div>
        </ResidentDataProvider>
      </GlobalTemplateStateProvider>
    </TemplateErrorBoundary>
  );

  if (preview === "bare") return content;
  return (
    <section
      className={`ts-profile-widget-slot thread-module template-card p-4 sm:p-5 md:p-6 ${preview ? "" : "mb-3 sm:mb-4 md:mb-6"}`}
      data-component="widget-slot"
    >
      {content}
    </section>
  );
}
