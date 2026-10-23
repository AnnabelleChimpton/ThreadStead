interface ThreadRingFeedScopeProps {
  /** The second choice's words: "With Sock Club", or "Whole family" */
  withLabel: string;
  scope: "current" | "with";
  onScopeChange: (scope: "current" | "with") => void;
}

const OPTION = "ts-bare !px-2.5 !py-1 text-[0.85rem] !font-semibold";
const ON = "!bg-nb-ink !text-nb-paper";
const OFF = "!bg-nb-paper !text-nb-ink-mid hover:!text-nb-ink";

/** Whose posts the ring's feed shows: this ring's, or with its relatives'. The page holds the choice. */
export default function ThreadRingFeedScope({ withLabel, scope, onScopeChange }: ThreadRingFeedScopeProps) {
  return (
    <div role="group" aria-label="Whose posts" className="tr-feed-scope inline-flex shrink-0 border-2 border-nb-ink-mid rounded-md overflow-hidden">
      <button type="button" aria-pressed={scope === "current"} onClick={() => onScopeChange("current")} className={`${OPTION} ${scope === "current" ? ON : OFF}`}>
        This ring
      </button>
      <button
        type="button"
        aria-pressed={scope === "with"}
        onClick={() => onScopeChange("with")}
        className={`${OPTION} !border-l-2 !border-l-nb-ink-mid ${scope === "with" ? ON : OFF}`}
      >
        {withLabel}
      </button>
    </div>
  );
}
