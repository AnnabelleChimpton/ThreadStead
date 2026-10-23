import { useState } from "react";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { ImageLibrary } from "@/components/features/templates/ImagePicker";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { RING_THEMES, ringAccentHex, ringThemeHex } from "@/lib/rings/theme";
import type { RingSettings } from "@/lib/api/ringhub/ringhub-transformers";
import type { ManageMember, ManageRights } from "@/lib/rings/manage";
import type { ManageRing } from "@/pages/tr/[slug]/manage";
import { ChoiceCards, FIELD, HELP, Heading, Label, SELECT, type Choice } from "./form";

type Form = Omit<RingSettings, "themeColor"> & { themeColor: string };

function formFrom(settings: RingSettings): Form {
  return { ...settings, themeColor: ringThemeHex(settings.themeColor) ?? "" };
}

// Emptied, these are cleared on Ring Hub (sent as null)
const CLEARABLE = new Set<keyof Form>(["description", "curatorNote", "bannerUrl"]);

/** Only what changed since the form loaded: a save never rewrites what wasn't touched. */
export function changesFrom(saved: Form, form: Form): Record<string, string | null> {
  const changes: Record<string, string | null> = {};
  for (const key of Object.keys(form) as (keyof Form)[]) {
    if (form[key] === saved[key]) continue;
    changes[key] = CLEARABLE.has(key) && form[key].trim() === "" ? null : form[key];
  }
  return changes;
}

const JOIN: Choice<Form["joinType"]>[] = [
  { id: "open", label: "Anyone", note: "One click and they're in." },
  { id: "invite", label: "People you invite", note: "You and your moderators send invites from People." },
  { id: "closed", label: "Nobody new for now", note: "Members stay. The Join button goes away." },
];
const SEE: Choice<Form["visibility"]>[] = [
  { id: "public", label: "Everyone", note: "Listed with the other rings." },
  { id: "unlisted", label: "People with the link", note: "Not listed, and search engines are asked to skip it." },
  { id: "private", label: "Members only", note: "Posts and people are hidden from everyone else." },
];
const POST: Choice<Form["postPolicy"]>[] = [
  { id: "members", label: "Members" },
  { id: "closed", label: "Nobody for now", note: "The ring keeps its posts but takes no new ones." },
];
// Not offered any more; shown while a ring still has it
const OPEN_POSTING: Choice<Form["postPolicy"]> = { id: "open", label: "Anyone, members or not" };

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const otherPeople = (n: number) =>
  `${NUMBER_WORDS[n] ?? n} other ${n === 1 ? "person is" : "people are"}`;

/** The address in the image picker's url("...") snippet. */
interface RingTabProps {
  ring: ManageRing;
  settings: RingSettings;
  rights: ManageRights;
  people: ManageMember[] | null;
  viewer: { id: string; username: string };
  /** After a save, with the hub's settings; `colourChanged` when the ring's colour (its badge palette) changed */
  onSaved: (settings: RingSettings, colourChanged: boolean) => void;
}

/** The ring itself: words, look, who can join, see and post, and handing it over or closing it. */
export default function RingTab({ ring, settings, rights, people, viewer, onSaved }: RingTabProps) {
  const [saved, setSaved] = useState<Form>(() => formFrom(settings));
  const [form, setForm] = useState<Form>(() => formFrom(settings));
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const { showError } = useToast();
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const changes = changesFrom(saved, form);
      const res = await csrfFetch(`/api/threadrings/${encodeURIComponent(ring.slug)}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save. Try again.");
      const now = formFrom(data.settings);
      setSaved(now);
      setForm(now);
      onSaved(data.settings, "themeColor" in changes);
    } catch (error) {
      showError(error instanceof Error && error.message ? error.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // A ring with no colour yet shows the one its page and default badge are in
  const colour = form.themeColor || ringAccentHex(null, ring.slug);
  const postChoices = saved.postPolicy === "open" ? [OPEN_POSTING, ...POST] : POST;

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div>
          <Label htmlFor="ring-name">Name</Label>
          <input
            id="ring-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={100}
            className={`${FIELD} max-w-md`}
          />
        </div>
        <div>
          <Label htmlFor="ring-description">What it&apos;s about</Label>
          <p className={HELP}>The first thing people read on the ring page and in the ring list.</p>
          <textarea
            id="ring-description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            maxLength={500}
            className={`${FIELD} max-w-xl`}
          />
          <p className="text-xs text-nb-ink-mid mt-1 mb-0">{form.description.length} / 500</p>
        </div>
        <div>
          <Label htmlFor="ring-note" optional>Your note to members</Label>
          <textarea
            id="ring-note"
            value={form.curatorNote}
            onChange={(e) => set("curatorNote", e.target.value)}
            rows={3}
            maxLength={1000}
            className={`${FIELD} max-w-xl`}
          />
          <p className="text-xs text-nb-ink-mid mt-1 mb-0">{form.curatorNote.length} / 1000</p>
        </div>
      </div>

      <div>
        <Heading>Look</Heading>
        <p className={HELP}>
          Your ring&apos;s colour shows in its title and a few small touches on its page, and its badge is drawn in it. The
          rest of the site stays as it is.
        </p>
        <div className="flex flex-wrap gap-2 mt-3" role="radiogroup" aria-label="Colour">
          {RING_THEMES.map((theme) => {
            const on = theme.hex === colour;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set("themeColor", theme.hex)}
                className={`ts-bare flex flex-col items-center gap-1 w-[52px] text-xs bg-transparent border-0 p-0 cursor-pointer ${
                  on ? "text-nb-ink font-bold" : "text-nb-ink-mid"
                }`}
              >
                <span
                  className={`block w-9 h-9 rounded-full border-2 border-black/15 ${on ? "outline outline-[3px] outline-offset-2 outline-nb-ink" : ""}`}
                  style={{ backgroundColor: theme.hex }}
                />
                {theme.name}
              </button>
            );
          })}
        </div>
        <div className="mt-5">
          <Label optional>Banner</Label>
          {form.bannerUrl && (
             
            <img src={form.bannerUrl} alt="" className="block w-full max-w-md max-h-32 object-cover rounded-md border-2 border-nb-ink-mid/40 mb-2" />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setPicking(true)} disabled={!viewer.username}>
              <PixelIcon name="image" size={14} className="inline-block align-[-2px] mr-1" />
              {form.bannerUrl ? "Change the picture" : "Choose a picture"}
            </Button>
            {form.bannerUrl ? (
              <Button variant="secondary" size="sm" onClick={() => set("bannerUrl", "")}>
                Remove it
              </Button>
            ) : (
              <span className="text-sm text-nb-ink-mid">Wide pictures work best, about 1200 × 300.</span>
            )}
          </div>
          <ImageLibrary
            isOpen={picking}
            username={viewer.username}
            onClose={() => setPicking(false)}
            onChoose={(url) => {
              set("bannerUrl", url);
              setPicking(false);
            }}
            title="Choose a banner"
            hint="Pick one of your pictures, or upload a new one."
            emptyHint="Upload a picture to use it as the banner."
          />
        </div>
      </div>

      <ChoiceCards legend="Who can join" name="joinType" choices={JOIN} value={form.joinType} onChange={(v) => set("joinType", v)} />
      <ChoiceCards legend="Who can see it" name="visibility" choices={SEE} value={form.visibility} onChange={(v) => set("visibility", v)} />
      <ChoiceCards legend="Who can post" name="postPolicy" choices={postChoices} value={form.postPolicy} onChange={(v) => set("postPolicy", v)} />

      {/* Stays in view while there's something to save, like /settings */}
      <div
        className={`${dirty ? "sticky bottom-0 z-10" : ""} -mx-4 sm:mx-0 px-4 py-3 bg-thread-paper border-t-2 border-dotted border-nb-ink-mid/40 flex flex-wrap items-center gap-3`}
      >
        <Button onClick={save} disabled={saving || !dirty} className="thread-button disabled:opacity-50 min-h-[48px]">
          {saving ? "Saving..." : "Save"}
        </Button>
        <span className="text-sm text-nb-ink-mid" role="status">
          {dirty ? "You have unsaved changes." : "Everything's saved."}
        </span>
      </div>

      {(rights.handOver || rights.delete) && <HandingOver ring={ring} rights={rights} people={people} viewerId={viewer.id} />}
    </div>
  );
}

/** The quiet corner: hand the ring to another member, or delete it when nobody else is in it. */
function HandingOver({ ring, rights, people, viewerId }: Pick<RingTabProps, "ring" | "rights" | "people"> & { viewerId: string }) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const candidates = (people ?? []).filter((p) => p.local && p.role !== "host" && p.key !== viewerId);
  const others = Math.max((people?.length ?? ring.memberCount) - 1, 0);

  const handOver = async () => {
    const person = candidates.find((p) => p.key === to);
    if (!person) return;
    const ok = await confirm({
      title: `Hand ${ring.name} to ${person.name}?`,
      message: `${person.name} becomes the host and gets this page. You stay on as a member, and only they can hand it back.`,
      confirmText: "Hand it over",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await csrfFetch(`/api/threadrings/${encodeURIComponent(ring.slug)}/transfer-ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerUserId: person.key }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't hand the ring over. Try again.");
      showSuccess(data.message || `${person.name} is the host now.`);
      await router.push(`/tr/${encodeURIComponent(ring.slug)}`);
    } catch (error) {
      showError(error instanceof Error && error.message ? error.message : "Couldn't hand the ring over. Try again.");
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${ring.name}?`,
      message: "It's gone for good, with its posts list and badge. Your posts stay on your page.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await csrfFetch(`/api/threadrings/${encodeURIComponent(ring.slug)}/settings`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't delete it. Try again.");
      await router.push("/threadrings");
    } catch (error) {
      showError(error instanceof Error && error.message ? error.message : "Couldn't delete it. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
      <h2 className="font-headline text-lg font-bold text-nb-ink m-0 mb-1">Handing over or closing up</h2>
      {rights.handOver && (
        <div className="mt-3">
          <Label htmlFor="hand-over">Hand the ring to someone else</Label>
          <p className={HELP}>They become the host and get this page. You stay on as a member.</p>
          {people === null ? (
            <p className="text-sm text-nb-ink-mid m-0">I can&apos;t list the members right now. Try again in a minute.</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-nb-ink-mid m-0">There&apos;s nobody else here to hand it to yet.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select id="hand-over" value={to} onChange={(e) => setTo(e.target.value)} className={`${SELECT} min-w-[12rem]`}>
                <option value="">Choose a member</option>
                {candidates.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button variant="secondary" size="sm" onClick={handOver} disabled={!to || busy}>
                Hand over…
              </Button>
            </div>
          )}
        </div>
      )}
      {rights.delete && (
        <div className={rights.handOver ? "mt-5 pt-4 border-t-2 border-dotted border-nb-ink-mid/30" : "mt-3"}>
          <Label>Delete the ring</Label>
          {others === 0 ? (
            <>
              <p className={HELP}>You&apos;re the only one here, so you can delete the ring. It can&apos;t be undone.</p>
              <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
                Delete {ring.name}
              </Button>
            </>
          ) : (
            <p className="text-sm text-nb-ink-mid m-0">
              {otherPeople(others)} in {ring.name}, so it can&apos;t be deleted. If you&apos;re stepping away, hand it over above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
