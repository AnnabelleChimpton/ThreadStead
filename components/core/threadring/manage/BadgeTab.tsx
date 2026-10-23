import BadgeDesigner from "@/components/core/threadring/BadgeDesigner";

type BadgeDesignerProps = React.ComponentProps<typeof BadgeDesigner>;

/** The ring's badge: the designer, drawn in the ring's colour (set on the Ring tab). */
export default function BadgeTab({ ring, onSaved }: BadgeDesignerProps) {
  return (
    <div className="space-y-6">
      <p className="text-nb-ink-mid mt-0">Members wear this on their profiles and put it on their own sites.</p>
      <BadgeDesigner ring={ring} onSaved={onSaved} />
    </div>
  );
}
