import React, { useEffect, useState } from "react";

const DATE: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
const DATE_AND_TIME: Intl.DateTimeFormatOptions = { ...DATE, hour: "numeric", minute: "2-digit" };

/**
 * A date and time in the visitor's own time zone. The server doesn't know
 * it, so the server (and the browser's first render, which must match) show
 * the date alone in UTC, and the browser swaps in local date and time after
 * hydration. Formatting with each machine's own zone, and Safari's "at"
 * between date and time, made every page with posts or a guestbook fail
 * hydration for most visitors (template audit 13 #4).
 */
export default function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const date = new Date(iso);
  return (
    <time className={className} dateTime={iso}>
      {hydrated
        ? date.toLocaleString("en-US", DATE_AND_TIME)
        : date.toLocaleString("en-US", { ...DATE, timeZone: "UTC" })}
    </time>
  );
}
